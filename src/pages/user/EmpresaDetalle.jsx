import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const EMPRESAS = [
  { id: 1, nombre: 'Sport Center',           zona: 'Zona Norte', direccion: 'Av. Blanco Galindo Km 5', telefono: '4-123456', emoji: 'X', horario: '08:00 - 22:00', deportes: ['Futbol', 'Wally', 'Padel'],    descripcion: 'El complejo deportivo mas grande de la zona norte con canchas de primer nivel e iluminacion nocturna.' },
  { id: 2, nombre: 'Gimnasio Central',        zona: 'Centro',     direccion: 'Calle Espana 234',         telefono: '4-234567', emoji: 'B', horario: '07:00 - 21:00', deportes: ['Basquetbol'],                  descripcion: 'Especialistas en basquetbol con cancha techada y piso de madera profesional.' },
  { id: 3, nombre: 'Zona Deportiva Sur',      zona: 'Zona Sur',   direccion: 'Av. Petrolera 456',        telefono: '4-345678', emoji: 'V', horario: '08:00 - 20:00', deportes: ['Voleibol'],                    descripcion: 'Complejo multideportivo en la zona sur con canchas de voleibol.' },
  { id: 4, nombre: 'Complejo Deportivo Este', zona: 'Zona Este',  direccion: 'Av. America 789',          telefono: '4-456789', emoji: 'W', horario: '07:00 - 22:00', deportes: ['Wally'],                       descripcion: 'El mejor complejo de wally en Cochabamba. Tres canchas techadas con iluminacion LED.' },
  { id: 5, nombre: 'Zona Deportiva Oeste',    zona: 'Zona Oeste', direccion: 'Calle Lanza 101',          telefono: '4-567890', emoji: 'P', horario: '06:00 - 21:00', deportes: ['Padel'],                       descripcion: 'Canchas de padel profesionales con torneos semanales.' },
]

const CANCHAS_POR_EMPRESA = {
  1: [
    { id: 1, nombre: 'Cancha de Futbol Principal', deporte: 'Futbol', precio: 120, disponible: true },
    { id: 4, nombre: 'Cancha de Wally 1',          deporte: 'Wally',  precio: 60,  disponible: true },
    { id: 7, nombre: 'Cancha de Padel',            deporte: 'Padel',  precio: 90,  disponible: true },
  ],
  2: [{ id: 2, nombre: 'Cancha de Baloncesto', deporte: 'Basquetbol', precio: 80, disponible: true }],
  3: [{ id: 3, nombre: 'Cancha de Voleibol',   deporte: 'Voleibol',   precio: 70, disponible: false }],
  4: [
    { id: 5, nombre: 'Cancha de Wally 1', deporte: 'Wally', precio: 60, disponible: true },
    { id: 6, nombre: 'Cancha de Wally 2', deporte: 'Wally', precio: 60, disponible: true },
    { id: 8, nombre: 'Cancha de Wally 3', deporte: 'Wally', precio: 60, disponible: true },
  ],
  5: [{ id: 9, nombre: 'Cancha de Padel Principal', deporte: 'Padel', precio: 90, disponible: true }],
}

const TORNEOS_POR_EMPRESA = {
  1: [
    { id: 1, nombre: 'Copa Sportika Futbol 2025', deporte: 'Futbol', fechaInicio: '14 Feb', fechaFin: '28 Feb', equipos: '0/16', inscripcionHasta: '10 Feb', precio: 200, desc: 'El torneo de futbol mas grande de Cochabamba.', premios: 'Trofeo + Bs. 500' },
    { id: 4, nombre: 'Torneo de Padel Abierto',   deporte: 'Padel',  fechaInicio: '15 Mar', fechaFin: '20 Mar', equipos: '0/8',  inscripcionHasta: '12 Mar', precio: 80,  desc: 'Torneo de padel dobles para todos los niveles.', premios: 'Trofeo + Bs. 200' },
  ],
  2: [{ id: 2, nombre: 'Liga de Baloncesto Sportika', deporte: 'Basquetbol', fechaInicio: '28 Feb', fechaFin: '14 Mar', equipos: '0/12', inscripcionHasta: '24 Feb', precio: 150, desc: 'Competencia de baloncesto.', premios: 'Trofeo + Bs. 400' }],
  3: [{ id: 5, nombre: 'Torneo de Voleibol Sportika', deporte: 'Voleibol', fechaInicio: '8 Mar', fechaFin: '19 Mar', equipos: '0/10', inscripcionHasta: '4 Mar', precio: 120, desc: 'Torneo oficial de voleibol.', premios: 'Trofeo + Bs. 350' }],
  4: [{ id: 3, nombre: 'Championship Wally Cup', deporte: 'Wally', fechaInicio: '19 Feb', fechaFin: '24 Feb', equipos: '0/8', inscripcionHasta: '17 Feb', precio: 100, desc: 'El torneo de wally mas emocionante.', premios: 'Trofeo + Bs. 200' }],
  5: [{ id: 6, nombre: 'Open de Padel Sportika', deporte: 'Padel', fechaInicio: '31 Mar', fechaFin: '6 Abr', equipos: '0/18', inscripcionHasta: '27 Mar', precio: 80, desc: 'Torneo de padel en modalidad dobles.', premios: 'Trofeo + Bs. 250' }],
}

