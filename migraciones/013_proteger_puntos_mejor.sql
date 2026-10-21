-- 013 · Proteger puntos y rol sin depender de una bandera
--
-- La migracion 004 protegia esos dos campos con una bandera de sesion que
-- sumar_puntos debia encender antes de tocar el saldo. Fragil: si esa funcion
-- quedaba en una version anterior, el disparador descartaba los puntos EN
-- SILENCIO. Se detecto asi: al calificar un complejo quedaba la linea en el
-- historial ('Califico un complejo +5') pero el saldo seguia en cero.
--
-- Ahora se mira quien esta ejecutando la operacion, que es un dato que el
-- navegador no puede alterar:
--
--   * Un pedido del navegador corre con el rol 'authenticated'  -> se descarta
--   * Las funciones internas (SECURITY DEFINER) corren como su dueno -> pasa
--   * El super administrador -> pasa
--
-- No hay nada que encender ni que recordar: cualquier funcion interna que
-- otorgue puntos en el futuro funciona sin tener que acordarse de la bandera.

create or replace function proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = public          -- SIN security definer: ver migracion 014
as $$
begin
  -- current_user es 'authenticated' solo cuando el pedido viene de afuera.
  -- Dentro de una funcion SECURITY DEFINER pasa a ser el dueno de la funcion.
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

-- sumar_puntos ya no necesita encender nada: se deja limpia y se reasegura de
-- que sea la version correcta, por si la anterior no llego a aplicarse.
create or replace function sumar_puntos(
  p_cliente_id  uuid,
  p_concepto    text,
  p_puntos      integer,
  p_referencia  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set puntos = greatest(0, puntos + p_puntos) where id = p_cliente_id;

  insert into puntos_historial (cliente_id, concepto, puntos, referencia)
  values (p_cliente_id, p_concepto, p_puntos, p_referencia);
end;
$$;

revoke execute on function sumar_puntos(uuid, text, integer, uuid) from anon, authenticated;

-- canjear_recompensa tampoco necesita la bandera
create or replace function canjear_recompensa(p_recompensa uuid)
returns canjes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente    uuid := auth.uid();
  v_saldo      integer;
  v_recompensa recompensas%rowtype;
  v_canje      canjes%rowtype;
  v_codigo     text;
begin
  if v_cliente is null then
    raise exception 'Tenes que iniciar sesion para canjear';
  end if;

  select * into v_recompensa from recompensas where id = p_recompensa;
  if not found then
    raise exception 'Esa recompensa ya no existe';
  end if;
  if not v_recompensa.activa then
    raise exception 'Esa recompensa ya no esta disponible';
  end if;

  -- El bloqueo evita que dos pestanas canjeen el mismo saldo a la vez
  select puntos into v_saldo from profiles where id = v_cliente for update;

  if v_saldo < v_recompensa.puntos then
    raise exception 'No te alcanzan los puntos: tenes % y necesitas %',
      v_saldo, v_recompensa.puntos;
  end if;

  v_codigo := 'SPK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into canjes (cliente_id, recompensa_id, empresa_id, puntos_gastados, codigo, estado)
  values (v_cliente, p_recompensa, v_recompensa.empresa_id, v_recompensa.puntos, v_codigo, 'disponible')
  returning * into v_canje;

  perform sumar_puntos(v_cliente, 'Canje: ' || v_recompensa.nombre,
                       -v_recompensa.puntos, v_canje.id);

  return v_canje;
end;
$$;

grant execute on function canjear_recompensa(uuid) to authenticated;
