import { describe, it, expect } from 'vitest'
import { aceptaInscripciones, inscripcionVencida, estadoDeTorneo } from '../../src/lib/datos.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-35 · La fecha límite de inscripción (migraciones/043)
//
// Hasta el día límite inclusive, el torneo acepta equipos. Al día siguiente
// deja de aceptarlos y deja de decir «Abierto», aunque el organizador todavía
// no lo haya empezado.
// ─────────────────────────────────────────────────────────────────────────────

const dentroDeDias = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

describe('Fecha límite de inscripción', () => {
  it('PU-35 · un torneo deja de aceptar equipos al día siguiente de su fecha límite y pasa a decir «Cerrado»', () => {
    // Arrange: torneos del complejo, con la cancha ya aprobada
    const torneo = (hasta, estado = 'inscripciones') =>
      ({ estado, creador_tipo: 'complejo', inscripcionHastaISO: hasta })
    const enTresDias = torneo(dentroDeDias(3)), hoy = torneo(dentroDeDias(0))
    const ayer = torneo(dentroDeDias(-1)), sinFecha = torneo(null)

    // Act
    const aceptan = [enTresDias, hoy, ayer, sinFecha].map(aceptaInscripciones)

    // Assert
    expect(aceptan).toEqual([true, true, false, true])
    expect(estadoDeTorneo(ayer).corto).toBe('Cerrado')
    expect(estadoDeTorneo(enTresDias).corto).toBe('Abierto')
    expect(inscripcionVencida(torneo(dentroDeDias(-1), 'en_curso'))).toBe(false)   // ya empezó: dice «En Curso»
  })
})
