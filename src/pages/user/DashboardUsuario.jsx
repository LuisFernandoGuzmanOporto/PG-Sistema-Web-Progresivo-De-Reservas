import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const PROXIMAS_RESERVAS = [
  { cancha: 'Cancha Fútbol Principal', empresa: 'Sport Center', fecha: 'Hoy, 15:00 - 16:00', estado: 'confirmada' },
  { cancha: 'Cancha de Wally 2', empresa: 'Complejo Deportivo Este', fecha: 'Mañana, 10:00 - 11:00', estado: 'pendiente' },
]
const PARTIDOS = [
  { deporte: 'Fútbol 5', cancha: 'Cancha Auxiliar 3', jugadores: '8/10', tiempo: 'Ahora' },
  { deporte: 'Baloncesto', cancha: 'Cancha Externa 1', jugadores: '6/10', tiempo: 'En 30min' },
]
const TORNEOS = [
  { nombre: 'Copa Sportika Fútbol 2025', deporte: 'Fútbol', equipos: '12/16', fecha: 'Hasta 10 Feb', estado: 'Abierto' },
  { nombre: 'Liga de Baloncesto', deporte: 'Básquetbol', equipos: '8/12', fecha: 'Hasta 15 Feb', estado: 'Abierto' },
]
const CANCHAS_DISPONIBLES = [
  { nombre: 'Cancha de Fútbol Principal', empresa: 'Sport Center', deporte: '⚽' },
  { nombre: 'Cancha de Baloncesto', empresa: 'Gimnasio Central', deporte: '🏀' },
  { nombre: 'Cancha de Wally 1', empresa: 'Complejo Deportivo Este', deporte: '🎾' },
]

export default function DashboardUsuario() {
  const navigate = useNavigate()

  return (
    <Layout role="user">
      {/* Welcome header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, rgba(0,188,212,0.08) 100%)', border: '1px solid #2a2a2a', borderRadius: 20, padding: 28, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 4 }}>¡Bienvenido, Juan! 👋</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>¿Qué quieres hacer hoy?</p>
        </div>
        <div className="points-badge" style={{ fontSize: '1.1rem', padding: '10px 18px' }}>
          ⭐ 75 puntos
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/app/reservas')}>🏟️ Reservar</button>
        <button className="btn btn-accent" style={{ color: '#000' }} onClick={() => navigate('/app/partidos')}>⚽ Crear Partido</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/partidos')}>🏃 Entrenamientos</button>
        <button className="btn btn-outline" onClick={() => navigate('/app/torneos')}>🏆 Torneos</button>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Próximas reservas */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>📅 Próximas Reservas</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/reservas')}>Ver todas</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            {PARTIDOS.map((p, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f5f5f5' }}>{p.deporte}</span>
                  <span className={`badge ${p.tiempo === 'Ahora' ? 'badge-error' : 'badge-warning'}`}>{p.tiempo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#666' }}>{p.cancha}</span>
                  <button className="btn btn-accent btn-sm" style={{ color: '#000', fontSize: '0.75rem', padding: '4px 12px' }}>Unirse</button>
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
            {TORNEOS.map((t, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a' }}>
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
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>75</span>
            </div>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 16 }}>25 puntos más para el siguiente nivel</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Tu reporte fue aprobado', pts: '+10', color: '#22c55e' },
              { label: 'Reserva confirmada', pts: '+15', color: '#22c55e' },
              { label: 'Te uniste a un partido', pts: '+20', color: '#22c55e' },
            ].map((item, i) => (
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
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/reservas')}>Ver todas</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CANCHAS_DISPONIBLES.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.3rem' }}>{c.deporte}</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>{c.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{c.empresa}</div>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm">Reservar</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(139,0,0,0.1) 0%, rgba(0,188,212,0.06) 100%)' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: 16 }}>🎯 Acciones Rápidas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🏟️', label: 'Reservar\nCancha', path: '/app/reservas', color: '#8B0000' },
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
