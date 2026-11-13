// ─────────────────────────────────────────────────────────────────────────────
// CUANDO SE PUBLICA UNA VERSIÓN NUEVA CON LA APLICACIÓN ABIERTA
//
// Cada pantalla se descarga recién al abrirla, en un archivo con un nombre que
// cambia en cada publicación. Si alguien tenía la aplicación abierta cuando se
// publicó una versión nueva, la página vieja pide el archivo viejo, que ya no
// existe, y la pantalla se rompía con «Se nos rompió esta pantalla».
//
// No es un error de la pantalla: basta con recargar para traer la versión
// nueva. Se recarga sola UNA vez; si vuelve a fallar enseguida, se deja que se
// vea el aviso normal en vez de recargar sin fin.
// ─────────────────────────────────────────────────────────────────────────────

const CLAVE = 'sportika.recargaPorVersion'

/** El error es de un archivo de una versión anterior que ya no está. */
export const esArchivoViejo = (error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS/i
    .test(String(error?.message || error || ''))

/** Recarga una vez. Devuelve false si ya se recargó hace poco. */
export function recargarPorVersionNueva() {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) || 0)
    if (Date.now() - ultima < 30_000) return false
    sessionStorage.setItem(CLAVE, String(Date.now()))
  } catch {
    // Sin almacenamiento (ventana privada) igual se recarga
  }
  window.location.reload()
  return true
}
