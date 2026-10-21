// ─────────────────────────────────────────────────────────────────────────────
// Pestaña de la ficha de un torneo.
//
// Los partidos que se estan jugando ahora, para el que esta en la tribuna.
//
// Sale de TorneoDetalle, que tenia 1.250 lineas con seis pestañas de
// espectador mas cuatro del organizador metidas en el mismo archivo.
// ─────────────────────────────────────────────────────────────────────────────

import EventosPartido from './EventosPartido'
import { presentacionDeporte } from '../../../lib/torneo'

export default function TabEnVivo({ torneoData, navigate }) {
  const pres = presentacionDeporte(torneoData.deporte)
  return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5' }}>🔴 Partidos en Vivo</h3>
          <button className="btn btn-primary" onClick={() => navigate(`/app/torneos/${torneoData.id}/en-vivo`)}>Ver pantalla completa →</button>
        </div>
        {torneoData.partidos.filter(p => p.estado === 'en_vivo').length === 0 ? (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <div className="empty-state-icon">⏰</div>
            <h3>Sin partidos en vivo ahora</h3>
            <p>Los partidos aparecerán aquí cuando comiencen</p>
          </div>
        ) : (
          torneoData.partidos.filter(p => p.estado === 'en_vivo').map(p => (
            <div key={p.id} className="card" style={{ padding: 20, marginBottom: 12, background: 'linear-gradient(135deg,rgba(139,0,0,0.18) 0%,#1a1a1a 60%)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                  🔴 EN VIVO{pres.tieneMinuto && p.minuto != null ? ` • ${p.minuto}'` : ''}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#555' }}>📍 {p.cancha}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo1}</p>
                <p style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: '#f5f5f5', lineHeight: 1 }}>{p.g1} - {p.g2}</p>
                <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo2}</p>
              </div>
              <EventosPartido partido={p} deporte={torneoData.deporte} />
            </div>
          ))
        )}
        {/* Próximos partidos */}
        {torneoData.partidos.filter(p => p.estado === 'programado').length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ color: '#666', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Próximos partidos</h4>
            {torneoData.partidos.filter(p => p.estado === 'programado').map(p => (
              <div key={p.id} className="card" style={{ padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#f5f5f5' }}>{p.equipo1} vs {p.equipo2}</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.78rem', color: '#888' }}>🕐 {p.hora}</p>
                  <p style={{ fontSize: '0.72rem', color: '#555' }}>📍 {p.cancha}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
