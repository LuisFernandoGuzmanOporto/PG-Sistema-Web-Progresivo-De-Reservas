-- ============================================================
-- 026 · Lo que faltaba del alcance
--
--   1. El cupo maximo de un entrenamiento (punto 5.2).
--   2. El codigo de canje aplicado de verdad al reservar y al
--      inscribir un equipo (punto 5.2).
--
-- Hasta ahora el codigo se generaba, se mostraba y se copiaba, pero no
-- servia para nada: el cliente gastaba sus puntos en «Descuento 20% en
-- reserva» y despues pagaba el precio completo igual.
-- ============================================================


-- ── 1. CUPO DE LOS ENTRENAMIENTOS ───────────────────────────
--
-- Cuanta gente entra. Queda en NULL cuando el complejo no pone limite,
-- que es distinto de poner cero: cero seria «no entra nadie».

ALTER TABLE entrenamientos
  ADD COLUMN IF NOT EXISTS cupo_maximo SMALLINT;

ALTER TABLE entrenamientos DROP CONSTRAINT IF EXISTS cupo_razonable;
ALTER TABLE entrenamientos
  ADD CONSTRAINT cupo_razonable CHECK (cupo_maximo IS NULL OR cupo_maximo > 0);

COMMENT ON COLUMN entrenamientos.cupo_maximo IS
  'Cuantos alumnos entran. NULL = sin limite. No hay inscripcion en linea: es informativo para el que mira el horario.';


-- ── 2. CUANTO DESCUENTA UNA RECOMPENSA ──────────────────────
--
-- La tabla decia que una recompensa era «descuento_reserva», pero no
-- cuanto descontaba: el 20% vivia dentro del NOMBRE, como texto. Ningun
-- programa puede leer «Descuento 20% en reserva» y sacar de ahi que son
-- veinte por ciento.
--
-- Son dos formas, y hacen falta las dos:
--
--   porcentaje    20  -> se descuenta el 20% de lo que salga la reserva
--   horas_gratis   1  -> se regala 1 hora al precio de esa cancha
--
-- «Una hora gratis» NO se puede escribir como porcentaje: sobre una
-- reserva de una hora es el 100%, sobre una de dos es el 50% y sobre una
-- de cuatro el 25%. Depende de cuanto reserve el cliente.

ALTER TABLE recompensas
  ADD COLUMN IF NOT EXISTS descuento_tipo  TEXT,
  ADD COLUMN IF NOT EXISTS descuento_valor NUMERIC(6,2);

ALTER TABLE recompensas DROP CONSTRAINT IF EXISTS descuento_coherente;
ALTER TABLE recompensas
  ADD CONSTRAINT descuento_coherente CHECK (
    -- o no hay descuento configurado...
    (descuento_tipo IS NULL AND descuento_valor IS NULL)
    -- ...o esta completo y con un valor con sentido
    OR (descuento_tipo = 'porcentaje'   AND descuento_valor > 0 AND descuento_valor <= 100)
    OR (descuento_tipo = 'horas_gratis' AND descuento_valor > 0 AND descuento_valor <= 24)
  );

COMMENT ON COLUMN recompensas.descuento_tipo IS
  'porcentaje u horas_gratis. Solo para tipo = descuento_reserva.';
COMMENT ON COLUMN recompensas.descuento_valor IS
  'El numero: 20 con porcentaje = 20 por ciento. 1 con horas_gratis = una hora.';

-- Las que ya existen: se completan por su nombre para no dejarlas rotas.
-- Cualquier otra queda en NULL y el complejo la configura desde su panel.
UPDATE recompensas SET descuento_tipo = 'porcentaje', descuento_valor = 20
 WHERE tipo = 'descuento_reserva' AND descuento_tipo IS NULL
   AND nombre ILIKE '%20%%';

UPDATE recompensas SET descuento_tipo = 'horas_gratis', descuento_valor = 1
 WHERE tipo = 'descuento_reserva' AND descuento_tipo IS NULL
   AND nombre ILIKE '%1 hora%';


