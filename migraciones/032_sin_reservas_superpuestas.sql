-- ============================================================
-- 032 · Dos reservas no pueden ocupar la misma cancha a la misma hora
--
-- Lo encontro la prueba de transicion de estados PT-02: con una reserva
-- pendiente de 10:00 a 11:00, otro cliente pudo reservar la misma cancha
-- a la misma hora. La pantalla ya no ofrecia esa franja, pero la base no
-- lo impedia: dos clientes que reservaran a la vez, o alguien que
-- llamara a la API directamente, se quedaban los dos con la cancha.
--
-- La regla ahora vive en la base: mientras una reserva este pendiente o
-- confirmada, ninguna otra puede superponerse con ella en la misma
-- cancha. Las rechazadas no cuentan, asi que rechazar libera la franja.
-- Aplica igual a reservas de la app, presenciales y jornadas de torneo.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_sin_superponer;
ALTER TABLE reservas
  ADD CONSTRAINT reservas_sin_superponer
  EXCLUDE USING gist (
    cancha_id WITH =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) WITH &&
  )
  WHERE (estado IN ('pendiente', 'confirmada'));

-- Verificacion: debe aparecer la regla
SELECT conname FROM pg_constraint WHERE conname = 'reservas_sin_superponer';
