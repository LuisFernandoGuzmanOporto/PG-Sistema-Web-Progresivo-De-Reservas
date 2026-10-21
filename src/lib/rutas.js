// ─────────────────────────────────────────────────────────────────────────────
// Solo se navega a direcciones de la propia aplicación.
//
// El destino a veces viene de afuera (a dónde volver después del login, el
// enlace de una notificación). Una dirección como «//sitio-falso.com» o
// «/\sitio-falso.com» el navegador la toma como OTRO sitio: sería una forma de
// llevar a alguien a una página falsa desde un enlace de Sportika.
// ─────────────────────────────────────────────────────────────────────────────
export function rutaInterna(destino) {
  if (typeof destino !== 'string') return null
  if (!destino.startsWith('/')) return null
  if (destino.startsWith('//') || destino.startsWith('/\\')) return null
  // Caracteres de control (tabulaciones, saltos de línea) que el navegador ignora
  if ([...destino].some(c => c.charCodeAt(0) < 32)) return null
  return destino
}
