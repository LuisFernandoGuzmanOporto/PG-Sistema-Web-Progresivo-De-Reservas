-- ============================================================
--  SPORTIKA — Esquema de base de datos para Supabase
--  PostgreSQL · Generado para proyecto de grado 2026
-- ============================================================
-- Instrucciones:
--   1. Ir a Supabase → SQL Editor
--   2. Pegar TODO este archivo y ejecutar
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
  'superadmin',
  'admin_empresa',
  'empleado',
  'cliente'
);

CREATE TYPE estado_empresa AS ENUM (
  'pendiente',
  'activo',
  'suspendido',
  'rechazado'
);

CREATE TYPE estado_reserva AS ENUM (
  'pendiente',
  'confirmada',
  'rechazada',
  'cancelada',
  'apartada',     -- el cliente eligió la hora y está pagando (10 minutos, migraciones/038)
  'vencida'       -- se le pasó el tiempo y otra persona tomó la hora
);

CREATE TYPE estado_torneo AS ENUM (
  'inscripciones',
  'en_curso',
  'finalizado',
  'cancelado'
);

CREATE TYPE estado_inscripcion AS ENUM (
  'pendiente',
  'aprobado',
  'rechazado'
);

CREATE TYPE tipo_recompensa AS ENUM (
  'descuento_reserva',
  'torneo_gratis',
  'fisico'
);

-- disponible = el cliente tiene el codigo | entregado = el complejo ya le dio el
-- premio fisico | utilizado = el codigo se aplico en una reserva o inscripcion
CREATE TYPE estado_canje AS ENUM (
  'disponible',
  'entregado',
  'utilizado'
);

CREATE TYPE nivel_entrenamiento AS ENUM (
  'Principiante',
  'Intermedio',
  'Avanzado'
);


-- ============================================================
-- 2. PERFILES DE USUARIO
--    Extiende auth.users de Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  correo        TEXT NOT NULL UNIQUE,
  telefono      TEXT,
  rol           rol_usuario NOT NULL DEFAULT 'cliente',
  avatar_url    TEXT,
  ciudad        TEXT DEFAULT 'Cochabamba',
  deporte_fav   TEXT,
  puntos        INTEGER NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 3. EMPRESAS DEPORTIVAS
-- ============================================================

CREATE TABLE empresas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  zona          TEXT NOT NULL,
  direccion     TEXT NOT NULL,
  telefono      TEXT,
  horario_inicio TIME,
  horario_fin    TIME,
  lat           DECIMAL(10, 7),
  lng           DECIMAL(10, 7),
  referencia    TEXT,
  logo_url      TEXT,
  foto_url      TEXT,
  qr_pago_url   TEXT,                      -- el QR con el que le pagan las reservas
  estado        estado_empresa NOT NULL DEFAULT 'pendiente',
  admin_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_empresas_updated
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tabla intermedia: deportes por empresa
CREATE TABLE empresa_deportes (
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  deporte     TEXT NOT NULL,
  PRIMARY KEY (empresa_id, deporte)
);


-- ============================================================
-- 4. SOLICITUDES DE REGISTRO DE EMPRESA
--    Formulario de /registro-empresa
-- ============================================================

CREATE TABLE solicitudes_empresa (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_empresa    TEXT NOT NULL,
  zona              TEXT NOT NULL,
  direccion         TEXT NOT NULL,
  telefono          TEXT,
  descripcion       TEXT,
  deportes          TEXT[] NOT NULL DEFAULT '{}',
  logo_url          TEXT,
  foto_url          TEXT,
  admin_nombre      TEXT NOT NULL,
  admin_correo      TEXT NOT NULL,
  estado            estado_empresa NOT NULL DEFAULT 'pendiente',
  motivo_rechazo    TEXT,
  revisado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_solicitudes_updated
  BEFORE UPDATE ON solicitudes_empresa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 5. EMPLEADOS
--    Admin de empresa puede crear empleados con acceso limitado
-- ============================================================

-- El administrador crea la cuenta del empleado y le activa permisos uno por uno.
-- Solo el administrador puede cambiar la contrasena o dar de baja la cuenta.
-- Dar de baja NO borra la fila: la bitacora conserva quien hizo cada cosa.
CREATE TABLE empleados (
  id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario     TEXT NOT NULL UNIQUE,           -- con el que inicia sesion: 'rosa.v'
  turno       TEXT,                           -- informativo: 'Manana (06:00 - 14:00)'
  permisos    TEXT[] NOT NULL DEFAULT '{}',   -- ['reservas_confirmar','asistencia',...]
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permisos validos (los mismos que muestra la pantalla de Empleados):
--   reservas_confirmar · reservas_crear · asistencia · recompensas
--   canchas_estado · entrenamientos · torneos_mesa


-- ============================================================
-- 6. CANCHAS
-- ============================================================

CREATE TABLE canchas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  deporte     TEXT NOT NULL,
  precio_hora DECIMAL(8,2) NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  capacidad   INTEGER,                  -- jugadores por lado, informativo
  apertura    TIME,                     -- desde que hora se puede reservar
  cierre      TIME,
  descripcion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cancha_horario_valido CHECK (
    apertura IS NULL OR cierre IS NULL OR cierre > apertura
  )
);

CREATE TRIGGER trg_canchas_updated
  BEFORE UPDATE ON canchas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 7. RESERVAS
-- ============================================================

CREATE TABLE reservas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nro               TEXT UNIQUE,              -- ej: RSV-2026-00142
  cliente_id        UUID REFERENCES profiles(id) ON DELETE RESTRICT,
                    -- NULL solo en reservas presenciales: el que llega al
                    -- mostrador puede no tener cuenta en la app
  cliente_nombre    TEXT,                     -- se llena cuando no hay cuenta
  cliente_telefono  TEXT,
  cancha_id         UUID NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  fecha             DATE NOT NULL,
  hora_inicio       TIME NOT NULL,
  hora_fin          TIME NOT NULL,
  monto_total       DECIMAL(8,2) NOT NULL,
  estado            estado_reserva NOT NULL DEFAULT 'pendiente',
  comprobante_url   TEXT,                     -- imagen/PDF subido por el cliente
  codigo_descuento  TEXT,                     -- código de recompensa aplicado
  torneo_id         UUID REFERENCES torneos(id) ON DELETE CASCADE,
                    -- Si viene de un torneo, cual. Un torneo ocupando la
                    -- cancha ES una reserva: asi la agenda y el control de
                    -- choques lo respetan sin logica aparte.
  origen            TEXT NOT NULL DEFAULT 'app'
                    CONSTRAINT reservas_origen_check
                    CHECK (origen IN ('app','presencial','torneo')),
                    -- 'presencial' = la registro un empleado en el mostrador
  asistencia        TEXT CHECK (asistencia IN ('presente','ausente')),
                    -- lo marca el empleado el dia del partido
  confirmado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fecha_confirmacion TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Toda reserva sabe a quien pertenece: o una cuenta, o un nombre anotado
  CONSTRAINT reserva_tiene_cliente CHECK (
    cliente_id IS NOT NULL OR cliente_nombre IS NOT NULL OR torneo_id IS NOT NULL
  ),

  -- Dos reservas activas no se superponen en la misma cancha (migraciones/032)
  CONSTRAINT reservas_sin_superponer EXCLUDE USING gist (
    cancha_id WITH =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) WITH &&
  ) WHERE (estado IN ('pendiente', 'confirmada'))
);

CREATE TRIGGER trg_reservas_updated
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Secuencia para el número de reserva legible
CREATE SEQUENCE reserva_seq START 1;

-- Salta los números ya usados: los datos iniciales cargan reservas con número
-- fijo, y sin esto la secuencia chocaba con ellos (migraciones/034).
-- SECURITY DEFINER porque tiene que ver todas las reservas, no solo las propias.
CREATE OR REPLACE FUNCTION generar_nro_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nro TEXT;
BEGIN
  LOOP
    v_nro := 'RSV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('reserva_seq')::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM reservas WHERE nro = v_nro);
  END LOOP;
  NEW.nro := v_nro;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reserva_nro
  BEFORE INSERT ON reservas
  FOR EACH ROW WHEN (NEW.nro IS NULL)
  EXECUTE FUNCTION generar_nro_reserva();


-- ============================================================
-- 8. ENTRENADORES
-- ============================================================

CREATE TABLE entrenadores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  correo        TEXT,
  telefono      TEXT,
  deporte       TEXT NOT NULL,
  especialidad  TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 9. ENTRENAMIENTOS
--    Horario informativo publicado por el admin de la empresa.
--    NO hay inscripción en línea: el cliente solo consulta qué
--    días y a qué hora hay entrenamiento y se presenta en el
--    complejo. Por eso no existen tablas de inscripción ni de pago.
-- ============================================================

CREATE TABLE entrenamientos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  entrenador_id   UUID REFERENCES entrenadores(id) ON DELETE SET NULL,
  cancha_id       UUID REFERENCES canchas(id) ON DELETE SET NULL,
                  -- La cancha que ocupa. Si es NULL el entrenamiento se
                  -- anuncia, pero no bloquea ningun horario de reserva.
  nombre          TEXT NOT NULL,
  deporte         TEXT NOT NULL,
  descripcion     TEXT,
  nivel           nivel_entrenamiento NOT NULL DEFAULT 'Principiante',
  dias            TEXT[] NOT NULL DEFAULT '{}',  -- ['Lun','Mie','Vie'] → días marcados en el calendario
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  precio          DECIMAL(8,2),               -- referencial; NULL = libre o se consulta en el complejo
  para_ninos      BOOLEAN NOT NULL DEFAULT FALSE,
  edad_min        INTEGER,
  edad_max        INTEGER,
  -- Cuantos alumnos entran. NULL = sin limite; es distinto de cero, que
  -- seria "no entra nadie". No hay inscripcion en linea: es informativo.
  cupo_maximo     SMALLINT CHECK (cupo_maximo IS NULL OR cupo_maximo > 0),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (hora_fin > hora_inicio)
);

CREATE TRIGGER trg_entrenamientos_updated
  BEFORE UPDATE ON entrenamientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 10. TORNEOS
-- ============================================================

CREATE TABLE torneos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  creador_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  creador_tipo      TEXT NOT NULL DEFAULT 'cliente'
                    CHECK (creador_tipo IN ('cliente','complejo')),
                    -- 'complejo' = lo organiza la empresa; su personal puede
                    -- operar la mesa tecnica. 'cliente' = solo el organizador.
  nombre            TEXT NOT NULL,
  emoji             TEXT,
  deporte           TEXT NOT NULL,
  descripcion       TEXT,
  formato           TEXT,                     -- 'Grupos + Eliminacion', 'Eliminacion directa', 'Liga'
  max_equipos       INTEGER NOT NULL DEFAULT 8,
  clasifican_por_grupo INTEGER NOT NULL DEFAULT 2,
  jugadores_por_equipo INTEGER NOT NULL DEFAULT 5,  -- los que entran a la cancha
  suplentes         INTEGER NOT NULL DEFAULT 0,
  -- Cuantos jugadores se anotan. Es otra cosa que cuantos juegan: un equipo
  -- de futbol 11 anota mas de once porque lleva suplentes, y no se puede
  -- inscribir con nueve porque no completa.
  jugadores_min     INTEGER,
  jugadores_max     INTEGER,
  -- Como se gana un partido en los deportes que van por sets. El wally se
  -- juega a 15, a 21 o a 25 segun quien organice, asi que no puede quedar
  -- fijo: lo elige el que crea el torneo. NULL en futbol y basquet.
  puntos_por_set    INTEGER,
  sets_para_ganar   INTEGER,
  CONSTRAINT puntaje_coherente CHECK (
    (puntos_por_set  IS NULL OR puntos_por_set  BETWEEN 1 AND 99)
    AND
    (sets_para_ganar IS NULL OR sets_para_ganar BETWEEN 1 AND 5)
  ),
  CONSTRAINT cupo_jugadores_coherente CHECK (
    jugadores_min IS NULL OR jugadores_max IS NULL
    OR (jugadores_min > 0 AND jugadores_max >= jugadores_min)
  ),
  precio_inscripcion DECIMAL(8,2) NOT NULL DEFAULT 0,
  premio_primero    TEXT,
  premio_segundo    TEXT,
  premio_tercero    TEXT,
  reglas            TEXT[] NOT NULL DEFAULT '{}',
  horarios          TEXT,                     -- 'Lunes a Viernes: 2:00 PM - 8:00 PM'
  sorteado_at       TIMESTAMPTZ,              -- cuando se hizo el sorteo de grupos
  fecha_inicio      DATE,
  fecha_fin         DATE,
  inscripcion_hasta DATE,
  qr_pago_url       TEXT,
  estado            estado_torneo NOT NULL DEFAULT 'inscripciones',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_torneos_updated
  BEFORE UPDATE ON torneos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 12. EQUIPOS DE TORNEO
-- ============================================================

CREATE TABLE equipos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  capitan_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  capitan_nombre  TEXT NOT NULL,             -- el capitan puede no tener cuenta
  capitan_telefono TEXT,
  grupo           TEXT,                       -- 'A', 'B'... lo asigna el sorteo; NULL antes
  comprobante_url TEXT,
  escudo_url      TEXT,                       -- escudo del equipo, en el bucket publico
  codigo_canje    TEXT,                       -- código de recompensa torneo_gratis
  estado          estado_inscripcion NOT NULL DEFAULT 'pendiente',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jugadores dentro de un equipo.
-- Un equipo anota jugadores que NO siempre tienen cuenta en Sportika (el
-- capitan carga la lista con nombre, C.I. y dorsal), por eso jugador_id es
-- opcional. El UNIQUE del dorsal impide repetirlo dentro del mismo equipo.
CREATE TABLE equipo_jugadores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nombre      TEXT NOT NULL,
  ci          TEXT,
  dorsal      SMALLINT NOT NULL CHECK (dorsal BETWEEN 1 AND 99),
  posicion    TEXT,
  habilitado  BOOLEAN NOT NULL DEFAULT TRUE,  -- lo define la habilitacion pre-partido
  UNIQUE (equipo_id, dorsal)
);


-- ============================================================
-- 13. PARTIDOS DE TORNEO
-- ============================================================

CREATE TABLE partidos_torneo (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id     UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  equipo_a_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
  equipo_b_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
  goles_a       INTEGER NOT NULL DEFAULT 0,
  goles_b       INTEGER NOT NULL DEFAULT 0,
  amarillas_a   SMALLINT NOT NULL DEFAULT 0,
  amarillas_b   SMALLINT NOT NULL DEFAULT 0,
  rojas_a       SMALLINT NOT NULL DEFAULT 0,
  rojas_b       SMALLINT NOT NULL DEFAULT 0,
  penales_a     SMALLINT,                     -- solo si hubo tanda de penales
  penales_b     SMALLINT,
  tanda         JSONB,                        -- los tiros en orden: [{equipo, anoto}]
  fase          TEXT NOT NULL DEFAULT 'grupos'
                CHECK (fase IN ('grupos','eliminatoria','tercer_puesto')),
  grupo         TEXT,                         -- 'A', 'B'... solo en fase de grupos
  ronda         TEXT,                         -- 'Octavos', 'Cuartos', 'Semifinal', 'Final'
  estado        TEXT NOT NULL DEFAULT 'programado'
                CHECK (estado IN ('programado','en_vivo','finalizado')),
  minuto        SMALLINT,                     -- minuto actual mientras esta en vivo
  cancha_id     UUID REFERENCES canchas(id) ON DELETE SET NULL,
  fecha_hora    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (equipo_a_id <> equipo_b_id)
);

