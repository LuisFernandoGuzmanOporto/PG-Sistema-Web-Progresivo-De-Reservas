import WebSocket from 'ws'
globalThis.WebSocket ??= WebSocket

import fs from 'node:fs'
import { entrarComo, hayBase } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// Sesiones para las pruebas E2E.
//
// La contraseña de las cuentas de prueba NO se escribe en la pantalla de
// inicio: la sesion se abre desde aca, contra Supabase, y se deja en el
// almacenamiento del navegador exactamente donde la guarda supabase-js. Al
// abrir la aplicacion, esta ya encuentra al usuario conectado.
// ─────────────────────────────────────────────────────────────────────────────

export { hayBase }

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*(\w+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]))

const CLAVE_ALMACEN = 'sb-' + new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0] + '-auth-token'

export const CUENTAS = {
  juan: 'juan.garcia@sportika.bo', marco: 'marco@email.com',
  admin: 'pedro@sportcenter.com', rosa: 'rosa.v@sportika.bo',
  superadmin: 'admin@sportika.bo',
}

/** Abre una ventana nueva del navegador con la sesion de esa cuenta. */
export async function ventanaDe(browser, quien) {
  const { sb, usuario } = await entrarComo(CUENTAS[quien])
  const { data } = await sb.auth.getSession()
  const context = await browser.newContext()
  await context.addInitScript(([clave, valor]) => {
    window.localStorage.setItem(clave, valor)
  }, [CLAVE_ALMACEN, JSON.stringify(data.session)])
  const page = await context.newPage()
  return { context, page, sb, id: usuario.id }
}
