-- 038 · Apartar la hora mientras el cliente paga (PARTE 2 de 2)
--
-- El problema: dos clientes eligen la misma hora al mismo tiempo. A los dos
-- les aparecía el QR, los dos pagaban y recién al enviar el comprobante el
-- segundo se enteraba de que la hora ya era de otro. La base nunca dejó que
-- se guardaran las dos (032), pero el segundo ya había pagado.
--
-- La solución es la de los cines y las aerolíneas con los asientos: la hora
-- se APARTA antes de mostrar el QR.
--
--   1. El cliente pulsa «Apartar la hora y pagar». La reserva nace APARTADA,
--      sin comprobante, y ocupa la cancha por 10 minutos. Si dos lo pulsan a
--      la vez, gana el pedido que llega primero a la base (se decide aquí, no
--      con el reloj del teléfono) y el otro recibe el aviso ANTES de ver el QR.
--   2. Con el comprobante subido, la reserva pasa a PENDIENTE y el complejo
--      la revisa como siempre.
--   3. Si se le pasa el tiempo, la hora vuelve a estar libre. Cuando otra
--      persona la toma, el apartado queda VENCIDO.
--   4. Si el comprobante llega tarde y la hora sigue libre, se acepta igual.
--      Si otra persona ya la tomó, el comprobante NO se pierde: queda guardado
--      en la reserva vencida como prueba del pago, y el complejo recibe un
--      aviso para devolver el dinero o darle otra hora.
--
-- Una reserva que llega CON comprobante (como antes) nace pendiente directo.
-- Las del mostrador y las de torneos no cambian.
--
-- Ejecutar DESPUÉS de 038_parte_1_estados_de_apartado.sql.
-- Se puede ejecutar más de una vez.


-- ── 1. Hasta cuándo dura el apartado ──────────────────────────────────────
alter table reservas add column if not exists aparta_hasta timestamptz;

comment on column reservas.aparta_hasta is
  'Mientras la reserva está apartada: hasta cuándo el cliente tiene para subir el comprobante';


-- ── 2. Una hora apartada también ocupa la cancha ──────────────────────────
alter table reservas drop constraint if exists reservas_sin_superponer;
alter table reservas
  add constraint reservas_sin_superponer
  exclude using gist (
    cancha_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) with &&
  )
  where (estado in ('pendiente', 'confirmada', 'apartada'));


-- ── 3. La reserva de un cliente nace apartada o pendiente ─────────────────
-- Sin comprobante: apartada por 10 minutos. Con comprobante: pendiente, como
-- antes. Las jornadas de un torneo siguen naciendo pendientes.
create or replace function normalizar_reserva_cliente()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user = 'authenticated'
     and not trabaja_en_empresa(new.empresa_id)
     and not es_superadmin() then
    if new.torneo_id is null
       and (new.comprobante_url is null or btrim(new.comprobante_url) = '') then
      new.estado       := 'apartada';
      new.aparta_hasta := now() + interval '10 minutes';
    else
      new.estado       := 'pendiente';
      new.aparta_hasta := null;
    end if;
    new.asistencia         := null;
    new.confirmado_por     := null;
    new.fecha_confirmacion := null;
    -- Las del mostrador las carga solo el personal
    if new.torneo_id is null then
      new.origen := 'app';
    end if;
  end if;
  return new;
end;
$$;


-- ── 4. Los apartados vencidos dejan libre la hora ─────────────────────────
-- No hace falta un proceso que corra cada minuto: cuando alguien quiere una
-- hora, primero se vencen los apartados de esa cancha y ese horario a los
-- que ya se les pasó el tiempo. No se borran: si ese cliente igual paga, su
-- comprobante se guarda en esa fila como prueba.
create or replace function liberar_apartados_vencidos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.estado not in ('pendiente', 'confirmada', 'apartada') then
    return new;
  end if;

  update reservas
     set estado = 'vencida'
   where cancha_id = new.cancha_id
     and estado = 'apartada'
     and aparta_hasta <= now()
     and id <> new.id
     and tsrange(fecha + hora_inicio, fecha + hora_fin)
         && tsrange(new.fecha + new.hora_inicio, new.fecha + new.hora_fin);

  return new;
