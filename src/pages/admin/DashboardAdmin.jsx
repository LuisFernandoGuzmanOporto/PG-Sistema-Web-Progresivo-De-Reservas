import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const STATS = [
  { label: 'Reservas Hoy', value: '12', change: '+3 vs ayer', up: true, icon: '📅' },
  { label: 'Ingresos del Mes', value: 'Bs. 3,240', change: '+18% vs mes anterior', up: true, icon: '💰' },
  { label: 'Canchas Activas', value: '5', change: '2 ocupadas ahora', up: null, icon: '🏟️' },
  { label: 'Pagos Pendientes', value: '4', change: 'Requieren validación', up: false, icon: '⏳' },
]

const RESERVAS_HOY = [
  { usuario: 'Carlos M.', cancha: 'Cancha Fútbol Principal', hora: '09:00-10:00', monto: 120, estado: 'confirmada' },
  { usuario: 'Ana L.', cancha: 'Cancha de Wally 2', hora: '10:00-11:00', monto: 60, estado: 'pendiente' },
  { usuario: 'Pedro R.', cancha: 'Cancha de Baloncesto', hora: '11:00-12:00', monto: 80, estado: 'pendiente' },
  { usuario: 'María S.', cancha: 'Cancha Fútbol Principal', hora: '14:00-15:00', monto: 120, estado: 'confirmada' },
  { usuario: 'Luis G.', cancha: 'Cancha de Wally 1', hora: '15:00-16:00', monto: 60, estado: 'pendiente' },
]

export default function DashboardAdmin() {
  const navigate = useNavigate()

  return (
    <Layout role="admin">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>📊 Dashboard</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Sport Center — Panel de Administración</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.up === true ? 'stat-up' : s.up === false ? 'stat-down' : ''}`} style={s.up === null ? { color: '#666' } : {}}>
              {s.up === true ? '↑' : s.up === false ? '↓' : '•'} {s.change}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Reservas del día */}
        <div className="card" style={{ padding: 20 }}>
          <div className="section-header">
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>📅 Reservas de Hoy</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/reservas')}>Ver todas</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Cancha</th>
                  <th>Hora</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {RESERVAS_HOY.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: '#f5f5f5', fontWeight: 500 }}>{r.usuario}</td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.cancha}</td>
                    <td style={{ color: '#00BCD4', fontSize: '0.85rem' }}>{r.hora}</td>
                    <td style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>Bs. {r.monto}</td>
                    <td><span className={`badge ${r.estado === 'confirmada' ? 'badge-success' : 'badge-warning'}`}>{r.estado}</span></td>
                    <td>
                      {r.estado === 'pendiente' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6 }}>✓</button>
                          <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>⚡ Acciones Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '+ Nueva Cancha', path: '/admin/canchas', color: '#8B0000' },
                { label: '+ Agregar Entrenador', path: '/admin/empleados', color: '#00BCD4' },
                { label: '🏆 Crear Torneo', path: '/admin/torneos', color: '#f59e0b' },
                { label: '💳 Subir QR de Pago', path: '/admin/canchas', color: '#22c55e' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} className="btn btn-outline" style={{ justifyContent: 'flex-start', borderColor: item.color + '33', color: '#ccc', fontSize: '0.85rem' }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(0,188,212,0.08) 0%, rgba(0,0,0,0) 100%)' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>📈 Resumen Mensual</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Total Reservas', '48'], ['Ingresos', 'Bs. 3,240'], ['Torneos Activos', '2'], ['Entrenadores', '3']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.82rem', color: '#666' }}>{k}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5f5' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