-- Cada gol y cada tarjeta, con el jugador y el minuto.
-- La mesa tecnica escribe aqui; el marcador en vivo, la tabla de goleadores y
-- la suspension por roja se calculan desde estas filas (no se guardan aparte).
CREATE TABLE eventos_partido (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id        UUID NOT NULL REFERENCES partidos_torneo(id) ON DELETE CASCADE,
  equipo_id         UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_equipo_id UUID NOT NULL REFERENCES equipo_jugadores(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('gol','amarilla','roja')),
  minuto            SMALLINT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de goleadores lista para consultar
CREATE VIEW v_goleadores AS
SELECT  p.torneo_id,
        ej.id            AS jugador_equipo_id,
        ej.nombre,
        ej.dorsal,
        e.nombre         AS equipo,
        COUNT(*) FILTER (WHERE ev.tipo = 'gol')      AS goles,
        COUNT(*) FILTER (WHERE ev.tipo = 'amarilla') AS amarillas,
        COUNT(*) FILTER (WHERE ev.tipo = 'roja')     AS rojas
FROM eventos_partido ev
JOIN partidos_torneo  p  ON p.id  = ev.partido_id
JOIN equipo_jugadores ej ON ej.id = ev.jugador_equipo_id
JOIN equipos          e  ON e.id  = ev.equipo_id
GROUP BY p.torneo_id, ej.id, ej.nombre, ej.dorsal, e.nombre;


-- ============================================================
-- 14. PARTIDOS ESPONTÁNEOS
-- ============================================================

CREATE TABLE partidos_espontaneos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  creador_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  deporte       TEXT NOT NULL,
  cancha_id     UUID REFERENCES canchas(id) ON DELETE SET NULL,
  cuando        TEXT NOT NULL,                -- 'Ahora mismo', 'En 1 hora', etc.
  fecha_hora    TIMESTAMPTZ,
  max_jugadores INTEGER NOT NULL DEFAULT 10,
  apuesta       TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jugadores unidos al partido. jugador_id es opcional porque alguien puede
-- sumar a un amigo que todavia no tiene cuenta en Sportika.
CREATE TABLE partido_jugadores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id  UUID NOT NULL REFERENCES partidos_espontaneos(id) ON DELETE CASCADE,
  jugador_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partido_id, jugador_id)
);


-- ============================================================
-- 15. RECOMPENSAS
-- ============================================================

CREATE TABLE recompensas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT '🎁',
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  tipo        tipo_recompensa NOT NULL DEFAULT 'fisico',
  puntos      INTEGER NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  -- Cuanto descuenta, solo para tipo = 'descuento_reserva'.
  --
  --   porcentaje    20  -> el 20% de lo que salga la reserva
  --   horas_gratis   1  -> una hora al precio de esa cancha
  --
  -- Hacen falta las dos formas: "una hora gratis" no se puede escribir como
  -- porcentaje, porque sobre una reserva de una hora es el 100%, sobre una de
  -- dos el 50% y sobre una de cuatro el 25%. Depende de cuanto reserve.
  --
  -- Antes esto no existia y el "20%" vivia dentro del NOMBRE, como texto:
  -- ningun programa podia leer "Descuento 20% en reserva" y sacar de ahi que
  -- eran veinte por ciento. El cliente gastaba sus puntos y pagaba igual.
  descuento_tipo  TEXT,
  descuento_valor NUMERIC(6,2),
  CONSTRAINT descuento_coherente CHECK (
    (descuento_tipo IS NULL AND descuento_valor IS NULL)
    OR (descuento_tipo = 'porcentaje'   AND descuento_valor > 0 AND descuento_valor <= 100)
    OR (descuento_tipo = 'horas_gratis' AND descuento_valor > 0 AND descuento_valor <= 24)
  ),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_recompensas_updated
  BEFORE UPDATE ON recompensas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 16. CANJES DE RECOMPENSAS
-- ============================================================

CREATE TABLE canjes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  recompensa_id   UUID NOT NULL REFERENCES recompensas(id) ON DELETE RESTRICT,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  puntos_gastados INTEGER NOT NULL,
  codigo          TEXT UNIQUE,                -- CNJ-XXXX, se lo muestra al mostrador
  estado          estado_canje NOT NULL DEFAULT 'disponible',
  usado_en        TEXT,                       -- 'reserva' | 'torneo' | 'entregado'
  entregado_por   UUID REFERENCES profiles(id) ON DELETE SET NULL,
                  -- el empleado o el administrador que entrego el premio
  entregado_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 17. HISTORIAL DE PUNTOS
-- ============================================================

CREATE TABLE puntos_historial (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concepto    TEXT NOT NULL,
  puntos      INTEGER NOT NULL,              -- positivo = ganó, negativo = gastó
  referencia  UUID,                          -- ID de reserva, torneo, canje, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 18. CALIFICACIONES
-- ============================================================

CREATE TABLE calificaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Solo el voto. Lo que el cliente quiera decir va en comentarios, que es
  -- donde el complejo le responde (migraciones/030).
  estrellas   SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cliente_id)             -- 1 calificación por cliente por empresa
);



-- ============================================================
-- 19. SOLICITUD DE CANCHA PARA UN TORNEO
--     Cuando un CLIENTE organiza su torneo en un complejo, le pide
--     la cancha al administrador. Hasta que este la apruebe, el
--     torneo existe pero no recibe inscripciones.
--     Los torneos del propio complejo no pasan por aqui.
-- ============================================================

CREATE TABLE solicitudes_cancha (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id     UUID NOT NULL UNIQUE REFERENCES torneos(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cancha_id     UUID REFERENCES canchas(id) ON DELETE SET NULL,
  dias          TEXT[] NOT NULL DEFAULT '{}',  -- ['Sab','Dom']: solo esos dias del rango
  hora_inicio   TIME,
  hora_fin      TIME,
  costo_total   DECIMAL(10,2),                 -- horas x jornadas x precio, informativo
  estado        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','aprobada','rechazada')),
  motivo        TEXT,                         -- por que la rechazo, para el organizador
  resuelta_por  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resuelta_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 20. BITACORA DE ACTIVIDAD
--     Toda accion que hace un empleado (o el administrador) queda
--     registrada aqui. Se guarda el NOMBRE ademas del id: si la
--     cuenta se da de baja, el historial sigue siendo legible.
-- ============================================================

CREATE TABLE bitacora (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_nombre  TEXT NOT NULL,
  tipo          TEXT NOT NULL
                CONSTRAINT bitacora_tipo_check CHECK (tipo IN (
                  'reserva','recompensa','cancha','asistencia','torneo','cuenta',
                  'entrenador','entrenamiento','calificacion')),
  accion        TEXT NOT NULL,                -- 'Confirmo una reserva'
  detalle       TEXT,                         -- 'RSV-2026-00160 · Carlos Mamani · 09:00'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 22. ROW LEVEL SECURITY (RLS)
--    Habilitar RLS en todas las tablas
-- ============================================================

ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_empresa         ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE canchas                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrenadores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrenamientos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo_jugadores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_torneo             ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_espontaneos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partido_jugadores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompensas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE canjes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos_historial            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificaciones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_deportes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_partido             ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_cancha          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora                    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 20. FUNCIONES DE APOYO PARA LAS POLITICAS
--
--     Una politica de RLS no puede consultar la misma tabla que
--     esta protegiendo: Postgres entra en recursion infinita.
--     Por eso el rol y la empresa se preguntan con funciones
--     SECURITY DEFINER, que se ejecutan con permisos del dueno y
--     no vuelven a disparar las politicas.
-- ============================================================

CREATE OR REPLACE FUNCTION es_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'superadmin') $$;

-- TRUE si el usuario es el administrador de esa empresa
CREATE OR REPLACE FUNCTION administra_empresa(emp UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM empresas WHERE id = emp AND admin_id = auth.uid()) $$;

-- TRUE si es el administrador O un empleado activo de esa empresa
CREATE OR REPLACE FUNCTION trabaja_en_empresa(emp UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM empresas  WHERE id = emp AND admin_id = auth.uid())
      OR EXISTS (SELECT 1 FROM empleados WHERE empresa_id = emp AND id = auth.uid() AND activo)
$$;

-- La empresa a la que pertenece un torneo (para las politicas de sus tablas hijas)
CREATE OR REPLACE FUNCTION empresa_del_torneo(t UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT empresa_id FROM torneos WHERE id = t $$;

-- TRUE si el usuario creo ese torneo
CREATE OR REPLACE FUNCTION organiza_torneo(t UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM torneos WHERE id = t AND creador_id = auth.uid()) $$;


-- ============================================================
-- 21. POLITICAS RLS
--
--     Criterio general:
--       - Lo que el catalogo publico muestra se puede LEER sin login
--         (complejos activos, canchas, entrenamientos, torneos...).
--       - Escribir siempre exige ser el dueno del dato, el complejo
--         o el super administrador.
-- ============================================================

-- ── PERFILES ────────────────────────────────────────────────
CREATE POLICY "perfil_propio" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "superadmin_ve_profiles" ON profiles
  FOR SELECT USING (es_superadmin());

-- Y puede suspender una cuenta o corregir un rol mal asignado
CREATE POLICY "superadmin_gestiona_profiles" ON profiles
  FOR UPDATE USING (es_superadmin()) WITH CHECK (es_superadmin());

-- ── EMPRESAS ────────────────────────────────────────────────
-- Un cliente solo ve las aprobadas: las pendientes no existen para el
CREATE POLICY "empresas_publicas" ON empresas
  FOR SELECT USING (estado = 'activo');

CREATE POLICY "admin_ve_su_empresa" ON empresas
  FOR ALL USING (admin_id = auth.uid()) WITH CHECK (admin_id = auth.uid());

CREATE POLICY "superadmin_empresas" ON empresas
  FOR ALL USING (es_superadmin()) WITH CHECK (es_superadmin());

-- Las politicas de arriba son FOR ALL: dejan al administrador editar la fila
-- de su complejo (lo necesita "Mi cuenta": direccion, horario, deportes,
-- ubicacion). Pero hay dos columnas que no le tocan, y no alcanza con que la
-- pantalla no las mande: cualquiera puede armar el pedido desde la consola.
--
-- SECURITY INVOKER a proposito (el modo por omision). Dentro de un
-- SECURITY DEFINER, current_user seria el dueno de la funcion y la
-- comparacion con 'authenticated' no se cumpliria nunca.
CREATE OR REPLACE FUNCTION proteger_campos_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT es_superadmin() THEN
    NEW.estado   := OLD.estado;      -- aprobar un complejo es del super admin
    NEW.admin_id := OLD.admin_id;    -- ni pasarselo a otra cuenta
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_empresa
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION proteger_campos_empresa();

CREATE POLICY "deportes_lectura" ON empresa_deportes
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "deportes_admin_crear" ON empresa_deportes
  FOR INSERT WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "deportes_admin_modificar" ON empresa_deportes
  FOR UPDATE USING (administra_empresa(empresa_id)) WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "deportes_admin_borrar" ON empresa_deportes
  FOR DELETE USING (administra_empresa(empresa_id));

-- ── SOLICITUDES DE EMPRESA (las aprueba el super admin) ─────
CREATE POLICY "crear_solicitud" ON solicitudes_empresa
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "superadmin_solicitudes" ON solicitudes_empresa
  FOR ALL USING (es_superadmin()) WITH CHECK (es_superadmin());

-- ── EMPLEADOS ───────────────────────────────────────────────
-- El empleado ve su propia cuenta; el administrador gestiona las de su complejo
CREATE POLICY "empleado_se_ve" ON empleados
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_empleados" ON empleados
  FOR ALL USING (administra_empresa(empresa_id)) WITH CHECK (administra_empresa(empresa_id));

-- ── CANCHAS ─────────────────────────────────────────────────
CREATE POLICY "canchas_publicas" ON canchas
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "personal_canchas_crear" ON canchas
  FOR INSERT WITH CHECK (trabaja_en_empresa(empresa_id));
CREATE POLICY "personal_canchas_modificar" ON canchas
  FOR UPDATE USING (trabaja_en_empresa(empresa_id)) WITH CHECK (trabaja_en_empresa(empresa_id));
CREATE POLICY "personal_canchas_borrar" ON canchas
  FOR DELETE USING (trabaja_en_empresa(empresa_id));

-- ── RESERVAS ────────────────────────────────────────────────
CREATE POLICY "cliente_reservas" ON reservas
  FOR ALL USING (cliente_id = auth.uid()) WITH CHECK (cliente_id = auth.uid());

-- Un torneo que organiza un CLIENTE tambien ocupa la cancha, y esas jornadas
-- son reservas comunes. Las politicas de arriba dan de alta reservas al
-- cliente para si mismo y al complejo; esta le deja al organizador crear las
-- de su propio torneo aunque no sea el dueno del complejo.
CREATE POLICY "organizador_reserva_su_torneo" ON reservas
  FOR ALL
  USING      (torneo_id IS NOT NULL AND organiza_torneo(torneo_id))
  WITH CHECK (torneo_id IS NOT NULL AND organiza_torneo(torneo_id));


-- El administrador y sus empleados atienden las reservas del complejo
CREATE POLICY "personal_reservas" ON reservas
  FOR ALL USING (trabaja_en_empresa(empresa_id)) WITH CHECK (trabaja_en_empresa(empresa_id));

-- ── ENTRENADORES Y ENTRENAMIENTOS ───────────────────────────
CREATE POLICY "entrenadores_lectura" ON entrenadores
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "admin_entrenadores_crear" ON entrenadores
  FOR INSERT WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "admin_entrenadores_modificar" ON entrenadores
  FOR UPDATE USING (administra_empresa(empresa_id)) WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "admin_entrenadores_borrar" ON entrenadores
  FOR DELETE USING (administra_empresa(empresa_id));

-- Horario informativo: lo lee cualquiera, lo publica el administrador
CREATE POLICY "entrenamientos_publicos" ON entrenamientos
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "admin_entrenamientos_crear" ON entrenamientos
  FOR INSERT WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "admin_entrenamientos_modificar" ON entrenamientos
  FOR UPDATE USING (administra_empresa(empresa_id)) WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "admin_entrenamientos_borrar" ON entrenamientos
  FOR DELETE USING (administra_empresa(empresa_id));

-- ── TORNEOS ─────────────────────────────────────────────────
CREATE POLICY "torneos_publicos" ON torneos
  FOR SELECT USING (TRUE);

-- Cualquier cliente registrado puede crear su torneo
CREATE POLICY "crear_torneo" ON torneos
  FOR INSERT WITH CHECK (creador_id = auth.uid());

-- Lo administra quien lo creo, o el complejo si el torneo es suyo
-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "organizador_torneo_crear" ON torneos
  FOR INSERT WITH CHECK (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id));
CREATE POLICY "organizador_torneo_modificar" ON torneos
  FOR UPDATE USING (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id)) WITH CHECK (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id));