const ENTRENAMIENTOS_POR_EMPRESA = {
  1: [
    { id: 1, deporte: 'Futbol', nombre: 'Futbol Tecnico Avanzado',  entrenador: 'Prof. Mario Quispe', horario: 'Lun, Mie, Vie - 07:00 a 09:00', nivel: 'Avanzado',     precio: 150, cupos: 3, cupoMax: 12, polera: true,  precioPolera: 60, descripcion: 'Entrenamiento tecnico enfocado en control, pase y finalizacion para jugadores avanzados.' },
    { id: 2, deporte: 'Wally',  nombre: 'Wally para Principiantes', entrenador: 'Prof. Lucia Flores', horario: 'Mar, Jue - 18:00 a 20:00',       nivel: 'Principiante', precio: 100, cupos: 5, cupoMax: 10, polera: true,  precioPolera: 50, descripcion: 'Aprende las reglas y tecnicas basicas del wally desde cero con nuestra entrenadora.' },
    { id: 3, deporte: 'Padel',  nombre: 'Padel Intermedio',         entrenador: 'Prof. Carlos Rojas', horario: 'Sab - 09:00 a 12:00',            nivel: 'Intermedio',   precio: 120, cupos: 2, cupoMax: 8,  polera: false, precioPolera: 0,  descripcion: 'Clases de padel para jugadores con base. Trabajamos tactica de dobles y golpes tecnicos.' },
    { id: 10, deporte: 'Futbol', nombre: 'Escuela de Futbol Infantil', entrenador: 'Prof. Mario Quispe', horario: 'Sab, Dom - 09:00 a 11:00', nivel: 'Principiante', precio: 80, cupos: 6, cupoMax: 15, polera: true, precioPolera: 45, paraNinos: true, edadMin: 6, edadMax: 12, descripcion: 'Escuela de futbol para ninos de 6 a 12 anos. Tecnica, trabajo en equipo y valores deportivos.' },
  ],
  2: [
    { id: 4, deporte: 'Basquetbol', nombre: 'Basquetbol Infantil',  entrenador: 'Prof. Ana Lopez',   horario: 'Lun, Mie - 15:00 a 17:00',      nivel: 'Principiante', precio: 80,  cupos: 4, cupoMax: 15, polera: true,  precioPolera: 45, paraNinos: true, edadMin: 8, edadMax: 14, descripcion: 'Escuela de basquetbol para ninos de 8 a 14 anos.' },
    { id: 5, deporte: 'Basquetbol', nombre: 'Tecnica y Tiro Libre', entrenador: 'Prof. Roberto Paz', horario: 'Mar, Jue, Sab - 07:00 a 09:00', nivel: 'Intermedio',   precio: 130, cupos: 1, cupoMax: 10, polera: false, precioPolera: 0,  descripcion: 'Perfeccionamiento de tiro libre, bandeja y defensas individuales.' },
  ],
  3: [{ id: 6, deporte: 'Voleibol', nombre: 'Voleibol Mixto Recreativo', entrenador: 'Prof. Sandra Vega', horario: 'Lun, Vie - 18:00 a 20:00', nivel: 'Principiante', precio: 90, cupos: 6, cupoMax: 14, polera: true, precioPolera: 40, descripcion: 'Voleibol recreativo para adultos mixtos. Sin requisitos previos.' }],
  4: [
    { id: 7, deporte: 'Wally', nombre: 'Wally Competitivo', entrenador: 'Prof. Diego Ramos', horario: 'Mar, Jue, Sab - 06:00 a 08:00', nivel: 'Avanzado',     precio: 160, cupos: 2, cupoMax: 8,  polera: true,  precioPolera: 55, descripcion: 'Entrenamiento de alta intensidad para jugadores que compiten en torneos.' },
    { id: 8, deporte: 'Wally', nombre: 'Wally para Ninos',  entrenador: 'Prof. Elena Cruz',  horario: 'Mie, Vie - 17:00 a 19:00',       nivel: 'Principiante', precio: 90,  cupos: 7, cupoMax: 12, polera: true,  precioPolera: 40, paraNinos: true, edadMin: 6, edadMax: 12, descripcion: 'Introduccion al wally para ninos de 6 a 12 anos. Ambiente amigable y divertido.' },
  ],
  5: [{ id: 9, deporte: 'Padel', nombre: 'Padel Dobles Profesional', entrenador: 'Prof. Juan Torres', horario: 'Lun, Mie, Vie - 06:00 a 08:00', nivel: 'Avanzado', precio: 180, cupos: 1, cupoMax: 6, polera: true, precioPolera: 65, descripcion: 'Preparacion profesional para torneos de padel dobles. Alta exigencia tecnica.' }],
}

const DEPORTE_COLORES = {
  'Futbol': '#ef4444', 'Futbol 5': '#ef4444', 'Wally': '#00BCD4',
  'Basquetbol': '#f59e0b', 'Voleibol': '#22c55e', 'Padel': '#8b5cf6',
}

const PARTIDOS_POR_EMPRESA = {
  1: [
    { id: 1, deporte: 'Futbol 5', cancha: 'Cancha de Futbol Principal', cuando: 'Ahora mismo', jugadoresUnidos: ['Carlos M.','Pedro R.','Ana L.','Luis F.'], maxJugadores: 10, creadorId: 5, creador: 'Carlos M.', apuesta: 'Perdedores invitan refrescos' },
    { id: 2, deporte: 'Wally',    cancha: 'Cancha de Wally 1',          cuando: 'En 1 hora',   jugadoresUnidos: ['Luisa R.'], maxJugadores: 2, creadorId: 7, creador: 'Luisa R.', apuesta: null },
  ],
  2: [{ id: 3, deporte: 'Basquetbol', cancha: 'Cancha de Baloncesto', cuando: 'En 30 min', jugadoresUnidos: ['Ana L.','Mario S.'], maxJugadores: 10, creadorId: 8, creador: 'Ana L.', apuesta: null }],
  3: [], 4: [{ id: 4, deporte: 'Wally', cancha: 'Cancha de Wally 3', cuando: 'En 1 hora', jugadoresUnidos: ['Juan R.'], maxJugadores: 2, creadorId: 9, creador: 'Juan R.', apuesta: 'Perdedores invitan almuerzo' }], 5: [],
}

const RECOMPENSAS_POR_EMPRESA = {
  1: [
    { id: 1, nombre: 'Refresco gratis',         descripcion: 'Un refresco de tu eleccion',          puntos: 150,  stock: 20 },
    { id: 2, nombre: '1 hora de cancha gratis',  descripcion: 'Una hora de uso en cualquier cancha', puntos: 500,  stock: 5  },
    { id: 3, nombre: 'Descuento 20%',            descripcion: 'Aplica en tu proxima reserva',        puntos: 300,  stock: 10 },
    { id: 4, nombre: 'Kit deportivo Sportika',   descripcion: 'Camiseta + medias + botella oficial', puntos: 1000, stock: 3  },
  ],
  2: [
    { id: 1, nombre: 'Botella de agua gratis',   descripcion: 'Botella de agua fria en el gimnasio', puntos: 100, stock: 30 },
    { id: 2, nombre: '1 hora de cancha gratis',  descripcion: 'Una hora en la cancha de basquetbol', puntos: 400, stock: 8  },
  ],
  3: [{ id: 1, nombre: 'Snack gratis', descripcion: 'Un snack deportivo', puntos: 120, stock: 25 }],
  4: [
    { id: 1, nombre: 'Refresco gratis',      descripcion: 'Un refresco en las instalaciones', puntos: 150, stock: 20 },
    { id: 2, nombre: '1 hora cancha gratis', descripcion: 'Una hora en canchas de wally',     puntos: 400, stock: 5  },
  ],
  5: [{ id: 1, nombre: 'Refresco gratis', descripcion: 'Un refresco en las instalaciones', puntos: 150, stock: 15 }],
}

