-- ============================================================
-- 030 · Estrellas y comentarios por separado
--
-- Hasta ahora una "reseña" juntaba el voto con estrellas, un texto y la
-- respuesta del complejo. Desde esta version van aparte, como en un mapa de
-- lugares:
--
--   calificaciones  -> solo el voto (una por cliente y complejo)
--   comentarios     -> la conversacion publica, con respuestas; lo que
--                      escribe el administrador se marca en la pantalla
--
-- Para no perder nada de lo que ya se escribio, el texto de cada reseña pasa
-- a ser un comentario de su autor, y la respuesta del complejo pasa a ser una
-- respuesta del administrador a ese comentario. Se puede correr mas de una
-- vez: no duplica.
-- ============================================================

-- Si la migracion ya se corrio, las columnas viejas ya no existen y no hay
-- nada que mover. Este bloque solo mueve si todavia estan.
DO $migrar$
BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_name = 'calificaciones' AND column_name = 'comentario') THEN

-- Mover textos viejos no es un comentario nuevo: que no le lleguen avisos a nadie
ALTER TABLE comentarios DISABLE TRIGGER trg_notificar_comentario;

-- 1. El texto de cada reseña, como comentario de quien la escribio
INSERT INTO comentarios (empresa_id, autor_id, texto, created_at)
SELECT c.empresa_id, c.cliente_id, LEFT(btrim(c.comentario), 500), c.created_at
FROM calificaciones c
WHERE c.comentario IS NOT NULL
  AND btrim(c.comentario) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM comentarios x
    WHERE x.empresa_id = c.empresa_id
      AND x.autor_id   = c.cliente_id
      AND x.texto      = LEFT(btrim(c.comentario), 500)
      AND x.responde_a IS NULL
  );

-- 2. La respuesta del complejo, como respuesta de su administrador
INSERT INTO comentarios (empresa_id, autor_id, texto, responde_a, created_at)
SELECT c.empresa_id, e.admin_id, LEFT(btrim(c.respuesta), 500), x.id,
       COALESCE(c.respondido_at, NOW())
FROM calificaciones c
JOIN empresas e    ON e.id = c.empresa_id
JOIN comentarios x ON x.empresa_id = c.empresa_id
                  AND x.autor_id   = c.cliente_id
                  AND x.texto      = LEFT(btrim(c.comentario), 500)
                  AND x.responde_a IS NULL
WHERE c.respuesta IS NOT NULL
  AND btrim(c.respuesta) <> ''
  AND e.admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM comentarios y
    WHERE y.responde_a = x.id
      AND y.autor_id   = e.admin_id
      AND y.texto      = LEFT(btrim(c.respuesta), 500)
  );

ALTER TABLE comentarios ENABLE TRIGGER trg_notificar_comentario;

END IF;
END
$migrar$;

-- 3. Los comentarios que colgaban de una reseña pasan al hilo general
UPDATE comentarios SET calificacion_id = NULL WHERE calificacion_id IS NOT NULL;

-- 4. La calificacion queda como un voto puro: sin texto ni respuesta
DROP POLICY IF EXISTS "responder_calificacion" ON calificaciones;
ALTER TABLE calificaciones
  DROP COLUMN IF EXISTS comentario,
  DROP COLUMN IF EXISTS respuesta,
  DROP COLUMN IF EXISTS respondido_at;

-- Verificacion: cuantos comentarios quedaron por complejo
SELECT e.nombre AS complejo, COUNT(k.id) AS comentarios
FROM empresas e
LEFT JOIN comentarios k ON k.empresa_id = e.id
GROUP BY e.nombre
ORDER BY e.nombre;
