import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const TORNEO = {
  id: 1, nombre: 'Copa Sportika Futbol 2025', deporte: 'Futbol', emoji: 'Gol',
  formato: 'Grupos + Eliminacion', empresa: 'Sport Center',
}

const DEPORTE_CONFIG = {
  'Futbol':     { metricaLabel: 'Goles',  metricaIcon: 'GOL', tieneMinuto: true,  tieneAmarillas: true,  tieneRojas: true  },
  'Basquetbol': { metricaLabel: 'Puntos', metricaIcon: 'PTS', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Voleibol':   { metricaLabel: 'Sets',   metricaIcon: 'SET', tieneMinuto: false, tieneAmarillas: true,  tieneRojas: false },
  'Wally':      { metricaLabel: 'Puntos', metricaIcon: 'PTS', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
  'Tenis':      { metricaLabel: 'Juegos', metricaIcon: 'JUE', tieneMinuto: false, tieneAmarillas: false, tieneRojas: false },
}

const EQUIPOS_MOCK = {
  1: {
    nombre: 'Los Cracks FC',
    jugadores: [
      { id: 1,  nombre: 'Pedro Rojas',   posicion: 'Portero',       habilitado: true  },
      { id: 2,  nombre: 'Carlos Mamani', posicion: 'Defensa',       habilitado: true  },
      { id: 3,  nombre: 'Luis Flores',   posicion: 'Defensa',       habilitado: true  },
      { id: 4,  nombre: 'Marco Quispe',  posicion: 'Mediocampista', habilitado: false },
      { id: 5,  nombre: 'Diego Vargas',  posicion: 'Mediocampista', habilitado: true  },
      { id: 6,  nombre: 'Alex Torrez',   posicion: 'Delantero',     habilitado: true  },
      { id: 7,  nombre: 'Juan Peredo',   posicion: 'Delantero',     habilitado: false },
      { id: 8,  nombre: 'Rene Copa',     posicion: 'Mediocampista', habilitado: true  },
      { id: 9,  nombre: 'Simon Arce',    posicion: 'Defensa',       habilitado: true  },
      { id: 10, nombre: 'Erick Mendez',  posicion: 'Defensa',       habilitado: true  },
      { id: 11, nombre: 'Abel Soliz',    posicion: 'Mediocampista', habilitado: true  },
      { id: 13, nombre: 'Omar Cruz',     posicion: 'Defensa',       habilitado: true  },
      { id: 14, nombre: 'Ivan Medina',   posicion: 'Delantero',     habilitado: true  },
    ],
  },
  2: {
    nombre: 'Deportivo Norte',
    jugadores: [
      { id: 15, nombre: 'Ana Lopez',    posicion: 'Portero',       habilitado: true  },
      { id: 16, nombre: 'Fran Morales', posicion: 'Defensa',       habilitado: true  },
      { id: 17, nombre: 'Nico Reyes',   posicion: 'Mediocampista', habilitado: true  },
      { id: 18, nombre: 'Sara Blanco',  posicion: 'Delantero',     habilitado: true  },
      { id: 19, nombre: 'Camila Rios',  posicion: 'Defensa',       habilitado: false },
      { id: 20, nombre: 'Luis Mendez',  posicion: 'Mediocampista', habilitado: true  },
      { id: 21, nombre: 'Jorge Paz',    posicion: 'Defensa',       habilitado: true  },
      { id: 22, nombre: 'Rene Alva',    posicion: 'Mediocampista', habilitado: true  },
      { id: 23, nombre: 'Mario Soto',   posicion: 'Delantero',     habilitado: true  },
      { id: 24, nombre: 'Oscar Tito',   posicion: 'Defensa',       habilitado: true  },
      { id: 25, nombre: 'Elena Coss',   posicion: 'Mediocampista', habilitado: true  },
    ],
  },
}

const PARTIDOS_INIT = [
  {
    id: 1, grupo: 'A', equipo1_id: 1, equipo1: 'Los Cracks FC',
    equipo2_id: 2, equipo2: 'Deportivo Norte',
    g1: 1, g2: 0, am1: 0, am2: 1, rj1: 0, rj2: 0,
    estado: 'en_vivo', hora: '15:00', cancha: 'Cancha Principal', minuto: 37,
    eventos: [
      { tipo: 'gol',      jugador_id: 6,  jugador: 'Alex Torrez', equipo_id: 1, equipo: 'Los Cracks FC',  minuto: 12 },
      { tipo: 'amarilla', jugador_id: 17, jugador: 'Nico Reyes',  equipo_id: 2, equipo: 'Deportivo Norte', minuto: 28 },
    ],
  },
  {
    id: 2, grupo: 'A', equipo1_id: 3, equipo1: 'Athletic Sur',
    equipo2_id: 4, equipo2: 'Team Rojo',
    g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0,
    estado: 'programado', hora: '17:00', cancha: 'Cancha Auxiliar', minuto: null,
    eventos: [],
  },
]

const ESTADO_LABELS = {
  en_vivo:    { label: 'EN VIVO',    color: '#ef4444' },
  finalizado: { label: 'Finalizado', color: '#22c55e' },
  programado: { label: 'Programado', color: '#666'    },
}

export default function TorneoMesa() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [partidos, setPartidos] = useState(PARTIDOS_INIT)
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)
  const [confirmFinalizar, setConfirmFinalizar] = useState(false)
  const [ultimaAccion, setUltimaAccion] = useState(null)
  const [modalJugador, setModalJugador] = useState(null)

  const config = DEPORTE_CONFIG[TORNEO.deporte] || DEPORTE_CONFIG['Futbol']
  const partido = partidoSeleccionado !== null ? partidos.find(p => p.id === partidoSeleccionado) : null

  const registrarAccion = (desc) =>
    setUltimaAccion({ texto: desc, tiempo: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })

  const abrirModalJugador = (tipo, equipoId, campoMetrica) => {
    const eq = EQUIPOS_MOCK[equipoId]
    if (!eq) return
    const jugadores = eq.jugadores.filter(j => j.habilitado)
    setModalJugador({ tipo, equipoId, campoMetrica, jugadores, equipoNombre: eq.nombre })
  }

  const confirmarJugador = (jugador) => {
    if (!modalJugador || !partido) return
    const { tipo, equipoId, campoMetrica } = modalJugador
    const p = partido
    const esEq1 = equipoId === p.equipo1_id
    const minuto = p.minuto || 0

    setPartidos(prev => prev.map(x =>
      x.id === p.id
        ? {
            ...x,
            [campoMetrica]: Math.max(0, (x[campoMetrica] || 0) + 1),
            eventos: [...(x.eventos || []), {
              tipo,
              jugador_id: jugador.id,
              jugador: jugador.nombre,
              equipo_id: equipoId,
              equipo: esEq1 ? x.equipo1 : x.equipo2,
              minuto,
            }],
          }
        : x
    ))

    const tipoLabel = tipo === 'gol' ? config.metricaLabel : tipo === 'amarilla' ? 'Amarilla' : 'Roja'
    registrarAccion(jugador.nombre + ' - ' + tipoLabel + ' ' + minuto + "'")
    setModalJugador(null)
  }

  const quitarMetrica = (campo) => {
    setPartidos(prev => prev.map(x =>
      x.id === partido?.id ? { ...x, [campo]: Math.max(0, (x[campo] || 0) - 1) } : x
    ))
    registrarAccion('Correccion realizada')
  }

  const iniciarPartido = () => {
    setPartidos(prev => prev.map(p => p.id === partidoSeleccionado ? { ...p, estado: 'en_vivo', minuto: 0 } : p))
    registrarAccion('Partido iniciado')
  }

  const finalizarPartido = () => {
    const p = partidos.find(x => x.id === partidoSeleccionado)
    setPartidos(prev => prev.map(x => x.id === partidoSeleccionado ? { ...x, estado: 'finalizado' } : x))
    registrarAccion('Partido finalizado: ' + p.equipo1 + ' ' + p.g1 + ' - ' + p.g2 + ' ' + p.equipo2)
    setConfirmFinalizar(false)
  }

  const compartirWhatsApp = () => {
    if (!partido) return
    const texto = TORNEO.nombre + '\n\n' + partido.equipo1 + ' ' + partido.g1 + ' - ' + partido.g2 + ' ' + partido.equipo2 + '\n\nVer en Sportika'
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank')
  }

  return (
    <Layout role="user">
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem', marginBottom: 8 }}>
          Volver al torneo
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>Mesa Tecnica</h1>
            <p style={{ color: '#666', fontSize: '0.82rem' }}>{TORNEO.nombre} - {TORNEO.empresa}</p>
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
          {partidos.map(p => {
            const cfg = ESTADO_LABELS[p.estado]
            const activo = p.id === partidoSeleccionado
            return (
              <div key={p.id} onClick={() => setPartidoSeleccionado(p.id)} style={{
                padding: '12px 14px', marginBottom: 8,
                background: activo ? 'rgba(139,0,0,0.2)' : '#1a1a1a',
                border: '1px solid ' + (activo ? 'rgba(139,0,0,0.5)' : '#2a2a2a'),
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                  <span style={{ fontSize: '0.65rem', color: '#555' }}>{p.hora}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600, flex: 1 }}>{p.equipo1}</span>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', margin: '0 8px' }}>{p.g1} - {p.g2}</span>
                  <span style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600, flex: 1, textAlign: 'right' }}>{p.equipo2}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div>
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
                        {partido.eventos.map((ev, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#1a1a1a', borderRadius: 8 }}>
                            <span style={{ fontSize: '0.8rem', color: '#bbb' }}>
                              {ev.tipo === 'gol' ? 'GOL' : ev.tipo === 'amarilla' ? 'AMARILLA' : 'ROJA'}{' '}
                              <strong>{ev.jugador}</strong>
                            </span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.7rem', color: '#555' }}>{ev.equipo}</span>
                              {ev.minuto != null && <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: 8 }}>{ev.minuto} min</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={compartirWhatsApp} style={{ padding: '12px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 12, color: '#25d366', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      Compartir por WA
                    </button>
                    <button onClick={() => setConfirmFinalizar(true)} style={{ padding: '12px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
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
                {modalJugador.tipo === 'gol' ? 'Quien marco?' : modalJugador.tipo === 'amarilla' ? 'A quien la amarilla?' : 'A quien la roja?'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalJugador(null)}>X</button>
            </div>
            <p style={{ color: '#666', fontSize: '0.82rem', marginBottom: 14 }}>
              {modalJugador.equipoNombre} - Solo jugadores habilitados
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
                    padding: '12px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a',
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit', textAlign: 'left',
                  }}>
                    <div>
                      <p style={{ fontSize: '0.88rem', color: '#f5f5f5', fontWeight: 600 }}>{j.nombre}</p>
                      <p style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{j.posicion}</p>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#8B0000' }}>-&gt;</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {confirmFinalizar && partido && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>!</p>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 8 }}>Finalizar partido?</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 20 }}>
              {partido.equipo1} {partido.g1} - {partido.g2} {partido.equipo2}
            </p>
            <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 20 }}>Esta accion no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmFinalizar(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 10, color: '#666', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={finalizarPartido} style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, color: '#22c55e', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
