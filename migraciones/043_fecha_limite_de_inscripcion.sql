-- 043 · La fecha límite de inscripción se respeta, y la base habla de «tú»
--
-- Lo encontró la revisión QA de todas las pantallas:
--
-- 1. El organizador pone «Inscripciones hasta» al crear el torneo, pero nadie
--    lo miraba. Un torneo que cerraba en marzo seguía diciendo «Abierto» en
--    octubre y aceptaba equipos. Ahora, pasada esa fecha (hora de Bolivia),
--    un cliente ya no puede inscribir su equipo. El organizador sí puede
--    anotar uno tarde, por ejemplo uno que le pagó en persona.
--
-- 2. Algunos avisos y mensajes que escribe la base hablaban de «vos»
--    («Revisá el comprobante», «Comunicate con Sportika»), cuando toda la
--    aplicación habla de «tú». Se corrigen esos textos; las funciones quedan
--    iguales en todo lo demás.
--
-- No cambia ningún dato. Se puede ejecutar más de una vez.


-- ── 1. La fecha límite de inscripción ─────────────────────────────────────
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

    -- 4b. Ni pasada la fecha límite que puso el organizador
    if v_torneo.inscripcion_hasta is not null
       and v_torneo.inscripcion_hasta < (now() at time zone 'America/La_Paz')::date
       and not organiza_torneo(new.torneo_id) and not es_superadmin() then
      raise exception 'Este torneo ya no recibe inscripciones: cerraron el %',
        to_char(v_torneo.inscripcion_hasta, 'DD/MM/YYYY');
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


-- ── 2. Los textos de la base, en «tú» ────────────────────────────────────
CREATE OR REPLACE FUNCTION notificar_solicitud_cancha()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t RECORD;
  nombre_cancha TEXT;
