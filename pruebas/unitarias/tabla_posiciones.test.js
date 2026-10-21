import { describe, it, expect } from 'vitest'
import { calcularTabla, puntajePorDeporte, etiquetasDeTabla } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-01 a PU-06 · Tabla de posiciones
// La tabla nunca se guarda: se calcula desde los partidos finalizados. Si esta
// cuenta falla, todo el torneo muestra posiciones equivocadas.
// ─────────────────────────────────────────────────────────────────────────────

const equipos = [
  { id: 1, nombre: 'Los Cracks' },
  { id: 2, nombre: 'Team Rojo' },
  { id: 3, nombre: 'Atlético Sur' },
]

describe('Tabla de posiciones', () => {
  it('PU-01 · en fútbol una victoria suma 3 puntos, un empate 1 y una derrota 0', () => {
    // Arrange
    const partidos = [
      { equipo1: 'Los Cracks', equipo2: 'Team Rojo', g1: 2, g2: 0, estado: 'finalizado' },
      { equipo1: 'Team Rojo', equipo2: 'Atlético Sur', g1: 1, g2: 1, estado: 'finalizado' },
    ]

    // Act
    const tabla = calcularTabla(equipos, partidos, 'Fútbol')

    // Assert
    const pts = Object.fromEntries(tabla.map(f => [f.nombre, f.pts]))
    expect(pts).toEqual({ 'Los Cracks': 3, 'Team Rojo': 1, 'Atlético Sur': 1 })
  })

  it('PU-02 · solo cuentan los partidos finalizados', () => {
    // Arrange
    const partidos = [
      { equipo1: 'Los Cracks', equipo2: 'Team Rojo', g1: 5, g2: 0, estado: 'en_vivo' },
      { equipo1: 'Los Cracks', equipo2: 'Atlético Sur', g1: 0, g2: 0, estado: 'programado' },
    ]

    // Act
    const tabla = calcularTabla(equipos, partidos, 'Fútbol')

    // Assert
    expect(tabla.every(f => f.pj === 0 && f.pts === 0)).toBe(true)
  })

  it('PU-03 · con igualdad de puntos desempata la diferencia de goles', () => {
    // Arrange
    const partidos = [
      { equipo1: 'Los Cracks', equipo2: 'Atlético Sur', g1: 4, g2: 0, estado: 'finalizado' },
      { equipo1: 'Team Rojo', equipo2: 'Atlético Sur', g1: 1, g2: 0, estado: 'finalizado' },
    ]

    // Act
    const tabla = calcularTabla(equipos, partidos, 'Fútbol')

    // Assert
    expect(tabla.map(f => f.nombre)).toEqual(['Los Cracks', 'Team Rojo', 'Atlético Sur'])
    expect(tabla[0].dif).toBe(4)
  })

  it('PU-04 · con puntos, diferencia y goles iguales desempata el enfrentamiento directo', () => {
    // Arrange: Team Rojo le ganó a Los Cracks, y los dos le ganaron 1-0 a Atlético Sur
    const partidos = [
      { equipo1: 'Los Cracks', equipo2: 'Team Rojo', g1: 1, g2: 2, estado: 'finalizado' },
      { equipo1: 'Los Cracks', equipo2: 'Atlético Sur', g1: 2, g2: 0, estado: 'finalizado' },
      { equipo1: 'Team Rojo', equipo2: 'Atlético Sur', g1: 1, g2: 0, estado: 'finalizado' },
    ]

    // Act
    const tabla = calcularTabla(equipos, partidos, 'Fútbol')

    // Assert
    expect(tabla[0].nombre).toBe('Team Rojo')
    expect(tabla[0].pos).toBe(1)
  })

  it('PU-05 · en los deportes sin empate la victoria vale 2 puntos y no existe la columna de empates', () => {
    // Arrange
    const deporte = 'Voleibol'

    // Act
    const puntaje = puntajePorDeporte(deporte)

    // Assert
    expect(puntaje).toEqual({ victoria: 2, empate: 0, derrota: 0, admiteEmpate: false })
  })

  it('PU-06 · cada deporte usa los nombres de columna que le corresponden', () => {
    // Arrange
    const deportes = ['Fútbol', 'Básquetbol', 'Voleibol', 'Pádel']

    // Act
    const columnas = deportes.map(d => etiquetasDeTabla(d).aFavor)

    // Assert
    expect(columnas).toEqual(['GF', 'PF', 'SF', 'JF'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PU-29 a PU-31 · La tabla en vivo
// Mientras se juega, la tabla que se muestra suma el resultado parcial; la que
// arma el cuadro eliminatorio usa solo partidos terminados.
// ─────────────────────────────────────────────────────────────────────────────
describe('Tabla de posiciones en vivo', () => {
  const eq = [{ id: 1, nombre: 'Halcones' }, { id: 2, nombre: 'Norte' }]
  const enJuego = (g1, g2) => [{ equipo1: 'Halcones', equipo2: 'Norte', g1, g2, estado: 'en_vivo' }]

  it('PU-29 · en fútbol, el equipo que va ganando 1-0 ya suma sus 3 puntos provisionales y queda marcado', () => {
    // Arrange
    const partidos = enJuego(1, 0)

    // Act
    const tabla = calcularTabla(eq, partidos, 'Fútbol', { enVivo: true })

    // Assert
    expect(tabla[0]).toMatchObject({ nombre: 'Halcones', pts: 3, pj: 1, enJuego: 'gana', marcador: '1-0' })
    expect(tabla[1]).toMatchObject({ nombre: 'Norte', pts: 0, enJuego: 'pierde', marcador: '0-1' })
  })

  it('PU-30 · en básquetbol, un partido empatado mientras se juega no suma puntos ni empates', () => {
    // Arrange
    const partidos = enJuego(40, 40)

    // Act
    const tabla = calcularTabla(eq, partidos, 'Básquetbol', { enVivo: true })

    // Assert
    expect(tabla.every(f => f.pts === 0 && f.pe === 0 && f.pj === 1 && f.enJuego === 'empata')).toBe(true)
  })

  it('PU-31 · sin la opción en vivo, el partido en juego no cuenta: el cuadro solo usa resultados definitivos', () => {
    // Arrange
    const partidos = enJuego(3, 0)

    // Act
    const tabla = calcularTabla(eq, partidos, 'Fútbol')

    // Assert
    expect(tabla.every(f => f.pts === 0 && f.pj === 0 && f.enJuego === null)).toBe(true)
  })
})
