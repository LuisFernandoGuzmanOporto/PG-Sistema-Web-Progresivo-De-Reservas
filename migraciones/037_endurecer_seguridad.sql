-- 037 · Endurecer la seguridad (resultado de la auditoría)
--
-- Cierra lo que encontró la auditoría de seguridad, sin cambiar lo que cada
-- rol puede hacer por el camino normal de la aplicación.
--
--   1. Nadie puede elegir su propio rol al registrarse.
--   2. Las funciones internas (sumar puntos, mandar avisos) ya no se pueden
--      llamar desde la API.
--   3. Un usuario no puede reactivar su cuenta suspendida ni cambiar su correo.
--   4. Un complejo nuevo siempre nace pendiente, y solo un complejo aprobado
--      da poderes de administración.
--   5. El C.I. de los jugadores deja de ser legible desde la API.
--
-- Se puede ejecutar más de una vez.

-- ── 1. El rol lo decide el servidor, no quien se registra ─────────────────
-- Antes se copiaba raw_user_meta_data->>'rol', que escribe el propio usuario
-- al registrarse: cualquiera podía crearse una cuenta de superadministrador.
--   · 'admin_empresa' se admite: es el dueño que pide sumar su complejo, y su
--     complejo nace pendiente (ver punto 4), así que no administra nada.
--   · 'empleado' solo si lo marcó el servidor en raw_app_meta_data, que el
--     usuario no puede tocar (lo pone la función «empleados»).
--   · 'superadmin' nunca desde un registro.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol public.rol_usuario := 'cliente';
begin
  if new.raw_app_meta_data->>'rol' = 'empleado' then
    v_rol := 'empleado';
  elsif new.raw_user_meta_data->>'rol' = 'admin_empresa' then
    v_rol := 'admin_empresa';
  end if;

  insert into public.profiles (id, nombre, correo, rol, avatar_url)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data->>'nombre',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ), 120),
    new.email,
    v_rol,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2. Funciones internas cerradas a la API ───────────────────────────────
-- En PostgreSQL toda función nace ejecutable por PUBLIC. Quitarle el permiso a
-- anon y authenticated no alcanza: lo siguen heredando de PUBLIC. Estas solo
-- las usan los disparadores y otras funciones de la base, que corren como su
-- dueño y no necesitan el permiso.
revoke all on function sumar_puntos(uuid, text, integer, uuid)          from public, anon, authenticated;
revoke all on function avisar(uuid, text, text, text, text)             from public, anon, authenticated;
revoke all on function avisar_al_complejo(uuid, text, text, text, text, text) from public, anon, authenticated;

-- Y para que no vuelva a pasar con las funciones que se creen de aquí en adelante
alter default privileges in schema public revoke execute on functions from public;

-- ── 3. Campos del perfil que el usuario no puede cambiarse ────────────────
-- Ya se protegían rol y puntos. Faltaban:
--   · activo: una cuenta suspendida podía reactivarse sola.
--   · correo: es el que ve el complejo; debe coincidir con el de la cuenta.
create or replace function proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = public          -- SECURITY INVOKER a propósito (ver 014)
as $$
begin
  if current_user = 'authenticated' and not es_superadmin() then
    new.puntos := old.puntos;
    new.rol    := old.rol;
    new.activo := old.activo;
    new.correo := old.correo;
  end if;
  return new;
end;
$$;

-- ── 4. Complejos: nacen pendientes y solo el aprobado administra ──────────
create or replace function complejo_nace_pendiente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and not es_superadmin() then
    new.estado   := 'pendiente';
    new.admin_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_complejo_nace_pendiente on empresas;
create trigger trg_complejo_nace_pendiente
  before insert on empresas
  for each row execute function complejo_nace_pendiente();

-- Administrar (canchas, reservas, torneos, recompensas…) exige que el
-- complejo esté aprobado. Un complejo pendiente o suspendido no da poderes.
create or replace function administra_empresa(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from empresas
                      where id = emp and admin_id = auth.uid() and estado = 'activo') $$;

create or replace function trabaja_en_empresa(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from empresas where id = emp and admin_id = auth.uid() and estado = 'activo')
      or exists (select 1 from empleados e join empresas x on x.id = e.empresa_id
                  where e.empresa_id = emp and e.id = auth.uid() and e.activo and x.estado = 'activo')
$$;

