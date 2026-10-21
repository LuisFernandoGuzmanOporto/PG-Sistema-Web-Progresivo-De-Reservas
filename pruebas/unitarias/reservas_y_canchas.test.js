import { describe, it, expect } from 'vitest'
import { jornadasDelTorneo, horasPorJornada, costoDelTorneo } from '../../src/lib/jornadas.js'
import { finDeFranja } from '../../src/lib/agenda.js'
import { traducirError } from '../../src/lib/errores.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-19 a PU-24 · Jornadas, franjas horarias y mensajes de error
// ─────────────────────────────────────────────────────────────────────────────

describe('Jornadas de un torneo', () => {
  it('PU-19 · solo se reservan los días de la semana elegidos dentro del rango', () => {
    // Arrange: del jueves 10 al domingo 20 de septiembre de 2026, sábados y domingos
    const datos = { fechaInicio: '2026-09-10', fechaFin: '2026-09-20', dias: ['Sab', 'Dom'] }

    // Act
    const fechas = jornadasDelTorneo(datos)

    // Assert
    expect(fechas).toEqual(['2026-09-12', '2026-09-13', '2026-09-19', '2026-09-20'])
  })

  it('PU-20 · si la fecha de fin es anterior al inicio no hay jornadas', () => {
    // Arrange
    const datos = { fechaInicio: '2026-09-20', fechaFin: '2026-09-10', dias: [] }

    // Act
    const fechas = jornadasDelTorneo(datos)

    // Assert
    expect(fechas).toEqual([])
  })

  it('PU-21 · el costo de la cancha es jornadas × horas × precio por hora', () => {
    // Arrange
    const datos = {
      fechaInicio: '2026-09-12', fechaFin: '2026-09-13', dias: [],
      horaInicio: '14:00', horaFin: '18:00', precioHora: 120,
    }

    // Act
    const costo = costoDelTorneo(datos)

    // Assert
    expect(costo).toMatchObject({ jornadas: 2, horasPorJornada: 4, horasTotales: 8, total: 960 })
  })

  it('PU-22 · un horario al revés no suma horas negativas', () => {
    // Arrange
    const inicio = '18:00', fin = '14:00'

    // Act
    const horas = horasPorJornada(inicio, fin)

    // Assert
    expect(horas).toBe(0)
  })
})

describe('Franjas horarias', () => {
  it('PU-23 · cada franja dura una hora', () => {
    // Arrange
    const franja = '07:00'

    // Act
    const fin = finDeFranja(franja)

    // Assert
    expect(fin).toBe('08:00')
  })
})

describe('Mensajes de error para el usuario', () => {
  it('PU-24 · los errores técnicos de la base se traducen a un mensaje entendible', () => {
    // Arrange
    const errores = [
      { message: 'new row violates row-level security policy for table "reservas"' },
      { message: 'duplicate key value violates unique constraint' },
      { message: 'Failed to fetch' },
    ]

    // Act
    const mensajes = errores.map(e => traducirError(e))

    // Assert
    expect(mensajes).toEqual([
      'No tienes permiso para realizar esta acción con tu cuenta.',
      'Ese registro ya existe. Revisa que no lo hayas guardado antes.',
      'No hay conexión a internet. Revisa tu conexión e inténtalo de nuevo; no se perdió lo que escribiste.',
    ])
  })

  it('PU-32 · los avisos de la base llegan con ortografía, en tú y con el dato concreto', () => {
    // Arrange
    const errores = [
      { message: 'No te alcanzan los puntos: tenes 120 y necesitas 300' },
      { message: 'El complejo atiende de 07:00:00 a 23:00:00' },
      { message: 'Ese codigo de canje ya se uso' },
      { message: 'Some unexpected internal error in the server' },
    ]

    // Act
    const mensajes = errores.map(e => traducirError(e))

    // Assert
    expect(mensajes).toEqual([
      'No tienes puntos suficientes: tienes 120 y esta recompensa cuesta 300.',
      'El complejo atiende de 07:00 a 23:00. Elige un horario dentro de ese rango.',
      'Ese código de canje ya fue utilizado.',
      'No se pudo guardar. Inténtalo de nuevo.',
    ])
  })
})
