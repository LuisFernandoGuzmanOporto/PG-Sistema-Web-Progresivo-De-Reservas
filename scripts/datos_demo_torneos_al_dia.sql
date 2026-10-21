-- Pone al día los torneos de ejemplo que siguen recibiendo inscripciones
--
-- Los datos de demostración se cargaron con fechas de febrero a septiembre
-- de 2026. Desde la migración 043 la fecha límite de inscripción se respeta,
-- así que esos torneos ya no aceptarían equipos. Este script corre sus fechas
-- hacia adelante para que queden abiertos en las próximas semanas.
--
-- No es una migración: no cambia la estructura, solo fechas de datos de
-- ejemplo. No borra nada.
--
-- Cada torneo se mueve semanas completas (así conserva los días de la
-- semana en que se juega) hasta que su fecha límite quede unos 10 días más
-- adelante que hoy. Sus jornadas de cancha se mueven con él. Si alguna
-- jornada chocara con otra reserva en la fecha nueva, ese torneo no se mueve.


do $$
declare
  t     record;
  hoy   date := (now() at time zone 'America/La_Paz')::date;
  dias  integer;
begin
  for t in
    select id, nombre, coalesce(inscripcion_hasta, fecha_inicio) as limite
      from torneos
     where estado = 'inscripciones'
       and coalesce(inscripcion_hasta, fecha_inicio) < hoy
  loop
    dias := 7 * ceil((hoy + 10 - t.limite)::numeric / 7);
    begin
      update reservas set fecha = fecha + dias where torneo_id = t.id;
      update torneos
         set fecha_inicio      = fecha_inicio + dias,
             fecha_fin         = fecha_fin + dias,
             inscripcion_hasta = inscripcion_hasta + dias
       where id = t.id;
      raise notice '% · se movió % días', t.nombre, dias;
    exception when exclusion_violation then
      raise notice '% · no se movió: una jornada chocaba con otra reserva', t.nombre;
    end;
  end loop;
end $$;


-- Cómo quedaron
select nombre, fecha_inicio, fecha_fin, inscripcion_hasta
  from torneos
 where estado = 'inscripciones'
 order by fecha_inicio;
