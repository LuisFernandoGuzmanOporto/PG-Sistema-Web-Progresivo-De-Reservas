// ─────────────────────────────────────────────────────────────────────────────
// La hora de un partido espontáneo (migraciones/040).
//
// La base guarda la fecha y hora real del partido. Lo que se muestra se
// calcula con el reloj de ese momento: «Ahora», «En 20 min», «Hoy 19:00»,
// «Mañana 08:00» o «Sáb 4 oct, 18:30». Antes se guardaba el texto que eligió
// quien lo creó («Ahora mismo») y días después el partido seguía diciendo
// «Ahora». Una hora después de empezar, el partido ya se jugó y deja de
// aparecer en las listas.
// ─────────────────────────────────────────────────────────────────────────────

const MINUTO = 60 * 1000
const UNA_HORA = 60 * MINUTO

const DIAS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const hhmm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
const mismoDia = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Si empezó hace más de una hora (o no tiene hora): para la aplicación ya se jugó. */
export function yaSeJugo(fechaHora, ahora = new Date()) {
  if (!fechaHora) return true
  return new Date(fechaHora).getTime() < ahora.getTime() - UNA_HORA
}

/** Cuándo se juega, dicho como lo diría una persona. */
export function horaDelPartido(fechaHora, ahora = new Date()) {
  if (!fechaHora) return ''
  const f = new Date(fechaHora)
  const minutos = Math.round((f.getTime() - ahora.getTime()) / MINUTO)
  if (minutos <= 5) return 'Ahora'
  if (minutos < 60) return `En ${minutos} min`
  if (mismoDia(f, ahora)) return 'Hoy ' + hhmm(f)
  const manana = new Date(ahora)
  manana.setDate(ahora.getDate() + 1)
  if (mismoDia(f, manana)) return 'Mañana ' + hhmm(f)
  return `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}, ${hhmm(f)}`
}

/**
 * La fecha y hora que eligió quien organiza el partido, en el formato que
 * guarda la base. «Ahora mismo» devuelve null: la pone la base con su reloj.
 * Si falta la fecha de «Otro día», devuelve undefined.
 */
export function fechaHoraElegida(opcion, { fecha, hora } = {}, ahora = new Date()) {
  if (opcion === 'Ahora mismo') return null
  if (opcion === 'En 30 min') return new Date(ahora.getTime() + 30 * MINUTO).toISOString()
  if (opcion === 'En 1 hora') return new Date(ahora.getTime() + UNA_HORA).toISOString()

  let dia
  if (opcion === 'Mañana') {
    dia = new Date(ahora)
    dia.setDate(ahora.getDate() + 1)
  } else {
    if (!fecha) return undefined
    const [a, m, d] = fecha.split('-').map(Number)
    dia = new Date(a, m - 1, d)
  }
  const [h, min] = String(hora || '00:00').split(':').map(Number)
  dia.setHours(h || 0, min || 0, 0, 0)
  return dia.toISOString()
}