BEGIN
  SELECT nombre, creador_id INTO t FROM torneos WHERE id = NEW.torneo_id;
  SELECT nombre INTO nombre_cancha FROM canchas WHERE id = NEW.cancha_id;

  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    PERFORM avisar_al_complejo(NEW.empresa_id, 'reservas_confirmar', 'torneo',
      'Te piden una cancha para un torneo',
      '«' || t.nombre || '» quiere ' || COALESCE(nombre_cancha, 'una cancha') ||
      ' los ' || array_to_string(NEW.dias, ', ') || ' · Bs. ' || plata(NEW.costo_total),
      '/admin/torneos');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'aprobada' THEN
      PERFORM avisar(t.creador_id, 'torneo', 'Te aprobaron la cancha',
        '«' || t.nombre || '» ya tiene ' || COALESCE(nombre_cancha, 'cancha') ||
        ' reservada. Ya puedes abrir las inscripciones.',
        '/app/torneos/' || NEW.torneo_id);
    ELSIF NEW.estado = 'rechazada' THEN
      PERFORM avisar(t.creador_id, 'torneo', 'No te dieron la cancha',
        '«' || t.nombre || '»' ||
        COALESCE(': ' || NEW.motivo, '. El complejo no dio un motivo.'),
        '/app/torneos/' || NEW.torneo_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION notificar_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT nombre, creador_id INTO t FROM torneos WHERE id = NEW.torneo_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM avisar(t.creador_id, 'equipo', 'Un equipo se inscribió',
      '«' || NEW.nombre || '» se anotó en ' || t.nombre ||
      '. Revisa el comprobante para aprobarlo.',
      '/app/torneos/' || NEW.torneo_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'aprobado' THEN
      PERFORM avisar(NEW.capitan_id, 'equipo', 'Tu equipo quedó adentro',
        '«' || NEW.nombre || '» fue aprobado en ' || t.nombre,
        '/app/torneos/' || NEW.torneo_id);
    ELSIF NEW.estado = 'rechazado' THEN
      PERFORM avisar(NEW.capitan_id, 'equipo', 'Tu inscripción fue rechazada',
        '«' || NEW.nombre || '» no entró en ' || t.nombre ||
        '. Consulta con el organizador.',
        '/app/torneos/' || NEW.torneo_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION notificar_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    INSERT INTO notificaciones (usuario_id, tipo, titulo, detalle, enlace)
    SELECT id, 'empresa', 'Nueva solicitud de complejo',
           '«' || NEW.nombre || '» pide entrar a Sportika. Revisa sus datos.',
           '/superadmin/empresas'
      FROM profiles WHERE rol = 'superadmin';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'activo' THEN
      PERFORM avisar(NEW.admin_id, 'empresa', 'Tu complejo fue aprobado',
        '«' || NEW.nombre || '» ya aparece para los clientes. ' ||
        'Carga tu QR de pago y publica tus canchas.', '/mi-cuenta');
    ELSIF NEW.estado = 'suspendido' THEN
      PERFORM avisar(NEW.admin_id, 'empresa', 'Tu complejo fue suspendido',
        '«' || NEW.nombre || '» dejó de verse para los clientes. ' ||
        'Comunícate con Sportika.', '/admin/dashboard');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION canjear_recompensa(p_recompensa UUID)
RETURNS canjes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cliente    UUID := auth.uid();
  v_saldo      INTEGER;
  v_recompensa recompensas%ROWTYPE;
  v_canje      canjes%ROWTYPE;
  v_codigo     TEXT;
BEGIN
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'Tienes que iniciar sesión para canjear';
  END IF;

  SELECT * INTO v_recompensa FROM recompensas WHERE id = p_recompensa;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa recompensa ya no existe';
  END IF;
  IF NOT v_recompensa.activa THEN
    RAISE EXCEPTION 'Esa recompensa ya no esta disponible';
  END IF;

  -- El bloqueo evita que dos pestanas canjeen el mismo saldo a la vez
  SELECT puntos INTO v_saldo FROM profiles WHERE id = v_cliente FOR UPDATE;

  IF v_saldo < v_recompensa.puntos THEN
    RAISE EXCEPTION 'No te alcanzan los puntos: tienes % y necesitas %',
      v_saldo, v_recompensa.puntos;
  END IF;

  v_codigo := 'SPK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  INSERT INTO canjes (cliente_id, recompensa_id, empresa_id, puntos_gastados, codigo, estado)
  VALUES (v_cliente, p_recompensa, v_recompensa.empresa_id, v_recompensa.puntos, v_codigo, 'disponible')
  RETURNING * INTO v_canje;

  PERFORM sumar_puntos(v_cliente, 'Canje: ' || v_recompensa.nombre,
                       -v_recompensa.puntos, v_canje.id);

  RETURN v_canje;
END;
$$;


create or replace function exigir_cuenta_activa()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user = 'authenticated' and cuenta_suspendida() then
    raise exception 'Tu cuenta está suspendida. Comunícate con Sportika.';
  end if;
  return new;
end;
$$;


create or replace function validar_reserva()
returns trigger
language plpgsql
-- DEFINER: tiene que leer la cancha y el complejo aunque el cliente no vea
-- todos sus campos. Por eso mira auth.uid() y no current_user.
security definer
set search_path = public
as $$
declare
  v_cancha  canchas%rowtype;
  v_empresa empresas%rowtype;
  v_fin     time;
begin
  -- Los datos iniciales se cargan desde el editor SQL, sin sesión: no se tocan
  if auth.uid() is null then
    return new;
  end if;

  select * into v_cancha from canchas where id = new.cancha_id;
  if not found or v_cancha.empresa_id <> new.empresa_id then
    raise exception 'Esa cancha no pertenece a este complejo';
  end if;
  if not v_cancha.activa then
    raise exception 'Esa cancha no está disponible por ahora';
  end if;

  select * into v_empresa from empresas where id = new.empresa_id;
  if v_empresa.estado <> 'activo' then
    raise exception 'Este complejo no está recibiendo reservas';
  end if;

  if new.hora_fin <= new.hora_inicio then
    raise exception 'La hora de fin tiene que ser posterior a la de inicio';
  end if;

  -- Dentro del horario del complejo (medianoche como cierre cuenta como 24:00)
  if v_empresa.horario_inicio is not null and v_empresa.horario_fin is not null then
    v_fin := v_empresa.horario_fin;
    if new.hora_inicio < v_empresa.horario_inicio
       or (v_fin <> '00:00' and new.hora_fin > v_fin) then
      raise exception 'El complejo atiende de % a %', to_char(v_empresa.horario_inicio, 'HH24:MI'),
        to_char(v_empresa.horario_fin, 'HH24:MI');
    end if;
  end if;

  -- Las reservas de clientes y de mostrador van por horas completas.
  -- Las jornadas de un torneo pueden empezar, por ejemplo, 14:30.
  if new.torneo_id is null and
     (extract(minute from new.hora_inicio) <> 0 or extract(minute from new.hora_fin) <> 0) then
    raise exception 'Las reservas son por horas completas';
  end if;

  -- Un cliente no reserva en el pasado (hora de Bolivia). El personal sí puede
  -- anotar a quien ya está jugando en el mostrador.
  if new.torneo_id is null and not trabaja_en_empresa(new.empresa_id) and not es_superadmin()
     and (new.fecha + new.hora_inicio) < (now() at time zone 'America/La_Paz') then
    raise exception 'Ese horario ya pasó. Elige uno desde ahora en adelante.';
  end if;

  return new;
end;
$$;


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
    raise exception 'Tu cuenta está suspendida. Comunícate con Sportika.';
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


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 43 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 43
select 'version ' || version_esquema();
