-- 014 · Corrige la proteccion de puntos y rol
--
-- La migracion 013 declaro proteger_campos_perfil() como SECURITY DEFINER.
-- Ese fue el error: dentro de una funcion SECURITY DEFINER, current_user deja
-- de ser quien hizo el pedido y pasa a ser el dueno de la funcion. Asi la
-- comparacion  current_user = 'authenticated'  nunca se cumplia y la
-- proteccion no actuaba nunca: un cliente podia ponerse los puntos que
-- quisiera desde la consola del navegador.
--
-- El disparador tiene que correr con los permisos de QUIEN llama, no con los
-- del dueno. Es decir, SECURITY INVOKER, que es el modo por omision:
--
--   * Pedido desde el navegador       -> current_user = 'authenticated'  -> se descarta
--   * Dentro de una funcion interna   -> current_user = el dueno         -> pasa
--
-- es_superadmin() sigue siendo SECURITY DEFINER y funciona igual: lo que
-- importa ahi es auth.uid(), que no cambia.

create or replace function proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = public          -- sin SECURITY DEFINER: ese era el problema
as $$
begin
  if current_user = 'authenticated' and not es_superadmin() then
    new.puntos := old.puntos;
    new.rol    := old.rol;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_perfil on profiles;
create trigger trg_proteger_perfil
  before update on profiles
  for each row execute function proteger_campos_perfil();
