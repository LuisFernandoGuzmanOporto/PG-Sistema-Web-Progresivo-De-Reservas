import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Las funciones de la aplicacion usan el cliente de Supabase del actor que
// este jugando ese paso (ver apoyo.js)
vi.mock('../../src/lib/supabase.js', async () =>
  ({ supabase: (await import('./apoyo.js')).supabaseDelActor }))

import { hayBase, como, entrar, puntosDe, dejarComoEstaba,
         SPORT_CENTER, CANCHA_FUTBOL } from './apoyo.js'
import { guardarReserva, guardarReservaPresencial, resolverReserva,
         marcarAsistencia, cambiarEstadoUsuario } from '../../src/lib/guardar.js'
import { cargarDatos } from '../../src/lib/carga.js'
import { franjaDeCancha } from '../../src/lib/agenda.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-01 a PS-10 · Reserva de canchas con varios clientes y el personal
//
// Un lunes en la cancha de futbol de Sport Center (Bs. 120 la hora):
//   Juan reserva de 10 a 12, Marco mira el calendario y llega tarde, la
//   empleada Rosa confirma, el administrador rechaza, el empleado Willy
//   marca la asistencia y el superadministrador suspende una cuenta.
// ─────────────────────────────────────────────────────────────────────────────

const DIA = '2031-03-03'          // lunes, lejos de cualquier reserva real
// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const creadas = []
const puntosAntes = {}

const reservar = (horaInicio, horaFin) => guardarReserva({
  empresaId: SPORT_CENTER, canchaId: CANCHA_FUTBOL, fecha: DIA,
  horaInicio, horaFin, monto: 0, comprobante: 'prueba/comprobante.png',
})

