import { describe, it, expect } from 'vitest'
import { sortearGrupos, gruposSugeridos, generarFixture, calcularTabla,
         gruposFinalizados, generarCuadro, campeonDelTorneo } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-01 a PI-04 · Integración del motor de torneos
// Verifica que los módulos funcionen juntos: sorteo → fixture → resultados →
// tabla de posiciones → cuadro eliminatorio → campeón, sin tocar la base.
// ─────────────────────────────────────────────────────────────────────────────

const equipos = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nombre: 'Equipo ' + (i + 1) }))

// Resultado fijo para que la prueba sea repetible: gana el de número menor
const jugarTodos = (partidos) => partidos.map(p => ({
  ...p, estado: 'finalizado',
  g1: p.equipo1_id < p.equipo2_id ? 2 : 0,
  g2: p.equipo1_id < p.equipo2_id ? 0 : 2,
}))

describe('Torneo completo de grupos y eliminación', () => {
  it('PI-01 · el sorteo reparte a los 8 equipos en 2 grupos de 4 sin repetir ninguno', () => {
    // Arrange
    const numGrupos = gruposSugeridos(equipos.length)

    // Act
    const grupos = sortearGrupos(equipos, numGrupos)

    // Assert
    expect(Object.keys(grupos)).toEqual(['A', 'B'])
    expect(grupos.A).toHaveLength(4)
    const todos = [...grupos.A, ...grupos.B].map(e => e.id).sort((a, b) => a - b)
    expect(todos).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('PI-02 · el fixture enfrenta a todos contra todos dentro de cada grupo', () => {
    // Arrange
    const grupos = { A: equipos.slice(0, 4), B: equipos.slice(4) }

    // Act
    const partidos = generarFixture(grupos)

    // Assert: 6 partidos por grupo de 4, y ningún cruce repetido
    expect(partidos).toHaveLength(12)
    const cruces = partidos.map(p => [p.equipo1_id, p.equipo2_id].sort().join('-'))
    expect(new Set(cruces).size).toBe(12)
  })

  it('PI-03 · con la fase de grupos terminada el cuadro se arma con los clasificados', () => {
    // Arrange
    const grupos = { A: equipos.slice(0, 4), B: equipos.slice(4) }
    const partidos = jugarTodos(generarFixture(grupos))
    const tablas = {
      A: calcularTabla(grupos.A, partidos.filter(p => p.grupo === 'A')),
      B: calcularTabla(grupos.B, partidos.filter(p => p.grupo === 'B')),
    }

    // Act
    const cuadro = generarCuadro(tablas, 2)

    // Assert
    expect(gruposFinalizados(partidos)).toBe(true)
    expect(cuadro[0].map(l => [l.equipo1, l.equipo2])).toEqual([
      ['Equipo 1', 'Equipo 6'],
      ['Equipo 5', 'Equipo 2'],
    ])
  })

  it('PI-04 · con los resultados de la eliminatoria el sistema declara al campeón', () => {
    // Arrange
    const grupos = { A: equipos.slice(0, 4), B: equipos.slice(4) }
    const partidos = jugarTodos(generarFixture(grupos))
    const tablas = {
      A: calcularTabla(grupos.A, partidos.filter(p => p.grupo === 'A')),
      B: calcularTabla(grupos.B, partidos.filter(p => p.grupo === 'B')),
    }
    const resultados = {
      'Semifinales 1': { g1: 3, g2: 1, estado: 'finalizado' },          // Equipo 1
      'Semifinales 2': { g1: 1, g2: 1, pen1: 4, pen2: 5, estado: 'finalizado' }, // Equipo 2 por penales
      'Final':         { g1: 0, g2: 2, estado: 'finalizado' },          // Equipo 2
    }

    // Act
    const cuadro = generarCuadro(tablas, 2, resultados)
    const campeon = campeonDelTorneo(cuadro)

    // Assert
    expect(cuadro[1][0].equipo1).toBe('Equipo 1')
    expect(cuadro[1][0].equipo2).toBe('Equipo 2')
    expect(campeon).toBe('Equipo 2')
  })
})
