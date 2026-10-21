import { describe, it, expect } from 'vitest'
import { generarCruces, ganadorDeLlave, estadoTanda, siguienteRonda,
         partidoTercerPuesto, nombreRonda } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-07 a PU-13 · Fase eliminatoria
// ─────────────────────────────────────────────────────────────────────────────

const fila = (nombre, pos) => ({ nombre, pos })

describe('Cruces de la fase eliminatoria', () => {
  it('PU-07 · con dos grupos el primero de uno se cruza con el segundo del otro', () => {
    // Arrange
    const tablas = {
      A: [fila('A1', 1), fila('A2', 2)],
      B: [fila('B1', 1), fila('B2', 2)],
    }

    // Act
    const cruces = generarCruces(tablas, 2)

    // Assert
    expect(cruces.map(c => [c.equipo1, c.equipo2])).toEqual([['A1', 'B2'], ['B1', 'A2']])
    expect(cruces[0].ronda).toBe('Semifinales')
  })

  it('PU-08 · los primeros de grupos emparejados quedan en lados opuestos del cuadro', () => {
    // Arrange
    const tablas = {}
    for (const g of 'ABCD') tablas[g] = [fila(g + '1', 1), fila(g + '2', 2)]

    // Act
    const cruces = generarCruces(tablas, 2)

    // Assert: A1 va por la izquierda y B1 por la derecha, solo pueden verse en la final
    const lado = (e) => cruces.find(c => c.equipo1 === e).lado
    expect(lado('A1')).toBe('izquierda')
    expect(lado('B1')).toBe('derecha')
  })

  it('PU-09 · el nombre de la ronda depende de cuántas llaves tiene', () => {
    // Arrange
    const llaves = [8, 4, 2, 1]

    // Act
    const nombres = llaves.map(nombreRonda)

    // Assert
    expect(nombres).toEqual(['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'])
  })
})

describe('Ganador de una llave', () => {
  it('PU-10 · gana quien hizo más goles', () => {
    // Arrange
    const llave = { equipo1: 'A', equipo2: 'B', g1: 1, g2: 3, estado: 'finalizado' }

    // Act
    const ganador = ganadorDeLlave(llave)

    // Assert
    expect(ganador).toBe('B')
  })

  it('PU-11 · si terminó empatada y no hay penales todavía no hay ganador', () => {
    // Arrange
    const llave = { equipo1: 'A', equipo2: 'B', g1: 1, g2: 1, estado: 'finalizado' }

    // Act
    const ganador = ganadorDeLlave(llave)

    // Assert
    expect(ganador).toBeNull()
  })

  it('PU-12 · la tanda se corta cuando al rival ya no le alcanzan los tiros', () => {
    // Arrange: 3 goles del equipo 1, 0 del equipo 2, a cada uno le quedan 2
    const tiros = []
    for (let i = 0; i < 3; i++) {
      tiros.push({ equipo: 1, anoto: true }, { equipo: 2, anoto: false })
    }

    // Act
    const estado = estadoTanda(tiros)

    // Assert
    expect(estado.finalizada).toBe(true)
    expect(estado.ganador).toBe(1)
  })

  it('PU-13 · los perdedores de las semifinales juegan el tercer puesto', () => {
    // Arrange
    const semis = siguienteRonda([
      { llave: 'Cuartos 1', equipo1: 'A', equipo2: 'B', g1: 2, g2: 0, estado: 'finalizado', lado: 'izquierda' },
      { llave: 'Cuartos 2', equipo1: 'C', equipo2: 'D', g1: 0, g2: 1, estado: 'finalizado', lado: 'izquierda' },
      { llave: 'Cuartos 3', equipo1: 'E', equipo2: 'F', g1: 3, g2: 1, estado: 'finalizado', lado: 'derecha' },
      { llave: 'Cuartos 4', equipo1: 'G', equipo2: 'H', g1: 0, g2: 2, estado: 'finalizado', lado: 'derecha' },
    ]).map((l, i) => ({ ...l, g1: i === 0 ? 1 : 0, g2: i === 0 ? 0 : 2, estado: 'finalizado' }))

    // Act
    const tercero = partidoTercerPuesto(semis)

    // Assert: A le gana a D; H le gana a E → juegan D y E
    expect([tercero.equipo1, tercero.equipo2]).toEqual(['D', 'E'])
  })
})
