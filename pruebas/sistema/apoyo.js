import * as D from '../../src/lib/datos.js'
import { entrarComo, hayBase } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// Apoyo para las pruebas de sistema por rol.
//
// Las pantallas guardan todo con las funciones de src/lib/guardar.js, que
// usan UN cliente de Supabase (src/lib/supabase.js) y la sesion de
// datos.js. Aca ese cliente se reemplaza por un «actor» intercambiable: cada
// paso de la prueba dice quien lo hace —un cliente, el administrador, una
// empleada— y las funciones de la aplicacion corren con la sesion real de esa
// cuenta, igual que en su celular. Asi se prueban las mismas funciones que
// usan las pantallas, contra la base real y con sus politicas de seguridad.
// ─────────────────────────────────────────────────────────────────────────────

export { hayBase }

export const CUENTAS = {
  superadmin: 'admin@sportika.bo',
  admin:      'pedro@sportcenter.com',
  rosa:       'rosa.v@sportika.bo',        // empleada de Sport Center
  willy:      'willy.a@sportika.bo',       // empleado de Sport Center
  juan:       'juan.garcia@sportika.bo',
  marco:      'marco@email.com',
  luisa:      'luisa@email.com',
  ana:        'ana.lopez@email.com',
  juanr:      'juanr@email.com',
  diego:      'diego@email.com',
  sandra:     'sandra.v@email.com',
  juant:      'juant@email.com',
  carlos:     'carlosm@email.com',
}

export const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
export const CANCHA_FUTBOL = 'c0000000-0000-4000-8000-000000000001'   // Bs. 120 la hora
export const CANCHA_PADEL  = 'c0000000-0000-4000-8000-000000000007'   // Bs. 90 la hora

const sesiones = {}
let actual = null

/** El cliente de Supabase que reciben las funciones de la aplicacion. */
export const supabaseDelActor = new Proxy({}, {
  get(_, prop) {
    if (!actual) throw new Error('Ningun actor: llama a como(...) antes')
    const valor = actual.sb[prop]
    return typeof valor === 'function' ? valor.bind(actual.sb) : valor
  },
})

/** Inicia (una sola vez) la sesion de una cuenta y la deja lista para usar. */
export async function entrar(quien) {
  if (!sesiones[quien]) {
    const { sb, usuario } = await entrarComo(CUENTAS[quien])
    const { data: perfil } = await sb.from('profiles').select('nombre, puntos, rol')
      .eq('id', usuario.id).single()
    sesiones[quien] = { quien, sb, id: usuario.id, nombre: perfil?.nombre || quien }
  }
  return sesiones[quien]
}

/**
 * A partir de aca actua esta cuenta: las funciones de guardar.js usan su
 * sesion, y SESION / USUARIO_ACTUAL quedan como los dejaria el inicio de
 * sesion de la aplicacion.
 */
export async function como(quien) {
  const s = await entrar(quien)
  actual = s
  D.SESION.usuarioId = s.id
  D.SESION.empresaId = ['admin', 'rosa', 'willy'].includes(quien) ? SPORT_CENTER : null
  D.USUARIO_ACTUAL.id = s.id
  D.USUARIO_ACTUAL.nombre = s.nombre
  return s
}

/** Los puntos que tiene hoy una cuenta, leidos de la base. */
export async function puntosDe(quien) {
  const s = await entrar(quien)
  const { data } = await s.sb.from('profiles').select('puntos').eq('id', s.id).single()
  return data?.puntos ?? 0
}

/**
 * Deja la base como estaba: borra lo que la prueba creo, las notificaciones
 * que genero y, si a alguien le quedaron puntos de mas o de menos, se los
 * devuelve el superadministrador (unica cuenta que puede tocar el saldo).
 */
export async function dejarComoEstaba({ inicio, puntosAntes, borrar }) {
  for (const paso of borrar) {
    try { await paso() } catch { /* se sigue limpiando lo demas */ }
  }

  for (const quien of Object.keys(sesiones)) {
    const s = sesiones[quien]
    await s.sb.from('notificaciones').delete()
      .eq('usuario_id', s.id).gte('created_at', inicio)
  }

  const superadmin = await entrar('superadmin')
  for (const [quien, antes] of Object.entries(puntosAntes)) {
    const ahora = await puntosDe(quien)
    if (ahora !== antes) {
      await superadmin.sb.from('profiles').update({ puntos: antes }).eq('id', sesiones[quien].id)
    }
  }
}
