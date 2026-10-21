// ============================================================================
// Motor de torneos de SPORTIKA
// Tablas de posiciones, sorteo de grupos y cruces de la fase eliminatoria.
// La tabla NUNCA se guarda: siempre se calcula desde los partidos finalizados.
// ============================================================================

export const FORMATOS = {
  LIGA:      'Liga (todos contra todos)',
  ELIMINACION: 'Eliminación directa',
  GRUPOS:    'Grupos + Eliminación',
}

// Deportes en los que un partido no puede terminar empatado
const SIN_EMPATE = ['Basquetbol', 'Básquetbol', 'Voleibol', 'Wally', 'Tenis', 'Padel', 'Pádel']

export const puntajePorDeporte = (deporte) =>
  SIN_EMPATE.includes(deporte)
    ? { victoria: 2, empate: 0, derrota: 0, admiteEmpate: false }
    : { victoria: 3, empate: 1, derrota: 0, admiteEmpate: true }

/**
 * Como se llaman las columnas de la tabla en cada deporte.
 *
 * Antes decia GF y GC siempre —"goles a favor", "goles en contra"— incluso en
 * voley, donde lo que se cuenta son sets, y en basquet, donde son puntos. La
 * tabla mostraba el numero correcto con el nombre equivocado.
 */
const ETIQUETAS = {
  'Futbol':     { aFavor: 'GF', enContra: 'GC', dif: 'DG', cuenta: 'goles'  },
  'Basquetbol': { aFavor: 'PF', enContra: 'PC', dif: 'DIF', cuenta: 'puntos' },
  'Voleibol':   { aFavor: 'SF', enContra: 'SC', dif: 'DIF', cuenta: 'sets'   },
  'Wally':      { aFavor: 'PF', enContra: 'PC', dif: 'DIF', cuenta: 'puntos' },
  'Tenis':      { aFavor: 'JF', enContra: 'JC', dif: 'DIF', cuenta: 'juegos' },
  'Padel':      { aFavor: 'JF', enContra: 'JC', dif: 'DIF', cuenta: 'juegos' },
}
// El nombre del deporte se escribe acentuado en casi toda la aplicacion
ETIQUETAS['F\u00fatbol']     = ETIQUETAS['Futbol']
ETIQUETAS['B\u00e1squetbol'] = ETIQUETAS['Basquetbol']
ETIQUETAS['P\u00e1del']      = ETIQUETAS['Padel']

export const etiquetasDeTabla = (deporte) =>
  ETIQUETAS[deporte] || ETIQUETAS['Futbol']

