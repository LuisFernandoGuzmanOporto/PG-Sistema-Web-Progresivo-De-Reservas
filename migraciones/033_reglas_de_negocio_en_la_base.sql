-- 033 · Reglas de negocio que solo cuidaba la pantalla
--
-- Las pruebas de sistema por rol (pruebas/sistema) hicieron los recorridos
-- completos con varias cuentas a la vez: clientes que reservan, el personal
-- que confirma, un torneo de ocho equipos hasta el campeon y partidos
-- espontaneos. Encontraron nueve reglas que la aplicacion respetaba en
-- pantalla pero que la base no hacia cumplir. Cualquiera con una sesion
-- valida podia saltarselas escribiendo directo contra la API:
--
--   1. Un cliente veia «Libre» una hora que otro cliente ya habia reservado:
--      solo puede leer SUS reservas, asi que las ajenas no le llegaban.
--   2. Un cliente podia guardar su reserva ya «confirmada» y, marcandola
--      como presencial, con el precio que quisiera (Bs. 0).
--   3. Un capitan podia inscribir su equipo directamente «aprobado».
--   4. Se podia inscribir un equipo en un torneo cuya cancha el complejo
--      todavia no aprobo, o que ya estaba en curso.
--   5. El organizador podia aprobar mas equipos que el cupo del torneo.
--   6. Un partido espontaneo aceptaba jugadores aunque estuviera completo.
--   7. Salir de un partido y volver a unirse regalaba 10 puntos cada vez
--      (y dar de baja un equipo e inscribirlo de nuevo, 15).
--   8. Una cuenta suspendida por el superadministrador seguia pudiendo
--      reservar, inscribirse y comentar: solo la frenaba la pantalla.
--   9. El cliente que organiza un torneo podia confirmarse solo las
--      jornadas. La solicitud de cancha la cuidaba un disparador (018) y
--      quedaba pendiente, pero la aplicacion recibia «guardado» y seguia con
--      las reservas del torneo, que el organizador si podia modificar. La
--      politica que se abrio para reprogramar quedo viva aunque la
--      reprogramacion se quito.
--
-- Todo va con disparadores que miran current_user = 'authenticated', igual
-- que proteger_reserva (031): los datos iniciales, que se cargan desde el
-- editor SQL, no pasan por estas reglas.


-- ── 1. Las horas ocupadas, sin datos del cliente ───────────────────────────
-- Una vista y no una politica nueva sobre reservas: abrir la tabla dejaria
-- ver quien reservo, su telefono y cuanto pago. Esta vista entrega solo
-- cancha, dia, hora y estado. security_invoker = false, como perfiles_publicos.
create or replace view horarios_ocupados
  with (security_invoker = false) as
  select id, empresa_id, cancha_id, fecha, hora_inicio, hora_fin,
         estado, origen, torneo_id
    from reservas
   where estado in ('pendiente', 'confirmada')
     and fecha >= current_date - 1;

grant select on horarios_ocupados to anon, authenticated;


-- ── 8. Cuenta suspendida ────────────────────────────────────────────────────
create or replace function cuenta_suspendida()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and not activo)
$$;

create or replace function exigir_cuenta_activa()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user = 'authenticated' and cuenta_suspendida() then
    raise exception 'Tu cuenta está suspendida. Comunicate con Sportika.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cuenta_activa on reservas;
create trigger trg_cuenta_activa before insert on reservas
  for each row execute function exigir_cuenta_activa();
drop trigger if exists trg_cuenta_activa on equipos;
create trigger trg_cuenta_activa before insert on equipos
  for each row execute function exigir_cuenta_activa();
drop trigger if exists trg_cuenta_activa on torneos;
create trigger trg_cuenta_activa before insert on torneos
  for each row execute function exigir_cuenta_activa();
drop trigger if exists trg_cuenta_activa on partidos_espontaneos;
create trigger trg_cuenta_activa before insert on partidos_espontaneos
  for each row execute function exigir_cuenta_activa();
drop trigger if exists trg_cuenta_activa on partido_jugadores;
create trigger trg_cuenta_activa before insert on partido_jugadores
  for each row execute function exigir_cuenta_activa();
drop trigger if exists trg_cuenta_activa on comentarios;
create trigger trg_cuenta_activa before insert on comentarios
  for each row execute function exigir_cuenta_activa();
drop trigger if exists trg_cuenta_activa on calificaciones;
create trigger trg_cuenta_activa before insert on calificaciones
  for each row execute function exigir_cuenta_activa();


-- ── 2. La reserva de un cliente nace pendiente y con el precio real ────────
-- El nombre empieza con «trg_a_» a proposito: los disparadores BEFORE corren
-- por orden alfabetico, y este tiene que correr ANTES de trg_monto_reserva.
-- Asi, al volver origen a 'app', el calculo del precio se aplica siempre.
create or replace function normalizar_reserva_cliente()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user = 'authenticated'
     and not trabaja_en_empresa(new.empresa_id)
     and not es_superadmin() then
    new.estado             := 'pendiente';
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

drop trigger if exists trg_a_normalizar_reserva on reservas;
create trigger trg_a_normalizar_reserva before insert on reservas
  for each row execute function normalizar_reserva_cliente();


-- ── 3, 4 y 5. Inscripcion y aprobacion de equipos ──────────────────────────
-- El que se inscribe no puede leer solicitudes_cancha (es del organizador y
-- del complejo), asi que el estado de la cancha se consulta con una funcion
-- SECURITY DEFINER que solo responde si/no.
create or replace function cancha_aprobada(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from torneos where id = t and creador_tipo = 'complejo')
      or exists (select 1 from solicitudes_cancha where torneo_id = t and estado = 'aprobada')
