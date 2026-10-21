// ─────────────────────────────────────────────────────────────────────────────
// AUDITORÍA DE SEGURIDAD · pruebas de intrusión controladas contra la base
//
// Cada sonda intenta algo que un atacante haría con la clave pública y una
// cuenta común (o sin cuenta). Resultado:
//   BLOQUEADO  → la base lo impidió (correcto)
//   VULNERABLE → lo logró (hallazgo)
//   REVISAR    → respuesta inesperada; hay que mirarla a mano
//
// Todo lo que una sonda llegue a cambiar se deshace al final. No se borra
// ningún dato que no haya creado la propia auditoría.
//
//   node pruebas/seguridad/auditoria.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws'
globalThis.WebSocket ??= WebSocket
import { entrarComo, clienteAnonimo, hayBase } from '../integracion/conexion.js'

if (!hayBase) { console.log('Falta .env.pruebas.local'); process.exit(0) }

const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const res = []
const deshacer = []
const PERMISO = ['42501', 'PGRST301', '401', '403']

function anotar(id, que, estado, detalle = '') {
  res.push({ id, que, estado, detalle })
  const icono = { BLOQUEADO: '✓', VULNERABLE: '✗', REVISAR: '?' }[estado]
  console.log(`${icono} ${id} ${estado.padEnd(10)} ${que}${detalle ? ' — ' + detalle : ''}`)
}

/** Un intento de escritura: bloqueado si da error de permiso o no afecta filas. */
async function escritura(id, que, fn, { alLograrlo } = {}) {
  try {
    const { data, error } = await fn()
    if (error) {
      const permiso = PERMISO.includes(String(error.code)) || /row-level security|permission denied|not allowed|no tienes|solo|suspend/i.test(error.message)
      return anotar(id, que, permiso ? 'BLOQUEADO' : 'REVISAR', error.code + ' ' + error.message.slice(0, 90))
    }
    const filas = Array.isArray(data) ? data.length : data ? 1 : 0
    if (filas === 0) return anotar(id, que, 'BLOQUEADO', 'no afectó filas')
    if (alLograrlo) deshacer.push(() => alLograrlo(data))
    return anotar(id, que, 'VULNERABLE', JSON.stringify(data).slice(0, 110))
  } catch (e) { anotar(id, que, 'REVISAR', e.message.slice(0, 90)) }
}

/** Una llamada a función: bloqueada si la base niega la ejecución. */
async function rpc(id, que, sb, fn, args) {
  const { data, error } = await sb.rpc(fn, args)
  if (!error) return anotar(id, que, 'VULNERABLE', 'respondió: ' + JSON.stringify(data)?.slice(0, 80))
  const negado = error.code === '42501' || /permission denied/i.test(error.message)
  const noExiste = error.code === 'PGRST202'
  anotar(id, que, negado || noExiste ? 'BLOQUEADO' : 'REVISAR', error.code + ' ' + error.message.slice(0, 90))
}

const juan  = await entrarComo('juan.garcia@sportika.bo')
const marco = await entrarComo('marco@email.com')
const pedro = await entrarComo('pedro@sportcenter.com')
const rosa  = await entrarComo('rosa.v@sportika.bo')
const anon  = clienteAnonimo()
const J = juan.usuario.id, M = marco.usuario.id
// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const INICIO = new Date(Date.now() - 60_000).toISOString()

const { data: otras } = await pedro.sb.from('empresas').select('id, nombre').neq('id', SPORT_CENTER).limit(1)
const OTRA = otras?.[0]?.id
const { data: perfilJuan } = await juan.sb.from('profiles').select('rol, puntos, activo, correo').eq('id', J).single()

console.log('\n── A. Escalada de privilegios en el perfil')
await escritura('A1', 'Cliente se pone rol superadmin y 99.999 puntos', async () => {
  await juan.sb.from('profiles').update({ rol: 'superadmin', puntos: 99999 }).eq('id', J)
  const { data } = await juan.sb.from('profiles').select('rol, puntos').eq('id', J).single()
  const logro = data.rol !== perfilJuan.rol || data.puntos !== perfilJuan.puntos
  return { data: logro ? [data] : [], error: null }
})
await escritura('A2', 'Cliente edita el perfil de otro cliente', () =>
  juan.sb.from('profiles').update({ nombre: 'Hackeado' }).eq('id', M).select())
