import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import NoEncontrado from '../../components/NoEncontrado'
import { etiquetaJugador, calcularTabla, marcarClasificados, generarCuadro,
         gruposFinalizados, estadoTanda, PENALES_SERIE, suspensionesPara,
         amarillasAcumuladas, AMARILLAS_PARA_SUSPENDER,
         partidoTercerPuesto, campeonDelTorneo, resultadosDeLlave } from '../../lib/torneo'
import { guardarPartidoTorneo, guardarEventoPartido, borrarEventoPartido,
         asegurarPartidoDeLlave, sumarAlMarcador,
         cerrarTorneo } from '../../lib/guardar'
import { TORNEOS, torneoPorId, equiposPorGrupo, plantillasDe,
         USUARIO_ACTUAL, SESION, EMPLEADO_ACTUAL, puede, mismo } from '../../lib/datos'

// Insignia con el dorsal del jugador
const Dorsal = ({ n, color = '#8B0000' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 30, height: 30, borderRadius: 8, flexShrink: 0,
    background: color, color: '#fff', fontWeight: 800, fontSize: '0.85rem',
    fontVariantNumeric: 'tabular-nums',
  }}>{n}</span>
)

const DEPORTE_CONFIG = {
  'Futbol':     { metricaLabel: 'Goles',  metricaIcon: 'GOL', tieneMinuto: true,  tieneAmarillas: true,  tieneRojas: true  },
  'Basquetbol': { metricaLabel: 'Puntos', metricaIcon: 'PTS', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Voleibol':   { metricaLabel: 'Sets',   metricaIcon: 'SET', tieneMinuto: false, tieneAmarillas: true,  tieneRojas: false },
  'Wally':      { metricaLabel: 'Puntos', metricaIcon: 'PTS', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Tenis':      { metricaLabel: 'Juegos', metricaIcon: 'JUE', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Padel':      { metricaLabel: 'Juegos', metricaIcon: 'JUE', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
}
// Alias con tilde: el nombre del deporte se muestra acentuado en toda la app
DEPORTE_CONFIG['Fútbol']     = DEPORTE_CONFIG['Futbol']
DEPORTE_CONFIG['Básquetbol'] = DEPORTE_CONFIG['Basquetbol']
DEPORTE_CONFIG['Pádel']      = DEPORTE_CONFIG['Padel']

const ESTADO_LABELS = {
  en_vivo:    { label: 'EN VIVO',    color: '#ef4444' },
  finalizado: { label: 'Finalizado', color: '#22c55e' },
  programado: { label: 'Programado', color: '#666'    },
}

export default function TorneoMesa() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Torneo, equipos y partidos salen de la fuente unica (src/lib/datos.js)
  // Antes decia  torneoPorId(id) || TORNEOS[0].  En la mesa tecnica eso era
  // grave: con un enlace viejo se le cargaban los goles al torneo equivocado.
  const TORNEO = torneoPorId(id)
  const EQUIPOS_POR_GRUPO = equiposPorGrupo(TORNEO) || {}
  const EQUIPOS_MOCK = plantillasDe(TORNEO)
  // Todo lo de aca arriba lee el torneo con ?. porque los hooks corren igual
  // aunque no exista: React exige que se llamen siempre y en el mismo orden.
  // El aviso de «ya no está» va despues del ultimo hook.
  const ID_POR_NOMBRE = Object.fromEntries((TORNEO?.equipos || []).map(e => [e.nombre, e.id]))

  // Los de grupos y los de la llave viven en la misma tabla, pero la pantalla
  // los trata distinto: los de grupos salen del calendario, los de la llave se
  // calculan desde las tablas de posiciones. Se separan al cargar.
  const [partidos, setPartidos] = useState(
    () => (TORNEO?.partidos || []).filter(p => p.fase === 'grupos'))

  // Lo que la mesa ya cargo en la llave, recuperado de la base. Sin esto, al
  // recargar la pagina el cuadro volvia a aparecer en blanco.
  const [resultadosLlaves, setResultadosLlaves] =
    useState(() => resultadosDeLlave(TORNEO?.partidos))

  // De que fila de la base es cada llave. Se llena al cargar y cada vez que se
  // crea una nueva, y es lo que permite guardar lo que pasa en el partido.
  const [idsDeLlave, setIdsDeLlave] = useState(() => {
    const out = {}
    for (const p of TORNEO?.partidos || []) {
      if (p.fase !== 'grupos' && p.llave) out[p.llave] = p.id
    }
    return out
  })
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)

  // En el teléfono el panel del partido queda debajo de toda la lista: al
  // elegir uno, la página baja hasta él. Antes no bajaba y parecía que el
  // toque no había hecho nada.
  const panelRef = useRef(null)
  useEffect(() => {
    if (partidoSeleccionado === null) return
    if (window.matchMedia('(max-width: 900px)').matches)
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [partidoSeleccionado])
  const [confirmFinalizar, setConfirmFinalizar] = useState(false)
  const [ultimaAccion, setUltimaAccion] = useState(null)
  const [modalJugador, setModalJugador] = useState(null)
  const [tanda, setTanda] = useState([])

  const config = DEPORTE_CONFIG[TORNEO?.deporte] || DEPORTE_CONFIG['Futbol']

  // ── Tablas de grupo y cuadro de eliminatoria, calculados desde los partidos ──
  const tablas = useMemo(() => {
    const out = {}
    Object.entries(EQUIPOS_POR_GRUPO).forEach(([g, equipos]) => {
      const ps = partidos.filter(p => p.fase === 'grupos' && p.grupo === g)
      out[g] = marcarClasificados(calcularTabla(equipos, ps, TORNEO?.deporte), 2)
    })
    return out
  }, [partidos])

  const gruposListos = useMemo(() => gruposFinalizados(partidos), [partidos])

  const cuadro = useMemo(
    () => gruposListos ? generarCuadro(tablas, 2, resultadosLlaves) : [],
    [gruposListos, tablas, resultadosLlaves])

  // El partido por el tercer puesto lo juegan los perdedores de las semifinales
  const tercerPuesto = useMemo(() => {
    const semis = cuadro.find(r => r.length === 2)
    return semis ? partidoTercerPuesto(semis, resultadosLlaves) : null
  }, [cuadro, resultadosLlaves])

  // Las llaves ya definidas se convierten en partidos jugables por la mesa
  const partidosLlave = useMemo(() => [...cuadro.flat(), ...(tercerPuesto ? [tercerPuesto] : [])]
    .filter(l => l.definido).map(l => ({
    id: 'llave:' + l.llave,
    // El tercer puesto tiene su propia fase en la base: no es una llave mas
    // del cuadro, se juega entre los dos que perdieron las semifinales.
    fase: l.llave === 'Tercer puesto' ? 'tercer_puesto' : 'eliminatoria',
    llave: l.llave, ronda: l.ronda,
    equipo1: l.equipo1, equipo2: l.equipo2,
    equipo1_id: ID_POR_NOMBRE[l.equipo1], equipo2_id: ID_POR_NOMBRE[l.equipo2],
    g1: l.g1 || 0, g2: l.g2 || 0,
    am1: l.am1 || 0, am2: l.am2 || 0, rj1: l.rj1 || 0, rj2: l.rj2 || 0,
    estado: l.estado || 'programado',
    hora: l.hora || 'Por definir', cancha: l.cancha || 'Por definir',
    minuto: l.minuto ?? null, eventos: l.eventos || [],
    pen1: l.pen1, pen2: l.pen2, tanda: l.tanda,
    // Cuando nacio la fila en la base, si ya se jugo. Ordena la llave respecto
    // de los grupos al contar amarillas y rojas para las suspensiones.
    creado: l.creado,
  })), [cuadro, tercerPuesto])

  // La lista de la izquierda, agrupada y en orden de fecha. La base los
  // devuelve como quiere, y con ocho grupos y 48 partidos encontrar el que
  // toca era imposible: salian los grupos mezclados entre si.
  const partidosOrdenados = useMemo(() => [...partidos].sort((a, b) =>
    String(a.grupo || '').localeCompare(String(b.grupo || '')) ||
    String(a.creado || '').localeCompare(String(b.creado || ''))
  ), [partidos])

  const todosLosPartidos = [...partidos, ...partidosLlave]
  const partido = partidoSeleccionado !== null
    ? todosLosPartidos.find(p => p.id === partidoSeleccionado) : null

  // Fuera de los grupos no puede haber empate: se registra la tanda tiro por
  // tiro. Vale para las llaves y tambien para el tercer puesto, que tiene fase
  // propia y hasta ahora quedaba afuera de esta cuenta.
  const requierePenales = Boolean(
    partido && partido.fase !== 'grupos' && partido.g1 === partido.g2)
  const tandaEstado = estadoTanda(tanda)
  const penalesInvalidos = requierePenales && !tandaEstado.finalizada

  const patear = (anoto) => {
    if (tandaEstado.finalizada) return
    setTanda(prev => [...prev, { equipo: tandaEstado.turno, anoto }])
  }
  const deshacerTiro = () => setTanda(prev => prev.slice(0, -1))

  // Actualiza un partido, sea de grupos o una llave de la eliminatoria.
  //
  // Los dos casos aplican el cambio sobre el estado ANTERIOR, nunca sobre la
  // copia que tenia el render. Registrar un gol hace dos cambios seguidos —el
  // evento primero, el marcador cuando contesta la base— y en la llave el
  // segundo se armaba con la copia vieja: borraba el evento que acababa de
  // cargar el primero. En la mesa se veia como que el gol entraba y
  // enseguida desaparecia.
  const actualizarPartido = (id, transformar) => {
    if (typeof id === 'string' && id.startsWith('llave:')) {
      const nombreLlave = id.slice(6)
      const enPantalla = todosLosPartidos.find(p => p.id === id)
      if (!enPantalla) return

      setResultadosLlaves(prev => {
        // Lo ya guardado pisa a la copia del render: ahi esta lo ultimo
        const base = { ...enPantalla, ...(prev[nombreLlave] || {}) }
        const nuevo = transformar(base)
        return {
          ...prev,
          [nombreLlave]: {
            g1: nuevo.g1, g2: nuevo.g2, am1: nuevo.am1, am2: nuevo.am2,
            rj1: nuevo.rj1, rj2: nuevo.rj2, estado: nuevo.estado,
            minuto: nuevo.minuto, eventos: nuevo.eventos,
            // Sin estos campos el ganador por penales se perdia y el cuadro no avanzaba
            pen1: nuevo.pen1, pen2: nuevo.pen2, tanda: nuevo.tanda,
            creado: nuevo.creado,
          },
        }
      })
    } else {
      setPartidos(prev => prev.map(x => x.id === id ? transformar(x) : x))
    }
  }

  const esUuid = (id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)

  /**
   * A que fila de la base corresponde un partido de la pantalla.
   *
   * Los de grupos ya nacen con su identificador. Los de la llave se crean
   * recién cuando quedan definidos los dos equipos —antes no hay a quien
   * enfrentar— asi que la primera vez que la mesa toca uno, se crea aqui.
   */
  const filaEnLaBase = async (p) => {
    if (!p) return null
    if (esUuid(p.id)) return p.id
    if (idsDeLlave[p.llave]) return idsDeLlave[p.llave]
    if (!p.equipo1_id || !p.equipo2_id) return null

    const r = await asegurarPartidoDeLlave({
      torneoId: TORNEO.id, llave: p.llave, fase: p.fase,
      equipoAId: p.equipo1_id, equipoBId: p.equipo2_id,
    })
    if (r.error) { registrarAccion('No se guardó el cambio. ' + r.error); return null }

    setIdsDeLlave(prev => ({ ...prev, [p.llave]: r.partido.id }))
    return r.partido.id
  }

  const registrarAccion = (desc) =>
    setUltimaAccion({ texto: desc, tiempo: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })

  const abrirModalJugador = (tipo, equipoId, campoMetrica) => {
    const eq = EQUIPOS_MOCK[equipoId]
    if (!eq) return

    // No puede jugar el que vio la roja en el partido anterior, ni el que
    // llego a dos amarillas en el torneo
    const suspensiones = suspensionesPara(partido, todosLosPartidos, equipoId)
    const idsSuspendidos = suspensiones.map(x => String(x.jugador_id))
    const motivoDe = Object.fromEntries(suspensiones.map(x => [String(x.jugador_id), x.detalle]))

    const jugadores = eq.jugadores.filter(j =>
      j.habilitado && !idsSuspendidos.includes(String(j.id)))

    // Los que estan a una amarilla de perderse el proximo: al que lleva la
    // planilla le sirve saberlo ANTES de sacar la tarjeta
    const amarillas = amarillasAcumuladas(todosLosPartidos, equipoId)
    const enRiesgo = jugadores
      .map(j => ({ ...j, amarillas: amarillas[j.id] || 0 }))
      .filter(j => j.amarillas > 0 && (j.amarillas + 1) % AMARILLAS_PARA_SUSPENDER === 0)

    setModalJugador({
      tipo, equipoId, campoMetrica, jugadores, equipoNombre: eq.nombre,
      suspendidos: eq.jugadores
        .filter(j => idsSuspendidos.includes(String(j.id)))
        .map(j => ({ ...j, motivo: motivoDe[String(j.id)] })),
      enRiesgo,
    })
  }

  const confirmarJugador = async (jugador) => {
    if (!modalJugador || !partido) return
    const { tipo, equipoId, campoMetrica } = modalJugador
    const p = partido
    const esEq1 = equipoId === p.equipo1_id
    const minuto = p.minuto || 0

    actualizarPartido(p.id, x => ({
            ...x,
            [campoMetrica]: Math.max(0, (x[campoMetrica] || 0) + 1),
            eventos: [...(x.eventos || []), {
              tipo,
              jugador_id: jugador.id,
              jugador: jugador.nombre,
              dorsal: jugador.dorsal,
              equipo_id: equipoId,
              equipo: esEq1 ? x.equipo1 : x.equipo2,
              minuto,
            }],
    }))

    // Vale igual para grupos que para la llave: si es de la llave y todavia no
    // tenia fila, se crea aqui. Asi los goles de cuartos en adelante tambien
    // llegan a la tabla de goleadores, que se arma desde los eventos.
    const filaId = await filaEnLaBase(p)
    if (filaId) {
      // Se guarda el id que devuelve la base: es lo que permite deshacer el
      // gol despues. Sin el, corregir el marcador dejaba el gol anotado y el
      // jugador quedaba con un gol fantasma en la tabla de goleadores.
      guardarEventoPartido({
        partidoId: filaId, equipoId, jugadorEquipoId: jugador.id, tipo, minuto,
      }).then(res => {
        if (!res.evento) return
        actualizarPartido(p.id, x => ({
          ...x,
          eventos: (x.eventos || []).map(ev =>
            ev.jugador_id === jugador.id && ev.tipo === tipo && ev.minuto === minuto && !ev.id
              ? { ...ev, id: res.evento.id } : ev),
        }))
      })
      // El marcador se guarda aparte del evento: la tabla de posiciones se arma
      // con el, sin tener que recorrer todos los eventos.
      //
      // El numero lo calcula la base, no esta pantalla. Antes se mandaba
      // (p[campoMetrica] || 0) + 1, y si la copia local iba atrasada —cosa que
      // pasaba en los partidos de la llave— cada gol volvia a escribir el
      // mismo valor. Ahora se lee la fila y se acomoda la pantalla al
      // resultado, no al reves.
      const r = await sumarAlMarcador(filaId, campoMetrica, +1)
      if (r.error) registrarAccion('No se guardó el marcador. ' + r.error)
      else actualizarPartido(p.id, x => ({ ...x, [campoMetrica]: r.valor }))
    }

    const tipoLabel = tipo === 'gol' ? config.metricaLabel : tipo === 'amarilla' ? 'Amarilla' : 'Roja'
    registrarAccion(etiquetaJugador(jugador) + ' - ' + tipoLabel + ' ' + minuto + "'")
    setModalJugador(null)
  }

  /**
   * Corrige el marcador hacia abajo.
   *
   * No alcanza con restar uno: hay que borrar el evento que lo genero. Si
   * quedara, el jugador seguiria figurando con ese gol en la tabla de
   * goleadores, que se arma desde los eventos y no desde el marcador.
   */
  const quitarMetrica = async (campo) => {
    if (!partido) return

    const tipo = campo.startsWith('g') ? 'gol' : campo.startsWith('am') ? 'amarilla' : 'roja'
    const equipoId = campo.endsWith('1') ? partido.equipo1_id : partido.equipo2_id

    // El ultimo evento de ese tipo y ese equipo: es el que se deshace
    const suyos = (partido.eventos || []).filter(ev =>
      ev.tipo === tipo && String(ev.equipo_id) === String(equipoId))
    const ultimo = suyos[suyos.length - 1]

    if (ultimo?.id) await borrarEventoPartido(ultimo.id)

    // Se saca primero el evento de la pantalla; el numero lo decide la base
    actualizarPartido(partido.id, x => ({
      ...x,
      eventos: ultimo ? (x.eventos || []).filter(ev => ev !== ultimo) : x.eventos,
    }))

    const filaId = await filaEnLaBase(partido)
    if (filaId) {
      const r = await sumarAlMarcador(filaId, campo, -1)
      if (r.error) registrarAccion('No se corrigió el marcador. ' + r.error)
      else actualizarPartido(partido.id, x => ({ ...x, [campo]: r.valor }))
    }

    registrarAccion(ultimo
      ? 'Deshizo ' + (tipo === 'gol' ? 'un gol' : 'una ' + tipo) + ' de ' + (ultimo.jugador || '')
      : 'Correccion realizada')
  }

  const iniciarPartido = async () => {
    const filaId = await filaEnLaBase(partido)
    if (filaId) {
      await guardarPartidoTorneo(filaId, { estado: 'en_vivo', minuto: 0 })
    }
    actualizarPartido(partidoSeleccionado, p => ({ ...p, estado: 'en_vivo', minuto: 0 }))
    registrarAccion('Partido iniciado')
  }

  const finalizarPartido = async () => {
    const p = todosLosPartidos.find(x => x.id === partidoSeleccionado)
    const conPenales = requierePenales
      ? { pen1: tandaEstado.a, pen2: tandaEstado.b, tanda: [...tanda] } : {}

    const filaId = await filaEnLaBase(p)
    if (filaId) {
      // Se guarda el marcador completo: si la mesa corrigio algo a mano, el
      // resultado de la base tiene que ser el que se ve en pantalla. En la
      // llave va tambien la tanda tiro por tiro, no solo cuantos convirtio
      // cada uno: es lo que se muestra despues al revisar como se definio.
      await guardarPartidoTorneo(filaId, {
        estado: 'finalizado',
        golesA: p.g1, golesB: p.g2,
        amarillasA: p.am1, amarillasB: p.am2,
        rojasA: p.rj1, rojasB: p.rj2,
        penalesA: requierePenales ? tandaEstado.a : undefined,
        penalesB: requierePenales ? tandaEstado.b : undefined,
        tanda: requierePenales ? tanda : undefined,
      })
    }

    actualizarPartido(partidoSeleccionado, x => ({ ...x, estado: 'finalizado', ...conPenales }))
    setTanda([])
    registrarAccion('Partido finalizado: ' + p.equipo1 + ' ' + p.g1 + ' - ' + p.g2 + ' ' + p.equipo2)
    setConfirmFinalizar(false)

    // Si la que termino es la final, el torneo termino: hay campeon y no queda
    // nada por jugar. Sin esto quedaba «en curso» para siempre.
    if (p.llave === 'Final') {
      const c = await cerrarTorneo(TORNEO.id)
      if (c.error) registrarAccion('No se cerró el torneo. ' + c.error)
      else {
        TORNEO.estado = 'finalizado'
        registrarAccion('Torneo finalizado. Campeón: ' +
          (p.g1 > p.g2 ? p.equipo1 : p.g2 > p.g1 ? p.equipo2
            : tandaEstado.a > tandaEstado.b ? p.equipo1 : p.equipo2))
      }
    }
  }

  const compartirWhatsApp = () => {
    if (!partido) return
    const texto = TORNEO.nombre + '\n\n' + partido.equipo1 + ' ' + partido.g1 + ' - ' + partido.g2 + ' ' + partido.equipo2 +
      '\n\n📱 Síguelo en vivo en Sportika:\n' + window.location.origin + '/app/torneos/' + TORNEO.id + '/en-vivo'
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank')
  }

  // Quien puede operar la mesa: el cliente que creo el torneo, o el personal
  // del complejo cuando el torneo lo organiza el propio complejo.
  // Aca y no antes: es el primer punto despues del ultimo hook.
  if (!TORNEO) {
    return <NoEncontrado que="Este torneo" volverA="/app/torneos" textoVolver="Ver los torneos" />
  }

  /**
   * Quien puede operar la mesa.
   *
   * Antes decia:  TORNEO.creador_tipo === 'complejo' || creador_id === yo
   *
   * La primera condicion no miraba QUE complejo. Con un torneo organizado por
   * un complejo, cualquiera que hubiera iniciado sesion entraba a la mesa. La
   * base rechazaba el guardado, asi que no se corrompia nada, pero la pantalla
   * mostraba el gol igual: el que entraba veia un marcador que no existia.
   *
   * Ahora se mira de quien es el torneo:
   *   lo organiza un cliente  -> solo el
   *   lo organiza el complejo -> su administrador, o un empleado con el
   *                              permiso de mesa tecnica
   */
  const soyElOrganizador = mismo(TORNEO.creador_id, USUARIO_ACTUAL.id)
  const soyDelComplejo   = TORNEO.creador_tipo === 'complejo' && (
       (SESION.rol === 'admin_empresa' && mismo(SESION.empresaId, TORNEO.empresa_id))
    || (SESION.rol === 'empleado' && mismo(EMPLEADO_ACTUAL.empresa_id, TORNEO.empresa_id)
        && puede(EMPLEADO_ACTUAL, 'torneos_mesa'))
  )
  const mesaPermitida = soyElOrganizador || soyDelComplejo

  if (!mesaPermitida) {
    return (
      <Layout role="user">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Mesa reservada al organizador</h3>
          <p>
            {TORNEO.nombre} lo organiza {TORNEO.creador}. Solo quien organiza el
            torneo registra los resultados. Puedes seguirlo en vivo desde la
            pantalla del torneo.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-primary"
              onClick={() => navigate('/app/torneos/' + TORNEO.id + '/en-vivo')}>🔴 Verlo en vivo</button>
            <button className="btn btn-outline"
              onClick={() => navigate('/app/torneos/' + TORNEO.id)}>Ver el torneo</button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="user">
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem', marginBottom: 8 }}>
          Volver al torneo
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>Mesa Técnica</h1>
            <p style={{ color: '#666', fontSize: '0.82rem' }}>{TORNEO.nombre} - {TORNEO.empresa}</p>
            {/* Como se gana en este torneo. El que lleva la planilla tiene que
                tenerlo a la vista: no es el mismo numero en todos lados. */}
            {TORNEO.puntosPorSet && TORNEO.setsParaGanar && (
              <p style={{ color: '#f59e0b', fontSize: '0.76rem', marginTop: 4 }}>
                Set a {TORNEO.puntosPorSet} con 2 de ventaja · gana el que llegue a {TORNEO.setsParaGanar} sets
              </p>
            )}
          </div>
          <div style={{ padding: '8px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10 }}>
            <p style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>SOLO ORGANIZADORES</p>
            <p style={{ fontSize: '0.68rem', color: '#888', marginTop: 2 }}>Solo aparecen jugadores habilitados</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        <div>
          <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Seleccionar partido</p>

          {[{ titulo: 'Fase de grupos', lista: partidosOrdenados, color: '#00BCD4' },
            { titulo: 'Fase eliminatoria', lista: partidosLlave, color: '#f59e0b' }].map(({ titulo, lista, color }) => (
            <div key={titulo} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: '0.66rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {titulo}
              </p>
              {lista.length === 0 ? (
                <p style={{ fontSize: '0.72rem', color: '#555', padding: '8px 0' }}>
                  Se habilita al terminar la fase de grupos
                </p>
              ) : lista.map(p => {
                const cfg = ESTADO_LABELS[p.estado]
                const activo = p.id === partidoSeleccionado
                return (
                  <div key={p.id} onClick={() => { setPartidoSeleccionado(p.id); setTanda([]) }} style={{
                    padding: '12px 14px', marginBottom: 8,
                    background: activo ? 'rgba(139,0,0,0.2)' : '#1a1a1a',
                    border: '1px solid ' + (activo ? 'rgba(139,0,0,0.5)' : '#2a2a2a'),
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.65rem', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                      <span style={{ fontSize: '0.65rem', color: '#555' }}>
                        {/* En los grupos, la letra; en todo lo demas, el nombre de
                            la llave. Se decide por si HAY grupo y no por la fase:
                            el tercer puesto tiene fase propia y salia como
                            «Grupo undefined». */}
                        {p.grupo ? 'Grupo ' + p.grupo : (p.llave || p.ronda || '')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600, flex: 1 }}>{p.equipo1}</span>
                      {/* Un partido que no empezó no tiene marcador: «0 - 0» parecía jugado */}
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: p.estado === 'programado' ? '#666' : '#f5f5f5', margin: '0 8px' }}>
                        {p.estado === 'programado' ? 'vs' : p.g1 + ' - ' + p.g2}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600, flex: 1, textAlign: 'right' }}>{p.equipo2}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div ref={panelRef} style={{ scrollMarginTop: 80 }}>
          {!partido ? (
            <div className="empty-state" style={{ minHeight: 300 }}>
              <div className="empty-state-icon">-</div>
              <h3>Selecciona un partido</h3>
              <p>Elige un partido de la lista para registrar resultados</p>
            </div>
          ) : (
            <>
              <div style={{
                background: partido.estado === 'en_vivo' ? 'linear-gradient(135deg, rgba(139,0,0,0.25) 0%, #1a1a1a 60%)' : '#1a1a1a',
                border: '1px solid ' + (partido.estado === 'en_vivo' ? 'rgba(239,68,68,0.4)' : '#2a2a2a'),
                borderRadius: 16, padding: 24, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ESTADO_LABELS[partido.estado].color, background: ESTADO_LABELS[partido.estado].color + '18', padding: '4px 12px', borderRadius: 20 }}>
                    {ESTADO_LABELS[partido.estado].label}
                  </span>
                  {config.tieneMinuto && partido.estado === 'en_vivo' && (
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#ef4444' }}>{partido.minuto || 0} min</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 4 }}>{partido.equipo1}</p>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '4rem', color: '#f5f5f5', lineHeight: 1 }}>{partido.g1}</p>
                    {config.tieneAmarillas && partido.am1 > 0 && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>Amarillas: {partido.am1}</p>}
                    {config.tieneRojas && partido.rj1 > 0 && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>Rojas: {partido.rj1}</p>}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#333' }}>VS</p>
                    <p style={{ fontSize: '0.7rem', color: '#444', marginTop: 4 }}>{partido.cancha}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 4 }}>{partido.equipo2}</p>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '4rem', color: '#f5f5f5', lineHeight: 1 }}>{partido.g2}</p>
                    {config.tieneAmarillas && partido.am2 > 0 && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>Amarillas: {partido.am2}</p>}
                    {config.tieneRojas && partido.rj2 > 0 && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>Rojas: {partido.rj2}</p>}
                  </div>
                </div>
              </div>

              {partido.estado === 'programado' && (
                <button onClick={iniciarPartido} style={{ width: '100%', padding: '14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Outfit', marginBottom: 12 }}>
                  Iniciar Partido
                </button>
              )}

              {partido.estado === 'en_vivo' && (
                <>
                  <div className="card" style={{ padding: 20, marginBottom: 12 }}>
                    <p style={{ fontSize: '0.75rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                      {config.metricaLabel} - selecciona el jugador
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {[
                        { equipoId: partido.equipo1_id, nombre: partido.equipo1, campo: 'g1', am: 'am1', rj: 'rj1' },
                        { equipoId: partido.equipo2_id, nombre: partido.equipo2, campo: 'g2', am: 'am2', rj: 'rj2' },
                      ].map(({ equipoId, nombre, campo, am, rj }) => (
                        <div key={equipoId} style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 12, fontWeight: 600 }}>{nombre}</p>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                            <button onClick={() => quitarMetrica(campo)} disabled={partido[campo] <= 0} style={{
                              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: partido[campo] <= 0 ? 'not-allowed' : 'pointer',
                              background: partido[campo] <= 0 ? '#2a2a2a' : 'rgba(239,68,68,0.15)', color: partido[campo] <= 0 ? '#444' : '#ef4444',
                              fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>-</button>
                            <span style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', minWidth: 32, textAlign: 'center' }}>{partido[campo]}</span>
                            <button onClick={() => abrirModalJugador('gol', equipoId, campo)} style={{
                              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                              background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                              fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>+</button>
                          </div>
                          <p style={{ fontSize: '0.68rem', color: '#555', marginBottom: 10 }}>{config.metricaLabel}</p>

                          {config.tieneAmarillas && (
                            <button onClick={() => abrirModalJugador('amarilla', equipoId, am)} style={{
                              width: '100%', padding: '7px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8,
                              color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', marginBottom: 6,
                            }}>Amarilla</button>
                          )}
                          {config.tieneRojas && (
                            <button onClick={() => abrirModalJugador('roja', equipoId, rj)} style={{
                              width: '100%', padding: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
                              color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
                            }}>Roja</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {partido.eventos.length > 0 && (
                    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                      <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Eventos del partido</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {partido.eventos.map((ev, i) => {
                          const col = ev.tipo === 'gol' ? '#22c55e'
                                    : ev.tipo === 'amarilla' ? '#f59e0b' : '#ef4444'
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#1a1a1a', borderRadius: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                {ev.dorsal != null && <Dorsal n={ev.dorsal} color={col} />}
                                <span style={{ fontSize: '0.8rem', color: '#bbb' }}>
                                  <strong style={{ color: '#f5f5f5' }}>{ev.jugador}</strong>{' — '}
                                  <span style={{ color: col, fontWeight: 700 }}>
                                    {ev.tipo === 'gol' ? 'GOL' : ev.tipo === 'amarilla' ? 'AMARILLA' : 'ROJA'}
                                  </span>
                                </span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.7rem', color: '#555' }}>{ev.equipo}</span>
                                {ev.minuto != null && <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: 8 }}>{ev.minuto}&apos;</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={compartirWhatsApp} style={{ padding: '12px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 12, color: '#25d366', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      Compartir por WA
                    </button>
                    <button onClick={() => { setTanda([]); setConfirmFinalizar(true) }} style={{ padding: '12px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      Finalizar Partido
                    </button>
                  </div>
                </>
              )}

              {partido.estado === 'finalizado' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12 }}>
                  <p style={{ fontSize: '2rem', marginBottom: 8 }}>OK</p>
                  <p style={{ fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>Partido Finalizado</p>
                  <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 16 }}>
                    {partido.equipo1} {partido.g1} - {partido.g2} {partido.equipo2}
                  </p>
                  <button onClick={compartirWhatsApp} style={{ padding: '10px 20px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 10, color: '#25d366', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                    Compartir resultado
                  </button>
                </div>
              )}

              {ultimaAccion && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#00BCD4' }}>{ultimaAccion.texto}</span>
                  <span style={{ fontSize: '0.68rem', color: '#444' }}>{ultimaAccion.tiempo}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalJugador && (
        <div className="modal-overlay" onClick={() => setModalJugador(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalJugador.tipo === 'gol' ? '¿Quién marcó?' : modalJugador.tipo === 'amarilla' ? '¿A quién la amarilla?' : '¿A quién la roja?'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalJugador(null)}>X</button>
            </div>
            <p style={{ color: '#666', fontSize: '0.82rem', marginBottom: 14 }}>
              {modalJugador.equipoNombre} — {modalJugador.jugadores.length} jugador
              {modalJugador.jugadores.length === 1 ? '' : 'es'} habilitado
              {modalJugador.jugadores.length === 1 ? '' : 's'} para este partido
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {modalJugador.jugadores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#555' }}>
                  <p>Sin jugadores habilitados</p>
                </div>
              ) : (
                modalJugador.jugadores.map(j => (
                  <button key={j.id} onClick={() => confirmarJugador(j)} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a',
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit', textAlign: 'left',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Dorsal n={j.dorsal} />
                      <div>
                        <p style={{ fontSize: '0.88rem', color: '#f5f5f5', fontWeight: 600 }}>{j.nombre}</p>
                        <p style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{j.posicion}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#8B0000' }}>-&gt;</span>
                  </button>
                ))
              )}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #222' }}>
              {modalJugador.suspendidos?.length > 0 && (
                <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
                  <p style={{ color: '#ef4444', fontSize: '0.74rem', fontWeight: 700, marginBottom: 4 }}>
                    No pueden jugar este partido
                  </p>
                  {modalJugador.suspendidos.map(j => (
                    <p key={j.id} style={{ color: '#888', fontSize: '0.73rem' }}>
                      #{j.dorsal} {j.nombre} — {j.motivo}
                    </p>
                  ))}
                </div>
              )}

              {/* Aviso antes de sacar la tarjeta, no despues */}
              {modalJugador.tipo === 'amarilla' && modalJugador.enRiesgo?.length > 0 && (
                <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 8 }}>
                  <p style={{ color: '#f59e0b', fontSize: '0.74rem', fontWeight: 700, marginBottom: 4 }}>
                    Si les sacas amarilla, se pierden el próximo
                  </p>
                  {modalJugador.enRiesgo.map(j => (
                    <p key={j.id} style={{ color: '#888', fontSize: '0.73rem' }}>
                      #{j.dorsal} {j.nombre} — lleva {j.amarillas}
                    </p>
                  ))}
                </div>
              )}
              <p style={{ color: '#555', fontSize: '0.74rem' }}>
                Los jugadores no habilitados o suspendidos no aparecen en esta lista.
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmFinalizar && partido && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, maxWidth: requierePenales ? 440 : 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>{requierePenales ? '⚽' : '!'}</p>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 8 }}>
              {requierePenales ? 'Tanda de penales' : 'Finalizar partido?'}
            </h3>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 20 }}>
              {partido.equipo1} {partido.g1} - {partido.g2} {partido.equipo2}
            </p>

            {/* En eliminatoria no puede haber empate: se patea tiro por tiro */}
            {requierePenales ? (
              <div style={{ marginBottom: 18, padding: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 12 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.78rem', marginBottom: 14 }}>
                  {/* En el tercer puesto no avanza nadie: se define el podio */}
                  Empataron en {(partido.ronda || 'la eliminatoria').toLowerCase()}. Registra cada tiro
                  para definir {partido.fase === 'tercer_puesto' ? 'quién se queda con el tercer puesto'
                              : partido.llave === 'Final' ? 'quién es el campeón'
                              : 'quién avanza'}.
                </p>

                {/* Marcador de la tanda */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                  {[[partido.equipo1, tandaEstado.a, 1], ['', null, null], [partido.equipo2, tandaEstado.b, 2]].map(([nom, val, eq], i) =>
                    eq === null ? (
                      <span key={i} style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#444' }}>-</span>
                    ) : (
                      <div key={i} style={{
                        padding: '8px 6px', borderRadius: 10,
                        background: tandaEstado.turno === eq && !tandaEstado.finalizada ? 'rgba(245,158,11,0.15)' : 'transparent',
                        border: '1px solid ' + (tandaEstado.turno === eq && !tandaEstado.finalizada ? 'rgba(245,158,11,0.4)' : 'transparent'),
                      }}>
                        <p style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</p>
                        <p style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', lineHeight: 1 }}>{val}</p>
                      </div>
                    ))}
                </div>

                {/* Secuencia de tiros de cada equipo */}
                {[1, 2].map(eq => (
                  <div key={eq} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.68rem', color: '#666', width: 96, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {eq === 1 ? partido.equipo1 : partido.equipo2}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {tanda.filter(t => t.equipo === eq).map((t, i) => (
                        <span key={i} style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
                          background: t.anoto ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.18)',
                          border: '1px solid ' + (t.anoto ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.5)'),
                          color: t.anoto ? '#22c55e' : '#ef4444',
                        }}>{t.anoto ? '●' : '✕'}</span>
                      ))}
                      {Array.from({ length: Math.max(0, PENALES_SERIE - tanda.filter(t => t.equipo === eq).length) }).map((_, i) => (
                        <span key={'v' + i} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px dashed #333' }} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Botones de tiro */}
                {!tandaEstado.finalizada ? (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>
                      {tandaEstado.muerteSubita ? 'Muerte súbita · ' : ''}
                      Patea {tandaEstado.turno === 1 ? partido.equipo1 : partido.equipo2}
                      {' '}(tiro {tandaEstado.numeroTiro})
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => patear(true)} style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.45)', borderRadius: 10, color: '#22c55e', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.85rem' }}>
                        ● Anotó
                      </button>
                      <button onClick={() => patear(false)} style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.85rem' }}>
                        ✕ Falló
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10 }}>
                    <p style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>
                      Avanza {tandaEstado.ganador === 1 ? partido.equipo1 : partido.equipo2}
                    </p>
                    <p style={{ color: '#888', fontSize: '0.72rem', marginTop: 2 }}>{tandaEstado.motivo}</p>
                  </div>
                )}

                {tanda.length > 0 && (
                  <button onClick={deshacerTiro} style={{ marginTop: 10, background: 'none', border: 'none', color: '#666', fontSize: '0.74rem', cursor: 'pointer', fontFamily: 'Outfit', textDecoration: 'underline' }}>
                    Deshacer último tiro
                  </button>
                )}
              </div>
            ) : (
              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setConfirmFinalizar(false); setTanda([]) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 10, color: '#666', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={finalizarPartido} disabled={penalesInvalidos}
                style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, color: '#22c55e', cursor: penalesInvalidos ? 'not-allowed' : 'pointer', fontFamily: 'Outfit', fontWeight: 700, opacity: penalesInvalidos ? 0.45 : 1 }}>
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
