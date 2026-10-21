import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { empresasActivas, canchasDeEmpresa, torneosDeEmpresa,
         entrenamientosDeEmpresa, USUARIO_ACTUAL } from '../../lib/datos'
import { urlPublica } from '../../lib/archivos'
import { primeroMiDeporte, esMiDeporte } from '../../lib/preferencias'

// Los complejos y sus contadores salen de la fuente unica (src/lib/datos.js):
// canchas, torneos y entrenamientos se cuentan, no se escriben a mano.
const listaEmpresas = () => empresasActivas().map(e => ({
  ...e,
  totalCanchas:   canchasDeEmpresa(e.id).length,
  torneos:        torneosDeEmpresa(e.id).length,
  entrenamientos: entrenamientosDeEmpresa(e.id).length,
}))

const DEPORTE_COLORES = {
  'Fútbol':     { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  'Básquetbol': { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  'Voleibol':   { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6' },
  'Wally':      { bg: 'rgba(0,188,212,0.12)',   color: '#00BCD4' },
  'Pádel':      { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  'Tenis':      { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
  'Futsal':     { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1' },
}

export default function ListaEmpresas() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroDeporte, setFiltroDeporte] = useState('todos')

  const EMPRESAS = listaEmpresas()
  const deportesUnicos = ['todos', ...new Set(EMPRESAS.flatMap(e => e.deportes))]

  // Los que ofrecen su deporte favorito van primero, sin esconder los demás
  const FAV = USUARIO_ACTUAL.deporteFav || null
  const empresasFiltradas = primeroMiDeporte(EMPRESAS, FAV, e => e.deportes).filter(e => {
    const coincideBusqueda = e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.zona.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.deportes.some(d => d.toLowerCase().includes(busqueda.toLowerCase()))
    const coincideDeporte = filtroDeporte === 'todos' || e.deportes.includes(filtroDeporte)
    return coincideBusqueda && coincideDeporte
  })

  return (
    <Layout role="user">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 4 }}>
          🏟️ Complejos Deportivos
        </h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>
          Selecciona un complejo para ver sus canchas, torneos, entrenamientos y partidos
        </p>
      </div>

      {/* Búsqueda + Filtros */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ maxWidth: 280, marginBottom: 0 }}
          placeholder="🔍 Buscar por nombre o zona..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {deportesUnicos.map(d => (
            <button
              key={d}
              onClick={() => setFiltroDeporte(d)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filtroDeporte === d ? '#8B0000' : '#2a2a2a',
                background: filtroDeporte === d ? 'rgba(139,0,0,0.2)' : 'transparent',
                color: filtroDeporte === d ? '#ff6b6b' : '#666',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Outfit',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {d === 'todos' ? 'Todos' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de empresas */}
      {empresasFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No se encontraron complejos</h3>
          <p>Intenta con otro deporte o nombre</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {empresasFiltradas.map(empresa => (
            <div
              key={empresa.id}
              className="card"
              style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => navigate(`/app/empresa/${empresa.id}`)}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Banner / imagen */}
              <div style={{
                height: 130,
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Si el complejo subio su foto se usa esa; el emoji del
                    deporte queda de respaldo para los que todavia no */}
                {empresa.foto
                  ? <img src={urlPublica(empresa.foto)} alt={empresa.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '4rem' }}>{empresa.emoji}</span>}
                {/* Badge horario: solo si el complejo cargó su horario */}
                {empresa.horario && <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 10,
                  background: 'rgba(0,0,0,0.7)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  color: '#00BCD4',
                  fontWeight: 600,
                }}>
                  🕐 {empresa.horario}
                </div>}
              </div>

              <div className="card-body">
                {/* Nombre + zona */}
                <div style={{ marginBottom: 8 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 3 }}>
                    {empresa.nombre}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#666' }}>
                    📍 {empresa.zona} — {empresa.direccion}
                  </p>
                </div>

                {/* Descripción */}
                <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5, marginBottom: 12 }}>
                  {empresa.descripcion}
                </p>

                {/* Chips de deportes */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {empresa.deportes.map(d => (
                    <span
                      key={d}
                      title={esMiDeporte(d, FAV) ? 'Tu deporte favorito' : undefined}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        outline: esMiDeporte(d, FAV) ? '1px solid #00BCD4' : 'none',
                        background: DEPORTE_COLORES[d]?.bg || 'rgba(255,255,255,0.06)',
                        color: DEPORTE_COLORES[d]?.color || '#888',
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Stats rápidas */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 14, padding: '10px 0', borderTop: '1px solid #2a2a2a' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#00BCD4' }}>{empresa.totalCanchas}</p>
                    <p style={{ fontSize: '0.68rem', color: '#555' }}>Canchas</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f59e0b' }}>{empresa.torneos}</p>
                    <p style={{ fontSize: '0.68rem', color: '#555' }}>Torneos</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#22c55e' }}>{empresa.entrenamientos}</p>
                    <p style={{ fontSize: '0.68rem', color: '#555' }}>Entrenos</p>
                  </div>
                </div>

                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                  onClick={e => { e.stopPropagation(); navigate(`/app/empresa/${empresa.id}`) }}
                >
                  Ver Complejo →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
