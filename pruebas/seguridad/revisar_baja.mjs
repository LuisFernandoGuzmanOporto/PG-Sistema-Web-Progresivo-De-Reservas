// Un empleado dado de baja (Nelson) no tiene ningún poder en su complejo,
// aunque su contraseña siga sirviendo para iniciar sesión.
import WebSocket from 'ws'
globalThis.WebSocket ??= WebSocket
import { entrarComo } from '../integracion/conexion.js'

const n = await entrarComo('nelson.c@sportika.bo')
const { data: yo } = await n.sb.from('empleados').select('activo, empresa_id').eq('id', n.usuario.id).single()
const { data: reservas } = await n.sb.from('reservas').select('id').eq('empresa_id', yo.empresa_id).limit(5)
const { data: conf } = await n.sb.from('reservas').update({ estado: 'confirmada' }).eq('empresa_id', yo.empresa_id).eq('estado', 'pendiente').select('id')
console.log('Nelson activo:', yo.activo)
console.log('Reservas del complejo que puede ver:', reservas?.length ?? 0)
console.log('Reservas que logró confirmar:', conf?.length ?? 0)
process.exit(0)