$$;

create or replace function revisar_inscripcion_equipo()
returns trigger
language plpgsql set search_path = public
as $$
declare
  v_torneo    torneos%rowtype;
  v_aprobados integer;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  select * into v_torneo from torneos where id = new.torneo_id;

  if tg_op = 'INSERT' then
    -- 3. El que se inscribe no se aprueba solo
    if not organiza_torneo(new.torneo_id) and not es_superadmin() then
      new.estado := 'pendiente';
      new.grupo  := null;
    end if;

    -- 4. Solo con inscripciones abiertas y la cancha aprobada
    if v_torneo.estado <> 'inscripciones' then
      raise exception 'Este torneo ya no recibe inscripciones';
    end if;
    if not cancha_aprobada(new.torneo_id) then
      raise exception 'Este torneo todavía no recibe inscripciones: el complejo no aprobó la cancha';
    end if;
  end if;

  -- 5. No mas equipos aprobados que el cupo. Solo cuando el equipo PASA a
  -- aprobado: sortear los grupos tambien modifica equipos ya aprobados.
  if new.estado = 'aprobado' then
    if tg_op = 'UPDATE' then
      if old.estado = 'aprobado' then
        return new;
      end if;
    end if;
    -- Dos aprobaciones a la vez no pasan las dos: la segunda espera a que
    -- termine la primera y ya la cuenta
    perform pg_advisory_xact_lock(hashtext(new.torneo_id::text));
    select count(*) into v_aprobados from equipos
     where torneo_id = new.torneo_id and estado = 'aprobado' and id <> new.id;
    if v_aprobados >= v_torneo.max_equipos then
      raise exception 'El torneo ya tiene sus % equipos aprobados', v_torneo.max_equipos;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_inscripcion_equipo on equipos;
create trigger trg_inscripcion_equipo before insert or update on equipos
  for each row execute function revisar_inscripcion_equipo();


-- ── 6. Partido espontaneo completo o cerrado ───────────────────────────────
create or replace function revisar_cupo_partido()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_partido partidos_espontaneos%rowtype;
  v_unidos  integer;
begin
  -- FOR UPDATE: si dos se suman al ultimo lugar a la vez, el segundo espera
  -- y encuentra el partido lleno
  select * into v_partido from partidos_espontaneos
   where id = new.partido_id for update;

  if not v_partido.activo then
    raise exception 'Ese partido ya no está abierto';
  end if;

  select count(*) into v_unidos from partido_jugadores where partido_id = new.partido_id;
  if v_unidos >= v_partido.max_jugadores then
    raise exception 'El partido ya está completo (% jugadores)', v_partido.max_jugadores;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cupo_partido on partido_jugadores;
create trigger trg_cupo_partido before insert on partido_jugadores
  for each row execute function revisar_cupo_partido();


-- ── 7. Lo que se deshace devuelve sus puntos ───────────────────────────────
-- Si el perfil se esta borrando (borrado en cascada) no hay a quien
-- descontarle: se omite, o el historial chocaria con la clave foranea.
create or replace function devolver_puntos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_table_name = 'partido_jugadores' then
    if old.jugador_id is not null
       and exists (select 1 from profiles where id = old.jugador_id) then
      perform sumar_puntos(old.jugador_id, 'Salio de un partido', -10, old.partido_id);
    end if;

  elsif tg_table_name = 'equipos' then
    if old.capitan_id is not null
       and exists (select 1 from profiles where id = old.capitan_id) then
      perform sumar_puntos(old.capitan_id, 'Se dio de baja un equipo', -15, old.id);
    end if;

  elsif tg_table_name = 'reservas' then
    if old.cliente_id is not null
       and exists (select 1 from profiles where id = old.cliente_id) then
      if old.estado = 'confirmada' then
        perform sumar_puntos(old.cliente_id, 'Se anulo una reserva', -5, old.id);
      end if;
      if old.asistencia = 'presente' then
        perform sumar_puntos(old.cliente_id, 'Se anulo una reserva completada', -5, old.id);
      end if;
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_devolver_puntos on partido_jugadores;
create trigger trg_devolver_puntos after delete on partido_jugadores
  for each row execute function devolver_puntos();
drop trigger if exists trg_devolver_puntos on equipos;
create trigger trg_devolver_puntos after delete on equipos
  for each row execute function devolver_puntos();
drop trigger if exists trg_devolver_puntos on reservas;
create trigger trg_devolver_puntos after delete on reservas
  for each row execute function devolver_puntos();

-- Como el resto de las funciones internas, no se llaman desde el navegador
revoke execute on function devolver_puntos() from anon, authenticated;


-- ── 9. La cancha de un torneo la aprueba solo el complejo ──────────────────
-- La reprogramacion de jornadas se quito de la aplicacion; su politica no.
drop policy if exists "solicitud_cancha_reprograma" on solicitudes_cancha;

-- El organizador puede borrar las jornadas de su torneo (si lo cancela),
-- pero no confirmarlas: eso lo hace el complejo al aprobar la cancha.
create or replace function proteger_jornadas_torneo()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user = 'authenticated'
     and not trabaja_en_empresa(old.empresa_id)
     and not es_superadmin() then
    new.estado             := old.estado;
    new.confirmado_por     := old.confirmado_por;
    new.fecha_confirmacion := old.fecha_confirmacion;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_jornadas on reservas;
create trigger trg_proteger_jornadas before update on reservas
  for each row when (old.torneo_id is not null)
  execute function proteger_jornadas_torneo();
