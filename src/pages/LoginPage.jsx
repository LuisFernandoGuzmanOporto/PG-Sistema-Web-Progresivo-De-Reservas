import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('login') // login | register

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // TODO: Implement real Supabase Google auth
      // await supabase.auth.signInWithOAuth({ provider: 'google' })
      // Simulated for demo:
      setTimeout(() => {
        navigate('/app/inicio')
        setLoading(false)
      }, 1000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Outfit, sans-serif'
    }}>
      {/* Background effects */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,0,0,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,188,212,0.06) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeIn 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'inline-block' }}>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', letterSpacing: 4, color: '#f5f5f5' }}>
              SPORT<span style={{ color: '#00BCD4' }}>IKA</span>
            </span>
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 4 }}>Plataforma Deportiva de Cochabamba</p>
        </div>

        {/* Card */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: 36 }}>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 28 }}>
            <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
              Iniciar Sesión
            </button>
            <button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
              Registrarse
            </button>
          </div>

          {tab === 'login' ? (
            <div>
              <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', marginBottom: 6 }}>
                BIENVENIDO DE VUELTA
              </h2>
              <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 28 }}>
                Ingresa a tu cuenta para continuar
              </p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', marginBottom: 6 }}>
                CREA TU CUENTA
              </h2>
              <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 28 }}>
                Únete a la comunidad deportiva
              </p>
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading ? '#222' : '#fff',
              color: '#222',
              border: 'none',
              borderRadius: 12,
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: 'Outfit',
              transition: 'all 0.2s',
              marginBottom: 16
            }}
          >
            {loading ? (
              <span style={{ color: '#666' }}>Conectando...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
            <span style={{ color: '#444', fontSize: '0.8rem' }}>o con email</span>
            <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
          </div>

          {/* Email form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tab === 'register' && (
              <input className="input" type="text" placeholder="Nombre completo" />
            )}
            <input className="input" type="email" placeholder="Correo electrónico" />
            <input className="input" type="password" placeholder="Contraseña" />
            {tab === 'register' && (
              <input className="input" type="password" placeholder="Confirmar contraseña" />
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </div>

          {/* Demo quick access */}
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10 }}>
            <p style={{ color: '#00BCD4', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>🎮 Acceso Demo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Usuario Jugador', path: '/app/inicio' },
                { label: 'Admin Empresa', path: '/admin/dashboard' },
                { label: 'Super Admin', path: '/superadmin/dashboard' }
              ].map(({ label, path }) => (
                <button key={label} onClick={() => navigate(path)} style={{
                  padding: '6px 12px',
                  background: 'rgba(0,188,212,0.1)',
                  border: '1px solid rgba(0,188,212,0.2)',
                  borderRadius: 6,
                  color: '#00BCD4',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontFamily: 'Outfit',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}>
                  → {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', marginTop: 20 }}>
          Al continuar aceptas los{' '}
          <a href="#" style={{ color: '#00BCD4', textDecoration: 'none' }}>Términos de Servicio</a>
          {' '}y la{' '}
          <a href="#" style={{ color: '#00BCD4', textDecoration: 'none' }}>Política de Privacidad</a>
        </p>
      </div>
    </div>
  )
}
