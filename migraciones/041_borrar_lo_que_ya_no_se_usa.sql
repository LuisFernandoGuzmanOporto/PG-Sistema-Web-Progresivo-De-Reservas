-- 041 · Borrar lo que la aplicación ya no usa
--
-- Va DESPUÉS de la 040 y borra para siempre (no se puede deshacer):
--
-- 1. El C.I. de los jugadores (equipo_jugadores.ci), con los carnets que ya
--    se habían guardado. La aplicación dejó de pedirlo en la 040: nadie lo
--    usaba y es un dato personal. Lo que no hace falta, no se guarda.
--
-- 2. El texto de la hora de los partidos espontáneos (partidos_espontaneos.
--    cuando: «Ahora mismo», «En 1 hora»). La 040 pasó la hora real de cada
--    partido a fecha_hora; el texto ya no se escribe ni se lee.
--
-- Se puede ejecutar más de una vez.


-- ── 1. El C.I. de los jugadores ───────────────────────────────────────────
alter table equipo_jugadores drop column if exists ci;


-- ── 2. El texto de la hora de los partidos ───────────────────────────────
-- Solo si la 040 ya dejó la hora real en todos los partidos
do $$
begin
  if exists (select 1 from partidos_espontaneos where fecha_hora is null) then
    raise exception 'Primero corre la migración 040: hay partidos sin su fecha y hora.';
  end if;
end $$;

alter table partidos_espontaneos drop column if exists cuando;


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 41 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: las dos columnas ya no están y la versión es 41
select 'columnas que quedan: ' || count(*)::text
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'equipo_jugadores' and column_name = 'ci')
     or (table_name = 'partidos_espontaneos' and column_name = 'cuando'))
union all
select 'version ' || version_esquema();
