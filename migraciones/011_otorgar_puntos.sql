-- 011 · Los clientes ganan los puntos que la aplicacion les promete
--
-- La pantalla de Recompensas lista como ganar puntos (reservar, completar la
-- reserva, sumarse a un partido, inscribir un equipo, calificar un complejo),
-- pero nada los otorgaba: existia sumar_puntos y no la llamaba nadie. El saldo
-- solo bajaba, asi que despues del primer canje la seccion quedaba muerta.
--
-- Se otorgan desde la base, con disparadores, y no desde el navegador. Si
-- dependiera del navegador, cualquiera podria pedir sus puntos sin reservar.
-- Por eso sumar_puntos sigue revocada para los usuarios (migracion 006).

-- ── Reservas: al confirmarla y al presentarse ─────────────────────────────

create or replace function puntos_por_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Las presenciales no tienen cuenta a la que acreditar
  if new.cliente_id is null then
    return new;
  end if;

  -- Al confirmar. La condicion evita pagar dos veces si la reserva vuelve a
  -- pasar por 'confirmada' (por ejemplo, si se rechaza y se reconfirma).
  if new.estado = 'confirmada' and old.estado is distinct from 'confirmada' then
    perform sumar_puntos(new.cliente_id, 'Reserva confirmada', 5, new.id);
  end if;

  -- Al presentarse el dia del partido, que lo marca el empleado
  if new.asistencia = 'presente' and old.asistencia is distinct from 'presente' then
    perform sumar_puntos(new.cliente_id, 'Completo la reserva', 5, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_puntos_reserva on reservas;
create trigger trg_puntos_reserva
  after update on reservas
  for each row execute function puntos_por_reserva();

-- ── Partidos espontaneos: al sumarse ──────────────────────────────────────

create or replace function puntos_por_partido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.jugador_id is not null then
    perform sumar_puntos(new.jugador_id, 'Se sumo a un partido', 10, new.partido_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_puntos_partido on partido_jugadores;
create trigger trg_puntos_partido
  after insert on partido_jugadores
  for each row execute function puntos_por_partido();

-- ── Torneos: al inscribir un equipo ───────────────────────────────────────

create or replace function puntos_por_equipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.capitan_id is not null then
    perform sumar_puntos(new.capitan_id, 'Inscribio un equipo', 15, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_puntos_equipo on equipos;
create trigger trg_puntos_equipo
  after insert on equipos
  for each row execute function puntos_por_equipo();

-- ── Calificaciones: al opinar sobre un complejo ───────────────────────────
-- Solo la primera vez: editar la resena no vuelve a pagar.

create or replace function puntos_por_calificacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform sumar_puntos(new.cliente_id, 'Califico un complejo', 5, new.id);
  return new;
end;
$$;

drop trigger if exists trg_puntos_calificacion on calificaciones;
create trigger trg_puntos_calificacion
  after insert on calificaciones
  for each row execute function puntos_por_calificacion();
