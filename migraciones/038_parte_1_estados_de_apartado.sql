-- 038 · Apartar la hora mientras el cliente paga (PARTE 1 de 2)
--
-- Dos estados nuevos para una reserva:
--   · apartada: el cliente eligió la hora y está pagando. Dura 10 minutos.
--   · vencida:  se le pasó el tiempo y otra persona tomó la hora.
--
-- Va en un archivo aparte porque PostgreSQL no deja usar un valor nuevo de
-- un tipo en la misma ejecución en la que se agrega. Primero se ejecuta este
-- archivo y después 038_parte_2_apartar_la_hora.sql.
--
-- Se puede ejecutar más de una vez.

alter type estado_reserva add value if not exists 'apartada';
alter type estado_reserva add value if not exists 'vencida';