CREATE POLICY "organizador_torneo_borrar" ON torneos
  FOR DELETE USING (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id));

-- ── SOLICITUD DE CANCHA PARA UN TORNEO ──────────────────────
-- La ve el organizador (para saber si se la aprobaron) y el complejo
CREATE POLICY "solicitud_cancha_lectura" ON solicitudes_cancha
  FOR SELECT USING (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_id));

CREATE POLICY "solicitud_cancha_crear" ON solicitudes_cancha
  FOR INSERT WITH CHECK (organiza_torneo(torneo_id));

-- Solo el complejo la aprueba o la rechaza
CREATE POLICY "solicitud_cancha_resolver" ON solicitudes_cancha
  FOR UPDATE USING (administra_empresa(empresa_id)) WITH CHECK (administra_empresa(empresa_id));

-- ── EQUIPOS Y JUGADORES ─────────────────────────────────────
CREATE POLICY "equipos_lectura" ON equipos
  FOR SELECT USING (TRUE);

-- El capitan inscribe su equipo
CREATE POLICY "capitan_inscribe" ON equipos
  FOR INSERT WITH CHECK (capitan_id = auth.uid());

-- Lo edita el capitan; lo aprueba o rechaza el organizador
-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "equipos_gestion_crear" ON equipos
  FOR INSERT WITH CHECK (capitan_id = auth.uid() OR organiza_torneo(torneo_id));
CREATE POLICY "equipos_gestion_modificar" ON equipos
  FOR UPDATE USING (capitan_id = auth.uid() OR organiza_torneo(torneo_id)) WITH CHECK (capitan_id = auth.uid() OR organiza_torneo(torneo_id));
CREATE POLICY "equipos_gestion_borrar" ON equipos
  FOR DELETE USING (capitan_id = auth.uid() OR organiza_torneo(torneo_id));

CREATE POLICY "jugadores_lectura" ON equipo_jugadores
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "jugadores_gestion_crear" ON equipo_jugadores
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id))));
CREATE POLICY "jugadores_gestion_modificar" ON equipo_jugadores
  FOR UPDATE USING (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id)))) WITH CHECK (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id))));
CREATE POLICY "jugadores_gestion_borrar" ON equipo_jugadores
  FOR DELETE USING (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id))));

-- ── PARTIDOS DE TORNEO Y SUS EVENTOS ────────────────────────
-- El marcador en vivo lo puede seguir cualquiera
CREATE POLICY "partidos_lectura" ON partidos_torneo
  FOR SELECT USING (TRUE);

-- La mesa tecnica: el organizador, o el personal si el torneo es del complejo
-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "mesa_partidos_crear" ON partidos_torneo
  FOR INSERT WITH CHECK (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id)));
CREATE POLICY "mesa_partidos_modificar" ON partidos_torneo
  FOR UPDATE USING (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id))) WITH CHECK (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id)));
CREATE POLICY "mesa_partidos_borrar" ON partidos_torneo
  FOR DELETE USING (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id)));

CREATE POLICY "eventos_lectura" ON eventos_partido
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "mesa_eventos_crear" ON eventos_partido
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id)))));
CREATE POLICY "mesa_eventos_modificar" ON eventos_partido
  FOR UPDATE USING (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id))))) WITH CHECK (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id)))));
CREATE POLICY "mesa_eventos_borrar" ON eventos_partido
  FOR DELETE USING (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id)))));

-- ── PARTIDOS ESPONTANEOS ────────────────────────────────────
CREATE POLICY "partidos_esp_lectura" ON partidos_espontaneos
  FOR SELECT USING (TRUE);

CREATE POLICY "crear_partido_esp" ON partidos_espontaneos
  FOR INSERT WITH CHECK (creador_id = auth.uid());

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "creador_partido_esp_crear" ON partidos_espontaneos
  FOR INSERT WITH CHECK (creador_id = auth.uid());
CREATE POLICY "creador_partido_esp_modificar" ON partidos_espontaneos
  FOR UPDATE USING (creador_id = auth.uid()) WITH CHECK (creador_id = auth.uid());
CREATE POLICY "creador_partido_esp_borrar" ON partidos_espontaneos
  FOR DELETE USING (creador_id = auth.uid());

CREATE POLICY "jugadores_partido_lectura" ON partido_jugadores
  FOR SELECT USING (TRUE);

-- Cada uno se une y se sale por su cuenta
-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "unirse_al_partido_crear" ON partido_jugadores
  FOR INSERT WITH CHECK (jugador_id = auth.uid());
CREATE POLICY "unirse_al_partido_modificar" ON partido_jugadores
  FOR UPDATE USING (jugador_id = auth.uid()) WITH CHECK (jugador_id = auth.uid());
CREATE POLICY "unirse_al_partido_borrar" ON partido_jugadores
  FOR DELETE USING (jugador_id = auth.uid());

-- ── RECOMPENSAS Y CANJES ────────────────────────────────────
CREATE POLICY "recompensas_publicas" ON recompensas
  FOR SELECT USING (TRUE);

-- Separada en INSERT, UPDATE y DELETE: si fuera FOR ALL se evaluaria tambien al leer,
-- fila por fila, aunque la lectura ya este permitida para todos (migraciones/036).
CREATE POLICY "admin_recompensas_crear" ON recompensas
  FOR INSERT WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "admin_recompensas_modificar" ON recompensas
  FOR UPDATE USING (administra_empresa(empresa_id)) WITH CHECK (administra_empresa(empresa_id));
CREATE POLICY "admin_recompensas_borrar" ON recompensas
  FOR DELETE USING (administra_empresa(empresa_id));

-- El cliente ve y crea sus canjes
CREATE POLICY "canjes_propios" ON canjes
  FOR ALL USING (cliente_id = auth.uid()) WITH CHECK (cliente_id = auth.uid());

-- El complejo los ve y los marca como entregados
CREATE POLICY "personal_canjes" ON canjes
  FOR ALL USING (trabaja_en_empresa(empresa_id)) WITH CHECK (trabaja_en_empresa(empresa_id));

-- ── LECTURA GLOBAL DEL SUPER ADMIN ──────────────────────────
-- Supervisa la plataforma: necesita los totales del sistema. Solo LECTURA, y
-- no incluye la bitacora: ese es el registro interno de cada complejo.
CREATE POLICY "superadmin_lee_reservas" ON reservas
  FOR SELECT USING (es_superadmin());

CREATE POLICY "superadmin_lee_canjes" ON canjes
  FOR SELECT USING (es_superadmin());

CREATE POLICY "superadmin_lee_empleados" ON empleados
  FOR SELECT USING (es_superadmin());

-- ── PUNTOS ──────────────────────────────────────────────────
-- Solo el dueno ve su historial de puntos
CREATE POLICY "puntos_propios" ON puntos_historial
  FOR SELECT USING (cliente_id = auth.uid());

-- ── CALIFICACIONES ──────────────────────────────────────────
CREATE POLICY "calificaciones_lectura" ON calificaciones
  FOR SELECT USING (TRUE);

CREATE POLICY "calificacion_propia" ON calificaciones
  FOR INSERT WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "calificacion_update" ON calificaciones
  FOR UPDATE USING (cliente_id = auth.uid()) WITH CHECK (cliente_id = auth.uid());


-- ── BITACORA ────────────────────────────────────────────────
-- La lee el administrador del complejo; la escriben el y sus empleados.
-- Nadie puede editarla ni borrarla: es el registro de auditoria.
CREATE POLICY "bitacora_lectura" ON bitacora
  FOR SELECT USING (administra_empresa(empresa_id));

CREATE POLICY "bitacora_escritura" ON bitacora
  FOR INSERT WITH CHECK (trabaja_en_empresa(empresa_id));


-- ============================================================
-- 22. INDICES para rendimiento
-- ============================================================

