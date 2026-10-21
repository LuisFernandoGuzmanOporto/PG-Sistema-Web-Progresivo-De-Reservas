import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import {
  FORMATOS, calcularTabla, marcarClasificados, generarCuadro, resultadosDeLlave,
  gruposFinalizados, CRITERIOS_DESEMPATE, puntajePorDeporte,
  partidoTercerPuesto, campeonDelTorneo, rankingJugadores, ganadorDeLlave, presentacionDeporte,
  etiquetasDeTabla,
} from '../../lib/torneo'
import { TORNEOS, torneoPorId, equiposPorGrupo } from '../../lib/datos'
import { recargarPartidosDeTorneo } from '../../lib/carga'
import NoEncontrado from '../../components/NoEncontrado'
import EventosPartido from './torneo/EventosPartido'
import { MarcaEnJuego, AvisoProvisional } from './torneo/MarcaEnJuego'

/**
 * Una linea del cuadro: un equipo de una llave.
 *
 * Muestra el marcador de los partidos que ya se jugaron y marca al que paso.
 * Antes el cuadro solo ponia los nombres y de que puesto venia cada uno: el
 * que entraba a ver como iba el torneo veia quienes se enfrentaban, pero no
 * quien habia ganado ni por cuanto. Habia que ir al fixture para enterarse.
 *
 * Si se definio por penales, va el resultado del partido y la tanda al lado,
 * como se escribe siempre: 1 (4).
 */
function FilaLlave({ llave: l, lado }) {
  const esUno    = lado === 1
  const equipo   = esUno ? l.equipo1 : l.equipo2
  const etiqueta = esUno ? l.etiqueta1 : l.etiqueta2
  const goles    = esUno ? l.g1 : l.g2
  const penales  = esUno ? l.pen1 : l.pen2

  const jugado  = l.estado === 'finalizado' || l.estado === 'en_vivo'
  const ganador = ganadorDeLlave(l)
  const gano    = ganador != null && ganador === equipo
  const perdio  = ganador != null && !gano

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{
        fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: perdio ? '#777' : l.definido ? '#f5f5f5' : '#666',
        fontWeight: gano ? 700 : l.definido ? 600 : 400,
      }}>
        {gano && <span style={{ color: '#22c55e', marginRight: 4 }}>▸</span>}
        {equipo}
      </span>

      {jugado ? (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', letterSpacing: 0.5,
            color: perdio ? '#777' : '#f5f5f5' }}>{goles ?? 0}</span>
          {/* La tanda solo se escribe si de verdad hubo: empate en el marcador */}
          {l.g1 === l.g2 && penales != null && (
            <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>({penales})</span>
          )}
        </span>
      ) : (
        <span style={{ fontSize: '0.66rem', color: '#555', flexShrink: 0 }}>{etiqueta}</span>
      )}
    </div>
  )
}