-- ── 3. MIRAR UN CODIGO ANTES DE USARLO ──────────────────────
--
-- La usa la pantalla para mostrar cuanto va a descontar ANTES de que el
-- cliente confirme. Solo lee; no consume nada.
--
-- Devuelve tambien el motivo cuando no sirve, para poder decirselo al
-- cliente en castellano en vez de un «codigo invalido» seco.

CREATE OR REPLACE FUNCTION revisar_codigo_canje(p_codigo TEXT, p_empresa UUID)
RETURNS TABLE (
  sirve       BOOLEAN,
  motivo      TEXT,
  recompensa  TEXT,
  tipo        TEXT,
  valor       NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_canje canjes%ROWTYPE;
  v_rec   recompensas%ROWTYPE;
BEGIN
  SELECT * INTO v_canje FROM canjes
   WHERE upper(codigo) = upper(btrim(p_codigo));

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo no existe.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Un codigo es de quien lo canjeo. No se presta ni se pasa.
  IF v_canje.cliente_id <> auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo no es tuyo.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_canje.estado <> 'disponible' THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo ya se uso.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_empresa IS NOT NULL AND v_canje.empresa_id <> p_empresa THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo es de otro complejo.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  SELECT * INTO v_rec FROM recompensas WHERE id = v_canje.recompensa_id;

  IF v_rec.tipo = 'fisico' THEN
    RETURN QUERY SELECT FALSE,
      'Ese canje es un premio: se retira en el complejo, no descuenta la reserva.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_rec.tipo = 'descuento_reserva' AND v_rec.descuento_tipo IS NULL THEN
    RETURN QUERY SELECT FALSE,
      'Esa recompensa no tiene el descuento configurado. Avisale al complejo.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_rec.nombre,
                      COALESCE(v_rec.descuento_tipo, 'todo')::TEXT,
                      v_rec.descuento_valor;
END;
$fn$;

REVOKE ALL ON FUNCTION revisar_codigo_canje(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revisar_codigo_canje(TEXT, UUID) TO authenticated;


-- ── 4. EL PRECIO LO PONE LA BASE, NO EL NAVEGADOR ───────────
--
-- Antes el monto llegaba calculado desde la pantalla:
--
--     monto_total: slots.length * cancha.precio
--
-- y la base lo guardaba tal cual. Cualquiera que abriera las herramientas
-- del navegador podia reservar por Bs. 0. Lo salvaba que el complejo mira
-- el comprobante antes de confirmar, pero el numero no era confiable.
--
-- Aplicar el descuento en la pantalla habria sido lo mismo: un candado al
-- lado de una puerta abierta. Asi que el precio se calcula aca, con el
-- precio de la cancha y las horas reservadas, y el codigo se consume en la
-- misma operacion: si dos pestanas mandan el mismo codigo, la segunda ya
-- lo encuentra usado.
--
-- Solo para las reservas que pide un cliente desde la app. Las del
-- mostrador las carga el personal, que fija el precio a mano, y las de un
-- torneo no se cobran.

CREATE OR REPLACE FUNCTION calcular_monto_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_precio    NUMERIC;
  v_empresa   UUID;
  v_horas     NUMERIC;
  v_base      NUMERIC;
  v_descuento NUMERIC := 0;
  v_canje     canjes%ROWTYPE;
  v_rec       recompensas%ROWTYPE;
BEGIN
  SELECT precio_hora, empresa_id INTO v_precio, v_empresa
    FROM canchas WHERE id = NEW.cancha_id;

  IF v_precio IS NULL THEN
    RAISE EXCEPTION 'Esa cancha ya no esta disponible';
  END IF;

  v_horas := EXTRACT(EPOCH FROM (NEW.hora_fin - NEW.hora_inicio)) / 3600.0;
  IF v_horas <= 0 THEN
    RAISE EXCEPTION 'El horario de la reserva no es valido';
  END IF;

  v_base := v_horas * v_precio;

  IF NEW.codigo_descuento IS NOT NULL AND btrim(NEW.codigo_descuento) <> '' THEN
    -- FOR UPDATE: el que llegue segundo espera y lo encuentra ya usado
    SELECT * INTO v_canje FROM canjes
     WHERE upper(codigo) = upper(btrim(NEW.codigo_descuento))
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese codigo de canje no existe';
    END IF;
    IF v_canje.cliente_id <> NEW.cliente_id THEN
      RAISE EXCEPTION 'Ese codigo de canje no es tuyo';
    END IF;
    IF v_canje.estado <> 'disponible' THEN
      RAISE EXCEPTION 'Ese codigo de canje ya se uso';
    END IF;
    IF v_canje.empresa_id <> v_empresa THEN
      RAISE EXCEPTION 'Ese codigo de canje es de otro complejo';
    END IF;

    SELECT * INTO v_rec FROM recompensas WHERE id = v_canje.recompensa_id;

    IF v_rec.tipo <> 'descuento_reserva' THEN
      RAISE EXCEPTION 'Ese canje no sirve para descontar una reserva';
    END IF;

    v_descuento := CASE v_rec.descuento_tipo
      WHEN 'porcentaje'   THEN v_base * (v_rec.descuento_valor / 100.0)
      -- No se regalan mas horas de las que se reservaron
      WHEN 'horas_gratis' THEN LEAST(v_rec.descuento_valor, v_horas) * v_precio
      ELSE 0
    END;

    IF v_descuento <= 0 THEN
      RAISE EXCEPTION 'Esa recompensa no tiene el descuento configurado';
    END IF;

    UPDATE canjes
       SET estado = 'utilizado', usado_en = 'reserva'
     WHERE id = v_canje.id;
  END IF;

  NEW.monto_total := GREATEST(0, ROUND(v_base - v_descuento, 2));
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_monto_reserva ON reservas;
CREATE TRIGGER trg_monto_reserva
  BEFORE INSERT ON reservas
  FOR EACH ROW
  WHEN (NEW.origen = 'app' AND NEW.torneo_id IS NULL AND NEW.cliente_id IS NOT NULL)
  EXECUTE FUNCTION calcular_monto_reserva();


-- ── 5. LA INSCRIPCION GRATIS A UN TORNEO ────────────────────
--
-- Mismo problema del otro lado: equipos.codigo_canje existia y nadie lo
-- escribia. Y si la pantalla lo escribiera sin mas, cualquiera podria
-- inventarse un codigo y el organizador aprobaria un equipo que no pago.
--
-- Aca el que valida es la base: si el codigo no existe, no es tuyo, ya se
-- uso o no es de inscripcion gratis, la inscripcion se rechaza. Y si esta
-- bien, lo consume en el mismo movimiento.

CREATE OR REPLACE FUNCTION validar_codigo_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_canje   canjes%ROWTYPE;
  v_rec     recompensas%ROWTYPE;
  v_empresa UUID;
BEGIN
  IF NEW.codigo_canje IS NULL OR btrim(NEW.codigo_canje) = '' THEN
    RETURN NEW;
  END IF;

  SELECT empresa_id INTO v_empresa FROM torneos WHERE id = NEW.torneo_id;

  SELECT * INTO v_canje FROM canjes
   WHERE upper(codigo) = upper(btrim(NEW.codigo_canje))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ese codigo de canje no existe';
  END IF;
  IF v_canje.cliente_id <> auth.uid() THEN
    RAISE EXCEPTION 'Ese codigo de canje no es tuyo';
  END IF;
  IF v_canje.estado <> 'disponible' THEN
    RAISE EXCEPTION 'Ese codigo de canje ya se uso';
  END IF;
  IF v_canje.empresa_id <> v_empresa THEN
    RAISE EXCEPTION 'Ese codigo de canje es de otro complejo';
  END IF;

  SELECT * INTO v_rec FROM recompensas WHERE id = v_canje.recompensa_id;
  IF v_rec.tipo <> 'torneo_gratis' THEN
    RAISE EXCEPTION 'Ese canje no sirve para inscribir un equipo';
  END IF;

  UPDATE canjes SET estado = 'utilizado', usado_en = 'torneo'
   WHERE id = v_canje.id;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_codigo_equipo ON equipos;
CREATE TRIGGER trg_codigo_equipo
  BEFORE INSERT ON equipos
  FOR EACH ROW EXECUTE FUNCTION validar_codigo_equipo();