// ── Tabla de posiciones ────────────────────────────────────────────────────
// equipos:  [{ id, nombre }]
// partidos: [{ equipo1, equipo2, g1, g2, estado }]  (se usan solo los finalizados)
//
// Con { enVivo: true } la tabla suma tambien el resultado PARCIAL de los
// partidos que se estan jugando, como las tablas «en vivo» de la tele: si un
// equipo va ganando, ya aparece con esos puntos. Cada fila de un equipo que
// esta jugando lleva enJuego: 'gana' | 'empata' | 'pierde' y el marcador, para
// que la pantalla lo marque. Es solo para MOSTRAR: el cuadro eliminatorio se
// arma siempre con la tabla de partidos terminados (sin esta opcion).
export function calcularTabla(equipos, partidos, deporte = 'Futbol', { enVivo = false } = {}) {
  const pt = puntajePorDeporte(deporte)
  const base = {}
  equipos.forEach(e => {
    base[e.nombre] = { ...e, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0, pts: 0, enJuego: null }
  })

  const jugados = partidos.filter(p => p.estado === 'finalizado' || (enVivo && p.estado === 'en_vivo'))
  jugados.forEach(p => {
    const a = base[p.equipo1]
    const b = base[p.equipo2]
    if (!a || !b) return
    const g1 = Number(p.g1) || 0
    const g2 = Number(p.g2) || 0
    const vivo = p.estado === 'en_vivo'
    a.pj++; b.pj++
    a.gf += g1; a.gc += g2
    b.gf += g2; b.gc += g1
    if (g1 > g2)      { a.pg++; b.pp++; a.pts += pt.victoria; b.pts += pt.derrota }
    else if (g2 > g1) { b.pg++; a.pp++; b.pts += pt.victoria; a.pts += pt.derrota }
    // En los deportes sin empate, un partido igualado todavia se esta
    // definiendo: cuenta como jugado, pero no suma nada a nadie
    else if (vivo && !pt.admiteEmpate) { /* sin puntos hasta que alguien gane */ }
    else              { a.pe++; b.pe++; a.pts += pt.empate;   b.pts += pt.empate }
    if (vivo) {
      a.enJuego = g1 > g2 ? 'gana' : g1 < g2 ? 'pierde' : 'empata'
      b.enJuego = g2 > g1 ? 'gana' : g2 < g1 ? 'pierde' : 'empata'
      a.marcador = `${g1}-${g2}`; b.marcador = `${g2}-${g1}`
    }
  })

  const filas = Object.values(base)
  filas.forEach(f => { f.dif = f.gf - f.gc })

  // Desempate: puntos → diferencia → goles a favor → enfrentamiento directo → nombre
  filas.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.dif !== a.dif) return b.dif - a.dif
    if (b.gf !== a.gf)   return b.gf - a.gf
    const directo = enfrentamientoDirecto(a, b, jugados)
    if (directo !== 0) return directo
    return a.nombre.localeCompare(b.nombre)
  })

  return filas.map((f, i) => ({ ...f, pos: i + 1 }))
}

// Devuelve un número negativo si "a" debe ir por encima de "b"
function enfrentamientoDirecto(a, b, jugados) {
  const p = jugados.find(x =>
    (x.equipo1 === a.nombre && x.equipo2 === b.nombre) ||
    (x.equipo1 === b.nombre && x.equipo2 === a.nombre))
  if (!p) return 0
  const golesA = p.equipo1 === a.nombre ? Number(p.g1) : Number(p.g2)
  const golesB = p.equipo1 === a.nombre ? Number(p.g2) : Number(p.g1)
  return golesB - golesA
}

export const CRITERIOS_DESEMPATE = [
  'Mayor cantidad de puntos',
  'Mejor diferencia de goles',
  'Mayor cantidad de goles a favor',
  'Resultado del enfrentamiento directo',
]

// ── Sorteo de grupos ───────────────────────────────────────────────────────
// Reparte al azar los equipos aprobados entre la cantidad de grupos indicada.
export function sortearGrupos(equipos, numGrupos) {
  const mezclados = [...equipos]
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = mezclados[i]; mezclados[i] = mezclados[j]; mezclados[j] = tmp
  }
  const letras = 'ABCDEFGH'.slice(0, numGrupos).split('')
  const grupos = {}
  letras.forEach(l => { grupos[l] = [] })
  mezclados.forEach((e, i) => { grupos[letras[i % numGrupos]].push(e) })
  return grupos
}

// Cantidad de grupos sugerida según los equipos inscritos (4 equipos por grupo)
export function gruposSugeridos(cantidadEquipos) {
  if (cantidadEquipos <= 5) return 1
  if (cantidadEquipos <= 10) return 2
  if (cantidadEquipos <= 20) return 4
  return 8
}

// Todos los partidos de la fase de grupos ya se jugaron
export function gruposFinalizados(partidos) {
  const deGrupos = partidos.filter(p => p.fase === 'grupos' || (!p.fase && p.grupo))
  return deGrupos.length > 0 && deGrupos.every(p => p.estado === 'finalizado')
}

// ── Cuadro de la fase eliminatoria ─────────────────────────────────────────
// Se arma como el de la Champions: el cuadro se parte en dos lados y los
// punteros de grupos emparejados van a lados opuestos, de modo que solo
// pueden encontrarse en la final.
//
//   Grupos A y B  ->  1ºA-2ºB queda en el lado izquierdo
//                     1ºB-2ºA queda en el lado derecho
//
// Con 2 grupos se juegan semifinales, con 4 cuartos y con 8 octavos.

