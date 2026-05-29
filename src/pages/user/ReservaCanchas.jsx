import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const CANCHAS = [
  { id: 1, nombre: 'Cancha de Fútbol Principal', empresa: 'Sport Center', zona: 'Zona Norte', deporte: '⚽ Fútbol', precio: 120, disponible: true, horarios: ['09:00-10:00', '10:00-11:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '17:00-18:00'] },
  { id: 2, nombre: 'Cancha de Baloncesto', empresa: 'Gimnasio Central', zona: 'Centro', deporte: '🏀 Básquetbol', precio: 80, disponible: true, horarios: ['08:00-09:00', '09:00-10:00', '11:00-12:00', '15:00-16:00', '16:00-17:00', '18:00-19:00'] },
  { id: 3, nombre: 'Cancha de Voleibol', empresa: 'Zona Deportiva Sur', zona: 'Zona Sur', deporte: '🏐 Voleibol', precio: 70, disponible: false, horarios: [] },
  { id: 4, nombre: 'Cancha de Wally 1', empresa: 'Complejo Deportivo Este', zona: 'Zona Este', deporte: '🎾 Wally', precio: 60, disponible: true, horarios: ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00', '17:00-18:00'] },
  { id: 5, nombre: 'Cancha de Wally 2', empresa: 'Complejo Deportivo Este', zona: 'Zona Este', deporte: '🎾 Wally', precio: 60, disponible: true, horarios: ['08:00-09:00', '10:00-11:00', '13:00-14:00', '16:00-17:00', '17:00-18:00'] },
  { id: 6, nombre: 'Cancha de Wally 3', empresa: 'Complejo Deportivo Este', zona: 'Zona Este', deporte: '🎾 Wally', precio: 60, disponible: true, horarios: ['09:00-10:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '18:00-19:00'] },
  { id: 7, nombre: 'Cancha de Pádel', empresa: 'Zona Deportiva Oeste', zona: 'Zona Oeste', deporte: '🏓 Pádel', precio: 90, disponible: true, horarios: ['09:00-10:00', '11:00-12:00', '14:00-15:00', '16:00-17:00'] },
]

const PARTIDOS = [
  { id: 1, deporte: 'Fútbol 5', cancha: 'Cancha Auxiliar 3', tiempo: 'Ahora', jugadores: 8, maxJugadores: 10, creador: 'Carlos M.', apuesta: 'Perdedores invitan refrescos', color: '#ef4444' },
  { id: 2, deporte: 'Baloncesto', cancha: 'Cancha Externa 1', tiempo: 'En 30min', jugadores: 6, maxJugadores: 10, creador: 'Ana L.', apuesta: null, color: '#f59e0b' },
  { id: 3, deporte: 'Wally', cancha: 'Cancha de Wally 3', tiempo: 'En 1 hora', jugadores: 4, maxJugadores: 8, creador: 'Juan R.', apuesta: 'Perdedores invitan almuerzo', color: '#8b5cf6' },
]

export default function ReservaCanchas() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('programadas')
  const [selectedHorario, setSelectedHorario] = useState({})
  const [showModal, setShowModal] = useState(null)
  const [filtroDeporte, setFiltroDeporte] = useState('todos')
  const [showCrear, setShowCrear] = useState(false)

  const deportes = ['todos', ...new Set(CANCHAS.map(c => c.deporte.split(' ')[1]))]

  const canchasFiltradas = filtroDeporte === 'todos'
    ? CANCHAS
    : CANCHAS.filter(c => c.deporte.includes(filtroDeporte))

  return (
    <Layout role="user">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/dashboard')} style={{ marginBottom: 4, padding: '4px 0' }}>
            ← Volver al Dashboard
          </button>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>
            {tab === 'juega' ? '⚡ Partidos Espontáneos' : 'Reserva de Canchas'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {tab === 'programadas' && (
            <>
              <span className="badge badge-success">● Disponible</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#666' }}>● No disponible</span>
            </>
          )}
          {tab === 'juega' && (
            <button
              className="btn btn-accent btn-sm"
              style={{ color: '#000' }}
              onClick={() => setShowCrear(true)}
            >
              ⚡ Crear partido espontáneo
            </button>
          )}
        </div>
      </div>

      {/* Info banner — solo en reservas */}
      {tab === 'programadas' && (
        <div style={{ background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 12, padding: '12px 18px', marginBottom: 20 }}>
          <p style={{ color: '#00BCD4', fontSize: '0.88rem', fontWeight: 600 }}>¿Cómo funciona?</p>
          <p style={{ color: '#666', fontSize: '0.82rem', marginTop: 2 }}>
            Puedes reservar para <strong style={{ color: '#ccc' }}>hoy mismo</strong> o con hasta <strong style={{ color: '#ccc' }}>7 días de anticipación</strong>. Haz clic en un horario disponible para elegir fecha y hora.
          </p>
        </div>
      )}

      {/* Info banner — solo en juega ahora */}
      {tab === 'juega' && (
        <div style={{ background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.25)', borderRadius: 12, padding: '12px 18px', marginBottom: 20 }}>
          <p style={{ color: '#ff6b6b', fontSize: '0.88rem', fontWeight: 600 }}>¿Cómo funciona?</p>
          <p style={{ color: '#666', fontSize: '0.82rem', marginTop: 2 }}>
            Únete a un partido que ya está por comenzar o <strong style={{ color: '#ccc' }}>crea uno nuevo</strong>. Sin nivel mínimo, ¡todos pueden jugar!
          </p>
        </div>
      )}

      {/* Tabs + Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tabs">
          <button className={`tab ${tab === 'programadas' ? 'active' : ''}`} onClick={() => setTab('programadas')}>Reservas Programadas</button>
          <button className={`tab ${tab === 'juega' ? 'active' : ''}`} onClick={() => setTab('juega')}>¡Juega Ahora!</button>
        </div>

        {/* Filtro deporte — solo en reservas */}
        {tab === 'programadas' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {deportes.map(d => (
              <button key={d} onClick={() => setFiltroDeporte(d)} style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filtroDeporte === d ? '#8B0000' : '#2a2a2a',
                background: filtroDeporte === d ? 'rgba(139,0,0,0.2)' : 'transparent',
                color: filtroDeporte === d ? '#ff6b6b' : '#666',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Outfit',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}>{d}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB: RESERVAS PROGRAMADAS ── */}
      {tab === 'programadas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {canchasFiltradas.map(cancha => (
            <div key={cancha.id} className="card" style={{ opacity: cancha.disponible ? 1 : 0.5 }}>
              <div className="cancha-img">
                <span style={{ fontSize: '2.5rem' }}>{cancha.deporte.split(' ')[0]}</span>
              </div>

              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 2 }}>{cancha.nombre}</h3>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>📍 {cancha.zona} — {cancha.empresa}</p>
                  </div>
                  <span className={`badge ${cancha.disponible ? 'badge-success' : ''}`} style={!cancha.disponible ? { background: 'rgba(255,255,255,0.06)', color: '#666' } : {}}>
                    {cancha.disponible ? 'Disponible' : 'No disponible'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.82rem', color: '#00BCD4', fontWeight: 600 }}>{cancha.deporte}</span>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f59e0b' }}>Bs. {cancha.precio}/hr</span>
                </div>

                {cancha.disponible && (
                  <>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: 8, fontWeight: 600 }}>Horarios disponibles hoy:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                      {cancha.horarios.map(h => (
                        <button
                          key={h}
                          className={`horario-chip disponible ${selectedHorario[cancha.id] === h ? 'selected' : ''}`}
                          onClick={() => setSelectedHorario(prev => ({ ...prev, [cancha.id]: h }))}
                        >
                          🕐 {h}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  className={`btn w-full ${cancha.disponible ? 'btn-primary' : 'btn-outline'}`}
                  style={{ justifyContent: 'center', opacity: cancha.disponible ? 1 : 0.4 }}
                  disabled={!cancha.disponible}
                  onClick={() => cancha.disponible && setShowModal(cancha)}
                >
                  {cancha.disponible ? '📅 Reservar cancha →' : 'No disponible'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: JUEGA AHORA — PARTIDOS ESPONTÁNEOS ── */}
      {tab === 'juega' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {PARTIDOS.map(p => (
            <div key={p.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5' }}>{p.deporte}</h3>
                <span className="badge" style={{ background: p.color + '22', color: p.color }}>{p.tiempo}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 12 }}>📍 {p.cancha}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#666' }}>Jugadores</span>
                <span style={{ fontSize: '0.82rem', color: '#00BCD4', fontWeight: 700 }}>{p.jugadores}/{p.maxJugadores}</span>
              </div>
              <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(p.jugadores / p.maxJugadores) * 100}%`, background: p.color, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>

              <div style={{ marginBottom: p.apuesta ? 12 : 0 }}>
                <span style={{ fontSize: '0.78rem', color: '#555' }}>Creado por: <span style={{ color: '#999' }}>{p.creador}</span></span>
              </div>

              {p.apuesta && (
                <div style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, marginBottom: 12 }}>
                  <p style={{ fontSize: '0.75rem', color: '#f59e0b' }}>🎰 {p.apuesta}</p>
                </div>
              )}

              <button className="btn btn-accent w-full" style={{ color: '#000', justifyContent: 'center', marginTop: 4 }}>
                Unirse al partido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: CONFIRMAR RESERVA ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Reserva</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <p style={{ fontWeight: 600, color: '#f5f5f5', marginBottom: 4 }}>{showModal.nombre}</p>
              <p style={{ fontSize: '0.82rem', color: '#666' }}>{showModal.empresa} — {showModal.zona}</p>
              {selectedHorario[showModal.id] && (
                <p style={{ fontSize: '0.88rem', color: '#00BCD4', marginTop: 8, fontWeight: 600 }}>🕐 {selectedHorario[showModal.id]}</p>
              )}
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f59e0b', marginTop: 8 }}>Total: Bs. {showModal.precio}</p>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Fecha de reserva</label>
              <input className="input" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Notas adicionales (opcional)</label>
              <textarea className="input" rows={3} placeholder="Ej: Somos 10 personas, fútbol 5..." style={{ resize: 'none' }} />
            </div>

            <div style={{ padding: 14, background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: '#00BCD4', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>💳 Pago con código QR</p>
              <p style={{ color: '#666', fontSize: '0.78rem' }}>Tras confirmar, recibirás el código QR del administrador para realizar el pago y subir tu comprobante.</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(null)}>✅ Confirmar Reserva</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR PARTIDO ESPONTÁNEO ── */}
      {showCrear && (
        <div className="modal-overlay" onClick={() => setShowCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">¡Juega Ahora!</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCrear(false)}>✕</button>
            </div>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 24 }}>Crea un partido espontáneo e invita a otros a unirse. Sin filtros por nivel, todos pueden jugar.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Deporte</label>
                <select className="input">
                  <option>Selecciona un deporte</option>
                  <option>Fútbol</option>
                  <option>Baloncesto</option>
                  <option>Wally</option>
                  <option>Voleibol</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación / Cancha</label>
                <select className="input">
                  <option>Selecciona una cancha</option>
                  <option>Cancha Auxiliar 3</option>
                  <option>Cancha Externa 1</option>
                  <option>Cancha de Wally 3</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">¿Cuándo?</label>
                <select className="input">
                  <option>Ahora mismo</option>
                  <option>En 30 minutos</option>
                  <option>En 1 hora</option>
                  <option>Elegir fecha y hora</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Número máximo de jugadores: 10</label>
                <input className="input" type="range" min={2} max={22} defaultValue={10} />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción (opcional)</label>
                <textarea className="input" rows={3} placeholder="Añade detalles sobre el partido, nivel de juego, etc." style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
                <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>🎰 ¿Incluir apuesta social?</span>
                <div style={{ width: 40, height: 22, background: '#2a2a2a', borderRadius: 11, cursor: 'pointer' }} />
              </div>
              <button className="btn btn-accent w-full" style={{ color: '#000', justifyContent: 'center', marginTop: 8 }} onClick={() => setShowCrear(false)}>
                ⚡ Crear Partido
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
