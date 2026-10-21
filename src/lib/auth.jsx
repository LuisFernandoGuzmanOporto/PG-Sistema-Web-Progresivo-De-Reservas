import { createContext, useContext, useEffect, useState } from 'react'
import { traducirError } from './errores'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { SESION, USUARIO_ACTUAL, EMPLEADO_ACTUAL, correoDeAcceso } from './datos'
import { cargarDatos } from './carga'

// ─────────────────────────────────────────────────────────────────────────────
// SESION DEL USUARIO
//
// Un solo lugar sabe quien inicio sesion y con que rol. Las pantallas lo
// consultan con useAuth(); las rutas se protegen con <RutaProtegida>.
//
// El rol NO se guarda en el navegador: se lee de la tabla profiles. Y aunque
// alguien lo falsee, las politicas RLS de la base no le devolverian datos
// ajenos: la seguridad de verdad esta en el servidor, no aqui.
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

/** A donde entra cada rol al iniciar sesion. */
export const INICIO_POR_ROL = {
  cliente:       '/app/dashboard',
  admin_empresa: '/admin/dashboard',
  empleado:      '/empleado/panel',
  superadmin:    '/superadmin/dashboard',
}

export function AuthProvider({ children }) {
  const [sesion, setSesion]   = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [cargando, setCargar] = useState(true)
  const [errorDatos, setErrorDatos] = useState(null)

  // Sin internet no se puede traer el perfil, pero la sesion sigue siendo
  // valida. Antes eso dejaba el perfil vacio y la ruta protegida mandaba al
  // login, como si se hubiera cerrado la sesion. Ahora se usa el ultimo perfil
  // conocido de ESTE navegador, se avisa y se reintenta al volver la conexion.
  const [sinConexion, setSinConexion] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false)
  const [reintento, setReintento] = useState(0)

  useEffect(() => {
    const volvio = () => { setSinConexion(false); setReintento(n => n + 1) }
    const seFue  = () => setSinConexion(true)
    window.addEventListener('online', volvio)
    window.addEventListener('offline', seFue)
    return () => {
      window.removeEventListener('online', volvio)
      window.removeEventListener('offline', seFue)
    }
  }, [])

  // Al abrir la pagina la sesion guardada tarda un instante en leerse. Hasta
  // que eso ocurra no se sabe si hay alguien conectado, y sin este aviso las
  // rutas protegidas dan por hecho que no y mandan al login: recargar la
  // pagina expulsaba al usuario aunque su sesion siguiera viva.
  const [sesionLeida, setSesionLeida] = useState(false)

  /** Trae el perfil y, segun el rol, la empresa y los permisos que le tocan. */
  const cargarPerfil = async (userId) => {
    if (!userId) { setPerfil(null); return }

    const { data: p, error: errorPerfil } = await supabase
      .from('profiles')
      .select('id, nombre, correo, telefono, rol, puntos, activo, avatar_url, deporte_fav')
      .eq('id', userId)
      .single()

    if (!p && esFalloDeRed(errorPerfil)) {
      setSinConexion(true)
      const guardado = perfilGuardado(userId)
      if (guardado) aplicarPerfil(guardado)
      return
    }
    if (!p) { setPerfil(null); return }
    setSinConexion(false)

    let empresaId = null
    let empresaNombre = null
    let permisos = []

    if (p.rol === 'admin_empresa') {
      const { data: e } = await supabase
        .from('empresas').select('id, nombre').eq('admin_id', userId).maybeSingle()
      empresaId = e?.id ?? null
      empresaNombre = e?.nombre ?? null
    }

    if (p.rol === 'empleado') {
      const { data: em } = await supabase
        .from('empleados').select('empresa_id, permisos, turno, activo, empresas(nombre)')
        .eq('id', userId).maybeSingle()
      empresaId     = em?.empresa_id ?? null
      empresaNombre = em?.empresas?.nombre ?? null
      permisos      = em?.permisos ?? []
      p.turno       = em?.turno ?? null
      // Una cuenta dada de baja no puede operar, tenga los permisos que tenga
      if (em && !em.activo) p.activo = false
    }

    if (p.rol === 'superadmin') empresaNombre = 'Sportika Cochabamba'

    const completo = { ...p, empresaId, empresaNombre, permisos }
    guardarPerfil(completo)
    aplicarPerfil(completo)
  }

  /** Deja el perfil a disposicion de las pantallas (contexto y datos.js). */
  const aplicarPerfil = (p) => {
    const { empresaId, permisos } = p
    // Las pantallas leen de datos.js, no de este contexto. Se rellenan las
    // mismas referencias que ya importaron, para no tocar 26 archivos.
    Object.assign(SESION, {
      usuarioId: p.id, empresaId, rol: p.rol, permisos,
    })
    Object.assign(USUARIO_ACTUAL, {
      id: p.id, nombre: p.nombre, email: p.correo,
      telefono: p.telefono || '', puntos: p.puntos ?? 0,
      foto: p.avatar_url || null, deporteFav: p.deporte_fav || null,
    })
    if (p.rol === 'empleado') {
      Object.assign(EMPLEADO_ACTUAL, {
        id: p.id, empresa_id: empresaId, nombre: p.nombre,
        turno: p.turno, permisos, activo: p.activo,
      })
    }

    setPerfil(p)
  }

  // 1) Escuchar la sesion. IMPORTANTE: dentro de onAuthStateChange no se puede
  //    llamar a Supabase. El cliente mantiene un bloqueo mientras corre este
  //    callback y cualquier consulta ahi adentro se queda esperando para
  //    siempre. Por eso aqui solo se guarda la sesion, y el trabajo pesado va
  //    en el efecto de abajo.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session ?? null)
      setSesionLeida(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s ?? null)
      setSesionLeida(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 2) Con la sesion ya establecida, traer el perfil y los datos.
  //    Se piden aqui y no antes porque RLS decide que devolver segun quien
  //    pregunta: sin sesion, la base contesta vacio.
  const usuarioId = sesion?.user?.id ?? null

  useEffect(() => {
    let cancelado = false

    ;(async () => {
      if (!sesionLeida) return          // todavia no se sabe si hay sesion
      if (!usuarioId) {
        setPerfil(null)
        setCargar(false)
        return
      }
      setCargar(true)

      // Las dos cosas a la vez, no una despues de la otra.
      //
      // cargarDatos no necesita el perfil para nada: quien ve que fila esta
      // decidido por RLS del lado de la base, no por lo que sepa la pantalla.
      // Encadenarlas sumaba el tiempo de las dos sin ningun motivo.
      const [, r] = await Promise.all([
        cargarPerfil(usuarioId),
        cargarDatos({ forzar: true }),
      ])
      if (!cancelado) {
        setErrorDatos(r.error || null)
        setCargar(false)
      }
    })()

    return () => { cancelado = true }
  }, [usuarioId, sesionLeida, reintento])

  /**
   * Acepta un correo o el usuario de un empleado: si no lleva arroba, se le
   * agrega el dominio interno. Asi el empleado escribe solo 'rosa.v'.
   */
  const entrar = async (correo, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correoDeAcceso(correo), password,
    })
    if (error) return { error: mensajeDeError(error) }
    return { usuario: data.user }
  }

  const registrarse = async (correo, password, nombre) => {
    const { data, error } = await supabase.auth.signUp({
      email: correo.trim(), password,
      options: { data: { nombre, rol: 'cliente' } },   // lo lee el trigger de la base
    })
    if (error) return { error: mensajeDeError(error) }

    // Si el proyecto exige confirmar el correo, signUp devuelve el usuario
    // pero no una sesion. Sin este aviso la pantalla mandaba al panel, la ruta
    // protegida rebotaba al login y el usuario no entendia por que.
    if (!data.session) {
      return { debeConfirmar: true, correo: correo.trim() }
    }
    return { usuario: data.user }
  }

  /**
   * Manda al correo un codigo de 6 digitos para poner una contrasena nueva.
   *
   * Va por correo a proposito: cambiar una clave exige probar que la cuenta es
   * tuya. Si bastara con escribir la direccion de otro, esa seria la forma mas
   * facil de entrar a una cuenta ajena.
   *
   * Se usa un codigo y no un enlace porque el usuario no tiene que salir de la
   * aplicacion: en el telefono, el enlace suele abrir otro navegador y se
   * pierde la sesion a medio camino.
   *
   * Nunca se dice si la cuenta existe o no. Responder "ese correo no esta
   * registrado" le permitiria a cualquiera averiguar quien tiene cuenta.
   */
  const recuperarClave = async (correo) => {
    const limpio = String(correo || '').trim()

    // Los empleados no tienen correo: su cuenta la maneja su complejo
    if (!limpio.includes('@')) {
      return { error: 'Los empleados no recuperan su clave por correo. ' +
                      'Pídesela al administrador de tu complejo.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(limpio)
    if (error) return { error: mensajeDeError(error) }
    return { enviado: true }
  }

  /**
   * Comprueba el codigo que llego al correo.
   *
   * Si es correcto, Supabase abre una sesion y recién ahi se puede cambiar la
   * clave. Ese es el momento en que queda probado que la cuenta es suya.
   */
  const verificarCodigo = async (correo, codigo) => {
    const { error } = await supabase.auth.verifyOtp({
      email: String(correo).trim(),
      token: String(codigo).trim(),
      type: 'recovery',
    })
    if (error) {
      const m = (error.message || '').toLowerCase()
      // Supabase responde 'Token has expired or is invalid' sin distinguir los
      // dos casos, asi que el aviso tiene que cubrirlos juntos.
      if (m.includes('expired') || m.includes('invalid') || m.includes('token')) {
        return { error: 'Ese código no sirve: o está mal copiado, o ya venció. ' +
                        'Fíjate en el correo o pide uno nuevo.' }
      }
      return { error: mensajeDeError(error) }
    }
    return { ok: true }
  }

  /** Con el codigo ya verificado, guarda la contrasena nueva. */
  const cambiarMiClave = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: mensajeDeError(error) }
    return { ok: true }
  }

  const salir = async () => {
    olvidarPerfil()
    await supabase.auth.signOut()
    setPerfil(null)
    setSesion(null)
  }

  const valor = {
    sesion, perfil, errorDatos, sinConexion,
    reintentar: () => setReintento(n => n + 1),
    cargando: cargando || !sesionLeida,
    autenticado: Boolean(sesion && perfil),
    rol: perfil?.rol ?? null,
    entrar, registrarse, salir, recuperarClave, verificarCodigo, cambiarMiClave,
    recargarPerfil: () => cargarPerfil(sesion?.user?.id),
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

/**
 * La foto de la cuenta de Google con la que entra la persona, si entra con
 * Google. Sirve para que pueda volver a ella despues de subir otra o de
 * quitarla. Solo se acepta si viene de Google: es la misma regla de la base.
 */
export function fotoDeGoogle(usuario) {
  if (!usuario) return null
  const google = (usuario.identities || []).find(i => i.provider === 'google')
  const datos = google?.identity_data || (usuario.app_metadata?.provider === 'google' ? usuario.user_metadata : null)
  const url = datos?.avatar_url || datos?.picture || null
  return url && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(url) ? url : null
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

// ── Ultimo perfil conocido, para poder seguir sin conexion ──────────────────
// Solo datos de pantalla (nombre, rol, complejo). Nada de claves ni tokens:
// la sesion la guarda y la renueva el propio cliente de Supabase.
const CLAVE_PERFIL = 'sportika.perfil'

const esFalloDeRed = (error) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const m = (error?.message || '').toLowerCase()
  return m.includes('failed to fetch') || m.includes('networkerror') ||
         m.includes('load failed') || m.includes('network request failed')
}

function guardarPerfil(p) {
  try { localStorage.setItem(CLAVE_PERFIL, JSON.stringify(p)) } catch { /* modo privado */ }
}

function perfilGuardado(userId) {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PERFIL) || 'null')
    return p && p.id === userId ? p : null
  } catch { return null }
}

