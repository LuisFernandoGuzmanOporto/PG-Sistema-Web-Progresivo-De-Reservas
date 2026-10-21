-- 018 · El organizador puede reprogramar su torneo
--
-- Sobre solicitudes_cancha solo habia dos politicas: el organizador la CREA y
-- el complejo la RESUELVE. Faltaba que el organizador pudiera modificarla, que
-- es justo lo que hace al reprogramar: pedir otras horas.
--
-- Sin esto, reprogramar dejaba las cosas a medias: las jornadas cambiaban de
-- horario pero la solicitud seguia mostrando el horario viejo, y el complejo
-- aprobaba algo distinto de lo que iba a ocurrir.
--
-- El riesgo obvio de dejarlo escribir es que se apruebe la cancha a si mismo.
-- Por eso, ademas de la politica, un disparador fuerza el estado a
-- 'pendiente' cuando quien modifica no es el complejo.

create policy "solicitud_cancha_reprograma" on solicitudes_cancha
  for update
  using (organiza_torneo(torneo_id))
  with check (organiza_torneo(torneo_id));

create or replace function proteger_solicitud_cancha()
returns trigger
language plpgsql
set search_path = public          -- sin security definer: importa quien llama
as $$
begin
  -- Solo el complejo dueno de la cancha decide si se aprueba
  if not administra_empresa(new.empresa_id) and not trabaja_en_empresa(new.empresa_id) then
    new.estado       := 'pendiente';
    new.resuelta_por := null;
    new.resuelta_at  := null;
    new.motivo       := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_solicitud on solicitudes_cancha;
create trigger trg_proteger_solicitud
  before update on solicitudes_cancha
  for each row execute function proteger_solicitud_cancha();
