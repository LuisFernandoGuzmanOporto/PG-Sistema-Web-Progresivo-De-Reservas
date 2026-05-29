// GestionCanchas.jsx
import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const CANCHAS = [
  { id: 1, nombre: 'Cancha Fútbol Principal', deporte: '⚽ Fútbol', precio: 120, estado: true, reservasHoy: 4 },
  { id: 2, nombre: 'Cancha de Wally 1', deporte: '🎾 Wally', precio: 60, estado: true, reservasHoy: 2 },
  { id: 3, nombre: 'Cancha de Wally 2', deporte: '🎾 Wally', precio: 60, estado: true, reservasHoy: 3 },
  { id: 4, nombre: 'Cancha de Baloncesto', deporte: '🏀 Básquetbol', precio: 80, estado: false, reservasHoy: 0 },
  { id: 5, nombre: 'Cancha de Voleibol', deporte: '🏐 Voleibol', precio: 70, estado: true, reservasHoy: 1 },
]

export function GestionCanchas() {
  const [showModal, setShowModal] = useState(false)

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏟️ Mis Canchas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Gestiona tus canchas deportivas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nueva Cancha</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {CANCHAS.map(c => (
          <div key={c.id} className="card" style={{ padding: 20 }}>
            <div className="cancha-img" style={{ height: 120, marginBottom: 16, borderRadius: 10 }}>
              <span style={{ fontSize: '2.5rem' }}>{c.deporte.split(' ')[0]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f5f5f5' }}>{c.nombre}</h3>
              <span className={`badge ${c.estado ? 'badge-success' : 'badge-error'}`}>{c.estado ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.82rem', color: '#666' }}>{c.deporte}</span>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f59e0b' }}>Bs. {c.precio}/hr</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#00BCD4', marginBottom: 12 }}>📅 {c.reservasHoy} reservas hoy</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }}>Editar</button>
              <button className="btn btn-sm w-full" style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                {c.estado ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}

        {/* Add cancha card */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, cursor: 'pointer', border: '2px dashed #2a2a2a' }} onClick={() => setShowModal(true)}>
          <span style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>+</span>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>Agregar Cancha</p>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Cancha</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">Nombre de la cancha</label><input className="input" placeholder="Ej: Cancha Fútbol Principal" /></div>
              <div className="form-group"><label className="form-label">Deporte</label>
                <select className="input"><option>Fútbol</option><option>Wally</option><option>Básquetbol</option><option>Voleibol</option><option>Tenis</option><option>Pádel</option></select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Precio por hora (Bs.)</label><input className="input" type="number" placeholder="120" /></div>
                <div className="form-group"><label className="form-label">Capacidad</label><input className="input" type="number" placeholder="10" /></div>
                <div className="form-group"><label className="form-label">Apertura</label><input className="input" type="time" defaultValue="07:00" /></div>
                <div className="form-group"><label className="form-label">Cierre</label><input className="input" type="time" defaultValue="22:00" /></div>
              </div>
              <div className="form-group"><label className="form-label">Descripción</label><textarea className="input" rows={3} style={{ resize: 'none' }} /></div>
              <div className="form-group">
                <label className="form-label">🔲 Código QR de Pago</label>
                <div style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ color: '#555', fontSize: '0.85rem' }}>Sube el QR de tu cuenta bancaria</p>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Subir imagen QR</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>Guardar Cancha</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default GestionCanchas
