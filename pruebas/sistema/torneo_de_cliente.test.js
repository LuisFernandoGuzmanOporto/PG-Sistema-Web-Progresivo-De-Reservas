import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

vi.mock('../../src/lib/supabase.js', async () =>
  ({ supabase: (await import('./apoyo.js')).supabaseDelActor }))

import { hayBase, como, entrar, puntosDe, dejarComoEstaba,
         SPORT_CENTER, CANCHA_FUTBOL } from './apoyo.js'
import { guardarTorneo, guardarEquipo, resolverEquipo, resolverSolicitudCancha,
         guardarReserva } from '../../src/lib/guardar.js'
import { jornadasDelTorneo } from '../../src/lib/jornadas.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-23 a PS-28 · Un torneo que organiza un CLIENTE
//
// Juan organiza un torneo de domingo en Sport Center. Hasta que el complejo
// no apruebe la cancha, nadie puede inscribirse y esas horas ya aparecen
// pedidas. Cuando el administrador aprueba, Marco inscribe su equipo y Juan,
// como organizador, lo aprueba.
// ─────────────────────────────────────────────────────────────────────────────

// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const puntosAntes = {}

const TORNEO = {
  empresaId: SPORT_CENTER, canchaId: CANCHA_FUTBOL, creadorTipo: 'cliente',
  nombre: 'Torneo de Juan (prueba del sistema)', emoji: '⚽', deporte: 'Fútbol',
  formato: 'Grupos + Eliminacion', maxEquipos: 4, jugadoresPorEquipo: 5,
  jugadoresMin: 5, jugadoresMax: 7, precio: 50,
  fechaInicio: '2031-05-04', fechaFin: '2031-05-25', inscripcionHasta: '2031-05-01',
  dias: ['Dom'], horaInicio: '08:00', horaFin: '10:00', precioHora: 120,
}

const plantel = Array.from({ length: 5 }, (_, i) => ({ nombre: `Jugador ${i + 1}`, dorsal: i + 1 }))

describe.skipIf(!hayBase)('Torneo organizado por un cliente', () => {
  let torneo, equipoDeMarco

  beforeAll(async () => {
    for (const q of ['juan', 'marco', 'luisa']) puntosAntes[q] = await puntosDe(q)
    await entrar('admin'); await entrar('superadmin')
  })

  afterAll(async () => {
    const admin = await entrar('admin')
    const juan = await entrar('juan')
    await dejarComoEstaba({
      inicio, puntosAntes,
      borrar: [
        async () => torneo && juan.sb.from('torneos').delete().eq('id', torneo.id),
        async () => admin.sb.from('torneos').delete().eq('nombre', TORNEO.nombre),
        async () => admin.sb.from('reservas').delete()
          .eq('cancha_id', CANCHA_FUTBOL).eq('fecha', '2031-05-04').is('torneo_id', null),
      ],
    })
  })

  it('PS-23 · Juan crea su torneo: la cancha queda pedida al complejo, sin aprobar', async () => {
    // Arrange
    await como('juan')

    // Act
    const r = await guardarTorneo(TORNEO)

    // Assert
    expect(r.error).toBeUndefined()
    torneo = r.torneo
    const juan = await entrar('juan')
    const { data: solicitud } = await juan.sb.from('solicitudes_cancha')
      .select('estado').eq('torneo_id', torneo.id).single()
    const { data: jornadas } = await juan.sb.from('reservas')
      .select('estado').eq('torneo_id', torneo.id)
    expect(solicitud.estado).toBe('pendiente')
    expect(jornadas).toHaveLength(jornadasDelTorneo(TORNEO).length)
    expect(jornadas.every(j => j.estado === 'pendiente')).toBe(true)
  })

  it('PS-24 · Marco no puede inscribirse mientras el complejo no apruebe la cancha', async () => {
    // Arrange
    const s = await como('marco')

    // Act
    const r = await guardarEquipo({ torneoId: torneo.id, nombre: 'Los de Marco',
      capitanNombre: s.nombre, jugadores: plantel })

    // Assert
    expect(r.equipo).toBeUndefined()
    expect(r.error).toMatch(/no aprobó la cancha/)
  })

  it('PS-25 · Luisa no puede reservar esas horas: ya están pedidas para el torneo', async () => {
    // Arrange
    await como('luisa')

    // Act
    const r = await guardarReserva({ empresaId: SPORT_CENTER, canchaId: CANCHA_FUTBOL,
      fecha: '2031-05-04', horaInicio: '09:00', horaFin: '10:00', monto: 0 })

    // Assert
    expect(r.reserva).toBeUndefined()
    expect(r.error).toBe('Otra persona acaba de reservar ese horario. Elige otro horario disponible.')
  })

  it('PS-26 · Juan no puede aprobarse la cancha ni confirmarse las jornadas: solo el complejo', async () => {
    // Arrange
    const juan = await como('juan')

    // Act: por la pantalla y directo contra la API
    const r = await resolverSolicitudCancha(torneo.id, 'aprobada')
    await juan.sb.from('reservas').update({ estado: 'confirmada' }).eq('torneo_id', torneo.id)

    // Assert
    expect(r.ok).toBeUndefined()
    expect(r.error).toBeTruthy()
    const { data: solicitud } = await juan.sb.from('solicitudes_cancha')
      .select('estado').eq('torneo_id', torneo.id).single()
    const { data: jornadas } = await juan.sb.from('reservas')
      .select('estado').eq('torneo_id', torneo.id)
    expect(solicitud.estado).toBe('pendiente')
    expect(jornadas.every(j => j.estado === 'pendiente')).toBe(true)
  })

  it('PS-27 · El administrador aprueba la cancha: las jornadas pasan a confirmadas y queda anotado quién y cuándo', async () => {
    // Arrange
    const admin = await como('admin')

    // Act
    const r = await resolverSolicitudCancha(torneo.id, 'aprobada')

    // Assert
    expect(r.ok).toBe(true)
    const { data: jornadas } = await (await entrar('juan')).sb.from('reservas')
      .select('estado').eq('torneo_id', torneo.id)
    expect(jornadas.every(j => j.estado === 'confirmada')).toBe(true)
    //         quién la aprobó y cuándo lo anota la base, con su reloj (migraciones/040)
    const { data: solicitud } = await admin.sb.from('solicitudes_cancha')
      .select('resuelta_por, resuelta_at').eq('torneo_id', torneo.id).single()
    expect(solicitud.resuelta_por).toBe(admin.id)
    expect(Math.abs(new Date(solicitud.resuelta_at).getTime() - Date.now())).toBeLessThan(5 * 60 * 1000)
  })

  it('PS-28 · Ahora Marco se inscribe y Juan, como organizador, aprueba su equipo', async () => {
    // Arrange
    const s = await como('marco')
    const inscripcion = await guardarEquipo({ torneoId: torneo.id, nombre: 'Los de Marco',
      capitanNombre: s.nombre, jugadores: plantel })
    equipoDeMarco = inscripcion.equipo

    // Act
    await como('juan')
    const r = await resolverEquipo(equipoDeMarco.id, 'aprobado')

    // Assert
    expect(inscripcion.error).toBeUndefined()
    expect(r.ok).toBe(true)
    expect(r.filas[0].estado).toBe('aprobado')
  })
})
