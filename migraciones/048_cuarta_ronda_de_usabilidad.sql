-- 048 · Lo que quedó de la cuarta ronda de pruebas de usabilidad
--
-- 1. Una reserva que ya se jugó no bloquea nada. A la tarde, la Wally 1 no se
--    podía desactivar por una reserva de las 11:00 de esa misma mañana, y un
--    entrenamiento nuevo chocaba con ella. Ahora cuentan solo las reservas que
--    todavía no terminaron.
-- 2. Arreglos de datos:
--    · el horario de los torneos con tilde («Sáb, Dom», no «Sab, Dom»);
--    · «horarios accsecibles» en la descripción de un complejo;
--    · las notificaciones de antes de la 046 que decían «el 02/09 22:00»
--      ahora dicen «el mié 02/09 a las 22:00», como las nuevas.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. Solo las reservas que todavía no terminaron ──────────────────────────
-- El fin de una reserva como fecha y hora. Una que termina a medianoche
-- (hora_fin 00:00) termina al día siguiente.
create or replace function fin_de_reserva(f date, inicio time, fin time)
returns timestamp
language sql immutable
as $$ select f + fin + case when fin <= inicio then interval '1 day' else interval '0' end $$;

create or replace function revisar_horario_entrenamiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa empresas%rowtype;
  v_choque  record;
  v_ahora   timestamp := now() at time zone 'America/La_Paz';
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
     and fin_de_reserva(r.fecha, r.hora_inicio, r.hora_fin) > v_ahora
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

create or replace function cancha_sin_reservas_al_desactivar()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ahora    timestamp := now() at time zone 'America/La_Paz';
  v_clientes integer;
  v_torneo   integer;
  v_proxima  record;
begin
  if auth.uid() is null or not old.activa or new.activa then
    return new;
  end if;

  select count(*) filter (where origen <> 'torneo'), count(*) filter (where origen = 'torneo')
    into v_clientes, v_torneo
    from reservas
   where cancha_id = new.id
     and fin_de_reserva(fecha, hora_inicio, hora_fin) > v_ahora
     and (estado in ('pendiente', 'confirmada') or (estado = 'apartada' and aparta_hasta > now()));

  if v_clientes + v_torneo > 0 then
    select r.nro, r.fecha, r.hora_inicio, r.origen, t.nombre as torneo into v_proxima
      from reservas r left join torneos t on t.id = r.torneo_id
     where r.cancha_id = new.id
       and fin_de_reserva(r.fecha, r.hora_inicio, r.hora_fin) > v_ahora
       and r.estado in ('pendiente', 'confirmada', 'apartada')
     order by r.fecha, r.hora_inicio limit 1;
    raise exception 'Esa cancha todavía tiene % reserva(s) de clientes y % jornada(s) de torneo. La próxima es % el % a las %. Resuélvelas antes de desactivarla.',
      v_clientes, v_torneo,
      case when v_proxima.origen = 'torneo' then 'una jornada de ' || coalesce(v_proxima.torneo, 'un torneo')
           else 'la reserva ' || coalesce(v_proxima.nro, '') end,
      to_char(v_proxima.fecha, 'DD/MM'), to_char(v_proxima.hora_inicio, 'HH24:MI');
  end if;

  return new;
end;
$$;


-- ── 2. Arreglos de datos ────────────────────────────────────────────────────
-- «Sab, Dom: 14:00 a 18:00» → «Sáb, Dom: 14:00 a 18:00»
update torneos
   set horarios = regexp_replace(regexp_replace(horarios, '\mMie\M', 'Mié', 'g'), '\mSab\M', 'Sáb', 'g')
 where horarios ~ '\m(Mie|Sab)\M';

update empresas
   set descripcion = replace(descripcion, 'accsecibles', 'accesibles')
 where descripcion like '%accsecibles%';

-- «para el 02/09 22:00» → «para el mié 02/09 a las 22:00». El año es el del aviso.
update notificaciones n
   set detalle = regexp_replace(n.detalle, '(para |· )el (\d\d)/(\d\d) (\d\d:\d\d)',
         '\1el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from x.f)::int + 1]
         || ' \2/\3 a las \4')
  from (select s.id, make_date(extract(year from s.created_at)::int, (s.m[2])::int, (s.m[1])::int) as f
          from (select id, created_at,
                       regexp_match(detalle, '(?:para |· )el (\d\d)/(\d\d) \d\d:\d\d') as m
                  from notificaciones) s
         where s.m is not null) x
 where x.id = n.id;


-- ── 3. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 48 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 48
select 'version ' || version_esquema();
