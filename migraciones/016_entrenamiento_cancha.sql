-- 016 · En que cancha se dicta cada entrenamiento
--
-- La tabla guardaba dias y horario, pero no la cancha. Asi no habia forma de
-- decirle al cliente «esa hora esta ocupada por un entrenamiento»: o se
-- bloqueaban todas las canchas del complejo (falso: el entrenamiento usa una
-- sola) o no se bloqueaba ninguna, y el cliente terminaba reservando encima.
--
-- Queda opcional: un entrenamiento sin cancha asignada se muestra igual en el
-- horario del complejo, pero no bloquea ninguna reserva.

alter table entrenamientos
  add column if not exists cancha_id uuid references canchas(id) on delete set null;

comment on column entrenamientos.cancha_id is
  'Cancha que ocupa. Si es NULL, el entrenamiento se anuncia pero no bloquea horarios.';

create index if not exists idx_entrenamientos_cancha
  on entrenamientos (cancha_id) where cancha_id is not null;
