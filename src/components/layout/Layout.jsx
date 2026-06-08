import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const USER_NAV = [
  { icon: '🏠', label: 'Inicio',       path: '/app/inicio'      },
  { icon: '⭐', label: 'Recompensas',  path: '/app/recompensas' },
  { icon: '👤', label: 'Mi Perfil',    path: '/app/perfil'      },
]

const ADMIN_NAV = [
  { icon: '📊', label: 'Dashboard',      path: '/admin/dashboard'      },
  { icon: '🏟️', label: 'Mis Canchas',   path: '/admin/canchas'        },
  { icon: '📅', label: 'Reservas',       path: '/admin/reservas'       },
  { icon: '🏆', label: 'Torneos',        path: '/admin/torneos'        },
  { icon: '🏃', label: 'Entrenamientos', path: '/admin/entrenamientos' },
  { icon: '⭐', label: 'Recompensas',    path: '/admin/recompensas'     },
  { icon: '👤', label: 'Entrenadores',   path: '/admin/empleados'       },
  { icon: '★',  label: 'Calificaciones', path: '/admin/calificaciones'  },
]

const SUPERADMIN_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/superadmin/dashboard' },
  { icon: '🏢', label: 'Empresas',  path: '/superadmin/empresas'  },
  { icon: '👥', label: 'Usuarios',  path: '/superadmin/usuarios'  },
]

// Detecta si es móvil al montar
const isMobile = () => window.innerWidth < 768

export default function Layout({ children, role = 'user' }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  // En móvil empieza cerrado, en desktop empieza abierto
  const [open, setOpen] = useState(!isMobile())
  // Sidebar colapsado a solo íconos (solo desktop)
  const [collapsed, setCollapsed] = useState(false)

  const navItems  = role === 'superadmin' ? SUPERADMIN_NAV : role === 'admin' ? ADMIN_NAV : USER_NAV
  const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin Empresa' : 'Cliente'
  const roleColor = role === 'superadmin' ? '#f59e0b' : role === 'admin' ? '#00BCD4' : '#22c55e'

  // Actualiza estado al redimensionar
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        // Al volver a desktop, abrir si estaba cerrado por móvil
      } else {
        setOpen(false)
        setCollapsed(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Cierra sidebar en móvil al navegar
  const handleNav = (path) => {
    navigate(path)
    if (isMobile()) setOpen(false)
  }

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Botón hamburguesa / colapso */}
          <button
            onClick={() => {
              if (isMobile()) {
                setOpen(o => !o)
              } else {
                setCollapsed(c => !c)
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #333',
              borderRadius: 8,
              width: 36, height: 36,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 5, cursor: 'pointer', padding: 0,
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            aria-label="Toggle menú"
          >
            <span style={{ display: 'block', width: 16, height: 2, background: '#aaa', borderRadius: 2, transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: 16, height: 2, background: '#aaa', borderRadius: 2, transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: 16, height: 2, background: '#aaa', borderRadius: 2, transition: 'all 0.2s' }} />
          </button>

          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            SPORT<span>IKA</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="points-badge">⭐ 75 pts</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>Juan García</div>
              <div style={{ fontSize: '0.72rem', color: roleColor, fontWeight: 600 }}>{roleLabel}</div>
            </div>
            <div className="avatar" style={{ background: '#8B0000' }}>JG</div>
          </div>
        </div>
      </nav>

      {/* ── Backdrop móvil ── */}
      {open && isMobile() && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            top: 64,
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 64,
          bottom: 0,
          width: sidebarWidth,
          background: '#1a1a1a',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 50,
          padding: collapsed ? '20px 8px' : '20px 12px',
          transition: 'width 0.25s ease, transform 0.25s ease, padding 0.25s ease',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Label "Menú" — solo cuando expandido */}
        {!collapsed && (
          <div className="sidebar-section">Menú</div>
        )}

        {navItems.map(item => (
          <div
            key={item.path}
            onClick={() => handleNav(item.path)}
            title={collapsed ? item.label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px' : '10px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontWeight: 500,
              fontSize: '0.9rem',
              color: location.pathname === item.path ? '#ff6b6b' : '#999',
              background: location.pathname === item.path ? 'rgba(139,0,0,0.2)' : 'transparent',
              borderLeft: !collapsed && location.pathname === item.path ? '3px solid #8B0000' : !collapsed ? '3px solid transparent' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              if (location.pathname !== item.path) {
                e.currentTarget.style.background = '#2a2a2a'
                e.currentTarget.style.color = '#f5f5f5'
              }
            }}
            onMouseLeave={e => {
              if (location.pathname !== item.path) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#999'
              }
            }}
          >
            <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </div>
        ))}

        <div style={{ flex: 1 }} />
        <div style={{ height: 1, background: '#333', margin: '8px 0' }} />

        {/* Cerrar sesión */}
        <div
          onClick={() => navigate('/')}
          title={collapsed ? 'Cerrar Sesión' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px' : '10px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            color: '#666',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.color = '#f5f5f5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666' }}
        >
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🚪</span>
          {!collapsed && <span>Cerrar Sesión</span>}
        </div>

        {/* Botón colapsar (solo desktop) — flecha al fondo */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: isMobile() ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            color: '#555',
            cursor: 'pointer',
            fontSize: '0.75rem',
            gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <span style={{ fontSize: '1rem', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', display: 'inline-block' }}>◀</span>
          {!collapsed && <span>Colapsar menú</span>}
        </button>
      </aside>

      {/* ── Contenido principal ── */}
      <main
        style={{
          marginLeft: open && !isMobile() ? sidebarWidth : 0,
          paddingTop: 64,
          minHeight: '100vh',
          transition: 'margin-left 0.25s ease',
        }}
      >
        <div style={{ padding: 32 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