-- El dueño de un complejo pendiente sí puede cargar sus deportes al registrarse
create or replace function es_duenio_empresa(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from empresas where id = emp and admin_id = auth.uid()) $$;

drop policy if exists "deportes_admin_crear" on empresa_deportes;
drop policy if exists "deportes_admin_modificar" on empresa_deportes;
drop policy if exists "deportes_admin_borrar" on empresa_deportes;
create policy "deportes_admin_crear" on empresa_deportes
  for insert with check (es_duenio_empresa(empresa_id));
create policy "deportes_admin_modificar" on empresa_deportes
  for update using (es_duenio_empresa(empresa_id)) with check (es_duenio_empresa(empresa_id));
create policy "deportes_admin_borrar" on empresa_deportes
  for delete using (es_duenio_empresa(empresa_id));

-- ── 5. El C.I. de los jugadores no se lee desde la API ────────────────────
-- Es un dato personal y la aplicación no lo muestra en ninguna pantalla. Se
-- sigue pudiendo cargar al inscribir el equipo; leerlo solo desde la base.
-- (Con el permiso de SELECT sobre toda la tabla, quitarlo a una columna no
-- tiene efecto: hay que quitar el de la tabla y dar el de cada columna.)
revoke select on equipo_jugadores from anon, authenticated;
grant select (id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado)
  on equipo_jugadores to anon, authenticated;

-- La carga inicial pedía la fila completa: ahora pide las mismas columnas
create or replace function datos_iniciales()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'perfiles',             (select coalesce(json_agg(x), '[]') from (select id, nombre from perfiles_publicos) x),
    'empresas',             (select coalesce(json_agg(x order by x.nombre), '[]') from empresas x),
    'empresa_deportes',     (select coalesce(json_agg(x), '[]') from empresa_deportes x),
    'canchas',              (select coalesce(json_agg(x order by x.nombre), '[]') from canchas x),
    'empleados',            (select coalesce(json_agg(x), '[]') from empleados x),
    'entrenadores',         (select coalesce(json_agg(x order by x.nombre), '[]') from entrenadores x),
    'entrenamientos',       (select coalesce(json_agg(x order by x.hora_inicio), '[]') from entrenamientos x),
    'recompensas',          (select coalesce(json_agg(x order by x.puntos), '[]') from recompensas x),
    'calificaciones',       (select coalesce(json_agg(x order by x.created_at desc), '[]') from calificaciones x),
    'reservas',             (select coalesce(json_agg(x order by x.hora_inicio), '[]') from reservas x),
    'canjes',               (select coalesce(json_agg(x order by x.created_at desc), '[]') from canjes x),
    'torneos',              (select coalesce(json_agg(x order by x.fecha_inicio), '[]') from torneos x),
    'solicitudes_cancha',   (select coalesce(json_agg(x), '[]') from solicitudes_cancha x),
    'equipos',              (select coalesce(json_agg(x), '[]') from equipos x),
    'equipo_jugadores',     (select coalesce(json_agg(x order by x.dorsal), '[]') from
                              (select id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado
                                 from equipo_jugadores) x),
    'partidos_torneo',      (select coalesce(json_agg(x order by x.fecha_hora), '[]') from partidos_torneo x),
    'eventos_partido',      (select coalesce(json_agg(x order by x.minuto), '[]') from eventos_partido x),
    'partidos_espontaneos', (select coalesce(json_agg(x), '[]') from partidos_espontaneos x),
    'partido_jugadores',    (select coalesce(json_agg(x), '[]') from partido_jugadores x),
    'bitacora',             (select coalesce(json_agg(x order by x.created_at desc), '[]') from bitacora x),
    'puntos_historial',     (select coalesce(json_agg(x order by x.created_at desc), '[]') from puntos_historial x),
    'profiles',             (select coalesce(json_agg(x order by x.created_at), '[]') from profiles x),
    'comentarios',          (select coalesce(json_agg(x order by x.created_at), '[]') from comentarios x),
    'horarios_ocupados',    (select coalesce(json_agg(x), '[]') from horarios_ocupados x)
  )
$$;
grant execute on function datos_iniciales() to anon, authenticated;

-- Las funciones que la aplicación sí llama siguen abiertas a quien corresponde
grant execute on function version_esquema() to anon, authenticated;

create or replace function version_esquema()
returns integer
language sql stable
as $$ select 37 $$;
