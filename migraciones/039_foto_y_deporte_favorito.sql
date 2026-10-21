-- 039 · Foto de perfil, deporte favorito y escudos de los equipos
--
-- 1. FOTO DE PERFIL. Cada persona (cliente, administrador, empleado o super
--    administrador) puede subir su foto, cambiarla o quitarla, y volver a la
--    foto de su cuenta de Google. La foto se guarda en el depósito público,
--    en avatares/<su id>/, y nadie puede escribir en la carpeta de otro.
--    En profiles.avatar_url solo se acepta una foto de su propia carpeta o
--    una foto de Google: así nadie apunta su perfil a un sitio cualquiera.
--
-- 2. DEPORTE FAVORITO. El cliente lo elige en Mi Perfil y la aplicación le
--    muestra primero lo de ese deporte. Solo se aceptan los deportes del
--    sistema.
--
-- 3. ESCUDOS. Lo encontró la revisión de este cambio: el capitán no podía
--    subir el escudo de su equipo, porque solo el dueño del complejo podía
--    escribir en el depósito público. Ahora quien inscribe un equipo puede
--    subir su escudo mientras el torneo recibe inscripciones, y solo quien
--    lo subió (o el organizador) puede reemplazarlo o borrarlo.
--
-- 4. Los comentarios muestran la foto de quien escribe: la vista pública de
--    perfiles suma la foto (nombre y foto, nada más).
--
-- Se puede ejecutar más de una vez.


-- ── 1 y 2. Lo que se acepta en el perfil ──────────────────────────────────
alter table profiles drop constraint if exists perfil_foto_valida;
alter table profiles add constraint perfil_foto_valida check (
  avatar_url is null
  or avatar_url like 'avatares/' || id::text || '/%'
  or avatar_url ~ '^https://[a-z0-9.-]+\.googleusercontent\.com/'
);

alter table profiles drop constraint if exists perfil_deporte_valido;
alter table profiles add constraint perfil_deporte_valido check (
  deporte_fav is null
  or deporte_fav in ('Fútbol', 'Wally', 'Básquetbol', 'Voleibol', 'Pádel', 'Tenis')
);


-- ── 1 y 3. Quién puede escribir en el depósito público ────────────────────
--   <empresa_id>/<archivo>            -> el dueño del complejo
--   torneos/<torneo_id>/<archivo>     -> quien organiza el torneo o su complejo
--   equipos/<torneo_id>/<archivo>     -> quien inscribe un equipo, con el torneo abierto
--   avatares/<usuario_id>/<archivo>   -> esa misma persona
create or replace function public.puede_escribir_publico(ruta text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select es_superadmin()
      or case (storage.foldername(ruta))[1]
           when 'torneos' then
             organiza_torneo(uuid_seguro((storage.foldername(ruta))[2]))
             or trabaja_en_empresa(empresa_del_torneo(uuid_seguro((storage.foldername(ruta))[2])))
           when 'equipos' then
             exists (select 1 from torneos t
                      where t.id = uuid_seguro((storage.foldername(ruta))[2])
                        and t.estado = 'inscripciones')
           when 'avatares' then
             (storage.foldername(ruta))[2] = auth.uid()::text
           else
             administra_empresa(uuid_seguro((storage.foldername(ruta))[1]))
         end
$$;

-- Reemplazar o borrar: lo mismo, pero el escudo de un equipo solo lo toca
-- quien lo subió o quien organiza el torneo. Si no, cualquiera que viera la
-- dirección del escudo de otro equipo podría borrarlo.
create or replace function public.puede_cambiar_publico(ruta text, duenio text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case (storage.foldername(ruta))[1]
           when 'equipos' then
             es_superadmin()
             or duenio = auth.uid()::text
             or organiza_torneo(uuid_seguro((storage.foldername(ruta))[2]))
           else puede_escribir_publico(ruta)
         end
$$;

revoke all on function public.puede_escribir_publico(text) from public, anon;
grant execute on function public.puede_escribir_publico(text) to authenticated;
revoke all on function public.puede_cambiar_publico(text, text) from public, anon;
grant execute on function public.puede_cambiar_publico(text, text) to authenticated;

drop policy if exists "publico_reemplazar" on storage.objects;
create policy "publico_reemplazar" on storage.objects
  for update to authenticated
  using      (bucket_id = 'publico' and puede_cambiar_publico(name, owner_id))
  with check (bucket_id = 'publico' and puede_cambiar_publico(name, owner_id));

drop policy if exists "publico_borrar" on storage.objects;
create policy "publico_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'publico' and puede_cambiar_publico(name, owner_id));


-- ── 4. La foto en la vista pública de perfiles ────────────────────────────
create or replace view perfiles_publicos
  with (security_invoker = false) as
  select id, nombre, avatar_url from profiles;

grant select on perfiles_publicos to anon, authenticated;

-- La carga inicial pide nombre y foto de cada perfil (antes solo el nombre)
create or replace function datos_iniciales()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'perfiles',             (select coalesce(json_agg(x), '[]') from (select id, nombre, avatar_url from perfiles_publicos) x),
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


-- ── Versión del esquema, para las pruebas ─────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 39 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: deben aparecer las dos reglas nuevas y la versión 39
select conname from pg_constraint
 where conname in ('perfil_foto_valida', 'perfil_deporte_valido')
union all
select 'version ' || version_esquema();
