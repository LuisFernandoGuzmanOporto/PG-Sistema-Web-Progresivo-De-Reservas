import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

vi.mock('../../src/lib/supabase.js', async () =>
  ({ supabase: (await import('./apoyo.js')).supabaseDelActor }))

import { hayBase, como, entrar, puntosDe, dejarComoEstaba, SPORT_CENTER } from './apoyo.js'
import { guardarTorneo, guardarEquipo, resolverEquipo, guardarSorteo, guardarPartidoTorneo,
         asegurarPartidoDeLlave, cerrarTorneo } from '../../src/lib/guardar.js'
import { cargarDatos } from '../../src/lib/carga.js'
import { torneoPorId, equiposPorGrupo } from '../../src/lib/datos.js'
import { sortearGrupos, generarFixture, calcularTabla, generarCuadro, resultadosDeLlave,
         campeonDelTorneo, etiquetasDeTabla } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-35 a PS-42 · Torneos de Wally y de Pádel, seguidos por otro cliente
//
// El complejo organiza un torneo de cada deporte que se juega por sets o por
// juegos. Cuatro clientes inscriben su equipo, el administrador aprueba y
// sortea, la mesa técnica carga los resultados y Marco —que no juega— sigue
// el torneo desde su cuenta: lo que se comprueba es exactamente lo que calcula
// su pantalla (TorneoDetalle y En Vivo) con los datos que le llegan.
// ─────────────────────────────────────────────────────────────────────────────

// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const puntosAntes = {}
const creados = []

const ESCENARIOS = [
  { deporte: 'Wally', desde: 35, cancha: 'c0000000-0000-4000-8000-000000000004', precioHora: 60,
    capitanes: ['luisa', 'ana', 'juanr', 'diego'], fechas: ['2031-06-07', '2031-06-28'],
    dias: ['Sab'], puntosPorSet: 21, setsParaGanar: 2,
    // [sets ganados por A, por B]: el equipo inscrito antes gana siempre
    marcador: (ganaA) => ganaA ? [2, 1] : [1, 2] },
  { deporte: 'Pádel', desde: 39, cancha: 'c0000000-0000-4000-8000-000000000007', precioHora: 90,
    capitanes: ['sandra', 'juant', 'carlos', 'juan'], fechas: ['2031-07-06', '2031-07-27'],
    dias: ['Dom'], puntosPorSet: null, setsParaGanar: null,
    marcador: (ganaA) => ganaA ? [6, 4] : [4, 6] },
]

/** Lo que ve Marco: carga la aplicacion y arma las tablas como TorneoDetalle. */
async function loQueVeMarco(torneoId) {
  await como('marco')
  await cargarDatos({ forzar: true })
  const t = torneoPorId(torneoId)
  const porGrupo = equiposPorGrupo(t)
  const tablas = Object.fromEntries(Object.entries(porGrupo).map(([g, eqs]) =>
    [g, calcularTabla(eqs, t.partidos.filter(p => p.grupo === g), t.deporteKey)]))
  return { t, tablas }
}