end;
$$;

drop trigger if exists trg_b_liberar_vencidos on reservas;
create trigger trg_b_liberar_vencidos
  before insert or update of estado, fecha, hora_inicio, hora_fin, cancha_id on reservas
  for each row execute function liberar_apartados_vencidos();


-- ── 5. Un cliente, un apartado a la vez ───────────────────────────────────
-- Evita que alguien bloquee varias horas sin pagar ninguna. El candado por
-- cliente hace que dos pedidos suyos al mismo tiempo se atiendan de a uno.
create or replace function un_apartado_por_cliente()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.estado = 'apartada' and new.cliente_id is not null then
    perform pg_advisory_xact_lock(hashtext('apartado:' || new.cliente_id::text));
    if exists (select 1 from reservas
                where cliente_id = new.cliente_id
                  and estado = 'apartada'
                  and aparta_hasta > now()
                  and id <> new.id) then
      raise exception 'Ya tienes una hora apartada. Termina ese pago o suéltala antes de apartar otra.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_c_un_apartado on reservas;
create trigger trg_c_un_apartado
  before insert on reservas
  for each row execute function un_apartado_por_cliente();


-- ── 6. El código de canje se gasta al enviar el comprobante ───────────────
-- Antes se gastaba al guardar la reserva. Con el apartado, eso haría perder
-- el código a quien aparta y después no paga. Ahora, en una reserva apartada
-- el código solo se revisa (y se calcula el descuento); se gasta cuando la
-- reserva pasa a pendiente (ver enviar_comprobante_reserva).
create or replace function revisar_canje_de_reserva(p_codigo text, p_cliente uuid, p_empresa uuid,
                                                     p_base numeric, p_horas numeric, p_precio numeric,
                                                     p_gastar boolean)
returns numeric
language plpgsql security definer set search_path = public
as $fn$
declare
  v_canje     canjes%rowtype;
  v_rec       recompensas%rowtype;
  v_descuento numeric := 0;
begin
  if p_codigo is null or btrim(p_codigo) = '' then
    return 0;
  end if;

  -- FOR UPDATE: el que llegue segundo espera y lo encuentra ya usado
  select * into v_canje from canjes
   where upper(codigo) = upper(btrim(p_codigo))
   for update;

  if not found then
    raise exception 'Ese codigo de canje no existe';
  end if;
  if v_canje.cliente_id <> p_cliente then
    raise exception 'Ese codigo de canje no es tuyo';
  end if;
  if v_canje.estado <> 'disponible' then
    raise exception 'Ese codigo de canje ya se uso';
  end if;
  if v_canje.empresa_id <> p_empresa then
    raise exception 'Ese codigo de canje es de otro complejo';
  end if;

  select * into v_rec from recompensas where id = v_canje.recompensa_id;
  if v_rec.tipo <> 'descuento_reserva' then
    raise exception 'Ese canje no sirve para descontar una reserva';
  end if;

  v_descuento := case v_rec.descuento_tipo
    when 'porcentaje'   then p_base * (v_rec.descuento_valor / 100.0)
    -- No se regalan mas horas de las que se reservaron
    when 'horas_gratis' then least(v_rec.descuento_valor, p_horas) * p_precio
    else 0
  end;
  if v_descuento <= 0 then
    raise exception 'Esa recompensa no tiene el descuento configurado';
  end if;

  if p_gastar then
    update canjes set estado = 'utilizado', usado_en = 'reserva' where id = v_canje.id;
  end if;
  return v_descuento;
end;
$fn$;

revoke all on function revisar_canje_de_reserva(text, uuid, uuid, numeric, numeric, numeric, boolean)
  from public, anon, authenticated;

create or replace function calcular_monto_reserva()
returns trigger
language plpgsql security definer set search_path = public
as $fn$
declare
  v_precio  numeric;
  v_empresa uuid;
  v_horas   numeric;
  v_base    numeric;