-- IF NOT EXISTS: se puede volver a ejecutar el archivo sin que falle.
CREATE INDEX IF NOT EXISTS idx_reservas_cliente       ON reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_cancha        ON reservas(cancha_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha         ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado        ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_empresa_fecha ON reservas(empresa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_cancha_fecha  ON reservas(cancha_id, fecha);
CREATE INDEX IF NOT EXISTS idx_canchas_empresa        ON canchas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_torneos_empresa        ON torneos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_torneos_estado         ON torneos(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_torneo         ON equipos(torneo_id);
CREATE INDEX IF NOT EXISTS idx_equipo_jug_equipo      ON equipo_jugadores(equipo_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_empresa ON calificaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_canjes_cliente         ON canjes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_canjes_empresa         ON canjes(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_puntos_cliente         ON puntos_historial(cliente_id);
CREATE INDEX IF NOT EXISTS idx_entrenamientos_empresa ON entrenamientos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_partidos_torneo        ON partidos_torneo(torneo_id, fase);
-- Una llave ('Cuartos de final 1', 'Final') existe una sola vez por torneo
CREATE UNIQUE INDEX IF NOT EXISTS idx_llave_unica
  ON partidos_torneo (torneo_id, ronda) WHERE ronda IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_partido        ON eventos_partido(partido_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_empresa       ON bitacora(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cancha     ON solicitudes_cancha(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_partidos_esp_empresa   ON partidos_espontaneos(empresa_id, activo);


-- ============================================================
-- 23. FUNCION: crear perfil automáticamente al registrarse
-- ============================================================

-- SET search_path es imprescindible: quien dispara esta funcion es el servicio
-- de autenticacion, y su camino de busqueda no incluye el esquema public. Sin
-- esta linea no encuentra ni la tabla profiles ni el tipo rol_usuario, y crear
-- cualquier cuenta falla con un escueto «Database error creating new user».
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, correo, rol, avatar_url)
  VALUES (
    NEW.id,
    -- Cada proveedor nombra distinto el mismo dato: nuestro formulario manda
    -- 'nombre', Google 'full_name'. Sin contemplarlos, el usuario quedaba
    -- registrado con la parte de su correo antes del arroba.
    COALESCE(
      NEW.raw_user_meta_data->>'nombre',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::public.rol_usuario, 'cliente'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 24. FUNCION: sumar/restar puntos al cliente
-- ============================================================

CREATE OR REPLACE FUNCTION sumar_puntos(
  p_cliente_id  UUID,
  p_concepto    TEXT,
  p_puntos      INTEGER,
  p_referencia  UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El disparador de profiles deja pasar este cambio porque, al ser esta una
  -- funcion SECURITY DEFINER, corre como su dueno y no como 'authenticated'.
  UPDATE profiles SET puntos = GREATEST(0, puntos + p_puntos) WHERE id = p_cliente_id;

  INSERT INTO puntos_historial (cliente_id, concepto, puntos, referencia)
  VALUES (p_cliente_id, p_concepto, p_puntos, p_referencia);
END;
$$;


-- ============================================================
-- 30. VISTA: promedio de calificaciones por empresa
-- ============================================================

CREATE VIEW vista_calificaciones_empresa AS
SELECT
  empresa_id,
  ROUND(AVG(estrellas)::NUMERIC, 1) AS promedio,
  COUNT(*)                           AS total_reseñas
FROM calificaciones
GROUP BY empresa_id;


-- ============================================================
-- 24b. VISTA: NOMBRES PUBLICOS
--
--     profiles esta protegida: cada uno solo ve su propio perfil. Pero hay
--     nombres que SI son publicos: quien dejo una resena, quien reservo una
--     cancha, quien organiza un torneo.
--
--     RLS trabaja por filas, no por columnas, asi que no alcanza. La solucion
--     es esta vista: expone unicamente id y nombre, nada de correo, telefono
--     ni puntos. Al no ser security_invoker, se salta el RLS de profiles y
--     devuelve el nombre sin abrir el resto del perfil.
-- ============================================================

CREATE OR REPLACE VIEW perfiles_publicos
  WITH (security_invoker = false) AS
  SELECT id, nombre FROM profiles;

GRANT SELECT ON perfiles_publicos TO anon, authenticated;


-- ============================================================
-- 25. PERMISOS DE ACCESO A LA API
--
--     RLS decide QUE FILAS ve cada uno, pero antes Postgres exige
--     el permiso base sobre la tabla. Sin esto la API responde
--     401 "insufficient privilege" aunque las politicas esten bien.
--
--     Va al FINAL a proposito: GRANT ... ON ALL TABLES solo alcanza
--     a las tablas que ya existen en ese momento.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Pero sumar_puntos no: recibe el cliente por parametro y es SECURITY DEFINER,
-- asi que abierta al navegador cualquiera podria regalarse puntos. Los puntos
-- se otorgan desde adentro de la base, nunca a pedido del cliente.
REVOKE EXECUTE ON FUNCTION sumar_puntos(UUID, TEXT, INTEGER, UUID) FROM anon, authenticated;

-- El servicio de autenticacion de Supabase tambien necesita permiso sobre
-- public: el trigger handle_new_user vive aqui y se dispara cuando alguien se
-- registra. Sin esto el inicio de sesion falla con
-- "Database error querying schema".
GRANT USAGE   ON SCHEMA public TO supabase_auth_admin;
GRANT ALL     ON ALL TABLES    IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_auth_admin;

-- Y que las tablas que se creen mas adelante ya nazcan con permiso
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;


-- ============================================================
-- ARCHIVOS (Storage)
-- ============================================================
-- Postgres no guarda imagenes. Las fotos van al disco de Supabase y en las
-- tablas queda solo la ruta ('a1b2.../qr-9f8e.png').
--
--   publico       QR de pago, logos y fotos de complejos. Abierto: el QR es
--                 el mismo codigo que el complejo cuelga en la pared, no hay
--                 nada que esconder, y con direccion fija un <img> lo muestra
--                 sin tener que pedir y renovar un enlace firmado.
--   comprobantes  La foto del pago de una persona. Cerrado; se abre con un
--                 enlace firmado que caduca.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('publico', 'publico', TRUE, 5242880,
   ARRAY['image/png','image/jpeg','image/jpg','image/webp']),
  ('comprobantes', 'comprobantes', FALSE, 10485760,
   ARRAY['image/png','image/jpeg','image/jpg','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Las rutas son texto: si el primer tramo no es un id, el casteo revienta y
-- la politica entera falla. Esto devuelve NULL y sigue.
CREATE OR REPLACE FUNCTION uuid_seguro(txt TEXT)
RETURNS UUID
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN txt::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION empresa_existe(emp UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM empresas WHERE id = emp) $$;

--   <empresa_id>/reservas/<archivo>          -> el complejo que cobra
--   <empresa_id>/torneos/<torneo_id>/<arch>  -> ademas, quien organiza
CREATE OR REPLACE FUNCTION puede_ver_comprobante(ruta TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT es_superadmin()
      OR trabaja_en_empresa(uuid_seguro((storage.foldername(ruta))[1]))
      OR ( (storage.foldername(ruta))[2] = 'torneos'
           AND organiza_torneo(uuid_seguro((storage.foldername(ruta))[3])) )
$$;

-- Sin esto cualquiera podria reemplazar el QR de un complejo por el suyo y
-- quedarse con los pagos.
CREATE OR REPLACE FUNCTION puede_escribir_publico(ruta TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT es_superadmin()
      OR CASE WHEN (storage.foldername(ruta))[1] = 'torneos'
              THEN organiza_torneo(uuid_seguro((storage.foldername(ruta))[2]))
                OR trabaja_en_empresa(
                     empresa_del_torneo(uuid_seguro((storage.foldername(ruta))[2])))
              ELSE administra_empresa(uuid_seguro((storage.foldername(ruta))[1]))
         END
$$;

CREATE POLICY "publico_lectura" ON storage.objects
  FOR SELECT USING (bucket_id = 'publico');

CREATE POLICY "publico_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'publico' AND puede_escribir_publico(name));

CREATE POLICY "publico_reemplazar" ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket_id = 'publico' AND puede_escribir_publico(name))
  WITH CHECK (bucket_id = 'publico' AND puede_escribir_publico(name));

CREATE POLICY "publico_borrar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'publico' AND puede_escribir_publico(name));

CREATE POLICY "comprobante_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes'
              AND empresa_existe(uuid_seguro((storage.foldername(name))[1])));

CREATE POLICY "comprobante_ver" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes'
         AND (owner = auth.uid() OR puede_ver_comprobante(name)));

-- El comprobante es la prueba del pago: no se borra desde la aplicacion
CREATE POLICY "comprobante_borrar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND es_superadmin());


-- ============================================================
-- PROTECCIONES SOBRE LO QUE CADA UNO PUEDE CAMBIAR
-- ============================================================
-- Varias politicas son FOR ALL porque el dueno de una fila tiene que poder
-- editarla. Pero hay columnas que deciden cosas que no le tocan, y no alcanza
-- con que la pantalla no las mande: el pedido se arma desde la consola.
--
-- Los tres disparadores van con SECURITY INVOKER (el modo por omision, sin
-- declararlo). Dentro de un SECURITY DEFINER, current_user seria el dueno de
-- la funcion y la comparacion con 'authenticated' no se cumpliria nunca.

-- Un cliente no se regala puntos ni se cambia el rol
CREATE OR REPLACE FUNCTION proteger_campos_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT es_superadmin() THEN
    NEW.puntos := OLD.puntos;
    NEW.rol    := OLD.rol;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_perfil
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION proteger_campos_perfil();

-- El cliente no modifica ni borra su reserva: la confirman, rechazan y
-- marcan la asistencia el personal del complejo (migraciones/031). Sin esto,
-- la politica "cliente_reservas" le dejaba cambiarse el monto.
CREATE OR REPLACE FUNCTION proteger_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_empresa UUID := COALESCE(OLD.empresa_id, NEW.empresa_id);
  v_torneo  UUID := COALESCE(OLD.torneo_id, NEW.torneo_id);
BEGIN
  IF current_user = 'authenticated'
     AND NOT trabaja_en_empresa(v_empresa)
     AND NOT es_superadmin()
     AND NOT (v_torneo IS NOT NULL AND organiza_torneo(v_torneo)) THEN
    RAISE EXCEPTION 'Una reserva solo la puede modificar el complejo';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_reserva
  BEFORE UPDATE OR DELETE ON reservas
  FOR EACH ROW EXECUTE FUNCTION proteger_reserva();

-- Un capitan no aprueba su propio equipo ni se cambia de grupo
CREATE OR REPLACE FUNCTION proteger_campos_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NOT organiza_torneo(OLD.torneo_id)
     AND NOT es_superadmin() THEN
    NEW.estado := OLD.estado;
    NEW.grupo  := OLD.grupo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_equipo
  BEFORE UPDATE ON equipos
  FOR EACH ROW EXECUTE FUNCTION proteger_campos_equipo();


-- ============================================================
-- COMENTARIOS
-- ============================================================
-- Van aparte de las calificaciones a proposito, porque son dos cosas:
--
--   La calificacion es un VOTO: una por persona y por complejo (lo fija el
--   UNIQUE de esa tabla), porque es la que arma el promedio. Si cada uno
--   pudiera dejar diez, un complejo consigue tres amigos y se compra la nota.
--
--   El comentario es CONVERSACION: cuantos quiera cada uno, con respuestas
--   entre clientes y del complejo. Ahi no hay nada que inflar.
--
-- Cada comentario cuelga de nada (charla suelta del complejo), de una reseña,
-- o de otro comentario. El detalle esta en migraciones/024_comentarios.sql.

CREATE TABLE comentarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  autor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  texto           TEXT NOT NULL,
  calificacion_id UUID REFERENCES calificaciones(id) ON DELETE CASCADE,
  responde_a      UUID REFERENCES comentarios(id)    ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  editado_at      TIMESTAMPTZ,

  CONSTRAINT texto_con_contenido
    CHECK (char_length(btrim(texto)) BETWEEN 1 AND 500),
  -- O cuelga de una reseña, o de otro comentario, o de ninguno. Nunca de dos.
  CONSTRAINT responde_a_uno_solo
    CHECK (calificacion_id IS NULL OR responde_a IS NULL)
);

CREATE INDEX idx_comentarios_empresa     ON comentarios (empresa_id, created_at);
CREATE INDEX idx_comentarios_hilo        ON comentarios (responde_a);
CREATE INDEX idx_comentarios_calificacion ON comentarios (calificacion_id);

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comentarios_lectura" ON comentarios
  FOR SELECT USING (TRUE);

-- Cada uno escribe a su nombre: sin esto se podria comentar haciendose pasar
-- por otro
CREATE POLICY "comentario_propio" ON comentarios
  FOR INSERT WITH CHECK (autor_id = auth.uid());

CREATE POLICY "editar_mi_comentario" ON comentarios
  FOR UPDATE USING (autor_id = auth.uid()) WITH CHECK (autor_id = auth.uid());

-- Borra el autor, o el complejo. El complejo lo necesita para moderar su
-- propia ficha sin pedirle permiso a nadie.
CREATE POLICY "borrar_comentario" ON comentarios
  FOR DELETE USING (autor_id = auth.uid() OR administra_empresa(empresa_id));


-- ============================================================
-- NOTIFICACIONES
-- ============================================================
-- Las filas NO las crea la aplicacion, las crean los disparadores de mas
-- abajo. Si las creara el navegador haria falta una politica que deje a un
-- usuario insertar a nombre de otro, y entonces cualquiera podria llenarle la
-- campana a quien quisiera. Ademas una reserva se aprueba desde tres
-- pantallas: colgado del cambio de estado, el aviso sale siempre.
-- El detalle completo esta en migraciones/021_notificaciones.sql.

CREATE TABLE notificaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,          -- 'reserva' | 'torneo' | 'equipo' | 'empresa'
  titulo      TEXT NOT NULL,
  detalle     TEXT,
  enlace      TEXT,                   -- a donde lleva al tocarla
  leida       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_usuario ON notificaciones (usuario_id, leida, created_at DESC);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_propias" ON notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "notif_marcar" ON notificaciones
  FOR UPDATE USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "notif_borrar" ON notificaciones
  FOR DELETE USING (usuario_id = auth.uid());

-- Nadie tiene politica de INSERT a proposito: las filas solo nacen de los
-- disparadores de abajo, que corren como el dueno de la funcion.

-- El texto de un aviso no se puede reescribir: si se pudiera, alguien podria
-- cambiar lo que ya recibio para que dijera otra cosa.
CREATE OR REPLACE FUNCTION proteger_notificacion()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.usuario_id := OLD.usuario_id;
    NEW.tipo       := OLD.tipo;
    NEW.titulo     := OLD.titulo;
    NEW.detalle    := OLD.detalle;
    NEW.enlace     := OLD.enlace;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_notificacion
  BEFORE UPDATE ON notificaciones
  FOR EACH ROW EXECUTE FUNCTION proteger_notificacion();


-- ── Ayudantes ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION avisar(dest UUID, t TEXT, titulo TEXT, detalle TEXT, enlace TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Sin destinatario no hay a quien avisar: pasa con la reserva de mostrador,
  -- donde el cliente puede no tener cuenta
  IF dest IS NULL THEN RETURN; END IF;
  INSERT INTO notificaciones (usuario_id, tipo, titulo, detalle, enlace)
  VALUES (dest, t, titulo, detalle, enlace);
END;
$$;

-- Al administrador y a los empleados activos con ese permiso. Un aviso que le
-- llega a alguien que no puede resolverlo solo estorba.
CREATE OR REPLACE FUNCTION avisar_al_complejo(emp UUID, permiso TEXT, t TEXT,
                                              titulo TEXT, detalle TEXT, enlace TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO notificaciones (usuario_id, tipo, titulo, detalle, enlace)
  SELECT admin_id, t, titulo, detalle, enlace
    FROM empresas WHERE id = emp AND admin_id IS NOT NULL;

  INSERT INTO notificaciones (usuario_id, tipo, titulo, detalle, enlace)
  SELECT id, t, titulo, detalle, enlace
    FROM empleados
   WHERE empresa_id = emp AND activo AND permiso = ANY(permisos);
END;
$$;

-- 'hoy 21:00', 'mañana 21:00' o 'el 16/09 21:00'
CREATE OR REPLACE FUNCTION cuando(f DATE, h TIME)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN f = CURRENT_DATE     THEN 'hoy '
    WHEN f = CURRENT_DATE + 1 THEN 'mañana '
    ELSE 'el ' || to_char(f, 'DD/MM') || ' '
  END || to_char(h, 'HH24:MI')
$$;

-- 120.00 -> '120', 120.50 -> '120.50'. Ningun complejo cobra centavos por una
-- hora de cancha, pero si alguno los pusiera el aviso los tiene que mostrar.
-- Los decimales van con 0 y no con 9 a proposito: FM (fill mode) saca los
-- espacios de relleno, pero tambien recorta los ceros finales de un 9. Un 0
-- obliga a imprimir el digito y FM no lo puede tocar.
CREATE OR REPLACE FUNCTION plata(monto NUMERIC)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN monto IS NULL        THEN '0'
    WHEN monto = trunc(monto) THEN trunc(monto)::text
    ELSE to_char(monto, 'FM999999990.00')
  END
$$;


-- ── Quien se entera de que ──────────────────────────────────

CREATE OR REPLACE FUNCTION notificar_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  nombre_cancha TEXT;
  nombre_cliente TEXT;
BEGIN
  SELECT nombre INTO nombre_cancha FROM canchas WHERE id = NEW.cancha_id;

  -- Entra una reserva por la app: el complejo tiene que revisarla
  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' AND NEW.origen = 'app' THEN
    SELECT COALESCE(p.nombre, NEW.cliente_nombre, 'Un cliente') INTO nombre_cliente
      FROM profiles p WHERE p.id = NEW.cliente_id;

    PERFORM avisar_al_complejo(NEW.empresa_id, 'reservas_confirmar', 'reserva',
      'Nueva reserva por confirmar',
      nombre_cliente || ' pidió ' || COALESCE(nombre_cancha, 'una cancha') ||
      ' para ' || cuando(NEW.fecha, NEW.hora_inicio) ||
      ' · Bs. ' || plata(NEW.monto_total),
      '/admin/reservas');
    RETURN NEW;
  END IF;

  -- El complejo la resolvio: al cliente le importa saberlo ya
  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'confirmada' THEN
      PERFORM avisar(NEW.cliente_id, 'reserva', 'Tu reserva quedó confirmada',
        COALESCE(nombre_cancha, 'Tu cancha') || ' · ' || cuando(NEW.fecha, NEW.hora_inicio),
        '/app/perfil');
    ELSIF NEW.estado = 'rechazada' THEN
      PERFORM avisar(NEW.cliente_id, 'reserva', 'Tu reserva fue rechazada',
        COALESCE(nombre_cancha, 'La cancha') || ' · ' || cuando(NEW.fecha, NEW.hora_inicio) ||
        '. Consultá con el complejo antes de volver a pedirla.',
        '/app/perfil');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificar_reserva
  AFTER INSERT OR UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION notificar_reserva();

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

CREATE TRIGGER trg_notificar_solicitud
  AFTER INSERT OR UPDATE ON solicitudes_cancha
  FOR EACH ROW EXECUTE FUNCTION notificar_solicitud_cancha();

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
      '. Revisá el comprobante para aprobarlo.',
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
        '. Consultá con el organizador.',
        '/app/torneos/' || NEW.torneo_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificar_equipo
  AFTER INSERT OR UPDATE ON equipos
  FOR EACH ROW EXECUTE FUNCTION notificar_equipo();

CREATE OR REPLACE FUNCTION notificar_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    INSERT INTO notificaciones (usuario_id, tipo, titulo, detalle, enlace)
    SELECT id, 'empresa', 'Nueva solicitud de complejo',
           '«' || NEW.nombre || '» pide entrar a Sportika. Revisá sus datos.',
           '/superadmin/empresas'
      FROM profiles WHERE rol = 'superadmin';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'activo' THEN
      PERFORM avisar(NEW.admin_id, 'empresa', 'Tu complejo fue aprobado',
        '«' || NEW.nombre || '» ya aparece para los clientes. ' ||
        'Cargá tu QR de pago y publicá tus canchas.', '/mi-cuenta');
    ELSIF NEW.estado = 'suspendido' THEN
      PERFORM avisar(NEW.admin_id, 'empresa', 'Tu complejo fue suspendido',
        '«' || NEW.nombre || '» dejó de verse para los clientes. ' ||
        'Comunicate con Sportika.', '/admin/dashboard');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificar_empresa
  AFTER INSERT OR UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION notificar_empresa();

-- ── Comentarios ─────────────────────────────────────────────

-- Al editar solo cambia el texto. Sin esto alguien podria mover su comentario
-- a otra empresa o colgarlo de otra conversacion, y quedaria respondiendo algo
-- que nunca leyo.
CREATE OR REPLACE FUNCTION proteger_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.empresa_id      := OLD.empresa_id;
    NEW.autor_id        := OLD.autor_id;
    NEW.calificacion_id := OLD.calificacion_id;
    NEW.responde_a      := OLD.responde_a;
    NEW.created_at      := OLD.created_at;
    IF NEW.texto IS DISTINCT FROM OLD.texto THEN
      NEW.editado_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_comentario
  BEFORE UPDATE ON comentarios
  FOR EACH ROW EXECUTE FUNCTION proteger_comentario();

-- Un comentario que nadie ve no sirve de nada
CREATE OR REPLACE FUNCTION notificar_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  autor      TEXT;
  destino    UUID;
  nombre_emp TEXT;
  titulo     TEXT;
BEGIN
  SELECT nombre INTO autor      FROM profiles WHERE id = NEW.autor_id;
  SELECT nombre INTO nombre_emp FROM empresas WHERE id = NEW.empresa_id;

  IF NEW.responde_a IS NOT NULL THEN
    SELECT autor_id INTO destino FROM comentarios WHERE id = NEW.responde_a;
    titulo := COALESCE(autor, 'Alguien') || ' respondió tu comentario';

  ELSIF NEW.calificacion_id IS NOT NULL THEN
    SELECT cliente_id INTO destino FROM calificaciones WHERE id = NEW.calificacion_id;
    titulo := COALESCE(autor, 'Alguien') || ' respondió tu reseña';

  -- Comentario suelto: se entera el complejo, que es quien puede contestarlo
  ELSE
    SELECT admin_id INTO destino FROM empresas WHERE id = NEW.empresa_id;
    titulo := 'Nuevo comentario en ' || COALESCE(nombre_emp, 'tu complejo');
  END IF;

  -- Nadie se avisa a si mismo
  IF destino IS NULL OR destino = NEW.autor_id THEN
    RETURN NEW;
  END IF;

  PERFORM avisar(destino, 'comentario', titulo,
    left(btrim(NEW.texto), 90) ||
      CASE WHEN char_length(btrim(NEW.texto)) > 90 THEN '…' ELSE '' END,
    '/app/empresa/' || NEW.empresa_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificar_comentario
  AFTER INSERT ON comentarios
  FOR EACH ROW EXECUTE FUNCTION notificar_comentario();


-- ============================================================
-- PUNTOS: COMO SE GANAN Y COMO SE GASTAN
-- ============================================================
-- Los puntos se mueven SOLO desde adentro de la base. sumar_puntos esta
-- revocada para los usuarios (ver abajo): si se pudiera llamar desde el
-- navegador, cualquiera se regalaria los que quisiera. Se comprobo una vez en
-- una prueba: una empleada le sumo 50 puntos a un cliente desde la consola.

-- ── Al canjear: una sola operacion, o pasa todo o no pasa nada ──
-- Si el descuento y el canje fueran dos llamadas desde el navegador, una caida
-- entre las dos dejaria al cliente con el premio y con los puntos, o sin
-- ninguno de los dos.
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
    RAISE EXCEPTION 'Tenes que iniciar sesion para canjear';
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
    RAISE EXCEPTION 'No te alcanzan los puntos: tenes % y necesitas %',
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

-- ── Al ganarlos: lo que la pantalla de Recompensas promete ──
-- Reservar, completar la reserva, sumarse a un partido, inscribir un equipo y
-- calificar un complejo. Van con disparadores y no desde el navegador: si
-- dependiera del navegador, cualquiera pediria sus puntos sin reservar.

CREATE OR REPLACE FUNCTION puntos_por_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Las presenciales no tienen cuenta a la que acreditar
  IF NEW.cliente_id IS NULL THEN RETURN NEW; END IF;

  -- La condicion evita pagar dos veces si la reserva vuelve a pasar por
  -- 'confirmada' (por ejemplo si se rechaza y se reconfirma)
  IF NEW.estado = 'confirmada' AND OLD.estado IS DISTINCT FROM 'confirmada' THEN
    PERFORM sumar_puntos(NEW.cliente_id, 'Reserva confirmada', 5, NEW.id);
  END IF;

  -- Al presentarse el dia del partido, que lo marca el empleado
  IF NEW.asistencia = 'presente' AND OLD.asistencia IS DISTINCT FROM 'presente' THEN
    PERFORM sumar_puntos(NEW.cliente_id, 'Completo la reserva', 5, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_puntos_reserva
  AFTER UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION puntos_por_reserva();

CREATE OR REPLACE FUNCTION puntos_por_partido()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.jugador_id IS NOT NULL THEN
    PERFORM sumar_puntos(NEW.jugador_id, 'Se sumo a un partido', 10, NEW.partido_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_puntos_partido
  AFTER INSERT ON partido_jugadores
  FOR EACH ROW EXECUTE FUNCTION puntos_por_partido();

CREATE OR REPLACE FUNCTION puntos_por_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.capitan_id IS NOT NULL THEN
    PERFORM sumar_puntos(NEW.capitan_id, 'Inscribio un equipo', 15, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_puntos_equipo
  AFTER INSERT ON equipos
  FOR EACH ROW EXECUTE FUNCTION puntos_por_equipo();

-- Solo la primera vez: editar la resena no vuelve a pagar
CREATE OR REPLACE FUNCTION puntos_por_calificacion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM sumar_puntos(NEW.cliente_id, 'Califico un complejo', 5, NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_puntos_calificacion
  AFTER INSERT ON calificaciones
  FOR EACH ROW EXECUTE FUNCTION puntos_por_calificacion();

-- canjear_recompensa SI se llama desde la aplicacion, y puede quedar abierta:
-- no acepta un cliente por parametro, siempre trabaja sobre auth.uid(). El
-- que la llama solo puede gastar SUS puntos.
-- (sumar_puntos ya quedo revocada mas arriba, junto a los GRANT masivos.)
GRANT EXECUTE ON FUNCTION canjear_recompensa(UUID) TO authenticated;


-- ============================================================
-- EL CODIGO DE CANJE APLICADO DE VERDAD
-- ============================================================
--
-- El canje generaba un codigo, se mostraba y se copiaba, y despues no habia
-- donde usarlo: el cliente gastaba sus puntos en "Descuento 20% en reserva" y
-- pagaba el precio completo igual.
--
-- Poner el descuento en la pantalla no habria alcanzado. El monto tambien
-- llegaba calculado por el navegador:
--
--     monto_total: slots.length * cancha.precio
--
-- y la base lo guardaba tal cual, asi que cualquiera podia reservar por Bs. 0
-- desde las herramientas del navegador. Un descuento calculado ahi habria
-- sido un candado al lado de una puerta abierta.


-- Mira un codigo sin gastarlo. La usa la pantalla para mostrar el descuento
-- ANTES de confirmar. Devuelve el motivo cuando no sirve, para poder decirlo
-- en castellano en vez de un "codigo invalido" seco.
CREATE OR REPLACE FUNCTION revisar_codigo_canje(p_codigo TEXT, p_empresa UUID)
RETURNS TABLE (
  sirve       BOOLEAN,
  motivo      TEXT,
  recompensa  TEXT,
  tipo        TEXT,
  valor       NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_canje canjes%ROWTYPE;
  v_rec   recompensas%ROWTYPE;
BEGIN
  SELECT * INTO v_canje FROM canjes
   WHERE upper(codigo) = upper(btrim(p_codigo));

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo no existe.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Un codigo es de quien lo canjeo. No se presta ni se pasa.
  IF v_canje.cliente_id <> auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo no es tuyo.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_canje.estado <> 'disponible' THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo ya se uso.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_empresa IS NOT NULL AND v_canje.empresa_id <> p_empresa THEN
    RETURN QUERY SELECT FALSE, 'Ese codigo es de otro complejo.'::TEXT,
                        NULL::TEXT, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  SELECT * INTO v_rec FROM recompensas WHERE id = v_canje.recompensa_id;

  IF v_rec.tipo = 'fisico' THEN
    RETURN QUERY SELECT FALSE,
      'Ese canje es un premio: se retira en el complejo, no descuenta la reserva.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- El de inscripcion a torneo se presenta al organizador, no descuenta aca
  IF v_rec.tipo = 'torneo_gratis' THEN
    RETURN QUERY SELECT FALSE,
      'Ese canje es para inscribir un equipo: mostraselo al organizador del torneo.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_rec.descuento_tipo IS NULL THEN
    RETURN QUERY SELECT FALSE,
      'Esa recompensa no tiene el descuento configurado. Avisale al complejo.'::TEXT,
      v_rec.nombre, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_rec.nombre,
                      v_rec.descuento_tipo::TEXT, v_rec.descuento_valor;
END;
$fn$;

REVOKE ALL ON FUNCTION revisar_codigo_canje(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revisar_codigo_canje(TEXT, UUID) TO authenticated;


-- El precio de una reserva lo calcula la base, con el precio de la cancha, las
-- horas y el codigo de canje. El codigo se consume en la misma operacion: si
-- dos pestanas mandan el mismo, la segunda ya lo encuentra usado.
--
-- Solo para lo que pide un cliente desde la app. Las del mostrador las carga
-- el personal, que fija el precio a mano, y las de un torneo no se cobran.
CREATE OR REPLACE FUNCTION calcular_monto_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_precio    NUMERIC;
  v_empresa   UUID;
  v_horas     NUMERIC;
  v_base      NUMERIC;
  v_descuento NUMERIC := 0;
  v_canje     canjes%ROWTYPE;
  v_rec       recompensas%ROWTYPE;
BEGIN
  SELECT precio_hora, empresa_id INTO v_precio, v_empresa
    FROM canchas WHERE id = NEW.cancha_id;

  IF v_precio IS NULL THEN
    RAISE EXCEPTION 'Esa cancha ya no esta disponible';
  END IF;

  v_horas := EXTRACT(EPOCH FROM (NEW.hora_fin - NEW.hora_inicio)) / 3600.0;
  IF v_horas <= 0 THEN
    RAISE EXCEPTION 'El horario de la reserva no es valido';
  END IF;

  v_base := v_horas * v_precio;

  IF NEW.codigo_descuento IS NOT NULL AND btrim(NEW.codigo_descuento) <> '' THEN
    -- FOR UPDATE: el que llegue segundo espera y lo encuentra ya usado
    SELECT * INTO v_canje FROM canjes
     WHERE upper(codigo) = upper(btrim(NEW.codigo_descuento))
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese codigo de canje no existe';
    END IF;
    IF v_canje.cliente_id <> NEW.cliente_id THEN
      RAISE EXCEPTION 'Ese codigo de canje no es tuyo';
    END IF;
    IF v_canje.estado <> 'disponible' THEN
      RAISE EXCEPTION 'Ese codigo de canje ya se uso';
    END IF;
    IF v_canje.empresa_id <> v_empresa THEN
      RAISE EXCEPTION 'Ese codigo de canje es de otro complejo';
    END IF;

    SELECT * INTO v_rec FROM recompensas WHERE id = v_canje.recompensa_id;

    IF v_rec.tipo <> 'descuento_reserva' THEN
      RAISE EXCEPTION 'Ese canje no sirve para descontar una reserva';
    END IF;

    v_descuento := CASE v_rec.descuento_tipo
      WHEN 'porcentaje'   THEN v_base * (v_rec.descuento_valor / 100.0)
      -- No se regalan mas horas de las que se reservaron
      WHEN 'horas_gratis' THEN LEAST(v_rec.descuento_valor, v_horas) * v_precio
      ELSE 0
    END;

    IF v_descuento <= 0 THEN
      RAISE EXCEPTION 'Esa recompensa no tiene el descuento configurado';
    END IF;

    UPDATE canjes
       SET estado = 'utilizado', usado_en = 'reserva'
     WHERE id = v_canje.id;
  END IF;

  NEW.monto_total := GREATEST(0, ROUND(v_base - v_descuento, 2));
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_monto_reserva ON reservas;
CREATE TRIGGER trg_monto_reserva
  BEFORE INSERT ON reservas
  FOR EACH ROW
  WHEN (NEW.origen = 'app' AND NEW.torneo_id IS NULL AND NEW.cliente_id IS NOT NULL)
  EXECUTE FUNCTION calcular_monto_reserva();




-- ── Cuantos jugadores entran en un equipo ───────────────────
-- Lo hace cumplir la base y no solo la pantalla: si no, se inscribe un equipo
-- incompleto escribiendo directo contra la API.
CREATE OR REPLACE FUNCTION revisar_cupo_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_max    INTEGER;
  v_cuenta INTEGER;
BEGIN
  SELECT t.jugadores_max INTO v_max
    FROM equipos e JOIN torneos t ON t.id = e.torneo_id
   WHERE e.id = NEW.equipo_id;

  IF v_max IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_cuenta FROM equipo_jugadores
   WHERE equipo_id = NEW.equipo_id;

  IF v_cuenta >= v_max THEN
    RAISE EXCEPTION 'Este torneo permite hasta % jugadores por equipo', v_max;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cupo_equipo ON equipo_jugadores;
CREATE TRIGGER trg_cupo_equipo
  BEFORE INSERT ON equipo_jugadores
  FOR EACH ROW EXECUTE FUNCTION revisar_cupo_equipo();


-- ── La inscripcion cubierta con puntos ──────────────────────
-- Solo en los torneos que organiza el COMPLEJO. Cuando lo organiza un cliente,
-- la plata de las inscripciones es suya —con eso paga la cancha, el trofeo y
-- los carteles— y no tiene por que perderla por una promocion del complejo en
-- la que no participo.
CREATE OR REPLACE FUNCTION validar_codigo_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_canje   canjes%ROWTYPE;
  v_rec     recompensas%ROWTYPE;
  v_empresa UUID;
  v_creador TEXT;
BEGIN
  IF NEW.codigo_canje IS NULL OR btrim(NEW.codigo_canje) = '' THEN
    RETURN NEW;
  END IF;

  SELECT empresa_id, creador_tipo INTO v_empresa, v_creador
    FROM torneos WHERE id = NEW.torneo_id;

  IF v_creador <> 'complejo' THEN
    RAISE EXCEPTION 'Este torneo lo organiza un cliente: la inscripcion se paga directamente al organizador';
  END IF;

  SELECT * INTO v_canje FROM canjes
   WHERE upper(codigo) = upper(btrim(NEW.codigo_canje))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ese codigo de canje no existe';
  END IF;
  IF v_canje.cliente_id <> auth.uid() THEN
    RAISE EXCEPTION 'Ese codigo de canje no es tuyo';
  END IF;
  IF v_canje.estado <> 'disponible' THEN
    RAISE EXCEPTION 'Ese codigo de canje ya se uso';
  END IF;
  IF v_canje.empresa_id <> v_empresa THEN
    RAISE EXCEPTION 'Ese codigo de canje es de otro complejo';
  END IF;

  SELECT * INTO v_rec FROM recompensas WHERE id = v_canje.recompensa_id;
  IF v_rec.tipo <> 'torneo_gratis' THEN
    RAISE EXCEPTION 'Ese canje no sirve para inscribir un equipo';
  END IF;

  UPDATE canjes SET estado = 'utilizado', usado_en = 'torneo'
   WHERE id = v_canje.id;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_codigo_equipo ON equipos;
CREATE TRIGGER trg_codigo_equipo
  BEFORE INSERT ON equipos
  FOR EACH ROW EXECUTE FUNCTION validar_codigo_equipo();


-- ============================================================
-- REGLAS DE NEGOCIO QUE HACE CUMPLIR LA BASE (migraciones/033)
-- ============================================================
-- Encontradas por las pruebas de sistema por rol (pruebas/sistema): la
-- pantalla las respetaba, pero con una sesion valida se podian saltar
-- escribiendo directo contra la API.

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


-- ── 9. Las jornadas de un torneo las confirma solo el complejo ────────────
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


-- Para comprobar desde las pruebas qué migraciones tiene la base
CREATE OR REPLACE FUNCTION version_esquema()
RETURNS INTEGER
LANGUAGE sql STABLE
AS $$ SELECT 36 $$;

GRANT EXECUTE ON FUNCTION version_esquema() TO anon, authenticated;


-- Todo lo que la aplicación necesita al abrirse, en una sola petición (migraciones/035).
-- SECURITY INVOKER: se aplican las mismas políticas RLS que a las consultas sueltas.
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

grant execute on function datos_iniciales() to anon, authenticated;


-- Una reserva tiene que ser posible (migraciones/035)
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


-- ============================================================
-- migraciones/037 · Endurecer la seguridad
-- ============================================================

-- 037 · Endurecer la seguridad (resultado de la auditoría)
--
-- Cierra lo que encontró la auditoría de seguridad, sin cambiar lo que cada
-- rol puede hacer por el camino normal de la aplicación.
--
--   1. Nadie puede elegir su propio rol al registrarse.
--   2. Las funciones internas (sumar puntos, mandar avisos) ya no se pueden
--      llamar desde la API.
--   3. Un usuario no puede reactivar su cuenta suspendida ni cambiar su correo.
--   4. Un complejo nuevo siempre nace pendiente, y solo un complejo aprobado
--      da poderes de administración.
--   5. El C.I. de los jugadores deja de ser legible desde la API.
--
-- Se puede ejecutar más de una vez.

-- ── 1. El rol lo decide el servidor, no quien se registra ─────────────────
-- Antes se copiaba raw_user_meta_data->>'rol', que escribe el propio usuario
-- al registrarse: cualquiera podía crearse una cuenta de superadministrador.
--   · 'admin_empresa' se admite: es el dueño que pide sumar su complejo, y su
--     complejo nace pendiente (ver punto 4), así que no administra nada.
--   · 'empleado' solo si lo marcó el servidor en raw_app_meta_data, que el
--     usuario no puede tocar (lo pone la función «empleados»).
--   · 'superadmin' nunca desde un registro.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol public.rol_usuario := 'cliente';
begin
  if new.raw_app_meta_data->>'rol' = 'empleado' then
    v_rol := 'empleado';
  elsif new.raw_user_meta_data->>'rol' = 'admin_empresa' then
    v_rol := 'admin_empresa';
  end if;

  insert into public.profiles (id, nombre, correo, rol, avatar_url)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data->>'nombre',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ), 120),
    new.email,
    v_rol,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2. Funciones internas cerradas a la API ───────────────────────────────
-- En PostgreSQL toda función nace ejecutable por PUBLIC. Quitarle el permiso a
-- anon y authenticated no alcanza: lo siguen heredando de PUBLIC. Estas solo
-- las usan los disparadores y otras funciones de la base, que corren como su
-- dueño y no necesitan el permiso.
revoke all on function sumar_puntos(uuid, text, integer, uuid)          from public, anon, authenticated;
revoke all on function avisar(uuid, text, text, text, text)             from public, anon, authenticated;
revoke all on function avisar_al_complejo(uuid, text, text, text, text, text) from public, anon, authenticated;

-- Y para que no vuelva a pasar con las funciones que se creen de aquí en adelante
alter default privileges in schema public revoke execute on functions from public;

-- ── 3. Campos del perfil que el usuario no puede cambiarse ────────────────
-- Ya se protegían rol y puntos. Faltaban:
--   · activo: una cuenta suspendida podía reactivarse sola.
--   · correo: es el que ve el complejo; debe coincidir con el de la cuenta.
create or replace function proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = public          -- SECURITY INVOKER a propósito (ver 014)
as $$
begin
  if current_user = 'authenticated' and not es_superadmin() then
    new.puntos := old.puntos;
    new.rol    := old.rol;
    new.activo := old.activo;
    new.correo := old.correo;
  end if;
  return new;
end;
$$;

-- ── 4. Complejos: nacen pendientes y solo el aprobado administra ──────────
create or replace function complejo_nace_pendiente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and not es_superadmin() then
    new.estado   := 'pendiente';
    new.admin_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_complejo_nace_pendiente on empresas;
create trigger trg_complejo_nace_pendiente
  before insert on empresas
  for each row execute function complejo_nace_pendiente();

-- Administrar (canchas, reservas, torneos, recompensas…) exige que el
-- complejo esté aprobado. Un complejo pendiente o suspendido no da poderes.
create or replace function administra_empresa(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from empresas
                      where id = emp and admin_id = auth.uid() and estado = 'activo') $$;

create or replace function trabaja_en_empresa(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from empresas where id = emp and admin_id = auth.uid() and estado = 'activo')
      or exists (select 1 from empleados e join empresas x on x.id = e.empresa_id
                  where e.empresa_id = emp and e.id = auth.uid() and e.activo and x.estado = 'activo')
$$;

-- El dueño de un complejo pendiente sí puede cargar sus deportes al registrarse
create or replace function es_duenio_empresa(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from empresas where id = emp and admin_id = auth.uid()) $$;

drop policy if exists "deportes_admin_crear" on empresa_deportes;
drop policy if exists "deportes_admin_modificar" on empresa_deportes;
drop policy if exists "deportes_admin_borrar" on empresa_deportes;
create policy "deportes_admin_crear" on empresa_deportes
  for insert with check (es_duenio_empresa(empresa_id));
create policy "deportes_admin_modificar" on empresa_deportes
  for update using (es_duenio_empresa(empresa_id)) with check (es_duenio_empresa(empresa_id));
create policy "deportes_admin_borrar" on empresa_deportes
  for delete using (es_duenio_empresa(empresa_id));

-- ── 5. El C.I. de los jugadores no se lee desde la API ────────────────────
-- Es un dato personal y la aplicación no lo muestra en ninguna pantalla. Se
-- sigue pudiendo cargar al inscribir el equipo; leerlo solo desde la base.
-- (Con el permiso de SELECT sobre toda la tabla, quitarlo a una columna no
-- tiene efecto: hay que quitar el de la tabla y dar el de cada columna.)
revoke select on equipo_jugadores from anon, authenticated;
grant select (id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado)
  on equipo_jugadores to anon, authenticated;

-- La carga inicial pedía la fila completa: ahora pide las mismas columnas
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
    'equipo_jugadores',     (select coalesce(json_agg(x order by x.dorsal), '[]') from
                              (select id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado
                                 from equipo_jugadores) x),
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
grant execute on function datos_iniciales() to anon, authenticated;

-- Las funciones que la aplicación sí llama siguen abiertas a quien corresponde
grant execute on function version_esquema() to anon, authenticated;

create or replace function version_esquema()
returns integer
language sql stable
as $$ select 37 $$;


-- ============================================================
-- migraciones/038 · Apartar la hora mientras el cliente paga
-- (los estados 'apartada' y 'vencida' ya están en estado_reserva)
-- ============================================================

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


-- ============================================================
-- migraciones/039 · Foto de perfil, deporte favorito y escudos
-- ============================================================

-- 039 · Foto de perfil, deporte favorito y escudos de los equipos
--
-- 1. FOTO DE PERFIL. Cada persona (cliente, administrador, empleado o super
--    administrador) puede subir su foto, cambiarla o quitarla, y volver a la
--    foto de su cuenta de Google. La foto se guarda en el depósito público,
--    en avatares/<su id>/, y nadie puede escribir en la carpeta de otro.
--    En profiles.avatar_url solo se acepta una foto de su propia carpeta o
--    una foto de Google: así nadie apunta su perfil a un sitio cualquiera.
--
-- 2. DEPORTE FAVORITO. El cliente lo elige en Mi Perfil y la aplicación le
--    muestra primero lo de ese deporte. Solo se aceptan los deportes del
--    sistema.
--
-- 3. ESCUDOS. Lo encontró la revisión de este cambio: el capitán no podía
--    subir el escudo de su equipo, porque solo el dueño del complejo podía
--    escribir en el depósito público. Ahora quien inscribe un equipo puede
--    subir su escudo mientras el torneo recibe inscripciones, y solo quien
--    lo subió (o el organizador) puede reemplazarlo o borrarlo.
--
-- 4. Los comentarios muestran la foto de quien escribe: la vista pública de
--    perfiles suma la foto (nombre y foto, nada más).
--
-- Se puede ejecutar más de una vez.


-- ── 1 y 2. Lo que se acepta en el perfil ──────────────────────────────────
alter table profiles drop constraint if exists perfil_foto_valida;
alter table profiles add constraint perfil_foto_valida check (
  avatar_url is null
  or avatar_url like 'avatares/' || id::text || '/%'
  or avatar_url ~ '^https://[a-z0-9.-]+\.googleusercontent\.com/'
);

alter table profiles drop constraint if exists perfil_deporte_valido;
alter table profiles add constraint perfil_deporte_valido check (
  deporte_fav is null
  or deporte_fav in ('Fútbol', 'Wally', 'Básquetbol', 'Voleibol', 'Pádel', 'Tenis')
);


-- ── 1 y 3. Quién puede escribir en el depósito público ────────────────────
--   <empresa_id>/<archivo>            -> el dueño del complejo
--   torneos/<torneo_id>/<archivo>     -> quien organiza el torneo o su complejo
--   equipos/<torneo_id>/<archivo>     -> quien inscribe un equipo, con el torneo abierto
--   avatares/<usuario_id>/<archivo>   -> esa misma persona
create or replace function public.puede_escribir_publico(ruta text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select es_superadmin()
      or case (storage.foldername(ruta))[1]
           when 'torneos' then
             organiza_torneo(uuid_seguro((storage.foldername(ruta))[2]))
             or trabaja_en_empresa(empresa_del_torneo(uuid_seguro((storage.foldername(ruta))[2])))
           when 'equipos' then
             exists (select 1 from torneos t
                      where t.id = uuid_seguro((storage.foldername(ruta))[2])
                        and t.estado = 'inscripciones')
           when 'avatares' then
             (storage.foldername(ruta))[2] = auth.uid()::text
           else
             administra_empresa(uuid_seguro((storage.foldername(ruta))[1]))
         end
$$;

-- Reemplazar o borrar: lo mismo, pero el escudo de un equipo solo lo toca
-- quien lo subió o quien organiza el torneo. Si no, cualquiera que viera la
-- dirección del escudo de otro equipo podría borrarlo.
create or replace function public.puede_cambiar_publico(ruta text, duenio text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case (storage.foldername(ruta))[1]
           when 'equipos' then
             es_superadmin()
             or duenio = auth.uid()::text
             or organiza_torneo(uuid_seguro((storage.foldername(ruta))[2]))
           else puede_escribir_publico(ruta)
         end
$$;

revoke all on function public.puede_escribir_publico(text) from public, anon;
grant execute on function public.puede_escribir_publico(text) to authenticated;
revoke all on function public.puede_cambiar_publico(text, text) from public, anon;
grant execute on function public.puede_cambiar_publico(text, text) to authenticated;

drop policy if exists "publico_reemplazar" on storage.objects;
create policy "publico_reemplazar" on storage.objects
  for update to authenticated
  using      (bucket_id = 'publico' and puede_cambiar_publico(name, owner_id))
  with check (bucket_id = 'publico' and puede_cambiar_publico(name, owner_id));

drop policy if exists "publico_borrar" on storage.objects;
create policy "publico_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'publico' and puede_cambiar_publico(name, owner_id));


-- ── 4. La foto en la vista pública de perfiles ────────────────────────────
create or replace view perfiles_publicos
  with (security_invoker = false) as
  select id, nombre, avatar_url from profiles;

grant select on perfiles_publicos to anon, authenticated;

-- La carga inicial pide nombre y foto de cada perfil (antes solo el nombre)
create or replace function datos_iniciales()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'perfiles',             (select coalesce(json_agg(x), '[]') from (select id, nombre, avatar_url from perfiles_publicos) x),
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
    'equipo_jugadores',     (select coalesce(json_agg(x order by x.dorsal), '[]') from
                              (select id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado
                                 from equipo_jugadores) x),
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
grant execute on function datos_iniciales() to anon, authenticated;


-- ── Versión del esquema, para las pruebas ─────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 39 $$;
grant execute on function version_esquema() to anon, authenticated;


-- ============================================================
-- migraciones/040 · Lo que la base guardaba y nadie veía
-- ============================================================

-- 040 · Lo que la base guardaba y nadie veía
--
-- Salió de revisar la base columna por columna, mirando qué muestra o usa
-- la aplicación y qué no.
--
-- 1. EL C.I. DE LOS JUGADORES. Se pedía al inscribir un equipo, pero nadie lo
--    podía leer (la 037 lo cerró por ser un dato personal) y ninguna pantalla
--    lo usa. Si no se usa, no se pide: la aplicación deja de pedirlo. Esta
--    migración no borra nada; lo que ya estaba guardado lo borra la 041.
--
-- 2. SOLICITUDES_EMPRESA. Era la tabla donde caía el formulario «Registrar mi
--    complejo». Desde la 015 la solicitud se crea directamente en empresas,
--    pendiente de aprobación, y esta tabla quedó sin uso. Además, cualquiera,
--    incluso sin cuenta, podía escribir en ella: eso se cierra. La tabla y lo
--    que tiene no se tocan.
--
-- 3. EL TELÉFONO DE LOS EMPLEADOS. El administrador lo escribe al crear la
--    cuenta, pero después no lo podía ver, porque el perfil del empleado solo
--    lo lee el propio empleado. Ahora el dueño del complejo ve el teléfono de
--    sus empleados, y nada más de su perfil.
--
-- 4. LA HORA DE LOS PARTIDOS ESPONTÁNEOS. Se guardaba como texto («Ahora
--    mismo», «En 1 hora») y ese texto no cambiaba nunca: días después el
--    partido seguía diciendo «Ahora». La fecha y hora real va en fecha_hora,
--    que estaba vacía; la aplicación deja de escribir y leer el texto (la 041
--    lo borra). No se acepta una hora que ya pasó, ni sumarse a un partido
--    que empezó hace más de una hora.
--
-- 5. QUIÉN ENTREGÓ UN CANJE Y QUIÉN RESOLVIÓ UNA SOLICITUD DE CANCHA, Y
--    CUÁNDO. Se guardaba con la hora del navegador. Ahora lo pone la base:
--    la cuenta de quien lo hace y la hora del servidor. El administrador lo
--    ve en sus pantallas.
--
-- Se puede ejecutar más de una vez.


-- ── 1. El C.I. de los jugadores ───────────────────────────────────────────
-- Nada que hacer en la base: el formulario ya no lo pide y nadie lo lee.


-- ── 2. La tabla vieja de solicitudes de complejo ─────────────────────────
-- Nadie más puede escribir en ella. Solo el super administrador la puede leer.
do $$
begin
  if to_regclass('public.solicitudes_empresa') is not null then
    drop policy if exists "crear_solicitud" on solicitudes_empresa;
  end if;
end $$;


-- ── 3. El teléfono de los empleados, para su administrador ───────────────
-- Una función y no una política sobre profiles: así el administrador recibe
-- solo el teléfono, no el perfil entero de su empleado.
create or replace function telefonos_de_mis_empleados()
returns table (id uuid, telefono text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.telefono
    from empleados e
    join profiles p on p.id = e.id
   where administra_empresa(e.empresa_id)
$$;
revoke execute on function telefonos_de_mis_empleados() from public, anon;
grant execute on function telefonos_de_mis_empleados() to authenticated;


-- ── 4. La hora real de los partidos espontáneos ──────────────────────────
-- Los partidos que ya existen: la hora se deduce del texto y de cuándo se
-- creó (hora de Bolivia).
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'partidos_espontaneos'
                and column_name = 'cuando') then
    execute $q$
      update partidos_espontaneos set fecha_hora = case
        when cuando ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
          then cuando::timestamp at time zone 'America/La_Paz'
        when cuando ~ '^Mañana \d{2}:\d{2}$'
          then ((created_at at time zone 'America/La_Paz')::date + 1
                + substring(cuando from '\d{2}:\d{2}')::time) at time zone 'America/La_Paz'
        when cuando = 'En 30 min' then created_at + interval '30 minutes'
        when cuando = 'En 1 hora' then created_at + interval '1 hour'
        else created_at
      end
      where fecha_hora is null
    $q$;
  end if;
end $$;

alter table partidos_espontaneos alter column fecha_hora set default now();
alter table partidos_espontaneos alter column fecha_hora set not null;
-- El texto ya no se escribe: deja de ser obligatorio
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'partidos_espontaneos'
                and column_name = 'cuando') then
    alter table partidos_espontaneos alter column cuando drop not null;
  end if;
end $$;

-- No se organiza un partido para una hora que ya pasó (con un margen por
-- si el reloj del teléfono va un poco atrasado). Se revisa al crearlo: si
-- después quien lo organizó lo cambia, solo afecta a su propio partido.
create or replace function revisar_hora_partido()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.fecha_hora < now() - interval '15 minutes' then
    raise exception 'Esa hora ya pasó. Elige una hora que todavía no llegó.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hora_partido on partidos_espontaneos;
create trigger trg_hora_partido before insert on partidos_espontaneos
  for each row execute function revisar_hora_partido();

-- Ni nadie se suma a un partido que empezó hace más de una hora: para la
-- aplicación ese partido ya se jugó y no aparece en las listas
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

  if v_partido.fecha_hora < now() - interval '1 hour' then
    raise exception 'Ese partido ya se jugó';
  end if;

  select count(*) into v_unidos from partido_jugadores where partido_id = new.partido_id;
  if v_unidos >= v_partido.max_jugadores then
    raise exception 'El partido ya está completo (% jugadores)', v_partido.max_jugadores;
  end if;

  return new;
end;
$$;


-- ── 5. Quién y cuándo, puesto por la base ────────────────────────────────
create or replace function sellar_entrega_canje()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    new.entregado_por := coalesce(auth.uid(), new.entregado_por);
    new.entregado_at  := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sellar_entrega on canjes;
create trigger trg_sellar_entrega before update on canjes
  for each row execute function sellar_entrega_canje();

create or replace function sellar_resolucion_solicitud()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.estado = 'pendiente' then
    new.resuelta_por := null;
    new.resuelta_at  := null;
  elsif tg_op = 'INSERT' or old.estado is distinct from new.estado then
    new.resuelta_por := coalesce(auth.uid(), new.resuelta_por);
    new.resuelta_at  := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sellar_resolucion on solicitudes_cancha;
create trigger trg_sellar_resolucion before insert or update on solicitudes_cancha
  for each row execute function sellar_resolucion_solicitud();


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 40 $$;
grant execute on function version_esquema() to anon, authenticated;


-- ============================================================
-- migraciones/041 · Borrar lo que la aplicación ya no usa
-- ============================================================

-- 041 · Borrar lo que la aplicación ya no usa
--
-- Va DESPUÉS de la 040 y borra para siempre (no se puede deshacer):
--
-- 1. El C.I. de los jugadores (equipo_jugadores.ci), con los carnets que ya
--    se habían guardado. La aplicación dejó de pedirlo en la 040: nadie lo
--    usaba y es un dato personal. Lo que no hace falta, no se guarda.
--
-- 2. El texto de la hora de los partidos espontáneos (partidos_espontaneos.
--    cuando: «Ahora mismo», «En 1 hora»). La 040 pasó la hora real de cada
--    partido a fecha_hora; el texto ya no se escribe ni se lee.
--
-- Se puede ejecutar más de una vez.


-- ── 1. El C.I. de los jugadores ───────────────────────────────────────────
alter table equipo_jugadores drop column if exists ci;


-- ── 2. El texto de la hora de los partidos ───────────────────────────────
-- Solo si la 040 ya dejó la hora real en todos los partidos
do $$
begin
  if exists (select 1 from partidos_espontaneos where fecha_hora is null) then
    raise exception 'Primero corre la migración 040: hay partidos sin su fecha y hora.';
  end if;
end $$;

alter table partidos_espontaneos drop column if exists cuando;


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 41 $$;
grant execute on function version_esquema() to anon, authenticated;


-- ============================================================
-- migraciones/042 · Borrar la tabla vieja de solicitudes de complejo
-- ============================================================

-- 042 · Borrar la tabla vieja de solicitudes de complejo
--
-- solicitudes_empresa era la tabla donde caía el formulario «Registrar mi
-- complejo». Desde la 015 la solicitud se crea directamente en empresas, con
-- estado 'pendiente', y el super administrador la aprueba ahí. Esta tabla
-- quedó sin uso: la aplicación no la lee ni la escribe (la 040 ya le había
-- cerrado la escritura).
--
-- Antes de borrarla se comprueba que cada solicitud que tiene ya esté en
-- empresas, con el mismo dueño. Si falta alguna, no se borra nada.
--
-- Borra para siempre (no se puede deshacer). Se puede ejecutar más de una vez.


do $$
begin
  if to_regclass('public.solicitudes_empresa') is not null then
    if exists (
      select 1 from solicitudes_empresa s
       where not exists (select 1 from profiles p
                           join empresas e on e.admin_id = p.id
                          where p.correo = s.admin_correo)
    ) then
      raise exception 'Hay solicitudes de complejo que no están en empresas. Revísalas antes de borrar la tabla.';
    end if;
    drop table solicitudes_empresa;
  end if;
end $$;


-- ── Versión ──────────────────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 42 $$;
grant execute on function version_esquema() to anon, authenticated;


-- ============================================================
-- migraciones/043 · La fecha límite de inscripción se respeta, y la base habla de «tú»
-- ============================================================

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

-- ============================================================
-- migraciones/044 · Las recompensas respetan su stock, y el historial de puntos lleva tildes
-- ============================================================

-- 044 · Las recompensas respetan su stock, y el historial de puntos lleva tildes
--
-- Lo encontraron las pruebas de usabilidad (SUS):
--
-- 1. La base nunca miraba el stock de una recompensa. Con 5 de stock se podían
--    hacer 6, 10 o 50 canjes, y la ficha del complejo seguía diciendo
--    "5 disponibles". Ahora el stock es lo que el complejo ofreció en total:
--    cada canje se lleva una, y cuando ya no quedan la base responde
--    "Esa recompensa se agotó". La recompensa se bloquea mientras se canjea,
--    para que dos clientes no se lleven la última al mismo tiempo.
--
-- 2. Los movimientos del historial de puntos se guardaban sin tilde
--    ("Inscribio un equipo", "Se anulo una reserva"). Se corrigen las
--    funciones que los escriben, que quedan iguales en todo lo demás, y los
--    textos de los movimientos que ya estaban guardados.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. El canje respeta el stock ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION canjear_recompensa(p_recompensa UUID)
RETURNS canjes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cliente    UUID := auth.uid();
  v_saldo      INTEGER;
  v_recompensa recompensas%ROWTYPE;
  v_canjeados  INTEGER;
  v_canje      canjes%ROWTYPE;
  v_codigo     TEXT;
BEGIN
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'Tienes que iniciar sesión para canjear';
  END IF;

  -- El bloqueo evita que dos clientes se lleven la última al mismo tiempo
  SELECT * INTO v_recompensa FROM recompensas WHERE id = p_recompensa FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa recompensa ya no existe';
  END IF;
  IF NOT v_recompensa.activa THEN
    RAISE EXCEPTION 'Esa recompensa ya no está disponible';
  END IF;

  -- El stock es lo que el complejo ofreció en total; cada canje se lleva una
  SELECT count(*) INTO v_canjeados FROM canjes WHERE recompensa_id = p_recompensa;
  IF v_canjeados >= v_recompensa.stock THEN
    RAISE EXCEPTION 'Esa recompensa se agotó';
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


-- ── 2. Los textos del historial de puntos, con tildes ─────────────────────────
-- puntos_por_reserva: «Completo la reserva» → «Completó la reserva»
CREATE OR REPLACE FUNCTION puntos_por_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Las presenciales no tienen cuenta a la que acreditar
  IF NEW.cliente_id IS NULL THEN RETURN NEW; END IF;

  -- La condicion evita pagar dos veces si la reserva vuelve a pasar por
  -- 'confirmada' (por ejemplo si se rechaza y se reconfirma)
  IF NEW.estado = 'confirmada' AND OLD.estado IS DISTINCT FROM 'confirmada' THEN
    PERFORM sumar_puntos(NEW.cliente_id, 'Reserva confirmada', 5, NEW.id);
  END IF;

  -- Al presentarse el dia del partido, que lo marca el empleado
  IF NEW.asistencia = 'presente' AND OLD.asistencia IS DISTINCT FROM 'presente' THEN
    PERFORM sumar_puntos(NEW.cliente_id, 'Completó la reserva', 5, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- puntos_por_partido: «Se sumo a un partido» → «Se sumó a un partido»
CREATE OR REPLACE FUNCTION puntos_por_partido()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.jugador_id IS NOT NULL THEN
    PERFORM sumar_puntos(NEW.jugador_id, 'Se sumó a un partido', 10, NEW.partido_id);
  END IF;
  RETURN NEW;
END;
$$;

-- puntos_por_equipo: «Inscribio un equipo» → «Inscribió un equipo»
CREATE OR REPLACE FUNCTION puntos_por_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.capitan_id IS NOT NULL THEN
    PERFORM sumar_puntos(NEW.capitan_id, 'Inscribió un equipo', 15, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- puntos_por_calificacion: «Califico un complejo» → «Calificó un complejo»
CREATE OR REPLACE FUNCTION puntos_por_calificacion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM sumar_puntos(NEW.cliente_id, 'Calificó un complejo', 5, NEW.id);
  RETURN NEW;
END;
$$;

-- devolver_puntos: «Salio de un partido» → «Salió de un partido», «Se anulo una reserva» → «Se anuló una reserva»
create or replace function devolver_puntos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_table_name = 'partido_jugadores' then
    if old.jugador_id is not null
       and exists (select 1 from profiles where id = old.jugador_id) then
      perform sumar_puntos(old.jugador_id, 'Salió de un partido', -10, old.partido_id);
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
        perform sumar_puntos(old.cliente_id, 'Se anuló una reserva', -5, old.id);
      end if;
      if old.asistencia = 'presente' then
        perform sumar_puntos(old.cliente_id, 'Se anuló una reserva completada', -5, old.id);
      end if;
    end if;
  end if;

  return old;
end;
$$;

-- Los movimientos que ya estaban guardados
update puntos_historial set concepto = replace(concepto, 'Califico un complejo', 'Calificó un complejo') where concepto like 'Califico un complejo%';
update puntos_historial set concepto = replace(concepto, 'Completo la reserva', 'Completó la reserva') where concepto like 'Completo la reserva%';
update puntos_historial set concepto = replace(concepto, 'Inscribio un equipo', 'Inscribió un equipo') where concepto like 'Inscribio un equipo%';
update puntos_historial set concepto = replace(concepto, 'Salio de un partido', 'Salió de un partido') where concepto like 'Salio de un partido%';
update puntos_historial set concepto = replace(concepto, 'Se anulo una reserva', 'Se anuló una reserva') where concepto like 'Se anulo una reserva%';
update puntos_historial set concepto = replace(concepto, 'Se sumo a un partido', 'Se sumó a un partido') where concepto like 'Se sumo a un partido%';


-- ── 3. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 44 $$;
grant execute on function version_esquema() to anon, authenticated;

-- ============================================================
-- migraciones/045 · Un capitán inscribe un solo equipo por torneo
-- ============================================================

-- 045 · Un capitán inscribe un solo equipo por torneo
--
-- Lo encontraron las pruebas de usabilidad: después de inscribir su equipo,
-- el cliente no lo veía en ninguna parte y el torneo le seguía ofreciendo
-- «Inscribir mi equipo». Si lo volvía a tocar, quedaban dos equipos suyos en
-- el mismo torneo. La pantalla ya no lo ofrece; esto lo asegura en la base,
-- también si el formulario se envía dos veces a la vez.
--
-- Un equipo rechazado no cuenta: el capitán puede corregir lo que faltaba y
-- volver a inscribirse.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. Un equipo vigente por capitán y torneo ───────────────────────────────
create or replace function un_equipo_por_capitan()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.capitan_id is null then
    return new;
  end if;

  -- Dos envíos a la vez no pasan los dos: el segundo espera a que termine el
  -- primero y ya lo encuentra
  perform pg_advisory_xact_lock(hashtext('inscripcion ' || new.torneo_id::text || ' ' || new.capitan_id::text));

  if exists (select 1 from equipos
              where torneo_id = new.torneo_id
                and capitan_id = new.capitan_id
                and estado <> 'rechazado'
                and id <> new.id) then
    raise exception 'Ya inscribiste un equipo en este torneo';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_un_equipo_por_capitan on equipos;
create trigger trg_un_equipo_por_capitan before insert on equipos
  for each row execute function un_equipo_por_capitan();


-- ── 2. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 45 $$;
grant execute on function version_esquema() to anon, authenticated;

-- ============================================================
-- migraciones/046 · Lo que encontró la tercera ronda de pruebas de usabilidad
-- ============================================================

-- 046 · Lo que encontró la tercera ronda de pruebas de usabilidad
--
-- 1. El teléfono del capitán ya no es público. Estaba en la tabla de equipos,
--    que cualquiera puede leer (hace falta para mostrar los torneos), y se
--    podía consultar sin iniciar sesión. Pasa a su propia tabla, que leen
--    solo el capitán, quien organiza el torneo y el complejo.
-- 2. El stock de una recompensa lo cuenta la base. Un cliente solo puede leer
--    sus propios canjes: contándolos en la pantalla, a Juan le quedaban 39
--    botellas cuando en realidad quedaban 36.
-- 3. Un entrenamiento que ocupa una cancha tiene que caber en el horario del
--    complejo y no puede pisar reservas; una reserva tampoco puede caer
--    encima de un entrenamiento. Se publicó uno de 11:00 a 23:00 encima de
--    una reserva pagada, en un complejo que cierra a las 22:00.
-- 4. Una cancha con reservas desde hoy no se puede desactivar.
-- 5. Las notificaciones dicen la fecha real («para el vie 30/10 a las
--    11:00»). Antes decían «hoy» calculado en hora de Londres: un pedido de
--    las 21:45 para el día siguiente decía «para hoy», y al otro día la
--    palabra ya no era verdad. Los montos van con coma: «Bs. 79,20».
-- 6. Un torneo que termina antes de lo previsto libera la cancha y su fecha de
--    fin pasa a ser la real. La Copa Cochabamba seguía ocupando la cancha
--    seis jornadas después de jugar la final.
-- 7. Arreglos de datos: estados de torneos que no cuadraban con sus fechas,
--    «uan reserva», la respuesta «¡Gracias Pedro!» que era para Luisa y los
--    textos viejos de las notificaciones («Revisá», «para hoy»).
--
-- No borra nada: el teléfono se copia antes de quitarlo de la tabla pública,
-- y las jornadas que ya no se juegan quedan como «cancelada».
-- Se puede ejecutar más de una vez.


-- ── 1. El teléfono del capitán, aparte ──────────────────────────────────────
create table if not exists equipo_contactos (
  -- Diferida: el contacto se anota antes de que exista la fila del equipo,
  -- dentro de la misma operación (ver guardar_telefono_aparte)
  equipo_id uuid primary key references equipos(id) on delete cascade
            deferrable initially deferred,
  telefono  text not null
);

alter table equipo_contactos enable row level security;
revoke all on equipo_contactos from anon;
grant select on equipo_contactos to authenticated;

drop policy if exists "contacto_del_equipo" on equipo_contactos;
create policy "contacto_del_equipo" on equipo_contactos
  for select using (exists (
    select 1 from equipos e
     where e.id = equipo_contactos.equipo_id
       and (e.capitan_id = auth.uid()
            or organiza_torneo(e.torneo_id)
            or trabaja_en_empresa(empresa_del_torneo(e.torneo_id))
            or es_superadmin())));

-- La aplicación sigue mandando el teléfono con el equipo (también la versión
-- que alguien tenga guardada en el teléfono): aquí se pasa a la tabla privada
-- y no queda en la pública.
create or replace function guardar_telefono_aparte()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.capitan_telefono is not null and btrim(new.capitan_telefono) <> '' then
    insert into equipo_contactos (equipo_id, telefono)
    values (new.id, btrim(new.capitan_telefono))
    on conflict (equipo_id) do update set telefono = excluded.telefono;
  end if;
  new.capitan_telefono := null;
  return new;
end;
$$;

-- Con «z» para que corra después de las demás revisiones de la inscripción
drop trigger if exists trg_z_telefono_aparte on equipos;
create trigger trg_z_telefono_aparte
  before insert or update of capitan_telefono on equipos
  for each row when (new.capitan_telefono is not null)
  execute function guardar_telefono_aparte();

-- Los teléfonos que ya estaban: se copian y recién después se quitan.
-- Las demás reglas de equipos no se disparan: solo se vacía una columna.
insert into equipo_contactos (equipo_id, telefono)
select id, btrim(capitan_telefono) from equipos
 where capitan_telefono is not null and btrim(capitan_telefono) <> ''
on conflict (equipo_id) do update set telefono = excluded.telefono;

alter table equipos disable trigger user;
update equipos set capitan_telefono = null where capitan_telefono is not null;
alter table equipos enable trigger user;


-- ── 2. Los canjes de cada recompensa los cuenta la base ─────────────────────
alter table recompensas add column if not exists canjeados integer not null default 0;

drop trigger if exists trg_proteger_canjeados on recompensas;
update recompensas r
   set canjeados = (select count(*) from canjes c where c.recompensa_id = r.id);

create or replace function contar_canjes()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update recompensas set canjeados = canjeados + 1 where id = new.recompensa_id;
  else
    update recompensas set canjeados = greatest(canjeados - 1, 0) where id = old.recompensa_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_contar_canjes on canjes;
create trigger trg_contar_canjes after insert or delete on canjes
  for each row execute function contar_canjes();

-- Nadie lo cambia a mano: solo el conteo de arriba
create or replace function proteger_canjeados()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if pg_trigger_depth() <= 1 then
    new.canjeados := old.canjeados;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_canjeados before update of canjeados on recompensas
  for each row execute function proteger_canjeados();


-- ── 3. Entrenamientos y reservas no se pisan ────────────────────────────────
-- 'Mie' → miércoles. Los días se guardan sin tilde, como los manda la aplicación.
create or replace function dia_corto(f date)
returns text
language sql immutable
as $$ select (array['Dom','Lun','Mar','Mie','Jue','Vie','Sab'])[extract(dow from f)::int + 1] $$;

create or replace function revisar_horario_entrenamiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa empresas%rowtype;
  v_choque  record;
  v_hoy     date := (now() at time zone 'America/La_Paz')::date;
begin
  -- Los datos iniciales se cargan desde el editor SQL, sin sesión
  if auth.uid() is null then
    return new;
  end if;

  -- Una edición que no toca el horario ni la cancha no se vuelve a revisar
  if tg_op = 'UPDATE'
     and new.cancha_id is not distinct from old.cancha_id
     and new.dias = old.dias
     and new.hora_inicio = old.hora_inicio and new.hora_fin = old.hora_fin
     and new.activo = old.activo then
    return new;
  end if;

  if new.hora_fin <= new.hora_inicio then
    raise exception 'La hora de fin tiene que ser posterior a la de inicio';
  end if;

  select * into v_empresa from empresas where id = new.empresa_id;
  if v_empresa.horario_inicio is not null and v_empresa.horario_fin is not null
     and (new.hora_inicio < v_empresa.horario_inicio
          or (v_empresa.horario_fin <> '00:00' and new.hora_fin > v_empresa.horario_fin)) then
    raise exception 'El complejo atiende de % a %', to_char(v_empresa.horario_inicio, 'HH24:MI'),
      to_char(v_empresa.horario_fin, 'HH24:MI');
  end if;

  if new.cancha_id is null or not new.activo then
    return new;
  end if;

  select r.nro, r.fecha, r.hora_inicio into v_choque
    from reservas r
   where r.cancha_id = new.cancha_id
     and r.fecha >= v_hoy
     and (r.estado in ('pendiente', 'confirmada') or (r.estado = 'apartada' and r.aparta_hasta > now()))
     and dia_corto(r.fecha) = any(new.dias)
     and r.hora_inicio < new.hora_fin and r.hora_fin > new.hora_inicio
   order by r.fecha, r.hora_inicio
   limit 1;
  if found then
    raise exception 'Ese horario choca con la reserva % del % a las %. Elige otra cancha u otro horario.',
      coalesce(v_choque.nro, 'de un torneo'), to_char(v_choque.fecha, 'DD/MM'), to_char(v_choque.hora_inicio, 'HH24:MI');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_horario_entrenamiento on entrenamientos;
create trigger trg_horario_entrenamiento before insert or update on entrenamientos
  for each row execute function revisar_horario_entrenamiento();

create or replace function reserva_no_pisa_entrenamiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ent record;
begin
  if auth.uid() is null then
    return new;
  end if;

  select e.nombre, e.hora_inicio, e.hora_fin into v_ent
    from entrenamientos e
   where e.cancha_id = new.cancha_id
     and e.activo
     and dia_corto(new.fecha) = any(e.dias)
     and e.hora_inicio < new.hora_fin and e.hora_fin > new.hora_inicio
   limit 1;
  if found then
    raise exception 'A esa hora la cancha está ocupada por el entrenamiento «%» (de % a %). Elige otro horario.',
      v_ent.nombre, to_char(v_ent.hora_inicio, 'HH24:MI'), to_char(v_ent.hora_fin, 'HH24:MI');
  end if;

  return new;
end;
$$;

-- Solo las de clientes y de mostrador: las jornadas de un torneo las aprueba el complejo
drop trigger if exists trg_d_no_pisa_entrenamiento on reservas;
create trigger trg_d_no_pisa_entrenamiento
  before insert or update of fecha, hora_inicio, hora_fin, cancha_id on reservas
  for each row when (new.torneo_id is null)
  execute function reserva_no_pisa_entrenamiento();


-- ── 4. Una cancha con reservas no se desactiva ──────────────────────────────
create or replace function cancha_sin_reservas_al_desactivar()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_hoy      date := (now() at time zone 'America/La_Paz')::date;
  v_cuantas  integer;
  v_proxima  record;
begin
  if auth.uid() is null or not old.activa or new.activa then
    return new;
  end if;

  select count(*) into v_cuantas
    from reservas
   where cancha_id = new.id and fecha >= v_hoy
     and (estado in ('pendiente', 'confirmada') or (estado = 'apartada' and aparta_hasta > now()));

  if v_cuantas > 0 then
    select nro, fecha, hora_inicio into v_proxima
      from reservas
     where cancha_id = new.id and fecha >= v_hoy and estado in ('pendiente', 'confirmada', 'apartada')
     order by fecha, hora_inicio limit 1;
    raise exception 'Esa cancha tiene % reserva(s) desde hoy, la próxima % el % a las %. Resuélvelas antes de desactivarla.',
      v_cuantas, coalesce(v_proxima.nro, 'de un torneo'), to_char(v_proxima.fecha, 'DD/MM'),
      to_char(v_proxima.hora_inicio, 'HH24:MI');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cancha_sin_reservas on canchas;
create trigger trg_cancha_sin_reservas before update of activa on canchas
  for each row execute function cancha_sin_reservas_al_desactivar();


-- ── 5. La fecha real en las notificaciones, y los montos con coma ───────────
-- 'el vie 30/10 a las 11:00'. Ya no depende de qué día es hoy, así que tampoco
-- de la zona horaria de la base, y sigue siendo cierto al día siguiente.
create or replace function cuando(f date, h time)
returns text
language sql immutable
as $$
  select 'el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from f)::int + 1]
         || ' ' || to_char(f, 'DD/MM') || ' a las ' || to_char(h, 'HH24:MI')
$$;

-- 120 → '120', 1200 → '1.200', 79.2 → '79,20'
create or replace function plata(monto numeric)
returns text
language sql immutable
as $$
  select case
    when monto is null        then '0'
    when monto = trunc(monto) then translate(to_char(trunc(monto), 'FM999,999,990'), ',', '.')
    else translate(to_char(monto, 'FM999,999,990.00'), ',.', '.,')
  end
$$;


-- ── 6. Un torneo terminado libera la cancha ─────────────────────────────────
create or replace function al_terminar_torneo()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/La_Paz')::date;
begin
  if new.estado = 'finalizado' and old.estado is distinct from 'finalizado' then
    -- Terminó antes de lo previsto: la fecha de fin es la de hoy
    if new.fecha_fin is null or new.fecha_fin > v_hoy then
      new.fecha_fin := greatest(coalesce(new.fecha_inicio, v_hoy), v_hoy);
    end if;
    -- Y las jornadas que quedaban dejan de ocupar la cancha
    update reservas set estado = 'cancelada'
     where torneo_id = new.id and origen = 'torneo' and fecha > v_hoy
       and estado in ('pendiente', 'confirmada');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_al_terminar_torneo on torneos;
create trigger trg_al_terminar_torneo before update of estado on torneos
  for each row execute function al_terminar_torneo();


-- ── 7. Arreglos de datos ────────────────────────────────────────────────────
-- Torneos en curso cuya última fecha pasó y que ya jugaron todos sus partidos:
-- se dan por terminados (la Copa Interna seguía «En curso» desde septiembre)
update torneos t set estado = 'finalizado'
 where t.estado = 'en_curso'
   and t.fecha_fin < (now() at time zone 'America/La_Paz')::date
   and exists (select 1 from partidos_torneo p where p.torneo_id = t.id)
   and not exists (select 1 from partidos_torneo p where p.torneo_id = t.id and p.estado <> 'finalizado');

-- Torneos ya terminados que seguían ocupando la cancha (la Copa Cochabamba)
update reservas r set estado = 'cancelada'
  from torneos t
 where r.torneo_id = t.id and t.estado = 'finalizado' and r.origen = 'torneo'
   and r.fecha > (now() at time zone 'America/La_Paz')::date
   and r.estado in ('pendiente', 'confirmada');

update torneos t
   set fecha_fin = greatest(t.fecha_inicio, coalesce(
         (select max(r.fecha) from reservas r
           where r.torneo_id = t.id and r.origen = 'torneo' and r.estado <> 'cancelada'
             and r.fecha <= (now() at time zone 'America/La_Paz')::date),
         (now() at time zone 'America/La_Paz')::date))
 where t.estado = 'finalizado'
   and t.fecha_fin > (now() at time zone 'America/La_Paz')::date;

-- «Descuento en uan reserva de alguna cancha para cualquier momento »
update recompensas
   set descripcion = btrim(replace(descripcion, 'uan reserva', 'una reserva'))
 where descripcion like '%uan reserva%';

-- La respuesta del complejo a Luisa Rocha la llamaba Pedro, que es el administrador
update comentarios c
   set texto = replace(c.texto, '¡Gracias Pedro!', '¡Gracias ' || split_part(p.nombre, ' ', 1) || '!')
  from comentarios original
  join profiles p on p.id = original.autor_id
 where c.responde_a = original.id
   and c.texto like '¡Gracias Pedro!%'
   and p.nombre not like 'Pedro%';

-- Los textos viejos de las notificaciones, como los de ahora
update notificaciones set detalle = replace(detalle, 'Revisá', 'Revisa') where detalle like '%Revisá%';
update notificaciones set detalle = replace(detalle, 'Comunicate', 'Comunícate') where detalle like '%Comunicate%';

-- «para hoy 11:00» → «para el vie 30/10 a las 11:00». «Hoy» era el día en que
-- se escribió el aviso, contado en UTC como lo hacía la función vieja.
update notificaciones n
   set detalle = regexp_replace(n.detalle, '(para |· )hoy (\d\d:\d\d)',
         '\1el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from (n.created_at at time zone 'UTC')::date)::int + 1]
         || ' ' || to_char((n.created_at at time zone 'UTC')::date, 'DD/MM') || ' a las \2')
 where n.detalle ~ '(para |· )hoy \d\d:\d\d';
update notificaciones n
   set detalle = regexp_replace(n.detalle, '(para |· )mañana (\d\d:\d\d)',
         '\1el ' || (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from (n.created_at at time zone 'UTC')::date + 1)::int + 1]
         || ' ' || to_char((n.created_at at time zone 'UTC')::date + 1, 'DD/MM') || ' a las \2')
 where n.detalle ~ '(para |· )mañana \d\d:\d\d';


-- ── 8. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 46 $$;
grant execute on function version_esquema() to anon, authenticated;

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
-- Tablas creadas (23):
--   profiles, empresas, empresa_deportes,
--   empleados, canchas, reservas,
--   entrenadores, entrenamientos,
--   torneos, solicitudes_cancha, equipos, equipo_jugadores,
--   partidos_torneo, eventos_partido,
--   partidos_espontaneos, partido_jugadores,
--   recompensas, canjes, puntos_historial, calificaciones, bitacora,
--   notificaciones, comentarios
--
-- Vistas: v_goleadores, vista_calificaciones_empresa
-- ============================================================
