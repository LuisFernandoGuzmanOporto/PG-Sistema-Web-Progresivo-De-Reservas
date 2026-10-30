import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { TORNEOS, ESTADO_TORNEO, estadoDeTorneo, conteoEquipos, torneosCreadosPor,
         torneosDondeParticipa, miEquipoEn, solicitudesPendientes,
         SOLICITUD_BADGE, aceptaInscripciones, solicitudDe,
         ESTADO_SOLICITUD, yaInscritoEn, puedeInscribirseEn, empresasConCanchas } from '../../lib/datos'
import { montoBs } from '../../lib/dinero'

export default function Torneos() {
  const navigate = useNavigate()

  // Se derivan de la fuente unica: nunca se escriben a mano
  // Un torneo aparece aqui solo si el complejo ya aprobo la cancha
  const disponibles   = TORNEOS.filter(aceptaInscripciones)

  // Los que ya arrancaron o ya terminaron. Son los que se miran, no los que se
  // juegan: hasta ahora un torneo desaparecia de esta pantalla en cuanto se
  // cerraban las inscripciones, y el que no jugaba no tenia forma de seguirlo
  // ni de ver como habia quedado.
  const enJuego = TORNEOS
    .filter(t => t.estado === 'en_curso' || t.estado === 'finalizado')
    .sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'en_curso' ? -1 : 1))
  const misTorneos    = torneosCreadosPor()
  const participacion = torneosDondeParticipa()
  const [tab, setTab] = useState('disponibles')
  const [showDetalle, setShowDetalle] = useState(null)
  const [showCrear, setShowCrear] = useState(false)


  return (
    <Layout role="user">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏆 Torneos Deportivos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Participa en torneos y crea tus propias competencias</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCrear(true)}>+ Crear Torneo</button>
      </div>

      {/* CTA banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.25) 0%, rgba(245,158,11,0.1) 100%)', border: '1px solid rgba(139,0,0,0.3)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 2 }}>🎯 ¡Organiza tu Propio Torneo!</p>
          <p style={{ color: '#888', fontSize: '0.82rem' }}>Crea competencias deportivas, invita equipos y gestiona todo desde aquí.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCrear(true)}>+ Crear Ahora</button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'disponibles' ? 'active' : ''}`} onClick={() => setTab('disponibles')}>Disponibles ({disponibles.length})</button>
        <button className={`tab ${tab === 'enjuego' ? 'active' : ''}`} onClick={() => setTab('enjuego')}>En juego y terminados ({enJuego.length})</button>
        <button className={`tab ${tab === 'participaciones' ? 'active' : ''}`} onClick={() => setTab('participaciones')}>Mis Participaciones ({participacion.length})</button>
        <button className={`tab ${tab === 'mis' ? 'active' : ''}`} onClick={() => setTab('mis')}>Mis Torneos ({misTorneos.length})</button>
      </div>

      {tab === 'disponibles' && (
        <>
          <div style={{ padding: '10px 14px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
            <p style={{ color: '#00BCD4', fontSize: '0.82rem' }}>🏅 Únete a la Competencia — Estos son los torneos donde puedes inscribir tu equipo y competir.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {disponibles.map(t => (
              <div key={t.id} className="card">
                <div className="cancha-img" style={{ height: 140 }}>
                  <span style={{ fontSize: '3rem' }}>{t.emoji}</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5', lineHeight: 1.3 }}>{t.nombre}</h3>
                    <span className="badge badge-success" style={{ flexShrink: 0, marginLeft: 8 }}>{estadoDeTorneo(t).corto}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 10, lineHeight: 1.5 }}>{t.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>📅 {t.fechaInicio} — {t.fechaFin}</p>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>🏢 {t.empresa}</p>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>👥 {conteoEquipos(t)} equipos inscritos</p>
                    <p style={{ fontSize: '0.78rem', color: '#666' }}>⏰ Inscripciones hasta {t.inscripcionHasta}</p>
                  </div>
                  {t.premios.primero && (
                    <div style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, marginBottom: 12 }}>
                      <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>🏅 Premios: {t.premios.primero}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}`)}>Ver Detalles</button>
                    <Inscripcion torneo={t} chico onInscribir={() => navigate(`/app/torneos/${t.id}/inscribir`)}>Inscribirse</Inscripcion>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'enjuego' && (
        enJuego.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <h3>Todavía no arrancó ninguno</h3>
            <p>Aquí van a aparecer los torneos en curso y los que ya terminaron.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: '#f59e0b', fontSize: '0.82rem' }}>
                👀 Puedes seguir cualquiera de estos torneos aunque no juegues: tabla, resultados y partidos en vivo.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {enJuego.map(t => {
                const badge = estadoDeTorneo(t)
                const enVivo = t.estado === 'en_curso'
                return (
                  <div key={t.id} className="card">
                    <div className="cancha-img" style={{ height: 140 }}>
                      <span style={{ fontSize: '3rem' }}>{t.emoji}</span>
                    </div>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5', lineHeight: 1.3 }}>{t.nombre}</h3>
                        <span className="badge" style={{ flexShrink: 0, marginLeft: 8, color: badge.color, background: badge.bg }}>{badge.corto}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                        <p style={{ fontSize: '0.78rem', color: '#666' }}>📅 {t.fechaInicio} — {t.fechaFin}</p>
                        <p style={{ fontSize: '0.78rem', color: '#666' }}>🏢 {t.empresa}</p>
                        <p style={{ fontSize: '0.78rem', color: '#666' }}>👥 {conteoEquipos(t)} equipos</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}`)}>Ver Detalles</button>
                        <button className="btn btn-primary btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}/en-vivo`)}>
                          {enVivo ? '🔴 En vivo' : '🏆 Resultados'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {tab === 'participaciones' && (
        participacion.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <h3>Torneos donde Participas</h3>
            <p style={{ color: '#555', fontSize: '0.82rem' }}>Inscribe tu equipo en algún torneo disponible para empezar a competir</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('disponibles')}>Ver Torneos Disponibles</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {participacion.map(t => {
              const eq = miEquipoEn(t)
              const sb = SOLICITUD_BADGE[eq.estado]
              return (
                <div key={t.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5' }}>{t.emoji} {t.nombre}</p>
                      <p style={{ fontSize: '0.78rem', color: '#666' }}>{t.empresa}</p>
                    </div>
                    <span className="badge" style={{ background: estadoDeTorneo(t).bg, color: estadoDeTorneo(t).color, flexShrink: 0 }}>
                      {estadoDeTorneo(t).corto}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'rgba(0,188,212,0.06)', borderRadius: 8, marginBottom: 12 }}>
                    <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: 2 }}>Mi equipo</p>
                    <p style={{ fontSize: '0.88rem', color: '#00BCD4', fontWeight: 700 }}>{eq.nombre}</p>
                    <p style={{ fontSize: '0.75rem', color: sb.color, marginTop: 4 }}>Inscripción: {sb.label}</p>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 12 }}>👥 {conteoEquipos(t)} equipos • 📅 desde {t.fechaInicio}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}`)}>Ver Torneo</button>
                    {t.estado === 'en_curso' && (
                      <button className="btn btn-primary btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}/en-vivo`)}>🔴 En Vivo</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'mis' && (
        misTorneos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <h3>Torneos que Organizas</h3>
            <p style={{ color: '#555', fontSize: '0.78rem' }}>Crea tu primer torneo y organiza competencias deportivas</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCrear(true)}>+ Crear mi Primer Torneo</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {misTorneos.map(t => {
              const pendientes = solicitudesPendientes(t).length
              return (
                <div key={t.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5' }}>{t.emoji} {t.nombre}</p>
                      <p style={{ fontSize: '0.78rem', color: '#666' }}>{t.empresa} • {t.formato}</p>
                    </div>
                    <span className="badge" style={{ background: estadoDeTorneo(t).bg, color: estadoDeTorneo(t).color, flexShrink: 0 }}>
                      {estadoDeTorneo(t).corto}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 6 }}>👥 {conteoEquipos(t)} equipos aprobados</p>
                  {t.creador_tipo === 'cliente' && solicitudDe(t).estado !== 'aprobada' && (
                    <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6,
                      background: ESTADO_SOLICITUD[solicitudDe(t).estado].bg }}>
                      <p style={{ fontSize: '0.76rem', fontWeight: 600, color: ESTADO_SOLICITUD[solicitudDe(t).estado].color }}>
                        {solicitudDe(t).estado === 'pendiente'
                          ? '⏳ Esperando que ' + t.empresa + ' apruebe la cancha'
                          : '✕ ' + t.empresa + ' rechazó la cancha'}
                      </p>
                      {solicitudDe(t).motivo && (
                        <p style={{ fontSize: '0.74rem', color: '#888', marginTop: 3 }}>{solicitudDe(t).motivo}</p>
                      )}
                    </div>
                  )}
                  {pendientes > 0 && (
                    <p style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginBottom: 6 }}>
                      ⏳ {pendientes} solicitud{pendientes > 1 ? 'es' : ''} por revisar
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}`)}>Gestionar</button>
                    {t.estado === 'en_curso' && (
                      <button className="btn btn-primary btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${t.id}/mesa`)}>🎮 Mesa</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal Ver Detalles */}
      {showDetalle && (
        <div className="modal-overlay" onClick={() => setShowDetalle(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{showDetalle.nombre}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetalle(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ color: '#888', lineHeight: 1.6 }}>{showDetalle.desc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Deporte', showDetalle.deporte], ['Empresa', showDetalle.empresa], ['Fechas', `${showDetalle.fechaInicio} - ${showDetalle.fechaFin}`], ['Equipos', conteoEquipos(showDetalle)], ['Inscripción hasta', showDetalle.inscripcionHasta], ['Precio', `Bs. ${montoBs(showDetalle.precio)}`]].map(([k, v]) => (
                  <div key={k} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: 2 }}>{k}</p>
                    <p style={{ fontSize: '0.88rem', color: '#f5f5f5', fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: 14, background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 10 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>💳 Pago de Inscripción con QR</p>
                <p style={{ color: '#666', fontSize: '0.78rem' }}>Tras inscribirte, recibirás el código QR del organizador para realizar el pago y subir tu comprobante.</p>
              </div>
              <Inscripcion torneo={showDetalle} onInscribir={() => navigate(`/app/torneos/${showDetalle.id}/inscribir`)}>
                Inscribir mi Equipo
              </Inscripcion>
            </div>
          </div>
        </div>
      )}

      {/* Crear torneo: se elige el complejo y sigue el asistente real */}
      {showCrear && (
        <div className="modal-overlay" onClick={() => setShowCrear(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">¿En qué complejo?</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>
                  Un torneo ocupa las canchas de un complejo, así que primero elige dónde quieres jugarlo
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCrear(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {empresasConCanchas().map(e => (
                <button key={e.id} onClick={() => navigate('/app/empresa/' + e.id + '/crear-torneo')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: '1.6rem' }}>{e.emoji}</span>
                  <span>
                    <span style={{ display: 'block', color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{e.nombre}</span>
                    <span style={{ display: 'block', color: '#666', fontSize: '0.75rem' }}>{e.zona} • {e.deportes.join(', ')}</span>
                  </span>
                </button>
              ))}
            </div>
            <p style={{ color: '#555', fontSize: '0.76rem', marginTop: 14 }}>
              ⏳ El complejo debe aprobar la cancha antes de que los equipos puedan inscribirse.
            </p>
          </div>
        </div>
      )}

    </Layout>
  )
}

/**
 * El botón para inscribirse o, si ya inscribió un equipo, en qué quedó. La
 * tarjeta seguía diciendo «Inscribirse» con el equipo esperando aprobación, y
 * recién al tocarlo avisaba que ya estaba inscrito.
 */
function Inscripcion({ torneo, chico, onInscribir, children }) {
  const equipo = yaInscritoEn(torneo)
  const tamano = chico ? ' btn-sm' : ''
  if (equipo) {
    const pendiente = equipo.estado === 'pendiente'
    const color = pendiente ? '#f59e0b' : '#22c55e'
    return (
      <div className={'w-full' + tamano} title={equipo.nombre}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
          padding: chico ? '6px 10px' : '10px 14px', fontSize: chico ? '0.78rem' : '0.86rem', fontWeight: 700,
          color, background: color + '18', border: '1px solid ' + color + '44', marginTop: chico ? 0 : 8 }}>
        {pendiente ? '⏳ Por aprobar' : '✓ Inscrito'}
      </div>
    )
  }
  if (!puedeInscribirseEn(torneo)) return null
  return (
    <button className={'btn btn-primary w-full' + tamano} style={{ justifyContent: 'center', marginTop: chico ? 0 : 8 }}
      onClick={onInscribir}>
      {children}
    </button>
  )
}
