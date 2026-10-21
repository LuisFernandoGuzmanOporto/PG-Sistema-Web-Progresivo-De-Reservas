-- 022 · Corrige como se leen las notificaciones
--
-- Al probar la 021 salieron dos cosas mal escritas:
--
--   «Juan García pidió Cancha de Fútbol Principal para el hoy 21:00 · Bs. 120.00»
--
--   1. "para el hoy". El 'el' estaba pegado en la plantilla, pero cuando la
--      fecha es hoy o mañana no va. Ahora el 'el' lo pone cuando(), que es la
--      que sabe si devuelve un dia de la semana o una fecha.
--
--   2. "Bs. 120.00". monto_total es DECIMAL, y al pegarlo con || arrastra los
--      centavos. Ningun complejo cobra centavos por una hora de cancha.

create or replace function cuando(f date, h time)
returns text
language sql immutable
as $$
  select case
    when f = current_date     then 'hoy '
    when f = current_date + 1 then 'mañana '
    else 'el ' || to_char(f, 'DD/MM') || ' '
  end || to_char(h, 'HH24:MI')
$$;

-- 120.00 → '120', 120.50 → '120.50'
create or replace function plata(monto numeric)
returns text
language sql immutable
as $$
  select case
    when monto is null            then '0'
    when monto = trunc(monto)     then trunc(monto)::text
    else to_char(monto, 'FM999999990.99')
  end
$$;


-- ── Las dos plantillas que los usaban ────────────────────────────────────

create or replace function notificar_reserva()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  nombre_cancha text;
  nombre_cliente text;
begin
  select nombre into nombre_cancha from canchas where id = new.cancha_id;

  if tg_op = 'INSERT' and new.estado = 'pendiente' and new.origen = 'app' then
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
        '. Consultá con el complejo antes de volver a pedirla.',
        '/app/perfil');
    end if;
  end if;

  return new;
end;
$$;

create or replace function notificar_solicitud_cancha()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  t record;
  nombre_cancha text;
begin
  select nombre, creador_id into t from torneos where id = new.torneo_id;
  select nombre into nombre_cancha from canchas where id = new.cancha_id;

  if tg_op = 'INSERT' and new.estado = 'pendiente' then
    perform avisar_al_complejo(new.empresa_id, 'reservas_confirmar', 'torneo',
      'Te piden una cancha para un torneo',
      '«' || t.nombre || '» quiere ' || coalesce(nombre_cancha, 'una cancha') ||
      ' los ' || array_to_string(new.dias, ', ') ||
      ' · Bs. ' || plata(new.costo_total),
      '/admin/torneos');
    return new;
  end if;

  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    if new.estado = 'aprobada' then
      perform avisar(t.creador_id, 'torneo',
        'Te aprobaron la cancha',
        '«' || t.nombre || '» ya tiene ' || coalesce(nombre_cancha, 'cancha') ||
        ' reservada. Ya podés abrir las inscripciones.',
        '/app/torneos/' || new.torneo_id);
    elsif new.estado = 'rechazada' then
      perform avisar(t.creador_id, 'torneo',
        'No te dieron la cancha',
        '«' || t.nombre || '»' ||
        coalesce(': ' || new.motivo, '. El complejo no dio un motivo.'),
        '/app/torneos/' || new.torneo_id);
    end if;
  end if;

  return new;
end;
$$;
