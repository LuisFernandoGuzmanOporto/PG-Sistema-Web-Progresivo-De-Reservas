import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { identidadDeRol } from '../../lib/datos'
import { useAuth } from '../../lib/auth'
import Notificaciones from '../Notificaciones'
import Avatar from '../Avatar'

const USER_NAV = [
  { icon: '🏠', label: 'Inicio',          path: '/app/dashboard'       },
  { icon: '🏟️', label: 'Complejos',    path: '/app/inicio'          },
  { icon: '🏆', label: 'Torneos',         path: '/app/torneos'         },
  { icon: '⚽', label: 'Partidos',        path: '/app/partidos'        },
  { icon: '🏃', label: 'Entrenamientos',  path: '/app/entrenamientos'  },
  { icon: '⭐', label: 'Recompensas',     path: '/app/recompensas'     },
  { icon: '👤', label: 'Mi Perfil',       path: '/app/perfil'          },
]

const ADMIN_NAV = [
  { icon: '📊', label: 'Dashboard',      path: '/admin/dashboard'      },
  { icon: '🏟️', label: 'Mis Canchas',   path: '/admin/canchas'        },
  { icon: '📅', label: 'Reservas',       path: '/admin/reservas'       },
  { icon: '🏆', label: 'Torneos',        path: '/admin/torneos'        },
  { icon: '🏃', label: 'Entrenamientos', path: '/admin/entrenamientos' },
  { icon: '⭐', label: 'Recompensas',    path: '/admin/recompensas'     },
  { icon: '🏋️', label: 'Entrenadores',   path: '/admin/entrenadores'   },
  { icon: '🧑‍💼', label: 'Empleados',     path: '/admin/empleados'      },
  { icon: '★',  label: 'Calificaciones', path: '/admin/calificaciones'  },
  { icon: '👤', label: 'Mi cuenta',      path: '/mi-cuenta'            },
]

const EMPLEADO_NAV = [
  { icon: '📋', label: 'Mi Panel',  path: '/empleado/panel' },
  { icon: '👤', label: 'Mi cuenta', path: '/mi-cuenta'      },
]

const SUPERADMIN_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/superadmin/dashboard' },
  { icon: '🏢', label: 'Empresas',  path: '/superadmin/empresas'  },
  { icon: '👥', label: 'Usuarios',  path: '/superadmin/usuarios'  },
  { icon: '👤', label: 'Mi cuenta', path: '/mi-cuenta'            },
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

  const navItems  = role === 'superadmin' ? SUPERADMIN_NAV
                  : role === 'admin'      ? ADMIN_NAV
                  : role === 'empleado'   ? EMPLEADO_NAV
                  : USER_NAV
  const roleLabel = role === 'superadmin' ? 'Super Admin'
                  : role === 'admin'      ? 'Admin Empresa'
                  : role === 'empleado'   ? 'Empleado'
                  : 'Cliente'
  const { perfil, salir, errorDatos, sinConexion, reintentar } = useAuth()

  // Quien inicio sesion. Si todavia no hay perfil cargado se muestra el de
  // demostracion, para que la pantalla no quede en blanco un instante.
  const quien = perfil
    ? { nombre: perfil.nombre,
        detalle: perfil.rol === 'cliente' ? perfil.puntos + ' pts' : (perfil.empresaNombre || '') }
    : identidadDeRol(role)
  const roleColor = role === 'superadmin' ? '#f59e0b'
                  : role === 'admin'      ? '#00BCD4'
                  : role === 'empleado'   ? '#8b5cf6'
                  : '#22c55e'

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
            aria-label="Abrir o cerrar el menú"
          >
            <span style={{ display: 'block', width: 16, height: 2, background: '#aaa', borderRadius: 2, transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: 16, height: 2, background: '#aaa', borderRadius: 2, transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: 16, height: 2, background: '#aaa', borderRadius: 2, transition: 'all 0.2s' }} />
          </button>

          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            SPORT<span>IKA</span>
          </div>
        </div>

        <div className="navbar-derecha" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Los puntos son cosa del cliente; los demas roles no acumulan */}
          {/* Los puntos son del cliente. El administrador que abre la mesa técnica
              (una pantalla de cliente) veía aquí «⭐ Sport Center», y en el celular
              la barra no le entraba */}
          {role === 'user' && (!perfil || perfil.rol === 'cliente') && <div className="points-badge">⭐ {quien.detalle}</div>}

          {/* La campana va para todos: al cliente le avisa que le confirmaron
              la reserva, al complejo que le entro una */}
          <Notificaciones />
          {/* Tocar el nombre lleva a la cuenta: es donde la gente busca sus
              datos, sin tener que encontrarlo en el menu lateral */}
          <button
            onClick={() => navigate(role === 'user' ? '/app/perfil' : '/mi-cuenta')}
            title="Ver mi cuenta"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'transparent', border: '1px solid transparent',
              borderRadius: 10, padding: '4px 6px', cursor: 'pointer',
              fontFamily: 'Outfit', transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = '#333'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            {/* En el celular se esconde (queda la inicial): el nombre completo
                no entra al lado de los puntos y la campana */}
            <div className="navbar-quien" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5', whiteSpace: 'nowrap',
                maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{quien.nombre}</div>
              <div style={{ fontSize: '0.72rem', color: roleColor, fontWeight: 600 }}>
                {roleLabel}{role !== 'user' && quien.detalle ? ' · ' + quien.detalle : ''}
              </div>
            </div>
            <Avatar className="avatar" nombre={quien.nombre} foto={perfil?.avatar_url} tam={36} />
          </button>
        </div>
      </nav>

      {/* ── Si los datos no se pudieron traer ──
          Sin esto la aplicación mostraba listas vacías: el complejo veía
          «no hay reservas» cuando en realidad no había podido conectarse,
          y creía que se le habían borrado. */}
      {(errorDatos || sinConexion) && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 60,
          background: 'rgba(139,0,0,0.95)', borderBottom: '1px solid rgba(255,255,255,0.15)',
          padding: '10px 16px', display: 'flex', gap: 12,
          alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ color: '#fff', fontSize: '0.83rem', fontWeight: 600 }}>
            {sinConexion ? '📡 Sin conexión a internet' : '⚠️ No se pudo actualizar la información'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem' }}>
            {sinConexion
              ? 'Tu sesión sigue abierta. Algunos datos pueden no estar disponibles; se actualizarán solos al volver la conexión.'
              : errorDatos + ' Es posible que algunos datos no estén al día.'}
          </span>
          <button onClick={reintentar}
            style={{ padding: '5px 14px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.76rem',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff' }}>
            Reintentar
          </button>
        </div>
      )}

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
          onClick={async () => { await salir(); navigate('/login', { replace: true }) }}
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
        {/* En el celular el margen baja a 16 px (ver globals.css) */}
        <div className="contenido-pagina" style={{ padding: 32 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
