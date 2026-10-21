import { useState } from 'react'
import { propsCampo, MensajeCampo, irAlCampo } from '../components/Validacion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, INICIO_POR_ROL } from '../lib/auth'

// ─────────────────────────────────────────────────────────────────────────────
// RECUPERAR LA CONTRASEÑA
//
// Tres pasos, sin salir de la aplicación: se pide el correo, llega un código
// y con ese código se pone la contraseña nueva.
//
// Va por correo porque cambiar una clave exige probar que la cuenta es tuya.
// Se usa un código y no un enlace porque en el teléfono el enlace suele abrir
// otro navegador y la sesión se pierde a mitad de camino.
// ─────────────────────────────────────────────────────────────────────────────

const PASOS = ['Tu correo', 'El código', 'Nueva contraseña']

export default function RecuperarClave() {
  const navigate = useNavigate()
  const lugar    = useLocation()
  const { recuperarClave, verificarCodigo, cambiarMiClave, perfil } = useAuth()

  const [paso, setPaso]       = useState(0)
  // Si venia escrito en el login, no hacerlo escribirlo de nuevo
  const [correo, setCorreo]   = useState(lugar.state?.correo || '')
  const [codigo, setCodigo]   = useState('')
  const [clave, setClave]     = useState('')
  const [repetir, setRepetir] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError]     = useState(null)
  // El error de validacion va pegado a su campo; `error` queda para lo que responde el servidor
  const [errCampo, setErrCampo] = useState({})
  const marcar = (campo, texto) => { setErrCampo({ [campo]: texto }); irAlCampo(campo) }
  const limpiar = () => { setError(null); setErrCampo({}) }
  const pc = (c) => propsCampo(c, errCampo[c])
  const mc = (c) => <MensajeCampo nombre={c} error={errCampo[c]} />
  const [listo, setListo]     = useState(false)

  const paso1 = async () => {
    limpiar()
    if (!correo.trim()) { marcar('correo', 'Escribe el correo con el que creaste tu cuenta.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim())) {
      marcar('correo', 'El correo no es válido: debe tener @ y un dominio, por ejemplo nombre@gmail.com.'); return
    }
    setOcupado(true)
    const r = await recuperarClave(correo)
    setOcupado(false)
    if (r.error) { setError(r.error); return }
    setPaso(1)
  }

  const paso2 = async () => {
    limpiar()
    // Supabase decide cuantos digitos manda (Authentication > Email OTP
    // length): puede ser 6, 8 o mas. Por eso aqui no se fija un largo exacto,
    // solo se pide que no este a medias.
    if (!codigo.trim()) { marcar('codigo', 'Escribe el código que te enviamos por correo.'); return }
    if (codigo.trim().length < 6) {
      marcar('codigo', `El código está incompleto (tiene ${codigo.trim().length} dígitos). Cópialo completo del correo.`); return
    }
    setOcupado(true)
    const r = await verificarCodigo(correo, codigo)
    setOcupado(false)
    if (r.error) { setError(r.error); return }
    setPaso(2)
  }

  const paso3 = async () => {
    limpiar()
    if (!clave) { marcar('clave', 'Escribe la contraseña nueva.'); return }
    if (clave.length < 6) { marcar('clave', `La contraseña debe tener al menos 6 caracteres (tiene ${clave.length}).`); return }
    if (!repetir) { marcar('repetir', 'Repite la contraseña para confirmarla.'); return }
    if (clave !== repetir) { marcar('repetir', 'Las contraseñas no coinciden. Escríbelas de nuevo.'); return }
    setOcupado(true)
    const r = await cambiarMiClave(clave)
    setOcupado(false)
    if (r.error) { setError(r.error); return }
    setListo(true)
  }

  const reenviar = async () => {
    limpiar()
    setOcupado(true)
    const r = await recuperarClave(correo)
    setOcupado(false)
    setError(r.error || null)
    if (!r.error) setCodigo('')
  }

  const caja = {
    minHeight: '100vh', background: '#0f0f0f', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    fontFamily: 'Outfit, sans-serif',
  }
  const tarjeta = {
    width: '100%', maxWidth: 430, background: '#141414',
    border: '1px solid #2a2a2a', borderRadius: 16, padding: 28,
  }

  // ── Terminó ──────────────────────────────────────────────────────────
  if (listo) {
    return (
      <div style={caja}>
        <div style={{ ...tarjeta, textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: 10 }}>✅</p>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.7rem', color: '#f5f5f5', marginBottom: 8 }}>
            Listo, ya la cambiaste
          </h1>
          <p style={{ color: '#888', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: 22 }}>
            De ahora en adelante entras con la contraseña nueva.
          </p>
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
            onClick={() => navigate(INICIO_POR_ROL[perfil?.rol] || '/app/dashboard', { replace: true })}>
            Entrar a Sportika
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={caja}>
      <div style={tarjeta}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.9rem', color: '#f5f5f5', marginBottom: 16 }}>
          Recuperar mi cuenta
        </h1>

        {/* En qué paso va */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {PASOS.map((p, i) => (
            <div key={p} style={{ flex: 1 }}>
              <div style={{ height: 3, borderRadius: 2, marginBottom: 6,
                background: i <= paso ? '#00BCD4' : '#2a2a2a' }} />
              <span style={{ fontSize: '0.7rem', color: i <= paso ? '#00BCD4' : '#555' }}>{p}</span>
            </div>
          ))}
        </div>

        {/* ── 1. El correo ── */}
        {paso === 0 && (
          <>
            <p style={{ color: '#888', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: 18 }}>
              Escribe el correo de tu cuenta. Te enviaremos un código
              para que puedas crear una contraseña nueva.
            </p>
            <div className="form-group">
              <label className="form-label">Correo</label>
              <input className="input" type="email" value={correo} autoFocus
                placeholder="tucorreo@ejemplo.com" autoComplete="email"
                onChange={e => { setCorreo(e.target.value); limpiar() }}
                onKeyDown={e => e.key === 'Enter' && paso1()} {...pc('correo')} />
              {mc('correo')}
            </div>
          </>
        )}

        {/* ── 2. El código ── */}
        {paso === 1 && (
          <>
            <p style={{ color: '#888', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: 18 }}>
              Revisa <strong style={{ color: '#f5f5f5' }}>{correo}</strong>. Si esa cuenta existe,
              te llegará un código. Cópialo completo. Puede tardar hasta un minuto
              y, a veces, llega a la carpeta de correo no deseado.
            </p>
            <div className="form-group">
              <label className="form-label">El código</label>
              <input className="input" inputMode="numeric" maxLength={10} value={codigo} autoFocus
                placeholder="00000000"
                style={{ fontFamily: 'Bebas Neue', fontSize: '1.7rem', letterSpacing: 6, textAlign: 'center' }}
                onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); limpiar() }}
                onKeyDown={e => e.key === 'Enter' && paso2()} {...pc('codigo')} />
              {mc('codigo')}
            </div>
            <button onClick={reenviar} disabled={ocupado}
              style={{ background: 'none', border: 'none', color: '#00BCD4', fontSize: '0.8rem',
                fontFamily: 'Outfit', cursor: 'pointer', padding: 0, marginBottom: 14 }}>
              ¿No te llegó? Enviar otro código
            </button>
          </>
        )}

        {/* ── 3. La contraseña ── */}
        {paso === 2 && (
          <>
            <p style={{ color: '#888', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: 18 }}>
              Código correcto. Ahora elige la contraseña que vas a usar.
            </p>
            <div className="form-group">
              <label className="form-label">Contraseña nueva</label>
              <input className="input" type="password" value={clave} autoFocus
                placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                onChange={e => { setClave(e.target.value); limpiar() }} {...pc('clave')} />
              {mc('clave')}
            </div>
            <div className="form-group">
              <label className="form-label">Repítela</label>
              <input className="input" type="password" value={repetir}
                placeholder="Repite la contraseña" autoComplete="new-password"
                onChange={e => { setRepetir(e.target.value); limpiar() }}
                onKeyDown={e => e.key === 'Enter' && paso3()} {...pc('repetir')} />
              {mc('repetir')}
            </div>
          </>
        )}

        {error && (
          <div role="alert" style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, marginBottom: 12 }}>
            <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>✕ {error}</p>
          </div>
        )}

        <button className="btn btn-primary w-full"
          style={{ justifyContent: 'center', opacity: ocupado ? 0.6 : 1 }}
          disabled={ocupado}
          onClick={paso === 0 ? paso1 : paso === 1 ? paso2 : paso3}>
          {ocupado ? 'Un momento…'
            : paso === 0 ? 'Enviarme el código'
            : paso === 1 ? 'Verificar el código'
            : 'Guardar la contraseña'}
        </button>

        <button onClick={() => navigate('/login')}
          style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.8rem',
            fontFamily: 'Outfit', cursor: 'pointer', width: '100%', marginTop: 14 }}>
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  )
}