// Nombre de la ronda según cuántas llaves tiene
export function nombreRonda(cantidadLlaves) {
  if (cantidadLlaves >= 8) return 'Octavos de final'
  if (cantidadLlaves === 4) return 'Cuartos de final'
  if (cantidadLlaves === 2) return 'Semifinales'
  return 'Final'
}

// Primera ronda de la eliminatoria, ya ordenada por lados del cuadro
export function generarCruces(tablas, clasificanPorGrupo = 2) {
  const claves = Object.keys(tablas).sort()
  const equipo = (grupo, pos) => tablas[grupo]?.[pos - 1]?.nombre || null

  // Un solo grupo: se cruzan 1º-4º y 2º-3º
  if (claves.length === 1) {
    const [A] = claves
    const llaves = [
      cruce(`1º ${A}`, `4º ${A}`, equipo(A, 1), equipo(A, 4), 'izquierda'),
      cruce(`2º ${A}`, `3º ${A}`, equipo(A, 2), equipo(A, 3), 'derecha'),
    ]
    return numerar(llaves)
  }

  // Los grupos se emparejan de a dos: (A,B), (C,D), (E,F), (G,H)
  const izquierda = []
  const derecha = []
  for (let i = 0; i < claves.length; i += 2) {
    const X = claves[i]
    const Y = claves[i + 1] || claves[i]
    izquierda.push(cruce(`1º ${X}`, `2º ${Y}`, equipo(X, 1), equipo(Y, 2), 'izquierda'))
    derecha.push(cruce(`1º ${Y}`, `2º ${X}`, equipo(Y, 1), equipo(X, 2), 'derecha'))
  }
  return numerar([...izquierda, ...derecha])
}

function numerar(llaves) {
  const ronda = nombreRonda(llaves.length)
  return llaves.map((l, i) => ({
    ...l,
    ronda,
    llave: llaves.length === 1 ? ronda : `${ronda} ${i + 1}`,
  }))
}

function cruce(etiqueta1, etiqueta2, equipo1, equipo2, lado = 'izquierda') {
  return {
    etiqueta1, etiqueta2, lado,
    equipo1: equipo1 || etiqueta1,
    equipo2: equipo2 || etiqueta2,
    definido: Boolean(equipo1 && equipo2),
    g1: 0, g2: 0, estado: 'programado',
  }
}

// Cuadro completo: todas las rondas desde la primera hasta la final.
// Cada ronda se calcula con los ganadores de la anterior; si aún no están
// definidos, la ronda queda con los espacios en blanco ("Ganador Cuartos 1").
export function generarCuadro(tablas, clasificanPorGrupo = 2, resultados = {}) {
  const rondas = []
  let actual = generarCruces(tablas, clasificanPorGrupo)
  while (true) {
    // Se aplican los resultados ya cargados por la mesa técnica
    actual = actual.map(l => ({ ...l, ...(resultados[l.llave] || {}) }))
    rondas.push(actual)
    if (actual.length <= 1) break
    actual = siguienteRonda(actual)
  }
  return rondas
}

/**
 * Lo ya jugado de la eliminatoria, en la forma que espera generarCuadro().
 *
 * Los partidos de la llave se guardan en la misma lista que los de grupos, y
 * se reconocen porque llevan el nombre de la llave ('Semifinales 1', 'Final').
 * Sin esto el cuadro se dibujaba en blanco cada vez que se recargaba la
 * pagina, aunque los resultados estuvieran guardados.
 */
export function resultadosDeLlave(partidos = []) {
  const out = {}
  for (const p of partidos) {
    if (p.fase === 'grupos' || !p.llave) continue
    out[p.llave] = {
      g1: p.g1, g2: p.g2, am1: p.am1, am2: p.am2, rj1: p.rj1, rj2: p.rj2,
      pen1: p.pen1, pen2: p.pen2, tanda: p.tanda,
      estado: p.estado, minuto: p.minuto, eventos: p.eventos,
      // Cuando nacio la fila: ordena la llave respecto de los grupos al
      // contar amarillas y rojas
      creado: p.creado,
    }
  }
  return out
}

