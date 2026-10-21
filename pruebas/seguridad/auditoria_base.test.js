import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hayBase, clienteAnonimo, entrarComo, CUENTAS, SPORT_CENTER } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// SEG-01 a SEG-07 · Hallazgos de la auditoría de seguridad
//
// Cada prueba repite un intento que la auditoría logró antes de la corrección
// (migraciones/037) y comprueba que ahora la base lo rechaza. Lo que un intento
// llegara a cambiar se deshace al final.
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hayBase)('Hallazgos de la auditoría de seguridad', () => {
  let cliente, otro
  // Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
  // del de Supabase, y un aviso creado al empezar quedaba sin borrar
  const inicio = new Date(Date.now() - 60_000).toISOString()
  const deshacer = []

  beforeAll(async () => {
    cliente = await entrarComo(CUENTAS.cliente)
    otro    = await entrarComo(CUENTAS.otroCliente)
  })

  afterAll(async () => {
    for (const f of deshacer) await f()
    await cliente.sb.from('profiles').update({ activo: true }).eq('id', cliente.usuario.id)
    for (const q of [cliente, otro]) {
      await q.sb.from('notificaciones').delete().eq('usuario_id', q.usuario.id).gte('created_at', inicio)
    }
  })

  it('SEG-01 · un cliente no puede darse puntos llamando a la función interna', async () => {
    // Arrange
    const { sb, usuario } = cliente

    // Act
    const { error } = await sb.rpc('sumar_puntos',
      { p_cliente_id: usuario.id, p_concepto: 'prueba', p_puntos: 0, p_referencia: null })

    // Assert
    expect(error?.code).toBe('42501')
  })

  it('SEG-02 · nadie puede mandar notificaciones falsas desde la API, ni con sesión ni sin ella', async () => {
    // Arrange
    const args = { dest: otro.usuario.id, t: 'sistema', titulo: 'prueba', detalle: '', enlace: '/' }

    // Act
    const conSesion = await cliente.sb.rpc('avisar', args)
    const sinSesion = await clienteAnonimo().rpc('avisar', args)

    // Assert
    expect(conSesion.error?.code).toBe('42501')
    expect(sinSesion.error?.code).toBe('42501')
  })

  it('SEG-03 · una cuenta desactivada no puede reactivarse sola', async () => {
    // Arrange
    const { sb, usuario } = cliente
    const { data: antes } = await sb.from('profiles').select('activo').eq('id', usuario.id).single()

    // Act
    await sb.from('profiles').update({ activo: !antes.activo }).eq('id', usuario.id)
    const { data: despues } = await sb.from('profiles').select('activo').eq('id', usuario.id).single()

    // Assert
    expect(despues.activo).toBe(antes.activo)
  })

  it('SEG-04 · un cliente no puede cambiar el correo que figura en su perfil', async () => {
    // Arrange
    const { sb, usuario } = cliente
    const { data: antes } = await sb.from('profiles').select('correo').eq('id', usuario.id).single()

    // Act
    await sb.from('profiles').update({ correo: 'otro-' + Date.now() + '@ejemplo.bo' }).eq('id', usuario.id)
    const { data: despues } = await sb.from('profiles').select('correo').eq('id', usuario.id).single()
    if (despues.correo !== antes.correo) deshacer.push(() =>
      sb.from('profiles').update({ correo: antes.correo }).eq('id', usuario.id))

    // Assert
    expect(despues.correo).toBe(antes.correo)
  })

  it('SEG-05 · un complejo creado por un usuario siempre nace pendiente de aprobación', async () => {
    // Arrange
    const { sb, usuario } = cliente

    // Act
    const { data } = await sb.from('empresas').insert({
      nombre: 'Complejo de prueba de seguridad', zona: 'Centro', direccion: 'Prueba',
      estado: 'activo', admin_id: usuario.id,
    }).select('id, estado').single()
    if (data) deshacer.push(() => sb.from('empresas').delete().eq('id', data.id))

    // Assert
    expect(data?.estado).toBe('pendiente')
  })

  it('SEG-06 · el dueño de un complejo pendiente no puede crear canchas', async () => {
    // Arrange
    const { sb, usuario } = cliente
    const { data: emp } = await sb.from('empresas').insert({
      nombre: 'Complejo pendiente de prueba', zona: 'Centro', direccion: 'Prueba', admin_id: usuario.id,
    }).select('id').single()
    deshacer.push(() => sb.from('empresas').delete().eq('id', emp.id))

    // Act
    const { data, error } = await sb.from('canchas').insert({
      empresa_id: emp.id, nombre: 'Cancha de prueba', deporte: 'Fútbol', precio_hora: 100,
    }).select('id')
    if (data?.length) deshacer.push(() => sb.from('canchas').delete().eq('id', data[0].id))

    // Assert
    expect(error?.code).toBe('42501')
  })

  it('SEG-07 · el C.I. de los jugadores ya no se guarda, así que nadie lo puede leer', async () => {
    // Arrange: la 037 lo cerró a la API; la 041 lo borró, porque nadie lo usaba
    const visitante = clienteAnonimo()

    // Act
    const sinSesion = await visitante.from('equipo_jugadores').select('nombre, ci').limit(1)
    const conSesion = await cliente.sb.from('equipo_jugadores').select('ci').limit(1)

    // Assert: la columna ya no existe
    expect(sinSesion.error?.code).toBe('42703')
    expect(conSesion.error?.code).toBe('42703')
  })
})
