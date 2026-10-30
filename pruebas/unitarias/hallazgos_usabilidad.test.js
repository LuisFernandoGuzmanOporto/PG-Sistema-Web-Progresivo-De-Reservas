import { describe, it, expect, vi, afterEach } from 'vitest'
import { hoyBolivia } from '../../src/lib/fecha.js'
import { quedanDe, comoUsarCanje } from '../../src/lib/datos.js'

// ─────────────────────────────────────────────────────────────────────────────
// Lo que encontraron las pruebas de usabilidad (migraciones/044)
//
// PU-36 · De noche, las reservas de mañana salían como «Hoy» en el panel del
//         complejo: la fecha se calculaba en UTC, cuatro horas adelante.
// PU-37 · Una recompensa con 5 de stock y 3 canjes seguía diciendo
//         «5 disponibles», y la botella de agua decía que su código servía
//         para inscribir un equipo.
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
})
