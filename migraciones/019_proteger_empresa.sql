-- 019 · El administrador edita su complejo, pero no se aprueba solo
--
-- La politica "admin_ve_su_empresa" es FOR ALL: le permite al administrador
-- modificar la fila de su complejo. Eso es lo que hace falta para la pantalla
-- "Mi cuenta", donde ahora puede corregir la direccion, el horario, los
-- deportes y marcar la ubicacion en el mapa: antes esos datos solo se cargaban
-- al registrarse y despues quedaban asi para siempre.
--
-- Pero esa misma politica lo dejaba tocar dos columnas que no le tocan:
--
--   estado    -> un complejo 'pendiente' podia ponerse 'activo' solo y
--                aparecerles a los clientes sin que el super administrador lo
--                revisara. Uno 'suspendido' podia volver a levantarse.
--   admin_id  -> podia pasarle el complejo a otra cuenta.
--
-- No alcanza con que la pantalla no mande esos campos: cualquiera con la
-- consola del navegador abierta puede armar el pedido a mano. La regla tiene
-- que estar en la base.
--
-- Como en la 014: SECURITY INVOKER (el modo por omision, sin declararlo).
-- Dentro de un SECURITY DEFINER, current_user pasa a ser el dueno de la
-- funcion y la comparacion con 'authenticated' no se cumpliria nunca, o sea
-- que la proteccion no actuaria.

create or replace function proteger_campos_empresa()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and not es_superadmin() then
    new.estado   := old.estado;
    new.admin_id := old.admin_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_empresa on empresas;
create trigger trg_proteger_empresa
  before update on empresas
  for each row execute function proteger_campos_empresa();
