-- 035 · La aplicación abre rápido y solo se aceptan reservas posibles
--
-- PARTE 1 · Todo lo que la aplicación necesita al abrirse, en una sola petición
--
-- Las pruebas de carga (pruebas/carga) mostraron el cuello de botella: al
-- abrirse, la aplicación hacía 24 consultas a la API. Para la persona es una
-- sola espera (van en paralelo), pero para el servidor son 24 peticiones, y
-- cada una verifica la sesión, cambia de rol y toma una conexión. Con muchos
-- usuarios a la vez el servidor se llenaba de peticiones chicas y la apertura
-- llegaba a tardar decenas de segundos.
--
-- datos_iniciales() hace esas mismas 24 consultas dentro de la base y devuelve
-- todo junto. Es SECURITY INVOKER (lo normal): corre con los permisos de quien
-- la llama, así que las políticas RLS se aplican exactamente igual que antes.
-- Un cliente sigue recibiendo solo sus reservas y su perfil. La aplicación la
-- usa si existe; si no, vuelve a las 24 consultas (src/lib/carga.js).
--
-- PARTE 2 · Una reserva tiene que ser posible
--
-- Las pruebas de «qué pasa si» enviaron a la API reservas que la pantalla
-- nunca permitiría, y la base las aceptaba todas:
--   · en una fecha que ya pasó;
--   · a las 3 de la mañana, con el complejo cerrado;
--   · en una cancha que el complejo dio de baja;
--   · con la cancha de OTRO complejo, que aparecía en la lista del equivocado;
--   · de 1 minuto (por Bs. 2), cuando el sistema trabaja por horas completas.

create or replace function datos_iniciales()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'perfiles',             (select coalesce(json_agg(x), '[]') from (select id, nombre from perfiles_publicos) x),
    'empresas',             (select coalesce(json_agg(x order by x.nombre), '[]') from empresas x),
    'empresa_deportes',     (select coalesce(json_agg(x), '[]') from empresa_deportes x),
    'canchas',              (select coalesce(json_agg(x order by x.nombre), '[]') from canchas x),
    'empleados',            (select coalesce(json_agg(x), '[]') from empleados x),
    'entrenadores',         (select coalesce(json_agg(x order by x.nombre), '[]') from entrenadores x),
    'entrenamientos',       (select coalesce(json_agg(x order by x.hora_inicio), '[]') from entrenamientos x),
    'recompensas',          (select coalesce(json_agg(x order by x.puntos), '[]') from recompensas x),
    'calificaciones',       (select coalesce(json_agg(x order by x.created_at desc), '[]') from calificaciones x),
    'reservas',             (select coalesce(json_agg(x order by x.hora_inicio), '[]') from reservas x),
    'canjes',               (select coalesce(json_agg(x order by x.created_at desc), '[]') from canjes x),
    'torneos',              (select coalesce(json_agg(x order by x.fecha_inicio), '[]') from torneos x),
    'solicitudes_cancha',   (select coalesce(json_agg(x), '[]') from solicitudes_cancha x),
    'equipos',              (select coalesce(json_agg(x), '[]') from equipos x),
    'equipo_jugadores',     (select coalesce(json_agg(x order by x.dorsal), '[]') from equipo_jugadores x),
    'partidos_torneo',      (select coalesce(json_agg(x order by x.fecha_hora), '[]') from partidos_torneo x),
    'eventos_partido',      (select coalesce(json_agg(x order by x.minuto), '[]') from eventos_partido x),
    'partidos_espontaneos', (select coalesce(json_agg(x), '[]') from partidos_espontaneos x),
    'partido_jugadores',    (select coalesce(json_agg(x), '[]') from partido_jugadores x),
    'bitacora',             (select coalesce(json_agg(x order by x.created_at desc), '[]') from bitacora x),
    'puntos_historial',     (select coalesce(json_agg(x order by x.created_at desc), '[]') from puntos_historial x),
    'profiles',             (select coalesce(json_agg(x order by x.created_at), '[]') from profiles x),
    'comentarios',          (select coalesce(json_agg(x order by x.created_at), '[]') from comentarios x),
    'horarios_ocupados',    (select coalesce(json_agg(x), '[]') from horarios_ocupados x)
  )
$$;

-- ── Parte 1 · (arriba) ──
grant execute on function datos_iniciales() to anon, authenticated;


-- ── Parte 2 · Validez de una reserva ───────────────────────────────────────
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
    raise exception 'Ese horario ya pasó. Elegí uno desde ahora en adelante.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_reserva on reservas;
create trigger trg_validar_reserva
  before insert or update of fecha, hora_inicio, hora_fin, cancha_id, empresa_id on reservas
  for each row execute function validar_reserva();

-- La versión del esquema, para las pruebas (pruebas/integracion/esquema.test.js)
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 35 $$;