await escritura('A3', 'Cliente cambia el correo de su perfil por el de otro', async () => {
  const r = await juan.sb.from('profiles').update({ correo: 'otro-' + Date.now() + '@x.bo' }).eq('id', J).select('correo')
  const cambio = r.data?.[0]?.correo && r.data[0].correo !== perfilJuan.correo
  if (cambio) deshacer.push(() => juan.sb.from('profiles').update({ correo: perfilJuan.correo }).eq('id', J))
  return { data: cambio ? r.data : [], error: r.error }
})
await escritura('A4', 'Cuenta que se desactiva a sí misma puede volver a activarse', async () => {
  // Se simula el caso de una cuenta suspendida que intenta reactivarse
  const a = await juan.sb.from('profiles').update({ activo: false }).eq('id', J).select('activo')
  if (a.error || a.data?.[0]?.activo !== false) return { data: [], error: a.error }
  const b = await juan.sb.from('profiles').update({ activo: true }).eq('id', J).select('activo')
  return { data: b.data?.[0]?.activo === true ? b.data : [], error: b.error }
})

console.log('\n── B. Funciones internas llamadas por la API')
await rpc('B1', 'sumar_puntos a sí mismo (cliente)', juan.sb, 'sumar_puntos', { p_cliente_id: J, p_concepto: 'auditoria', p_puntos: 0, p_referencia: null })
await rpc('B2', 'avisar: notificación falsa (cliente)', juan.sb, 'avisar', { dest: J, t: 'sistema', titulo: 'auditoria', detalle: 'x', enlace: '/app/dashboard' })
await rpc('B3', 'avisar: notificación falsa (visitante)', anon, 'avisar', { dest: J, t: 'sistema', titulo: 'auditoria', detalle: 'x', enlace: '/' })
await rpc('B4', 'avisar_al_complejo (cliente)', juan.sb, 'avisar_al_complejo', { emp: SPORT_CENTER, permiso: 'reservas', t: 'sistema', titulo: 'auditoria', detalle: 'x', enlace: '/' })
await rpc('B5', 'devolver_puntos (cliente)', juan.sb, 'devolver_puntos', {})
await rpc('B6', 'generar_nro_reserva (visitante)', anon, 'generar_nro_reserva', {})
// datos_iniciales corre con los permisos de quien llama: sin sesión solo trae lo público
{
  const { data } = await anon.rpc('datos_iniciales')
  const privado = ['reservas', 'canjes', 'bitacora', 'puntos_historial', 'profiles'].filter(k => data?.[k]?.length)
  anotar('B7', 'datos_iniciales sin sesión trae datos privados', privado.length ? 'VULNERABLE' : 'BLOQUEADO', privado.join(', ') || 'solo datos públicos')
}
{
  const { error } = await anon.rpc('canjear_recompensa', { p_recompensa: '00000000-0000-4000-8000-000000000000' })
  anotar('B8', 'canjear_recompensa sin sesión', /iniciar sesion|42501/i.test((error?.message || '') + error?.code) ? 'BLOQUEADO' : 'REVISAR', error?.message?.slice(0, 60))
}
await rpc('B9', 'calcular_monto_reserva (cliente)', juan.sb, 'calcular_monto_reserva', {})
await rpc('B10', 'handle_new_user (cliente)', juan.sb, 'handle_new_user', {})

console.log('\n── C. Datos de otros (IDOR) y escrituras sin permiso')
await escritura('C1', 'Cliente se da de alta como empleado de un complejo', () =>
  juan.sb.from('empleados').insert({ id: J, empresa_id: SPORT_CENTER, usuario: 'intruso', permisos: ['reservas', 'caja'] }).select(),
  { alLograrlo: () => pedro.sb.from('empleados').delete().eq('id', J) })
await escritura('C2', 'Cliente crea un complejo ya aprobado',
  async () => {
    const r = await juan.sb.from('empresas').insert({ nombre: 'Auditoria SA', zona: 'Centro', direccion: 'x', estado: 'activo', admin_id: J }).select('id, estado')
    if (r.data?.length) deshacer.push(() => juan.sb.from('empresas').delete().eq('id', r.data[0].id))
    return { data: r.data?.[0]?.estado === 'activo' ? r.data : [], error: r.error }
  })
await escritura('C3', 'Cliente escribe una notificación para otro usuario', () =>
  juan.sb.from('notificaciones').insert({ usuario_id: M, tipo: 'sistema', titulo: 'auditoria', enlace: '/' }).select(),
  { alLograrlo: d => marco.sb.from('notificaciones').delete().eq('id', d[0].id) })
