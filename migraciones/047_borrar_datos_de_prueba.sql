-- 047 · Borrar lo que quedó de las pruebas  (OPCIONAL — BORRA DATOS)
--
-- Las pruebas de usabilidad dejaron a la vista de los clientes cosas que no
-- son de un complejo de verdad:
--
--   · el comentario «Prueba en otro complejo» en el perfil de un complejo;
--   · el entrenamiento «PRUEBA QA - Pádel iniciación» de Sport Center.
--
-- A diferencia de la 046, esta BORRA filas y no se puede deshacer. Córrela solo
-- si estás de acuerdo con borrar exactamente eso. No cambia la versión del
-- esquema: la aplicación funciona igual con o sin ella.

delete from comentarios
 where texto = 'Prueba en otro complejo';

delete from entrenamientos
 where nombre like 'PRUEBA QA%';

-- Verificación: las dos cuentas tienen que dar 0
select
  (select count(*) from comentarios   where texto = 'Prueba en otro complejo') as comentarios_de_prueba,
  (select count(*) from entrenamientos where nombre like 'PRUEBA QA%')          as entrenamientos_de_prueba;
