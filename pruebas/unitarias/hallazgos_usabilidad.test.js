import { describe, it, expect, vi, afterEach } from 'vitest'
import { hoyBolivia, fechaDeBolivia, horaDeBolivia } from '../../src/lib/fecha.js'
import { quedanDe, comoUsarCanje, miEquipoEn, yaInscritoEn, pts } from '../../src/lib/datos.js'
import { montoBs } from '../../src/lib/dinero.js'

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
})
