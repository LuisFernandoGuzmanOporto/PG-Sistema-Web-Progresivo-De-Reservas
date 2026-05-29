import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const TORNEOS = [
  { id: 1, nombre: 'Copa Sportika Fútbol 2025', deporte: '⚽ Fútbol', empresa: 'Sport Center', fechaInicio: '14 Feb', fechaFin: '28 Feb', equipos: '0/16', inscripcionHasta: '10 Feb', precio: 200, premios: ['', 'Trofeo + Bs. 500', 'Trofeo + Bs. 300'], estado: 'abierto', desc: 'El torneo de fútbol más grande de Cochabamba. Equipos de todos los niveles compiten por la gloria.' },
  { id: 2, nombre: 'Liga de Baloncesto Sportika', deporte: '🏀 Básquetbol', empresa: 'Gimnasio Central', fechaInicio: '28 Feb', fechaFin: '14 Mar', equipos: '0/12', inscripcionHasta: '24 Feb', precio: 150, premios: ['', 'Trofeo + Bs. 400', ''], estado: 'abierto', desc: 'Competencia de baloncesto para todos los niveles.' },
  { id: 3, nombre: 'Championship Wally Cup', deporte: '🎾 Wally', empresa: 'Complejo Deportivo Este', fechaInicio: '19 Feb', fechaFin: '24 Feb', equipos: '0/8', inscripcionHasta: '17 Feb', precio: 100, premios: ['', 'Trofeo + Bs. 200', ''], estado: 'abierto', desc: 'El torneo de wally más emocionante del semestre.' },
  { id: 4, nombre: 'Torneo de Voleibol Sportika', deporte: '🏐 Voleibol', empresa: 'Sport Center', fechaInicio: '8 Mar', fechaFin: '19 Mar', equipos: '0/10', inscripcionHasta: '4 Mar', precio: 120, premios: ['', 'Trofeo + Bs. 350', ''], estado: 'abierto', desc: 'Competencia oficial de voleibol con equipos mínimos de toda la ciudad.' },
  { id: 5, nombre: 'Open de Tenis Sportika', deporte: '🎾 Tenis', empresa: 'Zona Deportiva Oeste', fechaInicio: '31 Mar', fechaFin: '6 Abr', equipos: '0/18', inscripcionHasta: '27 Mar', precio: 80, premios: ['', 'Trofeo + Bs. 250', ''], estado: 'abierto', desc: 'Torneo de tenis en modalidad dobles para deportistas de Cochabamba.' },
]

