import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const DEPORTES = ['Futbol','Basquet','Voleibol','Tenis','Natacion','Atletismo','Artes Marciales','Otro']

const MOCK_ENTRENADORES = [
  {
    id: 1, nombre: 'Mario Quispe', email: 'mario@email.com', telefono: '76543210',
    deporte: 'Futbol', especialidad: 'Futbol infantil y juvenil',
    entrenamientos: ['Escuela de Futbol Infantil', 'Futbol Avanzado Mañana'],
    activo: true,
  },
  {
    id: 2, nombre: 'Carmen Lopez', email: 'carmen@email.com', telefono: '77891234',
    deporte: 'Basquet', especialidad: 'Basquet competitivo',
    entrenamientos: ['Basquet Intermedio'],
    activo: true,
  },
  {
    id: 3, nombre: 'Diego Arias', email: 'diego@email.com', telefono: '71234567',
    deporte: 'Voleibol', especialidad: 'Voleibol recreativo',
    entrenamientos: [],
    activo: false,
  },
]

const FORM_INIT = {
  nombre: '', email: '', telefono: '',
  deporte: 'Futbol', especialidad: '',
}

function Initials({ nombre }) {
  const parts = nombre.trim().split(' ')
  const ini = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : (parts[0][0] || '?')
  return ini.toUpperCase()
}

const COLORES = ['#e53935','#8e24aa','#1e88e5','#00897b','#f4511e','#6d4c41']
function colorFor(id) { return COLORES[id % COLORES.length] }

