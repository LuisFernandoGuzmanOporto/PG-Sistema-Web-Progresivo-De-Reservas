-- ============================================================
-- 029 · Como se gana un partido en este torneo
--
-- Los deportes que se juegan por sets no tienen un numero fijo: el
-- wally se juega a 15, a 21 o a 25 segun quien organice; el voley
-- oficial va a 25 al mejor de cinco, pero en un torneo de barrio es
-- normal jugarlo al mejor de tres.
--
-- El sistema no puede adivinarlo ni inventarlo. Lo elige quien crea el
-- torneo, con un valor sugerido por deporte que puede cambiar.
--
-- En futbol y basquet no aplica: se cuentan goles o puntos y gana el
-- que tiene mas cuando termina. Ahi estas dos columnas quedan en NULL.
-- ============================================================

ALTER TABLE torneos
  ADD COLUMN IF NOT EXISTS puntos_por_set  INTEGER,
  ADD COLUMN IF NOT EXISTS sets_para_ganar INTEGER;

ALTER TABLE torneos DROP CONSTRAINT IF EXISTS puntaje_coherente;
ALTER TABLE torneos
  ADD CONSTRAINT puntaje_coherente CHECK (
    (puntos_por_set  IS NULL OR puntos_por_set  BETWEEN 1 AND 99)
    AND
    (sets_para_ganar IS NULL OR sets_para_ganar BETWEEN 1 AND 5)
  );

COMMENT ON COLUMN torneos.puntos_por_set IS
  'A cuantos puntos se gana un set. NULL en los deportes que no van por sets.';
COMMENT ON COLUMN torneos.sets_para_ganar IS
  'Cuantos sets hay que ganar para llevarse el partido. 2 = al mejor de 3.';