const ESTADO_CONFIG = {
  en_vivo:    { label: '🔴 EN VIVO',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  finalizado: { label: '✅ Finalizado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  programado: { label: '🕐 Programado', color: '#666',    bg: 'rgba(255,255,255,0.04)' },
}

export default function TorneoEnVivo() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Torneo, equipos y partidos salen de la fuente unica (src/lib/datos.js).
  // Antes aca decia  torneoPorId(id) || TORNEOS[0]:  si el torneo no existia
  // se mostraba OTRO, y el que abrio el enlace creia estar viendo el suyo.
  const TORNEO = torneoPorId(id)
  const EQUIPOS_POR_GRUPO = equiposPorGrupo(TORNEO) || {}

  const [partidos, setPartidos] = useState(TORNEO?.partidos || [])
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date())
  const [segundosRestantes, setSegundosRestantes] = useState(15)
  const [pulsando, setPulsando] = useState(false)
  const [errorCarga, setErrorCarga] = useState(null)
  const [tabVista, setTabVista] = useState('en_vivo')

  // Se lee con ?. porque los hooks de abajo corren igual aunque el torneo
  // no exista: React exige que se llamen siempre, en el mismo orden. El
  // aviso de «ya no está» va despues de todos ellos.
  const usaGrupos       = TORNEO?.formato === FORMATOS.GRUPOS
  const usaLiga         = TORNEO?.formato === FORMATOS.LIGA
  const usaEliminatoria = TORNEO?.formato !== FORMATOS.LIGA
  const puntaje = puntajePorDeporte(TORNEO?.deporte)
  // Como se llama cada columna en este deporte, y si hace falta la de empates
  const etq = etiquetasDeTabla(TORNEO?.deporte)
  const hayEmpates = puntaje.admiteEmpate

  // ── Tablas de posiciones: SIEMPRE calculadas desde los partidos finalizados ──
  const tablas = useMemo(() => {
    const deGrupos = partidos.filter(p => p.fase === 'grupos')
    if (usaLiga) {
      const todos = Object.values(EQUIPOS_POR_GRUPO).flat()
      return { 'Única': calcularTabla(todos, deGrupos, TORNEO?.deporte) }
    }
    const out = {}
    Object.entries(EQUIPOS_POR_GRUPO).forEach(([g, equipos]) => {
      const ps = deGrupos.filter(p => p.grupo === g)
      out[g] = marcarClasificados(
        calcularTabla(equipos, ps, TORNEO?.deporte), TORNEO?.clasificanPorGrupo)
    })
    return out
  }, [partidos, usaLiga])

  // La misma tabla, pero sumando el resultado parcial de los partidos en juego.
  // Es la que se MUESTRA; el cuadro eliminatorio usa la de arriba.
  const tablasEnVivo = useMemo(() => {
    const deGrupos = partidos.filter(p => p.fase === 'grupos')
    const op = { enVivo: true }
    if (usaLiga) {
      const todos = Object.values(EQUIPOS_POR_GRUPO).flat()
      return { 'Única': calcularTabla(todos, deGrupos, TORNEO?.deporte, op) }
    }
    const out = {}
    Object.entries(EQUIPOS_POR_GRUPO).forEach(([g, equipos]) => {
      out[g] = marcarClasificados(
        calcularTabla(equipos, deGrupos.filter(p => p.grupo === g), TORNEO?.deporte, op), TORNEO?.clasificanPorGrupo)
    })
    return out
  }, [partidos, usaLiga])

  // ── Fase eliminatoria: los cruces se arman solos al terminar los grupos ──
  const faseGruposCompleta = useMemo(() => gruposFinalizados(partidos), [partidos])
  // El cuadro se arma con lo que la mesa ya cargo: sin esto se veia siempre
  // vacio, aunque los partidos de la llave estuvieran jugados.
  const jugadoEnLaLlave = useMemo(() => resultadosDeLlave(partidos), [partidos])
  const cuadro = useMemo(
    () => (usaEliminatoria && faseGruposCompleta)
      ? generarCuadro(tablas, TORNEO?.clasificanPorGrupo, jugadoEnLaLlave) : [],
    [usaEliminatoria, faseGruposCompleta, tablas, jugadoEnLaLlave])

  const tercerPuesto = useMemo(() => {
    const semis = cuadro.find(r => r.length === 2)
    // Con lo ya jugado: sin este segundo argumento el partido por el tercer
    // puesto se dibujaba siempre como si no se hubiera jugado, aunque el
    // resultado estuviera guardado.
    return semis ? partidoTercerPuesto(semis, jugadoEnLaLlave) : null
  }, [cuadro, jugadoEnLaLlave])

  const campeon = useMemo(() => campeonDelTorneo(cuadro), [cuadro])
  const ranking = useMemo(() => rankingJugadores(partidos), [partidos])
  // Gol, punto, set o juego; con o sin tarjetas y minuto, segun el deporte
  const pres = presentacionDeporte(TORNEO?.deporte)

  /**
   * Vuelve a leer los partidos de la base.
   *
   * Antes esto le sumaba un minuto al reloj por su cuenta y no consultaba
   * nada: el marcador que veia el que estaba en la tribuna se quedaba en el
   * que habia al abrir la pagina, mientras la mesa cargaba goles que aca no
   * llegaban nunca.
   */
  const actualizar = useCallback(async () => {
    // El intervalo queda registrado aunque el torneo no exista: los efectos
    // corren igual cuando el componente sale por el aviso de «ya no está».
    if (!TORNEO) return
    setPulsando(true)
    const r = await recargarPartidosDeTorneo(TORNEO.id)
    if (r.partidos) { setPartidos(r.partidos); setErrorCarga(null) }
    else setErrorCarga(r.error || 'No se pudo actualizar')
    setUltimaActualizacion(new Date())
    setSegundosRestantes(15)
    setTimeout(() => setPulsando(false), 600)
  }, [TORNEO?.id])

  useEffect(() => {
    const intervalo = setInterval(actualizar, 15000)
    return () => clearInterval(intervalo)
  }, [actualizar])

  useEffect(() => {
    const tick = setInterval(() => setSegundosRestantes(s => s > 0 ? s - 1 : 15), 1000)
    return () => clearInterval(tick)
  }, [])

  // Aca y no antes: React exige que TODOS los hooks se llamen siempre y en el
  // mismo orden, asi que el aviso tiene que ir despues del ultimo. Por eso los
  // hooks de arriba leen el torneo con ?.
  if (!TORNEO) {
    return <NoEncontrado que="Este torneo" volverA="/app/torneos" textoVolver="Ver los torneos" />
  }

  const compartirWhatsApp = (partido) => {
    const estado = partido.estado === 'en_vivo' ? '🔴 EN VIVO' : '✅ Finalizado'
    const texto = `${TORNEO.emoji} ${estado} — ${TORNEO.nombre}\n\n${partido.equipo1} ${partido.g1} - ${partido.g2} ${partido.equipo2}\n\n📍 ${partido.cancha}\n\n📱 Síguelo en vivo en Sportika:\n${window.location.origin}/app/torneos/${TORNEO.id}/en-vivo`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const partidosEnVivo = partidos.filter(p => p.estado === 'en_vivo')

  const TABS = [
    { key: 'en_vivo',    label: `🔴 En Vivo (${partidosEnVivo.length})` },
    ...(usaEliminatoria && TORNEO.formato === FORMATOS.ELIMINACION
        ? [] : [{ key: 'posiciones', label: usaLiga ? '📊 Tabla General' : '📊 Posiciones' }]),
    ...(usaEliminatoria ? [{ key: 'llaves', label: '🏆 Eliminatoria' }] : []),
    { key: 'goleadores', label: `🏅 ${pres.ranking} (${ranking.length})` },
    { key: 'fixture',    label: `📋 Fixture (${partidos.length})` },
  ]

  return (
    <Layout role="user">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem', marginBottom: 6 }}>
            ← Volver al torneo
          </button>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>
            🔴 EN VIVO — {TORNEO.nombre}
          </h1>
          <p style={{ color: '#666', fontSize: '0.8rem' }}>
            {TORNEO.empresa} • Formato: {TORNEO.formato}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: pulsando ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${pulsando ? 'rgba(239,68,68,0.4)' : '#2a2a2a'}`,
            borderRadius: 20, transition: 'all 0.3s', cursor: 'pointer',
          }} onClick={actualizar}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.75rem', color: errorCarga ? '#ef4444' : '#888' }}>
              {errorCarga ? 'Sin conexión — toca para reintentar' : 'Actualiza en ' + segundosRestantes + 's'}
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#444', marginTop: 4 }}>
            Última: {ultimaActualizacion.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      </div>

      {/* ── CAMPEÓN: el torneo ya terminó ── */}
      {campeon && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(30,30,30,1) 70%)',
          border: '1px solid rgba(245,158,11,0.4)', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '2.6rem' }}>🏆</span>
          <div>
            <p style={{ color: '#f59e0b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Torneo finalizado
            </p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.9rem', color: '#f5f5f5', lineHeight: 1.1 }}>
              {campeon}
            </p>
            <p style={{ color: '#888', fontSize: '0.8rem' }}>Campeón de {TORNEO.nombre}</p>
          </div>
        </div>
      )}

      {/* ── PARTIDOS EN VIVO ── */}
      {partidosEnVivo.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ● Partidos en curso
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
            {partidosEnVivo.map(p => (
              <div key={p.id} style={{
                background: 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, rgba(30,30,30,1) 60%)',
                border: '1px solid rgba(239,68,68,0.35)', borderRadius: 16, padding: 24,
                boxShadow: pulsando ? '0 0 20px rgba(239,68,68,0.2)' : 'none', transition: 'box-shadow 0.3s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '3px 10px', borderRadius: 20 }}>
                    🔴 EN VIVO
                  </span>
                  {pres.tieneMinuto && p.minuto != null && (
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#ef4444' }}>{p.minuto}&apos;</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 6 }}>{p.equipo1}</p>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', color: '#f5f5f5', lineHeight: 1 }}>{p.g1}</p>
                    {p.am1 > 0 && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>🟨 ×{p.am1}</p>}
                    {p.rj1 > 0 && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>🟥 ×{p.rj1}</p>}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#444' }}>VS</p>
                    <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 4 }}>📍 {p.cancha}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 6 }}>{p.equipo2}</p>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', color: '#f5f5f5', lineHeight: 1 }}>{p.g2}</p>
                    {p.am2 > 0 && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>🟨 ×{p.am2}</p>}
                    {p.rj2 > 0 && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>🟥 ×{p.rj2}</p>}
                  </div>
                </div>
                {/* Quien anoto y quien vio tarjeta, equipo por equipo */}
                <div style={{ marginBottom: 14 }}>
                  <EventosPartido partido={p} deporte={TORNEO.deporte} />
                </div>
                <button onClick={() => compartirWhatsApp(p)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 10, color: '#25d366', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  📲 Compartir por WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTabVista(t.key)} style={{
            padding: '10px 20px', background: tabVista === t.key ? 'rgba(139,0,0,0.2)' : 'transparent',
            color: tabVista === t.key ? '#ff6b6b' : '#666', border: 'none',
            borderBottom: tabVista === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.85rem',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: POSICIONES ── */}
      {tabVista === 'posiciones' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: usaLiga ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
            {Object.entries(tablasEnVivo).map(([grupo, filas]) => (
              <div key={grupo} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '12px 16px', background: 'rgba(139,0,0,0.15)', borderBottom: '1px solid #2a2a2a' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>
                    {usaLiga ? 'Tabla General' : `Grupo ${grupo}`}
                  </p>
                </div>
                <AvisoProvisional filas={filas} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        {['#', 'Equipo', 'PJ', 'PG', ...(hayEmpates ? ['PE'] : []), 'PP',
                          etq.aFavor, etq.enContra, etq.dif, 'Pts'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', fontSize: '0.68rem', color: '#555', fontWeight: 700, textAlign: h === 'Equipo' ? 'left' : 'center', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map(eq => (
                        <tr key={eq.id} style={{
                          borderBottom: '1px solid #1a1a1a',
                          background: eq.clasifica ? 'rgba(34,197,94,0.05)' : 'transparent',
                        }}>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: eq.clasifica ? '#22c55e' : '#555' }}>{eq.pos}</span>
                          </td>
                          <td style={{ padding: '10px', fontSize: '0.82rem', color: '#f5f5f5', fontWeight: eq.clasifica ? 700 : 400 }}>
                            {eq.clasifica && <span style={{ color: '#22c55e', marginRight: 5 }}>→</span>}
                            {eq.nombre}
                            <MarcaEnJuego fila={eq} />
                          </td>
                          {[eq.pj, eq.pg, ...(hayEmpates ? [eq.pe] : []), eq.pp,
                            eq.gf, eq.gc].map((v, vi) => (
                            <td key={vi} style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem', color: '#888', fontVariantNumeric: 'tabular-nums' }}>{v}</td>
                          ))}
                          <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem', color: eq.dif > 0 ? '#22c55e' : eq.dif < 0 ? '#ef4444' : '#888', fontVariantNumeric: 'tabular-nums' }}>
                            {eq.dif > 0 ? `+${eq.dif}` : eq.dif}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f59e0b' }}>{eq.pts}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid #1a1a1a' }}>
                  <p style={{ fontSize: '0.68rem', color: usaLiga ? '#f59e0b' : '#22c55e' }}>
                    {usaLiga
                      ? '🏆 El primero de la tabla es el campeón del torneo'
                      : `→ Clasifican los ${TORNEO.clasificanPorGrupo} primeros a la fase eliminatoria`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reglas de la tabla */}
          <div className="card" style={{ padding: 16, marginTop: 18 }}>
            <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
              Cómo se arma la tabla
            </p>
            <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 8 }}>
              Victoria: {puntaje.victoria} pts
              {puntaje.admiteEmpate ? ` · Empate: ${puntaje.empate} pt` : ' · Sin empates en este deporte'}
              {' '}· Derrota: {puntaje.derrota} pts
            </p>
            <p style={{ fontSize: '0.72rem', color: '#555', marginBottom: 4 }}>Criterios de desempate, en orden:</p>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {CRITERIOS_DESEMPATE.map((c, i) => (
                <li key={i} style={{ fontSize: '0.76rem', color: '#888', marginBottom: 2 }}>{c}</li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* ── TAB: ELIMINATORIA ── */}
      {tabVista === 'llaves' && (
        <div>
          {!faseGruposCompleta ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <h3>La fase eliminatoria aún no está definida</h3>
              <p style={{ maxWidth: 460, margin: '0 auto' }}>
                Los cruces se arman automáticamente cuando termine el último partido de la fase de grupos.
                Faltan {partidos.filter(p => p.fase === 'grupos' && p.estado !== 'finalizado').length} partidos
                por jugar.
              </p>
              <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 10, maxWidth: 540, margin: '18px auto 0' }}>
                <p style={{ color: '#00BCD4', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                  Cómo se armará el cuadro
                </p>
                <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.6 }}>
                  El cuadro se divide en dos lados. El primero de un grupo enfrenta al segundo del grupo
                  emparejado y queda en el lado izquierdo; el primero del otro grupo queda en el derecho.
                  Así los dos punteros solo pueden encontrarse en la final, igual que en la Champions.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                {cuadro.map((ronda, ri) => (
                  <div key={ri} style={{ minWidth: 280, flex: '1 0 280px' }}>
                    <div style={{ padding: '10px 14px', background: 'rgba(139,0,0,0.15)', border: '1px solid #2a2a2a', borderRadius: '12px 12px 0 0' }}>
                      <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: '#f5f5f5', letterSpacing: 0.5 }}>
                        {ronda[0].ronda}
                      </p>
                    </div>
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: '#141414', border: '1px solid #2a2a2a', borderTop: 'none', borderRadius: '0 0 12px 12px', height: 'calc(100% - 42px)', justifyContent: 'space-around' }}>
                      {ronda.map((l, i) => {
                        const colorLado = l.lado === 'izquierda' ? '#00BCD4'
                                        : l.lado === 'derecha' ? '#a78bfa' : '#f59e0b'
                        return (
                          <div key={i} style={{
                            background: '#1a1a1a', border: '1px solid #2a2a2a',
                            borderLeft: `3px solid ${colorLado}`, borderRadius: 10, padding: '10px 12px',
                          }}>
                            <p style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                              {l.llave}
                            </p>
                            <FilaLlave llave={l} lado={1} />
                            <FilaLlave llave={l} lado={2} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Partido por el tercer puesto */}
              {tercerPuesto && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16, maxWidth: 340 }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(205,127,50,0.15)', borderBottom: '1px solid #2a2a2a' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: '#cd7f32', letterSpacing: 0.5 }}>
                      🥉 Tercer puesto
                    </p>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderLeft: '3px solid #cd7f32', borderRadius: 10, padding: '10px 12px' }}>
                      <FilaLlave llave={tercerPuesto} lado={1} />
                      <FilaLlave llave={tercerPuesto} lado={2} />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
                {[['#00BCD4', 'Lado izquierdo del cuadro'],
                  ['#a78bfa', 'Lado derecho del cuadro'],
                  ['#f59e0b', 'Final']].map(([c, t]) => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.75rem', color: '#888' }}>
                    <span style={{ width: 3, height: 14, background: c, borderRadius: 2 }} />{t}
                  </span>
                ))}
              </div>

              <div className="card" style={{ padding: 16, marginTop: 16 }}>
                <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                  Cómo se armó el cuadro
                </p>
                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.6 }}>
                  Con {Object.keys(tablas).length} grupos clasifican {Object.keys(tablas).length * TORNEO.clasificanPorGrupo} equipos,
                  por eso la eliminatoria empieza en {cuadro[0]?.[0]?.ronda?.toLowerCase()}. El primero de cada
                  grupo enfrenta al segundo del grupo emparejado, y los dos punteros quedan en lados
                  opuestos del cuadro: solo pueden encontrarse en la final.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: GOLEADORES ── */}
      {tabVista === 'goleadores' && (
        ranking.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👟</div>
            <h3>Aún no hay estadísticas individuales</h3>
            <p>El ranking se arma con lo que registra la mesa técnica, jugador por jugador.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'rgba(139,0,0,0.15)', borderBottom: '1px solid #2a2a2a' }}>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>
                Ranking de jugadores
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    {['#', 'Jugador', 'Equipo', pres.icono,
                      ...(pres.tieneAmarillas ? ['🟨'] : []), ...(pres.tieneRojas ? ['🟥'] : [])].map(h => (
                      <th key={h} style={{ padding: '8px 12px', fontSize: '0.68rem', color: '#555', fontWeight: 700, textAlign: h === 'Jugador' || h === 'Equipo' ? 'left' : 'center', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(r => (
                    <tr key={r.jugador_id} style={{ borderBottom: '1px solid #1a1a1a', background: r.pos <= 3 && r.goles > 0 ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: r.pos <= 3 && r.goles > 0 ? '#f59e0b' : '#555' }}>{r.pos}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ minWidth: 26, height: 26, borderRadius: 7, background: '#8B0000', color: '#fff', fontWeight: 800, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>
                            {r.dorsal ?? '-'}
                          </span>
                          <span style={{ fontSize: '0.84rem', color: '#f5f5f5', fontWeight: 600 }}>{r.jugador}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#888' }}>{r.equipo}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: r.goles > 0 ? '#22c55e' : '#444' }}>{r.goles}</span>
                      </td>
                      {pres.tieneAmarillas && <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.82rem', color: r.amarillas > 0 ? '#f59e0b' : '#444', fontVariantNumeric: 'tabular-nums' }}>{r.amarillas}</td>}
                      {pres.tieneRojas && <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.82rem', color: r.rojas > 0 ? '#ef4444' : '#444', fontVariantNumeric: 'tabular-nums' }}>{r.rojas}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid #1a1a1a' }}>
              <p style={{ fontSize: '0.68rem', color: '#555' }}>
                Se ordena por {pres.anotaciones.toLowerCase()}{pres.tieneAmarillas ? '; a igual cantidad, primero quien tenga menos amarillas' : ''}.
              </p>
            </div>
          </div>
        )
      )}

      {/* ── TAB: FIXTURE ── */}
      {tabVista === 'fixture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['en_vivo', 'programado', 'finalizado'].map(estado => {
            const ps = partidos.filter(p => p.estado === estado)
            if (ps.length === 0) return null
            const cfg = ESTADO_CONFIG[estado]
            return (
              <div key={estado}>
                <p style={{ color: cfg.color, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 4 }}>
                  {cfg.label}
                </p>
                {ps.map(p => (
                  <div key={p.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr auto',
                    alignItems: 'center', gap: 12, padding: '14px 18px', marginBottom: 8,
                    background: '#1a1a1a',
                    border: `1px solid ${p.estado === 'en_vivo' ? 'rgba(239,68,68,0.3)' : '#2a2a2a'}`,
                    borderRadius: 12,
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.88rem' }}>{p.equipo1}</p>
                      <p style={{ fontSize: '0.7rem', color: '#555' }}>
                        {/* Los de la llave no tienen grupo: antes decia «Grupo null» */}
                        {p.fase === 'eliminatoria' || p.llave
                          ? (p.llave || p.ronda || 'Eliminatoria')
                          : usaLiga ? 'Fase regular'
                          : p.grupo ? `Grupo ${p.grupo}` : 'Fase de grupos'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      {p.estado !== 'programado' ? (
                        <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: p.estado === 'en_vivo' ? '#ef4444' : '#f5f5f5', lineHeight: 1 }}>
                          {p.g1} - {p.g2}
                        </p>
                      ) : (
                        <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#444' }}>{p.hora}</p>
                      )}
                      {p.estado === 'en_vivo' && pres.tieneMinuto && p.minuto != null && (
                        <p style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>{p.minuto}&apos;</p>
                      )}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.88rem' }}>{p.equipo2}</p>
                      <p style={{ fontSize: '0.7rem', color: '#555' }}>📍 {p.cancha}</p>
                    </div>
                    {p.estado !== 'programado' ? (
                      <button onClick={() => compartirWhatsApp(p)}
                        style={{ padding: '6px 10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 8, color: '#25d366', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
                        📲 WA
                      </button>
                    ) : <div />}
                    {p.estado !== 'programado' && (p.eventos || []).length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <EventosPartido partido={p} deporte={TORNEO.deporte} compacto />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: EN VIVO sin partidos ── */}
      {tabVista === 'en_vivo' && partidosEnVivo.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">⚽</div>
          <h3>No hay partidos en curso</h3>
          <p>Los partidos en vivo aparecerán aquí cuando comiencen</p>
        </div>
      )}
    </Layout>
  )
}
