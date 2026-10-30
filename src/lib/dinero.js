// ─────────────────────────────────────────────────────────────────────────────
// LOS MONTOS EN BOLIVIANOS
//
// Un monto se escribe como en Bolivia: coma para los centavos y punto para los
// miles. Antes se mostraba el número tal cual, y una reserva con descuento
// decía "Bs. 79.2". Ahora dice "Bs. 79,20". Los montos enteros, que son casi
// todos (el precio por hora de una cancha), se dejan sin centavos: "Bs. 80".
// ─────────────────────────────────────────────────────────────────────────────

const CON_CENTAVOS = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const SIN_CENTAVOS = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })

/** El monto listo para ir después de "Bs. ": 79.2 → '79,20', 1250 → '1.250'. */
export const montoBs = (monto) => {
  if (monto == null || monto === '') return '—'
  const n = Number(monto)
  if (!Number.isFinite(n)) return String(monto)       // un '—' que ya venía armado
  const centavos = Math.round(n * 100)
  return (centavos % 100 === 0 ? SIN_CENTAVOS : CON_CENTAVOS).format(centavos / 100)
}

/** Un número entero con punto de miles, como los montos: 2590 → '2.590'. */
export const miles = (n) => SIN_CENTAVOS.format(Number(n) || 0)
