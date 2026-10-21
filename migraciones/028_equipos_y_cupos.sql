-- ============================================================
-- 028 · El escudo del equipo, el cupo de jugadores, y el codigo
--       de inscripcion solo en los torneos del complejo
--
-- Tres cosas:
--
--   1. Cada equipo puede subir su escudo. Es lo primero que se
--      reconoce en una tabla de posiciones o en un cuadro.
--
--   2. Al crear el torneo se define cuantos jugadores hay que
--      anotar como minimo y cuantos como maximo, que no es lo
--      mismo que cuantos juegan en cancha.
--
--   3. Vuelve la inscripcion cubierta con puntos, pero SOLO en los
--      torneos que organiza el complejo. Ver el porque abajo.
-- ============================================================


-- ── 1. EL ESCUDO DEL EQUIPO ─────────────────────────────────

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS escudo_url TEXT;

COMMENT ON COLUMN equipos.escudo_url IS
  'Ruta del escudo en el bucket publico. NULL = se muestra la inicial del nombre.';


-- ── 2. CUANTOS JUGADORES ────────────────────────────────────
--
-- Habia dos numeros y no alcanzaban:
--
--   jugadores_por_equipo  cuantos juegan EN CANCHA (11 en futbol, 5 en futsal)
--   suplentes             cuantos mas se pueden anotar
--
-- Falta lo que el organizador necesita fijar de verdad: cuantos hay
-- que anotar como MINIMO para que la inscripcion valga, y cuantos
-- como MAXIMO. Un equipo de futbol 11 que anota nueve jugadores no
-- puede jugar; uno que anota cuarenta tampoco tiene sentido.
--
-- Los tres numeros son distintos y los tres hacen falta:
--
--   juegan en cancha   5
--   minimo a anotar    5   (no se puede inscribir con menos)
--   maximo a anotar   10   (titulares + suplentes)

ALTER TABLE torneos
  ADD COLUMN IF NOT EXISTS jugadores_min INTEGER,
  ADD COLUMN IF NOT EXISTS jugadores_max INTEGER;

-- Los torneos que ya existen: el minimo son los que juegan en cancha
-- y el maximo, esos mas los suplentes. Es lo que estaban usando.
UPDATE torneos
   SET jugadores_min = COALESCE(jugadores_min, jugadores_por_equipo),
       jugadores_max = COALESCE(jugadores_max, jugadores_por_equipo + COALESCE(suplentes, 0))
 WHERE jugadores_min IS NULL OR jugadores_max IS NULL;

ALTER TABLE torneos DROP CONSTRAINT IF EXISTS cupo_jugadores_coherente;
ALTER TABLE torneos
  ADD CONSTRAINT cupo_jugadores_coherente CHECK (
    jugadores_min IS NULL OR jugadores_max IS NULL
    OR (jugadores_min > 0 AND jugadores_max >= jugadores_min)
  );

COMMENT ON COLUMN torneos.jugadores_min IS
  'Minimo de jugadores que hay que anotar para inscribir un equipo.';
COMMENT ON COLUMN torneos.jugadores_max IS
  'Maximo de jugadores que se pueden anotar (titulares mas suplentes).';


-- Que la base tambien lo haga cumplir, no solo la pantalla: si no, se
-- inscribe un equipo incompleto escribiendo directo contra la API.
CREATE OR REPLACE FUNCTION revisar_cupo_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_min    INTEGER;
  v_max    INTEGER;
  v_cuenta INTEGER;
BEGIN
  SELECT t.jugadores_min, t.jugadores_max INTO v_min, v_max
    FROM equipos e JOIN torneos t ON t.id = e.torneo_id
   WHERE e.id = NEW.equipo_id;

  IF v_max IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_cuenta FROM equipo_jugadores
   WHERE equipo_id = NEW.equipo_id;

  IF v_cuenta >= v_max THEN
    RAISE EXCEPTION 'Este torneo permite hasta % jugadores por equipo', v_max;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cupo_equipo ON equipo_jugadores;
CREATE TRIGGER trg_cupo_equipo
  BEFORE INSERT ON equipo_jugadores
  FOR EACH ROW EXECUTE FUNCTION revisar_cupo_equipo();


-- ── 3. LA INSCRIPCION CUBIERTA CON PUNTOS, DONDE CORRESPONDE ─
--
-- Vuelve el disparador que valida el codigo al inscribir un equipo,
-- con una condicion nueva: solo sirve en los torneos que organiza el
-- COMPLEJO.
--
-- El motivo no es tecnico. Cuando el torneo lo organiza un cliente, la
-- plata de las inscripciones es suya: con eso paga la cancha, el trofeo
-- y los carteles. Si el complejo regalara inscripciones con sus puntos,
-- el que pierde la plata seria el cliente organizador, que no tuvo nada
-- que ver con esa promocion. Cuando el torneo es del complejo, en cambio,
-- el complejo regala algo que le cuesta a el mismo.

CREATE OR REPLACE FUNCTION validar_codigo_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_canje   canjes%ROWTYPE;
  v_rec     recompensas%ROWTYPE;
  v_empresa UUID;
  v_creador TEXT;
BEGIN
  IF NEW.codigo_canje IS NULL OR btrim(NEW.codigo_canje) = '' THEN
    RETURN NEW;
  END IF;

  SELECT empresa_id, creador_tipo INTO v_empresa, v_creador
    FROM torneos WHERE id = NEW.torneo_id;

  IF v_creador <> 'complejo' THEN
    RAISE EXCEPTION 'Este torneo lo organiza un cliente: la inscripcion se paga directamente al organizador';
  END IF;

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
