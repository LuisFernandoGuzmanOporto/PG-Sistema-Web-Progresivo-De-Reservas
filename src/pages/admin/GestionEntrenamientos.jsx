import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const DEPORTE_COLORES = { Futbol: '#ef4444', 'Futbol 5': '#ef4444', Wally: '#00BCD4', Basquetbol: '#f59e0b', Voleibol: '#22c55e', Padel: '#8b5cf6' }
const DIAS_SEMANA = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom']

const ENTRENAMIENTOS_MOCK = [
  {
    id: 1, deporte: 'Futbol', nombre: 'Futbol Tecnico Avanzado',
    entrenador: 'Prof. Mario Quispe', dias: ['Lun','Mie','Vie'], horaInicio: '07:00', horaFin: '09:00',
    nivel: 'Avanzado', precio: 150, cupoMax: 12, polera: true, precioPolera: 60,
    paraNinos: false,
    descripcion: 'Entrenamiento tecnico enfocado en dribling, pase y vision de juego.'
  },
  {
    id: 2, deporte: 'Basquetbol', nombre: 'Basquet para Principiantes',
    entrenador: 'Prof. Ana Flores', dias: ['Mar','Jue'], horaInicio: '18:00', horaFin: '20:00',
    nivel: 'Principiante', precio: 100, cupoMax: 10, polera: false, precioPolera: 0,
    paraNinos: false,
    descripcion: 'Fundamentos del basquetbol: dribbling, pase y tiro libre.'
  },
  {
    id: 3, deporte: 'Wally', nombre: 'Wally Competitivo',
    entrenador: 'Prof. Roberto Vargas', dias: ['Sab'], horaInicio: '09:00', horaFin: '11:00',
    nivel: 'Intermedio', precio: 120, cupoMax: 8, polera: true, precioPolera: 50,
    paraNinos: false,
    descripcion: 'Mejora tu tecnica de golpe y estrategia de juego en cancha cerrada.'
  },
  {
    id: 4, deporte: 'Futbol', nombre: 'Escuela de Futbol Infantil',
    entrenador: 'Prof. Carlos Mamani', dias: ['Sab','Dom'], horaInicio: '09:00', horaFin: '11:00',
    nivel: 'Principiante', precio: 80, cupoMax: 15, polera: true, precioPolera: 45,
    paraNinos: true, edadMin: 6, edadMax: 12,
    descripcion: 'Escuela de futbol para ninos. Tecnica, trabajo en equipo y valores deportivos.'
  },
]

