import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const MIS_TORNEOS_CREADOS = [
  {
    id: 1, nombre: 'Copa Sportika Futbol 2025', deporte: 'Futbol', empresa: 'Sport Center',
    estado: 'en_curso', equiposAprobados: 8, maxEquipos: 16, pendientes: 2, fechaInicio: '14 Feb',
  },
]

const MIS_TORNEOS_INSCRITO = [
  {
    id: 2, nombre: 'Liga de Baloncesto Sportika', deporte: 'Basquetbol', empresa: 'Gimnasio Central',
    estado: 'inscripciones', miEquipo: 'Los Bulldogs', estadoInscripcion: 'aprobado',
    posicion: null, proximoPartido: null, fechaInicio: '28 Feb',
  },
  {
    id: 1, nombre: 'Copa Sportika Futbol 2025', deporte: 'Futbol', empresa: 'Sport Center',
    estado: 'en_curso', miEquipo: 'Los Cracks FC', estadoInscripcion: 'aprobado',
    posicion: 1, proximoPartido: { rival: 'Deportivo Norte', hora: '15:00', cancha: 'Cancha Principal' },
    fechaInicio: '14 Feb',
  },
]

const ESTADO_BADGE = {
  inscripciones: { label: 'Inscripciones', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  en_curso:      { label: 'En Curso',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  finalizado:    { label: 'Finalizado',     color: '#666',    bg: 'rgba(100,100,100,0.12)'},
}

const INSCRIPCION_BADGE = {
  aprobado:  { label: 'Aprobado',  color: '#22c55e' },
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  rechazado: { label: 'Rechazado', color: '#ef4444' },
}

export default function MiPerfil() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('perfil')

  return (
    <Layout role="user">
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 20 }}>Mi Perfil</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 24 }}>
        {[
          { key: 'perfil',  label: 'Perfil' },
          { key: 'torneos', label: 'Mis Torneos (' + (MIS_TORNEOS_CREADOS.length + MIS_TORNEOS_INSCRITO.length) + ')' },
          { key: 'puntos',  label: 'Puntos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 24px', background: tab === t.key ? '#8B0000' : 'transparent',
            color: tab === t.key ? '#fff' : '#666', border: 'none',
            borderBottom: tab === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.88rem',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: PERFIL ══ */}
      {tab === 'perfil' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>JG</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 4 }}>Juan Garcia</h2>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>juan@email.com</p>
            <span className="badge badge-success" style={{ marginBottom: 20 }}>Jugador Activo</span>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, color: '#f59e0b', fontWeight: 700 }}>
              75 puntos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Reservas', value: '12' },
                { label: 'Torneos', value: '3'  },
                { label: 'Partidos', value: '8'  },
                { label: 'Goles',   value: '5'  },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f5f5f5' }}>{s.value}</p>
                  <p style={{ fontSize: '0.72rem', color: '#555' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-outline w-full" style={{ justifyContent: 'center', marginTop: 20 }}>
              Editar Perfil
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>Informacion Personal</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Nombre completo', value: 'Juan Garcia' },
                  { label: 'Email', value: 'juan@email.com' },
                  { label: 'Telefono', value: '+591 70000000' },
                  { label: 'Ciudad', value: 'Cochabamba, Bolivia' },
                  { label: 'Deporte favorito', value: 'Futbol' },
                  { label: 'Miembro desde', value: 'Enero 2025' },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: '0.88rem', color: '#bbb' }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 14 }}>Historial de Actividad</h3>
              {[
                { icon: '📅', texto: 'Reservaste Cancha de Futbol Principal', tiempo: 'Hace 2 dias' },
                { icon: '🏆', texto: 'Te inscribiste en Copa Sportika Futbol 2025', tiempo: 'Hace 5 dias' },
                { icon: '⚽', texto: 'Participaste en partido espontaneo en Sport Center', tiempo: 'Hace 1 semana' },
                { icon: '⭐', texto: 'Ganaste 25 puntos por reserva', tiempo: 'Hace 2 dias' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{a.texto}</p>
                    <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{a.tiempo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: TORNEOS ══ */}
      {tab === 'torneos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Torneos que cree */}
          <div>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 14 }}>
              Torneos que cree ({MIS_TORNEOS_CREADOS.length})
            </h3>
            {MIS_TORNEOS_CREADOS.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <p style={{ color: '#555' }}>No has creado torneos aun</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MIS_TORNEOS_CREADOS.map(t => {
                  const badge = ESTADO_BADGE[t.estado]
                  return (
                    <div key={t.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{t.nombre}</p>
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          {t.pendientes > 0 && (
                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                              {t.pendientes} pendientes
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#666' }}>
                          {t.empresa} • {t.equiposAprobados}/{t.maxEquipos} equipos • Inicio: {t.fechaInicio}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate('/app/torneos/' + t.id)}
                          style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.25)', borderRadius: 8, color: '#00BCD4', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          Ver
                        </button>
                        <button onClick={() => navigate('/app/torneos/' + t.id)}
                          style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, color: '#f59e0b', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          Administrar
                        </button>
                        {t.estado === 'en_curso' && (
                          <button onClick={() => navigate('/app/torneos/' + t.id + '/mesa')}
                            style={{ padding: '7px 14px', background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.35)', borderRadius: 8, color: '#ff6b6b', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                            Mesa Tecnica
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Torneos donde estoy inscrito */}
          <div>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 14 }}>
              Torneos donde estoy inscrito ({MIS_TORNEOS_INSCRITO.length})
            </h3>
            {MIS_TORNEOS_INSCRITO.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <p style={{ color: '#555' }}>No estas inscrito en ningun torneo</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MIS_TORNEOS_INSCRITO.map(t => {
                  const estadoBadge = ESTADO_BADGE[t.estado]
                  const inscBadge = INSCRIPCION_BADGE[t.estadoInscripcion]
                  return (
                    <div key={t.id} className="card" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{t.nombre}</p>
                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}>{estadoBadge.label}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#666' }}>
                            {t.empresa} • Mi equipo: <strong style={{ color: '#bbb' }}>{t.miEquipo}</strong>
                          </p>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: inscBadge.color, background: inscBadge.color + '18' }}>
                          {inscBadge.label}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
                        {t.posicion !== null && (
                          <div style={{ padding: '10px 14px', background: t.posicion <= 2 ? 'rgba(34,197,94,0.08)' : '#1a1a1a', border: '1px solid ' + (t.posicion <= 2 ? 'rgba(34,197,94,0.2)' : '#2a2a2a'), borderRadius: 10 }}>
                            <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Posicion</p>
                            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: t.posicion <= 2 ? '#22c55e' : '#f5f5f5', lineHeight: 1 }}>
                              #{t.posicion}
                            </p>
                          </div>
                        )}
                        {t.proximoPartido && (
                          <div style={{ padding: '10px 14px', background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.2)', borderRadius: 10 }}>
                            <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Proximo Partido</p>
                            <p style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600 }}>vs {t.proximoPartido.rival}</p>
                            <p style={{ fontSize: '0.72rem', color: '#888', marginTop: 2 }}>{t.proximoPartido.hora} - {t.proximoPartido.cancha}</p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate('/app/torneos/' + t.id)}
                          style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.25)', borderRadius: 8, color: '#00BCD4', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          Ver Torneo
                        </button>
                        {t.estado === 'en_curso' && (
                          <button onClick={() => navigate('/app/torneos/' + t.id + '/en-vivo')}
                            style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                            En Vivo
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: PUNTOS ══ */}
      {tab === 'puntos' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.25) 0%, rgba(245,158,11,0.1) 100%)', border: '1px solid rgba(139,0,0,0.3)', borderRadius: 14, padding: '24px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 4 }}>Tus puntos totales</p>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: '#f59e0b', lineHeight: 1 }}>75 pts</p>
              <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 4 }}>Nivel: Jugador Regular</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 4 }}>Proximo nivel</p>
              <p style={{ color: '#f5f5f5', fontWeight: 700 }}>Jugador Pro</p>
              <p style={{ color: '#555', fontSize: '0.75rem' }}>Necesitas 25 pts mas</p>
            </div>
          </div>
          <div style={{ height: 8, background: '#2a2a2a', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '75%', background: 'linear-gradient(90deg,#8B0000,#f59e0b)', borderRadius: 4 }} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>Historial de Puntos</h3>
            {[
              { accion: 'Reserva de cancha', puntos: '+25', tiempo: 'Hace 2 dias',  color: '#22c55e' },
              { accion: 'Participacion en torneo', puntos: '+50', tiempo: 'Hace 5 dias', color: '#22c55e' },
              { accion: 'Partido espontaneo', puntos: '+10', tiempo: 'Hace 1 semana', color: '#22c55e' },
              { accion: 'Canje de recompensa', puntos: '-100', tiempo: 'Hace 10 dias', color: '#ef4444' },
              { accion: 'Referido nuevo usuario', puntos: '+20', tiempo: 'Hace 2 semanas', color: '#22c55e' },
            ].map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? '1px solid #1a1a1a' : 'none' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: '#bbb' }}>{h.accion}</p>
                  <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{h.tiempo}</p>
                </div>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: h.color }}>{h.puntos}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </Layout>
  )
}
