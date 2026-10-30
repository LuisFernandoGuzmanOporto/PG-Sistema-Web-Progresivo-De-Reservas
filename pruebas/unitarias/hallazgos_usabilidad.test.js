import { describe, it, expect, vi, afterEach } from 'vitest'
import { hoyBolivia, fechaDeBolivia, horaDeBolivia, fechaCorta, diaDeReserva, diasLegibles, conTildes } from '../../src/lib/fecha.js'
import { quedanDe, comoUsarCanje, miEquipoEn, yaInscritoEn, pts, estadoDeTorneo, torneoActivo,
         porRevisar, reservasQueChocan, RESERVAS_EMPRESA, reservaTerminada, estadoDeMiReserva,
         ordenarReservas } from '../../src/lib/datos.js'
import { montoBs, miles } from '../../src/lib/dinero.js'

// ─────────────────────────────────────────────────────────────────────────────
// Lo que encontraron las pruebas de usabilidad (migraciones/044)
//
// PU-36 · De noche, las reservas de mañana salían como «Hoy» en el panel del
//         complejo: la fecha se calculaba en UTC, cuatro horas adelante.
// PU-37 · Una recompensa con 5 de stock y 3 canjes seguía diciendo
//         «5 disponibles», y la botella de agua decía que su código servía
//         para inscribir un equipo.
// PU-38 · Lo hecho después de las 20:00 figuraba con fecha del día siguiente:
//         created_at llega en UTC y se cortaban sus primeros 10 caracteres.
// PU-39 · Una reserva con descuento costaba «Bs. 79.2», y un canje de un punto
//         decía «Se descontaron 1 pts».
// PU-40 · El cliente no veía su equipo pendiente y el torneo le seguía
//         ofreciendo inscribirse (migraciones/045).
// PU-41 · La Copa Interna decía «En curso» dos meses después de terminar, y
//         «Torneos activos» contaba uno con las inscripciones cerradas.
// PU-42 · El Dashboard decía «4 pagos pendientes» y Reservas «Por revisar: 0».
// PU-43 · Un entrenamiento se publicó encima de una reserva pagada.
// PU-44 · Fechas «Mañana - 2026-10-31», «17-sept», «Mie», «2,590».
// PU-45 · A la 1:43 p. m. «Próximas reservas» mostraba las de las 10:00 y las
//         11:00; Mis Reservas estaba desordenada y decía «Pendiente» en
//         reservas que ya habían pasado sin que nadie las revisara.
// PU-46 · El horario de un torneo decía «Sab, Dom».
// ─────────────────────────────────────────────────────────────────────────────