begin
  select precio_hora, empresa_id into v_precio, v_empresa
    from canchas where id = new.cancha_id;
  if v_precio is null then
    raise exception 'Esa cancha ya no esta disponible';
  end if;

  v_horas := extract(epoch from (new.hora_fin - new.hora_inicio)) / 3600.0;
  if v_horas <= 0 then
    raise exception 'El horario de la reserva no es valido';
  end if;
  v_base := v_horas * v_precio;

  new.monto_total := greatest(0, round(v_base - revisar_canje_de_reserva(
    new.codigo_descuento, new.cliente_id, v_empresa, v_base, v_horas, v_precio,
    new.estado <> 'apartada'), 2));
  return new;
end;
$fn$;


-- ── 7. El cliente envía su comprobante ────────────────────────────────────
-- El cliente no puede modificar su reserva (031), así que esto pasa por una
-- función que hace solo este cambio, y solo sobre una reserva suya.
create or replace function enviar_comprobante_reserva(p_reserva uuid, p_comprobante text)
returns reservas
language plpgsql security definer set search_path = public
as $$
declare
  r         reservas%rowtype;
  v_precio  numeric;
  v_horas   numeric;
  v_cancha  text;
  v_cliente text;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para continuar';
  end if;
  if cuenta_suspendida() then
    raise exception 'Tu cuenta está suspendida. Comunicate con Sportika.';
  end if;
  if p_comprobante is null or btrim(p_comprobante) = '' then
    raise exception 'Falta el comprobante de pago';
  end if;

  select * into r from reservas where id = p_reserva for update;
  if not found or r.cliente_id is distinct from auth.uid() then
    raise exception 'Esa reserva no es tuya';
  end if;
  -- El archivo tiene que estar en la carpeta de reservas de ese complejo
  if p_comprobante not like r.empresa_id::text || '/reservas/%' then
    raise exception 'Ese comprobante no corresponde a esta reserva';
  end if;
  if r.estado = 'pendiente' then
    raise exception 'Esta reserva ya tiene su comprobante';
  end if;
  if r.estado not in ('apartada', 'vencida') then
    raise exception 'Esta reserva ya no se puede modificar';
  end if;

  -- Se acepta si la hora sigue siendo suya: dentro de los 10 minutos, o
  -- después si nadie más la tomó. El código de canje se gasta recién aquí.
  begin
    if r.codigo_descuento is not null and btrim(r.codigo_descuento) <> '' then
      select precio_hora into v_precio from canchas where id = r.cancha_id;
      v_horas := extract(epoch from (r.hora_fin - r.hora_inicio)) / 3600.0;
      perform revisar_canje_de_reserva(r.codigo_descuento, r.cliente_id, r.empresa_id,
                                       v_horas * v_precio, v_horas, v_precio, true);
    end if;

    update reservas
       set estado = 'pendiente', comprobante_url = p_comprobante, aparta_hasta = null
     where id = r.id
    returning * into r;
    return r;
  exception when exclusion_violation then
    null;   -- otra persona ya tiene esa hora: se sigue abajo
  end;

  -- La hora ya es de otra persona. El comprobante queda guardado como prueba
  -- del pago y el complejo se entera para devolverlo o dar otra hora.
  update reservas
     set estado = 'vencida', comprobante_url = p_comprobante, aparta_hasta = null
   where id = r.id
  returning * into r;

  select nombre into v_cancha from canchas where id = r.cancha_id;
  select nombre into v_cliente from profiles where id = r.cliente_id;

  perform avisar_al_complejo(r.empresa_id, 'reservas_confirmar', 'reserva',
    'Pago recibido fuera de tiempo',
    coalesce(v_cliente, 'Un cliente') || ' pagó ' || coalesce(v_cancha, 'una cancha') ||
    ' para ' || cuando(r.fecha, r.hora_inicio) || ' · Bs. ' || plata(r.monto_total) ||
    ', pero su tiempo para pagar había vencido y otra persona tomó la hora. ' ||
    'Revisa su comprobante para devolverle el dinero o darle otra hora.',
    '/admin/reservas');
  perform avisar(r.cliente_id, 'reserva',
    'Guardamos tu comprobante',
    coalesce(v_cancha, 'La cancha') || ' · ' || cuando(r.fecha, r.hora_inicio) ||
    '. Se venció tu tiempo y otra persona tomó la hora. El complejo ya tiene tu ' ||
    'comprobante y se comunicará contigo para devolverte el dinero o darte otra hora.',
    '/app/perfil');
  return r;