describe.skipIf(!hayBase)('Torneos de Wally y Pádel seguidos por otro cliente', () => {
  beforeAll(async () => {
    for (const q of ['luisa', 'ana', 'juanr', 'diego', 'sandra', 'juant', 'carlos', 'juan', 'marco'])
      puntosAntes[q] = await puntosDe(q)
    await Promise.all(['admin', 'rosa', 'willy', 'superadmin'].map(entrar))
  })

  afterAll(async () => {
    const admin = await entrar('admin')
    await dejarComoEstaba({
      inicio, puntosAntes,
      borrar: [
        async () => creados.length && admin.sb.from('torneos').delete().in('id', creados),
        async () => admin.sb.from('torneos').delete().ilike('nombre', '%(prueba del sistema)%'),
      ],
    })
  })

  for (const E of ESCENARIOS) {
    const id = (k) => 'PS-' + String(E.desde + k).padStart(2, '0')
    let torneo, equipos = []

    it(`${id(0)} · ${E.deporte}: el complejo organiza un torneo de 4 equipos, se inscriben, se aprueban y se sortean`, async () => {
      // Arrange
      await como('admin')
      const r = await guardarTorneo({
        empresaId: SPORT_CENTER, canchaId: E.cancha, creadorTipo: 'complejo',
        nombre: `Copa de ${E.deporte} (prueba del sistema)`, deporte: E.deporte,
        formato: 'Grupos + Eliminacion', maxEquipos: 4, jugadoresPorEquipo: 2, jugadoresMin: 2, jugadoresMax: 3,
        puntosPorSet: E.puntosPorSet, setsParaGanar: E.setsParaGanar, precio: 0,
        fechaInicio: E.fechas[0], fechaFin: E.fechas[1], inscripcionHasta: '2031-05-30',
        dias: E.dias, horaInicio: '08:00', horaFin: '12:00', precioHora: E.precioHora,
      })
      torneo = r.torneo; creados.push(torneo.id)

      // Act
      for (const [i, q] of E.capitanes.entries()) {
        const s = await como(q)
        const inscripcion = await guardarEquipo({ torneoId: torneo.id, nombre: `${E.deporte} ${i + 1}`,
          capitanNombre: s.nombre, jugadores: [{ nombre: 'Jugador A', dorsal: 1 }, { nombre: 'Jugador B', dorsal: 2 }] })
        equipos.push(inscripcion.equipo)
      }
      await como('admin')
      equipos = (await Promise.all(equipos.map(e => resolverEquipo(e.id, 'aprobado')))).map(x => x.filas[0])
      const grupos = sortearGrupos(equipos, 1)
      const sorteo = await guardarSorteo(torneo.id, grupos.A.map(e => ({ equipoId: e.id, grupo: 'A' })),
        generarFixture(grupos).map(p => ({ equipoA: p.equipo1_id, equipoB: p.equipo2_id, fase: 'grupos', grupo: 'A' })))

      // Assert
      expect(r.error).toBeUndefined()
      expect(Number(torneo.puntos_por_set) || null).toBe(E.puntosPorSet)
      expect(equipos.every(e => e.estado === 'aprobado')).toBe(true)
      expect(sorteo.ok).toBe(true)
    })

    it(`${id(1)} · ${E.deporte}: la mesa técnica carga los 6 partidos del grupo y ninguno termina empatado`, async () => {
      // Arrange
      await como('rosa')
      const orden = new Map(equipos.map((e, i) => [e.id, i]))
      const { data: partidos } = await (await entrar('rosa')).sb.from('partidos_torneo')
        .select('*').eq('torneo_id', torneo.id)

      // Act
      for (const p of partidos) {
        const [a, b] = E.marcador(orden.get(p.equipo_a_id) < orden.get(p.equipo_b_id))
        const r = await guardarPartidoTorneo(p.id, { golesA: a, golesB: b, estado: 'finalizado' })
        expect(r.ok).toBe(true)
      }

      // Assert
      const { data: jugados } = await (await entrar('rosa')).sb.from('partidos_torneo')
        .select('goles_a, goles_b, estado').eq('torneo_id', torneo.id)
      expect(jugados).toHaveLength(6)
      expect(jugados.every(p => p.estado === 'finalizado' && p.goles_a !== p.goles_b)).toBe(true)
    })

    it(`${id(2)} · ${E.deporte}: Marco, que no juega, ve la tabla con los puntos y las columnas de ese deporte`, async () => {
      // Arrange: nada, Marco solo abre el torneo

      // Act
      const { t, tablas } = await loQueVeMarco(torneo.id)

      // Assert: 3 victorias = 6 puntos (en los deportes sin empate la victoria vale 2)
      expect(t.estado).toBe('en_curso')
      expect(tablas.A.map(f => f.nombre)).toEqual(equipos.map(e => e.nombre))
      expect(tablas.A.map(f => f.pts)).toEqual([6, 4, 2, 0])
      expect(tablas.A.every(f => f.pe === 0)).toBe(true)
      expect(etiquetasDeTabla(t.deporteKey).aFavor).toBe(E.deporte === 'Wally' ? 'PF' : 'JF')
    })

    it(`${id(3)} · ${E.deporte}: semifinales y final; Marco ve al campeón y el torneo finalizado`, async () => {
      // Arrange
      const { tablas } = await loQueVeMarco(torneo.id)
      const porNombre = new Map(equipos.map(e => [e.nombre, e.id]))
      await como('willy')
      const jugar = async (l) => {
        const { partido } = await asegurarPartidoDeLlave({ torneoId: torneo.id, llave: l.llave, fase: 'eliminatoria',
          equipoAId: porNombre.get(l.equipo1), equipoBId: porNombre.get(l.equipo2) })
        const pos = (n) => equipos.findIndex(e => e.nombre === n)
        const [a, b] = E.marcador(pos(l.equipo1) < pos(l.equipo2))
        return guardarPartidoTorneo(partido.id, { golesA: a, golesB: b, estado: 'finalizado' })
      }

      // Act
      let cuadro = generarCuadro(tablas, 2)
      for (const l of cuadro[0]) await jugar(l)
      await como('marco'); await cargarDatos({ forzar: true })
      cuadro = generarCuadro(tablas, 2, resultadosDeLlave(torneoPorId(torneo.id).partidos))
      await como('willy')
      await jugar(cuadro[1][0])
      await cerrarTorneo(torneo.id)
      const vista = await loQueVeMarco(torneo.id)
      const final = generarCuadro(vista.tablas, 2, resultadosDeLlave(vista.t.partidos))

      // Assert: el primero del grupo gana su semifinal y la final
      expect(cuadro[0].map(l => l.ronda)).toEqual(['Semifinales', 'Semifinales'])
      expect(vista.t.estado).toBe('finalizado')
      expect(campeonDelTorneo(final)).toBe(equipos[0].nombre)
    })
  }
})
