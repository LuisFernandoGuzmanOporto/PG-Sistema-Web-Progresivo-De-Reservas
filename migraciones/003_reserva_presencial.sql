-- 003 · Reservas presenciales sin cuenta
--
-- El que llega al mostrador puede no tener cuenta en la app. Hasta ahora
-- reservas.cliente_id era obligatorio, asi que el empleado no podia registrar
-- a ese cliente. Se permite guardar el nombre y telefono en su lugar.

alter table reservas alter column cliente_id drop not null;
alter table reservas add column if not exists cliente_nombre   text;
alter table reservas add column if not exists cliente_telefono text;

-- Pero una reserva sin ninguno de los dos no identifica a nadie
alter table reservas drop constraint if exists reserva_tiene_cliente;
alter table reservas add constraint reserva_tiene_cliente
  check (cliente_id is not null or cliente_nombre is not null);
