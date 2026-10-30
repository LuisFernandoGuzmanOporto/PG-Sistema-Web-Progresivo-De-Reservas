// ─────────────────────────────────────────────────────────────────────────────
// LA FECHA DE HOY EN BOLIVIA
//
// Es la única forma de saber qué día es "hoy" en todo el sistema.
//
// No se usa toISOString(): esa fecha es la de UTC, y Bolivia está cuatro horas
// atrás. Desde las 20:00 hasta la medianoche, en UTC ya es el día siguiente, y
// las reservas de mañana aparecían como "Hoy" en el panel del complejo.
// Tampoco se confía en la zona horaria del dispositivo: SPORTIKA es de
// Cochabamba, y el día tiene que ser el de aquí aunque el teléfono o la
// computadora estén configurados en otra zona.
// ─────────────────────────────────────────────────────────────────────────────

const FORMATO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
})

const FORMATO_HORA = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false,
})

/** Hoy en Bolivia, como 'AAAA-MM-DD'. */
export const hoyBolivia = () => FORMATO.format(new Date())

/**
 * El día en Bolivia de un instante que guardó la base, como 'AAAA-MM-DD'.
 * Supabase devuelve created_at en UTC: cortar sus primeros 10 caracteres daba
 * el día siguiente para todo lo hecho después de las 20:00.
 */
export const fechaDeBolivia = (instante) => instante ? FORMATO.format(new Date(instante)) : ''

/** La hora en Bolivia de ese mismo instante, como 'HH:MM'. */
export const horaDeBolivia = (instante) => instante ? FORMATO_HORA.format(new Date(instante)) : ''

// ── Cómo se escriben las fechas en pantalla ─────────────────────────────────
// Un solo formato para toda la aplicación: «17 Sep». toLocaleDateString con
// mes corto escribe «17-sept» o «17 sept 2026» según el navegador, y la misma
// pantalla mezclaba los dos.
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** '2026-09-17' → '17 Sep'. */
export const fechaCorta = (iso) => {
  if (!iso) return ''
  const [, m, d] = String(iso).split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]}`
}

/** Un instante de la base → '17 Sep', con el día de Bolivia. */
export const fechaCortaDeBolivia = (instante) => fechaCorta(fechaDeBolivia(instante))

/** El momento actual como lo anota la bitácora: { fecha: '30 Oct', hora: '21:51' }. */
export const ahoraEnBolivia = () => {
  const ahora = new Date()
  return { fecha: fechaCorta(hoyBolivia()), hora: horaDeBolivia(ahora) }
}

/** '2026-10-31' → 'sáb 31 oct'. */
export const diaConFecha = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-').map(Number)
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} ${MESES[m - 1].toLowerCase()}`
}

/** El día de una reserva: 'Hoy, vie 30 oct', 'Mañana, sáb 31 oct' o 'Lun 3 nov'. */
export const diaDeReserva = (iso, hoy = hoyBolivia()) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-').map(Number)
  const [ah, mh, dh] = String(hoy).split('-').map(Number)
  const dias = Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ah, mh - 1, dh)) / 86400000)
  const texto = diaConFecha(iso)
  if (dias === 0) return 'Hoy, ' + texto
  if (dias === 1) return 'Mañana, ' + texto
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Los días de un horario se guardan sin tilde ('Mie', 'Sab'): así los tiene la
// base y así se comparan. En pantalla van con tilde.
const CON_TILDE = { Mie: 'Mié', Sab: 'Sáb' }

/** 'Mie' → 'Mié'. Los demás quedan igual. */
export const nombreDia = (d) => CON_TILDE[d] || d

/** ['Lun', 'Mie'] → 'Lun, Mié'. */
export const diasLegibles = (dias) => (dias || []).map(nombreDia).join(', ')
