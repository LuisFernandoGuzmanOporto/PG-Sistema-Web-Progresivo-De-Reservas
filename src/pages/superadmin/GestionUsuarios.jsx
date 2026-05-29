import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const USUARIOS = [
  { nombre: 'Carlos Mendoza', email: 'carlos@email.com', rol: 'jugador', puntos: 120, reservas: 8, estado: 'activo', fecha: '10 Ene' },
  { nombre: 'Ana López', email: 'ana@email.com', rol: 'jugador', puntos: 85, reservas: 5, estado: 'activo', fecha: '12 Ene' },
  { nombre: 'Pedro García', email: 'pedro@email.com', rol: 'admin_empresa', puntos: 0, reservas: 0, estado: 'activo', fecha: '15 Ene' },
  { nombre: 'María Torres', email: 'maria@email.com', rol: 'admin_empresa', puntos: 0, reservas: 0, estado: 'activo', fecha: '20 Ene' },
  { nombre: 'Juan Quispe', email: 'juan@email.com', rol: 'jugador', puntos: 45, reservas: 3, estado: 'activo', fecha: '25 Ene' },
  { nombre: 'Roberto Silva', email: 'roberto@email.com', rol: 'empleado', puntos: 0, reservas: 34, estado: 'activo', fecha: '26 Ene' },
]

const ROL_COLORS = {
  jugador: { bg: 'rgba(0,188,212,0.1)', color: '#00BCD4' },
  admin_empresa: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  empleado: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  super_admin: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
}

export default function GestionUsuarios() {
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const usuariosFiltrados = USUARIOS
    .filter(u => filtro === 'todos' || u.rol === filtro)
    .filter(u => u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Layout role="superadmin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>👥 Gestión de Usuarios</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Todos los usuarios registrados en Sportika</p>
        </div>
        <span className="badge badge-accent">534 usuarios totales</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input" placeholder="🔍 Buscar por nombre o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['todos', 'jugador', 'admin_empresa', 'empleado'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filtro === f ? '#8B0000' : '#2a2a2a',
              background: filtro === f ? 'rgba(139,0,0,0.2)' : 'transparent',
              color: filtro === f ? '#ff6b6b' : '#666',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
              transition: 'all 0.2s'
            }}>{f === 'admin_empresa' ? 'Admin' : f}</button>
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
                const rolStyle = ROL_COLORS[u.rol] || ROL_COLORS.jugador
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{u.nombre[0]}</div>
                        <div>
                          <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{u.nombre}</p>
                          <p style={{ color: '#555', fontSize: '0.75rem' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: rolStyle.bg, color: rolStyle.color }}>{u.rol}</span></td>
                    <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>⭐ {u.puntos}</span></td>
                    <td style={{ color: '#ccc' }}>{u.reservas}</td>
                    <td><span className="badge badge-success">{u.estado}</span></td>
                    <td style={{ color: '#666', fontSize: '0.82rem' }}>{u.fecha}</td>
                    <td>
                      <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.78rem' }}>Suspender</button>
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
