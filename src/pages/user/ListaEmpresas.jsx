import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { canchasDeEmpresa, torneosDeEmpresa, entrenamientosDeEmpresa, USUARIO_ACTUAL, empresasConCanchas } from '../../lib/datos'
import { urlPublica } from '../../lib/archivos'
import { primeroMiDeporte, esMiDeporte } from '../../lib/preferencias'

// Los complejos y sus contadores salen de la fuente unica (src/lib/datos.js):
// canchas, torneos y entrenamientos se cuentan, no se escriben a mano.
const listaEmpresas = () => empresasConCanchas().map(e => ({
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

/**
 * La portada de la tarjeta. Siempre mide lo mismo (160 px de alto), haya foto
 * o no, así ninguna tarjeta se descuadra:
 *  · con foto: la foto llena todo el recuadro y se recorta al centro
 *    (object-fit: cover), sea vertical, horizontal o chica;
 *  · sin foto: el emoji grande del deporte sobre su color.
 * El logo NO va aquí: el logo se ve al entrar al complejo; en la lista va la
 * foto del complejo (pedido de Fernando, noviembre 2026).
 * Si la foto no carga (se borró del depósito), se cae al respaldo.
 */
function Portada({ empresa }) {
  const [fallo, setFallo] = useState(false)
  const foto = !fallo && urlPublica(empresa.foto)
  const color = DEPORTE_COLORES[empresa.deportes?.[0]]?.color || '#8B0000'

  return (
    <div style={{
      height: 160, flexShrink: 0, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 40%, ${color}33 0%, #1f1f1f 70%)`,
      borderBottom: '1px solid #2a2a2a',
    }}>
      {foto ? (
        <img src={foto} alt={'Foto de ' + empresa.nombre} loading="lazy" onError={() => setFallo(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: '4.6rem', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}>{empresa.emoji}</span>
      )}

      {/* Horario: solo si el complejo lo cargó */}
      {empresa.horario && (
        <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.7)',
          padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', color: '#00BCD4', fontWeight: 600 }}>
          🕐 {empresa.horario}
        </div>
      )}
    </div>
  )
}

/**
 * La descripción en la tarjeta: tres líneas como máximo, y «Ver más» solo si
 * de verdad se cortó (se mide, no se adivina por la cantidad de letras).
 */
function Descripcion({ texto, onVerMas }) {
  const ref = useRef(null)
  const [cortada, setCortada] = useState(false)

  useLayoutEffect(() => {
    const medir = () => {
      const el = ref.current
      if (el) setCortada(el.scrollHeight > el.clientHeight + 1)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [texto])

  return (
    <div style={{ marginBottom: 12 }}>
      <p ref={ref} className="texto-cortado"
        style={{ fontSize: '0.8rem', color: texto ? '#888' : '#555', fontStyle: texto ? 'normal' : 'italic',
          lineHeight: 1.5, WebkitLineClamp: 3, minHeight: '4.5em' }}>
        {texto || 'Este complejo todavía no escribió una descripción.'}
      </p>
      {/* El espacio del enlace se reserva siempre: con o sin «Ver más», la
          tarjeta mide lo mismo */}
      <button type="button" onClick={e => { e.stopPropagation(); onVerMas() }}
        tabIndex={cortada ? 0 : -1} aria-hidden={!cortada}
        style={{ visibility: cortada ? 'visible' : 'hidden', background: 'none', border: 'none', padding: 0,
          marginTop: 2, color: '#00BCD4', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }}>
        Ver más →
      </button>
    </div>
  )
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
              className="card tarjeta-complejo"
              style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => navigate(`/app/empresa/${empresa.id}`)}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Portada: el mismo alto en todas las tarjetas */}
              <Portada empresa={empresa} />

              <div className="card-body tarjeta-complejo-cuerpo">
                {/* Nombre, zona y dirección. Cada dato ocupa siempre el mismo
                    alto: un nombre o una dirección largos se cortan con «…»
                    (el texto entero queda al pasar el mouse y en la ficha) */}
                <h3 className="texto-cortado" title={empresa.nombre}
                  style={{ fontSize: '1rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 2, WebkitLineClamp: 1 }}>
                  {empresa.nombre}
                </h3>
                <p className="dato-etiqueta" style={{ marginBottom: 8 }}>{empresa.zona || 'Sin zona'}</p>

                <p className="dato-etiqueta">📍 Dirección</p>
                <p className="texto-cortado" title={empresa.direccion}
                  style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.45, WebkitLineClamp: 2, minHeight: '2.9em', marginBottom: 8 }}>
                  {empresa.direccion || 'No indicó su dirección'}
                </p>

                {/* Descripción: siempre tres líneas de alto. Si es más larga se
                    corta con «…» y «Ver más» lleva a la ficha, donde está
                    entera. No se despliega aquí: la tarjeta crecería y se
                    descuadraría la fila (pedido del docente, noviembre 2026). */}
                <p className="dato-etiqueta">Descripción</p>
                <Descripcion texto={empresa.descripcion}
                  onVerMas={() => navigate(`/app/empresa/${empresa.id}`)} />

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

                {/* Stats rápidas y botón: empujados al fondo de la tarjeta, así
                    los botones de toda la fila quedan a la misma altura */}
                <div style={{ marginTop: 'auto' }}>
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
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
