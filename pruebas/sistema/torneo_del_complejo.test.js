import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

vi.mock('../../src/lib/supabase.js', async () =>
  ({ supabase: (await import('./apoyo.js')).supabaseDelActor }))

import { hayBase, como, entrar, puntosDe, dejarComoEstaba,
         SPORT_CENTER, CANCHA_FUTBOL } from './apoyo.js'
import { clienteAnonimo } from '../integracion/conexion.js'
import { guardarTorneo, guardarEquipo, resolverEquipo, guardarSorteo,
         guardarPartidoTorneo, guardarEventoPartido, asegurarPartidoDeLlave,
         cerrarTorneo } from '../../src/lib/guardar.js'
import { sortearGrupos, gruposSugeridos, generarFixture, calcularTabla,
         gruposFinalizados, generarCuadro, resultadosDeLlave,
         campeonDelTorneo } from '../../src/lib/torneo.js'
import { jornadasDelTorneo } from '../../src/lib/jornadas.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-11 a PS-22 · Un torneo del complejo, de la inscripcion al campeon
//
// El administrador de Sport Center organiza la «Copa de Prueba» para ocho
// equipos. Ocho clientes distintos inscriben un equipo cada uno, el
// administrador los aprueba y sortea los grupos, la empleada Rosa y el
// empleado Willy llevan la mesa tecnica hasta la final, y cualquier visitante
// ve al campeon.
// ─────────────────────────────────────────────────────────────────────────────

const CAPITANES = ['juan', 'marco', 'luisa', 'ana', 'juanr', 'diego', 'sandra', 'juant']
// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const puntosAntes = {}

const TORNEO = {
  empresaId: SPORT_CENTER, canchaId: CANCHA_FUTBOL, creadorTipo: 'complejo',
  nombre: 'Copa de Prueba del Sistema', emoji: '🏆', deporte: 'Fútbol',
  formato: 'Grupos + Eliminacion', maxEquipos: 8, jugadoresPorEquipo: 5,
  jugadoresMin: 5, jugadoresMax: 7, precio: 0,
  premios: { primero: 'Trofeo', segundo: 'Medallas', tercero: null },
  fechaInicio: '2031-04-05', fechaFin: '2031-04-27', inscripcionHasta: '2031-04-01',
  dias: ['Sab', 'Dom'], horaInicio: '14:00', horaFin: '18:00', precioHora: 120,
}

const plantel = (n) => Array.from({ length: 5 }, (_, i) =>
  ({ nombre: `Jugador ${i + 1} del equipo ${n}`, dorsal: i + 1 }))

/** Los partidos del torneo como los ve la mesa tecnica (misma forma que carga.js). */
async function partidosDe(torneoId, equipos) {
  const anon = clienteAnonimo()
  const { data } = await anon.from('partidos_torneo').select('*').eq('torneo_id', torneoId)
  const nombre = new Map(equipos.map(e => [e.id, e.nombre]))
  return (data || []).map(p => ({
    id: p.id, fase: p.fase, grupo: p.grupo, ronda: p.ronda, llave: p.ronda,
    equipo1_id: p.equipo_a_id, equipo1: nombre.get(p.equipo_a_id),
    equipo2_id: p.equipo_b_id, equipo2: nombre.get(p.equipo_b_id),
    g1: p.goles_a, g2: p.goles_b, pen1: p.penales_a, pen2: p.penales_b,
    estado: p.estado, creado: p.created_at,
  }))
}

