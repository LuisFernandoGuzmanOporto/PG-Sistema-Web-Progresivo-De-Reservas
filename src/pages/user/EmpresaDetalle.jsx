import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import Layout from '../../components/layout/Layout'
import NoEncontrado from '../../components/NoEncontrado'
import { empresasActivas, USUARIO_ACTUAL, torneosDeEmpresa, partidosDeEmpresa,
         conteoEquipos, ESTADO_TORNEO, CANCHAS_POR_EMPRESA,
         ENTRENAMIENTOS_POR_EMPRESA, recompensasVisibles, quedanDe, comoUsarCanje,
         CALIFICACIONES_POR_EMPRESA, promedioEstrellas,
         aceptaInscripciones, reservasDeEmpresa, reservaEnFranja, mismo,
         registrarReserva, registrarCanje, PARTIDOS_ESPONTANEOS, RESERVAS_EMPRESA,
         hiloDeComentarios, SESION, ocupaLaCancha, pts } from '../../lib/datos'
import { apartarHora, enviarComprobanteReserva, soltarApartado,
         revisarCodigoCanje, descuentoDeCanje, guardarCanje, guardarCalificacion,
         guardarPartidoEspontaneo, unirseAPartido, salirDePartido } from '../../lib/guardar'
import { subirComprobante, urlPublica } from '../../lib/archivos'
import { recargarComentarios, recargarHorarios } from '../../lib/carga'
import { useAuth } from '../../lib/auth'
import { horaDelPartido, fechaHoraElegida, yaSeJugo } from '../../lib/horaDelPartido'
import TabTorneos from './empresa/TabTorneos'
import TabRecompensas from './empresa/TabRecompensas'
import TabCalificaciones from './empresa/TabCalificaciones'
import TabEntrenamientos from './empresa/TabEntrenamientos'
import { NIVEL_COLORES } from './empresa/colores'
import { DIAS_SEMANA, DIA_INDICE, MESES, formatFecha,
         generarMesEntrenamientos, entrenamientosDeFecha,
         fechaLegible } from './empresa/calendario'

// Las imágenes del marcador del mapa (ver lib/iconoMapa.js)
import '../../lib/iconoMapa'
import { montoBs } from '../../lib/dinero'

const DEPORTE_COLORES = {
  'Futbol': '#ef4444', 'Futbol 5': '#ef4444', 'Wally': '#00BCD4',
  'Basquetbol': '#f59e0b', 'Voleibol': '#22c55e', 'Padel': '#8b5cf6',
}
// Alias con tilde: el nombre del deporte se muestra acentuado en toda la app
DEPORTE_COLORES['Fútbol']     = DEPORTE_COLORES['Futbol']
DEPORTE_COLORES['Básquetbol'] = DEPORTE_COLORES['Basquetbol']
DEPORTE_COLORES['Pádel']      = DEPORTE_COLORES['Padel']


const calcPromedio = promedioEstrellas


