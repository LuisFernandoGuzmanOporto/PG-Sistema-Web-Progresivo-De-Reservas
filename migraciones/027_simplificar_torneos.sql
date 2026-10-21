-- ============================================================
-- 027 · Simplificar el modulo de torneos
--
-- Se dan de baja dos cosas que quedaron fuera del alcance definitivo:
--
--   1. La expulsion temporal tras una tarjeta roja (la 025 entera).
--      Es una regla propia del futsal y de algunas ligas de futbol 5,
--      6 y 7, y obligaba a explicar reglamento que el sistema no tiene
--      por que conocer. La roja sigue funcionando igual: se registra y
--      el jugador queda suspendido para el partido siguiente.
--
--   2. El uso del codigo de canje AL INSCRIBIR UN EQUIPO (parte de la
--      026). El alcance contempla ese codigo para las reservas, no para
--      las inscripciones. La recompensa «Inscripcion gratis a torneo»
--      sigue existiendo: el codigo se presenta al organizador y este
--      aprueba la inscripcion a mano.
--
-- El descuento en las reservas NO se toca: es lo que pide el alcance.
-- ============================================================


-- ── 1. Fuera la expulsion temporal ──────────────────────────
--
-- Los minutos que se elegian al crear el torneo y la hora en que
-- entraba el reemplazo. Nadie los lee ya.

ALTER TABLE torneos DROP CONSTRAINT IF EXISTS minutos_expulsion_razonable;
ALTER TABLE torneos DROP COLUMN IF EXISTS minutos_expulsion;

ALTER TABLE eventos_partido DROP COLUMN IF EXISTS reemplazo_at;


-- ── 2. Fuera la validacion del codigo al inscribir ──────────
--
-- El disparador revisaba que el codigo existiera, fuera del capitan y
-- fuera de inscripcion gratis, y lo consumia. Como la pantalla ya no
-- manda ningun codigo, se retira junto con ella.
--
-- La columna equipos.codigo_canje se deja: estaba desde el diseno
-- original y quitarla no aporta nada.

DROP TRIGGER IF EXISTS trg_codigo_equipo ON equipos;
DROP FUNCTION IF EXISTS validar_codigo_equipo();


-- ── 3. El codigo de torneo ya no sirve para una reserva ─────
--
-- Antes esta funcion daba por bueno cualquier codigo que no fuera de un
-- premio fisico, porque los de torneo tenian su propio camino. Ahora
-- que ese camino no existe, hay que decirlo al revisar el codigo y no
-- dejar que el cliente se entere recien al confirmar la reserva.

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

  IF v_rec.tipo = 'torneo_gratis' THEN
    RETURN QUERY SELECT FALSE,
      'Ese canje es para inscribir un equipo: mostraselo al organizador del torneo.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_rec.descuento_tipo IS NULL THEN
    RETURN QUERY SELECT FALSE,
      'Esa recompensa no tiene el descuento configurado. Avisale al complejo.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_rec.nombre,
                      v_rec.descuento_tipo::TEXT, v_rec.descuento_valor;
END;
$fn$;

REVOKE ALL ON FUNCTION revisar_codigo_canje(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revisar_codigo_canje(TEXT, UUID) TO authenticated;
