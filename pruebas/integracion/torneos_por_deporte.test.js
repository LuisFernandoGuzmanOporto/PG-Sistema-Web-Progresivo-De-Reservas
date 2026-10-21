import { describe, it, expect } from 'vitest'
import { sortearGrupos, gruposSugeridos, generarFixture, calcularTabla, gruposFinalizados,
         generarCuadro, campeonDelTorneo, partidoTercerPuesto, puntajePorDeporte,
         etiquetasDeTabla, nombreRonda } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-18 a PI-25 · Un torneo completo en cada deporte y con cada tamaño
//
// Para los seis deportes del sistema se juega un torneo de 4, 8, 16 y 32
// equipos: sorteo, fase de grupos completa, tabla de posiciones con el puntaje
// de ese deporte, cuadro eliminatorio ronda por ronda (octavos, cuartos,
// semifinales y final), partido por el tercer puesto y campeón.
//
// Los resultados salen de una «fuerza» fija por equipo, asi la prueba es
// repetible: gana siempre el mas fuerte, y en futbol los parejos empatan.
// ─────────────────────────────────────────────────────────────────────────────

const DEPORTES = ['Fútbol', 'Básquetbol', 'Voleibol', 'Wally', 'Pádel', 'Tenis']
const TAMANOS = [4, 8, 16, 32]
const RONDAS = { 4: ['Semifinales', 'Final'], 8: ['Semifinales', 'Final'], 16: ['Cuartos de final', 'Semifinales', 'Final'],
                 32: ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'] }

/** Un marcador creible para cada deporte: gana el de mayor fuerza. */
function marcador(deporte, fa, fb) {
  const ganaA = fa > fb
  switch (deporte) {
    case 'Fútbol':     return fa === fb ? [1, 1] : ganaA ? [2, 0] : [0, 2]
    case 'Básquetbol': return ganaA ? [78, 64] : [64, 78]
    case 'Voleibol':   return ganaA ? [3, 1] : [1, 3]          // sets
    case 'Wally':      return ganaA ? [2, 1] : [1, 2]          // sets
    default:           return ganaA ? [6, 3] : [3, 6]          // juegos (pádel y tenis)
  }
}

/** Juega un torneo completo y devuelve todo lo que paso. */
function jugarTorneo(deporte, n) {
  const equipos = Array.from({ length: n }, (_, i) => ({ id: i + 1, nombre: 'Equipo ' + (i + 1), fuerza: n - i }))
  const fuerza = new Map(equipos.map(e => [e.nombre, e.fuerza]))
  const numGrupos = gruposSugeridos(n)
  const grupos = sortearGrupos(equipos, numGrupos)
  // En futbol, dos equipos de fuerza par consecutiva empatan: asi la tabla tiene empates reales
  const fz = (e) => deporte === 'Fútbol' ? Math.ceil(e.fuerza / 2) : e.fuerza
  const partidos = generarFixture(grupos).map(p => {
    const [g1, g2] = marcador(deporte, fz(equipos[p.equipo1_id - 1]), fz(equipos[p.equipo2_id - 1]))
    return { ...p, g1, g2, estado: 'finalizado' }
  })
  const tablas = Object.fromEntries(Object.entries(grupos).map(([g, es]) =>
    [g, calcularTabla(es, partidos.filter(p => p.grupo === g), deporte)]))

  // Eliminatoria: se juega ronda por ronda, como la Mesa Tecnica
  const resultados = {}
  let cuadro = generarCuadro(tablas, 2, resultados)
  for (let r = 0; r < cuadro.length; r++) {
    for (const l of cuadro[r]) {
      // En la llave las fuerzas son todas distintas: siempre hay ganador
      const [g1, g2] = marcador(deporte, fuerza.get(l.equipo1), fuerza.get(l.equipo2))
      resultados[l.llave] = { g1, g2, estado: 'finalizado' }
    }
    cuadro = generarCuadro(tablas, 2, resultados)
  }
  return { equipos, grupos, partidos, tablas, cuadro, numGrupos }
}

describe('Torneos de todos los deportes, de 4 a 32 equipos', () => {
  DEPORTES.forEach((deporte, k) => {
    it(`PI-${18 + k} · ${deporte}: torneos de 4, 8, 16 y 32 equipos se juegan completos hasta el campeón`, () => {
      for (const n of TAMANOS) {
        // Arrange
        const pt = puntajePorDeporte(deporte)

        // Act
        const t = jugarTorneo(deporte, n)

        // Assert: grupos
        expect(Object.keys(t.grupos)).toHaveLength(t.numGrupos)
        expect(Object.values(t.grupos).flat()).toHaveLength(n)
        for (const es of Object.values(t.grupos)) {
          const deGrupo = t.partidos.filter(p => p.grupo === Object.keys(t.grupos).find(g => t.grupos[g] === es))
          expect(deGrupo).toHaveLength(es.length * (es.length - 1) / 2)         // todos contra todos
        }
        expect(gruposFinalizados(t.partidos)).toBe(true)

        // Assert: tabla con el puntaje del deporte
        for (const tabla of Object.values(t.tablas)) {
          for (const f of tabla) expect(f.pts).toBe(f.pg * pt.victoria + f.pe * pt.empate)
          if (!pt.admiteEmpate) expect(tabla.every(f => f.pe === 0)).toBe(true)
          // ordenada de mayor a menor
          expect(tabla.map(f => f.pts)).toEqual([...tabla.map(f => f.pts)].sort((a, b) => b - a))
        }

        // Assert: rondas de la eliminatoria y campeon
        expect(t.cuadro.map(r => r[0].ronda)).toEqual(RONDAS[n])
        expect(t.cuadro.at(-1)).toHaveLength(1)
        expect(campeonDelTorneo(t.cuadro)).toBe('Equipo 1')                   // el mas fuerte
        {
          const tercero = partidoTercerPuesto(t.cuadro.at(-2))
          expect(tercero.definido).toBe(true)
          expect([tercero.equipo1, tercero.equipo2]).not.toContain('Equipo 1')
        }
      }
    })
  })

  it('PI-24 · Cada deporte muestra en la tabla sus propias columnas', () => {
    // Arrange
    const esperado = { 'Fútbol': 'GF', 'Básquetbol': 'PF', 'Voleibol': 'SF', 'Wally': 'PF', 'Pádel': 'JF', 'Tenis': 'JF' }

    // Act
    const obtenido = Object.fromEntries(DEPORTES.map(d => [d, etiquetasDeTabla(d).aFavor]))

    // Assert
    expect(obtenido).toEqual(esperado)
  })

  it('PI-25 · En fútbol, una llave empatada solo avanza cuando se cargan los penales', () => {
    // Arrange
    const t = jugarTorneo('Fútbol', 8)
    const tablas = t.tablas
    const semis = generarCuadro(tablas, 2)[0]
    const empate = { [semis[0].llave]: { g1: 1, g2: 1, estado: 'finalizado' } }

    // Act
    const sinPenales = generarCuadro(tablas, 2, empate)
    const conPenales = generarCuadro(tablas, 2, { [semis[0].llave]: { g1: 1, g2: 1, pen1: 3, pen2: 4, estado: 'finalizado' } })

    // Assert
    expect(sinPenales[1][0].definido).toBe(false)
    expect(conPenales[1][0].equipo1).toBe(semis[0].equipo2)
    expect(nombreRonda(1)).toBe('Final')
  })
})
