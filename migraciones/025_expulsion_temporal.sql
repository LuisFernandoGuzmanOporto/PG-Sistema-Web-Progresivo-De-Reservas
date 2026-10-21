-- 025 · Los minutos que el equipo juega con uno menos
--
-- En futsal, y en muchas ligas de futbol 5, 6 y 7, la roja no deja al equipo
-- incompleto todo el partido: se juega con uno menos durante unos minutos y
-- despues ENTRA UN COMPAÑERO. El expulsado no vuelve nunca.
--
-- Y hay una segunda parte que casi siempre se olvida: si el equipo que esta
-- con uno menos RECIBE UN GOL, el reemplazo entra en ese momento, sin esperar
-- que se cumpla el tiempo. La sancion se considera cumplida con el gol.
--
-- Cuantos minutos son NO es universal:
--
--   Futbol 11        -> no hay reemplazo, se juega con diez hasta el final
--   Futsal (FIFA)    -> 2 minutos
--   Futbol 5, 6 y 7  -> lo pone cada liga: hay de 2, de 5, y las que no dan
--                       reemplazo
--
-- Por eso se guarda POR TORNEO y lo elige quien lo organiza. Cero significa
-- que no hay reemplazo, como en futbol 11.

alter table torneos
  add column if not exists minutos_expulsion smallint not null default 0;

comment on column torneos.minutos_expulsion is
  'Minutos que el equipo juega con uno menos tras una roja antes de que entre '
  'un reemplazo. 0 = sin reemplazo (futbol 11). Futsal usa 2.';

alter table torneos
  drop constraint if exists minutos_expulsion_razonable;
alter table torneos
  add constraint minutos_expulsion_razonable
  check (minutos_expulsion between 0 and 20);


-- Cuando entro el reemplazo de esa roja.
--
-- Se guarda en la fila del evento y no solo en la pantalla para que el
-- contador sobreviva a una recarga: el que lleva la planilla puede quedarse
-- sin señal o cerrar la pagina en medio del partido, y al volver tiene que
-- seguir viendo cuanto falta.
--
-- Queda en NULL mientras el equipo sigue con uno menos.
alter table eventos_partido
  add column if not exists reemplazo_at timestamptz;

comment on column eventos_partido.reemplazo_at is
  'Solo para tipo = roja: cuando entro el companero que completa al equipo. '
  'NULL mientras juegan con uno menos.';
