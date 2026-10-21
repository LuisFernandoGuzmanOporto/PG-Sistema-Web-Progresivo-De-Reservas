import { useState } from 'react'
import { digitosDe, esCorreo, esTelefono, tieneNombreYApellido } from '../../lib/validaciones'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import Confirmar from '../../components/Confirmar'
import { ENTRENADORES, entrenadoresDeEmpresa, entrenamientosDe, SESION,
} from '../../lib/datos'
import { guardarEntrenador, borrarEntrenador, registrarEnBitacora } from '../../lib/guardar'

const DEPORTES = ['Fútbol', 'Wally', 'Básquetbol', 'Voleibol', 'Pádel', 'Tenis', 'Otro']


// Cada entrenador muestra los entrenamientos que dicta de verdad,
// tomados del horario publicado en Gestion de Entrenamientos.
const conEntrenamientos = (lista) => lista.map(e => ({
  ...e, entrenamientos: entrenamientosDe(e).map(t => t.nombre),
}))

const FORM_INIT = {
  nombre: '', email: '', telefono: '',
  deporte: 'Fútbol', especialidad: '',
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
  const [entrenadores, setEntrenadores] = useState(conEntrenamientos(entrenadoresDeEmpresa(SESION.empresaId)))

  // Los cambios se guardan en la lista compartida
  const publicar = (lista) => {
    const otras = ENTRENADORES.filter(e => e.empresa_id !== SESION.empresaId)
    ENTRENADORES.length = 0
    ENTRENADORES.push(...otras, ...lista.map(({ entrenamientos, ...e }) => e))
    setEntrenadores(conEntrenamientos(lista))
  }
  const [modal, setModal] = useState(null) // null | 'nuevo' | { ...entrenador }
  const [form, setForm] = useState(FORM_INIT)
  const [busqueda, setBusqueda] = useState('')

  const filtrados = entrenadores.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.deporte.toLowerCase().includes(busqueda.toLowerCase())
  )

  function abrirNuevo() {
    setForm(FORM_INIT)
    setIntento(false); setModal('nuevo')
  }

  function abrirEditar(ent) {
    setForm({
      nombre: ent.nombre, email: ent.email, telefono: ent.telefono,
      deporte: ent.deporte, especialidad: ent.especialidad,
    })
    setIntento(false)
    setModal(ent)
  }

  const [errorGuardar, setErrorGuardar] = useState(null)

  // Antes el boton simplemente no hacia nada si faltaba el nombre o el correo,
  // sin decir cual de los dos.
  const [intento, setIntento] = useState(false)
  const errores = {}
  {
    const digitos = digitosDe(form.telefono)
    if (!form.nombre.trim()) errores.nombre = 'Escribe el nombre y apellido del entrenador.'
    else if (!tieneNombreYApellido(form.nombre)) errores.nombre = 'Falta el apellido: escribe nombre y apellido.'
    if (!form.email.trim()) errores.email = 'Escribe el correo del entrenador.'
    else if (!esCorreo(form.email))
      errores.email = 'El correo no es válido: debe tener @ y un dominio, por ejemplo mario@gmail.com.'
    if (form.telefono.trim() && !esTelefono(form.telefono))
      errores.telefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}). Déjalo vacío si no lo sabes.`
  }
  const ORDEN = ['nombre', 'email', 'telefono']
  const faltaEnEntrenador = intento ? ORDEN.filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] })) : []
  const pc = (c) => propsCampo(c, errores[c], intento)
  const mc = (c) => <MensajeCampo nombre={c} error={errores[c]} mostrar={intento} />

  async function guardar() {
    setIntento(true)
    if (Object.keys(errores).length) { irAlPrimerError(errores, ORDEN); return }

    const enEdicion = modal !== 'nuevo' ? modal : null
    const g = await guardarEntrenador({
      id: enEdicion?.id, empresaId: SESION.empresaId,
      nombre: form.nombre.trim(), deporte: form.deporte,
      especialidad: form.especialidad, correo: form.email.trim(), telefono: form.telefono,
    })
    if (g.error) { setErrorGuardar(g.error); return }

    if (!enEdicion) {
      const nuevo = { id: g.entrenador.id, ...form, entrenamientos: [], activo: true }
      publicar([...entrenadores, { ...nuevo, empresa_id: SESION.empresaId }])
    } else {
      publicar(entrenadores.map(e => e.id === enEdicion.id ? { ...e, ...form } : e))
    }
    registrarEnBitacora({
      tipo: 'entrenador',
      accion: enEdicion ? 'Editó un entrenador' : 'Registró un entrenador',
      detalle: form.nombre.trim() + ' · ' + form.deporte,
    })
    setErrorGuardar(null)
    setModal(null)
  }

  /** Lo que falla desde la lista, fuera del modal, se avisa igual. */
  const avisarFuera = (msg) => { setErrorGuardar(msg); setTimeout(() => setErrorGuardar(null), 5000) }

  async function toggleActivo(id) {
    const e = entrenadores.find(x => x.id === id)
    const g = await guardarEntrenador({
      id, empresaId: SESION.empresaId, nombre: e.nombre, deporte: e.deporte,
      especialidad: e.especialidad, correo: e.email, telefono: e.telefono,
      activo: !e.activo,
    })
    if (g.error) { avisarFuera(g.error); return }
    publicar(entrenadores.map(x => x.id === id ? { ...x, activo: !x.activo } : x))
  }

  // Se pregunta con un modal de la aplicacion y no con window.confirm: ese
  // aparece con la direccion del sitio arriba y parece un aviso del navegador.
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando]   = useState(false)

  async function eliminar() {
    const e = porEliminar
    if (!e) return
    setEliminando(true)
    const g = await borrarEntrenador(e.id)
    setEliminando(false)
    setPorEliminar(null)
    if (g.error) { avisarFuera(g.error); return }
    publicar(entrenadores.filter(x => x.id !== e.id))
    registrarEnBitacora({ tipo: 'entrenador', accion: 'Eliminó un entrenador', detalle: e?.nombre || '' })
  }

  return (
    <Layout role="admin">
    {/* Sin relleno propio: el que pone Layout ya alcanza (con los dos, en el
        celular quedaba la mitad del ancho y los nombres salían cortados) */}
    <div style={{ color: '#fff', maxWidth: 1100 }}>
      {/* Header: el mismo título y el mismo botón que las demás páginas */}
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏃 Gestión de Entrenadores</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Administra los entrenadores de tu empresa</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Agregar Entrenador</button>
      </div>

      {/* Lo que falla desde la lista (activar, dar de baja, eliminar) pasa con
          el modal cerrado, asi que el aviso tiene que verse aca */}
      {errorGuardar && !modal && (
        <div style={{ padding:'12px 14px', marginBottom:'1rem', borderRadius:10,
          background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)' }}>
          <p style={{ color:'#ef4444', fontSize:'0.82rem', fontWeight:600, margin:0 }}>
            {errorGuardar}
          </p>
        </div>
      )}

      {/* Info banner */}
      <div style={{
        background:'rgba(255,193,7,0.12)', border:'1px solid rgba(255,193,7,0.3)',
        borderRadius:8, padding:'0.75rem 1rem', marginBottom:'1.5rem',
        color:'#ffc107', fontSize:'0.88rem'
      }}>
        Los entrenadores son asignados a los entrenamientos al crearlos o editarlos.
        Aquí puedes registrar su perfil y gestionarlos.
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
            background:'#1a1a1a', borderRadius:10, padding:'0.8rem 0.9rem',
            borderLeft:`4px solid ${s.color}`, flex:'1 1 90px', maxWidth:180
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
                <div style={{ fontWeight:700, fontSize:'1.05rem' }}>
                  {ent.nombre}
                </div>
                <div style={{ color:'#aaa', fontSize:'0.82rem', overflowWrap:'anywhere' }}>
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
                  style={{ width:'100%', boxSizing:'border-box' }} {...pc('nombre')} />
                {mc('nombre')}
              </div>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Correo electrónico *</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => setForm(p=>({...p, email: e.target.value}))}
                  placeholder="Ej: mario@gmail.com"
                  style={{ width:'100%', boxSizing:'border-box' }} {...pc('email')} />
                {mc('email')}
              </div>
              <div>
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Teléfono</label>
                <input className="input" value={form.telefono}
                  onChange={e => setForm(p=>({...p, telefono: e.target.value}))}
                  placeholder="Ej: 70012345" inputMode="tel"
                  style={{ width:'100%', boxSizing:'border-box' }} {...pc('telefono')} />
                {mc('telefono')}
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
                <label style={{ color:'#aaa', fontSize:'0.85rem', display:'block', marginBottom:4 }}>Especialidad / descripción</label>
                <input className="input" value={form.especialidad}
                  onChange={e => setForm(p=>({...p, especialidad: e.target.value}))}
                  placeholder="Ej: Futbol infantil y juvenil"
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
            </div>

            <div style={{ marginTop:'1.5rem' }}>
              <AvisoFaltantes faltantes={faltaEnEntrenador} error={errorGuardar} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setModal(null); setErrorGuardar(null) }} style={{
                flex:1, padding:'0.7rem', borderRadius:8, border:'1px solid #444',
                background:'transparent', color:'#aaa', cursor:'pointer', fontWeight:600
              }}>Cancelar</button>
              <button onClick={guardar} style={{
                flex:2, padding:'0.7rem', borderRadius:8, border:'none',
                background: '#e53935', color: '#fff', cursor: 'pointer',
                fontWeight:700, fontSize:'1rem'
              }}>
                {modal === 'nuevo' ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Confirmar
        abierto={Boolean(porEliminar)}
        titulo={'¿Eliminar a ' + (porEliminar?.nombre || '') + '?'}
        detalle="Se va a borrar de tu lista. Los entrenamientos que tenga a cargo quedan sin entrenador, así que revísalos después."
        textoSi="Sí, eliminar"
        trabajando={eliminando}
        onSi={eliminar}
        onNo={() => setPorEliminar(null)} />
    </div>
    </Layout>
  )
}