// Marca qué posiciones de la tabla clasifican a la siguiente fase
export function marcarClasificados(tabla, clasificanPorGrupo = 2) {
  return tabla.map(f => ({ ...f, clasifica: f.pos <= clasificanPorGrupo }))
}

// Ganador de una llave ya finalizada.
// En la eliminatoria no puede haber empate: si el marcador queda igualado,
// el ganador se define por la tanda de penales que carga la mesa técnica.
export function ganadorDeLlave(l) {
  if (!l || l.estado !== 'finalizado') return null
  if (l.g1 > l.g2) return l.equipo1
  if (l.g2 > l.g1) return l.equipo2
  if (l.pen1 != null && l.pen2 != null && l.pen1 !== l.pen2) {
    return l.pen1 > l.pen2 ? l.equipo1 : l.equipo2
  }
  return null   // sigue empatado: falta definir la tanda de penales
}

// ── Tanda de penales ───────────────────────────────────────────────────────
// Se registra tiro por tiro. Primero la serie de cinco por equipo y, si sigue
// igualada, muerte súbita de a un tiro por lado.
export const PENALES_SERIE = 5

// tiros: [{ equipo: 1 | 2, anoto: boolean }] en el orden en que se patearon
export function estadoTanda(tiros = []) {
  let a = 0, b = 0, tirosA = 0, tirosB = 0
  tiros.forEach(t => {
    if (t.equipo === 1) { tirosA++; if (t.anoto) a++ }
    else                { tirosB++; if (t.anoto) b++ }
  })

  // Patea primero el equipo 1 y luego se alterna
  const turno = tirosA <= tirosB ? 1 : 2
  const enSerie = tirosA < PENALES_SERIE || tirosB < PENALES_SERIE

  let ganador = null
  let motivo = ''

  if (enSerie) {
    // Se corta antes si al rival ya no le alcanzan los tiros que le quedan
    const restanA = Math.max(0, PENALES_SERIE - tirosA)
    const restanB = Math.max(0, PENALES_SERIE - tirosB)
    if (a > b + restanB)      { ganador = 1; motivo = 'Definida antes de completar la serie' }
    else if (b > a + restanA) { ganador = 2; motivo = 'Definida antes de completar la serie' }
  } else if (tirosA === tirosB && a !== b) {
    ganador = a > b ? 1 : 2
    motivo = tirosA > PENALES_SERIE ? 'Definida en muerte súbita' : 'Definida en la serie de cinco'
  }

  return {
    a, b, tirosA, tirosB, turno, enSerie, ganador, motivo,
    finalizada: ganador !== null,
    // Número de tiro que corresponde al equipo al que le toca patear
    numeroTiro: (turno === 1 ? tirosA : tirosB) + 1,
    muerteSubita: !enSerie && a === b,
  }
}

// Avanza los ganadores de una ronda a la siguiente.
// Los cruces que aún no tienen ganador quedan como "Ganador Cuartos de final 1".
export function siguienteRonda(llaves) {
  const siguientes = []
  for (let i = 0; i < llaves.length; i += 2) {
    const a = llaves[i]
    const b = llaves[i + 1]
    const lado = b && a.lado === b.lado ? a.lado : 'centro'
    siguientes.push(cruce(
      `Ganador ${a.llave}`,
      b ? `Ganador ${b.llave}` : 'Libre',
      ganadorDeLlave(a),
      b ? ganadorDeLlave(b) : a.equipo1,
      lado))
  }
  return numerar(siguientes)
}

// ── Fixture de la fase de grupos ───────────────────────────────────────────
// Se arma con el método del círculo: en cada jornada todos juegan una vez,
// así ningún equipo queda con dos partidos a la misma hora.
export function jornadasDeGrupo(equipos) {
  const lista = [...equipos]
  if (lista.length % 2 === 1) lista.push(null)     // descansa uno
  const n = lista.length
  const jornadas = []
  for (let r = 0; r < n - 1; r++) {
    const jornada = []
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i], b = lista[n - 1 - i]
      if (a && b) jornada.push(r % 2 === 0 ? [a, b] : [b, a])
    }
    jornadas.push(jornada)
    lista.splice(1, 0, lista.pop())                // rota dejando fijo el primero
  }
  return jornadas
}

