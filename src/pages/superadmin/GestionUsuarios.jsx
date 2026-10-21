import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import { todosLosUsuarios, ROL_USUARIO } from '../../lib/datos'
import { cambiarEstadoUsuario } from '../../lib/guardar'
import Avatar from '../../components/Avatar'


// El rol se muestra con el mismo nombre en todo el sistema
const ROL_LABEL = {
  todos: 'Todos', cliente: 'Cliente', admin_empresa: 'Admin Empresa',
  empleado: 'Empleado', superadmin: 'Super Admin',
}

const ROL_COLORS = {
  cliente: { bg: 'rgba(0,188,212,0.1)', color: '#00BCD4' },
  admin_empresa: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  empleado: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  superadmin: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
}

export default function GestionUsuarios() {
  // Se arma dentro del componente, no al importar el archivo: los datos llegan
  // de Supabase despues de iniciar sesion, y una constante de modulo se
  // quedaria con la lista vacia del arranque.
  const [usuarios, setUsuarios] = useState(todosLosUsuarios)
  const [filtro, setFiltro] = useState('todos')

  // Suspender corta el acceso; reactivar lo devuelve. El historial se conserva.
  const [aviso, setAviso] = useState(null)


  /** Suspender deja al usuario sin poder entrar; su historial se conserva. */
  const alternarEstado = async (u) => {
    const activo = u.estado === 'suspendido'          // si estaba suspendido, se reactiva
    const g = await cambiarEstadoUsuario(u.id, activo)
    if (g.error) {
      setAviso('No se guardó el cambio. ' + g.error)
      setTimeout(() => setAviso(null), 4000)
      return
    }
    setUsuarios(prev => prev.map(x =>
      x.id === u.id ? { ...x, estado: activo ? 'activo' : 'suspendido' } : x))
  }
  const [busqueda, setBusqueda] = useState('')

  const usuariosFiltrados = usuarios
    .filter(u => filtro === 'todos' || u.rol === filtro)
    .filter(u => u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Layout role="superadmin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>👥 Gestión de Usuarios</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Todos los usuarios registrados en Sportika</p>
        </div>
        <span className="badge badge-accent">{usuarios.length} usuarios totales</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input" placeholder="🔍 Buscar por nombre o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['todos', 'cliente', 'admin_empresa', 'empleado'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filtro === f ? '#8B0000' : '#2a2a2a',
              background: filtro === f ? 'rgba(139,0,0,0.2)' : 'transparent',
              color: filtro === f ? '#ff6b6b' : '#666',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
              transition: 'all 0.2s'
            }}>{ROL_LABEL[f] || f}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Puntos</th><th>Reservas</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u, i) => {
                const rolStyle = ROL_COLORS[u.rol] || ROL_COLORS.cliente
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar className="avatar" nombre={u.nombre} foto={u.foto} tam={36} />
                        <div>
                          <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{u.nombre}</p>
                          <p style={{ color: '#555', fontSize: '0.75rem' }}>
                            {u.email}{u.empresa ? ' · ' + u.empresa : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: rolStyle.bg, color: rolStyle.color }}>{ROL_LABEL[u.rol] || u.rol}</span></td>
                    <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>⭐ {u.puntos}</span></td>
                    <td style={{ color: '#ccc' }}>{u.reservas}</td>
                    <td>
                      <span className="badge" style={{
                        background: u.estado === 'activo' ? 'rgba(34,197,94,0.12)'
                                  : u.estado === 'pendiente' ? 'rgba(245,158,11,0.12)'
                                  : 'rgba(239,68,68,0.12)',
                        color: u.estado === 'activo' ? '#22c55e'
                             : u.estado === 'pendiente' ? '#f59e0b' : '#ef4444',
                      }}>{u.estado}</span>
                    </td>
                    <td style={{ color: '#666', fontSize: '0.82rem' }}>{u.alta}</td>
                    <td>
                      <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.78rem' }}
                        onClick={() => alternarEstado(u)}>
                        {u.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