describe('Hallazgos de las pruebas de usabilidad', () => {
  afterEach(() => vi.useRealTimers())

  it('PU-36 · a las 21:50 de Bolivia, «hoy» sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    // Arrange: 29 de octubre a las 21:50 en Bolivia = 30 de octubre 01:50 en UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T01:50:00Z'))

    // Act
    const hoy = hoyBolivia()
    const enUTC = new Date().toISOString().slice(0, 10)

    // Assert
    expect(hoy).toBe('2026-10-29')
    expect(enUTC).toBe('2026-10-30')          // lo que hacía antes el panel
  })

  it('PU-37 · quedan las que el complejo ofreció menos las ya canjeadas, y cada tipo explica su código', () => {
    // Arrange
    const conCanjes = { stock: 5, canjeados: 3 }
    const agotada = { stock: 2, canjeados: 2 }
    const deMas = { stock: 1, canjeados: 4 }   // canjes de antes de que se controlara el stock

    // Act
    const quedan = [conCanjes, agotada, deMas].map(quedanDe)

    // Assert
    expect(quedan).toEqual([2, 0, 0])
    expect(comoUsarCanje('fisico', 'Sport Center')).toMatch(/mostrador de Sport Center/)
    expect(comoUsarCanje('fisico')).not.toMatch(/inscribir/)
    expect(comoUsarCanje('descuento_reserva')).toMatch(/reserva/)
    expect(comoUsarCanje('torneo_gratis')).toMatch(/inscribir tu equipo/)
  })

  it('PU-38 · un registro de las 21:50 en Bolivia lleva la fecha y la hora de Bolivia, no las de UTC', () => {
    // Arrange: así devuelve Supabase un created_at
    const creadoEn = '2026-10-30T01:50:00+00:00'

    // Act
    const fecha = fechaDeBolivia(creadoEn)
    const hora = horaDeBolivia(creadoEn)

    // Assert
    expect(fecha).toBe('2026-10-29')
    expect(hora).toBe('21:50')
    expect(String(creadoEn).slice(0, 10)).toBe('2026-10-30')   // lo que se mostraba antes
    expect(fechaDeBolivia(null)).toBe('')
  })

  it('PU-39 · los montos van con coma y dos decimales, y un punto no va en plural', () => {
    // Arrange: 2 horas de Bs. 44 con 10 % de descuento
    const conDescuento = 2 * 44 * 0.9

    // Act y Assert
    expect(montoBs(conDescuento)).toBe('79,20')
    expect(montoBs(80)).toBe('80')
    expect(montoBs(1250.5)).toBe('1.250,50')
    expect(montoBs(0.1 + 0.2)).toBe('0,30')                   // sin restos de la coma flotante
    expect(montoBs(null)).toBe('—')
    expect(pts(1)).toBe('1 pt')
    expect(pts(5)).toBe('5 pts')
  })

  it('PU-40 · el cliente encuentra su equipo pendiente y no puede inscribir otro; uno rechazado no lo bloquea', () => {
    // Arrange
    const yo = 'u-1'
    const pendiente = { id: 'e-1', estado: 'pendiente', integrantes_ids: [yo] }
    const rechazado = { id: 'e-2', estado: 'rechazado', integrantes_ids: [yo] }
    const ajeno = { id: 'e-3', estado: 'aprobado', integrantes_ids: ['u-2'] }

    // Act
    const conPendiente = { equipos: [ajeno, pendiente] }
    const soloRechazado = { equipos: [ajeno, rechazado] }
    const volvioAInscribirse = { equipos: [rechazado, ajeno, pendiente] }

    // Assert
    expect(miEquipoEn(conPendiente, yo)).toBe(pendiente)
    expect(yaInscritoEn(conPendiente, yo)).toBe(pendiente)
    expect(miEquipoEn(soloRechazado, yo)).toBe(rechazado)
    expect(yaInscritoEn(soloRechazado, yo)).toBeNull()
    expect(miEquipoEn(volvioAInscribirse, yo)).toBe(pendiente)
    expect(yaInscritoEn({ equipos: [ajeno] }, yo)).toBeNull()
  })

  it('PU-41 · un torneo cuya última fecha pasó no figura «En curso» ni cuenta como activo', () => {
    // Arrange: hoy es 30 de octubre en Bolivia
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T15:00:00Z'))
    const copaInterna = { estado: 'en_curso', fechaFinISO: '2026-09-06' }
    const cerrado     = { estado: 'inscripciones', inscripcionHastaISO: '2026-10-15', fechaFinISO: '2026-11-20' }
    const abierto     = { estado: 'inscripciones', inscripcionHastaISO: '2026-11-04', fechaFinISO: '2026-11-22' }
    const jugandose   = { estado: 'en_curso', fechaFinISO: '2026-11-15' }

    // Act y Assert
    expect(estadoDeTorneo(copaInterna).corto).toBe('Sin cerrar')
    expect(estadoDeTorneo(cerrado).corto).toBe('Cerrado')
    expect([copaInterna, cerrado, abierto, jugandose].filter(torneoActivo)).toEqual([abierto, jugandose])
  })

  it('PU-42 · por revisar es la reserva pendiente de un cliente cuyo día todavía no pasó', () => {
    // Arrange
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T15:00:00Z'))

    // Act y Assert
    expect(porRevisar({ estado: 'pendiente', origen: 'app', fechaISO: '2026-10-31' })).toBe(true)
    expect(porRevisar({ estado: 'pendiente', origen: 'app', fechaISO: '2026-10-30' })).toBe(true)
    expect(porRevisar({ estado: 'pendiente', origen: 'app', fechaISO: '2026-10-02' })).toBe(false)   // ya pasó
    expect(porRevisar({ estado: 'pendiente', origen: 'torneo', fechaISO: '2026-11-07' })).toBe(false)
    expect(porRevisar({ estado: 'confirmada', origen: 'app', fechaISO: '2026-10-31' })).toBe(false)
  })

  it('PU-43 · un entrenamiento de viernes 11:00 a 23:00 choca con la reserva del viernes a las 11:00', () => {
    // Arrange: hoy viernes 30 de octubre; una reserva confirmada y otra rechazada
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T15:00:00Z'))
    const base = { empresa_id: 'emp-prueba', cancha: 'Cancha de Wally 1', origen: 'app' }
    const pagada    = { ...base, nro: 'RSV-2026-02937', estado: 'confirmada', fechaISO: '2026-10-30', horaInicio: '11:00', horaFin: '12:00' }
    const rechazada = { ...base, nro: 'RSV-X', estado: 'rechazada', fechaISO: '2026-11-06', horaInicio: '15:00', horaFin: '16:00' }
    const otroDia   = { ...base, nro: 'RSV-Y', estado: 'confirmada', fechaISO: '2026-10-31', horaInicio: '11:00', horaFin: '12:00' }
    RESERVAS_EMPRESA.push(pagada, rechazada, otroDia)

    try {
      // Act
      const choques = reservasQueChocan({ empresaId: 'emp-prueba', cancha: 'Cancha de Wally 1',
        dias: ['Vie'], horaInicio: '11:00', horaFin: '23:00' })
      const despues = reservasQueChocan({ empresaId: 'emp-prueba', cancha: 'Cancha de Wally 1',
        dias: ['Vie'], horaInicio: '12:00', horaFin: '14:00' })

      // Assert
      expect(choques.map(r => r.nro)).toEqual(['RSV-2026-02937'])
      expect(despues).toEqual([])
    } finally {
      for (const r of [pagada, rechazada, otroDia]) RESERVAS_EMPRESA.splice(RESERVAS_EMPRESA.indexOf(r), 1)
    }
  })

  it('PU-44 · las fechas, los días y los números se escriben como en Bolivia', () => {
    // Act y Assert
    expect(diaDeReserva('2026-10-31', '2026-10-30')).toBe('Mañana, sáb 31 oct')
    expect(diaDeReserva('2026-10-30', '2026-10-30')).toBe('Hoy, vie 30 oct')
    expect(diaDeReserva('2026-11-03', '2026-10-30')).toBe('Mar 3 nov')
    expect(fechaCorta('2026-09-17')).toBe('17 Sep')
    expect(diasLegibles(['Lun', 'Mie', 'Sab'])).toBe('Lun, Mié, Sáb')
    expect(miles(2590)).toBe('2.590')
  })

  it('PU-45 · a la 1:43 p. m. ya terminaron las reservas de las 10:00 y las 11:00, y la pendiente vieja dice que ya pasó', () => {
    // Arrange: viernes 30 de octubre, 13:43 en Bolivia
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T17:43:00Z'))
    const deLas10   = { fechaISO: '2026-10-30', horaInicio: '10:00', horaFin: '11:00', estado: 'pendiente' }
    const deLas11   = { fechaISO: '2026-10-30', horaInicio: '11:00', horaFin: '12:00', estado: 'confirmada' }
    const deLaTarde = { fechaISO: '2026-10-30', horaInicio: '18:00', horaFin: '19:00', estado: 'pendiente' }
    const manana    = { fechaISO: '2026-10-31', horaInicio: '09:00', horaFin: '10:00', estado: 'confirmada' }
    const deMayo    = { fechaISO: '2026-05-28', horaInicio: '16:00', horaFin: '17:00', estado: 'pendiente' }
    const hastaMedianoche = { fechaISO: '2026-10-30', horaInicio: '23:00', horaFin: '00:00', estado: 'confirmada' }

    // Act
    const terminadas = [deLas10, deLas11, deLaTarde, manana, deMayo, hastaMedianoche].filter(reservaTerminada)
    const orden = ordenarReservas([deMayo, manana, deLas10, deLaTarde, deLas11])

    // Assert
    expect(terminadas).toEqual([deLas10, deLas11, deMayo])
    expect(estadoDeMiReserva(deMayo)).toBe('pasada')
    expect(estadoDeMiReserva(deLas10)).toBe('pasada')
    expect(estadoDeMiReserva(deLaTarde)).toBe('pendiente')
    // Lo que viene primero (lo más cercano antes); después lo pasado, lo último primero
    expect(orden).toEqual([deLaTarde, manana, deLas11, deLas10, deMayo])
  })

  it('PU-46 · los días dentro del horario de un torneo llevan tilde', () => {
    // Act y Assert
    expect(conTildes('Sab, Dom: 14:00 a 18:00')).toBe('Sáb, Dom: 14:00 a 18:00')
    expect(conTildes('Lun, Mie, Vie: 19:00 a 21:00')).toBe('Lun, Mié, Vie: 19:00 a 21:00')
    expect(conTildes('Sábados y domingos')).toBe('Sábados y domingos')
    expect(conTildes(null)).toBe('')
  })
})