describe.skipIf(!hayBase)('Reserva de canchas por rol', () => {
  let deJuan, deMarco

  beforeAll(async () => {
    for (const q of ['juan', 'marco', 'luisa', 'ana', 'carlos']) puntosAntes[q] = await puntosDe(q)
    await Promise.all(['admin', 'rosa', 'willy', 'superadmin'].map(entrar))
  })

  afterAll(async () => {
    const admin = await entrar('admin')
    const superadmin = await entrar('superadmin')
    await dejarComoEstaba({
      inicio, puntosAntes,
      borrar: [
        async () => superadmin.sb.from('profiles').update({ activo: true })
          .eq('id', (await entrar('carlos')).id),
        async () => admin.sb.from('reservas').delete().in('id', creadas),
        // Por si algun paso fallo a mitad de camino y quedo algo sin anotar
        async () => admin.sb.from('reservas').delete()
          .eq('cancha_id', CANCHA_FUTBOL).eq('fecha', DIA),
      ],
    })
  })

  it('PS-01 · Juan reserva 2 horas: queda pendiente y la base calcula el precio', async () => {
    // Arrange
    await como('juan')

    // Act
    const r = await reservar('10:00', '12:00')

    // Assert
    expect(r.error).toBeUndefined()
    creadas.push(r.reserva.id)
    deJuan = r.reserva
    expect(deJuan.estado).toBe('pendiente')
    expect(Number(deJuan.monto_total)).toBe(240)
  })

  it('PS-02 · Marco abre el calendario y ve esas horas ocupadas, sin el nombre de Juan', async () => {
    // Arrange
    await como('marco')

    // Act: la misma carga y el mismo calculo que hace su pantalla
    await cargarDatos({ forzar: true })
    const diez = franjaDeCancha(SPORT_CENTER, CANCHA_FUTBOL, DIA, '10:00')
    const once = franjaDeCancha(SPORT_CENTER, CANCHA_FUTBOL, DIA, '11:00')
    const doce = franjaDeCancha(SPORT_CENTER, CANCHA_FUTBOL, DIA, '12:00')

    // Assert
    expect(diez.estado).toBe('pendiente')
    expect(once.estado).toBe('pendiente')
    expect(doce.estado).toBe('libre')
    expect(JSON.stringify(diez)).not.toContain('Juan')
  })

  it('PS-03 · Marco intenta reservar 11 a 12 igual: la base lo rechaza con un mensaje claro', async () => {
    // Arrange
    await como('marco')

    // Act
    const r = await reservar('11:00', '12:00')

    // Assert
    expect(r.reserva).toBeUndefined()
    expect(r.error).toBe('Otra persona acaba de reservar ese horario. Elige otro horario disponible.')
  })

  it('PS-04 · Marco reserva la hora siguiente, de 12 a 13: se acepta', async () => {
    // Arrange
    await como('marco')

    // Act
    const r = await reservar('12:00', '13:00')

    // Assert
    expect(r.error).toBeUndefined()
    creadas.push(r.reserva.id)
    deMarco = r.reserva
    expect(deMarco.estado).toBe('pendiente')
  })

  it('PS-05 · Un cliente no puede guardar su reserva ya confirmada ni fijar el precio', async () => {
    // Arrange: lo que mandaria alguien desde la consola del navegador
    const luisa = await como('luisa')

    // Act
    const { data, error } = await luisa.sb.from('reservas').insert({
      cliente_id: luisa.id, empresa_id: SPORT_CENTER, cancha_id: CANCHA_FUTBOL,
      fecha: DIA, hora_inicio: '16:00', hora_fin: '17:00',
      monto_total: 0, estado: 'confirmada', origen: 'presencial',
    }).select().single()
    if (data) creadas.push(data.id)

    // Assert: la reserva existe, pero como la de cualquiera: sin comprobante,
    // solo queda apartada mientras paga (migraciones/038)
    expect(error).toBeNull()
    expect(data.estado).toBe('apartada')
    expect(data.origen).toBe('app')
    expect(Number(data.monto_total)).toBe(120)
  })

  it('PS-06 · La empleada Rosa confirma la reserva de Juan y a Juan le llegan 5 puntos y el aviso', async () => {
    // Arrange
    const antes = await puntosDe('juan')
    await como('rosa')

    // Act
    const r = await resolverReserva(deJuan.id, 'confirmada')

    // Assert
    expect(r.error).toBeUndefined()
    expect(r.filas[0].estado).toBe('confirmada')
    expect(await puntosDe('juan')).toBe(antes + 5)
    const juan = await entrar('juan')
    const { data: avisos } = await juan.sb.from('notificaciones').select('titulo')
      .eq('usuario_id', juan.id).gte('created_at', inicio)
    expect(avisos.map(a => a.titulo).join(' ')).toMatch(/confirm/i)
  })

  it('PS-07 · El administrador rechaza la de Marco y la hora queda libre para Ana', async () => {
    // Arrange
    await como('admin')

    // Act
    const r = await resolverReserva(deMarco.id, 'rechazada')
    await como('ana')
    const deAna = await reservar('12:00', '13:00')

    // Assert
    expect(r.filas[0].estado).toBe('rechazada')
    expect(deAna.error).toBeUndefined()
    creadas.push(deAna.reserva.id)
    expect(deAna.reserva.estado).toBe('pendiente')
  })

  it('PS-08 · El empleado Willy marca a Juan presente: suma otros 5 puntos', async () => {
    // Arrange
    const antes = await puntosDe('juan')
    await como('willy')

    // Act
    const r = await marcarAsistencia(deJuan.id, 'presente')

    // Assert
    expect(r.error).toBeUndefined()
    expect(r.filas[0].asistencia).toBe('presente')
    expect(await puntosDe('juan')).toBe(antes + 5)
  })

  it('PS-09 · Rosa toma una reserva en el mostrador y ningún cliente puede pisarla', async () => {
    // Arrange
    await como('rosa')
    const mostrador = await guardarReservaPresencial({
      empresaId: SPORT_CENTER, canchaId: CANCHA_FUTBOL, nombre: 'Cliente de mostrador',
      telefono: '70000000', fecha: DIA, horaInicio: '14:00', horaFin: '15:00', monto: 120,
    })
    creadas.push(mostrador.reserva.id)

    // Act
    await como('luisa')
    const r = await reservar('14:00', '15:00')

    // Assert
    expect(mostrador.reserva.estado).toBe('confirmada')
    expect(r.error).toBe('Otra persona acaba de reservar ese horario. Elige otro horario disponible.')
  })

  it('PS-10 · El superadministrador suspende a Carlos y Carlos ya no puede reservar', async () => {
    // Arrange
    const carlos = await entrar('carlos')
    await como('superadmin')
    const s = await cambiarEstadoUsuario(carlos.id, false)

    // Act
    await como('carlos')
    const r = await reservar('18:00', '19:00')
    if (r.reserva) creadas.push(r.reserva.id)

    // Assert
    expect(s.error).toBeUndefined()
    expect(r.reserva).toBeUndefined()
    expect(r.error).toMatch(/suspendida/i)
  })
})
