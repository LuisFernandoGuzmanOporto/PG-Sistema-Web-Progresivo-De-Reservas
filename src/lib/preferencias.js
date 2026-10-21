// ─────────────────────────────────────────────────────────────────────────────
// EL DEPORTE FAVORITO DEL CLIENTE
//
// Lo elige en Mi Perfil. No esconde nada: lo de su deporte aparece primero y
// el resto sigue debajo, en el mismo orden de siempre. Así el que juega pádel
// ve primero las canchas, los partidos y los torneos de pádel, pero si un día
// quiere jugar fútbol, también los encuentra.
// ─────────────────────────────────────────────────────────────────────────────

/** 'Fútbol 5' → 'futbol 5'. Para comparar sin importar tildes ni mayúsculas. */
const normalizar = (t) =>
  String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** ¿Este deporte es el favorito? 'Fútbol 5' cuenta como Fútbol. */
export function esMiDeporte(deporte, favorito) {
  if (!favorito || !deporte) return false
  return normalizar(deporte).startsWith(normalizar(favorito))
}

/**
 * Pone primero lo del deporte favorito, sin quitar nada y sin desordenar lo
 * demás. `deportesDe` dice de qué deporte es cada cosa: un partido tiene uno,
 * un complejo puede tener varios.
 */
export function primeroMiDeporte(lista, favorito, deportesDe = (x) => x.deporte) {
  if (!favorito) return lista
  const es = (x) => [].concat(deportesDe(x) || []).some(d => esMiDeporte(d, favorito))
  return [...lista.filter(es), ...lista.filter(x => !es(x))]
}

export const EMOJI_DEPORTE = {
  'Fútbol': '⚽', 'Wally': '🎾', 'Básquetbol': '🏀', 'Voleibol': '🏐', 'Pádel': '🏓', 'Tenis': '🎾',
}
