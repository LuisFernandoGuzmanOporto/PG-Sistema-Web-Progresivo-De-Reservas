import { useState } from 'react'
import { digitosDe, esTelefono } from '../lib/validaciones'
import { useNavigate } from 'react-router-dom'
import { registrarSolicitudEmpresa, guardarImagenesEmpresa } from '../lib/guardar'
import { subirPublico, revisarArchivo, TIPOS_IMAGEN } from '../lib/archivos'
import AvisoFaltantes from '../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../components/Validacion'
import SelectorUbicacion from '../components/SelectorUbicacion'
// Deportes y zonas viven en datos.js: son los mismos que despues ve el
// administrador en "Mi cuenta" y el cliente al filtrar los complejos.
import { DEPORTES, ZONAS } from '../lib/datos'

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
  const [referencia, setReferencia]   = useState('')
  // El horario decide que franjas se ofrecen para reservar
  const [horaInicio, setHoraInicio]   = useState('07:00')
  const [horaFin, setHoraFin]         = useState('22:00')
  // Coordenadas del complejo: es lo que abre Google Maps del lado del cliente
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [deportes, setDeportes]       = useState([])
  const [logoPreview, setLogoPreview] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [logoNombre, setLogoNombre]   = useState('')
  const [fotoNombre, setFotoNombre]   = useState('')
  // Los archivos en si. La vista previa es un enlace local que solo vive en
  // esta pestana; lo que se sube es el archivo, y recién al final, porque su
  // ruta lleva el id del complejo y ese id no existe hasta crearlo.
  const [logoFile, setLogoFile]       = useState(null)
  const [fotoFile, setFotoFile]       = useState(null)
  const [errorImagen, setErrorImagen] = useState(null)

  // Paso 2 — admin
  const [adminNombre, setAdminNombre]       = useState('')
  const [adminCorreo, setAdminCorreo]       = useState('')
  const [adminPassword, setAdminPassword]   = useState('')
  const [adminPassword2, setAdminPassword2] = useState('')
  const [verPass, setVerPass]               = useState(false)

  const [enviando, setEnviando]   = useState(false)
  const [errorAlta, setErrorAlta] = useState(null)

  /**
   * Crea la cuenta del dueno y deja la solicitud pendiente. Hasta aqui el
   * complejo no existe todavia: lo publica el super administrador al aprobar.
   */
  const enviarSolicitud = async () => {
    setIntento(true)
    if (!paso2Valido) { irAlPrimerError(errores2, ORDEN2); return }

    setEnviando(true)
    setErrorAlta(null)
    const g = await registrarSolicitudEmpresa({
      nombreEmpresa: nombre.trim(), zona, direccion: direccion.trim(),
      telefono: telefono.trim(), descripcion: descripcion.trim(), deportes,
      lat, lng, referencia: referencia.trim(),
      horaInicio, horaFin,
      adminNombre: adminNombre.trim(), adminCorreo: adminCorreo.trim(),
      adminPassword,
    })
    if (g.error) { setEnviando(false); setErrorAlta(g.error); return }

    // El logo y la foto van despues: su ruta lleva el id del complejo, que
    // recién existe ahora. Si alguna falla, la solicitud igual quedo enviada
    // y las imagenes se pueden cargar luego desde «Mi cuenta».
    const rutas = {}
    for (const [campo, archivo] of [['logo', logoFile], ['foto', fotoFile]]) {
      if (!archivo) continue
      const sub = await subirPublico({ carpeta: String(g.empresa.id), archivo })
      if (sub.error) setErrorImagen('El registro se envió, pero la imagen no se subió: ' + sub.error)
      else rutas[campo] = sub.ruta
    }
    if (Object.keys(rutas).length) {
      await guardarImagenesEmpresa({ empresaId: g.empresa.id, ...rutas })
    }

    setEnviando(false)
    setIntento(false)
    setPaso(3)
  }

  const toggleDeporte = (d) => setDeportes(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  )

  const handleImagen = (e, tipo) => {
    const file = e.target.files[0]
    if (!file) return

    const aviso = revisarArchivo(file, { tipos: TIPOS_IMAGEN, limite: 5 * 1024 * 1024 })
    if (aviso) { setErrorImagen(aviso); e.target.value = ''; return }
    setErrorImagen(null)

    const url = URL.createObjectURL(file)
    if (tipo === 'logo') { setLogoPreview(url); setLogoNombre(file.name); setLogoFile(file) }
    else                 { setFotoPreview(url); setFotoNombre(file.name); setFotoFile(file) }
  }

  // ── Validaciones: cada campo dice que le falta, no solo se bloquea el boton ──
  const errores1 = {}
  const digitos = digitosDe(telefono)
  if (!nombre.trim()) errores1.nombre = 'Escribe el nombre del complejo.'
  else if (nombre.trim().length < 3) errores1.nombre = 'El nombre es muy corto: usa al menos 3 caracteres.'
  if (!zona) errores1.zona = 'Elige la zona donde está el complejo.'
  if (!telefono.trim()) errores1.telefono = 'Escribe un teléfono de contacto.'
  else if (/[^0-9\s-]/.test(telefono)) errores1.telefono = 'El teléfono solo puede tener números, espacios o guiones.'
  else if (!esTelefono(telefono)) errores1.telefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}). Ejemplo: 4123456 o 70012345.`
  if (!direccion.trim()) errores1.direccion = 'Escribe la dirección del complejo.'
  else if (direccion.trim().length < 8) errores1.direccion = 'La dirección es muy corta: incluye la calle o avenida y un número o referencia.'
  if (horaFin <= horaInicio) errores1.horario = 'La hora de cierre debe ser posterior a la de apertura.'
  if (lat == null || lng == null) errores1.ubicacion = 'Toca el mapa para marcar dónde está el complejo.'
  if (!descripcion.trim()) errores1.descripcion = 'Describe brevemente qué ofrece tu complejo.'
  else if (descripcion.trim().length < 20) errores1.descripcion = `La descripción debe tener al menos 20 caracteres (tiene ${descripcion.trim().length}).`
  if (deportes.length === 0) errores1.deportes = 'Elige al menos un deporte que se pueda jugar en el complejo.'

  const errores2 = {}
  if (!adminNombre.trim()) errores2.adminNombre = 'Escribe el nombre y apellido del administrador.'
  else if (adminNombre.trim().split(/\s+/).length < 2) errores2.adminNombre = 'Falta el apellido: escribe nombre y apellido.'
  if (!adminCorreo.trim()) errores2.adminCorreo = 'Escribe el correo del administrador.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adminCorreo.trim())) errores2.adminCorreo = 'El correo no es válido: debe tener @ y un dominio, por ejemplo juan@sportcenter.com.'
  if (!adminPassword) errores2.adminPassword = 'Crea una contraseña.'
  else if (adminPassword.length < 8) errores2.adminPassword = `La contraseña debe tener al menos 8 caracteres (tiene ${adminPassword.length}).`
  if (!adminPassword2) errores2.adminPassword2 = 'Repite la contraseña para confirmarla.'
  else if (adminPassword !== adminPassword2) errores2.adminPassword2 = 'Las contraseñas no coinciden. Escríbelas de nuevo.'

  const paso1Valido = Object.keys(errores1).length === 0
  const paso2Valido = Object.keys(errores2).length === 0

  const [intento, setIntento] = useState(false)
  // Lo que falta de este paso, junto y abajo del boton
  const ORDEN1 = ['nombre', 'zona', 'telefono', 'direccion', 'horario', 'ubicacion', 'descripcion', 'deportes']
  const ORDEN2 = ['adminNombre', 'adminCorreo', 'adminPassword', 'adminPassword2']
  const faltaEnEstePaso = () => {
    if (!intento) return []
    const [err, orden] = paso === 1 ? [errores1, ORDEN1] : [errores2, ORDEN2]
    return orden.filter(c => err[c]).map(c => ({ campo: c, texto: err[c] }))
  }
  // Props y mensaje de cada campo, visibles recién después del primer intento
  const pc = (c) => propsCampo(c, (paso === 1 ? errores1 : errores2)[c], intento)
  const mc = (c) => <MensajeCampo nombre={c} error={(paso === 1 ? errores1 : errores2)[c]} mostrar={intento} />

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
              Completa los datos — el equipo Sportika revisará tu solicitud
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
                    {/* En el celular solo se muestra el nombre del paso actual:
                        los dos juntos no entran en una linea */}
                    <span className={paso === n ? '' : 'solo-escritorio'}
                      style={{ fontSize: '0.8rem', color: paso === n ? '#f5f5f5' : '#555', fontWeight: paso === n ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {PASO_LABELS[n - 1]}
                    </span>
                  </div>
                  {i < 1 && (
                    <div style={{ flex: 1, height: 2, background: paso > 1 ? '#22c55e' : '#2a2a2a', margin: '0 12px', minWidth: 24 }} />
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
                    <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => handleImagen(e, 'logo')} />
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
                    <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => handleImagen(e, 'foto')} />
                  </label>
                  {fotoNombre && <p style={{ fontSize: '0.7rem', color: '#00BCD4', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {fotoNombre}</p>}
                  {errorImagen && (
                    <p style={{ fontSize: '0.74rem', color: '#ef4444', marginTop: 6 }}>{errorImagen}</p>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <div className="form-group">
                <label className="form-label">Nombre del complejo *</label>
                <input className="input" placeholder="Ej: Sport Center Cochabamba" value={nombre} onChange={e => setNombre(e.target.value)} {...pc('nombre')} />
                {mc('nombre')}
              </div>

              {/* Zona + Dirección */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Zona *</label>
                  <select className="input" value={zona} onChange={e => setZona(e.target.value)} {...pc('zona')}>
                    <option value="">Elige la zona</option>
                    {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                  {mc('zona')}
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input className="input" placeholder="Ej: 4123456 o 70012345" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} {...pc('telefono')} />
                  {mc('telefono')}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dirección exacta *</label>
                <input className="input" placeholder="Ej: Av. Blanco Galindo Km 5, frente a la gasolinera" value={direccion} onChange={e => setDireccion(e.target.value)} {...pc('direccion')} />
                {mc('direccion')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Abre a las *</label>
                  <input className="input" type="time" step="3600" value={horaInicio}
                    onChange={e => setHoraInicio(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cierra a las *</label>
                  <input className="input" type="time" step="3600" value={horaFin}
                    onChange={e => setHoraFin(e.target.value)} {...pc('horario')} />
                  {mc('horario')}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ubicación en el mapa *</label>
                <div id="campo-ubicacion" tabIndex={-1}
                  style={intento && errores1.ubicacion ? { outline: '2px solid #ef4444', outlineOffset: 6, borderRadius: 12 } : undefined}>
                  <SelectorUbicacion lat={lat} lng={lng}
                    onCambiar={(la, ln) => { setLat(la); setLng(ln) }} />
                </div>
                {mc('ubicacion')}
              </div>

              <div className="form-group">
                <label className="form-label">Referencia para llegar</label>
                <input className="input" value={referencia} onChange={e => setReferencia(e.target.value)}
                  placeholder="Ej: Al lado del surtidor, portón verde" />
                <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 4 }}>
                  Opcional, pero ayuda mucho a quien nunca fue.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción del complejo *</label>
                <textarea className="input" rows={3} placeholder="Qué hace especial a tu complejo: instalaciones, servicios, estacionamiento, etc." value={descripcion} onChange={e => setDescripcion(e.target.value)} {...pc('descripcion')} style={{ resize: 'none' }} />
                {mc('descripcion')}
                <p style={{ fontSize: '0.72rem', color: '#555', textAlign: 'right', marginTop: 2 }}>{descripcion.length}/400</p>
              </div>

              {/* Deportes */}
              <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Deportes que ofrece el complejo *</label>
                <div id="campo-deportes" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEPORTES.map(d => (
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
                {mc('deportes')}
              </div>

              <AvisoFaltantes faltantes={faltaEnEstePaso()} />

              <button
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', marginTop: 4 }}
                onClick={() => {
                  setIntento(true)
                  if (paso1Valido) { setIntento(false); setPaso(2) } else irAlPrimerError(errores1, ORDEN1)
                }}
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
                <input className="input" placeholder="Ej: Juan García Pérez" autoComplete="name" value={adminNombre} onChange={e => setAdminNombre(e.target.value)} {...pc('adminNombre')} />
                {mc('adminNombre')}
              </div>

              <div className="form-group">
                <label className="form-label">Correo electrónico *</label>
                <input className="input" type="email" placeholder="Ej: juan@sportcenter.com" autoComplete="email" value={adminCorreo} onChange={e => setAdminCorreo(e.target.value)} {...pc('adminCorreo')} />
                {mc('adminCorreo')}
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
                    style={{ paddingRight: 44 }} autoComplete="new-password"
                    {...pc('adminPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    {verPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {intento ? mc('adminPassword') : adminPassword && adminPassword.length < 8 && (
                  <p style={{ fontSize: '0.72rem', color: '#888', marginTop: 3 }}>Faltan {8 - adminPassword.length} caracteres para el mínimo de 8.</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar contraseña *</label>
                <input
                  className="input"
                  type={verPass ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  value={adminPassword2} autoComplete="new-password"
                  onChange={e => setAdminPassword2(e.target.value)}
                  {...pc('adminPassword2')}
                />
                {intento ? mc('adminPassword2') : adminPassword2 && adminPassword !== adminPassword2 && (
                  <p className="mensaje-campo"><span aria-hidden="true">⚠</span><span>Las contraseñas no coinciden.</span></p>
                )}
                {adminPassword2 && adminPassword === adminPassword2 && adminPassword.length >= 8 && (
                  <p style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: 3 }}>✓ Las contraseñas coinciden.</p>
                )}
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.6 }}>
                  Al enviar tu solicitud, el equipo de Sportika revisará los datos de tu empresa. Te notificaremos por correo cuando sea aprobada.
                </p>
              </div>

              <AvisoFaltantes faltantes={faltaEnEstePaso()} error={errorAlta || errorImagen} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ justifyContent: 'center', flexShrink: 0 }} onClick={() => setPaso(1)}>
                  ← Atrás
                </button>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center', opacity: enviando ? 0.6 : 1 }}
                  disabled={enviando}
                  onClick={enviarSolicitud}
                >
                  {enviando ? 'Enviando…' : 'Enviar solicitud'}
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
