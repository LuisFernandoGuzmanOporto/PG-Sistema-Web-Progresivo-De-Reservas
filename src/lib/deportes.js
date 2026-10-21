// ─────────────────────────────────────────────────────────────────────────────
// COMO SE JUEGA CADA DEPORTE
//
// Cuantos entran a la cancha, que formatos tienen sentido, si se cuentan goles
// o puntos, si hay tarjetas, y las reglas con las que casi siempre se arranca.
//
// Vive aca y no dentro de una pantalla porque lo necesitan los dos formularios
// de creacion: el del cliente que arma su torneo en un complejo, y el del
// complejo que arma el suyo. Antes solo lo tenia el del cliente, y por eso el
// complejo elegia el deporte de una lista fija de cinco —incluso deportes que
// no ofrece— y no se le precargaba nada.
// ─────────────────────────────────────────────────────────────────────────────

export const DEPORTE_CONFIG = {
  'Fútbol': {
    // Se cuentan goles o puntos y gana el que tiene mas al final
    porSets: false,
    emoji: '⚽',
    jugadoresTitulares: 11,
    suplentes: 3,
    tieneMinutos: true,
    tieneAmarillas: true,
    tieneRojas: true,
    tieneGoles: true,
    tienePuntos: false,
    formatoTiempo: 'tiempos',
    duracionDefault: 45,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa', 'Grupos + Eliminación'],
    reglasBase: [
      'Partidos de 90 minutos (2 tiempos de 45 min)',
      'En caso de empate en eliminatoria: penales',
      'Tarjeta roja = suspensión del siguiente partido',
      'Todos los jugadores deben ser mayores de 16 años',
    ],
  },
  'Básquetbol': {
    // Se cuentan goles o puntos y gana el que tiene mas al final
    porSets: false,
    emoji: '🏀',
    jugadoresTitulares: 5,
    suplentes: 3,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'cuartos',
    duracionDefault: 10,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa'],
    reglasBase: [
      'Partidos de 4 cuartos de 10 minutos',
      'En caso de empate: tiempo extra de 5 minutos',
      'Mínimo 5 jugadores por equipo en cancha',
    ],
  },
  'Voleibol': {
    // Sugerencias: cambian segun quien organice, por eso se eligen
    // al crear el torneo y no quedan fijas aca.
    porSets: true,
    puntosPorSet: 25,
    setsParaGanar: 3,
    emoji: '🏐',
    jugadoresTitulares: 6,
    suplentes: 2,
    tieneMinutos: false,
    tieneAmarillas: true,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 25,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa', 'Grupos + Eliminación'],
    reglasBase: [
      'Sets a 25 puntos con ventaja de 2',
      'Set decisivo a 15 puntos',
      'Mínimo 3 mujeres en cancha (mixto)',
    ],
  },
  'Wally': {
    // Sugerencias: cambian segun quien organice, por eso se eligen
    // al crear el torneo y no quedan fijas aca.
    porSets: true,
    puntosPorSet: 15,
    setsParaGanar: 2,
    emoji: '🎾',
    // Sugerencia, no regla: el wally se juega de a dos, de a cuatro y de a mas
    // segun el lugar. Quien organiza lo cambia al crear el torneo.
    jugadoresTitulares: 4,
    suplentes: 2,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 21,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa'],
    reglasBase: [
      'Modalidad dobles',
      'Partidos al mejor de 3 sets',
      'Set ganado a 21 puntos con ventaja de 2',
    ],
  },
  'Pádel': {
    // Sugerencias: cambian segun quien organice, por eso se eligen
    // al crear el torneo y no quedan fijas aca.
    porSets: true,
    puntosPorSet: 6,
    setsParaGanar: 2,
    emoji: '🏓',
    jugadoresTitulares: 2,
    suplentes: 0,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 6,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa'],
    reglasBase: [
      'Modalidad dobles mixtos',
      'Partidos al mejor de 3 sets con tie-break',
      'Reglas oficiales de la FIP',
    ],
  },
  'Tenis': {
    // Sugerencias: cambian segun quien organice, por eso se eligen
    // al crear el torneo y no quedan fijas aca.
    porSets: true,
    puntosPorSet: 6,
    setsParaGanar: 2,
    emoji: '🎾',
    jugadoresTitulares: 2,
    suplentes: 0,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 6,
    formatos: ['Eliminación directa'],
    reglasBase: [
      'Partidos al mejor de 3 sets con tie-break',
      'Reglas oficiales de la ITF',
    ],
  },
}
