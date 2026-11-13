-- 049 · El super administrador ve todo de cada complejo (solo lectura)
--
-- El menú del super administrador ahora tiene «Ver un complejo», con las
-- mismas pantallas del administrador del complejo, y pantallas propias:
-- reservas de todos, consultar un horario, bitácora, reseñas y reportes.
--
-- Casi todo ya lo podía leer (empresas, perfiles, reservas, canjes, empleados,
-- y lo que es público). Le faltaban tres cosas:
--   1. La bitácora: quién confirmó, rechazó o marcó asistencia, y cuándo.
--      Es lo que responde «¿quién atendió esa reserva?».
--   2. Las solicitudes de cancha de los torneos.
--   3. El teléfono de los empleados, que viaja aparte (migraciones/040).
--
-- Solo se agregan permisos de LECTURA. El super administrador sigue sin poder
-- crear, cambiar ni borrar nada de un complejo: eso lo hace su administrador.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. La bitácora de todos los complejos ───────────────────────────────────
drop policy if exists "superadmin_lee_bitacora" on bitacora;
create policy "superadmin_lee_bitacora" on bitacora
  for select using (es_superadmin());


-- ── 2. Las solicitudes de cancha de los torneos ─────────────────────────────
drop policy if exists "superadmin_lee_solicitudes_cancha" on solicitudes_cancha;
create policy "superadmin_lee_solicitudes_cancha" on solicitudes_cancha
  for select using (es_superadmin());


-- ── 3. El teléfono de los empleados ─────────────────────────────────────────
-- La misma función de la 040: al administrador le da los de su complejo; al
-- super administrador, los de todos. A cualquier otro, nada.
create or replace function telefonos_de_mis_empleados()
returns table (id uuid, telefono text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.telefono
    from empleados e
    join profiles p on p.id = e.id
   where administra_empresa(e.empresa_id) or es_superadmin()
$$;
revoke execute on function telefonos_de_mis_empleados() from public, anon;
grant execute on function telefonos_de_mis_empleados() to authenticated;


-- ── 4. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 49 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 49
select 'version ' || version_esquema();