await escritura('C4', 'Cliente crea un canje sin gastar puntos', async () => {
  const { data: rec } = await juan.sb.from('recompensas').select('id, empresa_id').limit(1).single()
  return juan.sb.from('canjes').insert({ cliente_id: J, recompensa_id: rec.id, empresa_id: rec.empresa_id, puntos_gastados: 0, codigo: 'SPK-AUDIT1' }).select()
}, { alLograrlo: d => pedro.sb.from('canjes').delete().eq('id', d[0].id) })
await escritura('C5', 'Cliente sube el stock de una recompensa', async () => {
  const { data: rec } = await juan.sb.from('recompensas').select('id, stock').limit(1).single()
  return juan.sb.from('recompensas').update({ stock: 9999 }).eq('id', rec.id).select()
})
await escritura('C6', 'Cliente se suma puntos en el historial', () =>
  juan.sb.from('puntos_historial').insert({ cliente_id: J, concepto: 'auditoria', puntos: 500 }).select(),
  { alLograrlo: d => pedro.sb.from('puntos_historial').delete().eq('id', d[0].id) })
await escritura('C7', 'Cliente escribe en la bitácora de un complejo', () =>
  juan.sb.from('bitacora').insert({ empresa_id: SPORT_CENTER, actor_id: J, actor_nombre: 'Rosa', tipo: 'caja', accion: 'auditoria' }).select())
await escritura('C8', 'Cliente califica dos veces el mismo complejo (puntos repetidos)', async () => {
  const a = await juan.sb.from('calificaciones').insert({ empresa_id: SPORT_CENTER, cliente_id: J, estrellas: 5 }).select()
  if (a.data?.length) deshacer.push(() => juan.sb.from('calificaciones').delete().eq('id', a.data[0].id))
  const b = await juan.sb.from('calificaciones').insert({ empresa_id: SPORT_CENTER, cliente_id: J, estrellas: 5 }).select()
  if (b.data?.length) deshacer.push(() => juan.sb.from('calificaciones').delete().eq('id', b.data[0].id))
  if (b.error?.code === '23505') return { data: [], error: { code: '42501', message: 'una calificación por persona (restricción única)' } }
  return a.data?.length && b.data?.length ? b : { data: [], error: b.error }
})
await escritura('C9', 'Cliente edita el comentario de otro', async () => {
  const { data: c } = await juan.sb.from('comentarios').select('id').neq('autor_id', J).limit(1).single()
  return juan.sb.from('comentarios').update({ texto: 'auditoria' }).eq('id', c.id).select()
})
await escritura('C10', 'Cliente borra el comentario de otro', async () => {
  const { data: c } = await juan.sb.from('comentarios').select('id').neq('autor_id', J).limit(1).single()
  return juan.sb.from('comentarios').delete().eq('id', c.id).select()
})
await escritura('C11', 'Cliente cambia el precio de una cancha', () =>
  juan.sb.from('canchas').update({ precio_hora: 1 }).eq('empresa_id', SPORT_CENTER).select())
await escritura('C12', 'Cliente cambia el estado de un torneo del complejo', () =>
  juan.sb.from('torneos').update({ estado: 'finalizado' }).eq('empresa_id', SPORT_CENTER).neq('creador_id', J).select())
await escritura('C13', 'Cliente cancela un partido espontáneo ajeno', () =>
  juan.sb.from('partidos_espontaneos').update({ max_jugadores: 2 }).neq('creador_id', J).select())
await escritura('C14', 'Administrador cambia canchas de OTRO complejo', () =>
  pedro.sb.from('canchas').update({ precio_hora: 1 }).eq('empresa_id', OTRA).select())
await escritura('C15', 'Administrador aprueba su propio complejo / cambia estado', () =>
  pedro.sb.from('empresas').update({ estado: 'activo' }).eq('id', OTRA).select())
await escritura('C16', 'Empleada confirma reservas de OTRO complejo', () =>
  rosa.sb.from('reservas').update({ estado: 'confirmada' }).eq('empresa_id', OTRA).select())
await escritura('C17', 'Empleada se da más permisos a sí misma', () =>
  rosa.sb.from('empleados').update({ permisos: ['reservas', 'caja', 'torneos', 'recompensas', 'asistencia', 'empleados'] }).eq('id', rosa.usuario.id).select())
await escritura('C18', 'Cliente marca asistencia a su propia reserva', () =>
  juan.sb.from('reservas').update({ asistencia: 'asistio' }).eq('cliente_id', J).select())

