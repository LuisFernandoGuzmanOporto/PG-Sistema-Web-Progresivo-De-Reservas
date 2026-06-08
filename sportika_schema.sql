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
  'cancelada'
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

CREATE TYPE estado_pago AS ENUM (
  'pendiente',
  'confirmado',
  'rechazado'
);

CREATE TYPE tipo_recompensa AS ENUM (
  'descuento_reserva',
  'torneo_gratis',
  'fisico'
);

CREATE TYPE estado_canje AS ENUM (
  'disponible',
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

CREATE TABLE empleados (
  id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


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
  descripcion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  cliente_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cancha_id         UUID NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  fecha             DATE NOT NULL,
  hora_inicio       TIME NOT NULL,
  hora_fin          TIME NOT NULL,
  monto_total       DECIMAL(8,2) NOT NULL,
  estado            estado_reserva NOT NULL DEFAULT 'pendiente',
  comprobante_url   TEXT,                     -- imagen/PDF subido por el cliente
  codigo_descuento  TEXT,                     -- código de recompensa aplicado
  confirmado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fecha_confirmacion TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_reservas_updated
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Secuencia para el número de reserva legible
CREATE SEQUENCE reserva_seq START 1;

CREATE OR REPLACE FUNCTION generar_nro_reserva()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nro = 'RSV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('reserva_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- ============================================================

CREATE TABLE entrenamientos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  entrenador_id   UUID REFERENCES entrenadores(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  deporte         TEXT NOT NULL,
  descripcion     TEXT,
  nivel           nivel_entrenamiento NOT NULL DEFAULT 'Principiante',
  dias            TEXT[],                     -- ['Lun','Mie','Vie']
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  precio          DECIMAL(8,2) NOT NULL,
  cupo_max        INTEGER NOT NULL DEFAULT 10,
  para_ninos      BOOLEAN NOT NULL DEFAULT FALSE,
  edad_min        INTEGER,
  edad_max        INTEGER,
  incluye_polera  BOOLEAN NOT NULL DEFAULT FALSE,
  precio_polera   DECIMAL(8,2) DEFAULT 0,
  qr_pago_url     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_entrenamientos_updated
  BEFORE UPDATE ON entrenamientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 10. INSCRIPCIONES A ENTRENAMIENTOS
-- ============================================================

CREATE TABLE inscripciones_entrenamiento (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entrenamiento_id  UUID NOT NULL REFERENCES entrenamientos(id) ON DELETE CASCADE,
  cliente_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  quiere_polera     BOOLEAN NOT NULL DEFAULT FALSE,
  talla_polera      TEXT,
  monto_total       DECIMAL(8,2) NOT NULL,
  comprobante_url   TEXT,
  estado_pago       estado_pago NOT NULL DEFAULT 'pendiente',
  confirmado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entrenamiento_id, cliente_id)
);

-- Inscripción de niños (para entrenamientos para_ninos=TRUE)
CREATE TABLE inscripciones_ninos (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id          UUID NOT NULL REFERENCES inscripciones_entrenamiento(id) ON DELETE CASCADE,
  nombre_nino             TEXT NOT NULL,
  quiere_polera           BOOLEAN NOT NULL DEFAULT FALSE,
  talla_polera            TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 11. TORNEOS
-- ============================================================

CREATE TABLE torneos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  creador_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  nombre            TEXT NOT NULL,
  deporte           TEXT NOT NULL,
  descripcion       TEXT,
  formato           TEXT,                     -- 'eliminacion_simple', 'todos_contra_todos', etc.
  max_equipos       INTEGER NOT NULL DEFAULT 8,
  precio_inscripcion DECIMAL(8,2) NOT NULL DEFAULT 0,
  premios           TEXT,
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
  capitan_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  comprobante_url TEXT,
  codigo_canje    TEXT,                       -- código de recompensa torneo_gratis
  estado          estado_inscripcion NOT NULL DEFAULT 'pendiente',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jugadores dentro de un equipo
CREATE TABLE equipo_jugadores (
  equipo_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (equipo_id, jugador_id)
);


-- ============================================================
-- 13. PARTIDOS DE TORNEO
-- ============================================================

CREATE TABLE partidos_torneo (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id     UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  equipo_a_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
  equipo_b_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
  goles_a       INTEGER DEFAULT 0,
  goles_b       INTEGER DEFAULT 0,
  ronda         TEXT,                         -- 'Cuartos', 'Semifinal', 'Final', etc.
  cancha_id     UUID REFERENCES canchas(id) ON DELETE SET NULL,
  fecha_hora    TIMESTAMPTZ,
  finalizado    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Estadísticas por jugador en partidos de torneo
CREATE TABLE estadisticas_jugador (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id  UUID NOT NULL REFERENCES partidos_torneo(id) ON DELETE CASCADE,
  jugador_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  equipo_id   UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  goles       INTEGER NOT NULL DEFAULT 0,
  amarillas   INTEGER NOT NULL DEFAULT 0,
  rojas       INTEGER NOT NULL DEFAULT 0
);


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

-- Jugadores unidos al partido
CREATE TABLE partido_jugadores (
  partido_id  UUID NOT NULL REFERENCES partidos_espontaneos(id) ON DELETE CASCADE,
  jugador_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (partido_id, jugador_id)
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
  codigo          TEXT UNIQUE,                -- SPORT-DESC-XXXX o SPORT-TRN-XXXX
  estado          estado_canje NOT NULL DEFAULT 'disponible',
  usado_en        TEXT,                       -- 'reserva' | 'torneo' | 'entregado'
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
  estrellas   SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cliente_id)             -- 1 calificación por cliente por empresa
);


-- ============================================================
-- 19. ROW LEVEL SECURITY (RLS)
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
ALTER TABLE inscripciones_entrenamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_ninos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo_jugadores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_torneo             ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_jugador        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_espontaneos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partido_jugadores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompensas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE canjes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos_historial            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificaciones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_deportes            ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 20. POLÍTICAS RLS — PERFILES
-- ============================================================

-- Cada usuario ve su propio perfil
CREATE POLICY "perfil_propio" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Superadmin ve todos
CREATE POLICY "superadmin_ve_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'superadmin')
  );


-- ============================================================
-- 21. POLÍTICAS RLS — EMPRESAS
-- ============================================================

-- Cualquiera ve empresas activas
CREATE POLICY "empresas_publicas" ON empresas
  FOR SELECT USING (estado = 'activo');

-- Admin ve su propia empresa
CREATE POLICY "admin_ve_su_empresa" ON empresas
  FOR ALL USING (admin_id = auth.uid());

-- Superadmin ve todo
CREATE POLICY "superadmin_empresas" ON empresas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'superadmin')
  );


