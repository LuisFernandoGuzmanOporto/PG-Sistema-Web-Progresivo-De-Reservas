import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hayBase, entrar, puntosDe, dejarComoEstaba, SPORT_CENTER, CANCHA_FUTBOL, CANCHA_PADEL } from './apoyo.js'
import { entrarComo } from '../integracion/conexion.js'
import { traducirError } from '../../src/lib/errores.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-43 a PS-48 · Todo al mismo tiempo
//
// Lo que pasa cuando varias personas tocan el mismo boton en el mismo
// instante. Cada cuenta usa su propia sesion y las peticiones salen juntas
// (Promise.all): llegan a la base con milisegundos de diferencia, como si
// cada uno estuviera en su celular. La base es la que tiene que poner orden.
// ─────────────────────────────────────────────────────────────────────────────

const CLIENTES = ['juan', 'marco', 'luisa', 'ana', 'juanr', 'diego', 'sandra', 'juant', 'carlos']
const DIA = '2031-08-04'                      // lunes
// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const puntosAntes = {}
const OCUPADO = 'Otra persona acaba de reservar ese horario. Elige otro horario disponible.'

/** La misma fila que manda guardarReserva, con la sesion de cada uno. */
const reservar = (s, cancha, desde, hasta) => s.sb.from('reservas').insert({
  cliente_id: s.id, empresa_id: SPORT_CENTER, cancha_id: cancha, fecha: DIA,
  hora_inicio: desde, hora_fin: hasta, monto_total: 0, estado: 'pendiente', origen: 'app',
  comprobante_url: 'prueba/comprobante.png',
}).select().single()

const seSolapan = (a, b) => a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin

describe.skipIf(!hayBase)('Concurrencia: varias personas al mismo tiempo', () => {
  let partido, torneo

  beforeAll(async () => {
    for (const q of CLIENTES) puntosAntes[q] = await puntosDe(q)
    await Promise.all([...CLIENTES, 'admin', 'rosa', 'willy', 'superadmin'].map(entrar))
  })

  afterAll(async () => {
    const admin = await entrar('admin')
    const diego = await entrar('diego')
    await dejarComoEstaba({
      inicio, puntosAntes,
      borrar: [
        async () => admin.sb.from('reservas').delete().eq('fecha', DIA),
        async () => partido && diego.sb.from('partidos_espontaneos').delete().eq('id', partido.id),
        async () => torneo && admin.sb.from('torneos').delete().eq('id', torneo.id),
      ],
    })
  })

  it('PS-43 · Nueve clientes reservan la misma hora en el mismo instante: solo uno se la queda', async () => {
    // Arrange
    const sesiones = await Promise.all(CLIENTES.map(entrar))

    // Act
    const r = await Promise.all(sesiones.map(s => reservar(s, CANCHA_FUTBOL, '10:00', '11:00')))

    // Assert
    const ganadas = r.filter(x => !x.error)
    const perdidas = r.filter(x => x.error)
    expect(ganadas).toHaveLength(1)
    expect(perdidas).toHaveLength(8)
    expect(perdidas.map(x => traducirError(x.error))).toEqual(Array(8).fill(OCUPADO))
  })

  it('PS-44 · Cuatro clientes piden a la vez horarios que se pisan en parte: nunca quedan dos superpuestos', async () => {
    // Arrange
    const [a, b, c, d] = await Promise.all(['juan', 'marco', 'luisa', 'ana'].map(entrar))
    const pedidos = [[a, '13:00', '15:00'], [b, '14:00', '16:00'], [c, '15:00', '17:00'], [d, '12:00', '14:00']]

    // Act
    const r = await Promise.all(pedidos.map(([s, i, f]) => reservar(s, CANCHA_FUTBOL, i, f)))

    // Assert
    const ganadas = r.filter(x => !x.error).map(x => x.data)
    expect(ganadas.length).toBeGreaterThanOrEqual(1)
    for (let i = 0; i < ganadas.length; i++)
      for (let j = i + 1; j < ganadas.length; j++)
        expect(seSolapan(ganadas[i], ganadas[j])).toBe(false)
  })

  it('PS-45 · Un cliente toca dos veces «Enviar Reserva» muy rápido: se guarda una sola', async () => {
    // Arrange
    const juanr = await entrar('juanr')

    // Act
    const r = await Promise.all([reservar(juanr, CANCHA_PADEL, '18:00', '19:00'),
                                 reservar(juanr, CANCHA_PADEL, '18:00', '19:00')])

    // Assert
    expect(r.filter(x => !x.error)).toHaveLength(1)
    const { data } = await juanr.sb.from('reservas').select('id').eq('fecha', DIA).eq('hora_inicio', '18:00:00')
    expect(data).toHaveLength(1)
  })

  it('PS-46 · Rosa y Willy confirman la misma reserva a la vez: queda confirmada y el cliente cobra sus puntos una sola vez', async () => {
    // Arrange
    const sandra = await entrar('sandra')
    const { data: reserva } = await reservar(sandra, CANCHA_PADEL, '08:00', '09:00')
    const antes = await puntosDe('sandra')
    const [rosa, willy] = await Promise.all(['rosa', 'willy'].map(entrar))
    const confirmar = (s) => s.sb.from('reservas').update({ estado: 'confirmada', confirmado_por: s.id,
      fecha_confirmacion: new Date().toISOString() }).eq('id', reserva.id).select()

    // Act
    const r = await Promise.all([confirmar(rosa), confirmar(willy)])

    // Assert
    expect(r.every(x => !x.error)).toBe(true)
    const { data } = await rosa.sb.from('reservas').select('estado').eq('id', reserva.id).single()
    expect(data.estado).toBe('confirmada')
    expect(await puntosDe('sandra')).toBe(antes + 5)
  })

  it('PS-47 · Cinco clientes van por el último lugar de un partido al mismo tiempo: entra uno solo', async () => {
    // Arrange: partido de 2, con su creador ya anotado
    const diego = await entrar('diego')
    const { data } = await diego.sb.from('partidos_espontaneos').insert({ empresa_id: SPORT_CENTER,
      cancha_id: CANCHA_PADEL, creador_id: diego.id, deporte: 'Pádel',
      apuesta: 'Concurrencia (prueba del sistema)', max_jugadores: 2 }).select().single()
    partido = data
    await diego.sb.from('partido_jugadores').insert({ partido_id: partido.id, jugador_id: diego.id, nombre: diego.nombre })
    const aspirantes = await Promise.all(['juan', 'marco', 'luisa', 'ana', 'carlos'].map(entrar))

    // Act
    const r = await Promise.all(aspirantes.map(s => s.sb.from('partido_jugadores')
      .insert({ partido_id: partido.id, jugador_id: s.id, nombre: s.nombre })))

    // Assert
    expect(r.filter(x => !x.error)).toHaveLength(1)
    expect(r.filter(x => x.error).every(x => /completo/.test(x.error.message))).toBe(true)
    const { data: anotados } = await diego.sb.from('partido_jugadores').select('id').eq('partido_id', partido.id)
    expect(anotados).toHaveLength(2)
  })

  it('PS-48 · El administrador aprueba seis equipos a la vez desde dos dispositivos en un torneo de cuatro: quedan cuatro', async () => {
    // Arrange
    const admin = await entrar('admin')
    const { data: t } = await admin.sb.from('torneos').insert({ empresa_id: SPORT_CENTER, creador_id: admin.id,
      creador_tipo: 'complejo', nombre: 'Cupo concurrente (prueba del sistema)', deporte: 'Fútbol',
      max_equipos: 4, estado: 'inscripciones' }).select().single()
    torneo = t
    const capitanes = await Promise.all(['juan', 'marco', 'luisa', 'ana', 'juanr', 'diego'].map(entrar))
    const equipos = []
    for (const [i, s] of capitanes.entries()) {
      const { data: e } = await s.sb.from('equipos').insert({ torneo_id: torneo.id, nombre: 'Concurrente ' + (i + 1),
        capitan_id: s.id, capitan_nombre: s.nombre, estado: 'pendiente' }).select().single()
      equipos.push(e)
    }
    // El mismo administrador con dos sesiones: la compu y el celular
    const celular = await entrarComo('pedro@sportcenter.com')

    // Act
    const r = await Promise.all(equipos.map((e, i) => (i % 2 ? celular.sb : admin.sb)
      .from('equipos').update({ estado: 'aprobado' }).eq('id', e.id).select()))

    // Assert
    const { data: aprobados } = await admin.sb.from('equipos').select('id')
      .eq('torneo_id', torneo.id).eq('estado', 'aprobado')
    expect(aprobados).toHaveLength(4)
    expect(r.filter(x => x.error).every(x => /ya tiene sus 4 equipos/.test(x.error.message))).toBe(true)
  })
})
