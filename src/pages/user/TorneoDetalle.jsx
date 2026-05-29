import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const USUARIO_ACTUAL = { id: 99, nombre: 'Juan García' }

const TORNEOS = [
  {
    id: 1, creador_id: 99,
    nombre: 'Copa Sportika Fútbol 2025', deporte: '⚽ Fútbol', deporteKey: 'Fútbol',
    empresa: 'Sport Center', empresa_id: 1, cancha: 'Cancha Principal',
    fechaInicio: '14 Feb', fechaFin: '28 Feb', inscripcionHasta: '10 Feb',
    precio: 200, estado: 'en_curso',
    premios: { primero: 'Trofeo + Bs. 500', segundo: 'Trofeo + Bs. 300', tercero: 'Trofeo + Bs. 150' },
    desc: 'El torneo de fútbol más grande de Cochabamba. Equipos de todos los niveles compiten por la gloria.',
    formato: 'Grupos + Eliminación', jugadoresPorEquipo: 11, suplentes: 3, maxEquipos: 16,
    tieneAmarillas: true, tieneRojas: true, tieneGoles: true,
    reglas: [
      'Equipos mixtos permitidos (mínimo 2 mujeres por equipo)',
      'Mínimo 11 jugadores, máximo 14',
      'Partidos de 90 minutos (2 tiempos de 45 min)',
      'En caso de empate en eliminatoria: penales',
      'Tarjeta roja = suspensión del siguiente partido',
    ],
    calendario: [
      { fase: 'Fase de Grupos', desc: '4 grupos de 4 equipos', fecha: '14-16 Feb' },
      { fase: 'Cuartos de Final', desc: 'Eliminación directa', fecha: '19-20 Feb' },
      { fase: 'Semifinales', desc: 'Eliminación directa', fecha: '24 Feb' },
      { fase: 'Final', desc: 'Gran final + 3er puesto', fecha: '28 Feb' },
    ],
    horarios: 'Lunes a Viernes: 2:00 PM - 8:00 PM',
    equipos: [
      {
        id: 1, nombre: 'Los Cracks FC', capitan: 'Pedro Rojas', estado: 'aprobado', comprobante: 'comp1.jpg',
        jugadores: [
          { id: 1,  nombre: 'Pedro Rojas',   posicion: 'Portero',       habilitado: true  },
          { id: 2,  nombre: 'Carlos Mamani', posicion: 'Defensa',       habilitado: true  },
          { id: 3,  nombre: 'Luis Flores',   posicion: 'Defensa',       habilitado: true  },
          { id: 4,  nombre: 'Marco Quispe',  posicion: 'Mediocampista', habilitado: false },
          { id: 5,  nombre: 'Diego Vargas',  posicion: 'Mediocampista', habilitado: true  },
          { id: 6,  nombre: 'Alex Torrez',   posicion: 'Delantero',     habilitado: true  },
          { id: 7,  nombre: 'Juan Peredo',   posicion: 'Delantero',     habilitado: false },
          { id: 8,  nombre: 'René Copa',     posicion: 'Mediocampista', habilitado: true  },
          { id: 9,  nombre: 'Simón Arce',    posicion: 'Defensa',       habilitado: true  },
          { id: 10, nombre: 'Erick Mendez',  posicion: 'Defensa',       habilitado: true  },
          { id: 11, nombre: 'Abel Soliz',    posicion: 'Mediocampista', habilitado: true  },
          { id: 13, nombre: 'Omar Cruz',     posicion: 'Defensa',       habilitado: true  },
          { id: 14, nombre: 'Iván Medina',   posicion: 'Delantero',     habilitado: true  },
        ],
      },
      {
        id: 2, nombre: 'Deportivo Norte', capitan: 'Ana López', estado: 'aprobado', comprobante: 'comp2.jpg',
        jugadores: [
          { id: 15, nombre: 'Ana López',    posicion: 'Portero',       habilitado: true  },
          { id: 16, nombre: 'Fran Morales', posicion: 'Defensa',       habilitado: true  },
          { id: 17, nombre: 'Nico Reyes',   posicion: 'Mediocampista', habilitado: true  },
          { id: 18, nombre: 'Sara Blanco',  posicion: 'Delantero',     habilitado: true  },
          { id: 19, nombre: 'Camila Ríos',  posicion: 'Defensa',       habilitado: false },
          { id: 20, nombre: 'Luis Méndez',  posicion: 'Mediocampista', habilitado: true  },
          { id: 21, nombre: 'Jorge Paz',    posicion: 'Defensa',       habilitado: true  },
          { id: 22, nombre: 'René Alva',    posicion: 'Mediocampista', habilitado: true  },
          { id: 23, nombre: 'Mario Soto',   posicion: 'Delantero',     habilitado: true  },
          { id: 24, nombre: 'Óscar Tito',   posicion: 'Defensa',       habilitado: true  },
          { id: 25, nombre: 'Elena Coss',   posicion: 'Mediocampista', habilitado: true  },
        ],
      },
      { id: 3, nombre: 'Athletic Sur',  capitan: 'Roberto Chávez', estado: 'pendiente', comprobante: 'comp3.jpg', jugadores: [] },
      { id: 4, nombre: 'Team Rojo',     capitan: 'Sofía Vargas',   estado: 'pendiente', comprobante: null, jugadores: [] },
    ],
    partidos: [
      {
        id: 1, grupo: 'A', equipo1_id: 1, equipo1: 'Los Cracks FC',
        equipo2_id: 2, equipo2: 'Deportivo Norte',
        g1: 2, g2: 1, estado: 'en_vivo', hora: '15:00', cancha: 'Cancha Principal', minuto: 37,
        eventos: [
          { tipo: 'gol',      equipo_id: 1, equipo: 'Los Cracks FC',  jugador: 'Alex Torrez',  minuto: 12 },
          { tipo: 'amarilla', equipo_id: 2, equipo: 'Deportivo Norte', jugador: 'Nico Reyes',   minuto: 28 },
          { tipo: 'gol',      equipo_id: 2, equipo: 'Deportivo Norte', jugador: 'Sara Blanco',  minuto: 31 },
          { tipo: 'gol',      equipo_id: 1, equipo: 'Los Cracks FC',  jugador: 'Diego Vargas', minuto: 35 },
        ],
      },
      {
        id: 2, grupo: 'A', equipo1_id: 3, equipo1: 'Athletic Sur',
        equipo2_id: 4, equipo2: 'Team Rojo',
        g1: 0, g2: 0, estado: 'programado', hora: '17:00', cancha: 'Cancha Auxiliar', minuto: null, eventos: [],
      },
    ],
    posiciones: [
      { equipo_id: 1, equipo: 'Los Cracks FC',  pj: 1, pg: 1, pe: 0, pp: 0, gf: 2, gc: 1, pts: 3 },
      { equipo_id: 2, equipo: 'Deportivo Norte', pj: 1, pg: 0, pe: 0, pp: 1, gf: 1, gc: 2, pts: 0 },
      { equipo_id: 3, equipo: 'Athletic Sur',    pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 },
      { equipo_id: 4, equipo: 'Team Rojo',       pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 },
    ],
  },
  {
    id: 2, creador_id: 5,
    nombre: 'Liga de Baloncesto Sportika', deporte: '🏀 Básquetbol', deporteKey: 'Básquetbol',
    empresa: 'Gimnasio Central', empresa_id: 2, cancha: 'Cancha de Baloncesto',
    fechaInicio: '28 Feb', fechaFin: '14 Mar', inscripcionHasta: '24 Feb',
    precio: 150, estado: 'inscripciones',
    premios: { primero: 'Trofeo + Bs. 400', segundo: 'Medalla + Bs. 200', tercero: 'Medalla' },
    desc: 'Competencia de baloncesto para todos los niveles. Organizada por Gimnasio Central.',
    formato: 'Grupos + Eliminación', jugadoresPorEquipo: 5, suplentes: 3, maxEquipos: 12,
    tieneAmarillas: false, tieneRojas: false, tieneGoles: false,
    reglas: [
      'Partidos de 4 cuartos de 10 minutos',
      'Mínimo 5 jugadores por equipo, máximo 8',
      'En caso de empate: tiempo extra de 5 minutos',
    ],
    calendario: [
      { fase: 'Fase de Grupos', desc: '3 grupos de 4 equipos', fecha: '28 Feb - 5 Mar' },
      { fase: 'Semifinales', desc: 'Eliminación directa', fecha: '10-11 Mar' },
      { fase: 'Final', desc: 'Gran final', fecha: '14 Mar' },
    ],
    horarios: 'Martes y Jueves: 6:00 PM - 10:00 PM',
    equipos: [
      { id: 10, nombre: 'Baloncesto Élite', capitan: 'Marco Flores', estado: 'aprobado', comprobante: 'comp.jpg', jugadores: [] },
    ],
    partidos: [], posiciones: [],
  },
]

