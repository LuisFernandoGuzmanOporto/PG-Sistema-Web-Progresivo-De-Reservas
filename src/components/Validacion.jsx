// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE FORMULARIOS
//
// Un solo criterio en toda la aplicación:
//
//   1. El campo con problema se marca en rojo y, justo debajo, se dice qué
//      pasa y cómo corregirlo («El teléfono debe tener 7 u 8 dígitos»).
//   2. Arriba del botón, un resumen con todo lo pendiente (AvisoFaltantes).
//      Cada punto del resumen lleva al campo con un toque.
//   3. Al intentar guardar con errores, la pantalla va sola al primero.
//
// Los campos se identifican con id="campo-<nombre>", así el resumen y el
// desplazamiento saben a dónde ir, y los lectores de pantalla asocian el
// mensaje con su campo (aria-invalid y aria-describedby).
// ─────────────────────────────────────────────────────────────────────────────

/** Propiedades para un <input>, <select> o <textarea> validado. */
export const propsCampo = (nombre, error, mostrar = true) => ({
  id: 'campo-' + nombre,
  'aria-invalid': mostrar && error ? 'true' : undefined,
  'aria-describedby': mostrar && error ? 'error-' + nombre : undefined,
})

/** El mensaje debajo del campo. No ocupa lugar si no hay error. */
export function MensajeCampo({ nombre, error, mostrar = true }) {
  if (!mostrar || !error) return null
  return (
    <p id={'error-' + nombre} className="mensaje-campo" role="alert">
      <span aria-hidden="true">⚠</span><span>{error}</span>
    </p>
  )
}

/** Lleva la pantalla al campo y lo deja listo para escribir. */
export function irAlCampo(nombre) {
  const el = document.getElementById('campo-' + nombre)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => el.focus({ preventScroll: true }), 250)
}

/** Después de intentar guardar: al primer campo con error, en el orden dado. */
export function irAlPrimerError(errores, orden) {
  const primero = (orden || Object.keys(errores)).find(k => errores[k])
  if (primero) irAlCampo(primero)
}
