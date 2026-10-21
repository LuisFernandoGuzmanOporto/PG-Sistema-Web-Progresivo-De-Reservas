import WebSocket from 'ws'
globalThis.WebSocket ??= WebSocket
import { entrarComo, clienteAnonimo } from '../integracion/conexion.js'

const a = clienteAnonimo()
const j = await entrarComo('juan.garcia@sportika.bo')
const { data: emp } = await j.sb.from('empresas').select('id, nombre, estado, admin_id').ilike('nombre', '%de prueba%')
console.log('Complejos «Auditoria» visibles para Juan:', emp)
const { data: empA } = await a.from('empresas').select('id').ilike('nombre', '%de prueba%')
console.log('…y para un visitante:', empA?.length)
const { data: p } = await j.sb.from('profiles').select('correo, rol, puntos, activo').eq('id', j.usuario.id).single()
console.log('Perfil de Juan:', p)
const { data: n } = await j.sb.from('notificaciones').select('id').eq('titulo', 'auditoria')
console.log('Notificaciones «auditoria» de Juan:', n?.length)
// Desde la 041 el C.I. ya no se guarda: la columna no existe
const { error: sinCi } = await a.from('equipo_jugadores').select('ci').limit(1)
console.log('C.I. de los jugadores:', sinCi?.code === '42703' ? 'ya no se guarda' : 'la columna sigue en la base')
process.exit(0)
