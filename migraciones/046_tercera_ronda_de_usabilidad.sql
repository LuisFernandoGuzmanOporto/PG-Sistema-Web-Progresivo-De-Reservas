-- 046 · Lo que encontró la tercera ronda de pruebas de usabilidad
--
-- 1. El teléfono del capitán ya no es público. Estaba en la tabla de equipos,
--    que cualquiera puede leer (hace falta para mostrar los torneos), y se
--    podía consultar sin iniciar sesión. Pasa a su propia tabla, que leen
--    solo el capitán, quien organiza el torneo y el complejo.
-- 2. El stock de una recompensa lo cuenta la base. Un cliente solo puede leer
--    sus propios canjes: contándolos en la pantalla, a Juan le quedaban 39
--    botellas cuando en realidad quedaban 36.
-- 3. Un entrenamiento que ocupa una cancha tiene que caber en el horario del
--    complejo y no puede pisar reservas; una reserva tampoco puede caer
--    encima de un entrenamiento. Se publicó uno de 11:00 a 23:00 encima de
--    una reserva pagada, en un complejo que cierra a las 22:00.
-- 4. Una cancha con reservas desde hoy no se puede desactivar.
-- 5. Las notificaciones dicen la fecha real («para el vie 30/10 a las
--    11:00»). Antes decían «hoy» calculado en hora de Londres: un pedido de
--    las 21:45 para el día siguiente decía «para hoy», y al otro día la
--    palabra ya no era verdad. Los montos van con coma: «Bs. 79,20».
-- 6. Un torneo que termina antes de lo previsto libera la cancha y su fecha de
--    fin pasa a ser la real. La Copa Cochabamba seguía ocupando la cancha
--    seis jornadas después de jugar la final.
-- 7. Arreglos de datos: estados de torneos que no cuadraban con sus fechas,
--    «uan reserva», la respuesta «¡Gracias Pedro!» que era para Luisa y los
--    textos viejos de las notificaciones («Revisá», «para hoy»).
--
-- No borra nada: el teléfono se copia antes de quitarlo de la tabla pública,
-- y las jornadas que ya no se juegan quedan como «cancelada».
-- Se puede ejecutar más de una vez.


-- ── 1. El teléfono del capitán, aparte ──────────────────────────────────────
create table if not exists equipo_contactos (
  -- Diferida: el contacto se anota antes de que exista la fila del equipo,
  -- dentro de la misma operación (ver guardar_telefono_aparte)
  equipo_id uuid primary key references equipos(id) on delete cascade
            deferrable initially deferred,
  telefono  text not null
);

alter table equipo_contactos enable row level security;
revoke all on equipo_contactos from anon;
grant select on equipo_contactos to authenticated;

drop policy if exists "contacto_del_equipo" on equipo_contactos;
create policy "contacto_del_equipo" on equipo_contactos
  for select using (exists (
    select 1 from equipos e
     where e.id = equipo_contactos.equipo_id
       and (e.capitan_id = auth.uid()
            or organiza_torneo(e.torneo_id)
            or trabaja_en_empresa(empresa_del_torneo(e.torneo_id))
            or es_superadmin())));

-- La aplicación sigue mandando el teléfono con el equipo (también la versión
-- que alguien tenga guardada en el teléfono): aquí se pasa a la tabla privada
-- y no queda en la pública.
create or replace function guardar_telefono_aparte()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.capitan_telefono is not null and btrim(new.capitan_telefono) <> '' then
    insert into equipo_contactos (equipo_id, telefono)
    values (new.id, btrim(new.capitan_telefono))
    on conflict (equipo_id) do update set telefono = excluded.telefono;
  end if;
  new.capitan_telefono := null;
  return new;
end;
$$;

-- Con «z» para que corra después de las demás revisiones de la inscripción
drop trigger if exists trg_z_telefono_aparte on equipos;
create trigger trg_z_telefono_aparte
  before insert or update of capitan_telefono on equipos
  for each row when (new.capitan_telefono is not null)
  execute function guardar_telefono_aparte();

