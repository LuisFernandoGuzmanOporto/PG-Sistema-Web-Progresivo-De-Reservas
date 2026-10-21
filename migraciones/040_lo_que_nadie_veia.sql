-- 040 · Lo que la base guardaba y nadie veía
--
-- Salió de revisar la base columna por columna, mirando qué muestra o usa
-- la aplicación y qué no.
--
-- 1. EL C.I. DE LOS JUGADORES. Se pedía al inscribir un equipo, pero nadie lo
--    podía leer (la 037 lo cerró por ser un dato personal) y ninguna pantalla
--    lo usa. Si no se usa, no se pide: la aplicación deja de pedirlo. Esta
--    migración no borra nada; lo que ya estaba guardado lo borra la 041.
--
-- 2. SOLICITUDES_EMPRESA. Era la tabla donde caía el formulario «Registrar mi
--    complejo». Desde la 015 la solicitud se crea directamente en empresas,
--    pendiente de aprobación, y esta tabla quedó sin uso. Además, cualquiera,
--    incluso sin cuenta, podía escribir en ella: eso se cierra. La tabla y lo
--    que tiene no se tocan.
--
-- 3. EL TELÉFONO DE LOS EMPLEADOS. El administrador lo escribe al crear la
--    cuenta, pero después no lo podía ver, porque el perfil del empleado solo
--    lo lee el propio empleado. Ahora el dueño del complejo ve el teléfono de
--    sus empleados, y nada más de su perfil.
--
-- 4. LA HORA DE LOS PARTIDOS ESPONTÁNEOS. Se guardaba como texto («Ahora
--    mismo», «En 1 hora») y ese texto no cambiaba nunca: días después el
--    partido seguía diciendo «Ahora». La fecha y hora real va en fecha_hora,
--    que estaba vacía; la aplicación deja de escribir y leer el texto (la 041
--    lo borra). No se acepta una hora que ya pasó, ni sumarse a un partido
--    que empezó hace más de una hora.
--
-- 5. QUIÉN ENTREGÓ UN CANJE Y QUIÉN RESOLVIÓ UNA SOLICITUD DE CANCHA, Y
--    CUÁNDO. Se guardaba con la hora del navegador. Ahora lo pone la base:
--    la cuenta de quien lo hace y la hora del servidor. El administrador lo
--    ve en sus pantallas.
--
-- Se puede ejecutar más de una vez.


-- ── 1. El C.I. de los jugadores ───────────────────────────────────────────
-- Nada que hacer en la base: el formulario ya no lo pide y nadie lo lee.


-- ── 2. La tabla vieja de solicitudes de complejo ─────────────────────────
-- Nadie más puede escribir en ella. Solo el super administrador la puede leer.
do $$
begin
  if to_regclass('public.solicitudes_empresa') is not null then
    drop policy if exists "crear_solicitud" on solicitudes_empresa;
  end if;
end $$;


-- ── 3. El teléfono de los empleados, para su administrador ───────────────
-- Una función y no una política sobre profiles: así el administrador recibe
-- solo el teléfono, no el perfil entero de su empleado.
create or replace function telefonos_de_mis_empleados()
returns table (id uuid, telefono text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.telefono
    from empleados e
    join profiles p on p.id = e.id
   where administra_empresa(e.empresa_id)
$$;
revoke execute on function telefonos_de_mis_empleados() from public, anon;
grant execute on function telefonos_de_mis_empleados() to authenticated;


-- ── 4. La hora real de los partidos espontáneos ──────────────────────────
-- Los partidos que ya existen: la hora se deduce del texto y de cuándo se
-- creó (hora de Bolivia).
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'partidos_espontaneos'
                and column_name = 'cuando') then
    execute $q$
      update partidos_espontaneos set fecha_hora = case
        when cuando ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
          then cuando::timestamp at time zone 'America/La_Paz'
        when cuando ~ '^Mañana \d{2}:\d{2}$'
          then ((created_at at time zone 'America/La_Paz')::date + 1
                + substring(cuando from '\d{2}:\d{2}')::time) at time zone 'America/La_Paz'
        when cuando = 'En 30 min' then created_at + interval '30 minutes'
        when cuando = 'En 1 hora' then created_at + interval '1 hour'
        else created_at
      end
      where fecha_hora is null
    $q$;
  end if;
end $$;

alter table partidos_espontaneos alter column fecha_hora set default now();
alter table partidos_espontaneos alter column fecha_hora set not null;
-- El texto ya no se escribe: deja de ser obligatorio
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'partidos_espontaneos'
                and column_name = 'cuando') then
    alter table partidos_espontaneos alter column cuando drop not null;
  end if;
end $$;

-- No se organiza un partido para una hora que ya pasó (con un margen por
-- si el reloj del teléfono va un poco atrasado). Se revisa al crearlo: si
-- después quien lo organizó lo cambia, solo afecta a su propio partido.
create or replace function revisar_hora_partido()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.fecha_hora < now() - interval '15 minutes' then
    raise exception 'Esa hora ya pasó. Elige una hora que todavía no llegó.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hora_partido on partidos_espontaneos;
create trigger trg_hora_partido before insert on partidos_espontaneos
  for each row execute function revisar_hora_partido();

-- Ni nadie se suma a un partido que empezó hace más de una hora: para la
-- aplicación ese partido ya se jugó y no aparece en las listas
create or replace function revisar_cupo_partido()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_partido partidos_espontaneos%rowtype;
  v_unidos  integer;
begin
  -- FOR UPDATE: si dos se suman al ultimo lugar a la vez, el segundo espera
  -- y encuentra el partido lleno
  select * into v_partido from partidos_espontaneos
   where id = new.partido_id for update;

  if not v_partido.activo then
    raise exception 'Ese partido ya no está abierto';
  end if;

  if v_partido.fecha_hora < now() - interval '1 hour' then
    raise exception 'Ese partido ya se jugó';
  end if;

  select count(*) into v_unidos from partido_jugadores where partido_id = new.partido_id;
  if v_unidos >= v_partido.max_jugadores then
    raise exception 'El partido ya está completo (% jugadores)', v_partido.max_jugadores;
  end if;

  return new;
end;
$$;


-- ── 5. Quién y cuándo, puesto por la base ────────────────────────────────
create or replace function sellar_entrega_canje()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    new.entregado_por := coalesce(auth.uid(), new.entregado_por);
    new.entregado_at  := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sellar_entrega on canjes;
create trigger trg_sellar_entrega before update on canjes
  for each row execute function sellar_entrega_canje();

create or replace function sellar_resolucion_solicitud()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.estado = 'pendiente' then
    new.resuelta_por := null;
    new.resuelta_at  := null;
  elsif tg_op = 'INSERT' or old.estado is distinct from new.estado then
    new.resuelta_por := coalesce(auth.uid(), new.resuelta_por);
    new.resuelta_at  := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sellar_resolucion on solicitudes_cancha;
create trigger trg_sellar_resolucion before insert or update on solicitudes_cancha
  for each row execute function sellar_resolucion_solicitud();


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 40 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: todos los partidos tienen su fecha y hora, y la versión es 40
select 'fecha_hora sin vacíos: ' || (count(*) filter (where fecha_hora is null) = 0)::text
  from partidos_espontaneos
union all
select 'version ' || version_esquema();
