-- ============================================================
-- 031 · El cliente no puede modificar ni borrar su reserva
--
-- Lo encontro la prueba de integracion PI-07: la politica
-- "cliente_reservas" es FOR ALL, asi que el cliente podia hacer UPDATE
-- sobre su propia reserva. Con eso podia bajarse el monto (se probo:
-- de Bs. 90 a Bs. 1) o marcarla como confirmada sin que nadie viera el
-- comprobante, y cobrar los puntos de una reserva confirmada.
--
-- El importe ya se recalcula al crear la reserva (026), pero nada
-- cuidaba los cambios posteriores. La aplicacion nunca le pide al
-- cliente modificar una reserva: la confirman, rechazan y marcan la
-- asistencia el administrador y los empleados. Por eso se cierra por
-- completo para el cliente, en vez de ir campo por campo.
--
-- Se permite:
--   - al personal del complejo (administrador y empleados)
--   - al super administrador
--   - al organizador de un torneo, sobre las jornadas de SU torneo
--     (las reemplaza cuando se vuelven a pedir las canchas)
-- ============================================================

CREATE OR REPLACE FUNCTION proteger_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_empresa UUID := COALESCE(OLD.empresa_id, NEW.empresa_id);
  v_torneo  UUID := COALESCE(OLD.torneo_id, NEW.torneo_id);
BEGIN
  IF current_user = 'authenticated'
     AND NOT trabaja_en_empresa(v_empresa)
     AND NOT es_superadmin()
     AND NOT (v_torneo IS NOT NULL AND organiza_torneo(v_torneo)) THEN
    RAISE EXCEPTION 'Una reserva solo la puede modificar el complejo';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_reserva ON reservas;
CREATE TRIGGER trg_proteger_reserva
  BEFORE UPDATE OR DELETE ON reservas
  FOR EACH ROW EXECUTE FUNCTION proteger_reserva();

-- Verificacion: debe aparecer el disparador
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_proteger_reserva';
