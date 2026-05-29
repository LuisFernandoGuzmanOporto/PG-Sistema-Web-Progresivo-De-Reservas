// GestionEmpresas.jsx
import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const EMPRESAS = [
  { nombre: 'Sport Center', admin: 'Pedro García', canchas: 5, estado: 'activo', usuarios: 124, fecha: '15 Ene 2025' },
  { nombre: 'Complejo Deportivo Norte', admin: 'María Torres', canchas: 3, estado: 'activo', usuarios: 89, fecha: '20 Ene 2025' },
  { nombre: 'Complejo Deportivo Este', admin: 'Luis Quispe', canchas: 4, estado: 'activo', usuarios: 76, fecha: '25 Ene 2025' },
  { nombre: 'Wally Zone', admin: 'Carlos Rios', canchas: 4, estado: 'pendiente', usuarios: 0, fecha: '1 Feb 2025' },
  { nombre: 'Gimnasio Central', admin: 'Ana Morales', canchas: 2, estado: 'pendiente', usuarios: 0, fecha: '3 Feb 2025' },
  { nombre: 'Pistas Tennis Club', admin: 'Roberto Silva', canchas: 6, estado: 'suspendido', usuarios: 45, fecha: '10 Ene 2025' },
]

export function GestionEmpresas() {
  const [filtro, setFiltro] = useState('todos')

  const empresasFiltradas = filtro === 'todos' ? EMPRESAS : EMPRESAS.filter(e => e.estado === filtro)

  return (
    <Layout role="superadmin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏢 Gestión de Empresas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Administra todos los complejos deportivos de Sportika</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-warning">3 pendientes</span>
          <span className="badge badge-success">9 activas</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['todos', 'activo', 'pendiente', 'suspendido'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '6px 16px', borderRadius: 20, border: '1px solid',
            borderColor: filtro === f ? '#8B0000' : '#2a2a2a',
            background: filtro === f ? 'rgba(139,0,0,0.2)' : 'transparent',
            color: filtro === f ? '#ff6b6b' : '#666',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
            textTransform: 'capitalize', transition: 'all 0.2s'
          }}>{f}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Empresa</th><th>Administrador</th><th>Canchas</th><th>Usuarios</th><th>Fecha Registro</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {empresasFiltradas.map((e, i) => (
                <tr key={i}>
                  <td style={{ color: '#f5f5f5', fontWeight: 600 }}>{e.nombre}</td>
                  <td style={{ color: '#888' }}>{e.admin}</td>
                  <td style={{ color: '#00BCD4', fontWeight: 700 }}>{e.canchas}</td>
                  <td style={{ color: '#ccc' }}>{e.usuarios}</td>
                  <td style={{ color: '#666', fontSize: '0.82rem' }}>{e.fecha}</td>
                  <td><span className={`badge ${e.estado === 'activo' ? 'badge-success' : e.estado === 'pendiente' ? 'badge-warning' : 'badge-error'}`}>{e.estado}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {e.estado === 'pendiente' && <>
                        <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit' }}>✓</button>
                        <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit' }}>✕</button>
                      </>}
                      {e.estado === 'activo' && (
                        <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.78rem' }}>Suspender</button>
                      )}
                      <button className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.78rem' }}>Ver</button>
                    </div>
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

export default GestionEmpresas
