-- 005 · Capacidad y horario de cada cancha
--
-- El formulario de «Mis Canchas» ya pedia estos tres datos, pero la tabla no
-- tenia donde guardarlos: se perdian al recargar.

alter table canchas add column if not exists capacidad integer;
alter table canchas add column if not exists apertura  time;
alter table canchas add column if not exists cierre    time;

alter table canchas drop constraint if exists cancha_horario_valido;
alter table canchas add constraint cancha_horario_valido
  check (apertura is null or cierre is null or cierre > apertura);
