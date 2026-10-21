import { describe, it, expect } from 'vitest'
import { suspensionesPara, validarDorsales } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-14 a PU-18 · Sanciones y habilitación de jugadores
// ─────────────────────────────────────────────────────────────────────────────

const EQUIPO = 10
const partido = (id, estado, eventos = [], creado) => ({
  id, estado, eventos, equipo1_id: EQUIPO, equipo2_id: 99,
  creado: creado || `2026-09-0${id}T10:00:00Z`,
})
const evento = (tipo, jugador) => ({ tipo, jugador_id: jugador, equipo_id: EQUIPO })

describe('Suspensiones', () => {
  it('PU-14 · el jugador expulsado se pierde el partido siguiente', () => {
    // Arrange
    const partidos = [
      partido(1, 'finalizado', [evento('roja', 7)]),
      partido(2, 'programado'),
    ]

    // Act
    const suspendidos = suspensionesPara(partidos[1], partidos, EQUIPO)

    // Assert
    expect(suspendidos).toEqual([
      { jugador_id: 7, motivo: 'roja', detalle: 'Expulsado en el partido anterior' },
    ])
  })

  it('PU-15 · la roja solo suspende un partido, no los siguientes', () => {
    // Arrange
    const partidos = [
      partido(1, 'finalizado', [evento('roja', 7)]),
      partido(2, 'finalizado'),
      partido(3, 'programado'),
    ]

    // Act
    const suspendidos = suspensionesPara(partidos[2], partidos, EQUIPO)

    // Assert
    expect(suspendidos).toEqual([])
  })

  it('PU-16 · dos amarillas acumuladas suspenden el partido siguiente', () => {
    // Arrange
    const partidos = [
      partido(1, 'finalizado', [evento('amarilla', 5)]),
      partido(2, 'finalizado', [evento('amarilla', 5)]),
      partido(3, 'programado'),
    ]

    // Act
    const suspendidos = suspensionesPara(partidos[2], partidos, EQUIPO)

    // Assert
    expect(suspendidos.map(s => [s.jugador_id, s.motivo])).toEqual([['5', 'amarillas']])
  })

  it('PU-17 · una amarilla sola no suspende a nadie', () => {
    // Arrange
    const partidos = [
      partido(1, 'finalizado', [evento('amarilla', 5)]),
      partido(2, 'programado'),
    ]

    // Act
    const suspendidos = suspensionesPara(partidos[1], partidos, EQUIPO)

    // Assert
    expect(suspendidos).toHaveLength(0)
  })
})

describe('Números de camiseta', () => {
  it('PU-18 · no se permiten dos jugadores con el mismo número ni números fuera de 1 a 99', () => {
    // Arrange
    const jugadores = [{ dorsal: 10 }, { dorsal: 10 }, { dorsal: 150 }, { dorsal: 7 }]

    // Act
    const errores = validarDorsales(jugadores)

    // Assert
    expect(errores).toEqual({
      1: 'El dorsal 10 ya lo usa el jugador 1.',
      2: 'El dorsal debe ser un número entre 1 y 99.',
    })
  })
})
