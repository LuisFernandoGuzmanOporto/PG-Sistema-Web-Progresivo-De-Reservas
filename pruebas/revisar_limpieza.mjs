// Revisa que las pruebas de sistema no hayan dejado nada en la base.
// Se corre despues de «npm run test:sistema» con:  node pruebas/revisar_limpieza.mjs
import WebSocket from 'ws'
globalThis.WebSocket = WebSocket
const { entrarComo, hayBase } = await import('./integracion/conexion.js')
if (!hayBase) { console.log('Sin .env.pruebas.local: no se puede revisar'); process.exit(0) }

const { sb: admin } = await entrarComo('pedro@sportcenter.com')
const { sb: superadmin } = await entrarComo('admin@sportika.bo')

const reservas = await admin.from('reservas').select('id, fecha').gte('fecha', '2030-01-01')
const torneos = await admin.from('torneos').select('id, nombre').ilike('nombre', '%prueba%')
const partidos = await admin.from('partidos_espontaneos').select('id').ilike('apuesta', '%prueba%')
const suspendidos = await superadmin.from('profiles').select('correo').eq('activo', false)

const quedan = {
  'reservas de prueba (2030 en adelante)': reservas.data?.length ?? '?',
  'torneos de prueba': torneos.data?.length ?? '?',
  'partidos espontaneos de prueba': partidos.data?.length ?? '?',
  'cuentas suspendidas': (suspendidos.data || []).map(p => p.correo).join(', ') || 0,
}
console.table(quedan)
process.exit(0)
