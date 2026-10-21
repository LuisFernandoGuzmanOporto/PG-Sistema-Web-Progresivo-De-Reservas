import { useEffect, useState } from 'react'
import { esCorreo, esUsuario, tieneNombreYApellido } from '../lib/validaciones'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, INICIO_POR_ROL } from '../lib/auth'
import { rutaInterna } from '../lib/rutas'
import { supabase } from '../lib/supabase'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../components/Validacion'
import AvisoFaltantes from '../components/AvisoFaltantes'

export default function LoginPage() {
  const navigate = useNavigate()
  const lugar    = useLocation()
  const { entrar, registrarse, autenticado, perfil, cargando } = useAuth()

  // Al volver de Google, el navegador aterriza en esta pantalla con la sesion
  // ya establecida. Sin esto se quedaba mirando el formulario de login aunque
  // ya estuviera dentro.
  useEffect(() => {
    if (!cargando && autenticado && perfil) {
      navigate(INICIO_POR_ROL[perfil.rol] || '/app/dashboard', { replace: true })
    }
  }, [cargando, autenticado, perfil])
  const [loading, setLoading] = useState(false)
  const [avisoConfirmar, setAvisoConfirmar] = useState(null)
  const [errorServidor, setErrorServidor] = useState(null)
  const [tab, setTab] = useState('login') // login | register

  // Formulario de email: campos controlados y validados
  const [form, setForm]     = useState({ nombre: '', email: '', password: '', password2: '' })
  const [errores, setError] = useState({})
  const [enviado, setEnv]   = useState(false)

  const set = (campo) => (e) => {
    setForm(f => ({ ...f, [campo]: e.target.value }))
    setError(er => ({ ...er, [campo]: null }))
  }

  const cambiarTab = (t) => {
    setTab(t)
    setForm({ nombre: '', email: '', password: '', password2: '' })
    setError({})
    setEnv(false)
  }

  /** Valida el formulario y devuelve los errores encontrados. */
  const validar = () => {
    const e = {}
    const email = form.email.trim()
    // Al registrarse siempre es un correo. Al entrar puede ser el usuario que
    // el administrador le dio a un empleado ('rosa.v'), que no lleva arroba.
    const correoValido = esCorreo(email)
    if (!email) {
      e.email = tab === 'register' ? 'Escribe tu correo electrónico.' : 'Escribe tu correo o tu usuario.'
    } else if (tab === 'register' && !correoValido) {
      e.email = 'El correo no es válido: debe tener @ y un dominio, por ejemplo nombre@gmail.com.'
    } else if (!correoValido && !esUsuario(email)) {
      e.email = 'Escribe un correo válido (nombre@gmail.com) o el usuario que te dio tu complejo (por ejemplo, rosa.v).'
    }

    if (!form.password) e.password = 'Escribe tu contraseña.'
    else if (form.password.length < 6) {
      e.password = `La contraseña debe tener al menos 6 caracteres (tiene ${form.password.length}).`
    }

    if (tab === 'register') {
      if (!form.nombre.trim()) e.nombre = 'Escribe tu nombre y apellido.'
      else if (!tieneNombreYApellido(form.nombre)) e.nombre = 'Falta el apellido: escribe nombre y apellido, por ejemplo Juan Pérez.'
      if (!form.password2) e.password2 = 'Repite la contraseña para confirmarla.'
      else if (form.password !== form.password2) e.password2 = 'Las contraseñas no coinciden. Escríbelas de nuevo.'
    }
    return e
  }

  /** Entra o crea la cuenta contra Supabase, y lleva a cada rol a su panel. */
  const enviar = async () => {
    setEnv(true)
    setErrorServidor(null)
    const e = validar()
    setError(e)
    if (Object.keys(e).length > 0) { irAlPrimerError(e, ['nombre', 'email', 'password', 'password2']); return }

    setLoading(true)
    const r = tab === 'login'
      ? await entrar(form.email, form.password)
      : await registrarse(form.email, form.password, form.nombre.trim())

    if (r.error) { setErrorServidor(r.error); setLoading(false); return }

    // La cuenta quedo creada pero el proyecto pide confirmar el correo: no hay
    // sesion todavia, asi que no tiene sentido llevarlo a su panel.
    if (r.debeConfirmar) {
      setAvisoConfirmar(r.correo)
      setLoading(false)
      return
    }

    // El rol lo define la base, no el navegador
    const rol = r.usuario?.app_metadata?.rol || r.usuario?.user_metadata?.rol || 'cliente'
    const destino = rutaInterna(lugar.state?.volverA) || INICIO_POR_ROL[rol] || '/app/dashboard'
    navigate(destino, { replace: true })
  }



  /**
   * Entrar con Google.
   *
   * Funciona en cuanto el proveedor este habilitado en Supabase
   * (Authentication > Providers > Google). Mientras no lo este, Supabase
   * responde con un error y se muestra tal cual: antes este boton simulaba
   * un ingreso que nunca ocurria y dejaba al usuario dando vueltas.
   */
  const handleGoogleLogin = async () => {
    setLoading(true)
    setErrorServidor(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/login' },
    })
    if (error) {
      const m = (error.message || '').toLowerCase()
      setErrorServidor(m.includes('not enabled') || m.includes('provider')
        ? 'El ingreso con Google todavía no está habilitado. Entra con tu correo y contraseña.'
        : error.message)
      setLoading(false)
    }
    // Si sale bien, el navegador se va a Google: no hay nada mas que hacer aqui
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
            <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => cambiarTab('login')}>
              Iniciar Sesión
            </button>
            <button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => cambiarTab('register')}>
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
              <>
                <div>
                  <input className="input" type="text" placeholder="Nombre y apellido" autoComplete="name"
                    value={form.nombre} onChange={set('nombre')} {...propsCampo('nombre', errores.nombre)} />
                  <MensajeCampo nombre="nombre" error={errores.nombre} />
                </div>
              </>
            )}
            <div>
              <input className="input" type={tab === 'register' ? 'email' : 'text'}
                placeholder={tab === 'register' ? 'Correo electrónico' : 'Correo o usuario'}
                autoComplete={tab === 'register' ? 'email' : 'username'}
                value={form.email} onChange={set('email')}
                onKeyDown={e => e.key === 'Enter' && enviar()} {...propsCampo('email', errores.email)} />
              <MensajeCampo nombre="email" error={errores.email} />
            </div>

            <div>
              <input className="input" type="password" placeholder="Contraseña"
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                value={form.password} onChange={set('password')}
                onKeyDown={e => e.key === 'Enter' && enviar()} {...propsCampo('password', errores.password)} />
              <MensajeCampo nombre="password" error={errores.password} />
            </div>

            {tab === 'register' && (
              <>
                <div>
                  <input className="input" type="password" placeholder="Repite la contraseña" autoComplete="new-password"
                    value={form.password2} onChange={set('password2')}
                    onKeyDown={e => e.key === 'Enter' && enviar()} {...propsCampo('password2', errores.password2)} />
                  <MensajeCampo nombre="password2" error={errores.password2} />
                </div>
              </>
            )}

            {avisoConfirmar && (
              <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10 }}>
                <p style={{ color: '#22c55e', fontSize: '0.84rem', fontWeight: 600, marginBottom: 4 }}>
                  ✓ Tu cuenta quedó creada
                </p>
                <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Te enviamos un correo a <strong style={{ color: '#f5f5f5' }}>{avisoConfirmar}</strong>.
                  Confirmalo y después inicia sesión aquí mismo.
                </p>
              </div>
            )}

            <AvisoFaltantes
              titulo={tab === 'register' ? 'Para crear tu cuenta revisa:' : 'Para entrar revisa:'}
              faltantes={['nombre', 'email', 'password', 'password2']
                .filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] }))}
              error={errorServidor} />

            <button className="btn btn-primary" onClick={enviar} disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Entrando...' : tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>

            {tab === 'login' && (
              <button onClick={() => navigate('/recuperar', { state: { correo: form.email.trim() } })}
                style={{ background: 'none', border: 'none', color: '#00BCD4', fontSize: '0.82rem',
                  fontFamily: 'Outfit', cursor: 'pointer', padding: '4px 0', textAlign: 'center' }}>
                ¿Olvidaste tu contraseña?
              </button>
            )}

          </div>

        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', marginTop: 20 }}>
          Al continuar aceptas los{' '}
          <Link to="/terminos" style={{ color: '#00BCD4', textDecoration: 'none' }}>Términos de Servicio</Link>
          {' '}y la{' '}
          <Link to="/privacidad" style={{ color: '#00BCD4', textDecoration: 'none' }}>Política de Privacidad</Link>
        </p>
      </div>
    </div>
  )
}