// Genera todos los partidos de la fase de grupos con su cancha y su horario
export function generarFixture(grupos, opciones = {}) {
  const canchas = opciones.canchas?.length ? opciones.canchas : ['Cancha Principal']
  const horas   = opciones.horas?.length   ? opciones.horas   : ['09:00', '11:00', '15:00', '17:00', '19:00']

  // Se recorren las jornadas de todos los grupos en paralelo
  const porGrupo = Object.entries(grupos).map(([letra, equipos]) =>
    ({ letra, jornadas: jornadasDeGrupo(equipos) }))
  const totalJornadas = Math.max(...porGrupo.map(g => g.jornadas.length), 0)

  const partidos = []
  let n = 0
  for (let j = 0; j < totalJornadas; j++) {
    let enLaJornada = 0
    porGrupo.forEach(({ letra, jornadas }) => {
      (jornadas[j] || []).forEach(([a, b]) => {
        partidos.push({
          id: ++n, fase: 'grupos', grupo: letra, jornada: j + 1,
          equipo1_id: a.id, equipo1: a.nombre,
          equipo2_id: b.id, equipo2: b.nombre,
          g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0,
          estado: 'programado',
          cancha: canchas[enLaJornada % canchas.length],
          hora: horas[Math.floor(enLaJornada / canchas.length) % horas.length],
          minuto: null, eventos: [],
        })
        enLaJornada++
      })
    })
  }
  return partidos
}

// ── Tercer puesto ──────────────────────────────────────────────────────────
export function perdedorDeLlave(l) {
  const g = ganadorDeLlave(l)
  if (!g) return null
  return g === l.equipo1 ? l.equipo2 : l.equipo1
}

// Partido por el tercer puesto entre los perdedores de las semifinales
export function partidoTercerPuesto(semifinales, resultados = {}) {
  if (!semifinales || semifinales.length !== 2) return null
  const p1 = perdedorDeLlave(semifinales[0])
  const p2 = perdedorDeLlave(semifinales[1])
  const base = cruce(
    `Perdedor ${semifinales[0].llave}`, `Perdedor ${semifinales[1].llave}`,
    p1, p2, 'centro')
  return { ...base, ronda: 'Tercer puesto', llave: 'Tercer puesto',
           ...(resultados['Tercer puesto'] || {}) }
}

// ── Estado del torneo y campeón ────────────────────────────────────────────
export function campeonDelTorneo(cuadro) {
  if (!cuadro || cuadro.length === 0) return null
  const final = cuadro[cuadro.length - 1]?.[0]
  return ganadorDeLlave(final)
}

// ── Suspensión por tarjeta roja ────────────────────────────────────────────
// Quien ve la roja queda suspendido para el partido siguiente de su equipo.
export const AMARILLAS_PARA_SUSPENDER = 2

/**
 * Quien no puede jugar este partido, y por que.
 *
 * Dos motivos, los mismos que usa FIFA:
 *
 *   ROJA. El que fue expulsado en el partido anterior se pierde el siguiente.
 *
 *   AMARILLAS ACUMULADAS. Cada dos amarillas en el torneo, un partido de
 *   suspension. Se cuenta con el total: al llegar a 2 se pierde el siguiente,
 *   al llegar a 4 otro, y asi. No hace falta llevar aparte cuales ya se
 *   pagaron, porque la suspension salta justo en el partido en el que el
 *   contador cruza un multiplo de dos.
 *
 * Devuelve [{ jugador_id, motivo, detalle }] para que la pantalla pueda decir
 * POR QUE esta suspendido y no solo que lo esta.
 */
