import { describe, it, expect, beforeAll } from 'vitest'
import { hayBase, clienteAnonimo, entrarComo, CUENTAS, SPORT_CENTER } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-05 a PI-16 · Integración con la base de datos (Supabase)
//
// La aplicación, la API y la base funcionando juntas. Cada prueba intenta algo
// que el sistema DEBE rechazar, o solo lee: ninguna deja datos nuevos. Si un
// intento de cambio llegara a pasar, la prueba deja el dato como estaba antes
// de fallar.
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hayBase)('Seguridad de los datos en la base', () => {
  let cliente, otro, admin

  beforeAll(async () => {
    cliente = await entrarComo(CUENTAS.cliente)
    otro    = await entrarComo(CUENTAS.otroCliente)
    admin   = await entrarComo(CUENTAS.admin)
  })

  it('PI-05 · un visitante sin sesión no puede ver ninguna reserva', async () => {
    // Arrange
    const visitante = clienteAnonimo()

    // Act
    const { data } = await visitante.from('reservas').select('id')

    // Assert
    expect(data ?? []).toHaveLength(0)
  })

  it('PI-06 · un cliente solo ve sus propias reservas', async () => {
    // Arrange
    const { sb, usuario } = cliente

    // Act
    const { data, error } = await sb.from('reservas').select('cliente_id').not('cliente_id', 'is', null)

    // Assert
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every(r => r.cliente_id === usuario.id)).toBe(true)
  })

  it('PI-07 · un cliente no puede cambiar el monto de su propia reserva', async () => {
    // Arrange
    const { sb } = cliente
    const { data: [reserva] } = await sb.from('reservas')
      .select('id, monto_total').eq('estado', 'pendiente').limit(1)

    // Act
    const { data: cambiada, error } = await sb.from('reservas')
      .update({ monto_total: 1 }).eq('id', reserva.id).select('monto_total')

    // si pasó, se devuelve el monto antes de que la prueba falle
    if (cambiada?.length) {
      await sb.from('reservas').update({ monto_total: reserva.monto_total }).eq('id', reserva.id)
    }

    // Assert
    expect(error?.message).toMatch(/solo la puede modificar el complejo/)
    expect(cambiada ?? []).toHaveLength(0)
  })

  it('PI-08 · un cliente no puede leer las notificaciones de otro', async () => {
    // Arrange
    const { sb } = cliente
    const idDelOtro = otro.usuario.id

    // Act
    const { data } = await sb.from('notificaciones').select('id').eq('usuario_id', idDelOtro)

    // Assert
    expect(data ?? []).toHaveLength(0)
  })

  it('PI-09 · un código de canje que no existe es rechazado al revisarlo', async () => {
    // Arrange
    const { sb } = cliente

    // Act
    const { data } = await sb.rpc('revisar_codigo_canje',
      { p_codigo: 'SPK-NOEXISTE', p_empresa: SPORT_CENTER })

    // Assert
    expect(data[0]).toMatchObject({ sirve: false, motivo: 'Ese codigo no existe.' })
  })

  it('PI-10 · no se puede crear una reserva con un código de canje falso', async () => {
    // Arrange
    const { sb, usuario } = cliente
    const { data: [cancha] } = await sb.from('canchas').select('id').eq('empresa_id', SPORT_CENTER).limit(1)
    const reserva = {
      cliente_id: usuario.id, empresa_id: SPORT_CENTER, cancha_id: cancha.id,
      fecha: '2030-01-15', hora_inicio: '10:00', hora_fin: '11:00',
      monto_total: 0, estado: 'pendiente', origen: 'app', codigo_descuento: 'SPK-FALSO',
    }

    // Act
    const { data, error } = await sb.from('reservas').insert(reserva).select('id')

    // Assert
    expect(error?.message).toMatch(/codigo de canje no existe/)
    expect(data).toBeNull()
  })

  it('PI-11 · no se puede publicar un comentario vacío', async () => {
    // Arrange
    const { sb, usuario } = cliente
    const comentario = { empresa_id: SPORT_CENTER, autor_id: usuario.id, texto: '   ' }

    // Act
    const { data, error } = await sb.from('comentarios').insert(comentario).select('id')

    // Assert
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it('PI-12 · un cliente no puede publicar un comentario a nombre de otro', async () => {
    // Arrange
    const { sb } = cliente
    const suplantado = { empresa_id: SPORT_CENTER, autor_id: admin.usuario.id, texto: 'Soy el admin' }

    // Act
    const { data, error } = await sb.from('comentarios').insert(suplantado).select('id')

    // Assert
    expect(error?.message).toMatch(/row-level security/)
    expect(data).toBeNull()
  })

  it('PI-13 · el administrador solo ve las reservas de su propio complejo', async () => {
    // Arrange
    const { sb } = admin

    // Act
    const { data, error } = await sb.from('reservas').select('empresa_id')

    // Assert
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every(r => r.empresa_id === SPORT_CENTER)).toBe(true)
  })

  it('PI-14 · un cliente no puede borrar su propia reserva', async () => {
    // Arrange
    const { sb } = cliente
    const { data: [reserva] } = await sb.from('reservas').select('id').limit(1)

    // Act
    const { data, error } = await sb.from('reservas').delete().eq('id', reserva.id).select('id')

    // Assert
    expect(error?.message).toMatch(/solo la puede modificar el complejo/)
    expect(data ?? []).toHaveLength(0)
  })

  it('PI-15 · el administrador sí puede actualizar las reservas de su complejo', async () => {
    // Arrange: se reescribe la asistencia con el mismo valor que ya tenía
    const { sb } = admin
    const { data: [reserva] } = await sb.from('reservas')
      .select('id, asistencia').eq('empresa_id', SPORT_CENTER).limit(1)

    // Act
    const { data, error } = await sb.from('reservas')
      .update({ asistencia: reserva.asistencia }).eq('id', reserva.id).select('id')

    // Assert
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('PI-16 · el empleado sí puede actualizar las reservas de su complejo', async () => {
    // Arrange
    const empleado = await entrarComo(CUENTAS.empleado)
    const { data: [reserva] } = await empleado.sb.from('reservas')
      .select('id, empresa_id, asistencia').limit(1)

    // Act
    const { data, error } = await empleado.sb.from('reservas')
      .update({ asistencia: reserva.asistencia }).eq('id', reserva.id).select('id')

    // Assert
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})