-- ============================================================
-- 22. POLÍTICAS RLS — RESERVAS
-- ============================================================

-- Cliente ve sus propias reservas
CREATE POLICY "cliente_reservas" ON reservas
  FOR ALL USING (cliente_id = auth.uid());

-- Admin/empleado ve reservas de su empresa
CREATE POLICY "admin_reservas_empresa" ON reservas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empresas e
      WHERE e.id = reservas.empresa_id
        AND (
          e.admin_id = auth.uid()
          OR EXISTS (SELECT 1 FROM empleados emp WHERE emp.empresa_id = e.id AND emp.id = auth.uid() AND emp.activo = TRUE)
        )
    )
  );


-- ============================================================
-- 23. POLÍTICAS RLS — CALIFICACIONES
-- ============================================================

-- Cualquiera lee calificaciones
CREATE POLICY "calificaciones_lectura" ON calificaciones
  FOR SELECT USING (TRUE);

-- Solo el propio cliente escribe su calificación
CREATE POLICY "calificacion_propia" ON calificaciones
  FOR INSERT WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "calificacion_update" ON calificaciones
  FOR UPDATE USING (cliente_id = auth.uid());


-- ============================================================
-- 24. POLÍTICAS RLS — SOLICITUDES EMPRESA
-- ============================================================