const INSCRITOS_MOCK = {
  1: [
    { id: 1, nombre: 'Juan Garcia', telefono: '77012345', quierePolera: true, talla: 'M', comprobante: 'pago_juan.jpg', estado: 'pendiente', fechaInscripcion: '2026-05-26' },
    { id: 2, nombre: 'Carlos Mamani', telefono: '76543210', quierePolera: false, talla: '-', comprobante: 'comprobante_carlos.pdf', estado: 'aprobado', fechaInscripcion: '2026-05-25' },
    { id: 3, nombre: 'Pedro Quispe', telefono: '79876543', quierePolera: true, talla: 'L', comprobante: 'recibo_pedro.jpg', estado: 'pendiente', fechaInscripcion: '2026-05-27' },
    { id: 4, nombre: 'Luis Torrez', telefono: '70112233', quierePolera: false, talla: '-', comprobante: 'pago_luis.jpg', estado: 'aprobado', fechaInscripcion: '2026-05-24' },
  ],
  2: [
    { id: 5, nombre: 'Maria Lopez', telefono: '71234567', quierePolera: false, talla: '-', comprobante: 'comprobante_maria.jpg', estado: 'aprobado', fechaInscripcion: '2026-05-23' },
    { id: 6, nombre: 'Sofia Choque', telefono: '72345678', quierePolera: false, talla: '-', comprobante: 'pago_sofia.pdf', estado: 'pendiente', fechaInscripcion: '2026-05-27' },
  ],
  3: [
    { id: 7, nombre: 'Diego Flores', telefono: '73456789', quierePolera: true, talla: 'XL', comprobante: 'recibo_diego.jpg', estado: 'rechazado', fechaInscripcion: '2026-05-22' },
    { id: 8, nombre: 'Andres Vega', telefono: '74567890', quierePolera: true, talla: 'S', comprobante: 'pago_andres.jpg', estado: 'aprobado', fechaInscripcion: '2026-05-20' },
  ],
  4: [
    { id: 9, nombre: 'Rosa Quispe (mama)', telefono: '77123456', comprobante: 'pago_rosa.jpg', estado: 'pendiente', fechaInscripcion: '2026-05-27',
      ninos: [
        { nombre: 'Mateo Quispe', quierePolera: true, talla: 'S' },
        { nombre: 'Valentina Quispe', quierePolera: true, talla: 'XS' },
      ]
    },
    { id: 10, nombre: 'Jorge Mamani (papa)', telefono: '76234567', comprobante: 'recibo_jorge.jpg', estado: 'aprobado', fechaInscripcion: '2026-05-25',
      ninos: [
        { nombre: 'Sebastian Mamani', quierePolera: false, talla: '-' },
      ]
    },
    { id: 11, nombre: 'Patricia Torrez (mama)', telefono: '79345678', comprobante: 'pago_patricia.pdf', estado: 'pendiente', fechaInscripcion: '2026-05-28',
      ninos: [
        { nombre: 'Emilio Torrez', quierePolera: true, talla: 'M' },
        { nombre: 'Lucia Torrez', quierePolera: false, talla: '-' },
        { nombre: 'Tomas Torrez', quierePolera: true, talla: 'S' },
      ]
    },
  ],
}

const SESIONES_MOCK = {
  1: ['2026-05-19','2026-05-21','2026-05-23','2026-05-26','2026-05-28','2026-05-30'],
  2: ['2026-05-20','2026-05-22','2026-05-27','2026-05-29'],
  3: ['2026-05-17','2026-05-24','2026-05-31'],
  4: ['2026-05-17','2026-05-18','2026-05-24','2026-05-25','2026-05-31'],
}

function formatHorario(e) {
  if (!e.dias || e.dias.length === 0) return '-'
  return e.dias.join(', ') + '  ' + (e.horaInicio || '') + ' - ' + (e.horaFin || '')
}

function formatFecha(str) {
  const [y, m, d] = str.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return d + ' ' + meses[parseInt(m)-1]
}

const iconDeporte = (d) => {
  const map = { 'Futbol': '⚽', 'Futbol 5': '⚽', 'Wally': '🎾', 'Basquetbol': '🏀', 'Voleibol': '🏐', 'Padel': '🏸' }
  return map[d] || '🏃'
}

// Estado inicial del formulario de nuevo entrenamiento
const FORM_INIT = {
  deporte: 'Futbol', nivel: 'Principiante', nombre: '', entrenador: '',
  dias: [], horaInicio: '08:00', horaFin: '10:00',
  precio: '', cupoMax: '', precioPolera: '',
  paraNinos: false, edadMin: '', edadMax: '',
  descripcion: '', qrArchivo: null,
}

