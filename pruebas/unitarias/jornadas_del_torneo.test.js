import { describe, it, expect } from 'vitest'
import { diasEnElRango, horarioDeJuego } from '../../src/lib/jornadas'

// Al crear un torneo se dejaba marcar un día que no cae entre las fechas, y
// un horario fuera del que atiende el complejo (fallaba recién al aprobarlo).

describe('Días y horario de un torneo', () => {
  it('PU-47 · del viernes 13 al sábado 14 de noviembre solo caen Vie y Sab', () => {
    expect(diasEnElRango('2026-11-13', '2026-11-14')).toEqual(['Vie', 'Sab'])
  })

  it('PU-48 · con una semana o más caen los siete días, y sin fechas no se apaga ninguno', () => {
    expect(diasEnElRango('2026-11-13', '2026-11-25')).toHaveLength(7)
    expect(diasEnElRango('', '')).toHaveLength(7)
  })

  it('PU-49 · el horario sale del complejo, o de la cancha si el suyo es más corto', () => {
    const empresa = { apertura: '07:00', cierre: '22:00' }
    expect(horarioDeJuego(empresa, null)).toMatchObject({ desde: '07:00', hasta: '22:00' })
    expect(horarioDeJuego(empresa, { apertura: '08:00', cierre: '20:00' }))
      .toMatchObject({ desde: '08:00', hasta: '20:00' })
    expect(horarioDeJuego({}, null)).toBeNull()
  })

  it('PU-50 · avisa si el torneo empieza antes de abrir o termina después de cerrar', () => {
    const h = horarioDeJuego({ apertura: '07:00', cierre: '22:00' }, null)
    expect(h.revisar('06:00', '09:00').campo).toBe('horaInicio')
    expect(h.revisar('20:00', '23:00').campo).toBe('horaFin')
    expect(h.revisar('09:00', '13:00')).toBeNull()
    // Cierre a medianoche: cualquier hora de fin vale
    expect(horarioDeJuego({ apertura: '07:00', cierre: '00:00' }, null).revisar('20:00', '23:00')).toBeNull()
  })
})
