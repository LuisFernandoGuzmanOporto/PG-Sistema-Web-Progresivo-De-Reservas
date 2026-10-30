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

/** Hoy en Bolivia, como 'AAAA-MM-DD'. */
export const hoyBolivia = () => FORMATO.format(new Date())
