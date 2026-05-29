import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =============================================
// BASE DE DATOS - SCHEMA SQL PARA SUPABASE
// =============================================
// Ejecutar esto en el SQL Editor de Supabase:

/*
-- ============================================
-- TABLA: perfiles de usuario
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'jugador' CHECK (role IN ('super_admin', 'admin_empresa', 'empleado', 'jugador')),
  puntos INTEGER DEFAULT 0,
  empresa_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: empresas (complejos deportivos)
-- ============================================
CREATE TABLE empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  direccion TEXT,
  ciudad TEXT DEFAULT 'Cochabamba',
  telefono TEXT,
  email TEXT,
  latitud DECIMAL(10,8),
  longitud DECIMAL(11,8),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'suspendido')),
  qr_pago_url TEXT,
  admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: canchas
-- ============================================
CREATE TABLE canchas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  deporte TEXT NOT NULL CHECK (deporte IN ('futbol', 'futsal', 'wally', 'voleibol', 'basquetbol', 'tenis', 'padel', 'frontón', 'otro')),
  descripcion TEXT,
  foto_url TEXT,
  capacidad INTEGER DEFAULT 10,
  precio_hora DECIMAL(10,2) NOT NULL,
  horario_apertura TIME DEFAULT '07:00',
  horario_cierre TIME DEFAULT '22:00',
  disponible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: reservas
-- ============================================
CREATE TABLE reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cancha_id UUID REFERENCES canchas(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES empresas(id) NOT NULL,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'cancelada')),
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: partidos espontaneos
-- ============================================
CREATE TABLE partidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cancha_id UUID REFERENCES canchas(id),
  creador_id UUID REFERENCES profiles(id) NOT NULL,
  deporte TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  jugadores_max INTEGER DEFAULT 10,
  jugadores_actuales INTEGER DEFAULT 1,
  descripcion TEXT,
  apuesta_social TEXT,
  estado TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'completo', 'finalizado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: jugadores en partidos
-- ============================================
CREATE TABLE partido_jugadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE NOT NULL,
  jugador_id UUID REFERENCES profiles(id) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partido_id, jugador_id)
);

-- ============================================
-- TABLA: torneos
-- ============================================
CREATE TABLE torneos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  organizador_id UUID REFERENCES profiles(id) NOT NULL,
  nombre TEXT NOT NULL,
  deporte TEXT NOT NULL,
  descripcion TEXT,
  foto_url TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_limite_inscripcion DATE NOT NULL,
  equipos_max INTEGER DEFAULT 8,
  jugadores_por_equipo INTEGER DEFAULT 5,
  precio_inscripcion DECIMAL(10,2) DEFAULT 0,
  qr_pago_url TEXT,
  premio_primero TEXT,
  premio_segundo TEXT,
  premio_tercero TEXT,
  estado TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'en_curso', 'finalizado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: equipos en torneos
-- ============================================
CREATE TABLE torneo_equipos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  torneo_id UUID REFERENCES torneos(id) ON DELETE CASCADE NOT NULL,
  nombre_equipo TEXT NOT NULL,
  capitan_id UUID REFERENCES profiles(id) NOT NULL,
  comprobante_url TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: miembros de equipos
-- ============================================
CREATE TABLE equipo_miembros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipo_id UUID REFERENCES torneo_equipos(id) ON DELETE CASCADE NOT NULL,
  jugador_id UUID REFERENCES profiles(id) NOT NULL,
  UNIQUE(equipo_id, jugador_id)
);

-- ============================================
-- TABLA: transacciones
-- ============================================
CREATE TABLE transacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  empresa_id UUID REFERENCES empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('reserva', 'torneo', 'recompensa')),
  referencia_id UUID,
  monto DECIMAL(10,2) NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'rechazado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: puntos y recompensas
-- ============================================
CREATE TABLE puntos_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  puntos INTEGER NOT NULL,
  concepto TEXT NOT NULL,
  referencia_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: empleados por empresa
-- ============================================
CREATE TABLE empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, usuario_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE canchas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- Policies basicas
CREATE POLICY "Profiles visibles para todos autenticados" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuario edita su propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Empresas visibles para todos" ON empresas FOR SELECT USING (estado = 'activo');
CREATE POLICY "Canchas visibles para todos" ON canchas FOR SELECT USING (disponible = TRUE);
CREATE POLICY "Reservas propias" ON reservas FOR SELECT USING (auth.uid() = usuario_id);

-- Trigger para crear perfil automaticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
*/
