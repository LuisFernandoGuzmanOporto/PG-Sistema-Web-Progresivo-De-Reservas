import { describe, it, expect } from 'vitest'
import { primeroMiDeporte, esMiDeporte } from '../../src/lib/preferencias.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-33 · El deporte favorito del cliente
//
// Lo de su deporte va primero; lo demás sigue debajo, en el mismo orden. No se
// esconde nada: el que juega pádel también encuentra el fútbol si lo busca.
// ─────────────────────────────────────────────────────────────────────────────

describe('Deporte favorito', () => {
  it('PU-33 · lo del deporte favorito aparece primero, sin esconder lo demás ni desordenarlo', () => {
    // Arrange
    const partidos = [
      { id: 1, deporte: 'Fútbol' }, { id: 2, deporte: 'Pádel' },
      { id: 3, deporte: 'Fútbol 5' }, { id: 4, deporte: 'Padel' },
    ]
    const complejos = [
      { id: 'a', deportes: ['Fútbol'] }, { id: 'b', deportes: ['Wally', 'Pádel'] }, { id: 'c', deportes: ['Voleibol'] },
    ]

    // Act
    const porPartido  = primeroMiDeporte(partidos, 'Pádel')
    const porComplejo = primeroMiDeporte(complejos, 'Pádel', c => c.deportes)
    const sinFavorito = primeroMiDeporte(partidos, null)

    // Assert
    expect(porPartido.map(p => p.id)).toEqual([2, 4, 1, 3])          // con o sin tilde, primero
    expect(porComplejo.map(c => c.id)).toEqual(['b', 'a', 'c'])       // un complejo con varios deportes
    expect(sinFavorito).toEqual(partidos)                              // sin elegir, todo igual
    expect(esMiDeporte('Fútbol 5', 'Fútbol')).toBe(true)
    expect(esMiDeporte('Voleibol', 'Fútbol')).toBe(false)
  })
})