-- Los teléfonos que ya estaban: se copian y recién después se quitan.
-- Las demás reglas de equipos no se disparan: solo se vacía una columna.
insert into equipo_contactos (equipo_id, telefono)
select id, btrim(capitan_telefono) from equipos
 where capitan_telefono is not null and btrim(capitan_telefono) <> ''
on conflict (equipo_id) do update set telefono = excluded.telefono;

alter table equipos disable trigger user;
update equipos set capitan_telefono = null where capitan_telefono is not null;
alter table equipos enable trigger user;


-- ── 2. Los canjes de cada recompensa los cuenta la base ─────────────────────
alter table recompensas add column if not exists canjeados integer not null default 0;

drop trigger if exists trg_proteger_canjeados on recompensas;
update recompensas r
   set canjeados = (select count(*) from canjes c where c.recompensa_id = r.id);

create or replace function contar_canjes()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update recompensas set canjeados = canjeados + 1 where id = new.recompensa_id;
  else
    update recompensas set canjeados = greatest(canjeados - 1, 0) where id = old.recompensa_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_contar_canjes on canjes;
create trigger trg_contar_canjes after insert or delete on canjes
  for each row execute function contar_canjes();

-- Nadie lo cambia a mano: solo el conteo de arriba
create or replace function proteger_canjeados()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if pg_trigger_depth() <= 1 then
    new.canjeados := old.canjeados;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_canjeados before update of canjeados on recompensas
  for each row execute function proteger_canjeados();


-- ── 3. Entrenamientos y reservas no se pisan ────────────────────────────────
-- 'Mie' → miércoles. Los días se guardan sin tilde, como los manda la aplicación.
create or replace function dia_corto(f date)
returns text
language sql immutable
as $$ select (array['Dom','Lun','Mar','Mie','Jue','Vie','Sab'])[extract(dow from f)::int + 1] $$;

create or replace function revisar_horario_entrenamiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa empresas%rowtype;
  v_choque  record;
  v_hoy     date := (now() at time zone 'America/La_Paz')::date;
begin
  -- Los datos iniciales se cargan desde el editor SQL, sin sesión
  if auth.uid() is null then
    return new;
  end if;

  -- Una edición que no toca el horario ni la cancha no se vuelve a revisar
  if tg_op = 'UPDATE'
     and new.cancha_id is not distinct from old.cancha_id
     and new.dias = old.dias
     and new.hora_inicio = old.hora_inicio and new.hora_fin = old.hora_fin
     and new.activo = old.activo then
    return new;
  end if;

  if new.hora_fin <= new.hora_inicio then
    raise exception 'La hora de fin tiene que ser posterior a la de inicio';
  end if;

  select * into v_empresa from empresas where id = new.empresa_id;
  if v_empresa.horario_inicio is not null and v_empresa.horario_fin is not null
     and (new.hora_inicio < v_empresa.horario_inicio
          or (v_empresa.horario_fin <> '00:00' and new.hora_fin > v_empresa.horario_fin)) then
    raise exception 'El complejo atiende de % a %', to_char(v_empresa.horario_inicio, 'HH24:MI'),
      to_char(v_empresa.horario_fin, 'HH24:MI');
  end if;

  if new.cancha_id is null or not new.activo then
    return new;
  end if;

  select r.nro, r.fecha, r.hora_inicio into v_choque
    from reservas r
   where r.cancha_id = new.cancha_id
     and r.fecha >= v_hoy
     and (r.estado in ('pendiente', 'confirmada') or (r.estado = 'apartada' and r.aparta_hasta > now()))
     and dia_corto(r.fecha) = any(new.dias)
     and r.hora_inicio < new.hora_fin and r.hora_fin > new.hora_inicio
   order by r.fecha, r.hora_inicio
   limit 1;
  if found then
    raise exception 'Ese horario choca con la reserva % del % a las %. Elige otra cancha u otro horario.',
      coalesce(v_choque.nro, 'de un torneo'), to_char(v_choque.fecha, 'DD/MM'), to_char(v_choque.hora_inicio, 'HH24:MI');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_horario_entrenamiento on entrenamientos;
