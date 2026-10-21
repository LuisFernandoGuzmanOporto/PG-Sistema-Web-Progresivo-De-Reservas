-- 023 · El centavo que se perdia
--
-- La 022 dejo plata() escribiendo 120.50 como «120.5».
--
-- La culpa es de la mascara 'FM999999990.99' que le paso a to_char:
--
--   FM  es "fill mode". Sin el, to_char rellena con espacios hasta el ancho de
--       la mascara ('       120.50'), porque esta pensado para alinear numeros
--       en columnas. En un aviso eso queda con un hueco adelante, asi que FM
--       tiene que estar.
--
--       Pero FM hace una segunda cosa: tambien recorta los ceros del final del
--       decimal. Ese es el que me mordio.
--
--   9   en la mascara quiere decir "un digito, si aporta algo". Un cero al
--       final no aporta, entonces FM lo borra.
--   0   quiere decir "un digito, siempre". FM no lo puede tocar.
--
-- Con '.00' en vez de '.99' se sacan los espacios pero se quedan los centavos.
--
-- La rama de los enteros no cambia: 120 sigue saliendo «120» y no «120.00»,
-- que es lo que corresponde para el precio de una cancha.

create or replace function plata(monto numeric)
returns text
language sql immutable
as $$
  select case
    when monto is null        then '0'
    when monto = trunc(monto) then trunc(monto)::text
    else to_char(monto, 'FM999999990.00')
  end
$$;
