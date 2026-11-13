import { describe, it, expect } from 'vitest'
import { diasEnElRango, horarioDeJuego } from '../../src/lib/jornadas'
import { marcadorPorSets } from '../../src/lib/torneo'

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

describe('Versión nueva publicada con la aplicación abierta', () => {
  it('PU-51 · reconoce el error del archivo viejo que ya no existe, y no otros', async () => {
    const { esArchivoViejo } = await import('../../src/lib/versionNueva')
    expect(esArchivoViejo(new TypeError('Failed to fetch dynamically imported module: http://x/assets/GestionTorneos-cjTAf3CF.js'))).toBe(true)
    expect(esArchivoViejo(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(esArchivoViejo(new TypeError("Cannot read properties of undefined (reading 'nombre')"))).toBe(false)
  })
})

// La mesa técnica anota punto por punto: hay que contar los sets a partir de
// esos puntos. Antes de esto un wally a 15-9, 16-14 se leia como un marcador
// corrido de 31-23, sin decir quien iba ganando los sets.
describe('Marcador por sets (wally, vóley, pádel)', () => {
  const E1 = 'equipo-1', E2 = 'equipo-2'
  const punto = (equipoId) => ({ tipo: 'gol', equipo_id: equipoId })
  // Puntos alternados hasta (a, b) con a >= b: primero empatan punto a punto
  // hasta b-b, y el que va arriba mete el resto. Así ningún set se cierra
  // antes de tiempo, como pasaría si se amontonaran todos los puntos de un
  // equipo primero.
  const unSet = (a, b) => {
    const eventos = []
    for (let i = 0; i < b; i++) eventos.push(punto(E1), punto(E2))
    for (let i = b; i < a; i++) eventos.push(punto(E1))
    return eventos
  }

  it('PU-52 · un set se gana al llegar a la meta con dos de ventaja', () => {
    const m = marcadorPorSets(unSet(15, 9), E1, { puntosPorSet: 15, setsParaGanar: 2 })
    expect(m.sets).toEqual([{ a: 15, b: 9 }])
    expect(m.ganados1).toBe(1)
    expect(m.ganados2).toBe(0)
    expect(m.ganador).toBeNull()
  })

  it('PU-53 · con 14 iguales sigue hasta que alguno saque dos de diferencia', () => {
    const eventos = [...unSet(14, 14), punto(E1)] // 15-14: todavía no alcanza
    let m = marcadorPorSets(eventos, E1, { puntosPorSet: 15, setsParaGanar: 2 })
    expect(m.sets).toHaveLength(0)
    expect(m.actual).toEqual({ a: 15, b: 14 })
    m = marcadorPorSets([...eventos, punto(E1)], E1, { puntosPorSet: 15, setsParaGanar: 2 })
    expect(m.sets).toEqual([{ a: 16, b: 14 }])
  })

  it('PU-54 · gana el partido quien llega primero a los sets que hacen falta', () => {
    const eventos = [...unSet(15, 9), ...unSet(15, 10)]
    const m = marcadorPorSets(eventos, E1, { puntosPorSet: 15, setsParaGanar: 2 })
    expect(m.ganados1).toBe(2)
    expect(m.ganador).toBe(1)
    // Un punto jugado despues de ganar el partido no se cuenta
    const extra = marcadorPorSets([...eventos, punto(E2)], E1, { puntosPorSet: 15, setsParaGanar: 2 })
    expect(extra.sets).toEqual(m.sets)
  })

  it('PU-55 · sin configuración de sets (fútbol, básquet) no hay marcador por sets', () => {
    expect(marcadorPorSets([punto(E1)], E1, {})).toBeNull()
    expect(marcadorPorSets([punto(E1)], E1, { puntosPorSet: 15 })).toBeNull()
  })
})
