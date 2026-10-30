import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { TORNEOS as TODOS_LOS_TORNEOS, partidosVigentes,
         ESTADO_TORNEO, conteoEquipos, USUARIO_ACTUAL, aceptaInscripciones,
         misReservas, empresasActivas, canchasDeEmpresa,
         FORMAS_DE_GANAR_PUNTOS, nivelDe, torneosCreadosPor } from '../../lib/datos'
import { hoyISO } from '../../lib/agenda'
import { horaDelPartido } from '../../lib/horaDelPartido'
import { primeroMiDeporte, esMiDeporte, EMOJI_DEPORTE as EMOJI } from '../../lib/preferencias'

/**
 * Lo que se dice cuando una lista del tablero no tiene nada.
 *
 * Sin esto quedaba el titulo de la seccion y debajo el aire: el que entraba
 * sin ninguna reserva veia «Proximas Reservas» y nada, y no sabia si es que
 * no tenia ninguna o si la pantalla se habia colgado.
 */
const Vacio = ({ children }) => (
  <p style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.6, padding: '6px 2px' }}>
    {children}
  </p>
)

export default function DashboardUsuario() {
  const navigate = useNavigate()

  // Se calcula DENTRO del componente, no al cargar el archivo: los datos
  // llegan de Supabase despues de iniciar sesion, y una constante de modulo
  // se quedaria con los valores vacios del arranque.
  // Las proximas reservas del cliente, las mismas que estan en Mi Perfil
  // «Proximas» de verdad: desde hoy y en orden de fecha y hora. Antes se
  // tomaban las tres primeras de la lista tal como llegaban, y podia mostrar
  // una reserva de hace meses y dejar afuera la de manana.
  const hoy = hoyISO()

  // Lo que le falta para el siguiente nivel, con la misma cuenta que la
  // pantalla de Recompensas. Antes aquí decía «25 puntos» fijo.
  const nivel = nivelDe(USUARIO_ACTUAL.puntos)
  const faltanParaNivel = nivel.hasta === Infinity ? 0 : nivel.hasta - USUARIO_ACTUAL.puntos + 1

  // Los torneos que organiza y ya se están jugando: desde aquí entra directo a
  // su Mesa Técnica. Antes solo se llegaba por Torneos → Mis Torneos, y los que
  // organizaban un torneo no la encontraban.
  const MIS_MESAS = torneosCreadosPor().filter(t => t.estado === 'en_curso')

  // Si ya reservó antes, el aviso no le dice que nunca reservó
  const YA_RESERVO = misReservas().length > 0
  const PROXIMAS_RESERVAS = misReservas()
    .filter(r => (r.estado === 'pendiente' || r.estado === 'confirmada') && (r.fechaISO || '') >= hoy)
    .sort((a, b) => (a.fechaISO + a.horaInicio).localeCompare(b.fechaISO + b.horaInicio))
    .slice(0, 3)
    .map(r => ({
      cancha: r.cancha, empresa: r.empresa,
      fecha: r.fecha + ', ' + r.horaInicio + ' - ' + r.horaFin,
      estado: r.estado,
    }))

  // Partidos y torneos salen de la fuente unica (src/lib/datos.js)
  // Lo del deporte favorito va primero (lo elige en Mi Perfil)
  const FAV = USUARIO_ACTUAL.deporteFav || null
  const PARTIDOS = primeroMiDeporte(partidosVigentes()
    .filter(p => p.jugadoresUnidos.length < p.maxJugadores), FAV)
    .slice(0, 2)
    .map(p => ({
      id: p.id, deporte: p.deporte, cancha: p.cancha,
      jugadores: p.jugadoresUnidos.length + '/' + p.maxJugadores,
      tiempo: horaDelPartido(p.fechaHora),
    }))

  const TORNEOS = primeroMiDeporte(TODOS_LOS_TORNEOS.filter(aceptaInscripciones), FAV)
    .slice(0, 2)
    .map(t => ({
      id: t.id, nombre: t.nombre, deporte: t.deporte,
      equipos: conteoEquipos(t),
      fecha: 'Hasta ' + t.inscripcionHasta,
      estado: ESTADO_TORNEO[t.estado].corto,
    }))
  const EMOJI_DEPORTE = {
    'Fútbol': '⚽', 'Wally': '🎾', 'Básquetbol': '🏀',
    'Voleibol': '🏐', 'Pádel': '🏓',
  }

  // Canchas habilitadas ahora mismo, de los complejos activos
  const CANCHAS_DISPONIBLES = primeroMiDeporte(empresasActivas()
    .flatMap(e => canchasDeEmpresa(e.id)
      .filter(c => c.disponible)
      .map(c => ({ nombre: c.nombre, empresa: e.nombre, deporte: EMOJI_DEPORTE[c.deporte] || '🏟️',
                   nombreDeporte: c.deporte, empresa_id: e.id }))), FAV, c => c.nombreDeporte)
    .slice(0, 3)


  return (
    <Layout role="user">
      {/* Welcome header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, rgba(0,188,212,0.08) 100%)', border: '1px solid #2a2a2a', borderRadius: 20, padding: 28, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 4 }}>¡Bienvenido, {USUARIO_ACTUAL.nombre.split(' ')[0]}! 👋</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>¿Qué quieres hacer hoy?</p>
        </div>
        <div className="points-badge" style={{ fontSize: '1.1rem', padding: '10px 18px' }}>
          ⭐ {USUARIO_ACTUAL.puntos} puntos
        </div>
      </div>

      {/* El deporte favorito: qué se ve primero, o la invitación a elegirlo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        padding: '10px 14px', marginBottom: 18, borderRadius: 12,
        background: FAV ? 'rgba(0,188,212,0.06)' : 'rgba(245,158,11,0.06)',
        border: '1px solid ' + (FAV ? 'rgba(0,188,212,0.25)' : 'rgba(245,158,11,0.25)') }}>
        <p style={{ fontSize: '0.82rem', color: FAV ? '#00BCD4' : '#f59e0b', fontWeight: 600 }}>
          {FAV
            ? (EMOJI[FAV] || '🏅') + ' Te mostramos primero lo de ' + FAV + ', tu deporte favorito.'
            : '🏅 ¿Cuál es tu deporte? Elígelo en Mi Perfil y te mostramos primero lo tuyo.'}
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/perfil')}>
          {FAV ? 'Cambiar' : 'Elegir mi deporte'}
        </button>
      </div>

      {/* Quick actions */}
      <div className="accesos-rapidos" style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/app/inicio')}>🏟️ Reservar</button>
        <button className="btn btn-accent" style={{ color: '#000' }} onClick={() => navigate('/app/partidos')}>⚽ Crear Partido</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/entrenamientos')}>🏃 Entrenamientos</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/torneos')}>🏆 Torneos</button>
      </div>

      {MIS_MESAS.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 20, border: '1px solid rgba(239,68,68,0.35)', background: 'linear-gradient(135deg, rgba(139,0,0,0.18) 0%, #1a1a1a 70%)' }}>
          <p style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
            🎮 ERES ORGANIZADOR · MESA TÉCNICA
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MIS_MESAS.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{t.nombre}</span>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/torneos/${t.id}/mesa`)}>
                  Abrir Mesa Técnica
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Próximas reservas */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>📅 Próximas Reservas</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/perfil')}>Ver todas</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PROXIMAS_RESERVAS.length === 0 && (
              <Vacio>{YA_RESERVO ? 'No tienes reservas próximas.' : 'Todavía no reservaste ninguna cancha.'} Elige un complejo y busca un horario libre.</Vacio>
            )}
            {PROXIMAS_RESERVAS.map((r, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f5f5f5' }}>{r.cancha}</span>
                  <span className={`badge ${r.estado === 'confirmada' ? 'badge-success' : 'badge-warning'}`}>{r.estado}</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#666' }}>{r.fecha}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Partidos disponibles */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>⚡ Partidos Disponibles</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/partidos')}>Ver todos</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PARTIDOS.length === 0 && (
              <Vacio>No hay partidos abiertos ahora. Puedes crear uno y esperar a que se sumen.</Vacio>
            )}
            {PARTIDOS.map((p, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f5f5f5' }}>{p.deporte}</span>
                  <span className={`badge ${p.tiempo === 'Ahora' ? 'badge-error' : 'badge-warning'}`}>{p.tiempo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#666' }}>{p.cancha}</span>
                  <button className="btn btn-accent btn-sm" style={{ color: '#000', fontSize: '0.75rem', padding: '4px 12px' }} onClick={() => navigate('/app/partidos')}>Unirse</button>
                </div>
                <div style={{ marginTop: 8, height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(parseInt(p.jugadores)/parseInt(p.jugadores.split('/')[1]))*100}%`, background: '#00BCD4', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#00BCD4', marginTop: 2, display: 'block' }}>{p.jugadores} jugadores</span>
              </div>
            ))}
          </div>
        </div>

        {/* Torneos */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>🏆 Torneos Disponibles</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/torneos')}>Ver todos</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TORNEOS.length === 0 && (
              <Vacio>Ningún torneo tiene las inscripciones abiertas en este momento.</Vacio>
            )}
            {TORNEOS.map((t, i) => (
              <div key={i} onClick={() => navigate('/app/torneos/' + t.id)} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5', lineHeight: 1.3 }}>{t.nombre}</span>
                  <span className="badge badge-success" style={{ flexShrink: 0, marginLeft: 8 }}>{t.estado}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>👥 {t.equipos} equipos</span>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>📅 {t.fecha}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mis puntos */}
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(139,0,0,0.08) 100%)' }}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', marginBottom: 16 }}>⭐ Mis Puntos</h3>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '3px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>{USUARIO_ACTUAL.puntos}</span>
            </div>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 16 }}>
              {faltanParaNivel > 0 ? `${faltanParaNivel} ${faltanParaNivel === 1 ? 'punto' : 'puntos'} más para el siguiente nivel` : `Nivel ${nivel.nombre}: el más alto`}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FORMAS_DE_GANAR_PUNTOS.slice(0, 3).map((f, i) => ({
              label: f.accion, pts: '+' + f.puntos, color: '#22c55e',
            })).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#666', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>{item.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Canchas disponibles ahora */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="section-header">
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>🟢 Canchas Disponibles Ahora</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/inicio')}>Ver todas</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CANCHAS_DISPONIBLES.length === 0 && (
              <Vacio>Ninguna cancha figura habilitada en este momento.</Vacio>
            )}
            {CANCHAS_DISPONIBLES.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.3rem' }}>{c.deporte}</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>{c.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{c.empresa}</div>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/empresa/' + c.empresa_id)}>Reservar</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(139,0,0,0.1) 0%, rgba(0,188,212,0.06) 100%)' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: 16 }}>🎯 Acciones Rápidas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🏟️', label: 'Reservar\nCancha', path: '/app/inicio', color: '#8B0000' },
              { icon: '⚽', label: 'Crear\nPartido', path: '/app/partidos', color: '#00BCD4' },
              { icon: '🏆', label: 'Torneos', path: '/app/torneos', color: '#f59e0b' },
              { icon: '⭐', label: 'Mis\nPuntos', path: '/app/perfil', color: '#22c55e' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)} style={{
                padding: '16px 12px',
                background: `rgba(${item.color === '#8B0000' ? '139,0,0' : item.color === '#00BCD4' ? '0,188,212' : item.color === '#f59e0b' ? '245,158,11' : '34,197,94'},0.1)`,
                border: `1px solid ${item.color}33`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                fontFamily: 'Outfit'
              }}>
                <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc', whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