end;
$$;

revoke all on function enviar_comprobante_reserva(uuid, text) from public, anon;
grant execute on function enviar_comprobante_reserva(uuid, text) to authenticated;


-- ── 8. El cliente suelta la hora que apartó ───────────────────────────────
-- Si cierra el pago sin terminar, la hora queda libre al instante y no a los
-- 10 minutos. Solo borra un apartado suyo y sin comprobante.
create or replace function soltar_apartado(p_reserva uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from reservas
   where id = p_reserva
     and cliente_id = auth.uid()
     and estado = 'apartada';
end;
$$;

revoke all on function soltar_apartado(uuid) from public, anon;
grant execute on function soltar_apartado(uuid) to authenticated;


-- ── 9. El complejo se entera cuando llega el comprobante ──────────────────
-- Un apartado todavía no es trabajo para el complejo: el aviso de «nueva
-- reserva por confirmar» sale cuando la reserva pasa a pendiente.
create or replace function notificar_reserva()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  nombre_cancha  text;
  nombre_cliente text;
begin
  select nombre into nombre_cancha from canchas where id = new.cancha_id;

  if new.estado = 'pendiente' and new.origen = 'app' and new.torneo_id is null and (
       tg_op = 'INSERT'
       or (tg_op = 'UPDATE' and old.estado in ('apartada', 'vencida'))) then
    select coalesce(p.nombre, new.cliente_nombre, 'Un cliente') into nombre_cliente
      from profiles p where p.id = new.cliente_id;

    perform avisar_al_complejo(new.empresa_id, 'reservas_confirmar', 'reserva',
      'Nueva reserva por confirmar',
      nombre_cliente || ' pidió ' || coalesce(nombre_cancha, 'una cancha') ||
      ' para ' || cuando(new.fecha, new.hora_inicio) ||
      ' · Bs. ' || plata(new.monto_total),
      '/admin/reservas');
    return new;
  end if;

  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    if new.estado = 'confirmada' then
      perform avisar(new.cliente_id, 'reserva',
        'Tu reserva quedó confirmada',
        coalesce(nombre_cancha, 'Tu cancha') || ' · ' ||
        cuando(new.fecha, new.hora_inicio),
        '/app/perfil');
    elsif new.estado = 'rechazada' then
      perform avisar(new.cliente_id, 'reserva',
        'Tu reserva fue rechazada',
        coalesce(nombre_cancha, 'La cancha') || ' · ' ||
        cuando(new.fecha, new.hora_inicio) ||
        '. Consulta con el complejo antes de volver a pedirla.',
        '/app/perfil');
    end if;
  end if;

  return new;
end;
$$;


-- ── 10. Todos ven las horas apartadas (sin datos del cliente) ─────────────
-- Un apartado vencido ya no se muestra ocupado: esa hora se puede tomar.
create or replace view horarios_ocupados
  with (security_invoker = false) as
  select id, empresa_id, cancha_id, fecha, hora_inicio, hora_fin,
         estado, origen, torneo_id, aparta_hasta
    from reservas
   where (estado in ('pendiente', 'confirmada')
          or (estado = 'apartada' and aparta_hasta > now()))
     and fecha >= current_date - 1;

grant select on horarios_ocupados to anon, authenticated;


-- ── 11. Versión del esquema, para las pruebas ─────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 38 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: deben aparecer los dos estados nuevos y la versión 38
select enum_range(null::estado_reserva) as estados, version_esquema() as version;
