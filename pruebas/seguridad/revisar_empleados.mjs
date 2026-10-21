// Muestra los empleados creados más recientemente y el rol con que quedó su
// cuenta. Después de la migración 037 y de publicar la función «empleados»,
// todo empleado nuevo tiene que figurar con rol «empleado».
//
//   node pruebas/seguridad/revisar_empleados.mjs
import WebSocket from 'ws'
globalThis.WebSocket ??= WebSocket
import { entrarComo } from '../integracion/conexion.js'

const sa = await entrarComo('admin@sportika.bo')
const { data: empleados, error } = await sa.sb.from('empleados')
  .select('id, usuario, empresa_id, activo, created_at').order('created_at', { ascending: false }).limit(5)
if (error) { console.log('No se pudo leer:', error.message); process.exit(1) }
const { data: perfiles } = await sa.sb.from('profiles').select('id, nombre, rol').in('id', empleados.map(e => e.id))
const rol = new Map(perfiles.map(p => [p.id, p]))
for (const e of empleados) {
  const p = rol.get(e.id)
  const ok = p?.rol === 'empleado'
  console.log(`${ok ? '✓' : '✗'} ${e.created_at.slice(0, 16).replace('T', ' ')}  ${e.usuario.padEnd(28)} ${p?.nombre ?? '?'} → rol: ${p?.rol ?? '?'}${e.activo ? '' : ' (dado de baja)'}`)
}
process.exit(0)