-- Cualquiera puede crear una solicitud
CREATE POLICY "crear_solicitud" ON solicitudes_empresa
  FOR INSERT WITH CHECK (TRUE);

-- Superadmin gestiona todas
CREATE POLICY "superadmin_solicitudes" ON solicitudes_empresa
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'superadmin')
  );


-- ============================================================
-- 25. POLÍTICAS RLS — RECOMPENSAS Y CANJES
-- ============================================================

-- Cualquiera ve recompensas activas
CREATE POLICY "recompensas_publicas" ON recompensas
  FOR SELECT USING (activa = TRUE);

-- Admin gestiona recompensas de su empresa
CREATE POLICY "admin_recompensas" ON recompensas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM empresas WHERE id = recompensas.empresa_id AND admin_id = auth.uid())
  );

-- Cliente ve sus propios canjes
CREATE POLICY "canjes_propios" ON canjes
  FOR ALL USING (cliente_id = auth.uid());

-- Admin ve canjes de su empresa
CREATE POLICY "admin_canjes" ON canjes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM empresas WHERE id = canjes.empresa_id AND admin_id = auth.uid())
  );


-- ============================================================
-- 26. POLÍTICAS RLS — CANCHAS
-- ============================================================

-- Cualquiera ve canchas activas
CREATE POLICY "canchas_publicas" ON canchas
  FOR SELECT USING (activa = TRUE);

-- Admin gestiona sus canchas
CREATE POLICY "admin_canchas" ON canchas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM empresas WHERE id = canchas.empresa_id AND admin_id = auth.uid())
  );


-- ============================================================
-- 27. ÍNDICES para rendimiento
-- ============================================================

CREATE INDEX idx_reservas_cliente    ON reservas(cliente_id);
CREATE INDEX idx_reservas_cancha     ON reservas(cancha_id);
CREATE INDEX idx_reservas_fecha      ON reservas(fecha);
CREATE INDEX idx_reservas_estado     ON reservas(estado);
CREATE INDEX idx_canchas_empresa     ON canchas(empresa_id);
CREATE INDEX idx_torneos_empresa     ON torneos(empresa_id);
CREATE INDEX idx_equipos_torneo      ON equipos(torneo_id);
CREATE INDEX idx_calificaciones_empresa ON calificaciones(empresa_id);
CREATE INDEX idx_canjes_cliente      ON canjes(cliente_id);
CREATE INDEX idx_puntos_cliente      ON puntos_historial(cliente_id);
CREATE INDEX idx_entrenamientos_empresa ON entrenamientos(empresa_id);
CREATE INDEX idx_inscripciones_ent   ON inscripciones_entrenamiento(entrenamiento_id);
CREATE INDEX idx_partidos_torneo     ON partidos_torneo(torneo_id);


-- ============================================================
-- 28. FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, correo, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 29. FUNCIÓN: sumar/restar puntos al cliente
-- ============================================================

CREATE OR REPLACE FUNCTION sumar_puntos(
  p_cliente_id  UUID,
  p_concepto    TEXT,
  p_puntos      INTEGER,
  p_referencia  UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET puntos = puntos + p_puntos WHERE id = p_cliente_id;
  INSERT INTO puntos_historial (cliente_id, concepto, puntos, referencia)
  VALUES (p_cliente_id, p_concepto, p_puntos, p_referencia);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
-- FIN DEL ESQUEMA
-- ============================================================
-- Tablas creadas:
--   profiles, empresas, empresa_deportes, solicitudes_empresa,
--   empleados, canchas, reservas,
--   entrenadores, entrenamientos, inscripciones_entrenamiento, inscripciones_ninos,
--   torneos, equipos, equipo_jugadores, partidos_torneo, estadisticas_jugador,
--   partidos_espontaneos, partido_jugadores,
--   recompensas, canjes, puntos_historial, calificaciones
-- ============================================================
