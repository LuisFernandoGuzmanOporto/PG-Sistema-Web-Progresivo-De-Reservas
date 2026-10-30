import { useState } from 'react'
import { digitosDe, esTelefono } from '../lib/validaciones'
import Layout from '../components/layout/Layout'
import AvisoFaltantes from '../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../components/Validacion'
import SelectorUbicacion from '../components/SelectorUbicacion'
import { useAuth } from '../lib/auth'
import FotoDePerfil from '../components/FotoDePerfil'
import { SESION, USUARIO_ACTUAL, EMPRESAS, empresaPorId, DEPORTES, ZONAS,
         DOMINIO_EMPLEADOS } from '../lib/datos'
import { guardarPerfil, guardarMiComplejo } from '../lib/guardar'
import { subirPublico, urlPublica } from '../lib/archivos'

// ─────────────────────────────────────────────────────────────────────────────
// MI CUENTA
//
// Una sola pantalla para los tres roles que no tenían dónde corregir sus
// datos: administrador de complejo, empleado y super administrador. El cliente
// ya tiene la suya en «Mi Perfil», con sus reservas y sus puntos.
//
// El administrador además edita aquí los datos de su complejo. Hasta ahora eso
// solo se podía cargar al registrarse: si se equivocaba en la dirección o no
// marcaba la ubicación, quedaba así para siempre.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Estos tres viven FUERA del componente a proposito.
//
// Definidos adentro, React los toma como un tipo distinto en cada dibujado:
// desmonta lo que hay y lo vuelve a montar. En un formulario eso significa
// perder el foco del campo a cada letra que se escribe.
// ─────────────────────────────────────────────────────────────────────────────

const Seccion = ({ titulo, sub, children }) => (
  <div className="card" style={{ padding: 22, marginBottom: 18 }}>
    <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f5f5f5', marginBottom: 2 }}>
      {titulo}
    </h2>
    {sub && <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 18, lineHeight: 1.5 }}>{sub}</p>}
    {children}
  </div>
)

const Exito = ({ texto }) => texto ? (
  <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600, marginBottom: 12 }}>✓ {texto}</p>
) : null

/**
 * Un cuadro con la imagen que hay ahora y el boton para cambiarla.
 * El QR va sobre blanco: la camara no lee un QR con el fondo oscuro.
 */
const Imagen = ({ ruta, texto, ayuda, fondoBlanco, cargando, bloqueado, onElegir }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
    <div style={{ width: 130, height: 130, borderRadius: 12, flexShrink: 0,
      border: '2px dashed ' + (ruta ? 'rgba(34,197,94,0.45)' : '#2a2a2a'),
      background: ruta && fondoBlanco ? '#fff' : 'rgba(255,255,255,0.02)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {ruta
        ? <img src={urlPublica(ruta)} alt={texto}
            style={{ width: '100%', height: '100%', objectFit: fondoBlanco ? 'contain' : 'cover' }} />
        : <span style={{ color: '#555', fontSize: '0.74rem', textAlign: 'center', padding: 10 }}>
            Todavía no subiste {texto}
          </span>}
    </div>

    <div style={{ flex: 1, minWidth: 160 }}>
      <label className="btn btn-outline btn-sm"
        style={{ cursor: cargando ? 'wait' : 'pointer', display: 'inline-flex' }}>
        {cargando ? 'Subiendo…' : ruta ? 'Cambiar' : 'Subir'}
        <input type="file" accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }} disabled={bloqueado}
          onChange={e => { onElegir(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 8, lineHeight: 1.5 }}>
        {ayuda ? ayuda + ' ' : ''}JPG, PNG o WEBP, hasta 5 MB.
      </p>
    </div>
  </div>
)

const LAYOUT_DE = { admin_empresa: 'admin', empleado: 'empleado', superadmin: 'superadmin' }

