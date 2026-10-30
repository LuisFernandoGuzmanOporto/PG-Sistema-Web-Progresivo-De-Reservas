import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import { entrenadoresDeEmpresa, canchasDeEmpresa, ENTRENAMIENTOS_POR_EMPRESA, entrenamientosDeEmpresa, SESION,
} from '../../lib/datos'
import { guardarEntrenamiento as guardarEnBase, borrarEntrenamiento, registrarEnBitacora } from '../../lib/guardar'

const DEPORTE_COLORES = {
  Futbol: '#ef4444', 'Futbol 5': '#ef4444', Wally: '#00BCD4',
  Basquetbol: '#f59e0b', Voleibol: '#22c55e', Padel: '#8b5cf6',
  'Fútbol': '#ef4444', 'Básquetbol': '#f59e0b', 'Pádel': '#8b5cf6',
}
const DIAS_SEMANA = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom']
const DIA_INDICE  = { Dom: 0, Lun: 1, Mar: 2, Mie: 3, Jue: 4, Vie: 5, Sab: 6 }
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatHorario(e) {
  if (!e.dias || e.dias.length === 0) return '-'
  return e.dias.join(', ') + '  ' + (e.horaInicio || '') + ' - ' + (e.horaFin || '')
}

const iconDeporte = (d) => {
  const map = {
    'Futbol': '⚽', 'Futbol 5': '⚽', 'Wally': '🎾',
    'Basquetbol': '🏀', 'Voleibol': '🏐', 'Padel': '🏸',
    'Fútbol': '⚽', 'Básquetbol': '🏀', 'Pádel': '🏸',
  }
  return map[d] || '🏃'
}

// Construye la grilla del mes marcando los dias que tocan entrenamiento.
// La semana arranca en Lunes.
function generarMes(anio, mes, dias) {
  const primero   = new Date(anio, mes, 1)
  const totalDias = new Date(anio, mes + 1, 0).getDate()
  const offset    = (primero.getDay() + 6) % 7
  const indices   = (dias || []).map(d => DIA_INDICE[d])
  const celdas    = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= totalDias; d++) {
    celdas.push({ dia: d, hay: indices.includes(new Date(anio, mes, d).getDay()) })
  }
  return celdas
}

const FORM_INIT = {
  deporte: 'Fútbol', nivel: 'Principiante', nombre: '', entrenador: '',
  cancha: '', dias: [], horaInicio: '08:00', horaFin: '10:00',
  precio: '', cupo: '', paraNinos: false, edadMin: '', edadMax: '',
  descripcion: '',
}


