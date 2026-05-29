import { useNavigate, useLocation } from 'react-router-dom'

const USER_NAV = [
  { icon: '🏠', label: 'Inicio', path: '/app/inicio' },
  { icon: '⭐', label: 'Recompensas', path: '/app/recompensas' },
  { icon: '👤', label: 'Mi Perfil', path: '/app/perfil' },
]

const ADMIN_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: '🏟️', label: 'Mis Canchas', path: '/admin/canchas' },
  { icon: '📅', label: 'Reservas', path: '/admin/reservas' },
  { icon: '🏆', label: 'Torneos', path: '/admin/torneos' },
  { icon: '🏃', label: 'Entrenamientos', path: '/admin/entrenamientos' },
  { icon: '⭐', label: 'Recompensas', path: '/admin/recompensas' },
  { icon: '👤', label: 'Entrenadores', path: '/admin/empleados' },
]

const SUPERADMIN_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/superadmin/dashboard' },
  { icon: '🏢', label: 'Empresas', path: '/superadmin/empresas' },
  { icon: '👥', label: 'Usuarios', path: '/superadmin/usuarios' },
]

export default function Layout({ children, role = 'user' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = role === 'superadmin' ? SUPERADMIN_NAV : role === 'admin' ? ADMIN_NAV : USER_NAV
  const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin Empresa' : 'Jugador'
  const roleColor = role === 'superadmin' ? '#f59e0b' : role === 'admin' ? '#00BCD4' : '#22c55e'

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          SPORT<span>IKA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="points-badge">
            ⭐ 75 pts
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>Juan García</div>
              <div style={{ fontSize: '0.72rem', color: roleColor, fontWeight: 600 }}>{roleLabel}</div>
            </div>
            <div className="avatar" style={{ background: '#8B0000' }}>JG</div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-section">Menú</div>
        {navItems.map(item => (
          <div
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />
        <div className="divider" />
        <div className="sidebar-item" onClick={() => navigate('/')}>
          <span>🚪</span>
          <span>Cerrar Sesión</span>
        </div>
      </aside>

      {/* Main */}
      <main className="main-with-sidebar">
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  )
}
