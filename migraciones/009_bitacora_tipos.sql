-- 009 · La bitacora acepta las categorias que faltaban
--
-- La restriccion solo admitia seis tipos, de cuando la bitacora registraba
-- unicamente lo que hacia el personal de mostrador. Al conectar las demas
-- pantallas quedaron fuera 'entrenador', 'entrenamiento' y 'calificacion':
-- esas anotaciones se rechazaban y, como el registro no interrumpe la accion
-- principal, se perdian sin que nadie lo notara.

alter table bitacora drop constraint if exists bitacora_tipo_check;
alter table bitacora add constraint bitacora_tipo_check
  check (tipo in (
    'reserva', 'recompensa', 'cancha', 'asistencia', 'torneo', 'cuenta',
    'entrenador', 'entrenamiento', 'calificacion'
  ));
