-- 050 · El organizador de un torneo paga la cancha con el QR del complejo
--
-- Cuando un cliente organiza un torneo, le pide la cancha al complejo y el
-- sistema le muestra cuánto cuesta (jornadas × horas × precio). Hasta ahora no
-- había cómo pagarlo: el complejo aprobaba sin ver ningún pago.
--
-- Ahora, al enviar la solicitud, el cliente ve el QR del complejo, paga y sube
-- la foto del comprobante. El administrador lo ve en «Solicitudes de cancha»
-- antes de aprobar.
--
-- El archivo va al depósito cerrado «comprobantes», en la misma carpeta que los
-- de las inscripciones del torneo:  <empresa_id>/torneos/<torneo_id>/<archivo>
-- Esa carpeta ya la pueden abrir el complejo y quien organiza el torneo
-- (puede_ver_comprobante, migraciones/020). No hace falta otra regla.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. Dónde quedó el comprobante ────────────────────────────────────────────
alter table solicitudes_cancha add column if not exists comprobante_url text;


-- ── 2. El organizador lo anota ───────────────────────────────────────────────
-- La solicitud solo la puede cambiar el complejo (es quien aprueba). Por eso el
-- organizador no la actualiza directo: pasa por esta función, que solo toca el
-- comprobante, solo mientras está pendiente, y solo con un archivo de la
-- carpeta de ese torneo.
create or replace function enviar_comprobante_cancha(p_torneo uuid, p_comprobante text)
returns solicitudes_cancha
language plpgsql security definer set search_path = public
as $$
declare
  s solicitudes_cancha%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para enviar el comprobante';
  end if;

  select * into s from solicitudes_cancha where torneo_id = p_torneo;
  if not found then
    raise exception 'Ese torneo no tiene una solicitud de cancha';
  end if;
  if not organiza_torneo(p_torneo) then
    raise exception 'Solo quien organiza el torneo puede enviar el comprobante';
  end if;
  if s.estado <> 'pendiente' then
    raise exception 'El complejo ya resolvió esta solicitud';
  end if;
  if p_comprobante is null
     or p_comprobante not like s.empresa_id::text || '/torneos/' || p_torneo::text || '/%' then
    raise exception 'Ese archivo no es un comprobante de este torneo';
  end if;

  update solicitudes_cancha set comprobante_url = p_comprobante
   where id = s.id
  returning * into s;
  return s;
end;
$$;
revoke execute on function enviar_comprobante_cancha(uuid, text) from public, anon;
grant execute on function enviar_comprobante_cancha(uuid, text) to authenticated;


-- ── 3. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 50 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 50
select 'version ' || version_esquema();
