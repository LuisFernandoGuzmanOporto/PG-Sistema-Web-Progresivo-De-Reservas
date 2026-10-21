-- 004 · El canje de puntos se resuelve en el servidor
--
-- Problema: la politica "perfil_propio" es FOR ALL sobre profiles, asi que un
-- cliente puede hacer  update profiles set puntos = 999999  contra la API y
-- regalarse puntos. Ademas puntos_historial solo tenia politica de lectura,
-- de modo que el historial nunca se escribia.
--
-- Solucion: una sola funcion, con SECURITY DEFINER, hace todo el canje de
-- forma atomica: verifica el saldo, crea el canje, descuenta y deja el
-- historial. El cliente ya no toca ninguna de esas tablas directamente, y un
-- disparador impide que se cambie puntos o rol por fuera de esta funcion.

-- ── 1. Nadie edita a mano ni sus puntos ni su rol ──────────────────────────

create or replace function proteger_campos_perfil()
returns trigger
language plpgsql
as $$
begin
  -- La bandera solo la pone canjear_recompensa(); si no esta, se descartan
  -- los cambios a esos dos campos y el resto del update sigue normal.
  if coalesce(current_setting('sportika.interno', true), '') <> 'si' then
    if not es_superadmin() then
      new.puntos := old.puntos;
      new.rol    := old.rol;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_perfil on profiles;
create trigger trg_proteger_perfil
  before update on profiles
  for each row execute function proteger_campos_perfil();

-- ── 2. El canje completo, en una sola operacion ────────────────────────────

create or replace function canjear_recompensa(p_recompensa uuid)
returns canjes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente   uuid := auth.uid();
  v_saldo     integer;
  v_recompensa recompensas%rowtype;
  v_canje     canjes%rowtype;
  v_codigo    text;
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

  -- Codigo corto y legible para que el cliente lo muestre en el mostrador
  v_codigo := 'SPK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into canjes (cliente_id, recompensa_id, empresa_id, puntos_gastados, codigo, estado)
  values (v_cliente, p_recompensa, v_recompensa.empresa_id, v_recompensa.puntos, v_codigo, 'disponible')
  returning * into v_canje;

  perform set_config('sportika.interno', 'si', true);   -- true = solo esta transaccion
  update profiles set puntos = puntos - v_recompensa.puntos where id = v_cliente;
  perform set_config('sportika.interno', '', true);

  insert into puntos_historial (cliente_id, concepto, puntos, referencia)
  values (v_cliente, 'Canje: ' || v_recompensa.nombre, -v_recompensa.puntos, v_canje.id);

  return v_canje;
end;
$$;

revoke all on function canjear_recompensa(uuid) from public;
grant execute on function canjear_recompensa(uuid) to authenticated;

-- ── 3. El cliente ya no inserta canjes por su cuenta ───────────────────────
-- Los sigue leyendo; crearlos pasa solo por la funcion de arriba.

drop policy if exists "canjes_propios" on canjes;

create policy "canjes_propios_lectura" on canjes
  for select using (cliente_id = auth.uid());

-- ── 4. sumar_puntos tambien tiene que poder tocar el saldo ────────────────
-- Sin esto el disparador de arriba le descartaria el cambio en silencio y los
-- clientes dejarian de recibir puntos por sus reservas.

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
  perform set_config('sportika.interno', 'si', true);
  update profiles set puntos = puntos + p_puntos where id = p_cliente_id;
  perform set_config('sportika.interno', '', true);

  insert into puntos_historial (cliente_id, concepto, puntos, referencia)
  values (p_cliente_id, p_concepto, p_puntos, p_referencia);
end;
$$;
