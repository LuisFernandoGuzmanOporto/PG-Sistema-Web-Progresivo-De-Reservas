import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hayBase, entrarComo, CUENTAS, SPORT_CENTER } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PT-01 a PT-06 y PT-08 a PT-14 · Transición de estados de una reserva
//
//   (nueva) ──► APARTADA ──► PENDIENTE ──► RECHAZADA   (la franja vuelve a quedar libre)
//                  │     (envía el        │
//                  │      comprobante)    └──► CONFIRMADA ──► asistencia: presente / ausente
//                  │
//                  └──► VENCIDA   (se le pasó el tiempo y otra persona tomó la hora;
//                                  si igual paga, su comprobante queda como prueba)
//
// La hora se aparta 10 minutos mientras el cliente paga (migraciones/038). Para
// no esperar diez minutos, el administrador adelanta el vencimiento del apartado:
// es el mismo cambio que produce el paso del tiempo.
//
// Se trabaja sobre reservas de prueba en una fecha lejana (2030) y al terminar
// se borra todo lo creado, incluidas las notificaciones que generó. La
// confirmación no se ejecuta sobre datos reales porque acredita puntos al
// cliente; su regla se comprueba en PT-04 (el cliente no puede confirmarse).
// ─────────────────────────────────────────────────────────────────────────────

const FECHA = '2030-02-11'
const HORA  = { hora_inicio: '10:00', hora_fin: '11:00' }
const comprobante = (nombre) => `${SPORT_CENTER}/reservas/prueba-${nombre}.png`