export function suspensionesPara(partidoActual, partidos, equipoId,
                                 { amarillasParaSuspender = AMARILLAS_PARA_SUSPENDER } = {}) {
  if (!partidoActual) return []

  const mismoId = (a, b) => String(a) === String(b)
  // Los de la llave que todavia no tienen fila en la base no traen fecha:
  // van al final, que es donde corresponden (se juegan despues de los grupos).
  const cuando  = (p) => (p.creado ? new Date(p.creado).getTime() : Number.MAX_SAFE_INTEGER)

  const delEquipo = partidos
    .filter(p => mismoId(p.equipo1_id, equipoId) || mismoId(p.equipo2_id, equipoId))
    .sort((a, b) => cuando(a) - cuando(b))

  const yo = delEquipo.findIndex(p => mismoId(p.id, partidoActual.id))

  // Los que ya se jugaron antes de este.
  //
  // El criterio es el ESTADO, no el lugar en el fixture: un partido finalizado
  // ya se jugo aunque en la lista figure despues, porque la mesa no siempre los
  // carga en orden (se suspende una fecha, se adelanta otra). Antes esto se
  // resolvia cortando la lista por posicion, y una amarilla cargada en un
  // partido que figuraba mas abajo no contaba: un jugador con dos amarillas
  // seguia apareciendo habilitado.
  //
  // Si el partido que se mira ya termino, se miran solo los anteriores a el.
  const previos = delEquipo.filter((p, k) =>
    p.estado === 'finalizado' &&
    !mismoId(p.id, partidoActual.id) &&
    (partidoActual.estado !== 'finalizado' || (yo >= 0 && k < yo)))

  if (!previos.length) return []

  const eventosDe = (p, tipo) => (p.eventos || [])
    .filter(ev => ev.tipo === tipo && String(ev.equipo_id) === String(equipoId))

  const out = []

  // ── Roja en el partido inmediatamente anterior ──
  const anterior = previos[previos.length - 1]
  for (const ev of eventosDe(anterior, 'roja')) {
    out.push({
      jugador_id: ev.jugador_id,
      motivo: 'roja',
      detalle: 'Expulsado en el partido anterior',
    })
  }

  // ── Amarillas acumuladas ──
  // Se cuenta hasta el anteultimo y hasta el ultimo: si el contador cruzo un
  // multiplo de dos en el ultimo partido, la suspension es para este.
  const contarHasta = (n) => {
    const cuenta = {}
    previos.slice(0, n).forEach(p => {
      eventosDe(p, 'amarilla').forEach(ev => {
        cuenta[ev.jugador_id] = (cuenta[ev.jugador_id] || 0) + 1
      })
    })
    return cuenta
  }
  const hastaElUltimo   = contarHasta(previos.length)
  const hastaElAnterior = contarHasta(previos.length - 1)

  for (const [jugadorId, total] of Object.entries(hastaElUltimo)) {
    const antes = hastaElAnterior[jugadorId] || 0
    const cruzo = Math.floor(total / amarillasParaSuspender) >
                  Math.floor(antes / amarillasParaSuspender)
    if (!cruzo) continue
    if (out.some(x => String(x.jugador_id) === String(jugadorId))) continue
    out.push({
      jugador_id: jugadorId,
      motivo: 'amarillas',
      detalle: 'Cumple suspensión por ' + total + ' amarillas',
    })
  }

  return out
}

/** Solo los ids, para filtrar listas. */
export function suspendidosPara(partidoActual, partidos, equipoId, opciones) {
  return suspensionesPara(partidoActual, partidos, equipoId, opciones)
    .map(s => s.jugador_id)
}

/**
 * Amarillas que lleva cada jugador de un equipo en lo que va del torneo.
 * Sirve para avisar al que esta a una de la suspension.
 */
export function amarillasAcumuladas(partidos, equipoId) {
  const cuenta = {}
  partidos
    .filter(p => p.estado === 'finalizado' &&
      (p.equipo1_id === equipoId || p.equipo2_id === equipoId))
    .forEach(p => (p.eventos || [])
      .filter(ev => ev.tipo === 'amarilla' && String(ev.equipo_id) === String(equipoId))
      .forEach(ev => { cuenta[ev.jugador_id] = (cuenta[ev.jugador_id] || 0) + 1 }))
  return cuenta
}

