// DashboardSuperAdmin.jsx
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const STATS = [
  { label: 'Empresas Activas', value: '12', change: '+2 este mes', up: true, icon: '🏢' },
  { label: 'Usuarios Totales', value: '534', change: '+48 esta semana', up: true, icon: '👥' },
  { label: 'Reservas Totales', value: '1,248', change: '+124 este mes', up: true, icon: '📅' },
  { label: 'Empresas Pendientes', value: '3', change: 'Requieren aprobación', up: false, icon: '⏳' },
]

const EMPRESAS_RECIENTES = [
  { nombre: 'Sport Center', admin: 'Pedro García', canchas: 5, estado: 'activo', fecha: '15 Ene' },
  { nombre: 'Complejo Deportivo Norte', admin: 'María Torres', canchas: 3, estado: 'activo', fecha: '20 Ene' },
  { nombre: 'Wally Zone', admin: 'Carlos Rios', canchas: 4, estado: 'pendiente', fecha: '1 Feb' },
  { nombre: 'Gimnasio Central', admin: 'Ana Morales', canchas: 2, estado: 'pendiente', fecha: '3 Feb' },
]

export default function DashboardSuperAdmin() {
  const navigate = useNavigate()

  return (
    <Layout role="superadmin">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>📊 Super Admin Dashboard</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Panel de control global — Sportika Cochabamba</p>
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
            <div className={`stat-change ${s.up ? 'stat-up' : 'stat-down'}`}>
              {s.up ? '↑' : '↓'} {s.change}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Empresas */}
        <div className="card" style={{ padding: 20 }}>
          <div className="section-header">
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>🏢 Empresas Recientes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/superadmin/empresas')}>Ver todas</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Empresa</th><th>Administrador</th><th>Canchas</th><th>Estado</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {EMPRESAS_RECIENTES.map((e, i) => (
                  <tr key={i}>
                    <td style={{ color: '#f5f5f5', fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{e.admin}</td>
                    <td style={{ color: '#00BCD4' }}>{e.canchas}</td>
                    <td><span className={`badge ${e.estado === 'activo' ? 'badge-success' : 'badge-warning'}`}>{e.estado}</span></td>
                    <td>
                      {e.estado === 'pendiente' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6 }}>✓ Aprobar</button>
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

        {/* Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>🌐 Resumen Global</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Ingresos Globales (mes)', 'Bs. 24,840'],
                ['Reservas confirmadas', '1,124'],
                ['Torneos activos', '8'],
                ['Partidos jugados', '234'],
                ['Puntos otorgados', '12,450'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.82rem', color: '#666' }}>{k}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5f5' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, transparent 100%)' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>⚡ Acciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '🏢 Ver Empresas', path: '/superadmin/empresas' },
                { label: '👥 Ver Usuarios', path: '/superadmin/usuarios' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
