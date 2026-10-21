-- 010 · Los partidos de la llave se guardan como los de grupos
--
-- Hasta ahora cuartos, semifinales, tercer puesto y final se calculaban al
-- vuelo a partir de las tablas de grupo y vivian solo en la pantalla: al
-- recargar se perdian los resultados. Ademas sus goles no llegaban a la tabla
-- de goleadores, porque esa se arma desde eventos_partido y no habia partido
-- al que colgarlos.
--
-- La tabla partidos_torneo ya preveia esta fase ('eliminatoria',
-- 'tercer_puesto' y la columna ronda). Lo que faltaba era:
--
--   1. Guardar el detalle de la tanda de penales, no solo el resultado.
--   2. Impedir que una misma llave se cree dos veces.
--
-- Las filas de la llave se crean recien cuando se conocen los dos equipos:
-- antes de eso no hay a quien enfrentar, y equipo_a_id no admite nulos.

alter table partidos_torneo add column if not exists tanda jsonb;
comment on column partidos_torneo.tanda is
  'Tiros de la tanda de penales, en orden: [{equipo, anoto}]. Solo eliminatoria.';

-- 'ronda' guarda la llave completa ('Cuartos de final 1', 'Final',
-- 'Tercer puesto'), que es unica dentro de cada torneo.
create unique index if not exists idx_llave_unica
  on partidos_torneo (torneo_id, ronda)
  where ronda is not null;
