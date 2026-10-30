-- 047 · Borrar lo que quedó de las pruebas  (OPCIONAL — BORRA DATOS)
--
-- Las pruebas de usabilidad y las pruebas automáticas dejaron a la vista
-- cosas que no son de un complejo de verdad:
--
--   1. el comentario «Prueba en otro complejo» en el perfil de un complejo;
--   2. el entrenamiento «PRUEBA QA - Pádel iniciación» de Sport Center;
--   3. las notificaciones de prueba: las que dicen «PRUEBA», la del equipo
--      «Duo Prueba Canje», la de una reserva de «Bs. 0» y los avisos de
--      «nueva reserva» de reservas que ya no existen (las crearon y borraron
--      las pruebas automáticas). Por ellas Pedro tenía 30 avisos sin leer;
--   4. las líneas de la bitácora que hablan de reservas que ya no existen,
--      por el mismo motivo. Son las que aparecían como «reservas confirmadas
--      que no están en ninguna pestaña».
--
-- A diferencia de la 046 y la 048, esta BORRA filas y no se puede deshacer.
-- Córrela solo si estás de acuerdo con borrar exactamente eso. No cambia la
-- versión del esquema: la aplicación funciona igual con o sin ella.

-- 1 y 2
delete from comentarios
 where texto = 'Prueba en otro complejo';

delete from entrenamientos
 where nombre like 'PRUEBA QA%';

-- 3. Notificaciones de prueba
delete from notificaciones
 where detalle ilike '%prueba respuesta%'
    or detalle ilike '%prueba comentario%'
    or detalle like '%Duo Prueba Canje%'
    or (titulo = 'Nueva reserva por confirmar' and detalle like '%· Bs. 0');

-- Avisos de «nueva reserva» cuya reserva ya no existe: se busca una reserva con
-- la misma cancha, el mismo día y la misma hora que dice el aviso
delete from notificaciones n
 where n.titulo = 'Nueva reserva por confirmar'
   and not exists (
     select 1
       from reservas r
       join canchas c on c.id = r.cancha_id
      where n.detalle like '%pidió ' || c.nombre || ' para %'
        and n.detalle like '%' || to_char(r.fecha, 'DD/MM') || ' %'
        and n.detalle like '%' || to_char(r.hora_inicio, 'HH24:MI') || '%');

-- 4. Bitácora de reservas que ya no existen
delete from bitacora b
 where b.detalle ~ 'RSV-[0-9]{4}-[0-9]+'
   and not exists (
     select 1 from reservas r
      where r.nro = substring(b.detalle from 'RSV-[0-9]{4}-[0-9]+'));

-- Verificación: todo tiene que dar 0
select
  (select count(*) from comentarios    where texto = 'Prueba en otro complejo')        as comentarios_de_prueba,
  (select count(*) from entrenamientos where nombre like 'PRUEBA QA%')                 as entrenamientos_de_prueba,
  (select count(*) from notificaciones where detalle ilike '%prueba respuesta%'
                                          or detalle ilike '%prueba comentario%')       as avisos_de_prueba,
  (select count(*) from bitacora b
    where b.detalle ~ 'RSV-[0-9]{4}-[0-9]+'
      and not exists (select 1 from reservas r
                       where r.nro = substring(b.detalle from 'RSV-[0-9]{4}-[0-9]+'))) as bitacora_sin_reserva;
