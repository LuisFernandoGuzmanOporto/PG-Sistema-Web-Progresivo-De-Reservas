-- 021 · Notificaciones
--
-- Hasta ahora nadie se enteraba de nada. El cliente reservaba y tenia que
-- entrar a «Mi Perfil» a ver si ya se la habian aprobado. El administrador no
-- sabia que le habia entrado una reserva hasta que abria la pantalla. El que
-- organizaba un torneo no sabia si le habian dado la cancha.
--
-- Las notificaciones NO se crean desde el navegador. Se crean con
-- disparadores, aca adentro, por dos razones:
--
--   1. Si las creara la aplicacion, haria falta una politica que deje a un
--      usuario insertar filas a nombre de OTRO. Cualquiera podria entonces
--      llenarle la campana a quien quisiera con lo que quisiera.
--
--   2. Una reserva se puede aprobar desde tres pantallas distintas (el panel
--      del empleado, la gestion del administrador y su tablero). Si el aviso
--      lo mandara cada pantalla, el dia que aparezca una cuarta alguien se va
--      a olvidar. Colgado del cambio de estado, sale siempre.

create table if not exists notificaciones (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid not null references profiles(id) on delete cascade,
  tipo        text not null,          -- 'reserva' | 'torneo' | 'equipo' | 'empresa'
  titulo      text not null,
  detalle     text,
  enlace      text,                   -- a donde lleva al tocarla
  leida       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notif_usuario
  on notificaciones (usuario_id, leida, created_at desc);

alter table notificaciones enable row level security;

-- Cada uno ve solo las suyas
drop policy if exists "notif_propias" on notificaciones;
create policy "notif_propias" on notificaciones
  for select using (usuario_id = auth.uid());

-- Y solo puede marcarlas como leidas
drop policy if exists "notif_marcar" on notificaciones;
create policy "notif_marcar" on notificaciones
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "notif_borrar" on notificaciones;
create policy "notif_borrar" on notificaciones
  for delete using (usuario_id = auth.uid());

-- Nadie tiene politica de INSERT: las filas solo nacen de los disparadores de
-- abajo, que corren como el dueno de la funcion.

-- El texto no se puede tocar: si se pudiera, alguien podria reescribir el
-- aviso que ya recibio para que dijera otra cosa.
create or replace function proteger_notificacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    new.usuario_id := old.usuario_id;
    new.tipo       := old.tipo;
    new.titulo     := old.titulo;
    new.detalle    := old.detalle;
    new.enlace     := old.enlace;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_notificacion on notificaciones;
create trigger trg_proteger_notificacion
  before update on notificaciones
  for each row execute function proteger_notificacion();


-- ── Ayudantes ────────────────────────────────────────────────────────────

create or replace function avisar(dest uuid, t text, titulo text, detalle text, enlace text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- Sin destinatario no hay a quien avisar: pasa con la reserva de mostrador,
  -- donde el cliente puede no tener cuenta.
  if dest is null then return; end if;
  insert into notificaciones (usuario_id, tipo, titulo, detalle, enlace)
  values (dest, t, titulo, detalle, enlace);
end;
$$;

/**
 * Avisa a quien atiende el complejo: el administrador y los empleados activos
 * que tengan ese permiso. Un aviso que le llega a alguien que no puede
 * resolverlo solo estorba.
 */
create or replace function avisar_al_complejo(emp uuid, permiso text, t text,
                                              titulo text, detalle text, enlace text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into notificaciones (usuario_id, tipo, titulo, detalle, enlace)
  select admin_id, t, titulo, detalle, enlace
    from empresas where id = emp and admin_id is not null;

  insert into notificaciones (usuario_id, tipo, titulo, detalle, enlace)
  select id, t, titulo, detalle, enlace
    from empleados
   where empresa_id = emp and activo and permiso = any(permisos);
end;
$$;

-- 'Hoy 14:00' o '16 Sep 14:00', para que el aviso se entienda de un vistazo
create or replace function cuando(f date, h time)
returns text
language sql immutable
as $$
  select case
    when f = current_date     then 'hoy '
    when f = current_date + 1 then 'mañana '
    else to_char(f, 'DD/MM') || ' '
  end || to_char(h, 'HH24:MI')
$$;


-- ── Reservas ─────────────────────────────────────────────────────────────

create or replace function notificar_reserva()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  nombre_cancha text;
  nombre_cliente text;
begin
  select nombre into nombre_cancha from canchas where id = new.cancha_id;

  -- Entra una reserva nueva por la app: el complejo tiene que revisarla
  if tg_op = 'INSERT' and new.estado = 'pendiente' and new.origen = 'app' then
    select coalesce(p.nombre, new.cliente_nombre, 'Un cliente') into nombre_cliente
      from profiles p where p.id = new.cliente_id;

    perform avisar_al_complejo(new.empresa_id, 'reservas_confirmar', 'reserva',
      'Nueva reserva por confirmar',
      nombre_cliente || ' pidió ' || coalesce(nombre_cancha, 'una cancha') ||
      ' para el ' || cuando(new.fecha, new.hora_inicio) || ' · Bs. ' || new.monto_total,
      '/admin/reservas');
    return new;
  end if;

  -- El complejo la resolvio: al cliente le importa saberlo ya
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

drop trigger if exists trg_notificar_reserva on reservas;
create trigger trg_notificar_reserva
  after insert or update on reservas
  for each row execute function notificar_reserva();


-- ── Solicitud de cancha para un torneo ───────────────────────────────────

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
      ' · Bs. ' || coalesce(new.costo_total, 0),
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

drop trigger if exists trg_notificar_solicitud on solicitudes_cancha;
create trigger trg_notificar_solicitud
  after insert or update on solicitudes_cancha
  for each row execute function notificar_solicitud_cancha();


-- ── Inscripcion de equipos ───────────────────────────────────────────────

create or replace function notificar_equipo()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  t record;
begin
  select nombre, creador_id into t from torneos where id = new.torneo_id;

  if tg_op = 'INSERT' then
    perform avisar(t.creador_id, 'equipo',
      'Un equipo se inscribió',
      '«' || new.nombre || '» se anotó en ' || t.nombre ||
      '. Revisá el comprobante para aprobarlo.',
      '/app/torneos/' || new.torneo_id);
    return new;
  end if;

  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    if new.estado = 'aprobado' then
      perform avisar(new.capitan_id, 'equipo',
        'Tu equipo quedó adentro',
        '«' || new.nombre || '» fue aprobado en ' || t.nombre,
        '/app/torneos/' || new.torneo_id);
    elsif new.estado = 'rechazado' then
      perform avisar(new.capitan_id, 'equipo',
        'Tu inscripción fue rechazada',
        '«' || new.nombre || '» no entró en ' || t.nombre ||
        '. Consultá con el organizador.',
        '/app/torneos/' || new.torneo_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notificar_equipo on equipos;
create trigger trg_notificar_equipo
  after insert or update on equipos
  for each row execute function notificar_equipo();


-- ── Alta y estado de un complejo ─────────────────────────────────────────

create or replace function notificar_empresa()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Llego una solicitud de complejo: la revisa el super administrador
  if tg_op = 'INSERT' and new.estado = 'pendiente' then
    insert into notificaciones (usuario_id, tipo, titulo, detalle, enlace)
    select id, 'empresa', 'Nueva solicitud de complejo',
           '«' || new.nombre || '» pide entrar a Sportika. Revisá sus datos.',
           '/superadmin/empresas'
      from profiles where rol = 'superadmin';
    return new;
  end if;

  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    if new.estado = 'activo' then
      perform avisar(new.admin_id, 'empresa',
        'Tu complejo fue aprobado',
        '«' || new.nombre || '» ya aparece para los clientes. ' ||
        'Cargá tu QR de pago y publicá tus canchas.',
        '/mi-cuenta');
    elsif new.estado = 'suspendido' then
      perform avisar(new.admin_id, 'empresa',
        'Tu complejo fue suspendido',
        '«' || new.nombre || '» dejó de verse para los clientes. ' ||
        'Comunicate con Sportika.',
        '/admin/dashboard');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notificar_empresa on empresas;
create trigger trg_notificar_empresa
  after insert or update on empresas
  for each row execute function notificar_empresa();
