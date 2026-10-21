-- 017 · Un torneo ocupa la cancha de verdad
--
-- Hasta ahora un torneo decia en que complejo se jugaba, pero no reservaba
-- nada: el mismo dia y hora quedaban libres para que un cliente los tomara.
-- Y al reves: quien creaba el torneo no veia si esas horas ya estaban
-- ocupadas por reservas o entrenamientos.
--
-- La solucion no es una tabla nueva de horarios. Un torneo ocupando una
-- cancha ES una reserva: misma cancha, misma fecha, mismo horario, mismas
-- reglas de choque. Asi que se crean reservas normales, una por jornada,
-- marcadas con origen 'torneo'. Eso hace que TODO lo que ya existe funcione
-- sin tocarse: la agenda del cliente las muestra ocupadas, el control de
-- choques las respeta, y el complejo las ve en su pantalla de reservas.
--
-- Ademas encaja con la aprobacion: si el torneo lo crea un cliente, sus
-- reservas nacen 'pendiente' y pasan a 'confirmada' cuando el complejo
-- aprueba la cancha. Si lo crea el complejo, nacen confirmadas.

-- ── 1. La reserva sabe a que torneo pertenece ─────────────────────────────

alter table reservas add column if not exists torneo_id uuid
  references torneos(id) on delete cascade;

comment on column reservas.torneo_id is
  'Si viene de un torneo, cual. Permite mostrarlo en la agenda y rehacer el
   horario completo si el organizador lo reprograma.';

alter table reservas drop constraint if exists reservas_origen_check;
alter table reservas add constraint reservas_origen_check
  check (origen in ('app', 'presencial', 'torneo'));

-- Una reserva de torneo no tiene cliente: pertenece al torneo
alter table reservas drop constraint if exists reserva_tiene_cliente;
alter table reservas add constraint reserva_tiene_cliente
  check (cliente_id is not null or cliente_nombre is not null or torneo_id is not null);

create index if not exists idx_reservas_torneo
  on reservas (torneo_id) where torneo_id is not null;

-- ── 2. La solicitud guarda el horario pedido ──────────────────────────────
-- Con esto el complejo ve exactamente que le estan pidiendo: cancha, que
-- dias, de que hora a que hora y cuanto suma.

alter table solicitudes_cancha add column if not exists dias        text[] not null default '{}';
alter table solicitudes_cancha add column if not exists hora_inicio time;
alter table solicitudes_cancha add column if not exists hora_fin    time;
alter table solicitudes_cancha add column if not exists costo_total decimal(10,2);

comment on column solicitudes_cancha.dias is
  'Dias de la semana en que se juega: [''Sab'',''Dom'']. Dentro del rango de
   fechas del torneo, solo esos dias ocupan la cancha.';

-- ── 3. El personal del complejo puede tocar las reservas de sus torneos ───
-- La politica de reservas ya cubre al complejo por empresa_id, y la de
-- torneos al organizador. Falta que el organizador que NO es del complejo
-- pueda crear las reservas de su propio torneo.

drop policy if exists "organizador_reserva_su_torneo" on reservas;
create policy "organizador_reserva_su_torneo" on reservas
  for all
  using (torneo_id is not null and organiza_torneo(torneo_id))
  with check (torneo_id is not null and organiza_torneo(torneo_id));