describe.skipIf(!hayBase)('Estados de una reserva', () => {
  let cliente, otro, tercero, admin, cancha
  const creadas = []

  /** Lo que hace la pantalla al pulsar «Apartar la hora y pagar»: sin comprobante. */
  const apartar = (quien, hora = HORA) => quien.sb.from('reservas').insert({
    cliente_id: quien.usuario.id, empresa_id: SPORT_CENTER, cancha_id: cancha.id,
    fecha: FECHA, ...hora, monto_total: 0, estado: 'apartada', origen: 'app',
  }).select('id, estado, monto_total, aparta_hasta, created_at').single()

  const enviarComprobante = (quien, id, nombre) =>
    quien.sb.rpc('enviar_comprobante_reserva', { p_reserva: id, p_comprobante: comprobante(nombre) })

  /** El tiempo pasa: el apartado vence ahora mismo. */
  const vencer = (id) => admin.sb.from('reservas')
    .update({ aparta_hasta: new Date(Date.now() - 60000).toISOString() }).eq('id', id)

  const avisosAlComplejo = async (titulo, hora) => {
    const { data } = await admin.sb.from('notificaciones').select('id')
      .eq('titulo', titulo).like('detalle', `%el 11/02 ${hora}%`)
    return (data || []).length
  }

  beforeAll(async () => {
    cliente = await entrarComo(CUENTAS.cliente)
    otro    = await entrarComo(CUENTAS.otroCliente)
    tercero = await entrarComo('diego@email.com')
    admin   = await entrarComo(CUENTAS.admin)
    const { data } = await admin.sb.from('canchas')
      .select('id, precio_hora').eq('empresa_id', SPORT_CENTER).eq('activa', true).limit(1)
    cancha = data[0]
    // si quedó algo de una corrida anterior, se limpia
    await limpiar()
  })

  /** Las reservas de prueba y los avisos que generaron: a los clientes, al
   *  administrador y a los empleados que confirman reservas. */
  async function limpiar() {
    await admin.sb.from('reservas').delete().eq('fecha', FECHA).eq('cancha_id', cancha.id)
    const personas = [CUENTAS.cliente, CUENTAS.otroCliente, CUENTAS.admin,
                      CUENTAS.empleado, 'willy.a@sportika.bo', 'diego@email.com']
    for (const correo of personas) {
      const { sb } = await entrarComo(correo)
      await sb.from('notificaciones').delete().like('detalle', '%el 11/02 %')
    }
  }

  afterAll(async () => {
    if (admin && cancha) await limpiar()
  })

  it('PT-01 · una reserva nueva nace apartada por 10 minutos y con el monto calculado por la base', async () => {
    // Arrange: el cliente manda monto 0 a propósito y todavía no tiene comprobante

    // Act
    const { data, error } = await apartar(cliente)
    if (data) creadas.push(data.id)

    // Assert
    expect(error).toBeNull()
    expect(data.estado).toBe('apartada')
    expect(Number(data.monto_total)).toBe(Number(cancha.precio_hora))
    const minutos = (new Date(data.aparta_hasta) - new Date(data.created_at)) / 60000
    expect(Math.round(minutos)).toBe(10)
  })

  it('PT-02 · mientras está apartada, nadie más puede tomar esa misma franja', async () => {
    // Arrange: la franja ya la tiene apartada el primer cliente

    // Act
    const { data, error } = await apartar(otro)
    if (data) creadas.push(data.id)

    // Assert
    expect(data).toBeNull()
    expect(error?.message).toMatch(/reservas_sin_superponer/)
  })

  it('PT-08 · al enviar el comprobante, la reserva apartada pasa a pendiente y el complejo recibe el aviso', async () => {
    // Arrange: mientras está apartada, el complejo todavía no tiene nada que revisar
    const avisosAntes = await avisosAlComplejo('Nueva reserva por confirmar', '10:00')

    // Act
    const { data, error } = await enviarComprobante(cliente, creadas[0], 'pt08')

    // Assert
    expect(error).toBeNull()
    expect(data.estado).toBe('pendiente')
    expect(data.aparta_hasta).toBeNull()
    expect(avisosAntes).toBe(0)
    expect(await avisosAlComplejo('Nueva reserva por confirmar', '10:00')).toBe(1)
  })

  it('PT-03 · el complejo rechaza la reserva y pasa a estado rechazada', async () => {
    // Arrange
    const id = creadas[0]

    // Act
    const { data, error } = await admin.sb.from('reservas')
      .update({ estado: 'rechazada', confirmado_por: admin.usuario.id,
                fecha_confirmacion: new Date().toISOString() })
      .eq('id', id).select('estado')

    // Assert
    expect(error).toBeNull()
    expect(data[0].estado).toBe('rechazada')
  })

  it('PT-04 · el cliente no puede pasar su reserva a confirmada por su cuenta', async () => {
    // Arrange
    const id = creadas[0]

    // Act
    const { data, error } = await cliente.sb.from('reservas')
      .update({ estado: 'confirmada' }).eq('id', id).select('estado')

    // Assert
    expect(error?.message).toMatch(/solo la puede modificar el complejo/)
    expect(data ?? []).toHaveLength(0)
  })

  it('PT-05 · una reserva rechazada libera la franja para otro cliente', async () => {
    // Arrange: la primera reserva ya está rechazada

    // Act
    const { data, error } = await apartar(otro)
    if (data) creadas.push(data.id)

    // Assert
    expect(error).toBeNull()
    expect(data.estado).toBe('apartada')
  })

  it('PT-06 · el complejo marca la asistencia del cliente', async () => {
    // Arrange: el otro cliente envía su comprobante y su reserva queda pendiente
    const id = creadas[creadas.length - 1]
    await enviarComprobante(otro, id, 'pt06')

    // Act
    const { data, error } = await admin.sb.from('reservas')
      .update({ asistencia: 'ausente' }).eq('id', id).select('asistencia')

    // Assert
    expect(error).toBeNull()
    expect(data[0].asistencia).toBe('ausente')
  })

  let vencido
  it('PT-09 · un apartado vencido deja libre la hora: otro cliente la toma y el apartado queda vencido', async () => {
    // Arrange: el cliente aparta las 12:00 y se le pasa el tiempo sin pagar
    const primero = await apartar(cliente, { hora_inicio: '12:00', hora_fin: '13:00' })
    vencido = primero.data.id
    await vencer(vencido)

    // Act
    const { data, error } = await apartar(otro, { hora_inicio: '12:00', hora_fin: '13:00' })
    if (data) creadas.push(data.id)

    // Assert
    expect(error).toBeNull()
    expect(data.estado).toBe('apartada')
    const { data: antes } = await cliente.sb.from('reservas').select('estado').eq('id', vencido).single()
    expect(antes.estado).toBe('vencida')
  })

  it('PT-10 · un comprobante que llega tarde, con la hora ya tomada, se guarda como prueba del pago', async () => {
    // Arrange: el apartado del cliente ya venció y otra persona tiene las 12:00

    // Act
    const { data, error } = await enviarComprobante(cliente, vencido, 'pt10')

    // Assert: no se pierde el comprobante y el complejo recibe el aviso
    expect(error).toBeNull()
    expect(data.estado).toBe('vencida')
    expect(data.comprobante_url).toBe(comprobante('pt10'))
    expect(await avisosAlComplejo('Pago recibido fuera de tiempo', '12:00')).toBe(1)
  })

  it('PT-11 · un comprobante que llega tarde se acepta si nadie tomó la hora', async () => {
    // Arrange: al otro cliente también se le pasa el tiempo, pero nadie toma las 12:00
    const id = creadas[creadas.length - 1]
    await vencer(id)

    // Act
    const { data, error } = await enviarComprobante(otro, id, 'pt11')

    // Assert
    expect(error).toBeNull()
    expect(data.estado).toBe('pendiente')
  })

  let suelto
  it('PT-12 · un cliente tiene un solo apartado a la vez', async () => {
    // Arrange: el cliente ya tiene apartadas las 14:00
    suelto = (await apartar(cliente, { hora_inicio: '14:00', hora_fin: '15:00' })).data.id

    // Act
    const { data, error } = await apartar(cliente, { hora_inicio: '15:00', hora_fin: '16:00' })

    // Assert
    expect(data).toBeNull()
    expect(error?.message).toMatch(/Ya tienes una hora apartada/)
  })

  it('PT-13 · el cliente suelta su apartado y la hora queda libre al instante', async () => {
    // Arrange: el cliente cierra el pago sin terminar
    await cliente.sb.rpc('soltar_apartado', { p_reserva: suelto })

    // Act
    const { data, error } = await apartar(otro, { hora_inicio: '14:00', hora_fin: '15:00' })

    // Assert
    expect(error).toBeNull()
    expect(data.estado).toBe('apartada')
    await otro.sb.rpc('soltar_apartado', { p_reserva: data.id })
  })

  it('PT-14 · si tres clientes aprietan «Apartar» al mismo tiempo, se queda con la hora el primer pedido que llega', async () => {
    // Arrange: los tres piden las 16:00 en el mismo instante
    const quienes = [cliente, otro, tercero]

    // Act
    const pedidos = await Promise.all(quienes.map(q => apartar(q, { hora_inicio: '16:00', hora_fin: '17:00' })))

    // Assert: uno aparta la hora y los otros dos reciben el aviso antes de ver el QR
    const ganaron = pedidos.filter(p => !p.error)
    const perdieron = pedidos.filter(p => p.error)
    expect(ganaron).toHaveLength(1)
    expect(perdieron).toHaveLength(2)
    for (const p of perdieron) expect(p.error.message).toMatch(/reservas_sin_superponer/)
    const dueno = quienes[pedidos.findIndex(p => !p.error)]
    await dueno.sb.rpc('soltar_apartado', { p_reserva: ganaron[0].data.id })
  })
})

describe.skipIf(!hayBase)('Estados de un código de canje', () => {
  it('PT-07 · un código ya utilizado no vuelve a servir', async () => {
    // Arrange: el canje de Diego que ya se usó en una reserva
    const diego = await entrarComo('diego@email.com')
    const { data: [canje] } = await diego.sb.from('canjes')
      .select('codigo, empresa_id').eq('estado', 'utilizado').limit(1)

    // Act
    const { data } = await diego.sb.rpc('revisar_codigo_canje',
      { p_codigo: canje.codigo, p_empresa: canje.empresa_id })

    // Assert
    expect(data[0]).toMatchObject({ sirve: false, motivo: 'Ese codigo ya se uso.' })
  })
})