export default function MiCuenta() {
  const { perfil, sesion, cambiarMiClave, cambiarClaveConLaActual } = useAuth()
  // Una cuenta que entró solo con Google no tiene contraseña que pedir
  const tieneClave = (sesion?.user?.identities || []).some(i => i.provider === 'email')
  const rol = perfil?.rol
  const esAdmin = rol === 'admin_empresa'
  const esEmpleado = rol === 'empleado'

  // El empleado entra con un usuario, no con un correo: por dentro se le arma
  // una direccion que el nunca vio y que no le diria nada si se la mostraramos.
  // Solo se recorta cuando el dominio es el inventado: si su cuenta se creo con
  // un correo de verdad, ese es el que tiene que escribir para entrar.
  const correo = perfil?.correo || ''
  const usuarioSinCorreo = esEmpleado && correo.endsWith('@' + DOMINIO_EMPLEADOS)
  const acceso = usuarioSinCorreo ? correo.split('@')[0] : correo

  const empresa = esAdmin ? empresaPorId(SESION.empresaId) : null

  // ── Mis datos ──────────────────────────────────────────────────────────
  const [datos, setDatos] = useState({
    nombre: perfil?.nombre || USUARIO_ACTUAL.nombre || '',
    telefono: perfil?.telefono || USUARIO_ACTUAL.telefono || '',
  })
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [avisoDatos, setAvisoDatos] = useState(null)
  const [errorDatos, setErrorDatos] = useState(null)

  const [intentoDatos, setIntentoDatos] = useState(false)
  const errDatos = {}
  {
    const digitos = digitosDe(datos.telefono)
    if (!datos.nombre.trim()) errDatos.nombre = 'Escribe tu nombre completo.'
    else if (datos.nombre.trim().length < 3) errDatos.nombre = 'El nombre es muy corto: escribe nombre y apellido.'
    if (datos.telefono.trim() && /[^0-9\s-]/.test(datos.telefono)) errDatos.telefono = 'El teléfono solo puede tener números, espacios o guiones.'
    else if (datos.telefono.trim() && !esTelefono(datos.telefono))
      errDatos.telefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}).`
  }
  const vDatos = validacion(errDatos, ['nombre', 'telefono'], intentoDatos)
  const faltaEnDatos = vDatos.faltantes

  const guardarDatos = async () => {
    setAvisoDatos(null); setErrorDatos(null)
    setIntentoDatos(true)
    if (vDatos.hay) { irAlPrimerError(errDatos, ['nombre', 'telefono']); return }
    setGuardandoDatos(true)
    const r = await guardarPerfil({ nombre: datos.nombre.trim(), telefono: datos.telefono.trim() })
    setGuardandoDatos(false)
    if (r.error) { setErrorDatos(r.error); return }
    Object.assign(USUARIO_ACTUAL, { nombre: datos.nombre.trim(), telefono: datos.telefono.trim() })
    setAvisoDatos('Listo, tus datos quedaron actualizados.')
  }

  // ── Mi contraseña ──────────────────────────────────────────────────────
  const [clave, setClave] = useState({ actual: '', nueva: '', repetir: '' })
  const [guardandoClave, setGuardandoClave] = useState(false)
  const [avisoClave, setAvisoClave] = useState(null)
  const [errorClave, setErrorClave] = useState(null)

  const [intentoClave, setIntentoClave] = useState(false)
  const errClave = {}
  if (tieneClave && !clave.actual) errClave.claveActual = 'Escribe tu contraseña actual: así nadie más puede cambiarla.'
  if (!clave.nueva) errClave.claveNueva = 'Escribe la contraseña nueva.'
  else if (clave.nueva.length < 6) errClave.claveNueva = `La contraseña debe tener al menos 6 caracteres (tiene ${clave.nueva.length}).`
  if (!clave.repetir) errClave.claveRepetir = 'Repite la contraseña para confirmarla.'
  else if (clave.nueva !== clave.repetir) errClave.claveRepetir = 'Las contraseñas no coinciden. Escríbelas de nuevo.'
  const vClave = validacion(errClave, ['claveActual', 'claveNueva', 'claveRepetir'], intentoClave)
  const faltaEnClave = vClave.faltantes

  const guardarClave = async () => {
    setAvisoClave(null); setErrorClave(null)
    setIntentoClave(true)
    if (vClave.hay) { irAlPrimerError(errClave, ['claveActual', 'claveNueva', 'claveRepetir']); return }
    setGuardandoClave(true)
    const r = tieneClave ? await cambiarClaveConLaActual(clave.actual, clave.nueva) : await cambiarMiClave(clave.nueva)
    setGuardandoClave(false)
    if (r.error) { setErrorClave(r.error); return }
    setClave({ actual: '', nueva: '', repetir: '' })
    setIntentoClave(false)
    setAvisoClave('Contraseña actualizada. Úsala la próxima vez que inicies sesión.')
  }

  // ── Mi complejo (solo el administrador) ────────────────────────────────
  const [comp, setComp] = useState({
    nombre: empresa?.nombre || '',
    telefono: empresa?.telefono || '',
    zona: empresa?.zona || '',
    direccion: empresa?.direccion || '',
    referencia: empresa?.referencia || '',
    descripcion: empresa?.descripcion || '',
    horaInicio: (empresa?.horario || '').split('-')[0]?.trim() || '07:00',
    horaFin: (empresa?.horario || '').split('-')[1]?.trim() || '22:00',
    lat: empresa?.lat || null,
    lng: empresa?.lng || null,
    deportes: empresa?.deportes || [],
    qrPago: empresa?.qrPago || null,
    logo: empresa?.logo || null,
    foto: empresa?.foto || null,
  })
  // Cual se esta subiendo en este momento, y el aviso si algo salio mal
  const [subiendo, setSubiendo] = useState(null)
  const [errorImagen, setErrorImagen] = useState(null)
  const [guardandoComp, setGuardandoComp] = useState(false)
  const [avisoComp, setAvisoComp] = useState(null)
  const [errorComp, setErrorComp] = useState(null)

  const [intentoComp, setIntentoComp] = useState(false)
  const errComp = {}
  {
    const digitos = digitosDe(comp.telefono)
    if (!comp.nombre.trim()) errComp.compNombre = 'Escribe el nombre del complejo.'
    else if (comp.nombre.trim().length < 3) errComp.compNombre = 'El nombre es muy corto: usa al menos 3 caracteres.'
    if (comp.telefono.trim() && !esTelefono(comp.telefono))
      errComp.compTelefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}).`
    if (!comp.direccion.trim()) errComp.direccion = 'Escribe la dirección del complejo, por ejemplo «Av. Blanco Galindo km 4».'
    if (!comp.zona.trim()) errComp.zona = 'Elige la zona donde está el complejo.'
    if (comp.horaFin <= comp.horaInicio) errComp.horaFin = `La hora de cierre debe ser posterior a la de apertura (${comp.horaInicio}).`
    if (!comp.deportes.length) errComp.deportes = 'Marca al menos un deporte que ofreces.'
  }
  const ORDEN_COMP = ['compNombre', 'compTelefono', 'direccion', 'zona', 'horaFin', 'deportes']
  const vComp = validacion(errComp, ORDEN_COMP, intentoComp)
  const faltaEnComplejo = vComp.faltantes

  /**
   * Las imagenes se suben apenas se eligen, no al guardar: asi el dueno ve en
   * el acto si el QR quedo legible, que es lo unico que importa de un QR.
   * La ruta se guarda despues, con el resto de los datos.
   */
  const elegirImagen = async (campo, archivo) => {
    if (!archivo) return
    setErrorImagen(null); setAvisoComp(null)
    setSubiendo(campo)
    const r = await subirPublico({
      carpeta: String(SESION.empresaId), archivo, anterior: comp[campo],
    })
    setSubiendo(null)
    if (r.error) { setErrorImagen(r.error); return }
    setComp(c => ({ ...c, [campo]: r.ruta }))
  }

  const guardarComplejo = async () => {
    setAvisoComp(null); setErrorComp(null)
    setIntentoComp(true)
    if (vComp.hay) { irAlPrimerError(errComp, ORDEN_COMP); return }
    setGuardandoComp(true)
    const r = await guardarMiComplejo({ empresaId: SESION.empresaId, ...comp })
    setGuardandoComp(false)
    if (r.error) { setErrorComp(r.error); return }

    // La ficha que ve el cliente lee de esta misma lista
    const real = EMPRESAS.find(e => e.id === SESION.empresaId)
    if (real) Object.assign(real, {
      nombre: comp.nombre, telefono: comp.telefono, zona: comp.zona,
      direccion: comp.direccion, referencia: comp.referencia,
      descripcion: comp.descripcion, deportes: comp.deportes,
      lat: comp.lat, lng: comp.lng, qrPago: comp.qrPago,
      logo: comp.logo, foto: comp.foto,
      horario: comp.horaInicio + ' - ' + comp.horaFin,
    })
    setAvisoComp('Listo. Los clientes ya ven los datos nuevos.')
  }

  return (
    <Layout role={LAYOUT_DE[rol] || 'user'}>
      <div style={{ maxWidth: 680 }}>
        <div className="section-header">
          <div>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>Mi cuenta</h1>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>{acceso}</p>
          </div>
        </div>

        {/* ── Foto de perfil ── */}
        <Seccion titulo="Mi foto"
          sub="La ves arriba, junto a tu nombre, y la ven los clientes cuando respondes en los comentarios.">
          <FotoDePerfil tam={72} centrada={false} />
        </Seccion>

        {/* ── Datos personales ── */}
        <Seccion titulo="Mis datos"
          sub="Tu nombre es el que ven los demás en las reservas y en la bitácora.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input className="input" value={datos.nombre} autoComplete="name"
                onChange={e => { setDatos(d => ({ ...d, nombre: e.target.value })); setAvisoDatos(null) }} {...vDatos.props('nombre')} />
              {vDatos.mensaje('nombre')}
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="input" inputMode="tel" value={datos.telefono} placeholder="Ej: 70012345"
                onChange={e => { setDatos(d => ({ ...d, telefono: e.target.value })); setAvisoDatos(null) }} {...vDatos.props('telefono')} />
              {vDatos.mensaje('telefono')}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{esEmpleado ? 'Usuario' : 'Correo'}</label>
            <input className="input" value={acceso} disabled
              style={{ opacity: 0.55, cursor: 'not-allowed' }} />
            <p style={{ color: '#666', fontSize: '0.72rem', marginTop: 4 }}>
              {esEmpleado
                ? 'Es con lo que entras. Lo asigna el administrador de tu complejo.'
                : 'Es con lo que inicias sesión. Para cambiarlo hay que confirmar la dirección nueva.'}
            </p>
          </div>

          <Exito texto={avisoDatos} />
          <AvisoFaltantes faltantes={faltaEnDatos} error={errorDatos} />

          <button className="btn btn-primary" style={{ justifyContent: 'center' }}
            disabled={guardandoDatos} onClick={guardarDatos}>
            {guardandoDatos ? 'Guardando…' : 'Guardar mis datos'}
          </button>
        </Seccion>

        {/* ── Contraseña ── */}
        <Seccion titulo="Mi contraseña"
          sub={esEmpleado ? undefined : 'Para cambiarla escribe primero la que usas ahora.'}>
          {esEmpleado ? (
            <p style={{ color: '#888', fontSize: '0.84rem', lineHeight: 1.6 }}>
              Tu contraseña la administra el encargado de tu complejo: solicítale el cambio.
              {usuarioSinCorreo && ' Se hace así porque tu cuenta no tiene un correo ' +
                'propio al que mandarte un código de recuperación.'}
            </p>
          ) : (
            <>
              {tieneClave && (
                <div className="form-group">
                  <label className="form-label">Contraseña actual</label>
                  <input className="input" type="password" autoComplete="current-password" value={clave.actual} placeholder="La que usas para entrar"
                    onChange={e => { setClave(c => ({ ...c, actual: e.target.value })); setAvisoClave(null); setErrorClave(null) }} {...vClave.props('claveActual')} />
                  {vClave.mensaje('claveActual')}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Contraseña nueva</label>
                  <input className="input" type="password" autoComplete="new-password" value={clave.nueva} placeholder="Mínimo 6 caracteres"
                    onChange={e => { setClave(c => ({ ...c, nueva: e.target.value })); setAvisoClave(null) }} {...vClave.props('claveNueva')} />
                  {vClave.mensaje('claveNueva')}
                </div>
                <div className="form-group">
                  <label className="form-label">Repítela</label>
                  <input className="input" type="password" autoComplete="new-password" value={clave.repetir} placeholder="Repite la contraseña"
                    onChange={e => { setClave(c => ({ ...c, repetir: e.target.value })); setAvisoClave(null) }} {...vClave.props('claveRepetir')} />
                  {vClave.mensaje('claveRepetir')}
                </div>
              </div>

              <Exito texto={avisoClave} />
              <AvisoFaltantes faltantes={faltaEnClave} error={errorClave} />

              <button className="btn btn-outline" style={{ justifyContent: 'center' }}
                disabled={guardandoClave}
                onClick={guardarClave}>
                {guardandoClave ? 'Cambiando…' : 'Cambiar la contraseña'}
              </button>
            </>
          )}
        </Seccion>

        {/* ── El complejo, solo para su administrador ── */}
        {esAdmin && empresa && (
          <Seccion titulo="Mi complejo"
            sub="Esto es lo que ven los clientes cuando entran a tu ficha.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="input" value={comp.nombre}
                  onChange={e => { setComp(c => ({ ...c, nombre: e.target.value })); setAvisoComp(null) }} {...vComp.props('compNombre')} />
                {vComp.mensaje('compNombre')}
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="input" inputMode="tel" value={comp.telefono} placeholder="Ej: 44123456"
                  onChange={e => { setComp(c => ({ ...c, telefono: e.target.value })); setAvisoComp(null) }} {...vComp.props('compTelefono')} />
                {vComp.mensaje('compTelefono')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="input" value={comp.direccion}
                  onChange={e => { setComp(c => ({ ...c, direccion: e.target.value })); setAvisoComp(null) }} {...vComp.props('direccion')} />
                {vComp.mensaje('direccion')}
              </div>
              <div className="form-group">
                <label className="form-label">Zona</label>
                <select className="input" value={comp.zona}
                  onChange={e => { setComp(c => ({ ...c, zona: e.target.value })); setAvisoComp(null) }} {...vComp.props('zona')}>
                  <option value="">Elige la zona</option>
                  {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                {vComp.mensaje('zona')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Referencia para llegar</label>
              <input className="input" value={comp.referencia} placeholder="Ej: frente al surtidor, portón verde"
                onChange={e => { setComp(c => ({ ...c, referencia: e.target.value })); setAvisoComp(null) }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Abre a las</label>
                <input className="input" type="time" step="3600" value={comp.horaInicio}
                  onChange={e => { setComp(c => ({ ...c, horaInicio: e.target.value })); setAvisoComp(null) }} />
              </div>
              <div className="form-group">
                <label className="form-label">Cierra a las</label>
                <input className="input" type="time" step="3600" value={comp.horaFin}
                  onChange={e => { setComp(c => ({ ...c, horaFin: e.target.value })); setAvisoComp(null) }} {...vComp.props('horaFin')} />
                {vComp.mensaje('horaFin')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="input" rows={3} value={comp.descripcion} style={{ resize: 'none' }}
                onChange={e => { setComp(c => ({ ...c, descripcion: e.target.value })); setAvisoComp(null) }} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Deportes que ofreces</label>
              {vComp.mensaje('deportes')}
              <div id="campo-deportes" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DEPORTES.map(d => {
                  const on = comp.deportes.includes(d)
                  return (
                    <button key={d} type="button"
                      onClick={() => { setComp(c => ({ ...c,
                        deportes: on ? c.deportes.filter(x => x !== d) : [...c.deportes, d] })); setAvisoComp(null) }}
                      style={{ padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Outfit',
                        fontWeight: 600, fontSize: '0.8rem',
                        background: on ? 'rgba(0,188,212,0.15)' : '#1a1a1a',
                        border: '1px solid ' + (on ? '#00BCD4' : '#2a2a2a'),
                        color: on ? '#00BCD4' : '#888' }}>
                      {d}
                    </button>
                  )
                })}
              </div>
              <p style={{ color: '#666', fontSize: '0.72rem', marginTop: 6 }}>
                Son los que vas a poder elegir al publicar una cancha nueva.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">🔲 QR de pago</label>
              <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: 10 }}>
                Es el que ve el cliente cuando va a pagar su reserva. Sin esto no
                puede pagarte: le aparece un recuadro vacío.
              </p>
              <Imagen ruta={comp.qrPago} texto="tu QR" fondoBlanco
                ayuda="Una captura del QR de tu banco o billetera."
                cargando={subiendo === 'qrPago'} bloqueado={Boolean(subiendo)}
                onElegir={a => elegirImagen('qrPago', a)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Logo</label>
                <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 10 }}>
                  Va en la cabecera de tu ficha.
                </p>
                <Imagen ruta={comp.logo} texto="el logo"
                  cargando={subiendo === 'logo'} bloqueado={Boolean(subiendo)}
                  onElegir={a => elegirImagen('logo', a)} />
              </div>
              <div className="form-group">
                <label className="form-label">Foto del complejo</label>
                <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 10 }}>
                  Es la portada que ven en la lista de complejos.
                </p>
                <Imagen ruta={comp.foto} texto="una foto"
                  cargando={subiendo === 'foto'} bloqueado={Boolean(subiendo)}
                  onElegir={a => elegirImagen('foto', a)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ubicación en el mapa</label>
              <SelectorUbicacion lat={comp.lat} lng={comp.lng}
                onCambiar={(la, ln) => { setComp(c => ({ ...c, lat: la, lng: ln })); setAvisoComp(null) }} />
            </div>

            <Exito texto={avisoComp} />
            <AvisoFaltantes faltantes={faltaEnComplejo} error={errorComp || errorImagen} />

            <button className="btn btn-primary" style={{ justifyContent: 'center' }}
              disabled={guardandoComp} onClick={guardarComplejo}>
              {guardandoComp ? 'Guardando…' : 'Guardar los datos del complejo'}
            </button>
          </Seccion>
        )}
      </div>
    </Layout>
  )
}

/** Junta los errores de un formulario: lista para el aviso, props y mensaje de cada campo. */
function validacion(errores, orden, intento) {
  return {
    hay: Object.keys(errores).length > 0,
    faltantes: intento ? orden.filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] })) : [],
    props: (c) => propsCampo(c, errores[c], intento),
    mensaje: (c) => <MensajeCampo nombre={c} error={errores[c]} mostrar={intento} />,
  }
}