// ── Ranking de jugadores ───────────────────────────────────────────────────
// Se construye recorriendo los eventos ya registrados por la mesa técnica
export function rankingJugadores(partidos) {
  const acumulado = {}
  partidos.forEach(p => (p.eventos || []).forEach(ev => {
    if (ev.jugador_id == null) return
    if (!acumulado[ev.jugador_id]) {
      acumulado[ev.jugador_id] = {
        jugador_id: ev.jugador_id, jugador: ev.jugador, dorsal: ev.dorsal,
        equipo: ev.equipo, goles: 0, amarillas: 0, rojas: 0,
      }
    }
    const r = acumulado[ev.jugador_id]
    if (ev.tipo === 'gol') r.goles++
    else if (ev.tipo === 'amarilla') r.amarillas++
    else if (ev.tipo === 'roja') r.rojas++
  }))
  return Object.values(acumulado)
    .sort((a, b) => b.goles - a.goles ||
                    a.amarillas - b.amarillas ||
                    a.jugador.localeCompare(b.jugador))
    .map((r, i) => ({ ...r, pos: i + 1 }))
}

// ── Dorsales ───────────────────────────────────────────────────────────────
export function validarDorsales(jugadores) {
  const usados = {}
  const errores = {}
  jugadores.forEach((j, i) => {
    const d = String(j.dorsal || '').trim()
    if (!d) return
    const n = Number(d)
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      errores[i] = 'El dorsal debe ser un número entre 1 y 99.'
    } else if (usados[n] !== undefined) {
      errores[i] = `El dorsal ${n} ya lo usa el jugador ${usados[n] + 1}.`
    } else {
      usados[n] = i
    }
  })
  return errores
}

// Etiqueta corta de un jugador: "#10 Juan García"
export const etiquetaJugador = (j) =>
  j ? `${j.dorsal ? '#' + j.dorsal + ' ' : ''}${j.nombre}` : ''

// ── Como se muestra cada deporte al espectador ────────────────────────────
// La mesa tecnica registra cada anotacion con el jugador que la hizo (el tipo
// de evento se llama 'gol' en todos los deportes). Para quien mira, un gol de
// futbol, un punto de basquet y un set de voley no se dicen igual, y las
// tarjetas solo existen en algunos deportes. Los mismos criterios que la mesa
// (TorneoMesa, DEPORTE_CONFIG).
const PRESENTACION = {
  'Futbol':     { icono: '⚽', anotacion: 'Gol',   anotaciones: 'Goles',  ranking: 'Goleadores', tieneMinuto: true,  tieneAmarillas: true,  tieneRojas: true  },
  'Basquetbol': { icono: '🏀', anotacion: 'Punto', anotaciones: 'Puntos', ranking: 'Anotadores', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Voleibol':   { icono: '🏐', anotacion: 'Set',   anotaciones: 'Sets',   ranking: 'Destacados', tieneMinuto: false, tieneAmarillas: true,  tieneRojas: false },
  'Wally':      { icono: '🏐', anotacion: 'Punto', anotaciones: 'Puntos', ranking: 'Anotadores', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Tenis':      { icono: '🎾', anotacion: 'Juego', anotaciones: 'Juegos', ranking: 'Destacados', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Padel':      { icono: '🎾', anotacion: 'Juego', anotaciones: 'Juegos', ranking: 'Destacados', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
}
PRESENTACION['Fútbol']     = PRESENTACION['Futbol']
PRESENTACION['Básquetbol'] = PRESENTACION['Basquetbol']
PRESENTACION['Pádel']      = PRESENTACION['Padel']

export const presentacionDeporte = (deporte) => PRESENTACION[deporte] || PRESENTACION['Futbol']

/** Icono de un evento del partido segun el deporte: ⚽ / 🏀 / 🟨 / 🟥 */
export const iconoEvento = (tipo, deporte) =>
  tipo === 'amarilla' ? '🟨' : tipo === 'roja' ? '🟥' : presentacionDeporte(deporte).icono