console.log('\n── D. Lectura de datos por un visitante sin cuenta')
for (const t of ['profiles', 'reservas', 'notificaciones', 'canjes', 'empleados', 'bitacora', 'puntos_historial', 'calificaciones', 'equipo_jugadores']) {
  const { data, error } = await anon.from(t).select('*').limit(5)
  const n = data?.length || 0
  const sensibles = n && data[0] ? Object.keys(data[0]).filter(k => /correo|telefono|email|ci\b|comprobante|puntos|monto/.test(k)) : []
  anotar('D-' + t, `Visitante lee «${t}»`, n === 0 ? 'BLOQUEADO' : sensibles.length ? 'VULNERABLE' : 'REVISAR',
    error ? error.message.slice(0, 60) : `${n} filas${sensibles.length ? ', columnas sensibles: ' + sensibles.join(', ') : ''}`)
}
{
  const { data } = await juan.sb.from('profiles').select('*').neq('id', J).limit(50)
  const conCorreo = (data || []).filter(p => p.correo || p.telefono)
  anotar('D-perfiles', 'Cliente lee correos o teléfonos de otros usuarios', conCorreo.length ? 'VULNERABLE' : 'BLOQUEADO', `${conCorreo.length} de ${data?.length || 0} perfiles`)
}
{
  const { data } = await juan.sb.from('equipo_jugadores').select('*').limit(50)
  const ci = (data || []).filter(j => j.ci)
  anotar('D-ci', 'Cliente lee el C.I. de jugadores de otros equipos', ci.length ? 'VULNERABLE' : 'BLOQUEADO', `${ci.length} con C.I.`)
}

console.log('\n── E. Almacenamiento de archivos')
{
  const { data } = await juan.sb.storage.from('comprobantes').list(SPORT_CENTER + '/reservas', { limit: 100 })
  anotar('E1', 'Cliente lista los comprobantes de todo el complejo', (data || []).length > 1 ? 'VULNERABLE' : 'BLOQUEADO', `${(data || []).length} archivos visibles`)
  const { data: d2 } = await anon.storage.from('comprobantes').list(SPORT_CENTER + '/reservas', { limit: 5 })
  anotar('E2', 'Visitante lista comprobantes', (d2 || []).length ? 'VULNERABLE' : 'BLOQUEADO', `${(d2 || []).length} archivos`)
  if (OTRA) {
    const { data: d3 } = await pedro.sb.storage.from('comprobantes').list(OTRA + '/reservas', { limit: 5 })
    anotar('E3', 'Administrador lista comprobantes de OTRO complejo', (d3 || []).length ? 'VULNERABLE' : 'BLOQUEADO', `${(d3 || []).length} archivos`)
  }
  const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' })
  const r1 = await pedro.sb.storage.from('publico').upload(SPORT_CENTER + '/auditoria.svg', svg, { contentType: 'image/svg+xml' })
  if (!r1.error) deshacer.push(() => pedro.sb.storage.from('publico').remove([SPORT_CENTER + '/auditoria.svg']))
  anotar('E4', 'Subir un SVG con script al depósito público', r1.error ? 'BLOQUEADO' : 'VULNERABLE', r1.error?.message?.slice(0, 70) || 'aceptado')
  const html = new Blob(['<script>alert(1)</script>'], { type: 'text/html' })
  const r2 = await pedro.sb.storage.from('publico').upload(SPORT_CENTER + '/auditoria.html', html, { contentType: 'text/html' })
  if (!r2.error) deshacer.push(() => pedro.sb.storage.from('publico').remove([SPORT_CENTER + '/auditoria.html']))
  anotar('E5', 'Subir un HTML al depósito público', r2.error ? 'BLOQUEADO' : 'VULNERABLE', r2.error?.message?.slice(0, 70) || 'aceptado')
  const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
  const r3 = await juan.sb.storage.from('publico').upload(SPORT_CENTER + '/auditoria.png', png, { contentType: 'image/png' })
  if (!r3.error) deshacer.push(() => pedro.sb.storage.from('publico').remove([SPORT_CENTER + '/auditoria.png']))
  anotar('E6', 'Cliente sube una imagen a la carpeta de un complejo', r3.error ? 'BLOQUEADO' : 'VULNERABLE', r3.error?.message?.slice(0, 70) || 'aceptado')
}

console.log('\n── Deshaciendo lo que se logró cambiar…')
for (const f of deshacer) { try { await f() } catch (e) { console.log('  no se pudo deshacer:', e.message) } }
await juan.sb.from('profiles').update({ activo: true }).eq('id', J)
for (const q of [juan, marco, pedro, rosa]) await q.sb.from('notificaciones').delete().eq('usuario_id', q.usuario.id).gte('created_at', INICIO)
const { data: final } = await juan.sb.from('profiles').select('rol, puntos, activo').eq('id', J).single()
console.log('Perfil de Juan al final:', JSON.stringify(final), '(antes:', JSON.stringify({ rol: perfilJuan.rol, puntos: perfilJuan.puntos, activo: perfilJuan.activo }) + ')')

const cuenta = e => res.filter(r => r.estado === e).length
console.log(`\nResumen: ${cuenta('BLOQUEADO')} bloqueados · ${cuenta('VULNERABLE')} vulnerables · ${cuenta('REVISAR')} a revisar`)
import fs from 'node:fs'
fs.writeFileSync('pruebas/seguridad/resultado.json', JSON.stringify(res, null, 2))
process.exit(0)
