// ─────────────────────────────────────────────────────────────────────────────
// JORNADAS DE UN TORNEO
//
// Un torneo no ocupa la cancha "del 10 al 20": ocupa unos dias concretos
// dentro de ese rango, en una franja horaria. Estas funciones traducen lo que
// el organizador elige (rango + dias de la semana + horario) a la lista de
// fechas reales que hay que reservar.
//
// Vive aqui y no en la pantalla porque lo necesitan tres lugares: el
// formulario de creacion (para el aviso de choques y el total), el guardado
// (para crear las reservas) y la reprogramacion.
// ─────────────────────────────────────────────────────────────────────────────

/** Los dias tal como los nombra el resto del sistema (entrenamientos incluidos). */
export const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

/** De nombre a numero de dia, como los devuelve Date.getDay(). */
export const DIA_INDICE = { Dom: 0, Lun: 1, Mar: 2, Mie: 3, Jue: 4, Vie: 5, Sab: 6 }

/** '2026-09-16' -> Date local. Se evita new Date(iso) porque interpreta UTC. */
const aFecha = (iso) => {
  const [a, m, d] = String(iso).split('-').map(Number)
  return new Date(a, m - 1, d)
}

const aISO = (fecha) =>
  fecha.getFullYear() + '-' +
  String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
  String(fecha.getDate()).padStart(2, '0')

/**
 * Las fechas concretas en que se juega.
 *
 * Ejemplo: del 10 al 20 de septiembre, sabados y domingos -> [12, 13, 19, 20].
 * Si no se eligio ningun dia, se entiende que se juega todos.
 */
export function jornadasDelTorneo({ fechaInicio, fechaFin, dias }) {
  if (!fechaInicio || !fechaFin) return []

  const desde = aFecha(fechaInicio)
  const hasta = aFecha(fechaFin)
  if (hasta < desde) return []

  const permitidos = dias?.length ? dias.map(d => DIA_INDICE[d]) : null
  const fechas = []

  for (const d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
    if (!permitidos || permitidos.includes(d.getDay())) fechas.push(aISO(d))
  }
  return fechas
}

/** Cuantas horas dura cada jornada. '14:00' a '18:00' son 4. */
export function horasPorJornada(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0
  const h = (t) => Number(String(t).slice(0, 2))
  return Math.max(0, h(horaFin) - h(horaInicio))
}

/**
 * Lo que le va a costar al organizador reservar la cancha.
 * Es informativo: sirve para que sepa de cuanto habla antes de pedirla.
 */
export function costoDelTorneo({ fechaInicio, fechaFin, dias, horaInicio, horaFin, precioHora }) {
  const jornadas = jornadasDelTorneo({ fechaInicio, fechaFin, dias }).length
  const horas    = horasPorJornada(horaInicio, horaFin)
  return {
    jornadas,
    horasPorJornada: horas,
    horasTotales: jornadas * horas,
    total: jornadas * horas * (Number(precioHora) || 0),
  }
}

/**
 * Los dias de la semana que de verdad caen entre dos fechas.
 *
 * Del viernes 13 al sabado 14 solo caen Vie y Sab: marcar el domingo no
 * agrega ninguna jornada, y antes se dejaba marcar sin decir nada.
 * Sin fechas completas se devuelven todos, para no apagar nada todavia.
 */
export function diasEnElRango(fechaInicio, fechaFin) {
  const fechas = jornadasDelTorneo({ fechaInicio, fechaFin, dias: [] })
  if (!fechaInicio || !fechaFin || !fechas.length) return [...DIAS_SEMANA]
  const indices = new Set(fechas.slice(0, 7).map(f => aFecha(f).getDay()))
  return DIAS_SEMANA.filter(d => indices.has(DIA_INDICE[d]))
}

/**
 * Entre que horas se puede jugar en una cancha: el horario del complejo, y si
 * la cancha tiene uno propio mas corto, ese. La base de datos aplica la misma
 * regla al reservar las jornadas, pero recien cuando el complejo aprueba; por
 * eso se revisa antes, en el formulario. Un cierre a las 00:00 es medianoche.
 */
export function horarioDeJuego(empresa, cancha) {
  const fin = (h) => h === '00:00' ? '24:00' : h
  let desde = empresa?.apertura || null
  let hasta = empresa?.cierre || null
  const propio = cancha?.apertura && cancha?.cierre
  if (propio && (!desde || cancha.apertura > desde)) desde = cancha.apertura
  if (propio && (!hasta || fin(cancha.cierre) < fin(hasta))) hasta = cancha.cierre
  if (!desde || !hasta) return null
  return {
    desde, hasta,
    texto: `${propio ? 'Esta cancha' : 'El complejo'} atiende de ${desde} a ${hasta}.`,
    /** Que esta mal de ese horario, o null si entra. */
    revisar(horaInicio, horaFin) {
      if (horaInicio && horaInicio < desde) return { campo: 'horaInicio', texto: `${this.texto} El torneo puede empezar desde las ${desde}.` }
      if (horaFin && hasta !== '00:00' && horaFin > hasta) return { campo: 'horaFin', texto: `${this.texto} El torneo tiene que terminar a las ${hasta} como máximo.` }
      return null
    },
  }
}