function olvidarPerfil() {
  try { localStorage.removeItem(CLAVE_PERFIL) } catch { /* modo privado */ }
}

/** Traduce los mensajes de Supabase, que vienen en ingles. */
function mensajeDeError(error) {
  const m = (error?.message || '').toLowerCase()
  const codigo = error?.code || ''

  if (m.includes('invalid login credentials')) {
    return 'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.'
  }
  if (m.includes('email not confirmed')) {
    return 'Tu cuenta existe, pero falta confirmar el correo. Abre el enlace que te enviamos a tu bandeja de entrada.'
  }
  if (m.includes('user already registered') || codigo === 'user_already_exists') {
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.'
  }

  // Este es el cupo de correos del servidor, no un bloqueo por intentos
  // fallidos: la cuenta ni siquiera llega a crearse.
  if (codigo === 'over_email_send_rate_limit' || m.includes('email rate limit')) {
    return 'En este momento no podemos enviar más correos de confirmación. Inténtalo de nuevo en unos minutos.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Hiciste demasiados intentos seguidos. Espera un minuto antes de volver a intentarlo.'
  }
  if (m.includes('should be different')) return 'La nueva contraseña debe ser distinta de la anterior.'
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.'
  // El servidor rechaza los dominios que no existen de verdad.
  if (codigo === 'email_address_invalid' || (m.includes('invalid') && m.includes('email'))) {
    return 'Ese correo no es una dirección válida. Revisa que esté bien escrito.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'No hay conexión a internet. Revisa tu conexión e inténtalo de nuevo.'
  }
  return traducirError(error, 'No se pudo completar la operación. Inténtalo de nuevo.')
}