const NIVEL_COLORES = {
  'Principiante': { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e' },
  'Intermedio':   { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  'Avanzado':     { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
}

function generarSlots(horario) {
  const clean = horario.replace(/\s/g, '')
  const parts = clean.split('-')
  const h1 = parseInt(parts[0]); const h2 = parseInt(parts[1])
  const slots = []
  for (let h = h1; h < h2; h++) slots.push(String(h).padStart(2,'0') + ':00')
  return slots
}
function formatFecha(date) { return date.toISOString().split('T')[0] }
function labelDia(dateStr, hoyStr) {
  const d1 = new Date(dateStr + 'T12:00:00'); const d2 = new Date(hoyStr + 'T12:00:00')
  const diff = Math.round((d1 - d2) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Manana'
  const dias = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
  return dias[d1.getDay()] + ' ' + d1.getDate()
}
function slotFin(slot) { return String(parseInt(slot) + 1).padStart(2,'0') + ':00' }

const HOY = formatFecha(new Date())
const RESERVAS_INICIALES = {
  ['1_' + HOY + '_10:00']: 'ocupada',
  ['1_' + HOY + '_11:00']: 'ocupada',
  ['1_' + HOY + '_15:00']: 'pendiente',
  ['4_' + HOY + '_09:00']: 'ocupada',
  ['4_' + HOY + '_16:00']: 'pendiente',
}

export default function EmpresaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const empresa            = EMPRESAS.find(e => e.id === Number(id))
  const canchasBase        = CANCHAS_POR_EMPRESA[Number(id)] || []
  const torneos            = TORNEOS_POR_EMPRESA[Number(id)] || []
  const recompensas        = RECOMPENSAS_POR_EMPRESA[Number(id)] || []
  const entrenamientosBase = ENTRENAMIENTOS_POR_EMPRESA[Number(id)] || []

  const hoy = formatFecha(new Date())
  const fechas = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return formatFecha(d)
  })
  const puntosUsuario = 75
  const estaLogueado  = true

  const [tab, setTab]                     = useState('canchas')
  const [selectedFecha, setSelectedFecha] = useState(hoy)
  const [selectedSlots, setSelectedSlots] = useState({})
  const [reservasMock, setReservasMock]   = useState(RESERVAS_INICIALES)
  const [showReservaModal, setShowReservaModal] = useState(null)
  const [modalPaso, setModalPaso]               = useState(1)
  const [comprobanteNombre, setComprobanteNombre] = useState('')
  const [reservaExitosa, setReservaExitosa]       = useState(false)
  const [showLoginModal, setShowLoginModal]        = useState(false)
  const [showCrearPartido, setShowCrearPartido]    = useState(false)
  const [partidosState, setPartidosState] = useState(PARTIDOS_POR_EMPRESA[Number(id)] || [])
  const [verJugadores, setVerJugadores]   = useState(null)
  const [formDeporte, setFormDeporte]     = useState('')
  const [formCancha, setFormCancha]       = useState('')
  const [formCuando, setFormCuando]       = useState('Ahora mismo')
  const [formMax, setFormMax]             = useState(10)
  const [formApuesta, setFormApuesta]     = useState('')
  const [formHora, setFormHora]           = useState('08:00')
  const [formFechaPartido, setFormFechaPartido] = useState('')

  const [inscripcionModal, setInscripcionModal]         = useState(null)
  const [inscripcionPaso, setInscripcionPaso]           = useState(1)
  const [inscripcionPolera, setInscripcionPolera]       = useState(false)
  const [inscripcionTalla, setInscripcionTalla]         = useState('M')
  const [inscripcionComprobante, setInscripcionComprobante] = useState('')
  const [inscripcionesState, setInscripcionesState]     = useState({})
  const [inscripcionNinos, setInscripcionNinos]         = useState([{ nombre:'', quierePolera:false, talla:'M' }])

  const handleAccion = (cb) => { if (!estaLogueado) setShowLoginModal(true); else cb() }

  const getSlotEstado = (canchaId, fecha, slot) => reservasMock[canchaId+'_'+fecha+'_'+slot] || 'libre'
  const toggleSlot = (canchaId, slot) => {
    if (getSlotEstado(canchaId, selectedFecha, slot) !== 'libre') return
    setSelectedSlots(prev => {
      const cur = prev[canchaId] || []; const idx = cur.indexOf(slot)
      return { ...prev, [canchaId]: idx >= 0 ? cur.filter(s => s !== slot) : [...cur, slot] }
    })
  }
  const cerrarReserva = () => { setShowReservaModal(null); setModalPaso(1); setComprobanteNombre(''); setReservaExitosa(false) }
  const confirmarReserva = (cancha) => {
    const slots = selectedSlots[cancha.id] || []
    if (!slots.length || !comprobanteNombre) return
    setReservasMock(prev => { const n={...prev}; slots.forEach(s => { n[cancha.id+'_'+selectedFecha+'_'+s]='pendiente' }); return n })
    setSelectedSlots(prev => ({ ...prev, [cancha.id]: [] }))
    setReservaExitosa(true)
  }

  const abrirInscripcion = (ent) => {
    setInscripcionModal(ent); setInscripcionPaso(1)
    setInscripcionPolera(false); setInscripcionTalla('M')
    setInscripcionComprobante('')
    setInscripcionNinos([{ nombre:'', quierePolera:false, talla:'M' }])
  }
  const cerrarInscripcion = () => {
    setInscripcionModal(null); setInscripcionPaso(1)
    setInscripcionPolera(false); setInscripcionTalla('M')
    setInscripcionComprobante('')
    setInscripcionNinos([{ nombre:'', quierePolera:false, talla:'M' }])
  }
  const confirmarInscripcion = () => {
    if (!inscripcionComprobante) return
    setInscripcionesState(prev => ({ ...prev, [inscripcionModal.id]: 'pendiente' }))
    cerrarInscripcion()
  }
  const agregarNino    = () => setInscripcionNinos(prev => [...prev, { nombre:'', quierePolera:false, talla:'M' }])
  const quitarNino     = (idx) => setInscripcionNinos(prev => prev.filter((_,i) => i!==idx))
  const actualizarNino = (idx, campo, valor) => setInscripcionNinos(prev => prev.map((n,i) => i===idx ? {...n,[campo]:valor} : n))
  const totalPago = inscripcionModal
    ? (inscripcionModal.paraNinos
        ? inscripcionNinos.reduce((s,n) => s + inscripcionModal.precio + (n.quierePolera && inscripcionModal.polera ? inscripcionModal.precioPolera : 0), 0)
        : inscripcionModal.precio + (inscripcionPolera ? inscripcionModal.precioPolera : 0))
    : 0

  if (!empresa) {
    return (
      <Layout role="user">
        <div className="empty-state">
          <div className="empty-state-icon">X</div>
          <h3>Complejo no encontrado</h3>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/app/inicio')}>Volver</button>
        </div>
      </Layout>
    )
  }

  const slotsEmpresa = generarSlots(empresa.horario)

  return (
    <Layout role="user">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/inicio')}
        style={{ marginBottom:16, padding:'4px 0', color:'#00BCD4', fontSize:'0.82rem' }}>
        Volver a Complejos
      </button>

      <div className="card" style={{ marginBottom:24, overflow:'hidden' }}>
        <div style={{ display:'flex', gap:0 }}>
          <div style={{ width:180, minHeight:160, background:'linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, borderRight:'1px solid #2a2a2a' }}>
            <span style={{ fontSize:'4rem' }}>{empresa.emoji}</span>
          </div>
          <div style={{ padding:'20px 24px', flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <h1 style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'#f5f5f5' }}>{empresa.nombre}</h1>
              <span className="badge badge-success">Activo</span>
            </div>
            <p style={{ color:'#666', fontSize:'0.82rem', marginBottom:10 }}>{empresa.zona} - {empresa.direccion}</p>
            <p style={{ color:'#888', fontSize:'0.83rem', lineHeight:1.6, marginBottom:12 }}>{empresa.descripcion}</p>
            <div style={{ display:'flex', gap:20 }}>
              <span style={{ fontSize:'0.8rem', color:'#00BCD4' }}>{empresa.horario}</span>
              <span style={{ fontSize:'0.8rem', color:'#666' }}>{empresa.telefono}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #2a2a2a', marginBottom:24, overflowX:'auto' }}>
        {[
          { key:'canchas',        label:'Canchas (' + canchasBase.length + ')' },
          { key:'torneos',        label:'Torneos (' + torneos.length + ')' },
          { key:'entrenamientos', label:'Entrena (' + entrenamientosBase.length + ')' },
          { key:'partidos',       label:'Partidos (' + partidosState.length + ')' },
          { key:'recompensas',    label:'Puntos (' + recompensas.length + ')' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'12px 20px', background:tab===t.key?'rgba(139,0,0,0.2)':'transparent',
            color:tab===t.key?'#ff6b6b':'#666', border:'none',
            borderBottom:tab===t.key?'2px solid #8B0000':'2px solid transparent',
            cursor:'pointer', fontFamily:'Outfit', fontWeight:600, fontSize:'0.85rem',
            transition:'all 0.2s', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {tab==='canchas' && (
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
            {fechas.map(f => (
              <button key={f} onClick={() => { setSelectedFecha(f); setSelectedSlots({}) }} style={{
                padding:'8px 16px', borderRadius:10, cursor:'pointer', fontFamily:'Outfit', fontWeight:600, fontSize:'0.82rem', flexShrink:0,
                background:selectedFecha===f?'rgba(139,0,0,0.25)':'#1a1a1a',
                border:'1px solid '+(selectedFecha===f?'rgba(139,0,0,0.6)':'#2a2a2a'),
                color:selectedFecha===f?'#ff6b6b':'#666',
              }}>{labelDia(f,hoy)}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' }}>
            {[{color:'#555',label:'Libre'},{color:'#00BCD4',label:'Seleccionado'},{color:'#f59e0b',label:'Pendiente'},{color:'#ef4444',label:'Ocupado'}].map(l => (
              <span key={l.label} style={{ fontSize:'0.73rem', color:l.color, fontWeight:600 }}>{l.label}</span>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {canchasBase.map(cancha => {
              const slotsSelec = selectedSlots[cancha.id] || []
              const total = slotsSelec.length * cancha.precio
              return (
                <div key={cancha.id} className="card" style={{ padding:22, opacity:cancha.disponible?1:0.5 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:'2rem' }}>O</span>
                      <div>
                        <h3 style={{ color:'#f5f5f5', fontWeight:700, fontSize:'1rem', marginBottom:2 }}>{cancha.nombre}</h3>
                        <p style={{ color:'#666', fontSize:'0.78rem' }}>{cancha.deporte}</p>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#f59e0b' }}>Bs. {cancha.precio}/hr</span>
                      {slotsSelec.length>0 && <p style={{ fontSize:'0.75rem', color:'#00BCD4', marginTop:3, fontWeight:600 }}>{slotsSelec.length}h - Total: Bs. {total}</p>}
                    </div>
                  </div>
                  {cancha.disponible ? (
                    <div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:16 }}>
                        {slotsEmpresa.map(slot => {
                          const estado = getSlotEstado(cancha.id, selectedFecha, slot)
                          const isSel = slotsSelec.includes(slot)
                          let bg, border, color, cursor, opacity=1
                          if (isSel)                    { bg='rgba(0,188,212,0.18)'; border='#00BCD4';              color='#00BCD4'; cursor='pointer' }
                          else if (estado==='pendiente') { bg='rgba(245,158,11,0.1)'; border='rgba(245,158,11,0.45)';color='#f59e0b'; cursor='not-allowed'; opacity=0.7 }
                          else if (estado==='ocupada')   { bg='rgba(239,68,68,0.06)'; border='rgba(239,68,68,0.2)'; color='#555';    cursor='not-allowed'; opacity=0.45 }
                          else                           { bg='#1a1a1a';              border='#2a2a2a';              color='#888';    cursor='pointer' }
                          return (
                            <button key={slot} disabled={estado!=='libre'&&!isSel} onClick={() => toggleSlot(cancha.id, slot)}
                              style={{ padding:'7px 11px', borderRadius:9, fontFamily:'Outfit', fontWeight:600, fontSize:'0.76rem', background:bg, border:'1px solid '+border, color, cursor, opacity, transition:'all 0.15s' }}>
                              {slot} - {slotFin(slot)}
                            </button>
                          )
                        })}
                      </div>
                      <button onClick={() => handleAccion(() => { if(!slotsSelec.length) return; setShowReservaModal(cancha); setModalPaso(1); setComprobanteNombre(''); setReservaExitosa(false) })}
                        disabled={!slotsSelec.length}
                        style={{ width:'100%', padding:'14px', borderRadius:12, fontFamily:'Outfit', fontWeight:700, fontSize:'0.92rem',
                          cursor:slotsSelec.length?'pointer':'not-allowed',
                          background:slotsSelec.length?'#8B0000':'rgba(255,255,255,0.04)',
                          border:'1px solid '+(slotsSelec.length?'rgba(139,0,0,0.7)':'#2a2a2a'),
                          color:slotsSelec.length?'#fff':'#444', transition:'all 0.2s' }}>
                        {slotsSelec.length===0?'Selecciona un horario para reservar':'Reservar '+slotsSelec.length+' hora'+(slotsSelec.length>1?'s':'')+' - Bs. '+total}
                      </button>
                    </div>
                  ) : (
                    <p style={{ color:'#555', fontSize:'0.85rem' }}>Esta cancha no esta disponible por el momento.</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab==='torneos' && (
        <div>
          <div style={{ marginBottom:16, display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => handleAccion(() => navigate('/app/empresa/'+id+'/crear-torneo'))}
              style={{ padding:'10px 18px', background:'rgba(139,0,0,0.15)', border:'1px solid rgba(139,0,0,0.4)', borderRadius:10, color:'#ff6b6b', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:'Outfit' }}>
              Crear Torneo aqui
            </button>
          </div>
          {torneos.length===0 ? (
            <div className="empty-state"><div className="empty-state-icon">T</div><h3>Sin torneos activos</h3></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {torneos.map(t => (
                <div key={t.id} className="card">
                  <div className="card-body">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#f5f5f5', lineHeight:1.3 }}>{t.nombre}</h3>
                      <span className="badge badge-success" style={{ flexShrink:0, marginLeft:8 }}>Abierto</span>
                    </div>
                    <p style={{ fontSize:'0.78rem', color:'#666', marginBottom:10 }}>{t.desc}</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:10 }}>
                      <p style={{ fontSize:'0.78rem', color:'#666' }}>{t.fechaInicio} - {t.fechaFin}</p>
                      <p style={{ fontSize:'0.78rem', color:'#666' }}>{t.equipos} equipos</p>
                      <p style={{ fontSize:'0.78rem', color:'#666' }}>Hasta {t.inscripcionHasta}</p>
                    </div>
                    <div style={{ padding:'6px 10px', background:'rgba(245,158,11,0.08)', borderRadius:8, marginBottom:12 }}>
                      <p style={{ fontSize:'0.75rem', color:'#f59e0b', fontWeight:600 }}>{t.premios}</p>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-outline btn-sm w-full" style={{ justifyContent:'center' }} onClick={() => navigate('/app/torneos/'+t.id)}>Ver Detalles</button>
                      <button className="btn btn-primary btn-sm w-full" style={{ justifyContent:'center' }} onClick={() => handleAccion(() => navigate('/app/torneos/'+t.id+'/inscribir'))}>Inscribirse</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='entrenamientos' && (
        <div>
          <div style={{ padding:'10px 16px', background:'rgba(0,188,212,0.06)', border:'1px solid rgba(0,188,212,0.15)', borderRadius:10, marginBottom:20 }}>
            <p style={{ color:'#00BCD4', fontSize:'0.82rem' }}>Inscribete a cualquier entrenamiento. Tu lugar queda reservado una vez que el admin confirme tu pago.</p>
          </div>
          {entrenamientosBase.length===0 ? (
            <div className="empty-state"><div className="empty-state-icon">E</div><h3>Sin entrenamientos disponibles</h3></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
              {entrenamientosBase.map(ent => {
                const cuposLibres = ent.cupoMax - ent.cupos
                const estadoInsc  = inscripcionesState[ent.id]
                const nivCol      = NIVEL_COLORES[ent.nivel] || {}
                return (
                  <div key={ent.id} className="card" style={{ padding:20, border:estadoInsc?'1px solid rgba(34,197,94,0.3)':ent.paraNinos?'1px solid rgba(249,168,212,0.2)':'1px solid #2a2a2a' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <p style={{ fontSize:'0.73rem', color:'#00BCD4', fontWeight:600 }}>{ent.deporte}</p>
                          {ent.paraNinos && <span style={{ padding:'1px 7px', borderRadius:20, fontSize:'0.65rem', fontWeight:700, background:'rgba(249,168,212,0.15)', color:'#f9a8d4' }}>{ent.edadMin}-{ent.edadMax} anos</span>}
                        </div>
                        <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#f5f5f5', lineHeight:1.2 }}>{ent.nombre}</h3>
                      </div>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:nivCol.bg, color:nivCol.color, flexShrink:0, marginLeft:8 }}>{ent.nivel}</span>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'#888', lineHeight:1.5, marginBottom:12 }}>{ent.descripcion}</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                      <p style={{ fontSize:'0.8rem', color:'#666' }}>{ent.entrenador}</p>
                      <p style={{ fontSize:'0.8rem', color:'#666' }}>{ent.horario}</p>
                      <p style={{ fontSize:'0.8rem', color:cuposLibres<=2?'#ef4444':'#666' }}>
                        {ent.cupos}/{ent.cupoMax} inscriptos
                        {cuposLibres<=2&&cuposLibres>0&&<span style={{ color:'#ef4444', fontWeight:700 }}> - Solo {cuposLibres} cupo{cuposLibres>1?'s':''}!</span>}
                        {cuposLibres===0&&<span style={{ color:'#ef4444', fontWeight:700 }}> - LLENO</span>}
                      </p>
                      {ent.polera && <p style={{ fontSize:'0.78rem', color:'#f59e0b' }}>Polera disponible - Bs. {ent.precioPolera} opcional</p>}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#f59e0b' }}>Bs. {ent.precio}/mes{ent.paraNinos?' por nino':''}</span>
                      {estadoInsc==='pendiente' && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:700, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>Pendiente</span>}
                      {estadoInsc==='confirmado' && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:700, background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>Inscripto</span>}
                    </div>
                    {estadoInsc==='pendiente' ? (
                      <div style={{ padding:'10px 12px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, fontSize:'0.78rem', color:'#f59e0b' }}>
                        Comprobante enviado. Esperando confirmacion del admin.
                      </div>
                    ) : estadoInsc==='confirmado' ? (
                      <div style={{ padding:'10px 12px', background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:10, fontSize:'0.78rem', color:'#22c55e' }}>
                        Estas inscripto! Presenta este comprobante en tu primer entrenamiento.
                      </div>
                    ) : cuposLibres===0 ? (
                      <button disabled style={{ width:'100%', padding:'12px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.88rem', background:'#1a1a1a', border:'1px solid #2a2a2a', color:'#444', cursor:'not-allowed' }}>Sin cupos disponibles</button>
                    ) : (
                      <button onClick={() => handleAccion(() => abrirInscripcion(ent))}
                        style={{ width:'100%', padding:'12px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.88rem', background:ent.paraNinos?'rgba(249,168,212,0.15)':'#8B0000', border:'1px solid '+(ent.paraNinos?'rgba(249,168,212,0.4)':'rgba(139,0,0,0.7)'), color:ent.paraNinos?'#f9a8d4':'#fff', cursor:'pointer' }}>
                        {ent.paraNinos ? 'Inscribir a mis hijos - Bs. '+ent.precio+'/nino' : 'Inscribirme - Bs. '+ent.precio+'/mes'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='partidos' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ background:'rgba(139,0,0,0.08)', border:'1px solid rgba(139,0,0,0.2)', borderRadius:10, padding:'8px 14px' }}>
              <p style={{ color:'#ff6b6b', fontSize:'0.82rem' }}>Partidos en {empresa.nombre}</p>
            </div>
            <button className="btn btn-accent btn-sm" style={{ color:'#000' }} onClick={() => handleAccion(() => { setFormDeporte(''); setFormCancha(''); setFormCuando('Ahora mismo'); setFormMax(10); setFormApuesta(''); setFormHora('08:00'); setFormFechaPartido(''); setShowCrearPartido(true) })}>Crear partido</button>
          </div>
          {partidosState.length===0 ? (
            <div className="empty-state"><div className="empty-state-icon">P</div><h3>No hay partidos activos</h3><p>Se el primero en crear un partido espontaneo aqui</p></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {partidosState.map(p => {
                const unidos = p.jugadoresUnidos.length
                const lleno = unidos >= p.maxJugadores
                const casiLleno = !lleno && (p.maxJugadores - unidos) <= 2
                const soyCreador = p.creadorId === 99
                const color = DEPORTE_COLORES[p.deporte] || '#00BCD4'
                const yaUnido = p.jugadoresUnidos.includes('Juan Garcia')
                return (
                  <div key={p.id} className="card" style={{ padding:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#f5f5f5' }}>{p.deporte}</h3>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {casiLleno && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:'rgba(239,68,68,0.15)', color:'#ef4444' }}>Casi lleno!</span>}
                        {lleno && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:'rgba(100,100,100,0.15)', color:'#555' }}>Lleno</span>}
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:color+'22', color }}>{p.cuando}</span>
                      </div>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'#666', marginBottom:10 }}>{p.cancha}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:'0.78rem', color:'#666' }}>Jugadores confirmados</span>
                      <span style={{ fontSize:'0.88rem', fontWeight:700, color:lleno?'#ef4444':casiLleno?'#f59e0b':'#00BCD4' }}>{unidos}/{p.maxJugadores}</span>
                    </div>
                    <div style={{ height:7, background:'#2a2a2a', borderRadius:4, marginBottom:12, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:((unidos/p.maxJugadores)*100)+'%', background:lleno?'#ef4444':casiLleno?'#f59e0b':color, borderRadius:4, transition:'width 0.3s' }} />
                    </div>
                    {p.apuesta && (
                      <div style={{ padding:'6px 10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, marginBottom:10 }}>
                        <p style={{ fontSize:'0.75rem', color:'#f59e0b' }}>{p.apuesta}</p>
                      </div>
                    )}
                    <div style={{ marginTop:12, display:'flex', gap:8 }}>
                      {soyCreador ? (
                        <button style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', background:'rgba(0,188,212,0.1)', border:'1px solid rgba(0,188,212,0.3)', color:'#00BCD4' }}>
                          {unidos} unido{unidos!==1?'s':''}
                        </button>
                      ) : lleno ? (
                        <button disabled style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', background:'#1a1a1a', border:'1px solid #2a2a2a', color:'#444', cursor:'not-allowed' }}>Partido lleno</button>
                      ) : yaUnido ? (
                        <button onClick={() => setPartidosState(prev => prev.map(pt => pt.id===p.id?{...pt,jugadoresUnidos:pt.jugadoresUnidos.filter(j=>j!=='Juan Garcia')}:pt))}
                          style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444' }}>
                          Salir del partido
                        </button>
                      ) : (
                        <button onClick={() => handleAccion(() => setPartidosState(prev => prev.map(pt => pt.id===p.id?{...pt,jugadoresUnidos:[...pt.jugadoresUnidos,'Juan Garcia']}:pt)))}
                          style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', background:'rgba(0,188,212,0.15)', border:'1px solid rgba(0,188,212,0.4)', color:'#00BCD4' }}>
                          Unirse al partido
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='recompensas' && (
        <div>
          <div style={{ background:'linear-gradient(135deg,rgba(139,0,0,0.25) 0%,rgba(245,158,11,0.1) 100%)', border:'1px solid rgba(139,0,0,0.3)', borderRadius:14, padding:'18px 24px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ color:'#888', fontSize:'0.8rem', marginBottom:4 }}>Tus puntos disponibles</p>
              <p style={{ fontFamily:'Bebas Neue', fontSize:'2.2rem', color:'#f59e0b', lineHeight:1 }}>{puntosUsuario} pts</p>
              <p style={{ color:'#555', fontSize:'0.75rem', marginTop:4 }}>Ganas puntos reservando, en torneos y partidos</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ color:'#666', fontSize:'0.8rem', marginBottom:4 }}>Recompensas en</p>
              <p style={{ color:'#f5f5f5', fontWeight:700 }}>{empresa.nombre}</p>
            </div>
          </div>
          {recompensas.length===0 ? (
            <div className="empty-state"><div className="empty-state-icon">R</div><h3>Sin recompensas disponibles</h3></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {recompensas.map(r => {
                const puedesCanjear = puntosUsuario >= r.puntos
                return (
                  <div key={r.id} className="card" style={{ padding:20, opacity:puedesCanjear?1:0.6 }}>
                    <div style={{ marginBottom:12 }}>
                      <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'#f5f5f5', marginBottom:2 }}>{r.nombre}</h3>
                      <p style={{ fontSize:'0.75rem', color:'#666' }}>{r.stock} disponibles</p>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'#888', lineHeight:1.5, marginBottom:14 }}>{r.descripcion}</p>
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:puedesCanjear?'#f59e0b':'#555' }}>{r.puntos} pts</span>
                        {puedesCanjear?<span style={{ fontSize:'0.72rem', color:'#22c55e', fontWeight:600 }}>Puedes canjear</span>:<span style={{ fontSize:'0.72rem', color:'#555' }}>Te faltan {r.puntos-puntosUsuario} pts</span>}
                      </div>
                      <div style={{ height:5, background:'#2a2a2a', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:Math.min((puntosUsuario/r.puntos)*100,100)+'%', background:puedesCanjear?'#f59e0b':'#8B0000', borderRadius:3 }} />
                      </div>
                    </div>
                    <button className={'btn w-full '+(puedesCanjear?'btn-primary':'btn-outline')} style={{ justifyContent:'center', opacity:puedesCanjear?1:0.5 }} disabled={!puedesCanjear}>
                      {puedesCanjear?'Canjear Recompensa':'Necesitas '+r.puntos+' pts'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showReservaModal && (
        <div className="modal-overlay" onClick={cerrarReserva}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div className="modal-header">
              <h2 className="modal-title">{modalPaso===1?'Confirmar Reserva':'Pago y Comprobante'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={cerrarReserva}>x</button>
            </div>
            {reservaExitosa ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <h3 style={{ color:'#22c55e', fontFamily:'Bebas Neue', fontSize:'1.4rem', marginBottom:8 }}>Reserva Enviada!</h3>
                <p style={{ color:'#888', fontSize:'0.85rem', marginBottom:20 }}>Tu comprobante fue enviado. El admin confirmara tu reserva pronto.</p>
                <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={cerrarReserva}>Entendido</button>
              </div>
            ) : modalPaso===1 ? (
              <div>
                <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:16, marginBottom:18 }}>
                  <p style={{ color:'#f5f5f5', fontWeight:700, marginBottom:8 }}>{showReservaModal.nombre}</p>
                  <p style={{ fontSize:'0.82rem', color:'#666', marginBottom:10 }}>{labelDia(selectedFecha, hoy)} - {selectedFecha}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {(selectedSlots[showReservaModal.id]||[]).sort().map(s => (
                      <span key={s} style={{ padding:'4px 10px', background:'rgba(0,188,212,0.12)', border:'1px solid rgba(0,188,212,0.3)', borderRadius:8, fontSize:'0.78rem', color:'#00BCD4', fontWeight:600 }}>
                        {s} - {slotFin(s)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, marginBottom:20 }}>
                  <p style={{ fontSize:'0.75rem', color:'#888' }}>{(selectedSlots[showReservaModal.id]||[]).length} hora(s) x Bs. {showReservaModal.precio}</p>
                  <span style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f59e0b' }}>Total: Bs. {(selectedSlots[showReservaModal.id]||[]).length * showReservaModal.precio}</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={cerrarReserva}>Cancelar</button>
                  <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={() => setModalPaso(2)}>Continuar al pago</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ textAlign:'center', marginBottom:18 }}>
                  <p style={{ color:'#888', fontSize:'0.82rem', marginBottom:10 }}>Escanea el QR de pago de {empresa.nombre}</p>
                  <div style={{ width:160, height:160, background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)', border:'2px dashed #333', borderRadius:14, margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#555', fontSize:'0.8rem' }}>QR</span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{ padding:'8px 24px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, textAlign:'center' }}>
                    <p style={{ fontSize:'0.72rem', color:'#888', marginBottom:2 }}>Monto a pagar</p>
                    <p style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'#f59e0b' }}>Bs. {(selectedSlots[showReservaModal.id]||[]).length * showReservaModal.precio}</p>
                  </div>
                </div>
                <p style={{ fontSize:'0.82rem', color:'#888', fontWeight:600, marginBottom:10 }}>Sube tu comprobante de pago:</p>
                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'20px', border:'2px dashed '+(comprobanteNombre?'#22c55e':'#2a2a2a'), borderRadius:12, cursor:'pointer', background:comprobanteNombre?'rgba(34,197,94,0.06)':'rgba(255,255,255,0.02)', transition:'all 0.2s', marginBottom:18 }}>
                  <span style={{ fontSize:'0.82rem', color:comprobanteNombre?'#22c55e':'#555', fontWeight:600, textAlign:'center' }}>{comprobanteNombre||'Toca aqui para subir foto o PDF del pago'}</span>
                  <input type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={e => setComprobanteNombre(e.target.files[0]?.name||'')} />
                </label>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-outline" style={{ justifyContent:'center', flexShrink:0 }} onClick={() => setModalPaso(1)}>Atras</button>
                  <button onClick={() => confirmarReserva(showReservaModal)} disabled={!comprobanteNombre}
                    style={{ flex:1, padding:'13px', borderRadius:12, fontFamily:'Outfit', fontWeight:700, fontSize:'0.9rem', background:comprobanteNombre?'#8B0000':'#1a1a1a', border:'1px solid '+(comprobanteNombre?'rgba(139,0,0,0.7)':'#2a2a2a'), color:comprobanteNombre?'#fff':'#444', cursor:comprobanteNombre?'pointer':'not-allowed', transition:'all 0.2s' }}>
                    {comprobanteNombre?'Enviar Reserva':'Sube el comprobante para continuar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {inscripcionModal && (
        <div className="modal-overlay" onClick={cerrarInscripcion}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {inscripcionPaso===1
                  ? (inscripcionModal.paraNinos ? 'Inscripcion de ninos' : 'Inscripcion al entrenamiento')
                  : 'Pago y comprobante'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={cerrarInscripcion}>x</button>
            </div>

            {inscripcionPaso===1 && (
              <div>
                <div style={{ padding:14, background:'rgba(255,255,255,0.03)', borderRadius:12, marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div>
                      <p style={{ fontSize:'0.73rem', color:'#00BCD4', fontWeight:600, marginBottom:3 }}>{inscripcionModal.deporte}</p>
                      <p style={{ fontWeight:700, color:'#f5f5f5', fontSize:'1rem' }}>{inscripcionModal.nombre}</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:(NIVEL_COLORES[inscripcionModal.nivel]||{}).bg, color:(NIVEL_COLORES[inscripcionModal.nivel]||{}).color }}>{inscripcionModal.nivel}</span>
                      {inscripcionModal.paraNinos && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:'rgba(249,168,212,0.15)', color:'#f9a8d4' }}>{inscripcionModal.edadMin}-{inscripcionModal.edadMax} anos</span>}
                    </div>
                  </div>
                  <p style={{ fontSize:'0.78rem', color:'#666' }}>{inscripcionModal.entrenador} - {inscripcionModal.horario}</p>
                  <p style={{ fontSize:'0.78rem', color:'#888', marginTop:3 }}>Bs. {inscripcionModal.precio}/mes{inscripcionModal.paraNinos?' por nino':''}</p>
                </div>

                {inscripcionModal.paraNinos ? (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <p style={{ fontSize:'0.85rem', color:'#f5f5f5', fontWeight:600 }}>Ninos a inscribir</p>
                      <button onClick={agregarNino} style={{ padding:'4px 12px', background:'rgba(249,168,212,0.1)', border:'1px solid rgba(249,168,212,0.3)', borderRadius:8, color:'#f9a8d4', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Outfit', fontWeight:600 }}>
                        + Agregar otro nino
                      </button>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:18, maxHeight:320, overflowY:'auto' }}>
                      {inscripcionNinos.map((nino, idx) => (
                        <div key={idx} style={{ background:'rgba(249,168,212,0.04)', border:'1px solid rgba(249,168,212,0.15)', borderRadius:12, padding:'12px 14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                            <p style={{ fontSize:'0.78rem', color:'#f9a8d4', fontWeight:700 }}>Nino #{idx+1}</p>
                            {inscripcionNinos.length > 1 && (
                              <button onClick={() => quitarNino(idx)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.8rem', fontFamily:'Outfit' }}>Quitar</button>
                            )}
                          </div>
                          <div className="form-group" style={{ marginBottom:10 }}>
                            <label className="form-label" style={{ fontSize:'0.75rem' }}>Nombre completo del nino</label>
                            <input className="input" placeholder="Ej: Sebastian Garcia" value={nino.nombre} onChange={e => actualizarNino(idx,'nombre',e.target.value)} style={{ fontSize:'0.85rem' }} />
                          </div>
                          {inscripcionModal.polera && (
                            <div>
                              <p style={{ fontSize:'0.75rem', color:'#888', marginBottom:8 }}>Quiere polera? (+Bs. {inscripcionModal.precioPolera})</p>
                              <div style={{ display:'flex', gap:8, marginBottom:nino.quierePolera?8:0 }}>
                                <button type="button" onClick={() => actualizarNino(idx,'quierePolera',false)}
                                  style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit', fontSize:'0.8rem', background:!nino.quierePolera?'rgba(0,188,212,0.12)':'#1a1a1a', border:'1px solid '+(!nino.quierePolera?'#00BCD4':'#2a2a2a'), color:!nino.quierePolera?'#00BCD4':'#555' }}>
                                  Sin polera
                                </button>
                                <button type="button" onClick={() => actualizarNino(idx,'quierePolera',true)}
                                  style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit', fontSize:'0.8rem', background:nino.quierePolera?'rgba(245,158,11,0.12)':'#1a1a1a', border:'1px solid '+(nino.quierePolera?'rgba(245,158,11,0.5)':'#2a2a2a'), color:nino.quierePolera?'#f59e0b':'#555' }}>
                                  + Polera
                                </button>
                              </div>
                              {nino.quierePolera && (
                                <div>
                                  <p style={{ fontSize:'0.73rem', color:'#888', marginBottom:6 }}>Talla del nino:</p>
                                  <div style={{ display:'flex', gap:6 }}>
                                    {['XS','S','M','L','XL'].map(t => (
                                      <button key={t} type="button" onClick={() => actualizarNino(idx,'talla',t)}
                                        style={{ flex:1, padding:'6px 4px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit', fontSize:'0.78rem', fontWeight:700, background:nino.talla===t?'rgba(245,158,11,0.15)':'#1a1a1a', border:'1px solid '+(nino.talla===t?'rgba(245,158,11,0.5)':'#2a2a2a'), color:nino.talla===t?'#f59e0b':'#555' }}>
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ padding:'12px 16px', background:'rgba(249,168,212,0.06)', border:'1px solid rgba(249,168,212,0.2)', borderRadius:10, marginBottom:20 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <p style={{ fontSize:'0.75rem', color:'#888', marginBottom:2 }}>{inscripcionNinos.length} nino{inscripcionNinos.length>1?'s':''} x Bs. {inscripcionModal.precio}/mes</p>
                          {inscripcionNinos.some(n=>n.quierePolera) && <p style={{ fontSize:'0.75rem', color:'#888' }}>Poleras: {inscripcionNinos.filter(n=>n.quierePolera).length} x Bs. {inscripcionModal.precioPolera}</p>}
                        </div>
                        <span style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f9a8d4' }}>Total: Bs. {totalPago}</span>
                      </div>
                    </div>

                    <div style={{ display:'flex', gap:10 }}>
                      <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={cerrarInscripcion}>Cancelar</button>
                      <button className="btn btn-primary w-full" style={{ justifyContent:'center' }}
                        disabled={inscripcionNinos.some(n=>!n.nombre.trim())}
                        onClick={() => setInscripcionPaso(2)}>
                        Continuar al pago
                      </button>
                    </div>
                  </div>

                ) : (
                  <div>
                    {inscripcionModal.polera && (
                      <div style={{ marginBottom:18 }}>
                        <p style={{ fontSize:'0.82rem', color:'#f5f5f5', fontWeight:600, marginBottom:10 }}>Polera del entrenamiento</p>
                        <div style={{ display:'flex', gap:8, marginBottom:inscripcionPolera?10:0 }}>
                          <button type="button" onClick={() => setInscripcionPolera(false)}
                            style={{ flex:1, padding:'12px', borderRadius:10, cursor:'pointer', fontFamily:'Outfit', fontWeight:700, fontSize:'0.85rem', background:!inscripcionPolera?'rgba(0,188,212,0.15)':'#1a1a1a', border:'1px solid '+(!inscripcionPolera?'#00BCD4':'#2a2a2a'), color:!inscripcionPolera?'#00BCD4':'#555' }}>
                            Sin polera
                          </button>
                          <button type="button" onClick={() => setInscripcionPolera(true)}
                            style={{ flex:1, padding:'12px', borderRadius:10, cursor:'pointer', fontFamily:'Outfit', fontWeight:700, fontSize:'0.85rem', background:inscripcionPolera?'rgba(245,158,11,0.15)':'#1a1a1a', border:'1px solid '+(inscripcionPolera?'rgba(245,158,11,0.5)':'#2a2a2a'), color:inscripcionPolera?'#f59e0b':'#555' }}>
                            + Polera - Bs. {inscripcionModal.precioPolera}
                          </button>
                        </div>
                        {inscripcionPolera && (
                          <div style={{ marginBottom:10 }}>
                            <p style={{ fontSize:'0.75rem', color:'#888', marginBottom:6 }}>Selecciona tu talla:</p>
                            <div style={{ display:'flex', gap:6 }}>
                              {['XS','S','M','L','XL','XXL'].map(t => (
                                <button key={t} type="button" onClick={() => setInscripcionTalla(t)}
                                  style={{ flex:1, padding:'7px 2px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit', fontSize:'0.78rem', fontWeight:700, background:inscripcionTalla===t?'rgba(245,158,11,0.15)':'#1a1a1a', border:'1px solid '+(inscripcionTalla===t?'rgba(245,158,11,0.5)':'#2a2a2a'), color:inscripcionTalla===t?'#f59e0b':'#555' }}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, marginBottom:20 }}>
                      <div>
                        <p style={{ fontSize:'0.75rem', color:'#888', marginBottom:2 }}>Mensualidad: Bs. {inscripcionModal.precio}</p>
                        {inscripcionPolera && <p style={{ fontSize:'0.75rem', color:'#888' }}>Polera ({inscripcionTalla}): Bs. {inscripcionModal.precioPolera}</p>}
                      </div>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f59e0b' }}>Total: Bs. {totalPago}</span>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={cerrarInscripcion}>Cancelar</button>
                      <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={() => setInscripcionPaso(2)}>Continuar al pago</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {inscripcionPaso===2 && (
              <div>
                {inscripcionModal.paraNinos && (
                  <div style={{ background:'rgba(249,168,212,0.06)', border:'1px solid rgba(249,168,212,0.15)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
                    <p style={{ fontSize:'0.75rem', color:'#f9a8d4', fontWeight:600, marginBottom:6 }}>Ninos a inscribir:</p>
                    {inscripcionNinos.map((n,i) => (
                      <p key={i} style={{ fontSize:'0.75rem', color:'#ccc', marginBottom:2 }}>- {n.nombre}{n.quierePolera?' + polera talla '+n.talla:''}</p>
                    ))}
                  </div>
                )}
                <div style={{ textAlign:'center', marginBottom:18 }}>
                  <p style={{ color:'#888', fontSize:'0.82rem', marginBottom:10 }}>Escanea el QR de pago de {empresa.nombre}</p>
                  <div style={{ width:160, height:160, background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)', border:'2px dashed #333', borderRadius:14, margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#555', fontSize:'0.8rem' }}>QR</span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{ padding:'8px 24px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, textAlign:'center' }}>
                    <p style={{ fontSize:'0.72rem', color:'#888', marginBottom:2 }}>Monto a pagar</p>
                    <p style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'#f59e0b' }}>Bs. {totalPago}</p>
                  </div>
                </div>
                <p style={{ fontSize:'0.82rem', color:'#888', fontWeight:600, marginBottom:10 }}>Sube tu comprobante de pago:</p>
                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'20px', border:'2px dashed '+(inscripcionComprobante?'#22c55e':'#2a2a2a'), borderRadius:12, cursor:'pointer', background:inscripcionComprobante?'rgba(34,197,94,0.06)':'rgba(255,255,255,0.02)', transition:'all 0.2s', marginBottom:18 }}>
                  <span style={{ fontSize:'0.82rem', color:inscripcionComprobante?'#22c55e':'#555', fontWeight:600, textAlign:'center' }}>{inscripcionComprobante||'Toca aqui para subir foto o PDF del pago'}</span>
                  <input type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={e => setInscripcionComprobante(e.target.files[0]?.name||'')} />
                </label>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-outline" style={{ justifyContent:'center', flexShrink:0 }} onClick={() => setInscripcionPaso(1)}>Atras</button>
                  <button onClick={confirmarInscripcion} disabled={!inscripcionComprobante}
                    style={{ flex:1, padding:'13px', borderRadius:12, fontFamily:'Outfit', fontWeight:700, fontSize:'0.9rem', background:inscripcionComprobante?'#8B0000':'#1a1a1a', border:'1px solid '+(inscripcionComprobante?'rgba(139,0,0,0.7)':'#2a2a2a'), color:inscripcionComprobante?'#fff':'#444', cursor:inscripcionComprobante?'pointer':'not-allowed', transition:'all 0.2s' }}>
                    {inscripcionComprobante?'Enviar inscripcion':'Sube el comprobante para continuar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" style={{ maxWidth:380, textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f5f5f5', marginBottom:8 }}>Inicia Sesion para Continuar</h2>
            <p style={{ color:'#666', fontSize:'0.85rem', marginBottom:24, lineHeight:1.6 }}>Necesitas una cuenta para realizar esta accion.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={() => setShowLoginModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={() => navigate('/login')}>Iniciar Sesion</button>
            </div>
          </div>
        </div>
      )}

      {showCrearPartido && (
        <div className="modal-overlay" onClick={() => setShowCrearPartido(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:460 }}>
            <div className="modal-header">
              <h2 className="modal-title">Crear Partido Espontaneo</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCrearPartido(false)}>x</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Deporte</label>
                <select className="input" value={formDeporte} onChange={e => setFormDeporte(e.target.value)}>
                  <option value="">Selecciona deporte</option>
                  {empresa.deportes.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cancha</label>
                <select className="input" value={formCancha} onChange={e => setFormCancha(e.target.value)}>
                  <option value="">Selecciona cancha</option>
                  {canchasBase.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cuando?</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['Ahora mismo','En 30 min','En 1 hora','Manana','Otro dia'].map(op => (
                    <button key={op} type="button" onClick={() => setFormCuando(op)}
                      style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit', fontSize:'0.82rem', background:formCuando===op?'rgba(0,188,212,0.15)':'#1a1a1a', border:'1px solid '+(formCuando===op?'#00BCD4':'#2a2a2a'), color:formCuando===op?'#00BCD4':'#555' }}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
              {(formCuando==='Manana'||formCuando==='Otro dia') && (
                <div style={{ display:'flex', gap:10 }}>
                  {formCuando==='Otro dia' && (
                    <div className="form-group" style={{ flex:1, margin:0 }}>
                      <label className="form-label">Fecha</label>
                      <input className="input" type="date" value={formFechaPartido} onChange={e => setFormFechaPartido(e.target.value)} />
                    </div>
                  )}
                  <div className="form-group" style={{ flex:1, margin:0 }}>
                    <label className="form-label">Hora</label>
                    <input className="input" type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Jugadores necesarios</label>
                <input className="input" type="number" min={2} max={22} value={formMax} onChange={e => setFormMax(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Apuesta (opcional)</label>
                <input className="input" placeholder="Ej: Perdedores invitan refrescos" value={formApuesta} onChange={e => setFormApuesta(e.target.value)} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={() => setShowCrearPartido(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent:'center' }}
                  disabled={!formDeporte||!formCancha}
                  onClick={() => {
                    const cuando = formCuando==='Manana'?('Manana '+formHora):formCuando==='Otro dia'?(formFechaPartido+' '+formHora):formCuando
                    const nuevo = { id:Date.now(), deporte:formDeporte, cancha:formCancha, cuando, jugadoresUnidos:['Juan Garcia'], maxJugadores:formMax, creadorId:99, creador:'Juan Garcia', apuesta:formApuesta||null }
                    setPartidosState(prev => [nuevo,...prev])
                    setShowCrearPartido(false)
                  }}>
                  Publicar partido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
