import { describe, it, expect } from 'vitest'
import { horaDelPartido, yaSeJugo, fechaHoraElegida } from '../../src/lib/horaDelPartido.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-34 · La hora de un partido espontáneo (migraciones/040)
//
// Se guarda la fecha y hora real; lo que se muestra se calcula con el reloj
// del momento en que se mira. Una hora después de empezar, el partido ya se
// jugó y deja de aparecer en las listas.
// ─────────────────────────────────────────────────────────────────────────────

describe('Hora de un partido espontáneo', () => {
  it('PU-34 · la hora se dice según el momento en que se mira, y una hora después de empezar el partido ya se jugó', () => {
    // Arrange: jueves 1 de octubre de 2026, a las 18:00
    const ahora = new Date(2026, 9, 1, 18, 0)
    const dentroDe = (min) => new Date(ahora.getTime() + min * 60000).toISOString()

    // Act
    const textos = [-30, 3, 25, 150, 60 * 20, 60 * 24 * 3].map(m => horaDelPartido(dentroDe(m), ahora))
    const manana  = fechaHoraElegida('Mañana', { hora: '08:30' }, ahora)
    const otroDia = fechaHoraElegida('Otro día', { fecha: '2026-10-10', hora: '19:00' }, ahora)

    // Assert
    expect(textos).toEqual(['Ahora', 'Ahora', 'En 25 min', 'Hoy 20:30', 'Mañana 14:00', 'Dom 4 oct, 18:00'])
    expect(yaSeJugo(dentroDe(-59), ahora)).toBe(false)
    expect(yaSeJugo(dentroDe(-61), ahora)).toBe(true)
    expect(new Date(manana)).toEqual(new Date(2026, 9, 2, 8, 30))
    expect(new Date(otroDia)).toEqual(new Date(2026, 9, 10, 19, 0))
    expect(fechaHoraElegida('Ahora mismo', {}, ahora)).toBeNull()          // la pone la base
    expect(fechaHoraElegida('Otro día', { hora: '19:00' }, ahora)).toBeUndefined()   // falta la fecha
  })
})
