import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const NAV_LINKS = ['Canchas', 'Torneos', 'Partidos', 'Recompensas']

const FEATURES = [
  {
    icon: '🏟️',
    title: 'Reserva Canchas',
    desc: 'Encuentra y reserva canchas deportivas en Cochabamba en segundos.',
    color: '#8B0000',
    items: ['Disponibilidad en tiempo real', 'Pago QR seguro', 'Confirmación instantánea']
  },
  {
    icon: '⚽',
    title: 'Organiza Partidos',
    desc: 'Crea o únete a partidos espontáneos cerca de ti.',
    color: '#00BCD4',
    items: ['Partidos por deporte', 'Cupos disponibles', 'Apuestas sociales']
  },
  {
    icon: '🏆',
    title: 'Torneos',
    desc: 'Compite en torneos oficiales y gana premios reales.',
    color: '#f59e0b',
    items: ['Inscripción de equipos', 'Tabla de posiciones', 'Premios en efectivo']
  },
  {
    icon: '⭐',
    title: 'Gana Puntos',
    desc: 'Acumula puntos por cada actividad y canjéalos por beneficios.',
    color: '#22c55e',
    items: ['Puntos por reservas', 'Puntos por torneos', 'Descuentos exclusivos']
  }
]

const SPORTS = ['⚽ Fútbol', '🏐 Voleibol', '🏀 Básquetbol', '🎾 Tenis', '🏸 Wally', '🎯 Pádel', '🏓 Frontón', '🏃 Futsal']

export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh' }}>

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          SPORT<span>IKA</span>
        </div>
        <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="flex gap-6" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ color: '#999', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#f5f5f5'}
                onMouseLeave={e => e.target.style.color = '#999'}
              >{l}</a>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>Iniciar Sesión</button>
          <button className="btn btn-accent btn-sm" onClick={() => navigate('/login')}>Registrarse</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-bg" style={{ paddingTop: 140, paddingBottom: 100, minHeight: '92vh', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div style={{ animation: 'fadeIn 0.7s ease' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00BCD4', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
              <span style={{ fontSize: '0.8rem', color: '#00BCD4', fontWeight: 600 }}>Cochabamba, Bolivia</span>
            </div>

            <h1 className="display-xl" style={{ color: '#f5f5f5', marginBottom: 8, fontFamily: 'Bebas Neue, sans-serif', lineHeight: 0.9 }}>
              EL DEPORTE
            </h1>
            <h1 className="display-xl gradient-text" style={{ marginBottom: 8, lineHeight: 0.9 }}>
              EN TUS
            </h1>
            <h1 className="display-xl" style={{ color: '#f5f5f5', marginBottom: 24, lineHeight: 0.9 }}>
              MANOS
            </h1>

            <p style={{ color: '#999', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 460, marginBottom: 36 }}>
              Reserva canchas, organiza partidos espontáneos y compite en torneos deportivos — todo desde una sola plataforma.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-accent btn-lg" onClick={() => navigate('/login')}>
                🚀 Comenzar Gratis
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
                Ver Canchas
              </button>
            </div>

            <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
              {[['500+', 'Usuarios'], ['50+', 'Canchas'], ['200+', 'Partidos']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>{n}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero right - Sports grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, animation: 'fadeIn 0.9s ease' }}>
            {SPORTS.map((sport, i) => (
              <div key={sport} className="card" style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: i % 3 === 0 ? 'rgba(139,0,0,0.15)' : i % 3 === 1 ? 'rgba(0,188,212,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i % 3 === 0 ? 'rgba(139,0,0,0.3)' : i % 3 === 1 ? 'rgba(0,188,212,0.2)' : 'rgba(255,255,255,0.06)'}`,
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'default',
                animationDelay: `${i * 0.05}s`
              }}>
                <span style={{ fontSize: '1.3rem' }}>{sport.split(' ')[0]}</span>
                <span style={{ color: '#ccc' }}>{sport.split(' ')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '100px 0', background: '#0f0f0f' }}>
        <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 className="display-md" style={{ fontFamily: 'Bebas Neue', color: '#f5f5f5', marginBottom: 12 }}>
              TODO LO QUE NECESITAS
            </h2>
            <p style={{ color: '#666', fontSize: '1rem' }}>Una plataforma completa para el deporte en Cochabamba</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="card" style={{ padding: 28, animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: f.color + '22', border: `1px solid ${f.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: 1, color: '#f5f5f5', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: '#777', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 16 }}>{f.desc}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#999' }}>
                      <span style={{ color: f.color, fontWeight: 700 }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(135deg, #1a0000 0%, #001a1a 100%)', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
        <div className="container" style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 className="display-md" style={{ fontFamily: 'Bebas Neue', color: '#f5f5f5', marginBottom: 16 }}>
            ¿LISTO PARA JUGAR?
          </h2>
          <p style={{ color: '#777', marginBottom: 36, fontSize: '1rem' }}>
            Únete a Sportika y sé parte de la comunidad deportiva de Cochabamba
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-accent btn-lg" onClick={() => navigate('/login')}>
              Crear Cuenta Gratis
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
              Iniciar Sesión
            </button>
          </div>
        </div>
      </section>

      {/* REGISTRO EMPRESA */}
      <section style={{ padding: '80px 0', background: '#0f0f0f' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.18) 0%, rgba(0,188,212,0.08) 100%)', border: '1px solid rgba(139,0,0,0.3)', borderRadius: 24, padding: '52px 60px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 40 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '5px 14px', marginBottom: 18 }}>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>🏢 PARA EMPRESAS DEPORTIVAS</span>
              </div>
              <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#f5f5f5', marginBottom: 12, lineHeight: 1 }}>
                ¿TENÉS UN COMPLEJO DEPORTIVO?
              </h2>
              <p style={{ color: '#888', fontSize: '1rem', lineHeight: 1.7, maxWidth: 520, marginBottom: 20 }}>
                Registrá tu empresa en Sportika y llegá a cientos de jugadores en Cochabamba. Gestioná tus canchas, reservas, torneos y entrenamientos desde un solo panel.
              </p>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {['Gestión de reservas y pagos QR', 'Panel de administración completo', 'Visibilidad ante toda la comunidad'].map(b => (
                  <span key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#666' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {b}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/registro-empresa')}
                style={{ whiteSpace: 'nowrap', fontSize: '1rem' }}
              >
                🏢 Registrar mi empresa
              </button>
              <p style={{ color: '#444', fontSize: '0.75rem', textAlign: 'center' }}>Gratis — el equipo Sportika lo revisará</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 24px', background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div className="logo" style={{ fontSize: '1.4rem' }}>SPORT<span>IKA</span></div>
          <p style={{ color: '#444', fontSize: '0.8rem' }}>© 2025 Sportika — Cochabamba, Bolivia</p>
          <div style={{ display: 'flex', gap: 16 }}>
            {['Reservas', 'Torneos', 'Partidos', 'Recompensas'].map(l => (
              <a key={l} href="#" style={{ color: '#555', fontSize: '0.82rem', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