create trigger trg_horario_entrenamiento before insert or update on entrenamientos
  for each row execute function revisar_horario_entrenamiento();

create or replace function reserva_no_pisa_entrenamiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ent record;
begin
  if auth.uid() is null then
    return new;
  end if;

  select e.nombre, e.hora_inicio, e.hora_fin into v_ent
    from entrenamientos e
   where e.cancha_id = new.cancha_id
     and e.activo
     and dia_corto(new.fecha) = any(e.dias)
     and e.hora_inicio < new.hora_fin and e.hora_fin > new.hora_inicio
   limit 1;
  if found then
    raise exception 'A esa hora la cancha está ocupada por el entrenamiento «%» (de % a %). Elige otro horario.',
      v_ent.nombre, to_char(v_ent.hora_inicio, 'HH24:MI'), to_char(v_ent.hora_fin, 'HH24:MI');
  end if;

  return new;
end;
$$;

-- Solo las de clientes y de mostrador: las jornadas de un torneo las aprueba el complejo
drop trigger if exists trg_d_no_pisa_entrenamiento on reservas;
create trigger trg_d_no_pisa_entrenamiento
  before insert or update of fecha, hora_inicio, hora_fin, cancha_id on reservas
  for each row when (new.torneo_id is null)
  execute function reserva_no_pisa_entrenamiento();


-- ── 4. Una cancha con reservas no se desactiva ──────────────────────────────
create or replace function cancha_sin_reservas_al_desactivar()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_hoy      date := (now() at time zone 'America/La_Paz')::date;
  v_cuantas  integer;
  v_proxima  record;
begin
  if auth.uid() is null or not old.activa or new.activa then
    return new;
  end if;

  select count(*) into v_cuantas
    from reservas
   where cancha_id = new.id and fecha >= v_hoy
     and (estado in ('pendiente', 'confirmada') or (estado = 'apartada' and aparta_hasta > now()));

  if v_cuantas > 0 then
    select nro, fecha, hora_inicio into v_proxima
      from reservas
     where cancha_id = new.id and fecha >= v_hoy and estado in ('pendiente', 'confirmada', 'apartada')
     order by fecha, hora_inicio limit 1;
    raise exception 'Esa cancha tiene % reserva(s) desde hoy, la próxima % el % a las %. Resuélvelas antes de desactivarla.',
      v_cuantas, coalesce(v_proxima.nro, 'de un torneo'), to_char(v_proxima.fecha, 'DD/MM'),
      to_char(v_proxima.hora_inicio, 'HH24:MI');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cancha_sin_reservas on canchas;
create trigger trg_cancha_sin_reservas before update of activa on canchas
  for each row execute function cancha_sin_reservas_al_desactivar();


-- ── 5. La fecha real en las notificaciones, y los montos con coma ───────────
-- 'el vie 30/10 a las 11:00'. Ya no depende de qué día es hoy, así que tampoco
-- de la zona horaria de la base, y sigue siendo cierto al día siguiente.
create or replace function cuando(f date, h time)
returns text
language sql immutable
as $$
  select 'el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from f)::int + 1]
         || ' ' || to_char(f, 'DD/MM') || ' a las ' || to_char(h, 'HH24:MI')
$$;

-- 120 → '120', 1200 → '1.200', 79.2 → '79,20'
create or replace function plata(monto numeric)
returns text
language sql immutable
as $$
  select case
    when monto is null        then '0'
    when monto = trunc(monto) then translate(to_char(trunc(monto), 'FM999,999,990'), ',', '.')
    else translate(to_char(monto, 'FM999,999,990.00'), ',.', '.,')
  end
$$;