export default function GestionEntrenadores() {
  const [entrenadores, setEntrenadores] = useState(MOCK_ENTRENADORES)
  const [modal, setModal] = useState(null) // null | 'nuevo' | { ...entrenador }
  const [form, setForm] = useState(FORM_INIT)
  const [busqueda, setBusqueda] = useState('')

  const filtrados = entrenadores.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.deporte.toLowerCase().includes(busqueda.toLowerCase())
  )

  function abrirNuevo() {
    setForm(FORM_INIT)
    setModal('nuevo')
  }

  function abrirEditar(ent) {
    setForm({
      nombre: ent.nombre, email: ent.email, telefono: ent.telefono,
      deporte: ent.deporte, especialidad: ent.especialidad,
    })
    setModal(ent)
  }

  function guardar() {
    if (!form.nombre.trim() || !form.email.trim()) return
    if (modal === 'nuevo') {
      const nuevo = { id: Date.now(), ...form, entrenamientos: [], activo: true }
      setEntrenadores(prev => [...prev, nuevo])
    } else {
      setEntrenadores(prev => prev.map(e => e.id === modal.id ? { ...e, ...form } : e))
    }
    setModal(null)
  }

  function toggleActivo(id) {
    setEntrenadores(prev => prev.map(e => e.id === id ? { ...e, activo: !e.activo } : e))
  }

  function eliminar(id) {
    if (window.confirm('Seguro que deseas eliminar este entrenador?')) {
      setEntrenadores(prev => prev.filter(e => e.id !== id))
    }
  }

  return (
    <Layout role="admin">
    <div style={{ padding: '2rem', color: '#fff', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: '1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.8rem', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'2rem' }}>🏃</span> GESTION DE ENTRENADORES
          </h1>
          <p style={{ margin:'4px 0 0', color:'#aaa', fontSize:'0.9rem' }}>
            Administra los entrenadores de tu empresa
          </p>
        </div>
        <button onClick={abrirNuevo} style={{
          background:'#e53935', color:'#fff', border:'none', borderRadius:8,
          padding:'0.7rem 1.4rem', fontWeight:700, fontSize:'1rem', cursor:'pointer'
        }}>
          + Agregar Entrenador
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background:'rgba(255,193,7,0.12)', border:'1px solid rgba(255,193,7,0.3)',
        borderRadius:8, padding:'0.75rem 1rem', marginBottom:'1.5rem',
        color:'#ffc107', fontSize:'0.88rem'
      }}>
        Los entrenadores son asignados a los entrenamientos al crearlos o editarlos.
        Aqui puedes registrar su perfil y gestionarlos.
      </div>

      {/* Busqueda */}
      <input
        placeholder="Buscar por nombre o deporte..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{
          width:'100%', maxWidth:380, padding:'0.6rem 1rem', borderRadius:8,
          border:'1px solid #333', background:'#1a1a1a', color:'#fff',
          fontSize:'0.95rem', marginBottom:'1.5rem', boxSizing:'border-box'
        }}
      />

      {/* Stats */}
      <div style={{ display:'flex', gap:'1rem', marginBottom:'2rem', flexWrap:'wrap' }}>
        {[
          { label:'Total', value: entrenadores.length, color:'#1e88e5' },
          { label:'Activos', value: entrenadores.filter(e=>e.activo).length, color:'#43a047' },
          { label:'Inactivos', value: entrenadores.filter(e=>!e.activo).length, color:'#888' },
        ].map(s => (
          <div key={s.label} style={{
            background:'#1a1a1a', borderRadius:10, padding:'0.9rem 1.5rem',
            borderLeft:`4px solid ${s.color}`, minWidth:120
          }}>
            <div style={{ fontSize:'1.6rem', fontWeight:700, color: s.color }}>{s.value}</div>
            <div style={{ color:'#aaa', fontSize:'0.85rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.25rem' }}>
        {filtrados.map(ent => (
          <div key={ent.id} style={{
            background:'#1a1a1a', borderRadius:14, padding:'1.25rem',
            border: ent.activo ? '1px solid #2a2a2a' : '1px solid #333',
            opacity: ent.activo ? 1 : 0.7,
          }}>
            {/* Avatar + nombre */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:'0.9rem' }}>
              <div style={{
                width:54, height:54, borderRadius:'50%',
                background: colorFor(ent.id),
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:'1.2rem', flexShrink:0
              }}>
                <Initials nombre={ent.nombre} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'1.05rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {ent.nombre}
                </div>
                <div style={{ color:'#aaa', fontSize:'0.82rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {ent.email}
                </div>
              </div>
              <span style={{
                background: ent.activo ? 'rgba(67,160,71,0.18)' : 'rgba(150,150,150,0.18)',
                color: ent.activo ? '#43a047' : '#888',
                borderRadius:20, padding:'2px 10px', fontSize:'0.78rem', fontWeight:600,
                whiteSpace:'nowrap'
              }}>
                {ent.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {/* Info */}
            <div style={{ fontSize:'0.87rem', color:'#bbb', marginBottom:'0.4rem' }}>
              📞 {ent.telefono}
            </div>
            <div style={{ fontSize:'0.87rem', color:'#bbb', marginBottom:'0.4rem' }}>
              ⚽ <strong style={{color:'#fff'}}>{ent.deporte}</strong>
              {ent.especialidad && <span style={{color:'#888'}}> · {ent.especialidad}</span>}
            </div>
            {ent.entrenamientos.length > 0 && (
              <div style={{ fontSize:'0.83rem', color:'#888', marginBottom:'0.75rem' }}>
                📋 {ent.entrenamientos.length} entrenamiento{ent.entrenamientos.length > 1 ? 's' : ''} asignado{ent.entrenamientos.length > 1 ? 's' : ''}
              </div>
            )}
            {ent.entrenamientos.length === 0 && (
              <div style={{ fontSize:'0.83rem', color:'#555', marginBottom:'0.75rem' }}>
                Sin entrenamientos asignados
              </div>
            )}

            {/* Entrenamientos chips */}
            {ent.entrenamientos.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:'0.9rem' }}>
                {ent.entrenamientos.map(t => (
                  <span key={t} style={{
                    background:'rgba(229,57,53,0.15)', color:'#ef9a9a',
                    borderRadius:20, padding:'2px 10px', fontSize:'0.75rem'
                  }}>{t}</span>
                ))}
              </div>
            )}

            {/* Acciones */}
            <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
              <button onClick={() => abrirEditar(ent)} style={{
                flex:1, padding:'0.5rem', borderRadius:7, border:'1px solid #444',
                background:'transparent', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:'0.88rem'
              }}>Editar</button>
              <button onClick={() => toggleActivo(ent.id)} style={{
                flex:1, padding:'0.5rem', borderRadius:7, border:'none',
                background: ent.activo ? 'rgba(229,57,53,0.12)' : 'rgba(67,160,71,0.12)',
                color: ent.activo ? '#ef5350' : '#43a047',
                cursor:'pointer', fontWeight:600, fontSize:'0.88rem'
              }}>
                {ent.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => eliminar(ent.id)} style={{
                padding:'0.5rem 0.7rem', borderRadius:7, border:'1px solid #333',
                background:'transparent', color:'#555', cursor:'pointer', fontSize:'0.88rem'
              }}>🗑</button>
            </div>
          </div>
        ))}

        {filtrados.length === 0 && (
          <div style={{ color:'#555', gridColumn:'1/-1', textAlign:'center', padding:'3rem' }}>
            No se encontraron entrenadores
          </div>
        )}
      </div>

      {/* Modal nuevo / editar */}
      {modal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem'
        }}>
          <div style={{
            background:'#1a1a1a', borderRadius:14, padding:'2rem',
            width:'100%', maxWidth:480, border:'1px solid #333'
          }}>
            <h2 style={{ margin:'0 0 1.5rem', fontSize:'1.2rem' }}>
              {modal === 'nuevo' ? 'Agregar Entrenador' : 'Editar Entrenador'}
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Nombre completo *</label>
                <input className="input" value={form.nombre}
                  onChange={e => setForm(p=>({...p, nombre: e.target.value}))}
                  placeholder="Ej: Mario Quispe"
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Correo electronico *</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => setForm(p=>({...p, email: e.target.value}))}
                  placeholder="correo@email.com"
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Telefono</label>
                <input className="input" value={form.telefono}
                  onChange={e => setForm(p=>({...p, telefono: e.target.value}))}
                  placeholder="7XXXXXXX"
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Deporte principal</label>
                <select className="input" value={form.deporte}
                  onChange={e => setForm(p=>({...p, deporte: e.target.value}))}
                  style={{ width:'100%', boxSizing:'border-box', background:'#111' }}>
                  {DEPORTES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Especialidad / descripcion</label>
                <input className="input" value={form.especialidad}
                  onChange={e => setForm(p=>({...p, especialidad: e.target.value}))}
                  placeholder="Ej: Futbol infantil y juvenil"
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:'1.75rem' }}>
              <button onClick={() => setModal(null)} style={{
                flex:1, padding:'0.7rem', borderRadius:8, border:'1px solid #444',
                background:'transparent', color:'#aaa', cursor:'pointer', fontWeight:600
              }}>Cancelar</button>
              <button onClick={guardar} style={{
                flex:2, padding:'0.7rem', borderRadius:8, border:'none',
                background:'#e53935', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:'1rem'
              }}>
                {modal === 'nuevo' ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  )
}
