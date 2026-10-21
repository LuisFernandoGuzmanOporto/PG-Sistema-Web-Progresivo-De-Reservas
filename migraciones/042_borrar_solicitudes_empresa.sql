-- 042 · Borrar la tabla vieja de solicitudes de complejo
--
-- solicitudes_empresa era la tabla donde caía el formulario «Registrar mi
-- complejo». Desde la 015 la solicitud se crea directamente en empresas, con
-- estado 'pendiente', y el super administrador la aprueba ahí. Esta tabla
-- quedó sin uso: la aplicación no la lee ni la escribe (la 040 ya le había
-- cerrado la escritura).
--
-- Antes de borrarla se comprueba que cada solicitud que tiene ya esté en
-- empresas, con el mismo dueño. Si falta alguna, no se borra nada.
--
-- Borra para siempre (no se puede deshacer). Se puede ejecutar más de una vez.


do $$
begin
  if to_regclass('public.solicitudes_empresa') is not null then
    if exists (
      select 1 from solicitudes_empresa s
       where not exists (select 1 from profiles p
                           join empresas e on e.admin_id = p.id
                          where p.correo = s.admin_correo)
    ) then
      raise exception 'Hay solicitudes de complejo que no están en empresas. Revísalas antes de borrar la tabla.';
    end if;
    drop table solicitudes_empresa;
  end if;
end $$;


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 42 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la tabla ya no está y la versión es 42
select 'solicitudes_empresa: ' || coalesce(to_regclass('public.solicitudes_empresa')::text, 'borrada')
union all
select 'version ' || version_esquema();