-- ── 6. Un torneo terminado libera la cancha ─────────────────────────────────
create or replace function al_terminar_torneo()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/La_Paz')::date;
begin
  if new.estado = 'finalizado' and old.estado is distinct from 'finalizado' then
    -- Terminó antes de lo previsto: la fecha de fin es la de hoy
    if new.fecha_fin is null or new.fecha_fin > v_hoy then
      new.fecha_fin := greatest(coalesce(new.fecha_inicio, v_hoy), v_hoy);
    end if;
    -- Y las jornadas que quedaban dejan de ocupar la cancha
    update reservas set estado = 'cancelada'
     where torneo_id = new.id and origen = 'torneo' and fecha > v_hoy
       and estado in ('pendiente', 'confirmada');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_al_terminar_torneo on torneos;
create trigger trg_al_terminar_torneo before update of estado on torneos
  for each row execute function al_terminar_torneo();


-- ── 7. Arreglos de datos ────────────────────────────────────────────────────
-- Torneos en curso cuya última fecha pasó y que ya jugaron todos sus partidos:
-- se dan por terminados (la Copa Interna seguía «En curso» desde septiembre)
update torneos t set estado = 'finalizado'
 where t.estado = 'en_curso'
   and t.fecha_fin < (now() at time zone 'America/La_Paz')::date
   and exists (select 1 from partidos_torneo p where p.torneo_id = t.id)
   and not exists (select 1 from partidos_torneo p where p.torneo_id = t.id and p.estado <> 'finalizado');

-- Torneos ya terminados que seguían ocupando la cancha (la Copa Cochabamba)
update reservas r set estado = 'cancelada'
  from torneos t
 where r.torneo_id = t.id and t.estado = 'finalizado' and r.origen = 'torneo'
   and r.fecha > (now() at time zone 'America/La_Paz')::date
   and r.estado in ('pendiente', 'confirmada');

update torneos t
   set fecha_fin = greatest(t.fecha_inicio, coalesce(
         (select max(r.fecha) from reservas r
           where r.torneo_id = t.id and r.origen = 'torneo' and r.estado <> 'cancelada'
             and r.fecha <= (now() at time zone 'America/La_Paz')::date),
         (now() at time zone 'America/La_Paz')::date))
 where t.estado = 'finalizado'
   and t.fecha_fin > (now() at time zone 'America/La_Paz')::date;

-- «Descuento en uan reserva de alguna cancha para cualquier momento »
update recompensas
   set descripcion = btrim(replace(descripcion, 'uan reserva', 'una reserva'))
 where descripcion like '%uan reserva%';

-- La respuesta del complejo a Luisa Rocha la llamaba Pedro, que es el administrador
update comentarios c
   set texto = replace(c.texto, '¡Gracias Pedro!', '¡Gracias ' || split_part(p.nombre, ' ', 1) || '!')
  from comentarios original
  join profiles p on p.id = original.autor_id
 where c.responde_a = original.id
   and c.texto like '¡Gracias Pedro!%'
   and p.nombre not like 'Pedro%';

-- Los textos viejos de las notificaciones, como los de ahora
update notificaciones set detalle = replace(detalle, 'Revisá', 'Revisa') where detalle like '%Revisá%';
update notificaciones set detalle = replace(detalle, 'Comunicate', 'Comunícate') where detalle like '%Comunicate%';

-- «para hoy 11:00» → «para el vie 30/10 a las 11:00». «Hoy» era el día en que
-- se escribió el aviso, contado en UTC como lo hacía la función vieja.
update notificaciones n
   set detalle = regexp_replace(n.detalle, '(para |· )hoy (\d\d:\d\d)',
         '\1el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from (n.created_at at time zone 'UTC')::date)::int + 1]
         || ' ' || to_char((n.created_at at time zone 'UTC')::date, 'DD/MM') || ' a las \2')
 where n.detalle ~ '(para |· )hoy \d\d:\d\d';
update notificaciones n
   set detalle = regexp_replace(n.detalle, '(para |· )mañana (\d\d:\d\d)',
         '\1el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from (n.created_at at time zone 'UTC')::date + 1)::int + 1]
         || ' ' || to_char((n.created_at at time zone 'UTC')::date + 1, 'DD/MM') || ' a las \2')
 where n.detalle ~ '(para |· )mañana \d\d:\d\d';


-- ── 8. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 46 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 46
select 'version ' || version_esquema();
