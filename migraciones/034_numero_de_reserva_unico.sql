-- 034 · El número de reserva nunca se repite
--
-- Las pruebas de sistema (PS-05 y PS-11) fallaron con «Ya existe algo igual»
-- al crear una reserva común. La causa: el número legible (RSV-2026-00155) sale
-- de la secuencia reserva_seq, que empieza en 1, pero los datos iniciales cargan
-- reservas con números fijos entre el 00121 y el 00161. Cuando la secuencia
-- llegaba a uno de esos números, la reserva de un cliente real chocaba con la
-- de los datos iniciales y se rechazaba, sin que el cliente hubiera hecho nada
-- mal. Cada intento fallido además gastaba un número.
--
-- Se corrige de dos formas:
--   1. La secuencia se adelanta hasta el número más alto que ya existe.
--   2. Si aun así el número estuviera tomado (por ejemplo, al volver a cargar
--      los datos iniciales), la función salta al siguiente libre.

create or replace function generar_nro_reserva()
returns trigger
language plpgsql
-- SECURITY DEFINER: tiene que ver TODAS las reservas para saber si el número
-- está libre, y un cliente solo puede leer las suyas
security definer
set search_path = public
as $$
declare
  v_nro text;
begin
  loop
    v_nro := 'RSV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('reserva_seq')::text, 5, '0');
    exit when not exists (select 1 from reservas where nro = v_nro);
  end loop;
  new.nro := v_nro;
  return new;
end;
$$;

-- La secuencia continúa desde el número más alto que ya se usó
select setval('reserva_seq',
  greatest(
    (select coalesce(max(nullif(regexp_replace(nro, '^.*-', ''), '')::int), 0) from reservas where nro ~ '-[0-9]+$'),
    (select last_value from reserva_seq)
  ));

-- Para comprobar desde las pruebas qué migraciones tiene la base
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 34 $$;

grant execute on function version_esquema() to anon, authenticated;
