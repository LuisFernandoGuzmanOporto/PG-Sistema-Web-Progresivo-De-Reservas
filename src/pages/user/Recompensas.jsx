import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const RECOMPENSAS = [
  { id: 1, titulo: 'Prioridad en Reservas', desc: 'Obtén prioridad para reservar canchas en horarios de alta demanda', puntos: 30, icon: '📅', disponible: true },
  { id: 2, titulo: 'Refresco Gratis', desc: 'Canjea por un refresco gratis en la cafetería de la empresa', puntos: 50, icon: '🥤', disponible: true },
  { id: 3, titulo: 'Descuento en Reserva', desc: '10% de descuento en tu próxima reserva de cancha', puntos: 80, icon: '🏷️', disponible: true },
  { id: 4, titulo: 'Hora Gratis de Cancha', desc: 'Una hora completamente gratis en cualquier cancha disponible', puntos: 150, icon: '🎁', disponible: false },
  { id: 5, titulo: 'Kit Deportivo', desc: 'Obtén un kit deportivo con camiseta y accesorios', puntos: 300, icon: '👕', disponible: false },
]

const HISTORIAL = [
  { concepto: 'Reporte de daño aprobado', puntos: '+15', fecha: '05/01/2025', icon: '📸' },
  { concepto: 'Participación en partido espontáneo', puntos: '+20', fecha: '19/01/2025', icon: '⚽' },
  { concepto: 'Reporte de daño aprobado', puntos: '+15', fecha: '22/01/2025', icon: '📸' },
  { concepto: 'Reserva completada', puntos: '+5', fecha: '12/01/2025', icon: '📅' },
  { concepto: 'Registro en la plataforma', puntos: '+20', fecha: '01/01/2025', icon: '🎉' },
]

const NIVELES = [
  { nivel: 'Principiante', rango: '0-100 pts', color: '#22c55e' },
  { nivel: 'Intermedio', rango: '101-250 pts', color: '#00BCD4' },
  { nivel: 'Experto', rango: '251+ pts', color: '#f59e0b' },
]

const COMO_GANAR = [
  { accion: 'Reservar canchas', pts: '5 puntos' },
  { accion: 'Completar reservas', pts: '5 puntos' },
  { accion: 'Participar en partidos', pts: '10 puntos' },
  { accion: 'Inscribirse en torneos', pts: '15 puntos' },
]

export default function Recompensas() {
  const [showModal, setShowModal] = useState(null)
  const puntosActuales = 75
  const nivelActual = 'Principiante'
  const puntosParaSiguiente = 100 - puntosActuales

  return (
    <Layout role="user">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>⭐ Recompensas</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Gana puntos participando en la plataforma y canjéalos por beneficios reales</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 24 }}>
        {/* Mis puntos card */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', marginBottom: 16 }}>Mis Puntos</h3>
          <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 12 }}>Gana puntos participando en la plataforma</p>

          {/* Points circle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="8"
                  strokeDasharray={`${(puntosActuales / 100) * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', lineHeight: 1 }}>{puntosActuales}</span>
                <span style={{ fontSize: '0.65rem', color: '#666' }}>puntos</span>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#888', fontSize: '0.78rem', marginBottom: 4 }}>Nivel actual: <span style={{ color: '#22c55e', fontWeight: 700 }}>{nivelActual}</span></p>
          <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(puntosActuales / 100) * 100}%`, background: '#22c55e', borderRadius: 3 }} />
          </div>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '0.72rem', marginBottom: 20 }}>{puntosParaSiguiente} pts más para el siguiente nivel</p>

          <div className="divider" />
          <p style={{ color: '#888', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>Cómo ganar más puntos:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {COMO_GANAR.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#666' }}>✓ {item.accion}</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>+{item.pts}</span>
              </div>
            ))}
          </div>

          <div className="divider" />
          <p style={{ color: '#888', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>Niveles de usuario:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NIVELES.map((n, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: n.color, fontWeight: 600 }}>{i + 1}. {n.nivel}</span>
                <span style={{ color: '#555' }}>{n.rango}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recompensas disponibles */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', marginBottom: 16 }}>🎁 Recompensas Disponibles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {RECOMPENSAS.map(r => (
                <div key={r.id} className="card" style={{
                  padding: 16,
                  opacity: r.disponible && puntosActuales >= r.puntos ? 1 : 0.5,
                  position: 'relative',
                  overflow: 'visible'
                }}>
                  <div style={{ position: 'absolute', top: -8, right: 10, background: '#f59e0b', color: '#000', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                    {r.puntos} pts
                  </div>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>{r.icon}</div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 4 }}>{r.titulo}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.4, marginBottom: 12 }}>{r.desc}</p>
                  <button
                    className={`btn btn-sm w-full ${puntosActuales >= r.puntos ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'center', fontSize: '0.78rem' }}
                    onClick={() => puntosActuales >= r.puntos && setShowModal(r)}
                    disabled={puntosActuales < r.puntos}
                  >
                    {puntosActuales >= r.puntos ? 'Canjear recompensa' : `Necesitas ${r.puntos - puntosActuales} pts más`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Historial */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', marginBottom: 16 }}>📋 Historial de Puntos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HISTORIAL.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 500 }}>{item.concepto}</p>
                      <p style={{ fontSize: '0.72rem', color: '#555' }}>{item.fecha}</p>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#22c55e' }}>{item.puntos}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Como funciona */}
          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(0,0,0,0) 100%)' }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f59e0b', marginBottom: 8 }}>💡 ¿Cómo funciona el sistema de puntos?</h3>
            <p style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.6 }}>
              Gana puntos participando activamente en la plataforma y canjéalos por beneficios reales.
            </p>
          </div>
        </div>
      </div>

      {/* Modal canjear */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">Canjear Recompensa</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>{showModal.icon}</div>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 8 }}>{showModal.titulo}</h3>
              <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>{showModal.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#666', fontSize: '0.72rem' }}>Tus puntos</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#22c55e' }}>{puntosActuales}</p>
                </div>
                <div style={{ color: '#444', fontSize: '1.2rem', alignSelf: 'center' }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#666', fontSize: '0.72rem' }}>Después del canje</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f59e0b' }}>{puntosActuales - showModal.puntos}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(null)}>✅ Confirmar Canje</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
