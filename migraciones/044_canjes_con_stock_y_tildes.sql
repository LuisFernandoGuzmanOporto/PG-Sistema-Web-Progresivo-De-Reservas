-- 044 · Las recompensas respetan su stock, y el historial de puntos lleva tildes
--
-- Lo encontraron las pruebas de usabilidad (SUS):
--
-- 1. La base nunca miraba el stock de una recompensa. Con 5 de stock se podían
--    hacer 6, 10 o 50 canjes, y la ficha del complejo seguía diciendo
--    "5 disponibles". Ahora el stock es lo que el complejo ofreció en total:
--    cada canje se lleva una, y cuando ya no quedan la base responde
--    "Esa recompensa se agotó". La recompensa se bloquea mientras se canjea,
--    para que dos clientes no se lleven la última al mismo tiempo.
--
-- 2. Los movimientos del historial de puntos se guardaban sin tilde
--    ("Inscribio un equipo", "Se anulo una reserva"). Se corrigen las
--    funciones que los escriben, que quedan iguales en todo lo demás, y los
--    textos de los movimientos que ya estaban guardados.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. El canje respeta el stock ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION canjear_recompensa(p_recompensa UUID)
RETURNS canjes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cliente    UUID := auth.uid();
  v_saldo      INTEGER;
  v_recompensa recompensas%ROWTYPE;
  v_canjeados  INTEGER;
  v_canje      canjes%ROWTYPE;
  v_codigo     TEXT;
BEGIN
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'Tienes que iniciar sesión para canjear';
  END IF;

  -- El bloqueo evita que dos clientes se lleven la última al mismo tiempo
  SELECT * INTO v_recompensa FROM recompensas WHERE id = p_recompensa FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa recompensa ya no existe';
  END IF;
  IF NOT v_recompensa.activa THEN
    RAISE EXCEPTION 'Esa recompensa ya no está disponible';
  END IF;

  -- El stock es lo que el complejo ofreció en total; cada canje se lleva una
  SELECT count(*) INTO v_canjeados FROM canjes WHERE recompensa_id = p_recompensa;
  IF v_canjeados >= v_recompensa.stock THEN
    RAISE EXCEPTION 'Esa recompensa se agotó';
  END IF;

  -- El bloqueo evita que dos pestanas canjeen el mismo saldo a la vez
  SELECT puntos INTO v_saldo FROM profiles WHERE id = v_cliente FOR UPDATE;

  IF v_saldo < v_recompensa.puntos THEN
    RAISE EXCEPTION 'No te alcanzan los puntos: tienes % y necesitas %',
      v_saldo, v_recompensa.puntos;
  END IF;

  v_codigo := 'SPK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  INSERT INTO canjes (cliente_id, recompensa_id, empresa_id, puntos_gastados, codigo, estado)
  VALUES (v_cliente, p_recompensa, v_recompensa.empresa_id, v_recompensa.puntos, v_codigo, 'disponible')
  RETURNING * INTO v_canje;

  PERFORM sumar_puntos(v_cliente, 'Canje: ' || v_recompensa.nombre,
                       -v_recompensa.puntos, v_canje.id);

  RETURN v_canje;
END;
$$;


-- ── 2. Los textos del historial de puntos, con tildes ─────────────────────────
-- puntos_por_reserva: «Completo la reserva» → «Completó la reserva»
CREATE OR REPLACE FUNCTION puntos_por_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Las presenciales no tienen cuenta a la que acreditar
  IF NEW.cliente_id IS NULL THEN RETURN NEW; END IF;

  -- La condicion evita pagar dos veces si la reserva vuelve a pasar por
  -- 'confirmada' (por ejemplo si se rechaza y se reconfirma)
  IF NEW.estado = 'confirmada' AND OLD.estado IS DISTINCT FROM 'confirmada' THEN
    PERFORM sumar_puntos(NEW.cliente_id, 'Reserva confirmada', 5, NEW.id);
  END IF;

  -- Al presentarse el dia del partido, que lo marca el empleado
  IF NEW.asistencia = 'presente' AND OLD.asistencia IS DISTINCT FROM 'presente' THEN
    PERFORM sumar_puntos(NEW.cliente_id, 'Completó la reserva', 5, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- puntos_por_partido: «Se sumo a un partido» → «Se sumó a un partido»
CREATE OR REPLACE FUNCTION puntos_por_partido()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.jugador_id IS NOT NULL THEN
    PERFORM sumar_puntos(NEW.jugador_id, 'Se sumó a un partido', 10, NEW.partido_id);
  END IF;
  RETURN NEW;
END;
$$;

-- puntos_por_equipo: «Inscribio un equipo» → «Inscribió un equipo»
CREATE OR REPLACE FUNCTION puntos_por_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.capitan_id IS NOT NULL THEN
    PERFORM sumar_puntos(NEW.capitan_id, 'Inscribió un equipo', 15, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- puntos_por_calificacion: «Califico un complejo» → «Calificó un complejo»
CREATE OR REPLACE FUNCTION puntos_por_calificacion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM sumar_puntos(NEW.cliente_id, 'Calificó un complejo', 5, NEW.id);
  RETURN NEW;
END;
$$;

-- devolver_puntos: «Salio de un partido» → «Salió de un partido», «Se anulo una reserva» → «Se anuló una reserva»
create or replace function devolver_puntos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_table_name = 'partido_jugadores' then
    if old.jugador_id is not null
       and exists (select 1 from profiles where id = old.jugador_id) then
      perform sumar_puntos(old.jugador_id, 'Salió de un partido', -10, old.partido_id);
    end if;

  elsif tg_table_name = 'equipos' then
    if old.capitan_id is not null
       and exists (select 1 from profiles where id = old.capitan_id) then
      perform sumar_puntos(old.capitan_id, 'Se dio de baja un equipo', -15, old.id);
    end if;

  elsif tg_table_name = 'reservas' then
    if old.cliente_id is not null
       and exists (select 1 from profiles where id = old.cliente_id) then
      if old.estado = 'confirmada' then
        perform sumar_puntos(old.cliente_id, 'Se anuló una reserva', -5, old.id);
      end if;
      if old.asistencia = 'presente' then
        perform sumar_puntos(old.cliente_id, 'Se anuló una reserva completada', -5, old.id);
      end if;
    end if;
  end if;

  return old;
end;
$$;

-- Los movimientos que ya estaban guardados
update puntos_historial set concepto = replace(concepto, 'Califico un complejo', 'Calificó un complejo') where concepto like 'Califico un complejo%';
update puntos_historial set concepto = replace(concepto, 'Completo la reserva', 'Completó la reserva') where concepto like 'Completo la reserva%';
update puntos_historial set concepto = replace(concepto, 'Inscribio un equipo', 'Inscribió un equipo') where concepto like 'Inscribio un equipo%';
update puntos_historial set concepto = replace(concepto, 'Salio de un partido', 'Salió de un partido') where concepto like 'Salio de un partido%';
update puntos_historial set concepto = replace(concepto, 'Se anulo una reserva', 'Se anuló una reserva') where concepto like 'Se anulo una reserva%';
update puntos_historial set concepto = replace(concepto, 'Se sumo a un partido', 'Se sumó a un partido') where concepto like 'Se sumo a un partido%';


-- ── 3. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 44 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 44
select 'version ' || version_esquema();
