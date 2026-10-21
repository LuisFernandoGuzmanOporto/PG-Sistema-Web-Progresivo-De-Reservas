import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { PARTIDOS_ESPONTANEOS, partidosVigentes, empresasActivas, USUARIO_ACTUAL,
         empresaPorId } from '../../lib/datos'
import { unirseAPartido, salirDePartido } from '../../lib/guardar'
import { horaDelPartido, yaSeJugo } from '../../lib/horaDelPartido'

const DEPORTE_COLORES = {
  'Futbol': '#ef4444', 'Futbol 5': '#ef4444', 'Wally': '#00BCD4',
  'Basquetbol': '#f59e0b', 'Voleibol': '#22c55e', 'Padel': '#8b5cf6',
}
// Alias con tilde: el nombre del deporte se muestra acentuado en toda la app
DEPORTE_COLORES['Fútbol']     = DEPORTE_COLORES['Futbol']
DEPORTE_COLORES['Básquetbol'] = DEPORTE_COLORES['Basquetbol']
DEPORTE_COLORES['Pádel']      = DEPORTE_COLORES['Padel']


export default function Partidos() {
  const navigate = useNavigate()

  // Copia de la lista compartida al montar la pantalla: solo los que todavía
  // se pueden jugar (los que empezaron hace más de una hora ya se jugaron)
  const [partidos, setPartidos]     = useState(() => partidosVigentes())
  const [filtroDeporte, setFiltro]  = useState('todos')
  const [verJugadores, setVerJug]   = useState(null)
  const [showElegirSede, setSede]   = useState(false)

  const yo = USUARIO_ACTUAL.nombre

  const deportes = ['todos', ...new Set(partidos.map(p => p.deporte))]
  const visibles = filtroDeporte === 'todos'
    ? partidos
    : partidos.filter(p => p.deporte === filtroDeporte)

  /** Escribe en la lista compartida: el cupo es el mismo aqui y en el complejo. */
  const guardar = (lista) => {
    const yaJugados = PARTIDOS_ESPONTANEOS.filter(p => yaSeJugo(p.fechaHora))
    PARTIDOS_ESPONTANEOS.length = 0
    PARTIDOS_ESPONTANEOS.push(...yaJugados, ...lista)
    setPartidos(lista)
  }

  const [errorPartido, setErrorPartido] = useState(null)

  const unirse = async (id) => {
    const g = await unirseAPartido(id)
    if (g.error) { setErrorPartido(g.error); return }
    setErrorPartido(null)
    guardar(partidos.map(p =>
      p.id === id ? { ...p, jugadoresUnidos: [...p.jugadoresUnidos, yo] } : p))
  }

  const salir = async (id) => {
    const g = await salirDePartido(id)
    if (g.error) { setErrorPartido(g.error); return }
    setErrorPartido(null)
    guardar(partidos.map(p =>
      p.id === id ? { ...p, jugadoresUnidos: p.jugadoresUnidos.filter(j => j !== yo) } : p))
  }

  return (
    <Layout role="user">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>⚽ Partidos Espontáneos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Únete a un partido que ya está armado o crea el tuyo</p>
        </div>
        <button className="btn btn-accent" style={{ color: '#000' }} onClick={() => setSede(true)}>+ Crear Partido</button>
      </div>

      {/* Si no se pudo unir o salir de un partido, se dice por qué */}
      {errorPartido && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, marginBottom: 14 }}>
          <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>✕ {errorPartido}</p>
        </div>
      )}

      <div style={{ padding: '10px 14px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
        <p style={{ color: '#00BCD4', fontSize: '0.82rem' }}>
          🤝 Estos son partidos abiertos de todos los complejos. Cuando te unes, el organizador ve tu nombre en la lista.
        </p>
      </div>

      {/* Filtro por deporte */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {deportes.map(d => (
          <button key={d} onClick={() => setFiltro(d)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: '0.8rem', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer',
              background: filtroDeporte === d ? 'rgba(139,0,0,0.2)' : 'rgba(255,255,255,0.03)',
              border: '1px solid ' + (filtroDeporte === d ? 'rgba(139,0,0,0.5)' : '#2a2a2a'),
              color: filtroDeporte === d ? '#ff6b6b' : '#888',
            }}>
            {d === 'todos' ? 'Todos' : d}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚽</div>
          <h3>No hay partidos abiertos</h3>
          <p>Sé el primero en crear un partido espontáneo</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setSede(true)}>+ Crear Partido</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {visibles.map(p => {
            const unidos     = p.jugadoresUnidos.length
            const lleno      = unidos >= p.maxJugadores
            const casiLleno  = !lleno && (p.maxJugadores - unidos) <= 2
            const soyCreador = p.creadorId === USUARIO_ACTUAL.id
            const yaUnido    = p.jugadoresUnidos.includes(yo)
            const color      = DEPORTE_COLORES[p.deporte] || '#00BCD4'
            const empresa    = empresaPorId(p.empresa_id)

            return (
              <div key={p.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f5f5f5' }}>{p.deporte}</h3>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {casiLleno && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>¡Casi lleno!</span>}
                    {lleno && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(100,100,100,0.15)', color: '#555' }}>Lleno</span>}
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: color + '22', color }}>{horaDelPartido(p.fechaHora)}</span>
                  </div>
                </div>

                <button onClick={() => navigate('/app/empresa/' + p.empresa_id)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', marginBottom: 4 }}>
                  <p style={{ fontSize: '0.82rem', color: '#00BCD4', fontWeight: 600 }}>{empresa?.emoji} {empresa?.nombre}</p>
                </button>
                <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 12 }}>📍 {p.cancha}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: '#666' }}>Jugadores confirmados</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: lleno ? '#ef4444' : casiLleno ? '#f59e0b' : '#00BCD4' }}>{unidos}/{p.maxJugadores}</span>
                </div>
                <div style={{ height: 7, background: '#2a2a2a', borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: ((unidos / p.maxJugadores) * 100) + '%', background: lleno ? '#ef4444' : casiLleno ? '#f59e0b' : color, borderRadius: 4, transition: 'width 0.3s' }} />
                </div>

                {p.apuesta && (
                  <div style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, marginBottom: 10 }}>
                    <p style={{ fontSize: '0.75rem', color: '#f59e0b' }}>🍺 {p.apuesta}</p>
                  </div>
                )}

                <p style={{ fontSize: '0.72rem', color: '#555', marginBottom: 10 }}>Organiza: {p.creador}</p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setVerJug(p)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a', color: '#888' }}>
                    👥 Ver jugadores
                  </button>
                  {soyCreador ? (
                    <button disabled
                      style={{ flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.82rem', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', color: '#00BCD4', cursor: 'default' }}>
                      Tu partido
                    </button>
                  ) : lleno && !yaUnido ? (
                    <button disabled
                      style={{ flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.82rem', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#444', cursor: 'not-allowed' }}>
                      Partido lleno
                    </button>
                  ) : yaUnido ? (
                    <button onClick={() => salir(p.id)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                      Salir del partido
                    </button>
                  ) : (
                    <button onClick={() => unirse(p.id)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: 'rgba(0,188,212,0.15)', border: '1px solid rgba(0,188,212,0.4)', color: '#00BCD4' }}>
                      Unirse al partido
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: quiénes están en el partido */}
      {verJugadores && (
        <div className="modal-overlay" onClick={() => setVerJug(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Jugadores confirmados</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>{verJugadores.deporte} • {verJugadores.cancha}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setVerJug(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verJugadores.jugadoresUnidos.map((j, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,0,0,0.25)', color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    {j.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ color: '#f5f5f5', fontSize: '0.88rem', fontWeight: 600 }}>{j}</span>
                  {j === verJugadores.creador && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>ORGANIZADOR</span>
                  )}
                  {j === yo && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#00BCD4', fontWeight: 700 }}>TÚ</span>
                  )}
                </div>
              ))}
              {Array.from({ length: verJugadores.maxJugadores - verJugadores.jugadoresUnidos.length }).map((_, i) => (
                <div key={'libre' + i} style={{ padding: '10px 12px', border: '1px dashed #2a2a2a', borderRadius: 10, color: '#444', fontSize: '0.82rem' }}>
                  Lugar libre
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: elegir complejo para crear el partido */}
      {showElegirSede && (
        <div className="modal-overlay" onClick={() => setSede(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">¿En qué complejo?</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Un partido siempre ocupa una cancha, así que primero elige el complejo</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSede(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {empresasActivas().map(e => (
                <button key={e.id} onClick={() => navigate('/app/empresa/' + e.id + '?tab=partidos')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: '1.6rem' }}>{e.emoji}</span>
                  <span>
                    <span style={{ display: 'block', color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{e.nombre}</span>
                    <span style={{ display: 'block', color: '#666', fontSize: '0.75rem' }}>{e.zona} • {e.deportes.join(', ')}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
