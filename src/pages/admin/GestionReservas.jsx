// GestionReservas.jsx
import Layout from '../../components/layout/Layout'

const RESERVAS = [
  { usuario: 'Carlos M.', cancha: 'Cancha Fútbol Principal', fecha: 'Hoy', hora: '09:00-10:00', monto: 120, estado: 'confirmada', comprobante: true },
  { usuario: 'Ana L.', cancha: 'Cancha de Wally 2', fecha: 'Hoy', hora: '10:00-11:00', monto: 60, estado: 'pendiente', comprobante: true },
  { usuario: 'Pedro R.', cancha: 'Cancha de Baloncesto', fecha: 'Hoy', hora: '11:00-12:00', monto: 80, estado: 'pendiente', comprobante: false },
  { usuario: 'María S.', cancha: 'Cancha Fútbol Principal', fecha: 'Mañana', hora: '14:00-15:00', monto: 120, estado: 'confirmada', comprobante: true },
  { usuario: 'Luis G.', cancha: 'Cancha de Wally 1', fecha: 'Mañana', hora: '15:00-16:00', monto: 60, estado: 'pendiente', comprobante: true },
]

export function GestionReservas() {
  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>📅 Gestión de Reservas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Valida y gestiona las reservas de tus canchas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-warning">4 pendientes</span>
          <span className="badge badge-success">8 confirmadas</span>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Cancha</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Monto</th>
                <th>Comprobante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {RESERVAS.map((r, i) => (
                <tr key={i}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="avatar">{r.usuario[0]}</div><span style={{ color: '#f5f5f5', fontWeight: 500 }}>{r.usuario}</span></div></td>
                  <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.cancha}</td>
                  <td style={{ color: '#ccc' }}>{r.fecha}</td>
                  <td style={{ color: '#00BCD4' }}>{r.hora}</td>
                  <td style={{ color: '#f59e0b', fontFamily: 'Bebas Neue' }}>Bs. {r.monto}</td>
                  <td>
                    {r.comprobante
                      ? <button className="btn btn-sm" style={{ padding: '4px 12px', background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.78rem' }}>Ver QR</button>
                      : <span style={{ color: '#555', fontSize: '0.78rem' }}>Sin comprobante</span>
                    }
                  </td>
                  <td><span className={`badge ${r.estado === 'confirmada' ? 'badge-success' : 'badge-warning'}`}>{r.estado}</span></td>
                  <td>
                    {r.estado === 'pendiente' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ padding: '5px 12px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.8rem' }}>✓ Aprobar</button>
                        <button className="btn btn-sm" style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.8rem' }}>✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

export default GestionReservas
