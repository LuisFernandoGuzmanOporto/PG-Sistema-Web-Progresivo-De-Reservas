import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Conexion a la base real para las pruebas de integracion.
//
// La direccion y la clave publica salen del mismo .env que usa la aplicacion.
// La contraseña de las cuentas de demostracion sale de .env.pruebas.local, que
// no se sube al repositorio. Si ese archivo no esta, estas pruebas se saltan.
// ─────────────────────────────────────────────────────────────────────────────

function leerEnv(archivo) {
  const ruta = path.resolve(process.cwd(), archivo)
  if (!fs.existsSync(ruta)) return {}
  return Object.fromEntries(
    fs.readFileSync(ruta, 'utf8').split(/\r?\n/)
      .map(l => l.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(m => [m[1], m[2]]))
}

const env   = { ...leerEnv('.env'), ...leerEnv('.env.pruebas.local') }
const CLAVE = process.env.SPORTIKA_CLAVE_PRUEBA || env.SPORTIKA_CLAVE_PRUEBA

export const hayBase = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY && CLAVE)

/** Un cliente de Supabase nuevo, sin sesion, como un visitante. */
export const clienteAnonimo = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,
               { auth: { persistSession: false, autoRefreshToken: false } })

// Supabase limita cuantas veces se puede iniciar sesion en pocos minutos, y
// una corrida completa abre decenas de sesiones. Por eso la sesion de cada
// cuenta se guarda un rato en la carpeta temporal del sistema (fuera del
// proyecto, nunca en el repositorio) y se reutiliza mientras le falten mas de
// 15 minutos para vencer. Si ya no sirve, se inicia sesion de nuevo.
const SESIONES = path.join(os.tmpdir(), 'sportika-pruebas-sesiones.json')
const MARGEN   = 15 * 60

function sesionesGuardadas() {
  try { return JSON.parse(fs.readFileSync(SESIONES, 'utf8')) } catch { return {} }
}

function guardarSesion(correo, { access_token, refresh_token, expires_at }) {
  const todas = { ...sesionesGuardadas(), [correo]: { access_token, refresh_token, expires_at } }
  const temporal = SESIONES + '.' + process.pid
  try { fs.writeFileSync(temporal, JSON.stringify(todas)); fs.renameSync(temporal, SESIONES) } catch { /* sin cache */ }
}

/** Un cliente de Supabase con la sesion de una cuenta de demostracion. */
export async function entrarComo(correo) {
  const sb = clienteAnonimo()
  const guardada = sesionesGuardadas()[correo]
  if (guardada && guardada.expires_at - Date.now() / 1000 > MARGEN) {
    const { data, error } = await sb.auth.setSession(guardada)
    if (!error && data.user) return { sb, usuario: data.user }
  }
  const { data, error } = await sb.auth.signInWithPassword({ email: correo, password: CLAVE })
  if (error) throw new Error('No se pudo entrar como ' + correo + ': ' + error.message)
  guardarSesion(correo, data.session)
  return { sb, usuario: data.user }
}

export const CUENTAS = {
  cliente:      'juan.garcia@sportika.bo',
  otroCliente:  'marco@email.com',
  admin:        'pedro@sportcenter.com',
  empleado:     'rosa.v@sportika.bo',
}

export const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