describe.skipIf(!hayBase)('Torneo del complejo con ocho equipos', () => {
  let torneo, equipos = [], equipoDeCarlos, cuadro

  beforeAll(async () => {
    for (const q of [...CAPITANES, 'carlos']) puntosAntes[q] = await puntosDe(q)
    await Promise.all(['admin', 'rosa', 'willy', 'superadmin'].map(entrar))
  })

  afterAll(async () => {
    const admin = await entrar('admin')
    await dejarComoEstaba({
      inicio, puntosAntes,
      borrar: [
        // Borrar el torneo borra en cascada equipos, planteles, partidos,
        // eventos, la solicitud de cancha y las jornadas reservadas
        async () => torneo && admin.sb.from('torneos').delete().eq('id', torneo.id),
        async () => admin.sb.from('torneos').delete().eq('nombre', TORNEO.nombre),
      ],
    })
  })

  it('PS-11 · El administrador crea el torneo: la cancha queda tomada en cada jornada', async () => {
    // Arrange
    await como('admin')
    const jornadas = jornadasDelTorneo(TORNEO)

    // Act
    const r = await guardarTorneo(TORNEO)

    // Assert
    expect(r.error).toBeUndefined()
    torneo = r.torneo
    expect(torneo.estado).toBe('inscripciones')
    const { data: reservas } = await (await entrar('admin')).sb.from('reservas')
      .select('fecha, estado').eq('torneo_id', torneo.id)
    expect(reservas).toHaveLength(jornadas.length)
    expect(reservas.every(x => x.estado === 'confirmada')).toBe(true)
  })

  it('PS-12 · Ocho clientes distintos inscriben su equipo: quedan pendientes y cada capitán suma 15 puntos', async () => {
    // Arrange
    const antes = await puntosDe('juan')

    // Act
    for (const [i, q] of CAPITANES.entries()) {
      const s = await como(q)
      const r = await guardarEquipo({
        torneoId: torneo.id, nombre: `Equipo ${i + 1}`,
        capitanNombre: s.nombre, capitanTelefono: '7000000' + i,
        comprobante: 'prueba/comprobante.png', jugadores: plantel(i + 1),
      })
      expect(r.error).toBeUndefined()
      equipos.push(r.equipo)
    }

    // Assert
    expect(equipos).toHaveLength(8)
    expect(equipos.every(e => e.estado === 'pendiente')).toBe(true)
    expect(await puntosDe('juan')).toBe(antes + 15)
  })

  it('PS-13 · Un capitán que intenta inscribirse ya «aprobado» queda pendiente igual', async () => {
    // Arrange
    const carlos = await como('carlos')

    // Act: lo que mandaria desde la consola del navegador
    const { data, error } = await carlos.sb.from('equipos').insert({
      torneo_id: torneo.id, nombre: 'Equipo 9', capitan_id: carlos.id,
      capitan_nombre: carlos.nombre, estado: 'aprobado',
    }).select().single()

    // Assert
    expect(error).toBeNull()
    equipoDeCarlos = data
    expect(data.estado).toBe('pendiente')
  })

  it('PS-14 · El administrador aprueba a los ocho equipos', async () => {
    // Arrange
    await como('admin')

    // Act
    const resultados = []
    for (const e of equipos) resultados.push(await resolverEquipo(e.id, 'aprobado'))

    // Assert
    expect(resultados.every(r => r.ok)).toBe(true)
    equipos = resultados.map(r => r.filas[0])
    expect(equipos.every(e => e.estado === 'aprobado')).toBe(true)
  })

  it('PS-15 · Con el cupo lleno, aprobar un noveno equipo se rechaza', async () => {
    // Arrange
    await como('admin')

    // Act
    const r = await resolverEquipo(equipoDeCarlos.id, 'aprobado')

    // Assert
    expect(r.ok).toBeUndefined()
    expect(r.error).toMatch(/ya completó sus 8 equipos/)
  })

  it('PS-16 · El administrador sortea: 2 grupos de 4 y 12 partidos; el torneo pasa a «en curso»', async () => {
    // Arrange
    await como('admin')
    const grupos = sortearGrupos(equipos, gruposSugeridos(equipos.length))
    const fixture = generarFixture(grupos)

    // Act: lo mismo que hace el boton «Sortear» de TorneoDetalle
    const r = await guardarSorteo(torneo.id,
      Object.entries(grupos).flatMap(([g, es]) => es.map(e => ({ equipoId: e.id, grupo: g }))),
      fixture.map(p => ({ equipoA: p.equipo1_id, equipoB: p.equipo2_id, fase: p.fase, grupo: p.grupo })))

    // Assert
    expect(r.ok).toBe(true)
    expect(r.filas[0].estado).toBe('en_curso')
    expect(Object.values(grupos).map(g => g.length)).toEqual([4, 4])
    expect(await partidosDe(torneo.id, equipos)).toHaveLength(12)
  })

  it('PS-17 · Con el torneo en curso ya no se aceptan inscripciones', async () => {
    // Arrange
    const s = await como('carlos')

    // Act
    const r = await guardarEquipo({ torneoId: torneo.id, nombre: 'Equipo tardío',
      capitanNombre: s.nombre, jugadores: plantel(10) })

    // Assert
    expect(r.equipo).toBeUndefined()
    expect(r.error).toMatch(/inscripciones de este torneo ya cerraron/)
  })

  it('PS-18 · Un cliente no puede cargar resultados: solo la mesa técnica del complejo', async () => {
    // Arrange
    await como('juan')
    const [primero] = await partidosDe(torneo.id, equipos)

    // Act
    const r = await guardarPartidoTorneo(primero.id, { golesA: 9, golesB: 0, estado: 'finalizado' })

    // Assert
    expect(r.ok).toBeUndefined()
    expect(r.error).toBeTruthy()
  })

  it('PS-19 · Rosa carga la fase de grupos completa, con un gol con autor, y la tabla sale de la base', async () => {
    // Arrange: gana siempre el equipo inscrito primero, para que sea repetible
    await como('rosa')
    const orden = new Map(equipos.map((e, i) => [e.id, i]))
    const partidos = await partidosDe(torneo.id, equipos)
    const { data: jugadores } = await clienteAnonimo().from('equipo_jugadores')
      .select('id, equipo_id').in('equipo_id', equipos.map(e => e.id))

    // Act
    for (const p of partidos) {
      const ganaA = orden.get(p.equipo1_id) < orden.get(p.equipo2_id)
      const r = await guardarPartidoTorneo(p.id, {
        golesA: ganaA ? 2 : 0, golesB: ganaA ? 0 : 2, estado: 'finalizado' })
      expect(r.ok).toBe(true)
    }
    const goleador = jugadores.find(j => j.equipo_id === partidos[0].equipo1_id)
    const gol = await guardarEventoPartido({ partidoId: partidos[0].id,
      equipoId: partidos[0].equipo1_id, jugadorEquipoId: goleador.id, tipo: 'gol', minuto: 10 })

    // Assert
    expect(gol.error).toBeUndefined()
    const jugados = await partidosDe(torneo.id, equipos)
    expect(gruposFinalizados(jugados)).toBe(true)
    for (const g of ['A', 'B']) {
      const deGrupo = equipos.filter(e => jugados.some(p => p.grupo === g &&
        (p.equipo1_id === e.id || p.equipo2_id === e.id)))
      const tabla = calcularTabla(deGrupo, jugados.filter(p => p.grupo === g), 'Fútbol')
      expect(tabla).toHaveLength(4)
      expect(tabla.map(f => f.pts)).toEqual([9, 6, 3, 0])
    }
  })

  it('PS-20 · Rosa y Willy abren a la vez la misma semifinal: se crea una sola vez', async () => {
    // Arrange
    const jugados = await partidosDe(torneo.id, equipos)
    const tablas = {}
    for (const g of ['A', 'B']) {
      const deGrupo = equipos.filter(e => jugados.some(p => p.grupo === g &&
        (p.equipo1_id === e.id || p.equipo2_id === e.id)))
      tablas[g] = calcularTabla(deGrupo, jugados.filter(p => p.grupo === g), 'Fútbol')
    }
    cuadro = { tablas }
    const [semi1] = generarCuadro(tablas, 2)[0]
    const nombreAId = new Map(equipos.map(e => [e.nombre, e.id]))
    const llave = { torneoId: torneo.id, llave: semi1.llave, fase: 'eliminatoria',
                    equipoAId: nombreAId.get(semi1.equipo1), equipoBId: nombreAId.get(semi1.equipo2) }
    const rosa = await entrar('rosa'), willy = await entrar('willy')

    // Act: cada uno con su propia sesion, al mismo tiempo
    const [a, b] = await Promise.all([rosa, willy].map(async (s) => {
      const { data, error } = await s.sb.from('partidos_torneo').insert({
        torneo_id: llave.torneoId, equipo_a_id: llave.equipoAId, equipo_b_id: llave.equipoBId,
        fase: llave.fase, ronda: llave.llave, estado: 'programado' }).select().single()
      if (!error) return data.id
      await como(s.quien)
      return (await asegurarPartidoDeLlave(llave)).partido.id
    }))

    // Assert
    expect(a).toBe(b)
    const { data } = await clienteAnonimo().from('partidos_torneo').select('id')
      .eq('torneo_id', torneo.id).eq('ronda', semi1.llave)
    expect(data).toHaveLength(1)
  })

  it('PS-21 · Semifinales (una por penales) y final: el torneo se cierra con su campeón', async () => {
    // Arrange
    await como('willy')
    const nombreAId = new Map(equipos.map(e => [e.nombre, e.id]))
    const resultados = {}
    const jugar = async (l, marcador) => {
      const { partido } = await asegurarPartidoDeLlave({ torneoId: torneo.id, llave: l.llave,
        fase: 'eliminatoria', equipoAId: nombreAId.get(l.equipo1), equipoBId: nombreAId.get(l.equipo2) })
      const r = await guardarPartidoTorneo(partido.id, { ...marcador, estado: 'finalizado' })
      expect(r.ok).toBe(true)
    }

    // Act
    let rondas = generarCuadro(cuadro.tablas, 2, resultados)
    const [s1, s2] = rondas[0]
    await jugar(s1, { golesA: 3, golesB: 1 })
    await jugar(s2, { golesA: 1, golesB: 1, penalesA: 3, penalesB: 4 })
    rondas = generarCuadro(cuadro.tablas, 2,
      resultadosDeLlave(await partidosDe(torneo.id, equipos)))
    const final = rondas[1][0]
    await jugar(final, { golesA: 2, golesB: 1 })
    const cerrado = await cerrarTorneo(torneo.id)
    rondas = generarCuadro(cuadro.tablas, 2,
      resultadosDeLlave(await partidosDe(torneo.id, equipos)))

    // Assert
    expect(final.equipo1).toBe(s1.equipo1)          // ganó 3-1
    expect(final.equipo2).toBe(s2.equipo2)          // ganó por penales 4-3
    expect(cerrado.ok).toBe(true)
    expect(campeonDelTorneo(rondas)).toBe(s1.equipo1)
  })

  it('PS-22 · Un visitante sin cuenta ve el torneo finalizado y el resultado de la final', async () => {
    // Arrange
    const anon = clienteAnonimo()

    // Act
    const { data: t } = await anon.from('torneos').select('estado').eq('id', torneo.id).single()
    const { data: f } = await anon.from('partidos_torneo').select('goles_a, goles_b, estado')
      .eq('torneo_id', torneo.id).eq('ronda', 'Final').single()

    // Assert
    expect(t.estado).toBe('finalizado')
    expect(f).toEqual({ goles_a: 2, goles_b: 1, estado: 'finalizado' })
  })
})