export default function Torneos() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('disponibles')
  const [showDetalle, setShowDetalle] = useState(null)
  const [showCrear, setShowCrear] = useState(false)
  const [reglas, setReglas] = useState(['Todos los jugadores deben ser mayores de 16 años'])

  const agregarRegla = () => setReglas(prev => [...prev, ''])
  const actualizarRegla = (i, val) => setReglas(prev => prev.map((r, idx) => idx === i ? val : r))

  return (
    <Layout role="user">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏆 Torneos Deportivos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Participa en torneos y crea tus propias competencias</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCrear(true)}>+ Crear Torneo</button>
      </div>

      {/* CTA banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.25) 0%, rgba(245,158,11,0.1) 100%)', border: '1px solid rgba(139,0,0,0.3)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 2 }}>🎯 ¡Organiza tu Propio Torneo!</p>
          <p style={{ color: '#888', fontSize: '0.82rem' }}>Crea competencias deportivas, invita equipos y gestiona todo desde aquí.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCrear(true)}>+ Crear Ahora</button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'disponibles' ? 'active' : ''}`} onClick={() => setTab('disponibles')}>Disponibles ({TORNEOS.length})</button>
        <button className={`tab ${tab === 'participaciones' ? 'active' : ''}`} onClick={() => setTab('participaciones')}>Mis Participaciones (0)</button>
        <button className={`tab ${tab === 'mis' ? 'active' : ''}`} onClick={() => setTab('mis')}>Mis Torneos (0)</button>
      </div>

      {tab === 'disponibles' && (
        <>
          <div style={{ padding: '10px 14px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
            <p style={{ color: '#00BCD4', fontSize: '0.82rem' }}>🏅 Únete a la Competencia — Estos son los torneos donde puedes inscribir tu equipo y competir.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {TORNEOS.map(t => (
              <div key={t.id} className="card">
                <div className="cancha-img" style={{ height: 140 }}>
                  <span style={{ fontSize: '3rem' }}>{t.deporte.split(' ')[0]}</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5', lineHeight: 1.3 }}>{t.nombre}</h3>
                    <span className="badge badge-success" style={{ flexShrink: 0, marginLeft: 8 }}>Abierto</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 10, lineHeight: 1.5 }}>{t.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>📅 {t.fechaInicio} — {t.fechaFin}</p>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>🏢 {t.empresa}</p>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>👥 {t.equipos} equipos inscritos</p>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>⏰ Inscripciones hasta {t.inscripcionHasta}</p>
                  </div>
                  {t.premios[1] && (
                    <div style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, marginBottom: 12 }}>
                      <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>🏅 Premios: {t.premios[1]}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}`)}>Ver Detalles</button>
                    <button className="btn btn-primary btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}/inscribir`)}>Inscribirse</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'participaciones' && (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <h3>Torneos donde Participas</h3>
          <p>Aquí puedes ver todos los torneos donde tienes equipos inscritos y seguir tu progreso.</p>
          <br />
          <p style={{ color: '#555', fontSize: '0.85rem' }}>No estás participando en torneos aún</p>
          <p style={{ color: '#555', fontSize: '0.82rem' }}>Inscribe tu equipo en algún torneo disponible para empezar a competir</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('disponibles')}>Ver Torneos Disponibles</button>
        </div>
      )}

      {tab === 'mis' && (
        <div className="empty-state">
          <div className="empty-state-icon">⚙️</div>
          <h3>Torneos que Organizas</h3>
          <p>Aquí puedes ver y gestionar los torneos que has creado, incluyendo los equipos inscritos.</p>
          <br />
          <p style={{ color: '#555', fontSize: '0.82rem' }}>No has creado torneos aún</p>
          <p style={{ color: '#555', fontSize: '0.78rem' }}>Crea tu primer torneo y organiza competencias deportivas</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCrear(true)}>+ Crear mi Primer Torneo</button>
        </div>
      )}

      {/* Modal Ver Detalles */}
      {showDetalle && (
        <div className="modal-overlay" onClick={() => setShowDetalle(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{showDetalle.nombre}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetalle(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ color: '#888', lineHeight: 1.6 }}>{showDetalle.desc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Deporte', showDetalle.deporte], ['Empresa', showDetalle.empresa], ['Fechas', `${showDetalle.fechaInicio} - ${showDetalle.fechaFin}`], ['Equipos', showDetalle.equipos], ['Inscripción hasta', showDetalle.inscripcionHasta], ['Precio', `Bs. ${showDetalle.precio}`]].map(([k, v]) => (
                  <div key={k} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: 2 }}>{k}</p>
                    <p style={{ fontSize: '0.88rem', color: '#f5f5f5', fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: 14, background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 10 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>💳 Pago de Inscripción con QR</p>
                <p style={{ color: '#666', fontSize: '0.78rem' }}>Tras inscribirte, recibirás el código QR del organizador para realizar el pago y subir tu comprobante.</p>
              </div>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 8 }}>Inscribir mi Equipo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Torneo */}
      {showCrear && (
        <div className="modal-overlay" onClick={() => setShowCrear(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Crear Nuevo Torneo</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCrear(false)}>✕</button>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: '#f59e0b', fontSize: '0.82rem' }}>🏆 Organiza tu Torneo Deportivo — Completa el formulario para crear tu torneo. Una vez creado, los usuarios podrán inscribir sus equipos y tú podrás gestionar toda la competencia.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Informacion basica */}
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a' }}>
                <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>🏆 Información Básica</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Nombre del Torneo *</label>
                    <input className="input" placeholder="Ej: Copa Sportika Fútbol 2025" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deporte *</label>
                    <select className="input">
                      <option value="">Selecciona el deporte</option>
                      {['Fútbol', 'Wally', 'Básquetbol', 'Voleibol', 'Tenis', 'Pádel', 'Futsal'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Descripción del Torneo *</label>
                  <textarea className="input" rows={3} placeholder="Describe el torneo: objetivos, formato, nivel de competencia, etc." style={{ resize: 'none' }} />
                </div>
              </div>

              {/* Fechas */}
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a' }}>
                <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>📅 Fechas y Configuración</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group"><label className="form-label">Límite inscripciones *</label><input className="input" type="date" /></div>
                  <div className="form-group"><label className="form-label">Fecha de inicio *</label><input className="input" type="date" /></div>
                  <div className="form-group"><label className="form-label">Fecha de finalización *</label><input className="input" type="date" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Número máximo de equipos *</label>
                    <select className="input"><option>8</option><option>12</option><option>16</option><option>32</option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ubicación / Cancha *</label>
                    <select className="input"><option value="">Selecciona la cancha</option><option>Cancha Fútbol Principal</option><option>Cancha de Wally 1</option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Costo de inscripción (Bs.)</label>
                    <input className="input" type="number" placeholder="Bs. 150 o Gratis" />
                  </div>
                </div>
              </div>

              {/* Premios */}
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a' }}>
                <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>🏅 Premios</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group"><label className="form-label">🥇 1er Lugar *</label><input className="input" placeholder="Ej: Trofeo + Bs. 500" /></div>
                  <div className="form-group"><label className="form-label">🥈 2do Lugar *</label><input className="input" placeholder="Ej: Trofeo + Bs. 300" /></div>
                  <div className="form-group"><label className="form-label">🥉 3er Lugar</label><input className="input" placeholder="Ej: Trofeo + Bs. 150" /></div>
                </div>
              </div>

              {/* Reglas */}
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ color: '#888', fontWeight: 700, fontSize: '0.85rem' }}>📋 Reglas del Torneo</p>
                  <button className="btn btn-outline btn-sm" onClick={agregarRegla}>+ Agregar Regla</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reglas.map((r, i) => (
                    <input key={i} className="input" value={r} onChange={e => actualizarRegla(i, e.target.value)} placeholder={`Regla ${i + 1}: Ej: Todos los jugadores deben ser activos`} />
                  ))}
                </div>
              </div>

              {/* QR Pago */}
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a' }}>
                <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>📱 Información de Pago (QR)</p>
                <div style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}>
                  <p style={{ color: '#555', fontSize: '0.85rem' }}>📷 Sube tu código QR para recibir pagos de inscripción</p>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Subir imagen QR</button>
                </div>
                <div className="form-group">
                  <label className="form-label">Información de Contacto del Organizador</label>
                  <textarea className="input" rows={2} placeholder="Ej: WhatsApp: 300-123-4567 | Email: organizador@sportika.com" style={{ resize: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowCrear(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setShowCrear(false)}>🏆 Crear Torneo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
