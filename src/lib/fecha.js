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