const ESTADO_BADGE = {
  inscripciones: { label: 'Inscripciones Abiertas', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  en_curso:      { label: '🔴 EN CURSO',             color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  finalizado:    { label: 'Finalizado',               color: '#666',    bg: 'rgba(100,100,100,0.12)'},
}

const SOLICITUD_BADGE = {
  aprobado:  { label: 'Aprobado',  color: '#22c55e' },
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  rechazado: { label: 'Rechazado', color: '#ef4444' },
}

export default function TorneoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [torneoData, setTorneoData] = useState(TORNEOS.find(t => t.id === Number(id)))
  const [tab, setTab] = useState('info')
  const [tabCreador, setTabCreador] = useState('solicitudes')
  const [partidoHabilitacion, setPartidoHabilitacion] = useState(null)
  const [modalComprobante, setModalComprobante] = useState(null)
  const [modalReprog, setModalReprog] = useState(null)
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [motivoReprog, setMotivoReprog] = useState('')

  if (!torneoData) {
    return (
      <Layout role="user">
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <h3>Torneo no encontrado</h3>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>← Volver</button>
        </div>
      </Layout>
    )
  }

  const soyCreador = torneoData.creador_id === USUARIO_ACTUAL.id
  const enCurso    = torneoData.estado === 'en_curso'
  const esBadge    = ESTADO_BADGE[torneoData.estado]

  const equiposAprobados  = torneoData.equipos.filter(e => e.estado === 'aprobado')
  const equiposPendientes = torneoData.equipos.filter(e => e.estado === 'pendiente')

  const goleadores = []
  torneoData.partidos.forEach(p => {
    p.eventos.filter(ev => ev.tipo === 'gol').forEach(ev => {
      const found = goleadores.find(g => g.jugador === ev.jugador)
      if (found) found.goles++
      else goleadores.push({ jugador: ev.jugador, equipo: ev.equipo, goles: 1 })
    })
  })
  goleadores.sort((a, b) => b.goles - a.goles)

  const aprobarEquipo  = id => setTorneoData(p => ({ ...p, equipos: p.equipos.map(e => e.id === id ? { ...e, estado: 'aprobado'  } : e) }))
  const rechazarEquipo = id => setTorneoData(p => ({ ...p, equipos: p.equipos.map(e => e.id === id ? { ...e, estado: 'rechazado' } : e) }))

  const toggleHabilitado = (equipoId, jugadorId) => {
    setTorneoData(p => ({
      ...p,
      equipos: p.equipos.map(eq =>
        eq.id === equipoId
          ? { ...eq, jugadores: eq.jugadores.map(j => j.id === jugadorId ? { ...j, habilitado: !j.habilitado } : j) }
          : eq
      ),
    }))
  }

  const iniciarPartidoDesdeHabilitacion = (partidoId) => {
    setTorneoData(p => ({
      ...p,
      partidos: p.partidos.map(pt =>
        pt.id === partidoId ? { ...pt, estado: 'en_vivo', minuto: 0 } : pt
      ),
    }))
    setPartidoHabilitacion(null)
  }

  const guardarReprogramacion = () => {
    setTorneoData(p => ({
      ...p,
      partidos: p.partidos.map(pt =>
        pt.id === modalReprog?.id ? { ...pt, hora: nuevaFecha, nota: motivoReprog || 'Reprogramado' } : pt
      ),
    }))
    setModalReprog(null); setNuevaFecha(''); setMotivoReprog('')
  }

  const partHab = partidoHabilitacion ? torneoData.partidos.find(pt => pt.id === partidoHabilitacion) : null
  const eq1Hab  = partHab ? torneoData.equipos.find(e => e.id === partHab.equipo1_id) : null
  const eq2Hab  = partHab ? torneoData.equipos.find(e => e.id === partHab.equipo2_id) : null
  const equiposPartidoHab = [eq1Hab, eq2Hab].filter(Boolean)

  const tabsBase = [
    { key: 'info',    label: 'Información' },
    { key: 'equipos', label: `Equipos (${equiposAprobados.length})` },
  ]
  if (enCurso) {
    tabsBase.push({ key: 'posiciones', label: '📊 Posiciones' })
    tabsBase.push({ key: 'envivo',     label: '🔴 En Vivo'    })
  } else if (torneoData.estado === 'inscripciones') {
    tabsBase.push({ key: 'calendario', label: 'Calendario' })
  }
  if (soyCreador) tabsBase.push({ key: 'admin', label: '⚙️ Administrar' })


  return (
    <Layout role="user">

      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem' }}>
            ← Volver
          </button>
          <span style={{ color: '#444', fontSize: '0.82rem', marginLeft: 8 }}>Detalle del Torneo</span>
        </div>
        {enCurso && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate(`/app/torneos/${torneoData.id}/en-vivo`)}
              style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
              🔴 En Vivo
            </button>
            {soyCreador && (
              <button onClick={() => navigate(`/app/torneos/${torneoData.id}/mesa`)}
                style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                ⚙️ Mesa Técnica
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card principal */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ width: 160, minHeight: 140, background: 'linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRight: '1px solid #2a2a2a' }}>
            <span style={{ fontSize: '4rem' }}>{torneoData.deporte.split(' ')[0]}</span>
          </div>
          <div style={{ padding: '18px 22px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f5f5f5', marginBottom: 4 }}>{torneoData.nombre}</h1>
                <p style={{ fontSize: '0.78rem', color: '#666' }}>📅 {torneoData.fechaInicio} — {torneoData.fechaFin} • 📍 {torneoData.empresa}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700, background: esBadge.bg, color: esBadge.color, marginBottom: 6 }}>
                  {esBadge.label}
                </span>
                <p style={{ fontSize: '0.8rem', color: '#888' }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{equiposAprobados.length}</span>
                  <span style={{ color: '#555' }}>/{torneoData.maxEquipos} equipos</span>
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6, marginBottom: 12 }}>{torneoData.desc}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {torneoData.estado === 'inscripciones' && (
                <button className="btn btn-primary" onClick={() => navigate(`/app/torneos/${torneoData.id}/inscribir`)}>
                  👥 Inscribir mi Equipo — Bs. {torneoData.precio}
                </button>
              )}
              {enCurso && (
                <button className="btn btn-primary" style={{ background: '#8B0000', border: 'none' }} onClick={() => navigate(`/app/torneos/${torneoData.id}/en-vivo`)}>
                  🔴 Ver En Vivo
                </button>
              )}
              {soyCreador && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
                  👑 Tú creaste este torneo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 24, overflowX: 'auto' }}>
        {tabsBase.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 22px', background: tab === t.key ? '#8B0000' : 'transparent',
            color: tab === t.key ? '#fff' : '#666', border: 'none',
            borderBottom: tab === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.88rem',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: INFO ══ */}
      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>○ Reglas del Torneo</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {torneoData.reglas.map((r, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B0000', flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: '0.83rem', color: '#bbb', lineHeight: 1.5 }}>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>👥 Composición</h3>
            <p style={{ fontSize: '0.88rem', color: '#bbb', marginBottom: 10 }}>{torneoData.jugadoresPorEquipo} titulares + {torneoData.suplentes} suplentes</p>
            <p style={{ fontSize: '0.8rem', color: '#00BCD4', fontWeight: 600, marginBottom: 4 }}>Formato</p>
            <p style={{ fontSize: '0.85rem', color: '#bbb', marginBottom: 14 }}>{torneoData.formato}</p>
            <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, marginBottom: 10 }}>
              <p style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>🏅 Premios</p>
              <p style={{ fontSize: '0.78rem', color: '#ccc' }}>🥇 {torneoData.premios.primero}</p>
              {torneoData.premios.segundo && <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>🥈 {torneoData.premios.segundo}</p>}
              {torneoData.premios.tercero && <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>🥉 {torneoData.premios.tercero}</p>}
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, marginBottom: 2 }}>⏰ Inscripciones hasta</p>
              <p style={{ fontSize: '0.92rem', color: '#ef4444', fontWeight: 700 }}>{torneoData.inscripcionHasta}</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: EQUIPOS ══ */}
      {tab === 'equipos' && (
        <div>
          {equiposAprobados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No hay equipos inscritos aún</h3>
              <p>Sé el primero en inscribir tu equipo</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(`/app/torneos/${torneoData.id}/inscribir`)}>👥 Inscribir mi Equipo</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {equiposAprobados.map(eq => (
                <div key={eq.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{eq.nombre}</p>
                      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>👤 {eq.capitan}</p>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✓ Aprobado</span>
                  </div>
                  {eq.jugadores.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Jugadores ({eq.jugadores.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {eq.jugadores.slice(0,5).map(j => (
                          <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#aaa' }}>
                            <span>{j.nombre}</span>
                            <span style={{ color: j.habilitado ? '#22c55e' : '#444' }}>{j.habilitado ? '✓' : '✗'}</span>
                          </div>
                        ))}
                        {eq.jugadores.length > 5 && <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 4 }}>+{eq.jugadores.length - 5} más...</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ══ TAB: POSICIONES ══ */}
      {tab === 'posiciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div>
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>📊 Tabla de Posiciones</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      {['#','Equipo','PJ','PG','PE','PP','GF','GC','Pts'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: '#555', fontWeight: 700, textAlign: h === 'Equipo' ? 'left' : 'center', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {torneoData.posiciones.map((pos, i) => (
                      <tr key={pos.equipo_id} style={{ borderBottom: '1px solid #1a1a1a', background: i < 2 ? 'rgba(139,0,0,0.06)' : 'transparent' }}>
                        <td style={{ padding: '10px', color: i < 2 ? '#8B0000' : '#555', fontWeight: 700, textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ padding: '10px', color: '#f5f5f5', fontWeight: 600 }}>{pos.equipo}</td>
                        {[pos.pj,pos.pg,pos.pe,pos.pp,pos.gf,pos.gc].map((v,j) => (
                          <td key={j} style={{ padding: '10px', color: '#888', textAlign: 'center' }}>{v}</td>
                        ))}
                        <td style={{ padding: '10px', color: '#f5f5f5', fontWeight: 700, textAlign: 'center', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{pos.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Goleadores */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>⚽ Goleadores</h3>
            {goleadores.length === 0 ? (
              <p style={{ color: '#555', fontSize: '0.82rem' }}>Sin goles registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {goleadores.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i === 0 ? 'rgba(139,0,0,0.12)' : '#1a1a1a', borderRadius: 8 }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#f5f5f5', fontWeight: 600 }}>{g.jugador}</p>
                      <p style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{g.equipo}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: i === 0 ? '#8B0000' : '#f5f5f5' }}>{g.goles}</span>
                      <span style={{ fontSize: '0.78rem', color: '#555' }}>gol{g.goles !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: EN VIVO ══ */}
      {tab === 'envivo' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5' }}>🔴 Partidos en Vivo</h3>
            <button className="btn btn-primary" onClick={() => navigate(`/app/torneos/${torneoData.id}/en-vivo`)}>Ver pantalla completa →</button>
          </div>
          {torneoData.partidos.filter(p => p.estado === 'en_vivo').length === 0 ? (
            <div className="empty-state" style={{ minHeight: 200 }}>
              <div className="empty-state-icon">⏰</div>
              <h3>Sin partidos en vivo ahora</h3>
              <p>Los partidos aparecerán aquí cuando comiencen</p>
            </div>
          ) : (
            torneoData.partidos.filter(p => p.estado === 'en_vivo').map(p => (
              <div key={p.id} className="card" style={{ padding: 20, marginBottom: 12, background: 'linear-gradient(135deg,rgba(139,0,0,0.18) 0%,#1a1a1a 60%)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>🔴 EN VIVO • {p.minuto}'</span>
                  <span style={{ fontSize: '0.72rem', color: '#555' }}>📍 {p.cancha}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo1}</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: '#f5f5f5', lineHeight: 1 }}>{p.g1} - {p.g2}</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo2}</p>
                </div>
                {p.eventos.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
                    {p.eventos.slice(-3).map((ev, i) => (
                      <p key={i} style={{ fontSize: '0.75rem', color: '#888', marginBottom: 3 }}>
                        {ev.tipo === 'gol' ? '⚽' : ev.tipo === 'amarilla' ? '🟨' : '🟥'} {ev.jugador} {ev.minuto ? `${ev.minuto}'` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {/* Próximos partidos */}
          {torneoData.partidos.filter(p => p.estado === 'programado').length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ color: '#666', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Próximos partidos</h4>
              {torneoData.partidos.filter(p => p.estado === 'programado').map(p => (
                <div key={p.id} className="card" style={{ padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#f5f5f5' }}>{p.equipo1} vs {p.equipo2}</span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.78rem', color: '#888' }}>🕐 {p.hora}</p>
                    <p style={{ fontSize: '0.72rem', color: '#555' }}>📍 {p.cancha}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: CALENDARIO ══ */}
      {tab === 'calendario' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {torneoData.calendario.map((c, i) => (
              <div key={i} className="card" style={{ padding: 18, borderLeft: '3px solid #8B0000' }}>
                <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 4 }}>{c.fase}</p>
                <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 8 }}>{c.desc}</p>
                <p style={{ fontSize: '0.78rem', color: '#00BCD4', fontWeight: 600 }}>📅 {c.fecha}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ══ TAB: ADMINISTRAR (solo creador) ══ */}
      {tab === 'admin' && soyCreador && (
        <div>
          {/* Sub-tabs del creador */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'solicitudes', label: `📋 Solicitudes (${equiposPendientes.length})` },
              { key: 'habilitacion', label: '✅ Habilitación Pre-Partido' },
              { key: 'fixture',     label: '📅 Fixture / Reprogramar' },
            ].map(t => (
              <button key={t.key} onClick={() => setTabCreador(t.key)} style={{
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.82rem',
                background: tabCreador === t.key ? '#8B0000' : '#1a1a1a',
                color: tabCreador === t.key ? '#fff' : '#666',
                border: tabCreador === t.key ? 'none' : '1px solid #2a2a2a',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Solicitudes */}
          {tabCreador === 'solicitudes' && (
            <div>
              {torneoData.equipos.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 200 }}>
                  <div className="empty-state-icon">📋</div>
                  <h3>Sin solicitudes aún</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {torneoData.equipos.map(eq => {
                    const badge = SOLICITUD_BADGE[eq.estado]
                    return (
                      <div key={eq.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{eq.nombre}</p>
                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, color: badge.color, background: `${badge.color}18` }}>{badge.label}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#666' }}>👤 Capitán: {eq.capitan} • {eq.jugadores.length} jugadores</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {eq.comprobante && (
                            <button onClick={() => setModalComprobante(eq)} style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 8, color: '#00BCD4', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                              🧾 Comprobante
                            </button>
                          )}
                          {eq.estado === 'pendiente' && (
                            <>
                              <button onClick={() => aprobarEquipo(eq.id)} style={{ padding: '7px 14px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 8, color: '#22c55e', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>✓ Aprobar</button>
                              <button onClick={() => rechazarEquipo(eq.id)} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>✗ Rechazar</button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Habilitación pre-partido */}
          {tabCreador === 'habilitacion' && (
            <div>
              {!partidoHabilitacion ? (
                /* Paso 1: seleccionar partido */
                <div>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>
                    Selecciona el partido para habilitar los jugadores antes de que inicie.
                  </p>
                  {torneoData.partidos.filter(p => p.estado === 'programado' || p.estado === 'en_vivo').length === 0 ? (
                    <div className="empty-state" style={{ minHeight: 200 }}>
                      <div className="empty-state-icon">📋</div>
                      <h3>Sin partidos pendientes</h3>
                      <p>No hay partidos programados para habilitar</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {torneoData.partidos.filter(p => p.estado === 'programado' || p.estado === 'en_vivo').map(p => {
                        const eq1 = torneoData.equipos.find(e => e.id === p.equipo1_id)
                        const eq2 = torneoData.equipos.find(e => e.id === p.equipo2_id)
                        const hab1 = eq1 ? eq1.jugadores.filter(j => j.habilitado).length : 0
                        const tot1 = eq1 ? eq1.jugadores.length : 0
                        const hab2 = eq2 ? eq2.jugadores.filter(j => j.habilitado).length : 0
                        const tot2 = eq2 ? eq2.jugadores.length : 0
                        return (
                          <div key={p.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo1} vs {p.equipo2}</span>
                                <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                                  background: p.estado === 'programado' ? 'rgba(100,100,100,0.12)' : 'rgba(239,68,68,0.12)',
                                  color: p.estado === 'programado' ? '#666' : '#ef4444',
                                }}>{p.estado === 'programado' ? '🕐 Programado' : '🔴 En Vivo'}</span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#555' }}>🕐 {p.hora} • 📍 {p.cancha}</p>
                              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                                <span style={{ fontSize: '0.72rem', color: hab1 === tot1 && tot1 > 0 ? '#22c55e' : '#f59e0b' }}>
                                  {p.equipo1}: {hab1}/{tot1} habilitados
                                </span>
                                <span style={{ fontSize: '0.72rem', color: hab2 === tot2 && tot2 > 0 ? '#22c55e' : '#f59e0b' }}>
                                  {p.equipo2}: {hab2}/{tot2} habilitados
                                </span>
                              </div>
                            </div>
                            <button onClick={() => setPartidoHabilitacion(p.id)} style={{ padding: '10px 18px', background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.4)', borderRadius: 10, color: '#ff6b6b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                              ✅ Habilitar jugadores →
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : partHab ? (
                /* Paso 2: habilitar jugadores del partido seleccionado */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <button onClick={() => setPartidoHabilitacion(null)} style={{ color: '#00BCD4', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', marginBottom: 4 }}>
                        ← Volver a partidos
                      </button>
                      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5' }}>
                        {partHab.equipo1} vs {partHab.equipo2} — {partHab.hora}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: '#555' }}>Marca los jugadores presentes. Solo los marcados con ✓ podran registrar goles y tarjetas.</p>
                    </div>
                    {partHab.estado === 'programado' && (
                      <button onClick={() => iniciarPartidoDesdeHabilitacion(partHab.id)} style={{ padding: '12px 22px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#ef4444', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
                        🔴 Iniciar Partido
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {equiposPartidoHab.map(eq => (
                      <div key={eq.id} className="card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>{eq.nombre}</p>
                          <span style={{ fontSize: '0.72rem', color: '#555' }}>
                            {eq.jugadores.filter(j => j.habilitado).length}/{eq.jugadores.length} presentes
                          </span>
                        </div>
                        {eq.jugadores.length === 0 ? (
                          <p style={{ color: '#555', fontSize: '0.82rem' }}>Sin jugadores registrados</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {eq.jugadores.map(j => (
                              <div key={j.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', borderRadius: 10, transition: 'all 0.15s',
                                background: j.habilitado ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)',
                                border: j.habilitado ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.12)',
                              }}>
                                <div>
                                  <p style={{ fontSize: '0.88rem', color: j.habilitado ? '#f5f5f5' : '#555', fontWeight: 600 }}>{j.nombre}</p>
                                  <p style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{j.posicion}</p>
                                </div>
                                <button onClick={() => toggleHabilitado(eq.id, j.id)} style={{
                                  width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                  fontSize: '1.1rem', fontWeight: 700, transition: 'all 0.15s',
                                  background: j.habilitado ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)',
                                  color: j.habilitado ? '#22c55e' : '#ef4444',
                                }}>
                                  {j.habilitado ? '✓' : '✗'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Fixture / Reprogramar */}
          {tabCreador === 'fixture' && (
            <div>
              {torneoData.partidos.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 200 }}>
                  <div className="empty-state-icon">📅</div>
                  <h3>Sin partidos programados</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {torneoData.partidos.map(p => (
                    <div key={p.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo1} {p.g1} - {p.g2} {p.equipo2}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: p.estado === 'en_vivo' ? 'rgba(239,68,68,0.12)' : p.estado === 'finalizado' ? 'rgba(34,197,94,0.1)' : '#1a1a1a',
                            color: p.estado === 'en_vivo' ? '#ef4444' : p.estado === 'finalizado' ? '#22c55e' : '#666',
                          }}>
                            {p.estado === 'en_vivo' ? '🔴 En Vivo' : p.estado === 'finalizado' ? '✅ Final' : '🕐 Prog.'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#666' }}>🕐 {p.hora} • 📍 {p.cancha}</p>
                        {p.nota && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 3 }}>📝 {p.nota}</p>}
                      </div>
                      {p.estado === 'programado' && (
                        <button onClick={() => { setModalReprog(p); setNuevaFecha(p.hora); setMotivoReprog('') }}
                          style={{ padding: '8px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#f59e0b', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          📅 Reprogramar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ══ MODAL: Comprobante ══ */}
      {modalComprobante && (
        <div className="modal-overlay" onClick={() => setModalComprobante(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">🧾 Comprobante de Pago</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalComprobante(null)}>✕</button>
            </div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: 14 }}>Equipo: <strong style={{ color: '#f5f5f5' }}>{modalComprobante.nombre}</strong></p>
            <div style={{ background: '#111', borderRadius: 10, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#444', fontSize: '0.85rem' }}>📷 {modalComprobante.comprobante}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { rechazarEquipo(modalComprobante.id); setModalComprobante(null) }}
                style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                ✗ Rechazar
              </button>
              <button onClick={() => { aprobarEquipo(modalComprobante.id); setModalComprobante(null) }}
                style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, color: '#22c55e', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                ✓ Aprobar Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Reprogramar partido ══ */}
      {modalReprog && (
        <div className="modal-overlay" onClick={() => setModalReprog(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">📅 Reprogramar Partido</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalReprog(null)}>✕</button>
            </div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: 16 }}>
              {modalReprog.equipo1} vs {modalReprog.equipo2}
            </p>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Nueva hora / fecha</label>
              <input className="input" type="text" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} placeholder="Ej: 18:00 — Sábado 22 Feb" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Motivo (opcional)</label>
              <textarea className="input" rows={3} value={motivoReprog} onChange={e => setMotivoReprog(e.target.value)} placeholder="Ej: Lluvia, cancha no disponible..." style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalReprog(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 10, color: '#666', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarReprogramacion} disabled={!nuevaFecha}
                style={{ flex: 1, padding: '12px', background: nuevaFecha ? 'rgba(245,158,11,0.15)' : '#1a1a1a', border: `1px solid ${nuevaFecha ? 'rgba(245,158,11,0.4)' : '#2a2a2a'}`, borderRadius: 10, color: nuevaFecha ? '#f59e0b' : '#444', cursor: nuevaFecha ? 'pointer' : 'not-allowed', fontFamily: 'Outfit', fontWeight: 700 }}>
                📅 Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
