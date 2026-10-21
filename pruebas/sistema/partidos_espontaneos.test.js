import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

vi.mock('../../src/lib/supabase.js', async () =>
  ({ supabase: (await import('./apoyo.js')).supabaseDelActor }))

import { hayBase, como, entrar, puntosDe, dejarComoEstaba,
         SPORT_CENTER, CANCHA_PADEL } from './apoyo.js'
import { clienteAnonimo } from '../integracion/conexion.js'
import { guardarPartidoEspontaneo, unirseAPartido,
         salirDePartido } from '../../src/lib/guardar.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-29 a PS-34 · Partidos espontaneos entre varios clientes
//
// Diego arma un partido de padel para cuatro. Se suman Sandra, Juan Torres y
// Carlos hasta completarlo; Ana llega tarde; Sandra se baja y Ana entra.
// ─────────────────────────────────────────────────────────────────────────────

// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const puntosAntes = {}

const jugadoresDe = async (partidoId) => {
  const { data } = await clienteAnonimo().from('partido_jugadores')
    .select('jugador_id').eq('partido_id', partidoId)
  return data || []
}

describe.skipIf(!hayBase)('Partidos espontáneos', () => {
  let partido

  beforeAll(async () => {
    for (const q of ['diego', 'sandra', 'juant', 'carlos', 'ana']) puntosAntes[q] = await puntosDe(q)
    await entrar('superadmin')
  })

  afterAll(async () => {
    const diego = await entrar('diego')
    await dejarComoEstaba({
      inicio, puntosAntes,
      borrar: [
        // Lo borra su creador; los jugadores se van en cascada
        async () => partido && diego.sb.from('partidos_espontaneos').delete().eq('id', partido.id),
      ],
    })
  })

  it('PS-29 · Diego crea el partido y queda anotado como primer jugador (+10 puntos)', async () => {
    // Arrange
    const antes = await puntosDe('diego')
    await como('diego')

    // Act
    const r = await guardarPartidoEspontaneo({ empresaId: SPORT_CENTER, canchaId: CANCHA_PADEL,
      deporte: 'Pádel', fechaHora: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      maxJugadores: 4, apuesta: 'Prueba del sistema' })

    // Assert
    expect(r.error).toBeUndefined()
    partido = r.partido
    expect(await jugadoresDe(partido.id)).toHaveLength(1)
    expect(await puntosDe('diego')).toBe(antes + 10)
  })

  it('PS-30 · Sandra, Juan Torres y Carlos se suman hasta completar los 4 lugares', async () => {
    // Arrange
    const quienes = ['sandra', 'juant', 'carlos']

    // Act
    const resultados = []
    for (const q of quienes) { await como(q); resultados.push(await unirseAPartido(partido.id)) }

    // Assert
    expect(resultados.every(r => r.ok)).toBe(true)
    expect(await jugadoresDe(partido.id)).toHaveLength(4)
  })

  it('PS-31 · Ana llega con el partido completo: no puede sumarse', async () => {
    // Arrange
    await como('ana')

    // Act
    const r = await unirseAPartido(partido.id)

    // Assert
    expect(r.ok).toBeUndefined()
    expect(r.error).toMatch(/completo/)
    expect(await jugadoresDe(partido.id)).toHaveLength(4)
  })

  it('PS-32 · Juan Torres no puede sacar a otro jugador del partido', async () => {
    // Arrange
    const juant = await como('juant')
    const diego = await entrar('diego')

    // Act
    const { data } = await juant.sb.from('partido_jugadores').delete()
      .eq('partido_id', partido.id).eq('jugador_id', diego.id).select()

    // Assert
    expect(data).toHaveLength(0)
    expect(await jugadoresDe(partido.id)).toHaveLength(4)
  })

  it('PS-33 · Sandra se baja: libera el lugar y se le descuentan los 10 puntos', async () => {
    // Arrange
    const antes = await puntosDe('sandra')
    await como('sandra')

    // Act
    const r = await salirDePartido(partido.id)

    // Assert
    expect(r.ok).toBe(true)
    expect(await jugadoresDe(partido.id)).toHaveLength(3)
    expect(await puntosDe('sandra')).toBe(antes - 10)
  })

  it('PS-34 · Ana entra en el lugar libre', async () => {
    // Arrange
    const ana = await como('ana')

    // Act
    const r = await unirseAPartido(partido.id)

    // Assert
    expect(r.ok).toBe(true)
    const ids = (await jugadoresDe(partido.id)).map(j => j.jugador_id)
    expect(ids).toContain(ana.id)
    expect(ids).toHaveLength(4)
  })
})
