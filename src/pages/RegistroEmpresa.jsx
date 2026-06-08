import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DEPORTES_OPCIONES = ['Fútbol', 'Futsal', 'Wally', 'Pádel', 'Básquetbol', 'Voleibol', 'Tenis', 'Frontón', 'Natación', 'Otro']
const ZONAS = ['Centro', 'Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 'Quillacollo', 'Sacaba', 'Otro']

const PASO_LABELS = ['Datos de la empresa', 'Datos del administrador', 'Solicitud enviada']

export default function RegistroEmpresa() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)

  // Paso 1 — empresa
  const [nombre, setNombre]           = useState('')
  const [zona, setZona]               = useState('')
  const [direccion, setDireccion]     = useState('')
  const [telefono, setTelefono]       = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [deportes, setDeportes]       = useState([])
  const [logoPreview, setLogoPreview] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [logoNombre, setLogoNombre]   = useState('')
  const [fotoNombre, setFotoNombre]   = useState('')

  // Paso 2 — admin
  const [adminNombre, setAdminNombre]       = useState('')
  const [adminCorreo, setAdminCorreo]       = useState('')
  const [adminPassword, setAdminPassword]   = useState('')
  const [adminPassword2, setAdminPassword2] = useState('')
  const [verPass, setVerPass]               = useState(false)

  const toggleDeporte = (d) => setDeportes(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  )

  const handleImagen = (e, tipo) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (tipo === 'logo') { setLogoPreview(url); setLogoNombre(file.name) }
    else                 { setFotoPreview(url); setFotoNombre(file.name) }
  }

  const paso1Valido = nombre && zona && direccion && telefono && descripcion && deportes.length > 0
  const paso2Valido = adminNombre && adminCorreo && adminPassword && adminPassword === adminPassword2

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', fontFamily: 'Outfit, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar simple */}
      <nav style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid #1a1a1a', background: 'rgba(15,15,15,0.9)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div
          onClick={() => navigate('/')}
          style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', letterSpacing: 3, color: '#f5f5f5', cursor: 'pointer' }}
        >
          SPORT<span style={{ color: '#00BCD4' }}>IKA</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit' }}
        >
          Ya tengo cuenta
        </button>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>

          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.2rem', color: '#f5f5f5', marginBottom: 6, letterSpacing: 1 }}>
              Registrar Empresa Deportiva
            </h1>
            <p style={{ color: '#666', fontSize: '0.88rem' }}>
              Completá los datos — el equipo Sportika revisará tu solicitud
            </p>
          </div>

          {/* Stepper */}
          {paso < 3 && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
              {[1, 2].map((n, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                      background: paso > n ? '#22c55e' : paso === n ? '#8B0000' : '#1a1a1a',
                      border: `2px solid ${paso > n ? '#22c55e' : paso === n ? '#8B0000' : '#2a2a2a'}`,
                      color: paso >= n ? '#fff' : '#555',
                    }}>
                      {paso > n ? '✓' : n}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: paso === n ? '#f5f5f5' : '#555', fontWeight: paso === n ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {PASO_LABELS[n - 1]}
                    </span>
                  </div>
                  {i < 1 && (
                    <div style={{ flex: 1, height: 2, background: paso > 1 ? '#22c55e' : '#2a2a2a', margin: '0 12px', minWidth: 40 }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══ PASO 1: DATOS DE LA EMPRESA ══════════════════════════════ */}
          {paso === 1 && (
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Logo + Foto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Logo */}
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#888', marginBottom: 8 }}>Logo de la empresa</p>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{
                      height: 120, borderRadius: 12, border: `2px dashed ${logoPreview ? '#22c55e' : '#2a2a2a'}`,
                      background: logoPreview ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}>
                      {logoPreview ? (
                        <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <span style={{ fontSize: '1.8rem', marginBottom: 4 }}>🏢</span>
                          <span style={{ fontSize: '0.72rem', color: '#555', textAlign: 'center', padding: '0 8px' }}>Subir logo<br/>(cuadrado)</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImagen(e, 'logo')} />
                  </label>
                  {logoNombre && <p style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {logoNombre}</p>}
                </div>

                {/* Foto del complejo */}
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#888', marginBottom: 8 }}>Foto del complejo</p>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{
                      height: 120, borderRadius: 12, border: `2px dashed ${fotoPreview ? '#00BCD4' : '#2a2a2a'}`,
                      background: fotoPreview ? 'rgba(0,188,212,0.05)' : 'rgba(255,255,255,0.02)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}>
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <span style={{ fontSize: '1.8rem', marginBottom: 4 }}>📸</span>
                          <span style={{ fontSize: '0.72rem', color: '#555', textAlign: 'center', padding: '0 8px' }}>Foto del lugar<br/>(opcional)</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImagen(e, 'foto')} />
                  </label>
                  {fotoNombre && <p style={{ fontSize: '0.7rem', color: '#00BCD4', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {fotoNombre}</p>}
                </div>
              </div>

              {/* Nombre */}
              <div className="form-group">
                <label className="form-label">Nombre del complejo *</label>
                <input className="input" placeholder="Ej: Sport Center Cochabamba" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>

              {/* Zona + Dirección */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Zona *</label>
                  <select className="input" value={zona} onChange={e => setZona(e.target.value)}>
                    <option value="">Seleccioná la zona</option>
                    {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input className="input" placeholder="Ej: 4-123456" value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dirección exacta *</label>
                <input className="input" placeholder="Ej: Av. Blanco Galindo Km 5, frente a la gasolinera" value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción del complejo *</label>
                <textarea className="input" rows={3} placeholder="Contá qué hace especial a tu complejo: instalaciones, servicios, horarios, etc." value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ resize: 'none' }} />
                <p style={{ fontSize: '0.72rem', color: '#555', textAlign: 'right', marginTop: 2 }}>{descripcion.length}/400</p>
              </div>

              {/* Deportes */}
              <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Deportes que ofrecés *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEPORTES_OPCIONES.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDeporte(d)}
                      style={{
                        padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.82rem', fontWeight: 600,
                        border: `1px solid ${deportes.includes(d) ? '#8B0000' : '#2a2a2a'}`,
                        background: deportes.includes(d) ? 'rgba(139,0,0,0.2)' : 'transparent',
                        color: deportes.includes(d) ? '#ff6b6b' : '#666',
                        transition: 'all 0.15s',
                      }}
                    >{d}</button>
                  ))}
                </div>
                {deportes.length > 0 && (
                  <p style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: 8 }}>✓ {deportes.join(', ')}</p>
                )}
              </div>

              <button
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', marginTop: 4, opacity: paso1Valido ? 1 : 0.4 }}
                disabled={!paso1Valido}
                onClick={() => setPaso(2)}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ══ PASO 2: DATOS DEL ADMINISTRADOR ═════════════════════════ */}
          {paso === 2 && (
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ padding: '10px 14px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.82rem' }}>
                  Estas credenciales serán las del administrador principal de <strong>{nombre}</strong>
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre completo del administrador *</label>
                <input className="input" placeholder="Ej: Juan García Pérez" value={adminNombre} onChange={e => setAdminNombre(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Correo electrónico *</label>
                <input className="input" type="email" placeholder="Ej: juan@sportcenter.com" value={adminCorreo} onChange={e => setAdminCorreo(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={verPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    {verPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {adminPassword && adminPassword.length < 8 && (
                  <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 3 }}>Mínimo 8 caracteres</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar contraseña *</label>
                <input
                  className="input"
                  type={verPass ? 'text' : 'password'}
                  placeholder="Repetí la contraseña"
                  value={adminPassword2}
                  onChange={e => setAdminPassword2(e.target.value)}
                />
                {adminPassword2 && adminPassword !== adminPassword2 && (
                  <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 3 }}>Las contraseñas no coinciden</p>
                )}
                {adminPassword2 && adminPassword === adminPassword2 && adminPassword.length >= 8 && (
                  <p style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: 3 }}>✓ Contraseñas coinciden</p>
                )}
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.6 }}>
                  Al enviar tu solicitud, el equipo de Sportika revisará los datos de tu empresa. Te notificaremos por correo cuando sea aprobada.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ justifyContent: 'center', flexShrink: 0 }} onClick={() => setPaso(1)}>
                  ← Atrás
                </button>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center', opacity: paso2Valido ? 1 : 0.4 }}
                  disabled={!paso2Valido}
                  onClick={() => setPaso(3)}
                >
                  Enviar solicitud
                </button>
              </div>
            </div>
          )}

          {/* ══ PASO 3: CONFIRMACIÓN ══════════════════════════════════════ */}
          {paso === 3 && (
            <div style={{ background: '#1a1a1a', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#22c55e', marginBottom: 8, letterSpacing: 1 }}>
                ¡Solicitud Enviada!
              </h2>
              <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
                Recibimos la solicitud de registro de <strong style={{ color: '#f5f5f5' }}>{nombre}</strong>. El equipo de Sportika la revisará y te notificará a <strong style={{ color: '#00BCD4' }}>{adminCorreo}</strong> cuando sea aprobada.
              </p>

              {/* Resumen */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
                <p style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 12 }}>Resumen de tu solicitud</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Empresa', value: nombre },
                    { label: 'Zona',    value: `${zona} — ${direccion}` },
                    { label: 'Deportes', value: deportes.join(', ') },
                    { label: 'Admin',   value: adminNombre },
                    { label: 'Correo',  value: adminCorreo },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', gap: 12, fontSize: '0.82rem' }}>
                      <span style={{ color: '#555', minWidth: 60 }}>{r.label}</span>
                      <span style={{ color: '#ccc', fontWeight: 500 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-outline" style={{ justifyContent: 'center' }} onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
                <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => navigate('/login')}>
                  Iniciar Sesión
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