// ── Proteccion de rutas ────────────────────────────────────────────────────

const Cargando = () => (
  <div style={{
    minHeight: '100vh', background: '#0f0f0f', color: '#666',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem',
  }}>
    Cargando…
  </div>
)

const SinConexion = () => {
  const { reintentar } = useAuth()
  return (
    <div role="alert" style={{
      minHeight: '100vh', background: '#0f0f0f', color: '#9a9a9a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif', textAlign: 'center', padding: 24, gap: 10,
    }}>
      <span style={{ fontSize: '3rem' }}>📡</span>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', letterSpacing: 1 }}>Sin conexión a internet</h1>
      <p style={{ fontSize: '0.9rem', maxWidth: 380, lineHeight: 1.6 }}>
        No pudimos comunicarnos con el servidor. Tu sesión sigue abierta:
        en cuanto vuelva la conexión, la página se actualizará sola.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={reintentar}>
        Reintentar ahora
      </button>
    </div>
  )
}

const CuentaSuspendida = () => {
  const { salir } = useAuth()
  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f0f', color: '#888',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif', textAlign: 'center', padding: 24, gap: 10,
    }}>
      <span style={{ fontSize: '3rem' }}>🔒</span>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>Cuenta suspendida</h1>
      <p style={{ fontSize: '0.9rem', maxWidth: 380, lineHeight: 1.6 }}>
        Tu cuenta fue dada de baja. Si crees que es un error, comunícate con el
        administrador del complejo o con Sportika.
      </p>
      <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={salir}>
        Cerrar sesión
      </button>
    </div>
  )
}

/**
 * Deja pasar solo si hay sesion y el rol es uno de los permitidos.
 * Si el rol no corresponde, manda a la pantalla de inicio de SU rol,
 * en vez de dejarlo en una pagina vacia sin entender por que.
 */
export function RutaProtegida({ roles, children }) {
  const { autenticado, cargando, perfil, sesion, sinConexion } = useAuth()
  const lugar = useLocation()

  if (cargando) return <Cargando />

  // Hay sesion pero no se pudo leer el perfil por falta de internet: no es
  // que se haya cerrado la sesion, asi que no se manda al login.
  if (!autenticado && sesion && sinConexion) return <SinConexion />

  if (!autenticado) {
    // Se conserva la direccion completa (con ?filtros y #seccion) para volver
    // ahi despues de iniciar sesion.
    return <Navigate to="/login" replace
      state={{ volverA: lugar.pathname + lugar.search + lugar.hash }} />
  }

  if (perfil && perfil.activo === false) {
    return <CuentaSuspendida />
  }

  if (roles && !roles.includes(perfil.rol)) {
    return <Navigate to={INICIO_POR_ROL[perfil.rol] || '/'} replace />
  }

  return children
}
