import { useState } from 'react'
import Layout from '../../components/layout/Layout'

export default function GestionTorneos() {
  const [showModal, setShowModal] = useState(false)

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏆 Gestión de Torneos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Crea y administra torneos deportivos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Crear Torneo</button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">🏆</div>
        <h3>No tienes torneos aún</h3>
        <p>Crea tu primer torneo y empieza a recibir inscripciones</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>+ Crear Torneo</button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Crear Torneo</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">Nombre del torneo</label><input className="input" placeholder="Ej: Copa Sportika 2025" /></div>
              <div className="form-group"><label className="form-label">Deporte</label>
                <select className="input"><option>Fútbol</option><option>Wally</option><option>Básquetbol</option><option>Voleibol</option></select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Fecha inicio</label><input className="input" type="date" /></div>
                <div className="form-group"><label className="form-label">Fecha fin</label><input className="input" type="date" /></div>
                <div className="form-group"><label className="form-label">Límite inscripciones</label><input className="input" type="date" /></div>
                <div className="form-group"><label className="form-label">Máx. equipos</label><input className="input" type="number" placeholder="8" /></div>
                <div className="form-group"><label className="form-label">Jugadores por equipo</label><input className="input" type="number" placeholder="5" /></div>
                <div className="form-group"><label className="form-label">Precio inscripción (Bs.)</label><input className="input" type="number" placeholder="200" /></div>
              </div>
              <div className="form-group"><label className="form-label">Descripción</label><textarea className="input" rows={3} style={{ resize: 'none' }} /></div>
              <div className="form-group">
                <label className="form-label">🔲 Código QR de Pago de Inscripción</label>
                <div style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ color: '#555', fontSize: '0.85rem' }}>Sube el QR para recibir pagos de inscripción</p>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Subir QR</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>Crear Torneo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