function generarSlots(horario) {
  const clean = horario.replace(/\s/g, '')
  const parts = clean.split('-')
  const h1 = parseInt(parts[0]); const h2 = parseInt(parts[1])
  const slots = []
  for (let h = h1; h < h2; h++) slots.push(String(h).padStart(2,'0') + ':00')
  return slots
}
// Fecha local en formato YYYY-MM-DD. No se usa toISOString porque convierte a UTC
// y en Bolivia (UTC-4) despues de las 20:00 devolveria la fecha del dia siguiente.
function labelDia(dateStr, hoyStr) {
  const d1 = new Date(dateStr + 'T12:00:00'); const d2 = new Date(hoyStr + 'T12:00:00')
  const diff = Math.round((d1 - d2) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  const dias = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
  return dias[d1.getDay()] + ' ' + d1.getDate()
}
function slotFin(slot) { return String(parseInt(slot) + 1).padStart(2,'0') + ':00' }
// '10:00:00' → '10:00'
const hhmm = (t) => String(t || '').slice(0, 5)
// 543000 ms → '9:03'
function mmss(ms) {
  const s = Math.ceil(ms / 1000)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

const HOY = formatFecha(new Date())
export default function EmpresaDetalle() {
  // Para que los puntos de la cabecera bajen apenas se canjea
  const { recargarPerfil } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const empresa            = empresasActivas().find(e => mismo(e.id, id))
  const canchasBase        = CANCHAS_POR_EMPRESA[id] || []
  // Coordenada 0,0 es «sin marcar»: cae en el oceano frente a África
  const tieneUbicacion     = Boolean(empresa?.lat) && Boolean(empresa?.lng)
  const torneos            = torneosDeEmpresa(id)
  const torneosAbiertos    = torneos.filter(aceptaInscripciones)
  // Solo las activas: la base rechaza el canje de una desactivada
  const recompensas        = recompensasVisibles(id)
  const entrenamientosBase = ENTRENAMIENTOS_POR_EMPRESA[id] || []

  const [calificaciones, setCalificaciones] = useState(CALIFICACIONES_POR_EMPRESA[id] || [])
  /**
   * La reseña que este cliente ya dejo, si dejo alguna.
   *
   * Antes esto arrancaba en false siempre: a alguien que ya habia calificado
   * se le ofrecia «Dejar mi calificación» como si fuera la primera vez, y al
   * enviarla pisaba la suya anterior sin avisarle. La base tiene UNIQUE por
   * (empresa, cliente) y guardarCalificacion hace upsert, asi que la de antes
   * simplemente desaparecia.
   */
  const miCalificacion = calificaciones.find(c => mismo(c.cliente_id, USUARIO_ACTUAL.id)) || null

  // El hilo se guarda en estado y se vuelve a leer despues de cada mensaje.
  // 'version' solo existe para forzar el redibujado: la lista vive en
  // datos.js y cambiarla ahi no le avisa a React.
  const [versionHilo, setVersionHilo] = useState(0)
  const refrescarHilo = async () => {
    await recargarComentarios(id)
    setVersionHilo(v => v + 1)
  }
  const hiloGeneral = useMemo(() => hiloDeComentarios(id), [id, versionHilo])

  // El dueño del complejo puede quitar un comentario de su propia ficha
  const soyDelComplejo = mismo(SESION.empresaId, id)

  const promedio = calcPromedio(calificaciones)
  const distribucion = [5,4,3,2,1].map(e => ({
    estrella: e,
    cantidad: calificaciones.filter(c => c.estrellas === e).length,
  }))

  const [errorCal, setErrorCal] = useState(null)

  /** Guarda el voto con estrellas. Devuelve true si quedo guardado. */
  const calificar = async (estrellas) => {
    if (!estaLogueado) { setShowLoginModal(true); return false }
    const g = await guardarCalificacion({ empresaId: id, estrellas })
    if (g.error) { setErrorCal(g.error); return false }

    const nombre = USUARIO_ACTUAL.nombre || 'Cliente'
    const nueva = {
      id: g.calificacion.id,
      cliente_id: USUARIO_ACTUAL.id,
      usuario: nombre,
      avatar: nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
      estrellas,
      fecha: new Date().toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day:'numeric', month:'short', year:'numeric' }),
    }
    // Reemplaza el voto propio si ya existia: nunca hay dos del mismo cliente
    setCalificaciones(prev => {
      const yaEsta = prev.some(c => mismo(c.id, nueva.id))
      const lista = yaEsta ? prev.map(c => mismo(c.id, nueva.id) ? { ...c, ...nueva } : c)
                           : [nueva, ...prev]
      CALIFICACIONES_POR_EMPRESA[id] = lista
      return lista
    })
    setErrorCal(null)
    return true
  }

  const hoy = formatFecha(new Date())
  const fechas = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return formatFecha(d)
  })
  const [puntosUsuario, setPuntos] = useState(USUARIO_ACTUAL.puntos)
  const [canjeHecho, setCanjeHecho] = useState(null)

  /** Canjear descuenta los puntos y genera el codigo que el empleado valida. */
  const [errorCanje, setErrorCanje] = useState(null)

  const canjear = async (r) => {
    if (puntosUsuario < r.puntos || quedanDe(r) === 0) return

    // La base decide: si no alcanzan los puntos, responde con el error
    const g = await guardarCanje(r)
    if (g.error) { setErrorCanje(g.error); return }

    registrarCanje(r, g.canje)               // queda en el registro compartido
    USUARIO_ACTUAL.puntos -= r.puntos
    setPuntos(pu => pu - r.puntos)
    setErrorCanje(null)
    setCanjeHecho({ ...r, codigo: g.canje.codigo })
    recargarPerfil?.()
  }
  const estaLogueado  = true

  // Permite entrar directo a una pestana: /app/empresa/1?tab=partidos
  const [searchParams] = useSearchParams()
  const [tab, setTab]                     = useState(searchParams.get('tab') || 'canchas')
  const [selectedFecha, setSelectedFecha] = useState(hoy)
  const [selectedSlots, setSelectedSlots] = useState({})

  // Que cancha muestra la agenda. Se elige una sola a la vez: en el telefono,
  // ver todas juntas obliga a desplazarse de costado y no se entiende nada.
  const [canchaVistaId, setCanchaVistaId] = useState(null)
  // La disponibilidad sale de las reservas reales del complejo, las mismas
  // que ve el administrador y atiende el empleado.
  const [reservasComplejo, setReservasComplejo] = useState(reservasDeEmpresa(id))
  const [showReservaModal, setShowReservaModal] = useState(null)
  const [modalPaso, setModalPaso]               = useState(1)
  // El nombre es para mostrarle al cliente cual eligio; la ruta es lo que se
  // guarda. Antes solo existia el nombre y por eso el archivo nunca llegaba.
  // ── Codigo de canje aplicado a esta reserva ──
  // El cliente canjeo puntos por «Descuento 20%» y recibio un codigo. Aca lo
  // pega y ve bajar el precio. Lo que se muestra es una vista previa: el
  // descuento de verdad lo calcula la base al guardar, con el precio de la
  // cancha y las horas. Si aca dijera una cosa y la base otra, manda la base.
  const [codigoCanje, setCodigoCanje]   = useState('')
  const [canjeAplicado, setCanjeAplicado] = useState(null)
  const [revisandoCodigo, setRevisando] = useState(false)
  const [errorCodigo, setErrorCodigo]   = useState(null)

  const aplicarCodigo = async () => {
    const codigo = codigoCanje.trim()
    if (!codigo) return
    setRevisando(true)
    setErrorCodigo(null)
    const r = await revisarCodigoCanje(codigo, id)
    setRevisando(false)
    if (r.error) { setCanjeAplicado(null); setErrorCodigo(r.error); return }
    setCanjeAplicado(r)
  }

  const quitarCodigo = () => {
    setCanjeAplicado(null); setCodigoCanje(''); setErrorCodigo(null)
  }

  /** Lo que descuenta el codigo sobre estas horas de esta cancha. */
  const descuentoDe = (cancha, horas) =>
    canjeAplicado ? descuentoDeCanje(canjeAplicado, { horas, precioHora: cancha.precio }) : 0

  const totalConDescuento = (cancha, horas) =>
    Math.max(0, horas * cancha.precio - descuentoDe(cancha, horas))

  const [comprobanteNombre, setComprobanteNombre] = useState('')
  const [comprobanteRuta, setComprobanteRuta]     = useState(null)
  const [subiendoComp, setSubiendoComp]           = useState(false)
  const [reservaExitosa, setReservaExitosa]       = useState(false)
  const [errorReserva, setErrorReserva]           = useState(null)
  const [showLoginModal, setShowLoginModal]        = useState(false)
  const [showCrearPartido, setShowCrearPartido]    = useState(false)
  const [partidosState, setPartidosState] = useState(partidosDeEmpresa(id))
  const [errorPartido, setErrorPartido] = useState(null)

  /** Los partidos viven en la lista compartida: el mismo partido se ve
   *  aqui y en la pantalla general de Partidos, con el mismo cupo. */
  const guardarPartidos = (lista) => {
    // Los de otros complejos y los que ya se jugaron quedan como estaban
    const otros = PARTIDOS_ESPONTANEOS.filter(x => !mismo(x.empresa_id, id) || yaSeJugo(x.fechaHora))
    PARTIDOS_ESPONTANEOS.length = 0
    PARTIDOS_ESPONTANEOS.push(...otros, ...lista)
    setPartidosState(lista)
  }
  const [verJugadores, setVerJugadores]   = useState(null)
  const [formDeporte, setFormDeporte]     = useState('')
  const [formCancha, setFormCancha]       = useState('')
  const [formCuando, setFormCuando]       = useState('Ahora mismo')
  const [formMax, setFormMax]             = useState(10)
  const [formApuesta, setFormApuesta]     = useState('')
  const [formHora, setFormHora]           = useState('08:00')
  const [formFechaPartido, setFormFechaPartido] = useState('')

  // Calendario de entrenamientos (solo lectura)
  const [mesEnt, setMesEnt]   = useState(new Date().getMonth())
  const [anioEnt, setAnioEnt] = useState(new Date().getFullYear())
  const [diaEnt, setDiaEnt]   = useState(null)   // dia seleccionado en el calendario

  // Calendario general del complejo (pestana Canchas)
  const [mesCal, setMesCal]   = useState(new Date().getMonth())
  const [anioCal, setAnioCal] = useState(new Date().getFullYear())

  const handleAccion = (cb) => { if (!estaLogueado) setShowLoginModal(true); else cb() }

  /**
   * Que pasa en una cancha a una hora dada.
   *
   * Devuelve el motivo ademas del estado: al cliente no le sirve saber que
   * esta ocupado, le sirve saber POR QUE. Una hora tomada por un entrenamiento
   * fijo se lee distinto que una que otra persona acaba de reservar.
   */
  const franjaDelDia = (canchaId, fecha, slot) => {
    const cancha = canchasBase.find(c => c.id === canchaId)
    if (!cancha) return { estado: 'libre' }

    // Un entrenamiento se repite todas las semanas en los dias que le tocan
    const ent = entrenamientosDelDia.find(e =>
      mismo(e.cancha_id, canchaId) &&
      e.horaInicio <= slot && slot < e.horaFin)
    if (ent) {
      return {
        estado: 'entrenamiento',
        titulo: ent.nombre,
        detalle: ent.entrenador && ent.entrenador !== '—' ? 'con ' + ent.entrenador : ent.nivel,
      }
    }

    const r = reservasComplejo.find(x =>
      x.cancha === cancha.nombre &&
      (x.fechaISO ? x.fechaISO === fecha : x.fecha === fechaTextoReserva(fecha)) &&
      ocupaLaCancha(x) &&
      x.horaInicio <= slot && slot < (x.horaFin || slotFin(x.horaInicio)))
    if (!r) return { estado: 'libre' }

    if (r.origen === 'torneo') {
      return {
        estado: r.estado === 'pendiente' ? 'torneo_pendiente' : 'torneo',
        titulo: r.torneo || 'Torneo',
        detalle: r.estado === 'pendiente'
          ? 'Cancha pedida para un torneo, aún sin aprobar'
          : 'La cancha está tomada por el torneo',
      }
    }

    // Alguien la eligió y está pagando. Si no termina a tiempo, se libera sola.
    if (r.estado === 'apartada') {
      return mismo(r.cliente_id, USUARIO_ACTUAL.id)
        ? { estado: 'apartada', titulo: 'Apartada a tu nombre',
            detalle: 'Sube tu comprobante antes de que se termine el tiempo' }
        : { estado: 'apartada', titulo: 'Apartada',
            detalle: 'Alguien está pagando esta hora. Si no termina a tiempo, se libera' }
    }

    return r.estado === 'pendiente'
      ? { estado: 'pendiente', titulo: 'Reserva por confirmar',
          detalle: 'Alguien la pidió y el complejo la está revisando' }
      : { estado: 'ocupada', titulo: 'Reservado',
          detalle: 'Esta hora ya está tomada' }
  }

  /** Solo el estado, para lo que no necesita el motivo. */
  const getSlotEstado = (canchaId, fecha, slot) => franjaDelDia(canchaId, fecha, slot).estado

  /** Las reservas de prueba guardan "Hoy"; el resto va con la fecha del calendario. */
  const fechaTextoReserva = (fecha) => fecha === HOY ? 'Hoy' : fecha
  const toggleSlot = (canchaId, slot) => {
    if (getSlotEstado(canchaId, selectedFecha, slot) !== 'libre') return
    setSelectedSlots(prev => {
      const cur = prev[canchaId] || []; const idx = cur.indexOf(slot)
      return { ...prev, [canchaId]: idx >= 0 ? cur.filter(s => s !== slot) : [...cur, slot] }
    })
  }
  // ── Apartar la hora mientras se paga (migraciones/038) ──
  // Al pulsar «Apartar la hora y pagar», la hora queda a nombre del cliente
  // por 10 minutos y recién ahí aparece el QR. Si otra persona la apartó un
  // instante antes, la base lo rechaza y el aviso sale arriba del formulario,
  // sin mostrar el QR: nadie paga por una hora que no tiene asegurada.
  const [apartado, setApartado]                   = useState(null)  // la reserva apartada y cuándo vence
  const [apartando, setApartando]                 = useState(false)
  const [restante, setRestante]                   = useState(0)     // milisegundos para pagar
  const [confirmarSalida, setConfirmarSalida]     = useState(false)
  const [enviando, setEnviando]                   = useState(false)
  const [pagoFueraDeTiempo, setPagoFueraDeTiempo] = useState(null)
  // Otra persona tomó la hora un instante antes: se le muestra cuál perdió
  const [horaTomada, setHoraTomada]               = useState(false)

  // Si la persona se va de la pantalla sin terminar, la hora se suelta
  const apartadoVivo = useRef(null)
  useEffect(() => { apartadoVivo.current = apartado }, [apartado])
  useEffect(() => () => {
    if (apartadoVivo.current) soltarApartado(apartadoVivo.current.id)
  }, [])

  // La cuenta regresiva usa la duración que dio el servidor y no la hora del
  // teléfono, que puede estar adelantada o atrasada
  useEffect(() => {
    if (!apartado) return undefined
    const tic = () => setRestante(Math.max(0, apartado.vence - Date.now()))
    tic()
    const t = setInterval(tic, 1000)
    return () => clearInterval(t)
  }, [apartado])

  // Lo que apartan o reservan los demás se vuelve a mirar cada 20 segundos,
  // mientras la pantalla está a la vista
  const actualizarAgenda = async () => {
    const r = await recargarHorarios(id)
    if (!r.error) setReservasComplejo(reservasDeEmpresa(id))
  }
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') actualizarAgenda()
    }, 20000)
    return () => clearInterval(t)
  }, [id])

  const limpiarReserva = () => {
    if (horaTomada && showReservaModal) setSelectedSlots(prev => ({ ...prev, [showReservaModal.id]: [] }))
    setHoraTomada(false)
    setShowReservaModal(null); setModalPaso(1); setComprobanteNombre(''); setComprobanteRuta(null)
    setReservaExitosa(false); setErrorReserva(null); setApartado(null); setConfirmarSalida(false)
    setPagoFueraDeTiempo(null)
  }

  /** A mitad del pago se pregunta antes de cerrar: si ya pagó, no debe soltar la hora. */
  const cerrarReserva = () => {
    if (apartado && !reservaExitosa && !pagoFueraDeTiempo) { setConfirmarSalida(true); return }
    limpiarReserva()
  }

  const soltarYCerrar = async () => {
    const r = apartado
    limpiarReserva()
    if (r) { await soltarApartado(r.id); actualizarAgenda() }
  }

  /**
   * Sube el comprobante apenas se elige. Si la subida falla, el cliente se
   * entera ahora y no despues de creer que ya reservo.
   */
  const elegirComprobante = async (archivo) => {
    if (!archivo) return
    setErrorReserva(null)
    setComprobanteNombre(archivo.name)
    setComprobanteRuta(null)
    setSubiendoComp(true)
    const r = await subirComprobante({ carpeta: id + '/reservas', archivo })
    setSubiendoComp(false)
    if (r.error) { setErrorReserva(r.error); setComprobanteNombre(''); return }
    setComprobanteRuta(r.ruta)
  }

  /** Paso 1: aparta la hora. Gana el pedido que llega primero a la base. */
  const apartar = async (cancha) => {
    const slots = [...(selectedSlots[cancha.id] || [])].sort()
    if (!slots.length || apartando) return

    // Si la agenda ya sabe que alguien la tomó, no hace falta preguntarle a la base
    const choque = slots.find(sl => reservaEnFranja(id, cancha.nombre, selectedFecha, sl, slotFin(sl)))
    if (choque) {
      setErrorReserva('La hora de las ' + choque + ' ya no está disponible: otra persona la tomó un instante antes que tú. Elige otra.')
      setHoraTomada(true)
      return
    }

    setApartando(true)
    setErrorReserva(null)
    const r = await apartarHora({
      empresaId: id, canchaId: cancha.id, fecha: selectedFecha,
      horaInicio: slots[0], horaFin: slotFin(slots[slots.length - 1]),
      monto: totalConDescuento(cancha, slots.length),
      codigoDescuento: canjeAplicado?.codigo || null,
    })
    setApartando(false)
    if (r.error) {
      setErrorReserva(r.error)
      if (r.ocupada) {
        setHoraTomada(true)
        actualizarAgenda()
      }
      return
    }
    const duracion = new Date(r.reserva.aparta_hasta) - new Date(r.reserva.created_at)
    setApartado({ ...r.reserva, vence: Date.now() + duracion })
    setModalPaso(2)
  }

  /** Paso 2: con el comprobante, la reserva pasa a pendiente y el complejo la revisa. */
  const enviarReserva = async (cancha) => {
    if (!apartado || !comprobanteRuta || enviando) return
    setEnviando(true)
    const r = await enviarComprobanteReserva(apartado.id, comprobanteRuta)
    setEnviando(false)
    if (r.error) { setErrorReserva(r.error); return }

    // El monto y el estado buenos son los que devuelve la base
    const g = r.reserva
    const i = RESERVAS_EMPRESA.findIndex(x => mismo(x.id, g.id))
    if (i >= 0) RESERVAS_EMPRESA.splice(i, 1)
    const nueva = registrarReserva({
      id: g.id, nro: g.nro, empresa_id: id, cliente_id: USUARIO_ACTUAL.id, cliente: USUARIO_ACTUAL.nombre,
      telefono: USUARIO_ACTUAL.telefono, cancha: cancha.nombre,
      fecha: fechaTextoReserva(selectedFecha), fechaISO: selectedFecha,
      horaInicio: hhmm(g.hora_inicio), horaFin: hhmm(g.hora_fin), monto: Number(g.monto_total),
      comprobante: g.comprobante_url, codigoDescuento: g.codigo_descuento || null, estado: g.estado,
    })
    setApartado(null)
    setReservasComplejo(reservasDeEmpresa(id))
    setSelectedSlots(prev => ({ ...prev, [cancha.id]: [] }))
    setErrorReserva(null)
    quitarCodigo()

    // Se le pasó el tiempo y otra persona tomó la hora: su comprobante quedó
    // guardado como prueba del pago y el complejo ya recibió el aviso
    if (g.estado === 'vencida') { setPagoFueraDeTiempo(nueva); actualizarAgenda(); return }
    setReservaExitosa(nueva)
  }

  const celdasEnt = generarMesEntrenamientos(anioEnt, mesEnt, entrenamientosBase)
  const mesEntAnterior  = () => { setDiaEnt(null); if (mesEnt === 0) { setMesEnt(11); setAnioEnt(a => a - 1) } else setMesEnt(m => m - 1) }
  const mesEntSiguiente = () => { setDiaEnt(null); if (mesEnt === 11) { setMesEnt(0); setAnioEnt(a => a + 1) } else setMesEnt(m => m + 1) }

  // ── Calendario general del complejo (pestana Canchas) ──
  const celdasCal = generarMesEntrenamientos(anioCal, mesCal, entrenamientosBase)
  const mesCalAnterior  = () => { if (mesCal === 0) { setMesCal(11); setAnioCal(a => a - 1) } else setMesCal(m => m - 1) }
  const mesCalSiguiente = () => { if (mesCal === 11) { setMesCal(0); setAnioCal(a => a + 1) } else setMesCal(m => m + 1) }

  // Cuantas franjas de ese dia ya estan tomadas (ocupadas o pendientes)
  const reservasDeFecha = (fecha) =>
    reservasComplejo.filter(r => r.fecha === fechaTextoReserva(fecha) && ocupaLaCancha(r)).length

  const entrenamientosDelDia = entrenamientosDeFecha(entrenamientosBase, selectedFecha)

  if (!empresa) {
    return <NoEncontrado que="Este complejo" volverA="/app/inicio" textoVolver="Ver los complejos" />
  }

  const slotsEmpresa = generarSlots(empresa.horario)

  // Si todavia no eligio ninguna, se muestra la primera del complejo
  const canchaVista = canchasBase.find(c => mismo(c.id, canchaVistaId)) || canchasBase[0] || null

  return (
    <Layout role="user">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/inicio')}
        style={{ marginBottom:16, padding:'4px 0', color:'#00BCD4', fontSize:'0.82rem' }}>
        Volver a Complejos
      </button>

      <div className="card" style={{ marginBottom:24, overflow:'hidden' }}>
        {/* Info superior */}
        <div className="ficha-cabecera" style={{ display:'flex', gap:0 }}>
          <div className="ficha-imagen" style={{ width:160, minHeight:150, background:'#222', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, borderRight:'1px solid #2a2a2a', overflow:'hidden' }}>
            {empresa.logo || empresa.foto
              ? <img src={urlPublica(empresa.logo || empresa.foto)} alt={empresa.nombre}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:'3.5rem' }}>{empresa.emoji}</span>}
          </div>
          <div style={{ padding:'18px 22px', flex:1, minWidth:0 }}>
            <div className="ficha-titulo" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
              <h1 style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'#f5f5f5', lineHeight:1.1 }}>{empresa.nombre}</h1>
              <span className="badge badge-success">Activo</span>
            </div>
            <p style={{ color:'#555', fontSize:'0.8rem', marginBottom:6 }}>{empresa.zona} — {empresa.direccion}</p>

            {/* Promedio estrellas */}
            <div
              style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:8, cursor:'pointer' }}
              onClick={() => setTab('calificaciones')}
            >
              <div style={{ display:'flex', gap:2 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{ fontSize:15, color: n <= Math.round(promedio) ? '#f59e0b' : '#2a2a2a', lineHeight:1 }}>★</span>
                ))}
              </div>
              <span style={{ fontFamily:'Bebas Neue', fontSize:'1rem', color:'#f59e0b' }}>{promedio}</span>
              <span style={{ fontSize:'0.72rem', color:'#555' }}>({calificaciones.length} calificaci{calificaciones.length !== 1 ? 'ones' : 'ón'})</span>
            </div>

            <p style={{ color:'#888', fontSize:'0.82rem', lineHeight:1.5, marginBottom:10 }}>{empresa.descripcion}</p>
            <div style={{ display:'flex', gap:20 }}>
              {empresa.horario && (
              <span style={{ fontSize:'0.78rem', color:'#00BCD4' }}>🕐 {empresa.horario}</span>
              )}
              {empresa.telefono && (
              <span style={{ fontSize:'0.78rem', color:'#555' }}>📞 {empresa.telefono}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mapa integrado */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 220px', borderTop:'1px solid #2a2a2a' }}>

          {/* Mapa Leaflet. Un complejo puede no tener el punto marcado todavia:
              antes eso lo mandaba a la coordenada 0,0, en medio del oceano. */}
          <div className="map-wrapper" style={{ height:210, position:'relative' }}>
            {!tieneUbicacion ? (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', gap:6, background:'#141414', padding:20, textAlign:'center' }}>
                <span style={{ fontSize:'1.8rem' }}>📍</span>
                <p style={{ color:'#666', fontSize:'0.82rem' }}>
                  Este complejo todavía no marcó su ubicación en el mapa.
                </p>
                <p style={{ color:'#555', fontSize:'0.76rem' }}>{empresa.direccion}</p>
              </div>
            ) : (
            <MapContainer
              center={[empresa.lat, empresa.lng]}
              zoom={15}
              scrollWheelZoom={false}
              style={{ height:'100%', width:'100%' }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[empresa.lat, empresa.lng]}>
                <Popup>
                  <strong>{empresa.nombre}</strong><br />
                  {empresa.direccion}
                </Popup>
              </Marker>
            </MapContainer>
            )}
          </div>

          {/* Panel derecho */}
          <div style={{ background:'#1a1a1a', borderLeft:'1px solid #2a2a2a', padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <p style={{ fontSize:'0.68rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, marginBottom:3 }}>Dirección</p>
              <p style={{ fontSize:'0.82rem', color:'#ccc' }}>{empresa.direccion}</p>
            </div>
            <div>
              <p style={{ fontSize:'0.68rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, marginBottom:3 }}>Zona</p>
              <p style={{ fontSize:'0.82rem', color:'#ccc' }}>{empresa.zona}, Cochabamba</p>
            </div>
            {empresa.referencia && (
              <div>
                <p style={{ fontSize:'0.68rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, marginBottom:3 }}>Referencia</p>
                <p style={{ fontSize:'0.78rem', color:'#666' }}>{empresa.referencia}</p>
              </div>
            )}
            <div style={{ marginTop:'auto' }}>
              {tieneUbicacion ? (
              <a
                href={`https://www.google.com/maps?q=${empresa.lat},${empresa.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'9px 14px', background:'rgba(0,188,212,0.1)', border:'1px solid rgba(0,188,212,0.3)', borderRadius:10, color:'#00BCD4', fontSize:'0.8rem', fontWeight:700, textDecoration:'none', fontFamily:'Outfit', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(0,188,212,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(0,188,212,0.1)'}
              >
                ➤ Cómo llegar
              </a>
              ) : (
                <p style={{ color:'#555', fontSize:'0.76rem', textAlign:'center' }}>
                  Sin ubicación en el mapa
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #2a2a2a', marginBottom:24, overflowX:'auto' }}>
        {[
          { key:'canchas',         label:'Calendario y Canchas' },
          { key:'torneos',         label:'Torneos (' + torneos.length + ')' },
          { key:'entrenamientos',  label:'Entrenamientos (' + entrenamientosBase.length + ')' },
          { key:'partidos',        label:'Partidos (' + partidosState.length + ')' },
          { key:'recompensas',     label:'Recompensas (' + recompensas.length + ')' },
          { key:'calificaciones',  label:'★ ' + promedio + ' (' + calificaciones.length + ')' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'12px 20px', background:tab===t.key?'rgba(139,0,0,0.2)':'transparent',
            color:tab===t.key?'#ff6b6b':'#666', border:'none',
            borderBottom:tab===t.key?'2px solid #8B0000':'2px solid transparent',
            cursor:'pointer', fontFamily:'Outfit', fontWeight:600, fontSize:'0.85rem',
            transition:'all 0.2s', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {tab==='canchas' && (
        <div>
          {/* ── Calendario mensual del complejo ── */}
          <div className="card" style={{ padding:20, marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <button onClick={mesCalAnterior} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #2a2a2a', borderRadius:8, color:'#888', width:34, height:34, cursor:'pointer', fontSize:'0.9rem' }}>◀</button>
              <p style={{ fontFamily:'Bebas Neue', fontSize:'1.25rem', color:'#f5f5f5', letterSpacing:1 }}>
                {MESES[mesCal]} {anioCal}
              </p>
              <button onClick={mesCalSiguiente} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #2a2a2a', borderRadius:8, color:'#888', width:34, height:34, cursor:'pointer', fontSize:'0.9rem' }}>▶</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6, marginBottom:6 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:'0.7rem', color:'#555', fontWeight:700, textTransform:'uppercase' }}>{d}</div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6 }}>
              {celdasCal.map((c, i) => {
                if (!c) return <div key={'v'+i} />
                const esHoy   = c.fecha === hoy
                const pasado  = c.fecha < hoy
                const sel     = c.fecha === selectedFecha
                const nEnt    = c.entrenamientos.length
                const nRes    = reservasDeFecha(c.fecha)
                return (
                  <button key={c.fecha} disabled={pasado}
                    onClick={() => { setSelectedFecha(c.fecha); setSelectedSlots({}) }}
                    style={{
                      aspectRatio:'1', display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:3,
                      borderRadius:10, padding:0,
                      background: sel ? 'rgba(139,0,0,0.30)' : pasado ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                      border:'1px solid '+(sel ? 'rgba(139,0,0,0.75)' : esHoy ? '#00BCD4' : '#1e1e1e'),
                      color: sel ? '#ff8080' : pasado ? '#3a3a3a' : '#ccc',
                      fontSize:'0.88rem', fontWeight: sel || esHoy ? 700 : 500,
                      cursor: pasado ? 'default' : 'pointer',
                      fontFamily:'Outfit', transition:'all 0.15s',
                    }}>
                    {c.dia}
                    <span style={{ display:'flex', gap:3, height:5 }}>
                      {nEnt > 0 && <span style={{ width:5, height:5, borderRadius:'50%', background:'#00BCD4' }} />}
                      {nRes > 0 && <span style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b' }} />}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:18, marginTop:14, paddingTop:12, borderTop:'1px solid #1e1e1e', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.72rem', color:'#888', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#00BCD4' }} /> Hay entrenamientos
              </span>
              <span style={{ fontSize:'0.72rem', color:'#888', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b' }} /> Hay canchas reservadas
              </span>
              <span style={{ fontSize:'0.72rem', color:'#888', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:3, border:'1px solid #00BCD4' }} /> Hoy
              </span>
            </div>
          </div>

          {/* ── Encabezado del día elegido ── */}
          <div style={{ marginBottom:16 }}>
            <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.4rem', color:'#f5f5f5' }}>
              {fechaLegible(selectedFecha)}
            </h3>
            <p style={{ color:'#666', fontSize:'0.8rem' }}>{labelDia(selectedFecha, hoy)} · Todo lo que hay este día en {empresa.nombre}</p>
          </div>

          {/* ── Entrenamientos del día ── */}
          {entrenamientosDelDia.length > 0 && (
            <div className="card" style={{ padding:18, marginBottom:20, borderLeft:'3px solid #00BCD4' }}>
              <p style={{ color:'#00BCD4', fontSize:'0.78rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                Entrenamientos de este día
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {entrenamientosDelDia.map(e => (
                  <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'10px 12px', background:'#1a1a1a', borderRadius:10, flexWrap:'wrap' }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ color:'#f5f5f5', fontSize:'0.88rem', fontWeight:600 }}>{e.nombre}</p>
                      <p style={{ color:'#666', fontSize:'0.75rem', marginTop:2 }}>
                        {e.entrenador} · {e.nivel}
                        {e.paraNinos && e.edadMin ? ` · ${e.edadMin}-${e.edadMax} años` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontFamily:'Bebas Neue', fontSize:'1.1rem', color:'#00BCD4' }}>
                        {e.horaInicio} - {e.horaFin}
                      </p>
                      {e.precio != null && e.precio !== '' && (
                        <p style={{ fontSize:'0.72rem', color:'#f59e0b' }}>Bs. {montoBs(e.precio)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ color:'#555', fontSize:'0.73rem', marginTop:10 }}>
                No necesitas inscribirte: preséntate en el complejo a la hora indicada.
              </p>
            </div>
          )}

          {/* ── Torneos y partidos del día ── */}
          {(torneos.length > 0 || partidosState.length > 0) && (
            <div className="card" style={{ padding:18, marginBottom:20, borderLeft:'3px solid #8B0000' }}>
              <p style={{ color:'#ff6b6b', fontSize:'0.78rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                También en este complejo
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {torneosAbiertos.length > 0 && (
                  <button onClick={() => setTab('torneos')} style={{ padding:'8px 14px', background:'rgba(139,0,0,0.12)', border:'1px solid rgba(139,0,0,0.35)', borderRadius:10, color:'#ff6b6b', fontSize:'0.8rem', fontFamily:'Outfit', fontWeight:600, cursor:'pointer' }}>
                    🏆 {torneosAbiertos.length} torneo{torneosAbiertos.length>1?'s':''} abierto{torneosAbiertos.length>1?'s':''}
                  </button>
                )}
                {partidosState.length > 0 && (
                  <button onClick={() => setTab('partidos')} style={{ padding:'8px 14px', background:'rgba(0,188,212,0.1)', border:'1px solid rgba(0,188,212,0.3)', borderRadius:10, color:'#00BCD4', fontSize:'0.8rem', fontFamily:'Outfit', fontWeight:600, cursor:'pointer' }}>
                    ⚽ {partidosState.length} partido{partidosState.length>1?'s':''} buscando jugadores
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Agenda del dia: hora por hora, como en un calendario ── */}
          <p style={{ color:'#f59e0b', fontSize:'0.78rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            Horarios del {fechaLegible(selectedFecha)}
          </p>

          {/* Que cancha se esta mirando */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:6, marginBottom:14 }}>
            {canchasBase.map(c => {
              const activa = mismo(c.id, canchaVista?.id)
              return (
                <button key={c.id} onClick={() => setCanchaVistaId(c.id)}
                  style={{ padding:'9px 14px', borderRadius:11, whiteSpace:'nowrap', cursor:'pointer',
                    fontFamily:'Outfit', fontWeight:700, fontSize:'0.8rem',
                    background: activa ? 'rgba(0,188,212,0.15)' : '#141414',
                    border:'1px solid '+(activa ? '#00BCD4' : '#2a2a2a'),
                    color: activa ? '#00BCD4' : '#888', opacity: c.disponible ? 1 : 0.5 }}>
                  {c.nombre}
                  <span style={{ display:'block', fontSize:'0.68rem', fontWeight:500, opacity:0.75 }}>
                    Bs. {montoBs(c.precio)}/hora
                  </span>
                </button>
              )
            })}
          </div>

          {!canchaVista ? (
            <div className="empty-state"><p>Este complejo todavía no publicó canchas.</p></div>
          ) : !canchaVista.disponible ? (
            <div className="card" style={{ padding:20 }}>
              <p style={{ color:'#f59e0b', fontSize:'0.86rem', fontWeight:600, marginBottom:4 }}>
                🛠️ Fuera de servicio
              </p>
              <p style={{ color:'#888', fontSize:'0.82rem' }}>
                El complejo marcó esta cancha como no disponible. Elige otra o prueba otro día.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {slotsEmpresa.map(slot => {
                const f      = franjaDelDia(canchaVista.id, selectedFecha, slot)
                const isSel  = (selectedSlots[canchaVista.id] || []).includes(slot)
                const libre  = f.estado === 'libre'
                const pasado = selectedFecha === HOY && parseInt(slot) <= new Date().getHours()

                // Cada situacion con su color, para reconocerla de un vistazo
                const look = isSel               ? { linea:'#00BCD4', fondo:'rgba(0,188,212,0.10)', texto:'#00BCD4' }
                  : pasado                       ? { linea:'#222',    fondo:'transparent',           texto:'#3a3a3a' }
                  : f.estado === 'entrenamiento' ? { linea:'#8b5cf6', fondo:'rgba(139,92,246,0.07)', texto:'#a78bfa' }
                  : f.estado === 'torneo'          ? { linea:'#8B0000', fondo:'rgba(139,0,0,0.10)',    texto:'#ff6b6b' }
                  : f.estado === 'torneo_pendiente'? { linea:'#8B0000', fondo:'rgba(139,0,0,0.05)',    texto:'#c96' }
                  : f.estado === 'apartada'      ? { linea:'#fb923c', fondo:'rgba(251,146,60,0.07)', texto:'#fb923c' }
                  : f.estado === 'pendiente'     ? { linea:'#f59e0b', fondo:'rgba(245,158,11,0.06)', texto:'#f59e0b' }
                  : f.estado === 'ocupada'       ? { linea:'#ef4444', fondo:'rgba(239,68,68,0.05)',  texto:'#ef4444' }
                  :                                { linea:'#2a2a2a', fondo:'transparent',           texto:'#f5f5f5' }

                const sePuede = libre && !pasado

                return (
                  <button key={slot} disabled={!sePuede && !isSel}
                    onClick={() => toggleSlot(canchaVista.id, slot)}
                    style={{ width:'100%', display:'flex', alignItems:'stretch', gap:0, textAlign:'left',
                      background: look.fondo, border:'none', borderTop:'1px solid #1e1e1e',
                      cursor: sePuede || isSel ? 'pointer' : 'default', fontFamily:'Outfit', padding:0 }}>

                    {/* La hora, como la columna izquierda de un calendario */}
                    <span style={{ width:66, flexShrink:0, padding:'14px 0 14px 14px',
                      fontSize:'0.8rem', fontWeight:600, color: pasado ? '#333' : '#666' }}>
                      {slot}
                    </span>

                    {/* La barra de color que identifica el estado */}
                    <span style={{ width:3, background: look.linea, flexShrink:0 }} />

                    <span style={{ flex:1, padding:'12px 14px', display:'flex',
                      justifyContent:'space-between', alignItems:'center', gap:10 }}>
                      <span>
                        <span style={{ display:'block', fontSize:'0.86rem', fontWeight:700, color: look.texto }}>
                          {isSel ? '✓ Lo estás eligiendo'
                            : pasado ? 'Ya pasó'
                            : libre ? 'Libre'
                            : f.titulo}
                        </span>
                        {(f.detalle && !libre && !pasado && !isSel) && (
                          <span style={{ display:'block', fontSize:'0.74rem', color:'#666', marginTop:2 }}>
                            {f.detalle}
                          </span>
                        )}
                      </span>

                      {sePuede && !isSel && (
                        <span style={{ fontSize:'0.76rem', color:'#555', whiteSpace:'nowrap' }}>
                          Bs. {montoBs(canchaVista.precio)}
                        </span>
                      )}
                      {f.estado === 'entrenamiento' && (
                        <span style={{ fontSize:'1rem' }}>🏃</span>
                      )}
                      {(f.estado === 'torneo' || f.estado === 'torneo_pendiente') && (
                        <span style={{ fontSize:'1rem' }}>🏆</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Referencia de colores */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', margin:'14px 0 18px' }}>
            {[
              { c:'#f5f5f5', t:'Libre' },
              { c:'#00BCD4', t:'Lo elegiste' },
              { c:'#ef4444', t:'Reservado' },
              { c:'#fb923c', t:'Apartada (alguien paga)' },
              { c:'#f59e0b', t:'Por confirmar' },
              { c:'#8b5cf6', t:'Entrenamiento' },
              { c:'#8B0000', t:'Torneo' },
            ].map(l => (
              <span key={l.t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.74rem', color:'#888' }}>
                <span style={{ width:9, height:9, borderRadius:3, background:l.c }} />
                {l.t}
              </span>
            ))}
          </div>

          {/* Lo elegido y el boton de reservar */}
          {canchaVista && canchaVista.disponible && (() => {
            const elegidos = [...(selectedSlots[canchaVista.id] || [])].sort()
            const total    = elegidos.length * canchaVista.precio
            return (
              // Queda fija abajo para no tener que subir a reservar. Con fondo
              // solido, porque flota sobre las filas de la agenda.
              <div className="card" style={{ padding:18, position:'sticky', bottom:12,
                background:'#141414', boxShadow:'0 -8px 24px rgba(0,0,0,0.6)' }}>
                {elegidos.length > 0 ? (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ fontSize:'0.78rem', color:'#666', marginBottom:6 }}>
                      {canchaVista.nombre} · {fechaLegible(selectedFecha)}
                    </p>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {elegidos.map(sl => (
                        <span key={sl} style={{ padding:'4px 9px', borderRadius:7, fontSize:'0.75rem',
                          background:'rgba(0,188,212,0.12)', color:'#00BCD4', fontWeight:600 }}>
                          {sl} - {slotFin(sl)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize:'0.8rem', color:'#666', marginBottom:12 }}>
                    Toca las horas libres que quieras. Puedes elegir varias seguidas.
                  </p>
                )}
                <button
                  onClick={() => handleAccion(() => { if(!elegidos.length) return; setShowReservaModal(canchaVista); setModalPaso(1); setComprobanteNombre(''); setReservaExitosa(false); setErrorReserva(null); actualizarAgenda() })}
                  disabled={!elegidos.length}
                  style={{ width:'100%', padding:'14px', borderRadius:12, fontFamily:'Outfit', fontWeight:700, fontSize:'0.92rem',
                    cursor: elegidos.length ? 'pointer' : 'not-allowed',
                    background: elegidos.length ? '#8B0000' : 'rgba(255,255,255,0.04)',
                    border:'1px solid '+(elegidos.length ? 'rgba(139,0,0,0.7)' : '#2a2a2a'),
                    color: elegidos.length ? '#fff' : '#444' }}>
                  {elegidos.length === 0
                    ? 'Elige un horario para reservar'
                    : 'Reservar ' + elegidos.length + ' hora' + (elegidos.length>1?'s':'') + ' · Bs. ' + montoBs(total)}
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {tab==='torneos' && (
        <TabTorneos torneos={torneos} empresaId={id}
          navigate={navigate} handleAccion={handleAccion} />
      )}
      {tab==='entrenamientos' && (
        <TabEntrenamientos empresa={empresa} entrenamientosBase={entrenamientosBase}
          celdasEnt={celdasEnt} mesEnt={mesEnt} anioEnt={anioEnt}
          mesEntAnterior={mesEntAnterior} mesEntSiguiente={mesEntSiguiente}
          diaEnt={diaEnt} setDiaEnt={setDiaEnt} />
      )}

      {tab==='partidos' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ background:'rgba(139,0,0,0.08)', border:'1px solid rgba(139,0,0,0.2)', borderRadius:10, padding:'8px 14px' }}>
              <p style={{ color:'#ff6b6b', fontSize:'0.82rem' }}>Partidos en {empresa.nombre}</p>
            </div>
            <button className="btn btn-accent btn-sm" style={{ color:'#000' }} onClick={() => handleAccion(() => { setFormDeporte(''); setFormCancha(''); setFormCuando('Ahora mismo'); setFormMax(10); setFormApuesta(''); setFormHora('08:00'); setFormFechaPartido(''); setErrorPartido(null); setShowCrearPartido(true) })}>Crear partido</button>
          </div>
          {/* Si no se pudo unir o salir de un partido, se dice por qué */}
          {!showCrearPartido && errorPartido && (
            <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:10, marginBottom:14 }}>
              <p style={{ color:'#ef4444', fontSize:'0.82rem', fontWeight:600 }}>✕ {errorPartido}</p>
            </div>
          )}
          {partidosState.length===0 ? (
            <div className="empty-state"><div className="empty-state-icon">P</div><h3>No hay partidos activos</h3><p>Sé el primero en crear un partido espontáneo aquí</p></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {partidosState.map(p => {
                const unidos = p.jugadoresUnidos.length
                const lleno = unidos >= p.maxJugadores
                const casiLleno = !lleno && (p.maxJugadores - unidos) <= 2
                const soyCreador = p.creadorId === USUARIO_ACTUAL.id
                const color = DEPORTE_COLORES[p.deporte] || '#00BCD4'
                const yaUnido = p.jugadoresUnidos.includes(USUARIO_ACTUAL.nombre)
                return (
                  <div key={p.id} className="card" style={{ padding:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#f5f5f5' }}>{p.deporte}</h3>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {casiLleno && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:'rgba(239,68,68,0.15)', color:'#ef4444' }}>¡Casi lleno!</span>}
                        {lleno && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:'rgba(100,100,100,0.15)', color:'#555' }}>Lleno</span>}
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:color+'22', color }}>{horaDelPartido(p.fechaHora)}</span>
                      </div>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'#666', marginBottom:10 }}>{p.cancha}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:'0.78rem', color:'#666' }}>Jugadores confirmados</span>
                      <span style={{ fontSize:'0.88rem', fontWeight:700, color:lleno?'#ef4444':casiLleno?'#f59e0b':'#00BCD4' }}>{unidos}/{p.maxJugadores}</span>
                    </div>
                    <div style={{ height:7, background:'#2a2a2a', borderRadius:4, marginBottom:12, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:((unidos/p.maxJugadores)*100)+'%', background:lleno?'#ef4444':casiLleno?'#f59e0b':color, borderRadius:4, transition:'width 0.3s' }} />
                    </div>
                    {p.apuesta && (
                      <div style={{ padding:'6px 10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, marginBottom:10 }}>
                        <p style={{ fontSize:'0.75rem', color:'#f59e0b' }}>{p.apuesta}</p>
                      </div>
                    )}
                    <div style={{ marginTop:12, display:'flex', gap:8 }}>
                      {soyCreador ? (
                        <button onClick={() => setVerJugadores(p)} style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', background:'rgba(0,188,212,0.1)', border:'1px solid rgba(0,188,212,0.3)', color:'#00BCD4' }}>
                          {unidos} unido{unidos!==1?'s':''}
                        </button>
                      ) : lleno ? (
                        <button disabled style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', background:'#1a1a1a', border:'1px solid #2a2a2a', color:'#444', cursor:'not-allowed' }}>Partido lleno</button>
                      ) : yaUnido ? (
                        <button onClick={async () => {
                          const g = await salirDePartido(p.id)
                          if (g.error) { setErrorPartido(g.error); return }
                          setErrorPartido(null)
                          guardarPartidos(partidosState.map(pt => pt.id===p.id?{...pt,jugadoresUnidos:pt.jugadoresUnidos.filter(j=>j!==USUARIO_ACTUAL.nombre)}:pt))
                        }}
                          style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444' }}>
                          Salir del partido
                        </button>
                      ) : (
                        <button onClick={() => handleAccion(async () => {
                          const g = await unirseAPartido(p.id)
                          if (g.error) { setErrorPartido(g.error); return }
                          setErrorPartido(null)
                          guardarPartidos(partidosState.map(pt => pt.id===p.id?{...pt,jugadoresUnidos:[...pt.jugadoresUnidos,USUARIO_ACTUAL.nombre]}:pt))
                        })}
                          style={{ flex:1, padding:'10px', borderRadius:10, fontFamily:'Outfit', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', background:'rgba(0,188,212,0.15)', border:'1px solid rgba(0,188,212,0.4)', color:'#00BCD4' }}>
                          Unirse al partido
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='recompensas' && (
        <TabRecompensas recompensas={recompensas} puntosUsuario={puntosUsuario}
          empresa={empresa} errorCanje={errorCanje}
          canjear={canjear} handleAccion={handleAccion} />
      )}

      {/* ══ TAB: CALIFICACIONES ══════════════════════════════════════════ */}
      {tab === 'calificaciones' && (
        <TabCalificaciones calificaciones={calificaciones} promedio={promedio}
          distribucion={distribucion} miCalificacion={miCalificacion}
          empresaId={id} hiloGeneral={hiloGeneral} versionHilo={versionHilo}
          soyDelComplejo={soyDelComplejo} refrescarHilo={refrescarHilo}
          calificar={calificar} errorCal={errorCal}
          adminId={empresa.adminId} />
      )}

      {showReservaModal && (
        <div className="modal-overlay" onClick={cerrarReserva}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div className="modal-header">
              <h2 className="modal-title">{modalPaso===1?'Confirmar Reserva':'Pago y Comprobante'}</h2>
              <button aria-label="Cerrar" className="btn btn-ghost btn-sm" onClick={cerrarReserva}>✕</button>
            </div>
            {/* Cerrar a mitad del pago: si ya pagó, no tiene que soltar la hora */}
            {confirmarSalida && (
              <div style={{ padding:'12px 14px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:10, marginBottom:14 }}>
                <p style={{ color:'#f59e0b', fontSize:'0.84rem', fontWeight:700, marginBottom:4 }}>¿Soltar la hora?</p>
                <p style={{ color:'#999', fontSize:'0.78rem', lineHeight:1.5, marginBottom:10 }}>
                  Si todavía no pagaste, la hora queda libre para otra persona. Si ya pagaste, no la sueltes: sube tu comprobante.
                </p>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex:1, justifyContent:'center' }} onClick={() => setConfirmarSalida(false)}>Seguir pagando</button>
                  <button className="btn btn-outline btn-sm" style={{ flex:1, justifyContent:'center' }} onClick={soltarYCerrar}>Soltar la hora</button>
                </div>
              </div>
            )}
            {errorReserva && (
              <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:10, marginBottom:14 }}>
                <p style={{ color:'#ef4444', fontSize:'0.82rem', fontWeight:600 }}>✕ {errorReserva}</p>
              </div>
            )}
            {pagoFueraDeTiempo ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <h3 style={{ color:'#f59e0b', fontFamily:'Bebas Neue', fontSize:'1.4rem', marginBottom:8 }}>Tu comprobante quedó guardado</h3>
                <p style={{ color:'#999', fontSize:'0.84rem', lineHeight:1.6, marginBottom:18 }}>
                  Se terminó tu tiempo y otra persona tomó esta hora antes de que llegara tu comprobante.
                  No lo perdiste: el complejo ya lo tiene y se comunicará contigo para devolverte el
                  dinero o darte otra hora. También lo ves en Mi Perfil, en Mis Reservas.
                </p>
                <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={limpiarReserva}>Entendido</button>
              </div>
            ) : reservaExitosa ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <h3 style={{ color:'#22c55e', fontFamily:'Bebas Neue', fontSize:'1.4rem', marginBottom:8 }}>¡Reserva enviada!</h3>
                <p style={{ color:'#f59e0b', fontFamily:'Bebas Neue', fontSize:'1.2rem', letterSpacing:1, marginBottom:6 }}>{reservaExitosa.nro}</p>
                <p style={{ color:'#888', fontSize:'0.85rem', marginBottom:20 }}>
                  {reservaExitosa.cancha} · {reservaExitosa.horaInicio} - {reservaExitosa.horaFin} · Bs. {montoBs(reservaExitosa.monto)}<br />
                  El complejo revisa tu comprobante y te confirma. Puedes seguirla en Mi Perfil.
                </p>
                <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={limpiarReserva}>Entendido</button>
              </div>
            ) : modalPaso===1 ? (
              <div>
                <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:16, marginBottom:18 }}>
                  <p style={{ color:'#f5f5f5', fontWeight:700, marginBottom:8 }}>{showReservaModal.nombre}</p>
                  <p style={{ fontSize:'0.82rem', color:'#666', marginBottom:10 }}>{labelDia(selectedFecha, hoy)} - {selectedFecha}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {(selectedSlots[showReservaModal.id]||[]).sort().map(s => (
                      <span key={s} style={{ padding:'4px 10px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                        background: horaTomada ? 'rgba(239,68,68,0.10)' : 'rgba(0,188,212,0.12)',
                        border: '1px solid ' + (horaTomada ? 'rgba(239,68,68,0.35)' : 'rgba(0,188,212,0.3)'),
                        color: horaTomada ? '#ef4444' : '#00BCD4', textDecoration: horaTomada ? 'line-through' : 'none' }}>
                        {s} - {slotFin(s)}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Codigo de canje.
                    Aca se usa lo que el cliente canjeo con sus puntos. Hasta
                    ahora el codigo se generaba y no habia donde ponerlo: se
                    gastaban los puntos y se pagaba el precio completo igual. */}
                {!horaTomada && (<>
                <div style={{ padding:'12px 14px', background:'rgba(0,188,212,0.05)', border:'1px solid rgba(0,188,212,0.18)', borderRadius:10, marginBottom:12 }}>
                  {canjeAplicado ? (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:'0.8rem', color:'#22c55e', fontWeight:700 }}>
                          {'\u2713'} {canjeAplicado.recompensa}
                        </p>
                        <p style={{ fontSize:'0.72rem', color:'#666' }}>{'C\u00f3digo'} {canjeAplicado.codigo}</p>
                      </div>
                      <button onClick={quitarCodigo}
                        style={{ padding:'6px 12px', background:'transparent', border:'1px solid #333', borderRadius:8, color:'#888', fontSize:'0.75rem', cursor:'pointer', fontFamily:'Outfit' }}>
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize:'0.78rem', color:'#00BCD4', fontWeight:600, marginBottom:8 }}>
                        {'¿Tienes un código de canje?'}
                      </p>
                      <div style={{ display:'flex', gap:8 }}>
                        <input className="input" placeholder="SPK-XXXXXX" value={codigoCanje}
                          onChange={e => { setCodigoCanje(e.target.value.toUpperCase()); setErrorCodigo(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') aplicarCodigo() }}
                          style={{ flex:1, letterSpacing:1 }} />
                        <button onClick={aplicarCodigo} disabled={!codigoCanje.trim() || revisandoCodigo}
                          style={{ padding:'0 18px', borderRadius:10, cursor: codigoCanje.trim() ? 'pointer' : 'not-allowed',
                            background: codigoCanje.trim() ? 'rgba(0,188,212,0.15)' : '#1a1a1a',
                            border:'1px solid ' + (codigoCanje.trim() ? 'rgba(0,188,212,0.4)' : '#2a2a2a'),
                            color: codigoCanje.trim() ? '#00BCD4' : '#444', fontWeight:700, fontFamily:'Outfit', fontSize:'0.82rem' }}>
                          {revisandoCodigo ? '...' : 'Aplicar'}
                        </button>
                      </div>
                      {errorCodigo && (
                        <p style={{ color:'#ef4444', fontSize:'0.74rem', marginTop:8, lineHeight:1.5 }}>{errorCodigo}</p>
                      )}
                      <p style={{ color:'#555', fontSize:'0.72rem', marginTop:8, lineHeight:1.5 }}>
                        {'Lo consigues canjeando tus puntos en Recompensas. Está en Mis Canjes.'}
                      </p>
                    </>
                  )}
                </div>

                <div style={{ padding:'12px 16px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, marginBottom:20 }}>
                  {(() => {
                    const horas = (selectedSlots[showReservaModal.id]||[]).length
                    const desc  = descuentoDe(showReservaModal, horas)
                    return (
                      <>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <p style={{ fontSize:'0.75rem', color:'#888' }}>{horas} hora(s) x Bs. {montoBs(showReservaModal.precio)}</p>
                          <span style={{ fontSize:'0.9rem', color: desc > 0 ? '#666' : '#f59e0b',
                            textDecoration: desc > 0 ? 'line-through' : 'none' }}>
                            Bs. {montoBs(horas * showReservaModal.precio)}
                          </span>
                        </div>
                        {desc > 0 && (
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                            <p style={{ fontSize:'0.75rem', color:'#22c55e' }}>{canjeAplicado.recompensa}</p>
                            <span style={{ fontSize:'0.9rem', color:'#22c55e' }}>{'\u2212'} Bs. {montoBs(desc)}</span>
                          </div>
                        )}
                        <div style={{ display:'flex', justifyContent:'flex-end', marginTop: desc > 0 ? 8 : 4, paddingTop: desc > 0 ? 8 : 0, borderTop: desc > 0 ? '1px solid rgba(245,158,11,0.2)' : 'none' }}>
                          <span style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f59e0b' }}>
                            Total: Bs. {montoBs(totalConDescuento(showReservaModal, horas))}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
                {/* El QR aparece recién con la hora apartada a su nombre */}
                <p style={{ color:'#777', fontSize:'0.76rem', lineHeight:1.5, marginBottom:12 }}>
                  Al continuar, la hora queda apartada a tu nombre por 10 minutos mientras pagas con el QR y subes el comprobante.
                </p>
                </>)}
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={limpiarReserva}>
                    {horaTomada ? 'Elegir otra hora' : 'Cancelar'}
                  </button>
                  {!horaTomada && (
                    <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} disabled={apartando}
                      onClick={() => apartar(showReservaModal)}>
                      {apartando ? 'Apartando la hora…' : 'Apartar la hora y pagar'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Cuánto le queda para pagar */}
                {apartado && (
                  <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:16,
                    background: restante > 120000 ? 'rgba(34,197,94,0.08)' : restante > 0 ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)',
                    border: '1px solid ' + (restante > 120000 ? 'rgba(34,197,94,0.3)' : restante > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)') }}>
                    {restante > 0 ? (
                      <p style={{ fontSize:'0.82rem', fontWeight:600, lineHeight:1.5,
                        color: restante > 120000 ? '#22c55e' : '#f59e0b' }}>
                        ⏱ La hora está apartada a tu nombre. Tienes <b>{mmss(restante)}</b> para pagar y subir el comprobante.
                      </p>
                    ) : (
                      <p style={{ fontSize:'0.8rem', fontWeight:600, lineHeight:1.5, color:'#ef4444' }}>
                        Se terminó tu tiempo. Si todavía no pagaste, no lo hagas: otra persona puede tomar la hora.
                        Si ya pagaste, sube igual tu comprobante: si la hora sigue libre, tu reserva continúa; si no,
                        el complejo lo recibe para devolverte el dinero.
                      </p>
                    )}
                  </div>
                )}
                <div style={{ textAlign:'center', marginBottom:18 }}>
                  <p style={{ color:'#888', fontSize:'0.82rem', marginBottom:10 }}>
                    {empresa.qrPago
                      ? 'Escanea el QR de pago de ' + empresa.nombre
                      : 'Este complejo todavía no cargó su QR'}
                  </p>
                  {/* El QR se muestra sobre blanco: la camara no lee un QR
                      con el fondo oscuro del resto de la aplicacion */}
                  <div style={{ width:160, height:160, borderRadius:14, margin:'0 auto 10px',
                    background: empresa.qrPago ? '#fff' : 'linear-gradient(135deg,#1a1a1a,#2a2a2a)',
                    border:'2px dashed ' + (empresa.qrPago ? 'rgba(34,197,94,0.4)' : '#333'),
                    display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', padding: empresa.qrPago ? 6 : 0 }}>
                    {empresa.qrPago
                      ? <img src={urlPublica(empresa.qrPago)} alt={'QR de pago de ' + empresa.nombre}
                          style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                      : <span style={{ color:'#555', fontSize:'0.8rem' }}>QR</span>}
                  </div>
                  {!empresa.qrPago && (
                    <p style={{ color:'#f59e0b', fontSize:'0.76rem', lineHeight:1.5, padding:'0 10px' }}>
                      Llama al complejo al {empresa.telefono || 'número que figura en su ficha'} para
                      coordinar el pago, y sube aquí el comprobante.
                    </p>
                  )}
                </div>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{ padding:'8px 24px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, textAlign:'center' }}>
                    <p style={{ fontSize:'0.72rem', color:'#888', marginBottom:2 }}>Monto a pagar</p>
                    <p style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'#f59e0b' }}>
                      Bs. {montoBs(totalConDescuento(showReservaModal, (selectedSlots[showReservaModal.id]||[]).length))}
                    </p>
                    {canjeAplicado && (
                      <p style={{ fontSize:'0.7rem', color:'#22c55e', marginTop:2 }}>
                        con {canjeAplicado.recompensa}
                      </p>
                    )}
                  </div>
                </div>
                <p style={{ fontSize:'0.82rem', color:'#888', fontWeight:600, marginBottom:10 }}>Sube tu comprobante de pago:</p>
                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'20px', border:'2px dashed '+(comprobanteRuta?'#22c55e':subiendoComp?'#f59e0b':'#2a2a2a'), borderRadius:12, cursor:subiendoComp?'wait':'pointer', background:comprobanteRuta?'rgba(34,197,94,0.06)':'rgba(255,255,255,0.02)', transition:'all 0.2s', marginBottom:18 }}>
                  <span style={{ fontSize:'0.82rem', color:comprobanteRuta?'#22c55e':subiendoComp?'#f59e0b':'#555', fontWeight:600, textAlign:'center' }}>
                    {subiendoComp   ? 'Subiendo ' + comprobanteNombre + '…'
                     : comprobanteRuta ? '✓ ' + comprobanteNombre
                     : 'Toca aquí para subir foto o PDF del pago'}
                  </span>
                  {comprobanteRuta && (
                    <span style={{ fontSize:'0.72rem', color:'#666', textAlign:'center' }}>
                      Listo. Pulsa «Enviar Reserva» para terminar.
                    </span>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" style={{ display:'none' }}
                    disabled={subiendoComp}
                    onChange={e => { elegirComprobante(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-outline" style={{ justifyContent:'center', flexShrink:0 }} onClick={() => setConfirmarSalida(true)}>Soltar la hora</button>
                  <button onClick={() => enviarReserva(showReservaModal)} disabled={!comprobanteRuta || subiendoComp || enviando}
                    style={{ flex:1, padding:'13px', borderRadius:12, fontFamily:'Outfit', fontWeight:700, fontSize:'0.9rem', background:comprobanteRuta?'#8B0000':'#1a1a1a', border:'1px solid '+(comprobanteRuta?'rgba(139,0,0,0.7)':'#2a2a2a'), color:comprobanteRuta?'#fff':'#444', cursor:comprobanteRuta?'pointer':'not-allowed', transition:'all 0.2s' }}>
                    {subiendoComp ? 'Subiendo el comprobante…' : enviando ? 'Enviando…' : comprobanteRuta?'Enviar Reserva':'Sube el comprobante para continuar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Canje realizado: el codigo se muestra para presentarlo en el mostrador */}
      {canjeHecho && (
        <div className="modal-overlay" onClick={() => setCanjeHecho(null)}>
          <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCanjeHecho(null)}>✕</button>
            </div>
            <p style={{ fontSize: '3rem', marginBottom: 6 }}>🎁</p>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#f5f5f5', marginBottom: 4 }}>¡Canje realizado!</h2>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 18 }}>{canjeHecho.nombre}</p>
            <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.4)', borderRadius: 12, marginBottom: 16 }}>
              <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: 4 }}>TU CÓDIGO</p>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f59e0b', letterSpacing: 3 }}>{canjeHecho.codigo}</p>
            </div>
            <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 16 }}>
              {comoUsarCanje(canjeHecho.tipo, empresa?.nombre)}
            </p>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 16 }}>
              {canjeHecho.puntos === 1 ? 'Se descontó' : 'Se descontaron'} <strong style={{ color: '#f59e0b' }}>{pts(canjeHecho.puntos)}</strong>.
              {puntosUsuario === 1 ? ' Te queda' : ' Te quedan'} <strong style={{ color: '#f5f5f5' }}>{pts(puntosUsuario)}</strong>.
            </p>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setCanjeHecho(null)}>Entendido</button>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" style={{ maxWidth:380, textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f5f5f5', marginBottom:8 }}>Inicia Sesión para Continuar</h2>
            <p style={{ color:'#666', fontSize:'0.85rem', marginBottom:24, lineHeight:1.6 }}>Necesitas una cuenta para realizar esta accion.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={() => setShowLoginModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={() => navigate('/login')}>Iniciar Sesión</button>
            </div>
          </div>
        </div>
      )}

      {showCrearPartido && (
        <div className="modal-overlay" onClick={() => setShowCrearPartido(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:460 }}>
            <div className="modal-header">
              <h2 className="modal-title">Crear Partido Espontáneo</h2>
              <button aria-label="Cerrar" className="btn btn-ghost btn-sm" onClick={() => setShowCrearPartido(false)}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Deporte</label>
                <select className="input" value={formDeporte} onChange={e => setFormDeporte(e.target.value)}>
                  <option value="">Selecciona deporte</option>
                  {empresa.deportes.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cancha</label>
                <select className="input" value={formCancha} onChange={e => setFormCancha(e.target.value)}>
                  <option value="">Selecciona cancha</option>
                  {canchasBase.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">¿Cuándo?</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['Ahora mismo','En 30 min','En 1 hora','Mañana','Otro día'].map(op => (
                    <button key={op} type="button" onClick={() => setFormCuando(op)}
                      style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit', fontSize:'0.82rem', background:formCuando===op?'rgba(0,188,212,0.15)':'#1a1a1a', border:'1px solid '+(formCuando===op?'#00BCD4':'#2a2a2a'), color:formCuando===op?'#00BCD4':'#555' }}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
              {(formCuando==='Mañana'||formCuando==='Otro día') && (
                <div style={{ display:'flex', gap:10 }}>
                  {formCuando==='Otro día' && (
                    <div className="form-group" style={{ flex:1, margin:0 }}>
                      <label className="form-label">Fecha</label>
                      <input className="input" type="date" value={formFechaPartido} onChange={e => setFormFechaPartido(e.target.value)} />
                    </div>
                  )}
                  <div className="form-group" style={{ flex:1, margin:0 }}>
                    <label className="form-label">Hora</label>
                    <input className="input" type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Jugadores necesarios</label>
                <input className="input" type="number" min={2} max={22} value={formMax} onChange={e => setFormMax(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Apuesta (opcional)</label>
                <input className="input" placeholder="Ej: Perdedores invitan refrescos" value={formApuesta} onChange={e => setFormApuesta(e.target.value)} />
              </div>
              {errorPartido && (
              <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:10, marginBottom:14 }}>
                <p style={{ color:'#ef4444', fontSize:'0.82rem', fontWeight:600 }}>✕ {errorPartido}</p>
              </div>
            )}
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={() => setShowCrearPartido(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent:'center' }}
                  disabled={!formDeporte||!formCancha}
                  onClick={async () => {
                    // La fecha y hora real del partido: lo que se muestra se calcula al verlo
                    const fechaHora = fechaHoraElegida(formCuando, { fecha: formFechaPartido, hora: formHora })
                    if (fechaHora === undefined) { setErrorPartido('Elige la fecha del partido.'); return }
                    if (fechaHora && new Date(fechaHora) < new Date()) {
                      setErrorPartido('Esa hora ya pasó. Elige una hora que todavía no llegó.'); return
                    }
                    const cancha = canchasBase.find(c => c.nombre === formCancha)
                    const g = await guardarPartidoEspontaneo({
                      empresaId: id, canchaId: cancha?.id, deporte: formDeporte,
                      fechaHora, maxJugadores: formMax, apuesta: formApuesta || null,
                    })
                    if (g.error) { setErrorPartido(g.error); return }

                    const nuevo = { id:g.partido.id, empresa_id:id, deporte:formDeporte, cancha:formCancha, fechaHora:g.partido.fecha_hora, jugadoresUnidos:[USUARIO_ACTUAL.nombre], maxJugadores:formMax, creadorId:USUARIO_ACTUAL.id, creador:USUARIO_ACTUAL.nombre, apuesta:formApuesta||null }
                    guardarPartidos([nuevo, ...partidosState])
                    setErrorPartido(null)
                    setShowCrearPartido(false)
                  }}>
                  Publicar partido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Quiénes están anotados en el partido */}
      {verJugadores && (
        <div className="modal-overlay" onClick={() => setVerJugadores(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Jugadores confirmados</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>{verJugadores.deporte} • {verJugadores.cancha}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setVerJugadores(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verJugadores.jugadoresUnidos.map((j, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid #2a2a2a' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,0,0,0.25)', color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    {j.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ color: '#f5f5f5', fontSize: '0.88rem', fontWeight: 600 }}>{j}</span>
                  {j === verJugadores.creador && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>ORGANIZADOR</span>
                  )}
                  {j === USUARIO_ACTUAL.nombre && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#00BCD4', fontWeight: 700 }}>TÚ</span>
                  )}
                </div>
              ))}
              {Array.from({ length: verJugadores.maxJugadores - verJugadores.jugadoresUnidos.length }).map((_, i) => (
                <div key={'libre' + i} style={{ padding: '10px 12px', border: '1px dashed #2a2a2a', borderRadius: 10, color: '#444', fontSize: '0.82rem' }}>
                  Lugar libre
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