export default function GestionEntrenamientos() {
  const hoy = new Date()

  const [entrenamientos, setEntrenamientos] = useState(entrenamientosDeEmpresa(SESION.empresaId))

  // Escribe tambien en la fuente unica: lo que se publica aqui es lo que el
  // cliente ve en el horario del complejo.
  const publicar = (lista) => {
    ENTRENAMIENTOS_POR_EMPRESA[SESION.empresaId] = lista
    setEntrenamientos(lista)
  }
  const [showModal, setShowModal]       = useState(false)
  const [editando, setEditando]         = useState(null)   // id en edicion, o null si es nuevo
  const [form, setForm]                 = useState(FORM_INIT)
  const [vistaEnt, setVistaEnt]         = useState(null)   // entrenamiento abierto en el calendario
  const [showEliminar, setShowEliminar] = useState(null)
  const [mesCal, setMesCal]             = useState(hoy.getMonth())
  const [anioCal, setAnioCal]           = useState(hoy.getFullYear())

  const toggleDia = (dia) => {
    setForm(prev => ({
      ...prev,
      dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia]
    }))
  }

  const abrirNuevo = () => { setEditando(null); setForm(FORM_INIT); setIntento(false); setShowModal(true) }

  const abrirEdicion = (ent) => {
    setEditando(ent.id)
    setForm({
      deporte: ent.deporte, nivel: ent.nivel, nombre: ent.nombre, entrenador: ent.entrenador,
      cancha: ent.cancha || '', dias: ent.dias || [], horaInicio: ent.horaInicio, horaFin: ent.horaFin,
      precio: ent.precio ?? '', cupo: ent.cupo ?? '', paraNinos: !!ent.paraNinos,
      edadMin: ent.edadMin ?? '', edadMax: ent.edadMax ?? '',
      descripcion: ent.descripcion || '',
    })
    setIntento(false)
    setShowModal(true)
  }

  /**
   * Que le falta al formulario, dicho con palabras.
   *
   * Antes solo se apagaba el boton y quien lo miraba no tenia forma de saber
   * que faltaba. Todo entrenamiento tiene que decir quien lo dicta, asi que
   * si no hay entrenadores cargados, el aviso manda a registrarlos primero.
   */
  const [intento, setIntento] = useState(false)
  const errores = {}
  {
    const n = (v) => Number(v)
    if (!form.nombre.trim()) errores.nombre = 'Escribe el nombre del entrenamiento, por ejemplo «Fútbol infantil».'
    else if (form.nombre.trim().length < 4) errores.nombre = 'El nombre es muy corto: usa al menos 4 caracteres.'
    if (!form.entrenador.trim()) errores.entrenador = 'Elige el entrenador que dicta este entrenamiento.'
    if (!form.dias.length) errores.dias = 'Elige al menos un día de la semana.'
    if (form.horaFin <= form.horaInicio) errores.horaFin = `La hora de fin debe ser posterior a la de inicio (${form.horaInicio}).`
    if (form.precio !== '' && (!Number.isFinite(n(form.precio)) || n(form.precio) < 0))
      errores.precio = 'El precio no puede ser negativo. Déjalo vacío si es gratis o se consulta en el complejo.'
    if (form.cupo !== '' && (!Number.isInteger(n(form.cupo)) || n(form.cupo) < 1))
      errores.cupo = 'El cupo debe ser un número entero mayor a 0. Déjalo vacío si no hay límite.'
    if (form.paraNinos) {
      if (form.edadMin === '' || n(form.edadMin) < 3 || n(form.edadMin) > 17)
        errores.edadMin = 'Escribe la edad mínima, entre 3 y 17 años.'
      if (form.edadMax === '' || n(form.edadMax) < 3 || n(form.edadMax) > 17)
        errores.edadMax = 'Escribe la edad máxima, entre 3 y 17 años.'
      else if (form.edadMin !== '' && n(form.edadMax) < n(form.edadMin))
        errores.edadMax = `La edad máxima no puede ser menor que la mínima (${form.edadMin}).`
    }
  }
  const ORDEN = ['nombre', 'entrenador', 'dias', 'horaFin', 'precio', 'cupo', 'edadMin', 'edadMax']
  const faltantes = intento ? ORDEN.filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] })) : []
  const formValido = Object.keys(errores).length === 0
  const pc = (c) => propsCampo(c, errores[c], intento)
  const mc = (c) => <MensajeCampo nombre={c} error={errores[c]} mostrar={intento} />

  // Los entrenadores del complejo: el horario se liga a su ficha por id
  const misEntrenadores = entrenadoresDeEmpresa(SESION.empresaId)
  const misCanchas      = canchasDeEmpresa(SESION.empresaId)
  const [errorGuardar, setErrorGuardar] = useState(null)

  const guardarEntrenamiento = async () => {
    setIntento(true)
    if (!formValido) { irAlPrimerError(errores, ORDEN); return }

    const entrenador = misEntrenadores.find(en => en.nombre === form.entrenador)
    const g = await guardarEnBase({
      id: editando || undefined, empresaId: SESION.empresaId,
      entrenadorId: entrenador?.id,
      canchaId: misCanchas.find(c => c.nombre === form.cancha)?.id,
      nombre: form.nombre, deporte: form.deporte,
      nivel: form.nivel, dias: form.dias,
      horaInicio: form.horaInicio, horaFin: form.horaFin,
      precio: form.precio, cupo: form.cupo, descripcion: form.descripcion,
      paraNinos: form.paraNinos, edadMin: form.edadMin, edadMax: form.edadMax,
    })
    if (g.error) { setErrorGuardar(g.error); return }

    if (editando) {
      publicar(entrenamientos.map(e => e.id === editando ? { ...e, ...form } : e))
      setVistaEnt(prev => prev && prev.id === editando ? { ...prev, ...form } : prev)
    } else {
      publicar([...entrenamientos, { id: g.entrenamiento.id, ...form }])
    }
    registrarEnBitacora({
      tipo: 'entrenamiento',
      accion: editando ? 'Editó un horario de entrenamiento' : 'Publicó un entrenamiento',
      detalle: form.nombre + ' · ' + form.dias.join(', ') + ' ' + form.horaInicio,
    })
    setErrorGuardar(null)
    setShowModal(false)
    setEditando(null)
    setForm(FORM_INIT)
  }

  const eliminarEntrenamiento = async (id) => {
    const e = entrenamientos.find(x => x.id === id)
    const g = await borrarEntrenamiento(id)
    if (g.error) { setErrorGuardar(g.error); setShowEliminar(null); return }

    publicar(entrenamientos.filter(x => x.id !== id))
    registrarEnBitacora({ tipo: 'entrenamiento', accion: 'Eliminó un entrenamiento', detalle: e?.nombre || '' })
    if (vistaEnt && vistaEnt.id === id) setVistaEnt(null)
    setShowEliminar(null)
  }

  const abrirCalendario = (ent) => {
    setVistaEnt(ent)
    setMesCal(hoy.getMonth())
    setAnioCal(hoy.getFullYear())
  }

  const mesAnterior = () => {
    if (mesCal === 0) { setMesCal(11); setAnioCal(a => a - 1) } else setMesCal(m => m - 1)
  }
  const mesSiguiente = () => {
    if (mesCal === 11) { setMesCal(0); setAnioCal(a => a + 1) } else setMesCal(m => m + 1)
  }

  const celdas = vistaEnt ? generarMes(anioCal, mesCal, vistaEnt.dias) : []
  const sesionesDelMes = celdas.filter(c => c && c.hay).length

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>Gestión de Entrenamientos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Publica los horarios de entrenamiento para que tus clientes los vean</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo Entrenamiento</button>
      </div>

      {/* Aviso del modelo: horario informativo, sin inscripcion */}
      <div style={{ padding: '10px 16px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
        <p style={{ color: '#00BCD4', fontSize: '0.82rem' }}>
          Los entrenamientos que publiques aquí se muestran a los clientes como horario informativo. No hay inscripción en línea: el cliente se presenta directamente en el complejo.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {entrenamientos.map(e => {
          const color = e.paraNinos ? '#f9a8d4' : (DEPORTE_COLORES[e.deporte] || '#00BCD4')
          return (
            <div key={e.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', border: e.paraNinos ? '1px solid rgba(249,168,212,0.2)' : '1px solid #2a2a2a' }} onClick={() => abrirCalendario(e)}>
              <div style={{ height: 4, background: color }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem' }}>{iconDeporte(e.deporte)}</span>
                    <div>
                      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: '#f5f5f5', lineHeight: 1.1 }}>{e.nombre}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <p style={{ fontSize: '0.72rem', color: '#888' }}>{e.nivel}</p>
                        {e.paraNinos && e.edadMin && e.edadMax && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(249,168,212,0.15)', color: '#f9a8d4', padding: '1px 7px', borderRadius: 20 }}>
                            {e.edadMin}-{e.edadMax} años
                          </span>
                        )}
                        {e.cupo != null && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(0,188,212,0.12)', color: '#00BCD4', padding: '1px 7px', borderRadius: 20 }}>
                            cupo {e.cupo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {e.precio !== '' && e.precio != null && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', padding: '2px 8px', borderRadius: 20, color: '#888' }}>
                      Bs. {e.precio}
                    </span>
                  )}
                </div>

                {/* Dias como chips */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {(e.dias || []).map(d => (
                    <span key={d} style={{ fontSize: '0.68rem', background: 'rgba(0,188,212,0.1)', color: '#00BCD4', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(0,188,212,0.2)' }}>{d}</span>
                  ))}
                  {e.horaInicio && (
                    <span style={{ fontSize: '0.68rem', color: '#888', padding: '2px 0' }}>{e.horaInicio} - {e.horaFin}</span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 12 }}>{e.entrenador}</p>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e1e1e', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={ev => { ev.stopPropagation(); abrirEdicion(e) }}>
                    Editar
                  </button>
                  <button style={{ padding: '4px 12px', fontSize: '0.78rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }} onClick={ev => { ev.stopPropagation(); setShowEliminar(e) }}>
                    Eliminar
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ padding: '4px 14px', fontSize: '0.78rem' }} onClick={ev => { ev.stopPropagation(); abrirCalendario(e) }}>
                    Ver calendario
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer', border: '2px dashed #2a2a2a' }} onClick={abrirNuevo}>
          <span style={{ fontSize: '2rem', opacity: 0.3, marginBottom: 8 }}>+</span>
          <p style={{ color: '#555', fontSize: '0.85rem' }}>Agregar Entrenamiento</p>
        </div>
      </div>

      {/* Panel: calendario de sesiones */}
      {vistaEnt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 16px' }} onClick={() => setVistaEnt(null)}>
          <div style={{ background: '#141414', borderRadius: 14, width: '100%', maxWidth: 560, border: '1px solid #2a2a2a', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5' }}>{iconDeporte(vistaEnt.deporte)} {vistaEnt.nombre}</h2>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>{formatHorario(vistaEnt)} - {vistaEnt.entrenador}</p>
              </div>
              <button aria-label="Cerrar" onClick={() => setVistaEnt(null)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '18px 20px' }}>
              {/* Navegacion de mes */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={mesAnterior} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', width: 32, height: 32, cursor: 'pointer', fontSize: '0.9rem' }}>◀</button>
                <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: '#f5f5f5', letterSpacing: 1 }}>{MESES[mesCal]} {anioCal}</p>
                <button onClick={mesSiguiente} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', width: 32, height: 32, cursor: 'pointer', fontSize: '0.9rem' }}>▶</button>
              </div>

              {/* Cabecera de dias */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>

              {/* Grilla del mes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {celdas.map((c, i) => {
                  if (!c) return <div key={'vacio' + i} />
                  const esHoy = c.dia === hoy.getDate() && mesCal === hoy.getMonth() && anioCal === hoy.getFullYear()
                  return (
                    <div key={c.dia} style={{
                      aspectRatio: '1',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8,
                      background: c.hay ? 'rgba(0,188,212,0.14)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid ' + (esHoy ? '#8B0000' : c.hay ? 'rgba(0,188,212,0.35)' : '#1e1e1e'),
                      color: c.hay ? '#00BCD4' : '#444',
                      fontSize: '0.85rem',
                      fontWeight: c.hay ? 700 : 400,
                    }}>
                      {c.dia}
                      {c.hay && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00BCD4', marginTop: 3 }} />}
                    </div>
                  )
                })}
              </div>

              {/* Resumen del mes */}
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(0,188,212,0.05)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                  {sesionesDelMes} sesion{sesionesDelMes === 1 ? '' : 'es'} en {MESES[mesCal]}
                </p>
                <p style={{ color: '#888', fontSize: '0.78rem' }}>
                  {(vistaEnt.dias || []).join(', ')} de {vistaEnt.horaInicio} a {vistaEnt.horaFin}
                </p>
              </div>

              {vistaEnt.descripcion && (
                <p style={{ marginTop: 14, fontSize: '0.82rem', color: '#888', lineHeight: 1.5 }}>{vistaEnt.descripcion}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setVistaEnt(null)}>Cerrar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => { const e = vistaEnt; setVistaEnt(null); abrirEdicion(e) }}>Editar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminacion */}
      {showEliminar && (
        <div className="modal-overlay" onClick={() => setShowEliminar(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Eliminar entrenamiento</h2>
              <button aria-label="Cerrar" className="btn btn-ghost btn-sm" onClick={() => setShowEliminar(null)}>✕</button>
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
              Se quitará <strong style={{ color: '#f5f5f5' }}>{showEliminar.nombre}</strong> del horario público. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowEliminar(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => eliminarEntrenamiento(showEliminar.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo / editar entrenamiento */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editando ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento'}</h2>
              <button aria-label="Cerrar" className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>

              {/* Deporte + Nivel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Deporte</label>
                  <select className="input" value={form.deporte} onChange={e => setForm(p => ({...p, deporte: e.target.value}))}>
                    <option>Fútbol</option><option>Wally</option><option>Básquetbol</option><option>Voleibol</option><option>Pádel</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nivel</label>
                  <select className="input" value={form.nivel} onChange={e => setForm(p => ({...p, nivel: e.target.value}))}>
                    <option>Principiante</option><option>Intermedio</option><option>Avanzado</option>
                  </select>
                </div>
              </div>

              {/* Nombre + Entrenador */}
              <div className="form-group">
                <label className="form-label">Nombre del entrenamiento *</label>
                <input className="input" placeholder="Ej: Fútbol técnico avanzado" value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} {...pc('nombre')} />
                {mc('nombre')}
              </div>
              <div className="form-group">
                <label className="form-label">Entrenador a cargo *</label>
                <select className="input" value={form.entrenador} disabled={misEntrenadores.length === 0}
                  onChange={e => setForm(p => ({ ...p, entrenador: e.target.value }))} {...pc('entrenador')}>
                  <option value="">Elige el entrenador</option>
                  {misEntrenadores.map(en => (
                    <option key={en.id} value={en.nombre}>{en.nombre} · {en.deporte}</option>
                  ))}
                </select>
                {mc('entrenador')}
              </div>

              <div className="form-group">
                <label className="form-label">Cancha que ocupa</label>
                <select className="input" value={form.cancha}
                  onChange={e => setForm(p => ({ ...p, cancha: e.target.value }))}>
                  <option value="">Ninguna — solo se anuncia</option>
                  {misCanchas.map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre} · {c.deporte}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.72rem', color: '#666', marginTop: 4 }}>
                  Si eliges una, esas horas quedan bloqueadas para reservar y el
                  cliente ve por qué. Si no, el entrenamiento igual aparece en el
                  horario del complejo.
                </p>
              </div>

              {/* Dias */}
              <div className="form-group">
                <label className="form-label">Días de entrenamiento *</label>
                <div id="campo-dias" tabIndex={-1} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {DIAS_SEMANA.map(dia => {
                    const sel = form.dias.includes(dia)
                    return (
                      <button key={dia} type="button" onClick={() => toggleDia(dia)} style={{ padding: '6px 14px', borderRadius: 20, border: sel ? '1px solid #00BCD4' : '1px solid #2a2a2a', background: sel ? 'rgba(0,188,212,0.15)' : 'rgba(255,255,255,0.03)', color: sel ? '#00BCD4' : '#888', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.15s' }}>
                        {dia}
                      </button>
                    )
                  })}
                </div>
                {mc('dias')}
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 8 }}>Estos son los días que se marcarán en el calendario que ven los clientes.</p>
              </div>

              {/* Horario */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Hora de inicio</label>
                  <input className="input" type="time" value={form.horaInicio} onChange={e => setForm(p => ({...p, horaInicio: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de fin</label>
                  <input className="input" type="time" value={form.horaFin} onChange={e => setForm(p => ({...p, horaFin: e.target.value}))} {...pc('horaFin')} />
                  {mc('horaFin')}
                </div>
              </div>

              {/* Precio referencial */}
              <div className="form-group">
                <label className="form-label">Precio referencial (Bs.) - opcional</label>
                <input className="input" type="number" min="0" placeholder="Déjalo vacío si es libre o se consulta en el complejo" value={form.precio} onChange={e => setForm(p => ({...p, precio: e.target.value}))} {...pc('precio')} />
                {mc('precio')}
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 6 }}>Solo informativo. El cobro se hace de forma presencial.</p>
              </div>

              {/* Cupo maximo */}
              <div className="form-group">
                <label className="form-label">Cupo máximo - opcional</label>
                <input className="input" type="number" min="1" placeholder="Déjalo vacío si no hay límite"
                  value={form.cupo} onChange={e => setForm(p => ({...p, cupo: e.target.value}))} {...pc('cupo')} />
                {mc('cupo')}
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 6 }}>
                  Cuántos alumnos entran. Se muestra en el horario público para que el
                  cliente sepa si es un grupo chico o abierto.
                </p>
              </div>

              {/* Para ninos */}
              <div style={{ padding: '12px 14px', background: 'rgba(249,168,212,0.05)', border: '1px solid rgba(249,168,212,0.15)', borderRadius: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.paraNinos} onChange={e => setForm(p => ({...p, paraNinos: e.target.checked}))} style={{ width: 16, height: 16, accentColor: '#f9a8d4' }} />
                  <span style={{ color: '#f5f5f5', fontSize: '0.85rem', fontWeight: 600 }}>Entrenamiento para niños</span>
                </label>
                <p style={{ color: '#888', fontSize: '0.75rem', marginTop: 6, marginLeft: 26 }}>Se muestra el rango de edad como etiqueta en el horario público.</p>
                {form.paraNinos && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, marginLeft: 26 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Edad mínima</label>
                      <input className="input" type="number" placeholder="6" value={form.edadMin} onChange={e => setForm(p => ({...p, edadMin: e.target.value}))} style={{ fontSize: '0.85rem' }} {...pc('edadMin')} />
                      {mc('edadMin')}
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Edad máxima</label>
                      <input className="input" type="number" placeholder="12" value={form.edadMax} onChange={e => setForm(p => ({...p, edadMax: e.target.value}))} style={{ fontSize: '0.85rem' }} {...pc('edadMax')} />
                      {mc('edadMax')}
                    </div>
                  </div>
                )}
              </div>

              {/* Descripcion */}
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input" rows={3} placeholder="Describe el entrenamiento, requisitos, etc." style={{ resize: 'none' }} value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                {misEntrenadores.length === 0 && (
                  <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, marginBottom: 10 }}>
                    <p style={{ color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                      Primero necesitas un entrenador
                    </p>
                    <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.5 }}>
                      Todo entrenamiento tiene que decir quién lo dicta. Registralo en
                      «Gestión de Entrenadores» y vuelve aquí.
                    </p>
                  </div>
                )}

                <AvisoFaltantes
                  faltantes={misEntrenadores.length ? faltantes : []}
                  error={errorGuardar} />
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={guardarEntrenamiento}>
                  {editando ? 'Guardar cambios' : 'Publicar Entrenamiento'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
