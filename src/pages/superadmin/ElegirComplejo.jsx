import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { useAuth } from '../../lib/auth'
import { canchasDeEmpresa, reservasDeEmpresa, empleadosDeEmpresa, promedioEstrellas,
         calificacionesDeEmpresa } from '../../lib/datos'
import { complejosOrdenados, Titulo, Vacio } from './comun'

const COLOR_ESTADO = {
  activo: '#22c55e', pendiente: '#f59e0b', suspendido: '#ef4444', rechazado: '#666',
}

/**
 * «Ver un complejo»: el Super Admin elige uno y entra a sus pantallas, las
 * mismas que ve su administrador, en solo lectura.
 */
export default function ElegirComplejo() {
  const navigate = useNavigate()
  const { verComplejo, complejoVisto } = useAuth()
  const [busqueda, setBusqueda] = useState('')

  const lista = complejosOrdenados()
    .filter(e => (e.nombre + ' ' + (e.zona || '')).toLowerCase().includes(busqueda.toLowerCase()))

  const entrar = (id) => {
    verComplejo(id)
    navigate('/admin/dashboard')
  }

  return (
    <Layout role="superadmin">
      <Titulo icono="🔎" texto="Ver un complejo"
        sub="Elige un complejo para ver todo lo que ve su administrador: canchas, reservas, torneos, empleados y más. Es solo lectura: no se puede cambiar nada." />

      <input className="input" placeholder="🔍 Buscar por nombre o zona..." value={busqueda}
        onChange={e => setBusqueda(e.target.value)} style={{ marginBottom: 20, maxWidth: 420 }} />

      {lista.length === 0 ? (
        <div className="card"><Vacio texto="No hay complejos con ese nombre" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {lista.map(e => {
            const cals = calificacionesDeEmpresa(e.id)
            const elegido = complejoVisto && String(complejoVisto) === String(e.id)
            return (
              <button key={e.id} onClick={() => entrar(e.id)} className="card"
                style={{
                  padding: 18, textAlign: 'left', cursor: 'pointer', fontFamily: 'Outfit',
                  border: '1px solid ' + (elegido ? '#f59e0b' : '#2a2a2a'), background: '#1a1a1a',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.6rem' }}>{e.emoji}</span>
                  <span className="badge" style={{ color: COLOR_ESTADO[e.estado] || '#888', background: 'rgba(255,255,255,0.05)' }}>
                    {e.estado}
                  </span>
                </div>
                <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.98rem' }}>{e.nombre}</p>
                <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 10 }}>{e.zona || 'Sin zona'} · {e.admin}</p>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.76rem', color: '#888' }}>
                  <span>🏟️ {canchasDeEmpresa(e.id).length} canchas</span>
                  <span>📅 {reservasDeEmpresa(e.id).filter(r => r.origen !== 'torneo').length} reservas</span>
                  <span>🧑‍💼 {empleadosDeEmpresa(e.id).length} empleados</span>
                  <span>★ {cals.length ? promedioEstrellas(cals) : '—'}</span>
                </div>
                {elegido && <p style={{ color: '#f59e0b', fontSize: '0.74rem', marginTop: 10, fontWeight: 600 }}>Es el que estás viendo</p>}
              </button>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