export default function GestionEntrenamientos() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(FORM_INIT)
  const [vistaEnt, setVistaEnt] = useState(null)
  const [tabDetalle, setTabDetalle] = useState('inscritos')
  const [inscritos, setInscritos] = useState(INSCRITOS_MOCK)
  const [asistencia, setAsistencia] = useState({})
  const [qrSubido, setQrSubido] = useState({})
  const [showComprobante, setShowComprobante] = useState(null)

  const toggleDia = (dia) => {
    setForm(prev => ({
      ...prev,
      dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia]
    }))
  }

  const publicarEntrenamiento = () => {
    if (form.qrArchivo) {
      // Simular que el QR queda guardado para el entrenamiento recien creado
      // En produccion se usaria el nuevo id real
      const nuevoId = Date.now()
      setQrSubido(prev => ({ ...prev, [nuevoId]: form.qrArchivo }))
    }
    setShowModal(false)
    setForm(FORM_INIT)
  }

  const cambiarEstado = (entId, inscritoId, nuevoEstado) => {
    setInscritos(prev => ({
      ...prev,
      [entId]: prev[entId].map(i => i.id === inscritoId ? { ...i, estado: nuevoEstado } : i)
    }))
  }

  const toggleAsistencia = (entId, fecha, inscritoId) => {
    const key = entId + '_' + fecha + '_' + inscritoId
    setAsistencia(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getAsistencia = (entId, fecha, inscritoId) => {
    return asistencia[entId + '_' + fecha + '_' + inscritoId] || false
  }

  const inscritosEnt = vistaEnt ? (inscritos[vistaEnt.id] || []) : []
  const aprobados = inscritosEnt.filter(i => i.estado === 'aprobado')
  const pendientes = inscritosEnt.filter(i => i.estado === 'pendiente')

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>Gestion de Entrenamientos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Publica horarios, gestiona inscripciones y controla la asistencia</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(FORM_INIT); setShowModal(true) }}>+ Nuevo Entrenamiento</button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {ENTRENAMIENTOS_MOCK.map(e => {
          const totalIns = (inscritos[e.id] || []).length
          const aprobadosCount = (inscritos[e.id] || []).filter(i => i.estado === 'aprobado').length
          const pendientesCount = (inscritos[e.id] || []).filter(i => i.estado === 'pendiente').length
          const totalNinos = e.paraNinos
            ? (inscritos[e.id] || []).reduce((s,i) => s + (i.ninos ? i.ninos.length : 0), 0)
            : 0
          const color = e.paraNinos ? '#f9a8d4' : (DEPORTE_COLORES[e.deporte] || '#00BCD4')
          return (
            <div key={e.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', border: e.paraNinos ? '1px solid rgba(249,168,212,0.2)' : '1px solid #2a2a2a' }} onClick={() => { setVistaEnt(e); setTabDetalle('inscritos') }}>
              <div style={{ height: 4, background: color }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem' }}>{iconDeporte(e.deporte)}</span>
                    <div>
                      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: '#f5f5f5', lineHeight: 1.1 }}>{e.nombre}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <p style={{ fontSize: '0.72rem', color: '#888' }}>{e.nivel}</p>
                        {e.paraNinos && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(249,168,212,0.15)', color: '#f9a8d4', padding: '1px 7px', borderRadius: 20 }}>
                            {e.edadMin}-{e.edadMax} anos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', padding: '2px 8px', borderRadius: 20, color: '#888' }}>
                    Bs. {e.precio}{e.paraNinos ? '/nino' : ''}
                  </span>
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '3px 10px', borderRadius: 20 }}>{aprobadosCount} aprobados</span>
                  {pendientesCount > 0 && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '3px 10px', borderRadius: 20 }}>{pendientesCount} pendientes</span>
                  )}
                  {e.paraNinos && totalNinos > 0 && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(249,168,212,0.1)', color: '#f9a8d4', padding: '3px 10px', borderRadius: 20 }}>{totalNinos} ninos</span>
                  )}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>
                    {e.paraNinos ? totalNinos + ' ninos inscritos' : totalIns + '/' + e.cupoMax + ' inscritos'}
                  </span>
                  <button className="btn btn-primary btn-sm" style={{ padding: '4px 14px', fontSize: '0.78rem' }} onClick={ev => { ev.stopPropagation(); setVistaEnt(e); setTabDetalle('inscritos') }}>
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer', border: '2px dashed #2a2a2a' }} onClick={() => { setForm(FORM_INIT); setShowModal(true) }}>
          <span style={{ fontSize: '2rem', opacity: 0.3, marginBottom: 8 }}>+</span>
          <p style={{ color: '#555', fontSize: '0.85rem' }}>Agregar Entrenamiento</p>
        </div>
      </div>

      {/* Panel detalle */}
      {vistaEnt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 16px' }} onClick={() => setVistaEnt(null)}>
          <div style={{ background: '#141414', borderRadius: 14, width: '100%', maxWidth: 720, border: '1px solid #2a2a2a', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5' }}>{iconDeporte(vistaEnt.deporte)} {vistaEnt.nombre}</h2>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>{formatHorario(vistaEnt)} - {vistaEnt.entrenador}</p>
              </div>
              <button onClick={() => setVistaEnt(null)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>x</button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #1e1e1e' }}>
              {[{key:'inscritos',label:'Inscritos'},{key:'asistencia',label:'Asistencia'},{key:'qr',label:'QR Pago'}].map(t => (
                <button key={t.key} onClick={() => setTabDetalle(t.key)} style={{ flex: 1, padding: '12px 8px', background: 'none', border: 'none', borderBottom: tabDetalle===t.key ? '2px solid #00BCD4' : '2px solid transparent', color: tabDetalle===t.key ? '#00BCD4' : '#666', fontFamily: 'Outfit', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '18px 20px' }}>

              {tabDetalle === 'inscritos' && (
                <div>
                  {pendientes.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <h4 style={{ color: '#f59e0b', fontSize: '0.85rem', marginBottom: 10 }}>Pendientes de aprobacion ({pendientes.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {pendientes.map(ins => (
                          <div key={ins.id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{ins.nombre}</p>
                                <p style={{ color: '#888', fontSize: '0.75rem' }}>{ins.telefono} - {formatFecha(ins.fechaInscripcion)}</p>
                                {!ins.ninos && ins.quierePolera && (
                                  <p style={{ color: '#00BCD4', fontSize: '0.75rem', marginTop: 2 }}>Quiere polera - Talla {ins.talla}</p>
                                )}
                                {ins.ninos && (
                                  <div style={{ marginTop: 8, background: 'rgba(249,168,212,0.06)', border: '1px solid rgba(249,168,212,0.15)', borderRadius: 8, padding: '8px 10px' }}>
                                    <p style={{ fontSize: '0.72rem', color: '#f9a8d4', fontWeight: 700, marginBottom: 5 }}>
                                      {ins.ninos.length} nino{ins.ninos.length > 1 ? 's' : ''} a inscribir:
                                    </p>
                                    {ins.ninos.map((n, ni) => (
                                      <p key={ni} style={{ fontSize: '0.75rem', color: '#ccc', marginBottom: 2 }}>
                                        - {n.nombre}{n.quierePolera ? ' - polera talla ' + n.talla : ''}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => setShowComprobante(ins.comprobante)} style={{ background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.73rem', cursor: 'pointer', fontFamily: 'Outfit', marginLeft: 8, flexShrink: 0 }}>
                                Comprobante
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => cambiarEstado(vistaEnt.id, ins.id, 'aprobado')} style={{ flex: 1, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '7px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                                Aprobar
                              </button>
                              <button onClick={() => cambiarEstado(vistaEnt.id, ins.id, 'rechazado')} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                                Rechazar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aprobados.length > 0 && (
                    <div>
                      <h4 style={{ color: '#22c55e', fontSize: '0.85rem', marginBottom: 10 }}>Aprobados ({aprobados.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {aprobados.map(ins => (
                          <div key={ins.id} style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: ins.ninos ? 8 : 0 }}>
                              <div>
                                <p style={{ color: '#f5f5f5', fontSize: '0.88rem', fontWeight: 600 }}>{ins.nombre}</p>
                                <p style={{ color: '#888', fontSize: '0.73rem' }}>
                                  {ins.telefono}{!ins.ninos && ins.quierePolera ? ' - Polera talla ' + ins.talla : ''}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={() => setShowComprobante(ins.comprobante)} style={{ background: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Outfit' }}>ver</button>
                                <button onClick={() => cambiarEstado(vistaEnt.id, ins.id, 'rechazado')} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Outfit' }}>Rechazar</button>
                              </div>
                            </div>
                            {ins.ninos && (
                              <div style={{ background: 'rgba(249,168,212,0.06)', border: '1px solid rgba(249,168,212,0.12)', borderRadius: 8, padding: '6px 10px' }}>
                                {ins.ninos.map((n, ni) => (
                                  <p key={ni} style={{ fontSize: '0.73rem', color: '#ccc', marginBottom: ni < ins.ninos.length-1 ? 3 : 0 }}>
                                    {n.nombre}{n.quierePolera ? ' - polera talla ' + n.talla : ''}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {inscritosEnt.filter(i=>i.estado==='rechazado').length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h4 style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 8 }}>Rechazados</h4>
                      {inscritosEnt.filter(i=>i.estado==='rechazado').map(ins => (
                        <div key={ins.id} style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <p style={{ color: '#888', fontSize: '0.88rem' }}>{ins.nombre}</p>
                            <p style={{ color: '#555', fontSize: '0.73rem' }}>Comprobante rechazado</p>
                          </div>
                          <button onClick={() => cambiarEstado(vistaEnt.id, ins.id, 'pendiente')} style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                            Revertir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {inscritosEnt.length === 0 && (
                    <p style={{ color: '#555', textAlign: 'center', padding: '30px 0' }}>Aun no hay inscritos en este entrenamiento.</p>
                  )}
                </div>
              )}

              {tabDetalle === 'asistencia' && (() => {
                const filas = vistaEnt.paraNinos
                  ? aprobados.flatMap(ins => (ins.ninos || []).map((n, ni) => ({ id: ins.id * 100 + ni, nombre: n.nombre, tutor: ins.nombre })))
                  : aprobados.map(ins => ({ id: ins.id, nombre: ins.nombre }))
                return (
                  <div>
                    <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: 16 }}>
                      {vistaEnt.paraNinos ? 'Lista de asistencia de los ninos por sesion.' : 'Marca la asistencia de los alumnos aprobados por cada sesion.'}
                    </p>
                    {filas.length === 0 ? (
                      <p style={{ color: '#555', textAlign: 'center', padding: '30px 0' }}>No hay alumnos aprobados aun.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontSize: '0.78rem', borderBottom: '1px solid #1e1e1e', minWidth: 160 }}>
                                {vistaEnt.paraNinos ? 'Nino' : 'Alumno'}
                              </th>
                              {(SESIONES_MOCK[vistaEnt.id] || []).map(fecha => (
                                <th key={fecha} style={{ padding: '8px', color: '#888', fontSize: '0.72rem', borderBottom: '1px solid #1e1e1e', textAlign: 'center', minWidth: 60 }}>{formatFecha(fecha)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filas.map(fila => (
                              <tr key={fila.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <p style={{ color: '#f5f5f5', fontSize: '0.85rem' }}>{fila.nombre}</p>
                                  {fila.tutor && <p style={{ color: '#555', fontSize: '0.7rem' }}>Tutor: {fila.tutor}</p>}
                                </td>
                                {(SESIONES_MOCK[vistaEnt.id] || []).map(fecha => {
                                  const presente = getAsistencia(vistaEnt.id, fecha, fila.id)
                                  return (
                                    <td key={fecha} style={{ padding: '8px', textAlign: 'center' }}>
                                      <button
                                        onClick={() => toggleAsistencia(vistaEnt.id, fecha, fila.id)}
                                        style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', background: presente ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.1)', color: presente ? '#22c55e' : '#555', fontSize: '0.85rem', transition: 'all 0.2s' }}
                                      >
                                        {presente ? 'P' : 'A'}
                                      </button>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })()}

              {tabDetalle === 'qr' && (
                <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
                    Este es el QR de pago que ven los usuarios al inscribirse a este entrenamiento.
                  </p>
                  {qrSubido[vistaEnt.id] ? (
                    <div>
                      <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'inline-block', marginBottom: 16 }}>
                        <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                          <rect width="140" height="140" fill="#fff"/>
                          <rect x="10" y="10" width="40" height="40" fill="#111"/>
                          <rect x="15" y="15" width="30" height="30" fill="#fff"/>
                          <rect x="20" y="20" width="20" height="20" fill="#111"/>
                          <rect x="90" y="10" width="40" height="40" fill="#111"/>
                          <rect x="95" y="15" width="30" height="30" fill="#fff"/>
                          <rect x="100" y="20" width="20" height="20" fill="#111"/>
                          <rect x="10" y="90" width="40" height="40" fill="#111"/>
                          <rect x="15" y="95" width="30" height="30" fill="#fff"/>
                          <rect x="20" y="100" width="20" height="20" fill="#111"/>
                          <rect x="60" y="10" width="10" height="10" fill="#111"/>
                          <rect x="60" y="30" width="10" height="10" fill="#111"/>
                          <rect x="10" y="60" width="10" height="10" fill="#111"/>
                          <rect x="30" y="60" width="20" height="10" fill="#111"/>
                          <rect x="60" y="60" width="10" height="10" fill="#111"/>
                          <rect x="80" y="60" width="10" height="10" fill="#111"/>
                          <rect x="100" y="60" width="30" height="10" fill="#111"/>
                          <rect x="60" y="80" width="20" height="10" fill="#111"/>
                          <rect x="90" y="80" width="10" height="20" fill="#111"/>
                          <rect x="110" y="90" width="20" height="10" fill="#111"/>
                          <rect x="60" y="100" width="10" height="30" fill="#111"/>
                          <rect x="80" y="110" width="20" height="10" fill="#111"/>
                          <rect x="110" y="110" width="20" height="20" fill="#111"/>
                        </svg>
                      </div>
                      <p style={{ color: '#22c55e', fontSize: '0.85rem', marginBottom: 4 }}>QR activo: {qrSubido[vistaEnt.id]}</p>
                      <p style={{ color: '#555', fontSize: '0.75rem', marginBottom: 20 }}>Los usuarios ven este QR al inscribirse</p>
                      <label style={{ display: 'inline-block', background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 8, padding: '10px 24px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                        Cambiar QR
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          if (e.target.files[0]) setQrSubido(prev => ({ ...prev, [vistaEnt.id]: e.target.files[0].name }))
                        }} />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <div style={{ border: '2px dashed #2a2a2a', borderRadius: 12, padding: '40px 20px', marginBottom: 16 }}>
                        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 4 }}>Sin QR cargado</p>
                        <p style={{ color: '#444', fontSize: '0.75rem' }}>Sube un QR para que los usuarios puedan pagar</p>
                      </div>
                      <label style={{ display: 'inline-block', background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 8, padding: '10px 24px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                        Subir QR de pago
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          if (e.target.files[0]) setQrSubido(prev => ({ ...prev, [vistaEnt.id]: e.target.files[0].name }))
                        }} />
                      </label>
                      <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 10 }}>PNG o JPG — Tigo Money, QR Simple, etc.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal comprobante */}
      {showComprobante && (
        <div className="modal-overlay" onClick={() => setShowComprobante(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Comprobante de pago</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowComprobante(null)}>x</button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ background: '#1e1e1e', borderRadius: 12, padding: '30px 20px', marginBottom: 16 }}>
                <p style={{ fontSize: '3rem', marginBottom: 8 }}>{showComprobante.endsWith('.pdf') ? 'PDF' : 'IMG'}</p>
                <p style={{ color: '#f5f5f5', fontSize: '0.9rem', fontWeight: 600 }}>{showComprobante}</p>
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 4 }}>Archivo subido por el usuario</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo entrenamiento */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nuevo Entrenamiento</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>x</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>

              {/* Deporte + Nivel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Deporte</label>
                  <select className="input" value={form.deporte} onChange={e => setForm(p => ({...p, deporte: e.target.value}))}>
                    <option>Futbol</option><option>Wally</option><option>Basquetbol</option><option>Voleibol</option><option>Padel</option>
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
                <label className="form-label">Nombre del entrenamiento</label>
                <input className="input" placeholder="Ej: Futbol Tecnico Avanzado" value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del entrenador</label>
                <input className="input" placeholder="Ej: Prof. Mario Quispe" value={form.entrenador} onChange={e => setForm(p => ({...p, entrenador: e.target.value}))} />
              </div>

              {/* Dias */}
              <div className="form-group">
                <label className="form-label">Dias de entrenamiento</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {DIAS_SEMANA.map(dia => {
                    const sel = form.dias.includes(dia)
                    return (
                      <button key={dia} type="button" onClick={() => toggleDia(dia)} style={{ padding: '6px 14px', borderRadius: 20, border: sel ? '1px solid #00BCD4' : '1px solid #2a2a2a', background: sel ? 'rgba(0,188,212,0.15)' : 'rgba(255,255,255,0.03)', color: sel ? '#00BCD4' : '#888', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.15s' }}>
                        {dia}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Horario */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Hora de inicio</label>
                  <input className="input" type="time" value={form.horaInicio} onChange={e => setForm(p => ({...p, horaInicio: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de fin</label>
                  <input className="input" type="time" value={form.horaFin} onChange={e => setForm(p => ({...p, horaFin: e.target.value}))} />
                </div>
              </div>

              {/* Precio + Cupo + Polera */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Precio (Bs.)</label>
                  <input className="input" type="number" placeholder="150" value={form.precio} onChange={e => setForm(p => ({...p, precio: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cupo maximo</label>
                  <input className="input" type="number" placeholder="12" value={form.cupoMax} onChange={e => setForm(p => ({...p, cupoMax: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio polera</label>
                  <input className="input" type="number" placeholder="0 = sin polera" value={form.precioPolera} onChange={e => setForm(p => ({...p, precioPolera: e.target.value}))} />
                </div>
              </div>

              {/* Para ninos */}
              <div style={{ padding: '12px 14px', background: 'rgba(249,168,212,0.05)', border: '1px solid rgba(249,168,212,0.15)', borderRadius: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.paraNinos} onChange={e => setForm(p => ({...p, paraNinos: e.target.checked}))} style={{ width: 16, height: 16, accentColor: '#f9a8d4' }} />
                  <span style={{ color: '#f5f5f5', fontSize: '0.85rem', fontWeight: 600 }}>Entrenamiento para ninos</span>
                </label>
                <p style={{ color: '#888', fontSize: '0.75rem', marginTop: 6, marginLeft: 26 }}>Los usuarios inscribiran a sus hijos indicando nombre y talla de polera por cada nino.</p>
                {form.paraNinos && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, marginLeft: 26 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Edad minima</label>
                      <input className="input" type="number" placeholder="6" value={form.edadMin} onChange={e => setForm(p => ({...p, edadMin: e.target.value}))} style={{ fontSize: '0.85rem' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Edad maxima</label>
                      <input className="input" type="number" placeholder="12" value={form.edadMax} onChange={e => setForm(p => ({...p, edadMax: e.target.value}))} style={{ fontSize: '0.85rem' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Descripcion */}
              <div className="form-group">
                <label className="form-label">Descripcion</label>
                <textarea className="input" rows={3} placeholder="Describe el entrenamiento, requisitos, etc." style={{ resize: 'none' }} value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} />
              </div>

              {/* QR de pago */}
              <div style={{ padding: '14px', background: 'rgba(0,188,212,0.04)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10 }}>
                <p style={{ color: '#f5f5f5', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>QR de pago (opcional)</p>
                <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 10 }}>Sube tu QR ahora para que los usuarios lo vean al inscribirse. Tambien puedes subirlo despues desde el detalle del entrenamiento.</p>
                {form.qrArchivo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#22c55e', fontSize: '0.82rem' }}>QR listo: {form.qrArchivo}</span>
                    <button type="button" onClick={() => setForm(p => ({...p, qrArchivo: null}))} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'inline-block', background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 8, padding: '8px 20px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                    Subir imagen QR
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      if (e.target.files[0]) setForm(p => ({...p, qrArchivo: e.target.files[0].name}))
                    }} />
                  </label>
                )}
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={publicarEntrenamiento}>Publicar Entrenamiento</button>
              </div>

            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
