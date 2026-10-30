// ─────────────────────────────────────────────────────────────────────────────
// Pestaña de la ficha de un torneo.
//
// Ficha del torneo: formato, fechas, premios y reglas. Es lo primero que
// ve alguien que llega desde un enlace compartido y todavia no sabe de que
// se trata.
//
// Sale de TorneoDetalle, que tenia 1.250 lineas con seis pestañas de
// espectador mas cuatro del organizador metidas en el mismo archivo.
// ─────────────────────────────────────────────────────────────────────────────

import { conTildes } from '../../../lib/fecha'

export default function TabInfo({ torneoData }) {
  return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>○ Reglas del Torneo</h3>

          {/* Sin esto la tarjeta quedaba vacia y parecia rota. No todos los
              torneos cargan reglas, y eso tambien hay que decirlo. */}
          {torneoData.reglas.length === 0 && (
            <p style={{ fontSize: '0.83rem', color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
              El organizador no cargó reglas particulares. Se juega con las
              reglas habituales del deporte.
            </p>
          )}

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {torneoData.reglas.map((r, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B0000', flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: '0.83rem', color: '#bbb', lineHeight: 1.5 }}>{r}</span>
              </li>
            ))}
          </ul>

          {/* Cuando se juega. Se guarda al crear el torneo y hasta ahora no se
              mostraba en ningun lado, aunque es de lo primero que pregunta el
              que se quiere inscribir. */}
          {torneoData.horarios && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #222' }}>
              <p style={{ fontSize: '0.78rem', color: '#00BCD4', fontWeight: 600, marginBottom: 4 }}>🗓️ Se juega</p>
              <p style={{ fontSize: '0.85rem', color: '#bbb' }}>{conTildes(torneoData.horarios)}</p>
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>👥 Composición</h3>
          <p style={{ fontSize: '0.88rem', color: '#bbb', marginBottom: 10 }}>{torneoData.jugadoresPorEquipo} titulares + {torneoData.suplentes} suplentes</p>
          <p style={{ fontSize: '0.8rem', color: '#00BCD4', fontWeight: 600, marginBottom: 4 }}>Formato</p>
          <p style={{ fontSize: '0.85rem', color: '#bbb', marginBottom: 14 }}>{torneoData.formato}</p>
          <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, marginBottom: 10 }}>
            <p style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>🏅 Premios</p>
            <p style={{ fontSize: '0.78rem', color: '#ccc' }}>🥇 {torneoData.premios.primero}</p>
            {torneoData.premios.segundo && <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>🥈 {torneoData.premios.segundo}</p>}
            {torneoData.premios.tercero && <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>🥉 {torneoData.premios.tercero}</p>}
          </div>
          <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, marginBottom: 2 }}>⏰ Inscripciones hasta</p>
            <p style={{ fontSize: '0.92rem', color: '#ef4444', fontWeight: 700 }}>{torneoData.inscripcionHasta}</p>
          </div>
        </div>
      </div>
  )
}
