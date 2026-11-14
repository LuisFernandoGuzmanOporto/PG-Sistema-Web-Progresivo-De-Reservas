import { describe, it, expect } from 'vitest'
import { calcularTabla, ganadorDeLlave, perdedorDeLlave, ganadorPorSets } from '../../src/lib/torneo.js'

// En wally, vóley y pádel el partido lo gana quien gana los sets, no quien
// hace más puntos. Antes la tabla y la llave comparaban los puntos totales:
// con 15-0, 13-15 y 13-15 le daban la victoria al que perdió en sets.

const E1 = 'eq-panteras'
const E2 = 'eq-halcones'
const SETS = { puntosPorSet: 15, setsParaGanar: 2 }
const punto = (equipo_id, equipo) => ({ tipo: 'gol', equipo_id, equipo })

// Un set que termina a-b, sin que se cierre antes de tiempo
function unSet(a, b) {
  const ev = []
  const parejos = Math.min(a, b)
  for (let i = 0; i < parejos; i++) ev.push(punto(E1, 'Las Panteras'), punto(E2, 'Halcones Wally'))
  for (let i = parejos; i < a; i++) ev.push(punto(E1, 'Las Panteras'))
  for (let i = parejos; i < b; i++) ev.push(punto(E2, 'Halcones Wally'))
  return ev
}

// Las Panteras hace 41 puntos y Halcones 30, pero Halcones gana 2-1 en sets
const partidoPorSets = (extra = {}) => ({
  equipo1: 'Las Panteras', equipo2: 'Halcones Wally', equipo1_id: E1, equipo2_id: E2,
  g1: 41, g2: 30, estado: 'finalizado', sets: SETS,
  eventos: [...unSet(15, 0), ...unSet(13, 15), ...unSet(13, 15)],
  ...extra,
})
const equipos = [{ id: E1, nombre: 'Las Panteras' }, { id: E2, nombre: 'Halcones Wally' }]

describe('Ganador de un partido por sets', () => {
  it('PU-60 · la tabla da la victoria a quien ganó los sets, aunque haya hecho menos puntos', () => {
    // Act
    const tabla = calcularTabla(equipos, [partidoPorSets()], 'Wally')

    // Assert
    const halcones = tabla.find(f => f.nombre === 'Halcones Wally')
    const panteras = tabla.find(f => f.nombre === 'Las Panteras')
    expect(halcones).toMatchObject({ pg: 1, pp: 0, pts: 2, pos: 1 })
    expect(panteras).toMatchObject({ pg: 0, pp: 1, pts: 0 })
    // Los puntos a favor y en contra siguen siendo los del partido
    expect(panteras.gf).toBe(41)
  })

  it('PU-61 · en la llave avanza quien ganó los sets, también si solo trae los nombres', () => {
    // Arrange: una llave creada en la mesa, sin el id del equipo 1
    const llave = partidoPorSets({ equipo1_id: undefined })

    // Act / Assert
    expect(ganadorPorSets(llave)).toBe(2)
    expect(ganadorDeLlave(llave)).toBe('Halcones Wally')
    expect(perdedorDeLlave(llave)).toBe('Las Panteras')
  })

  it('PU-62 · sin ganador de sets todavía, o sin regla de sets, se sigue por el marcador', () => {
    // Arrange: 1-1 en sets (lo que pasó con Las Panteras) y un partido de fútbol
    const sinDefinir = partidoPorSets({ eventos: [...unSet(15, 6), ...unSet(13, 15)], g1: 28, g2: 21 })
    const futbol = { equipo1: 'Las Panteras', equipo2: 'Halcones Wally', g1: 2, g2: 1, estado: 'finalizado' }

    // Act / Assert
    expect(ganadorPorSets(sinDefinir)).toBeNull()
    expect(ganadorPorSets(futbol)).toBeUndefined()
    expect(calcularTabla(equipos, [futbol], 'Fútbol')[0]).toMatchObject({ nombre: 'Las Panteras', pts: 3 })
  })
})
