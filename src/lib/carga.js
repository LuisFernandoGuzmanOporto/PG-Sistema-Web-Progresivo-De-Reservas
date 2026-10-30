import { supabase } from './supabase'
import * as D from './datos'
import { traducirError } from './errores'
import { hoyBolivia, fechaDeBolivia, horaDeBolivia, fechaCorta } from './fecha'

// Las columnas del plantel que usa la aplicación
const COLUMNAS_JUGADOR = 'id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado'

// ─────────────────────────────────────────────────────────────────────────────
// CARGA DE DATOS DESDE SUPABASE
//
// Las pantallas siguen leyendo de datos.js exactamente igual que antes. Lo que
// hace este archivo es LLENAR esas mismas listas con lo que hay en la base,
// una sola vez al abrir la aplicacion.
//
// Por eso las 26 pantallas no se tocaron: siguen viendo los mismos arreglos,
// con la misma forma. Lo unico que cambio es de donde salen los datos.
//
// Nota: las listas se vacian y se vuelven a llenar en el sitio (length = 0 y
// push) en vez de reasignarse, porque las pantallas ya importaron ESA
// referencia. Si la reemplazaramos, seguirian mirando la lista vieja.
// ─────────────────────────────────────────────────────────────────────────────

const reemplazar = (arreglo, filas) => { arreglo.length = 0; arreglo.push(...filas) }
const vaciarObjeto = (obj) => { for (const k of Object.keys(obj)) delete obj[k] }

/** Agrupa filas por una columna: [{empresa_id:1},...] → { 1: [...] } */
const agrupar = (filas, campo) => {
  const out = {}
  for (const f of filas) (out[f[campo]] ??= []).push(f)
  return out
}

const hora = (t) => (t ? String(t).slice(0, 5) : null)          // '07:00:00' → '07:00'
const iniciales = (n) => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const EMOJI_DEPORTE = {
  'Fútbol': '⚽', 'Wally': '🎾', 'Pádel': '🏓', 'Básquetbol': '🏀', 'Voleibol': '🏐', 'Tenis': '🎾',
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Las reservas de hoy se muestran como "Hoy", igual que antes. */
const fechaReserva = (iso) => {
  if (!iso) return ''
  if (iso === hoyBolivia()) return 'Hoy'
  const [a, m, d] = iso.split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`
}

let yaCargado = false

// Las tablas que se cargan al abrir la aplicacion, en el orden en que las
// devuelve traerTodo(). Es el mismo orden de la funcion datos_iniciales().
const TABLAS = [
  'perfiles', 'empresas', 'empresa_deportes', 'canchas', 'empleados', 'entrenadores',
  'entrenamientos', 'recompensas', 'calificaciones', 'reservas', 'canjes',
  'torneos', 'solicitudes_cancha', 'equipos', 'equipo_jugadores', 'partidos_torneo', 'eventos_partido',
  'partidos_espontaneos', 'partido_jugadores', 'bitacora', 'puntos_historial', 'profiles', 'comentarios',
  'horarios_ocupados',
]

/**
 * Todo lo que la aplicacion necesita al abrirse, en UNA sola peticion.
 *
 * Antes eran 24 consultas en paralelo. Una sola espera para la persona, pero
 * 24 peticiones para el servidor: cada una verifica la sesion, cambia de rol
 * y toma una conexion. Las pruebas de carga (pruebas/carga) mostraron que ese
 * era el limite: con muchos usuarios a la vez, el servidor se llenaba de
 * peticiones chicas. La funcion datos_iniciales() (migraciones/035) hace las
 * mismas 24 consultas dentro de la base, con los permisos de quien la llama,
 * y devuelve todo junto.
 *
 * Si la base todavia no tiene esa funcion, se vuelve a las 24 consultas.
 */
async function traerTodo() {
  const { data, error } = await supabase.rpc('datos_iniciales')
  if (!error && data) return TABLAS.map(t => ({ data: data[t] || [], error: null }))

  return Promise.all([
    supabase.from('perfiles_publicos').select('id, nombre, avatar_url'),
    supabase.from('empresas').select('*').order('nombre'),
    supabase.from('empresa_deportes').select('*'),
    supabase.from('canchas').select('*').order('nombre'),
    supabase.from('empleados').select('*'),
    supabase.from('entrenadores').select('*').order('nombre'),
    supabase.from('entrenamientos').select('*').order('hora_inicio'),
    supabase.from('recompensas').select('*').order('puntos'),
    supabase.from('calificaciones').select('*').order('created_at', { ascending: false }),
    supabase.from('reservas').select('*').order('hora_inicio'),
    supabase.from('canjes').select('*').order('created_at', { ascending: false }),
    supabase.from('torneos').select('*').order('fecha_inicio'),
    supabase.from('solicitudes_cancha').select('*'),
    supabase.from('equipos').select('*'),
    supabase.from('equipo_jugadores').select(COLUMNAS_JUGADOR).order('dorsal'),
    supabase.from('partidos_torneo').select('*').order('fecha_hora'),
    supabase.from('eventos_partido').select('*').order('minuto'),
    supabase.from('partidos_espontaneos').select('*'),
    supabase.from('partido_jugadores').select('*'),
    supabase.from('bitacora').select('*').order('created_at', { ascending: false }),
    supabase.from('puntos_historial').select('*').order('created_at', { ascending: false }),
    // Solo el super administrador recibe filas ajenas: lo decide RLS
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('comentarios').select('*').order('created_at'),
    // Las horas que tienen tomadas los DEMAS clientes (migraciones/033).
    // Sin nombres ni montos: solo cancha, dia y hora.
    supabase.from('horarios_ocupados').select('*'),
  ])
}

/**
 * Trae todo de Supabase y llena las listas de datos.js.
 * Devuelve { ok } o { error } con un mensaje entendible.
 */
export async function cargarDatos({ forzar = false } = {}) {
  if (yaCargado && !forzar) return { ok: true }

  try {
    // El teléfono del capitán no viaja con el equipo: lo ven solo el capitán y
    // quien organiza el torneo (migraciones/046). La consulta devuelve solo esos.
    const [[
      perfiles, empresas, deportes, canchas, empleados, entrenadores,
      entrenamientos, recompensas, calificaciones, reservas, canjes,
      torneos, solicitudes, equipos, jugadores, partidos, eventos,
      espontaneos, unidos, bitacora, puntos, usuarios, comentarios, ocupados,
    ], contactos] = await Promise.all([
      traerTodo(),
      supabase.from('equipo_contactos').select('equipo_id, telefono'),
    ])

    const fallo = [empresas, canchas, torneos].find(r => r.error)
    if (fallo) return { error: traducirError(fallo.error, 'No se pudieron traer los datos') }

    // Diccionarios para resolver nombres e ids sin recorrer todo cada vez
    const nombrePorPerfil = new Map((perfiles.data || []).map(p => [p.id, p.nombre]))
    const fotoPorPerfil   = new Map((perfiles.data || []).map(p => [p.id, p.avatar_url || null]))
    const nombreDeCancha  = new Map((canchas.data || []).map(c => [c.id, c.nombre]))
    const nombreEntrenador = new Map((entrenadores.data || []).map(e => [e.id, e.nombre]))
    const deportesDe = agrupar(deportes.data || [], 'empresa_id')

    // ── Complejos ────────────────────────────────────────────────────────
    // Los correos solo los ve quien tenga permiso de leer esos perfiles; para
    // los demas queda vacio, que es justo lo que corresponde.
    const correoPorPerfil = new Map((usuarios.data || []).map(u => [u.id, u.correo]))

    reemplazar(D.EMPRESAS, (empresas.data || []).map(e => {
      const sus = (deportesDe[e.id] || []).map(d => d.deporte)
      return {
        id: e.id, nombre: e.nombre, zona: e.zona, direccion: e.direccion,
        telefono: e.telefono, descripcion: e.descripcion,
        emoji: EMOJI_DEPORTE[sus[0]] || '🏟️',
        // Sin horas cargadas quedaba el texto 'null - null', que ademas rompia
        // el calculo de las franjas porque parecia un horario valido.
        horario: e.horario_inicio && e.horario_fin
          ? `${hora(e.horario_inicio)} - ${hora(e.horario_fin)}` : '',
        // Las mismas horas por separado, para revisar que algo quede adentro
        apertura: hora(e.horario_inicio), cierre: hora(e.horario_fin),
        deportes: sus,
        lat: Number(e.lat), lng: Number(e.lng), referencia: e.referencia,
        // Rutas dentro del deposito de archivos, no direcciones completas:
        // la direccion se arma al mostrarlas (src/lib/archivos.js)
        qrPago: e.qr_pago_url || null,
        logo: e.logo_url || null, foto: e.foto_url || null,
        estado: e.estado,
        adminId: e.admin_id || null,
        admin: nombrePorPerfil.get(e.admin_id) || '—',
        adminEmail: correoPorPerfil.get(e.admin_id) || '',
        fechaSolicitud: fechaCorta(fechaDeBolivia(e.created_at)),
      }
    }))

    // ── Canchas por complejo ─────────────────────────────────────────────
    vaciarObjeto(D.CANCHAS_POR_EMPRESA)
    for (const [empresaId, filas] of Object.entries(agrupar(canchas.data || [], 'empresa_id'))) {
      D.CANCHAS_POR_EMPRESA[empresaId] = filas.map(c => ({
        id: c.id, nombre: c.nombre, deporte: c.deporte,
        precio: Number(c.precio_hora), disponible: c.activa,
        capacidad: c.capacidad, apertura: hora(c.apertura), cierre: hora(c.cierre),
        descripcion: c.descripcion || '',
      }))
    }

    // ── Empleados ────────────────────────────────────────────────────────
    // El teléfono vive en el perfil del empleado, que solo lee él mismo. Su
    // administrador lo recibe con una función que no entrega nada más
    // (migraciones/040); a cualquier otro, la función no le devuelve nada.
    // No se pregunta el rol: el perfil se carga al mismo tiempo que esto.
    const telefonoDeEmpleado = new Map()
    if ((empleados.data || []).length) {
      const { data: tels } = await supabase.rpc('telefonos_de_mis_empleados')
      for (const t of tels || []) telefonoDeEmpleado.set(t.id, t.telefono)
    }
    reemplazar(D.EMPLEADOS, (empleados.data || []).map(e => ({
      id: e.id, empresa_id: e.empresa_id,
      nombre: nombrePorPerfil.get(e.id) || e.usuario,
      usuario: e.usuario, telefono: telefonoDeEmpleado.get(e.id) || null, turno: e.turno,
      activo: e.activo, permisos: e.permisos || [],
      creado: fechaCorta(fechaDeBolivia(e.created_at)),
    })))

    // ── Entrenadores y entrenamientos ────────────────────────────────────
    reemplazar(D.ENTRENADORES, (entrenadores.data || []).map(e => ({
      id: e.id, empresa_id: e.empresa_id, nombre: e.nombre, email: e.correo,
      telefono: e.telefono, deporte: e.deporte, especialidad: e.especialidad, activo: e.activo,
    })))

    vaciarObjeto(D.ENTRENAMIENTOS_POR_EMPRESA)
    for (const [empresaId, filas] of Object.entries(agrupar(entrenamientos.data || [], 'empresa_id'))) {
      D.ENTRENAMIENTOS_POR_EMPRESA[empresaId] = filas.map(t => ({
        id: t.id, deporte: t.deporte, nombre: t.nombre,
        // Si el complejo todavia no le asigno profe, se dice; un guion suelto
        // parecia un dato que no habia cargado
        entrenador: nombreEntrenador.get(t.entrenador_id) || 'Sin entrenador asignado',
        // La cancha que ocupa: es lo que permite marcar esa hora como tomada
        cancha_id: t.cancha_id, cancha: nombreDeCancha.get(t.cancha_id) || null,
        dias: t.dias || [], horaInicio: hora(t.hora_inicio), horaFin: hora(t.hora_fin),
        nivel: t.nivel, precio: t.precio === null ? null : Number(t.precio),
        paraNinos: t.para_ninos, edadMin: t.edad_min, edadMax: t.edad_max,
        // Cuantos alumnos entran. null = el complejo no puso limite
        cupo: t.cupo_maximo ?? null,
        descripcion: t.descripcion,
      }))
    }

    // ── Recompensas y canjes ─────────────────────────────────────────────
    const canjesPorRecompensa = new Map()
    for (const c of (canjes.data || [])) {
      canjesPorRecompensa.set(c.recompensa_id, (canjesPorRecompensa.get(c.recompensa_id) || 0) + 1)
    }

    vaciarObjeto(D.RECOMPENSAS_POR_EMPRESA)
    for (const [empresaId, filas] of Object.entries(agrupar(recompensas.data || [], 'empresa_id'))) {
      D.RECOMPENSAS_POR_EMPRESA[empresaId] = filas.map(r => ({
        id: r.id, empresa_id: r.empresa_id, nombre: r.nombre, icono: r.emoji,
        tipo: r.tipo, descripcion: r.descripcion, puntos: r.puntos, stock: r.stock,
        // Los cuenta la base (migraciones/046): un cliente solo puede leer sus
        // propios canjes, y contándolos aquí le quedaban más de los que hay.
        canjeados: r.canjeados ?? canjesPorRecompensa.get(r.id) ?? 0, activa: r.activa,
        // Cuanto descuenta, para las de tipo descuento_reserva.
        // 'porcentaje' 20 = 20%; 'horas_gratis' 1 = una hora al precio de esa cancha.
        descuentoTipo: r.descuento_tipo || null,
        descuentoValor: r.descuento_valor === null || r.descuento_valor === undefined
          ? null : Number(r.descuento_valor),
      }))
    }

    const nombreRecompensa = new Map((recompensas.data || []).map(r => [r.id, r.nombre]))
    const tipoRecompensa   = new Map((recompensas.data || []).map(r => [r.id, r.tipo]))
    const descuentoDe      = new Map((recompensas.data || []).map(r => [r.id,
      r.descuento_tipo ? { tipo: r.descuento_tipo, valor: Number(r.descuento_valor) } : null]))
    reemplazar(D.CANJES, (canjes.data || []).map(c => ({
      id: c.id, empresa_id: c.empresa_id, cliente_id: c.cliente_id,
      cliente: nombrePorPerfil.get(c.cliente_id) || '—',
      recompensa: nombreRecompensa.get(c.recompensa_id) || '—',
      tipo: tipoRecompensa.get(c.recompensa_id) || 'fisico',
      puntos: c.puntos_gastados, codigo: c.codigo, estado: c.estado,
      // Para poder decirle al cliente donde usar el codigo y cuanto descuenta
      descuento: descuentoDe.get(c.recompensa_id) || null,
      usadoEn: c.usado_en || null,
      // Quién entregó el premio y cuándo: lo anota la base (migraciones/040)
      entregadoPor: c.entregado_por ? (nombrePorPerfil.get(c.entregado_por) || null) : null,
      entregadoEl: c.entregado_at || null,
      fecha: fechaReserva(fechaDeBolivia(c.created_at)),
      // Cuándo lo hizo, para el historial de actividad
      creadoEl: c.created_at,
    })))

    // ── Calificaciones ───────────────────────────────────────────────────
    vaciarObjeto(D.CALIFICACIONES_POR_EMPRESA)
    for (const [empresaId, filas] of Object.entries(agrupar(calificaciones.data || [], 'empresa_id'))) {
      D.CALIFICACIONES_POR_EMPRESA[empresaId] = filas.map(c => {
        const autor = nombrePorPerfil.get(c.cliente_id) || 'Cliente'
        return {
          id: c.id, empresa_id: c.empresa_id, usuario: autor, avatar: iniciales(autor),
          // De quien es: sin esto la pantalla no podia saber si el que la mira
          // ya habia dejado la suya, y le ofrecia dejar otra encima
          cliente_id: c.cliente_id,
          estrellas: c.estrellas,
          fecha: fechaReserva(fechaDeBolivia(c.created_at)),
        }
      })
    }

    // ── Comentarios ──────────────────────────────────────────────────────
    // Llegan planos, con «a quien le respondo» adentro. El hilo lo arma la
    // pantalla con hiloDeComentarios(): asi la misma lista sirve para el hilo
    // suelto del complejo y para el que cuelga de una reseña.
    vaciarObjeto(D.COMENTARIOS_POR_EMPRESA)
    for (const [empresaId, filas] of Object.entries(agrupar(comentarios.data || [], 'empresa_id'))) {
      D.COMENTARIOS_POR_EMPRESA[empresaId] = filas.map(c => {
        const autor = nombrePorPerfil.get(c.autor_id) || 'Cliente'
        return {
          id: c.id, empresa_id: c.empresa_id, autor_id: c.autor_id,
          autor, avatar: iniciales(autor), foto: fotoPorPerfil.get(c.autor_id) || null,
          texto: c.texto,
          calificacion_id: c.calificacion_id, responde_a: c.responde_a,
          creado: c.created_at, editado: Boolean(c.editado_at),
        }
      })
    }

    // ── Reservas ─────────────────────────────────────────────────────────
    // Un apartado que se vencio sin pago no le sirve a nadie: la hora ya quedo
    // libre. El que trae comprobante si queda: es el pago que hay que devolver.
    reemplazar(D.RESERVAS_EMPRESA, (reservas.data || [])
      .filter(r => !(r.estado === 'vencida' && !r.comprobante_url))
      .map(r => ({
      id: r.id, nro: r.nro, empresa_id: r.empresa_id, cliente_id: r.cliente_id,
      // Las presenciales no tienen cuenta: ahi vale el nombre que anoto el empleado
      cliente: nombrePorPerfil.get(r.cliente_id) || r.cliente_nombre || '—',
      telefono: r.cliente_telefono || null,
      cancha: nombreDeCancha.get(r.cancha_id) || '—',
      // 'fecha' es el texto que se muestra ('Hoy', '16 Sep 2026'); 'fechaISO'
      // es el dato con el que se compara. Tenerlos separados evita que una
      // reserva quede invisible en el calendario por una diferencia de formato.
      fecha: fechaReserva(r.fecha), fechaISO: r.fecha,
      horaInicio: hora(r.hora_inicio), horaFin: hora(r.hora_fin),
      monto: Number(r.monto_total), estado: r.estado, creadoEl: r.created_at,
      // Hasta cuando dura el apartado, con la hora del servidor (migraciones/038)
      apartaHasta: r.aparta_hasta || null,
      // Antes aqui iba un true/false, y por eso el complejo solo podia saber
      // que "habia" comprobante sin poder verlo. Ahora viaja la ruta.
      comprobante: r.comprobante_url || null, asistencia: r.asistencia,
      // El codigo de canje con el que se descontó, si hubo
      codigoDescuento: r.codigo_descuento || null,
      origen: r.origen, atendidoPor: nombrePorPerfil.get(r.confirmado_por) || null,
      // Si la reserva la genero un torneo, se muestra con su nombre
      torneo_id: r.torneo_id,
      torneo: r.torneo_id
        ? (torneos.data || []).find(t => t.id === r.torneo_id)?.nombre || 'Torneo'
        : null,
    })))

    // Un cliente solo LEE sus propias reservas (RLS), asi que las de los demas
    // no le llegaban y en su calendario esas horas figuraban «Libre»: recién
    // al confirmar se enteraba de que ya estaban tomadas. Se suman aca las
    // horas ocupadas por otros, sin dueno ni monto. El personal del complejo
    // ya las tiene todas y no se duplican: se saltan las que ya estan.
    const yaEstan = new Set(D.RESERVAS_EMPRESA.map(r => r.id))
    D.RESERVAS_EMPRESA.push(...(ocupados.data || [])
      .filter(o => !yaEstan.has(o.id))
      .map(o => ({
        id: o.id, empresa_id: o.empresa_id, cliente_id: null, cliente: null,
        cancha: nombreDeCancha.get(o.cancha_id) || '—',
        fecha: fechaReserva(o.fecha), fechaISO: o.fecha,
        horaInicio: hora(o.hora_inicio), horaFin: hora(o.hora_fin),
        estado: o.estado, origen: o.origen, ajena: true,
        apartaHasta: o.aparta_hasta || null,
        torneo_id: o.torneo_id,
        torneo: o.torneo_id
          ? (torneos.data || []).find(t => t.id === o.torneo_id)?.nombre || 'Torneo'
          : null,
      })))

    // ── Usuarios de la plataforma ────────────────────────────────
    // A un cliente le llega solo su propia fila; al super administrador,
    // todas. La pantalla que las usa es suya, asi que solo el vera la lista.
    const empresaDelAdmin = new Map((empresas.data || []).map(e => [e.admin_id, e.nombre]))
    const empresaDelEmpleado = new Map((empleados.data || [])
      .map(e => [e.id, (empresas.data || []).find(x => x.id === e.empresa_id)?.nombre || null]))

    reemplazar(D.USUARIOS, (usuarios.data || []).map(u => ({
      id: u.id, nombre: u.nombre, email: u.correo, rol: u.rol,
      puntos: u.puntos ?? 0, foto: u.avatar_url || null,
      reservas: (reservas.data || []).filter(r => r.cliente_id === u.id).length,
      estado: u.activo ? 'activo' : 'suspendido',
      alta: fechaCorta(fechaDeBolivia(u.created_at)),
      empresa: empresaDelAdmin.get(u.id) || empresaDelEmpleado.get(u.id) || null,
    })))

    // ── Historial de puntos del cliente ──────────────────────────
    // Cada uno solo ve el suyo: eso lo decide RLS, no esta linea.
    reemplazar(D.PUNTOS_HISTORIAL, (puntos.data || []).map(h => ({
      id: h.id, concepto: h.concepto,
      puntos: (h.puntos > 0 ? '+' : '') + h.puntos,
      fecha: fechaCorta(fechaDeBolivia(h.created_at)),
      icon: h.puntos > 0 ? '⭐' : '🎁',
    })))

    // ── Torneos: equipos, jugadores, partidos y eventos ──────────────────
    const solicitudPorTorneo = new Map((solicitudes.data || []).map(s => [s.torneo_id, s]))
    const jugadoresPorEquipo = agrupar(jugadores.data || [], 'equipo_id')
    const equiposPorTorneo   = agrupar(equipos.data || [], 'torneo_id')
    const partidosPorTorneo  = agrupar(partidos.data || [], 'torneo_id')
    const eventosPorPartido  = agrupar(eventos.data || [], 'partido_id')
    const nombreEquipo = new Map((equipos.data || []).map(e => [e.id, e.nombre]))
    const telefonoDeEquipo = new Map((contactos.data || []).map(c => [c.equipo_id, c.telefono]))
    const jugadorPorId = new Map((jugadores.data || []).map(j => [j.id, j]))

    reemplazar(D.TORNEOS, (torneos.data || []).map(t => {
      const misEquipos = equiposPorTorneo[t.id] || []
      const grupos = {}
      for (const e of misEquipos) if (e.grupo) (grupos[e.grupo] ??= []).push(e.id)

      return {
        id: t.id, empresa_id: t.empresa_id, creador_id: t.creador_id,
        creador_tipo: t.creador_tipo, creadoEl: t.created_at,
        creador: nombrePorPerfil.get(t.creador_id) || '—',
        nombre: t.nombre, emoji: t.emoji || '🏆',
        deporte: t.deporte, deporteKey: t.deporte,
        empresa: (empresas.data || []).find(e => e.id === t.empresa_id)?.nombre || '',
        cancha: nombreDeCancha.get(solicitudPorTorneo.get(t.id)?.cancha_id) || '',
        fechaInicio: fechaCorta(t.fecha_inicio), fechaFin: fechaCorta(t.fecha_fin),
        // Las mismas fechas sin formatear, para poder calcular con ellas
        fechaInicioISO: t.fecha_inicio, fechaFinISO: t.fecha_fin,
        inscripcionHasta: fechaCorta(t.inscripcion_hasta),
        // Sin formatear: pasada esa fecha, el torneo ya no acepta equipos
        inscripcionHastaISO: t.inscripcion_hasta || null,
        precio: Number(t.precio_inscripcion), estado: t.estado,
        premios: { primero: t.premio_primero, segundo: t.premio_segundo, tercero: t.premio_tercero },
        desc: t.descripcion, formato: t.formato,
        jugadoresPorEquipo: t.jugadores_por_equipo, suplentes: t.suplentes,
        // Cuantos hay que anotar como minimo y como maximo. Si el torneo es
        // viejo y no los tiene, se deducen de los titulares y los suplentes.
        jugadoresMin: t.jugadores_min ?? t.jugadores_por_equipo,
        jugadoresMax: t.jugadores_max ?? (t.jugadores_por_equipo + (t.suplentes || 0)),
        // A cuanto se gana un set y cuantos sets se necesitan. Null en los
        // deportes que no van por sets.
        puntosPorSet:  t.puntos_por_set ?? null,
        setsParaGanar: t.sets_para_ganar ?? null,
        maxEquipos: t.max_equipos, clasificanPorGrupo: t.clasifican_por_grupo,
        tieneAmarillas: t.deporte === 'Fútbol', tieneRojas: t.deporte === 'Fútbol',
        tieneGoles: t.deporte === 'Fútbol',
        reglas: t.reglas || [], horarios: t.horarios,
        qrPago: t.qr_pago_url || null,
        solicitud: solicitudPorTorneo.get(t.id)
          ? { estado: solicitudPorTorneo.get(t.id).estado,
              // Pendiente: cuándo se pidió. Resuelta: cuándo y quién la resolvió
              fecha: fechaCorta(fechaDeBolivia(solicitudPorTorneo.get(t.id).resuelta_at
                                       || solicitudPorTorneo.get(t.id).created_at)),
              resueltaPor: nombrePorPerfil.get(solicitudPorTorneo.get(t.id).resuelta_por) || null,
              motivo: solicitudPorTorneo.get(t.id).motivo,
              // Lo que se le pidio al complejo: cancha, dias y horario
              cancha: nombreDeCancha.get(solicitudPorTorneo.get(t.id).cancha_id) || null,
              cancha_id: solicitudPorTorneo.get(t.id).cancha_id,
              dias: solicitudPorTorneo.get(t.id).dias || [],
              horaInicio: hora(solicitudPorTorneo.get(t.id).hora_inicio),
              horaFin: hora(solicitudPorTorneo.get(t.id).hora_fin),
              costoTotal: solicitudPorTorneo.get(t.id).costo_total }
          : null,
        grupos: Object.keys(grupos).length ? grupos : null,

        equipos: misEquipos.map(e => ({
          id: e.id, nombre: e.nombre, capitan: e.capitan_nombre, estado: e.estado,
          comprobante: e.comprobante_url, capitan_id: e.capitan_id, creadoEl: e.created_at,
          telefono: telefonoDeEquipo.get(e.id) || null,
          // Quienes con cuenta son parte del equipo: el capitan que lo inscribio
          // y los jugadores que tengan cuenta. Antes quedaba vacio, y el cliente
          // no encontraba su equipo ni en «Mis participaciones» ni en el torneo:
          // le seguia ofreciendo inscribirse, como si nunca lo hubiera hecho.
          integrantes_ids: [e.capitan_id,
            ...(jugadoresPorEquipo[e.id] || []).map(j => j.jugador_id)].filter(Boolean),
          // El escudo que subio el capitan, y con que codigo cubrio la
          // inscripcion si la cubrio con puntos
          escudo: e.escudo_url || null,
          codigoCanje: e.codigo_canje || null,
          jugadores: (jugadoresPorEquipo[e.id] || []).map(j => ({
            id: j.id, dorsal: j.dorsal, nombre: j.nombre,
            posicion: j.posicion, habilitado: j.habilitado,
          })),
        })),

        partidos: (partidosPorTorneo[t.id] || []).map(p => ({
          id: p.id, fase: p.fase, grupo: p.grupo,
          // En la eliminatoria, 'ronda' guarda la llave completa: es lo que
          // permite reconocer cual de los cruces del cuadro es esta fila.
          ronda: p.ronda, llave: p.ronda,
          equipo1_id: p.equipo_a_id, equipo1: nombreEquipo.get(p.equipo_a_id) || '',
          equipo2_id: p.equipo_b_id, equipo2: nombreEquipo.get(p.equipo_b_id) || '',
          g1: p.goles_a, g2: p.goles_b,
          am1: p.amarillas_a, am2: p.amarillas_b, rj1: p.rojas_a, rj2: p.rojas_b,
          pen1: p.penales_a, pen2: p.penales_b, tanda: p.tanda || undefined,
          estado: p.estado, minuto: p.minuto,
          // Con que orden se creo el fixture. Es lo que ordena los partidos de
          // un equipo para contar amarillas y rojas: sin esto llegaban en el
          // orden que quisiera la base y una suspension se podia perder.
          creado: p.created_at,
          hora: p.fecha_hora ? String(p.fecha_hora).slice(11, 16) : '',
          cancha: nombreDeCancha.get(p.cancha_id) || '',
          eventos: (eventosPorPartido[p.id] || []).map(ev => {
            const j = jugadorPorId.get(ev.jugador_equipo_id)
            return {
              id: ev.id,
              tipo: ev.tipo, minuto: ev.minuto,
              jugador_id: ev.jugador_equipo_id, jugador: j?.nombre || '—', dorsal: j?.dorsal,
              equipo_id: ev.equipo_id, equipo: nombreEquipo.get(ev.equipo_id) || '',
            }
          }),
        })),
      }
    }))

    // ── Partidos espontaneos ─────────────────────────────────────────────
    const unidosPorPartido = agrupar(unidos.data || [], 'partido_id')
    reemplazar(D.PARTIDOS_ESPONTANEOS, (espontaneos.data || []).map(p => ({
      id: p.id, empresa_id: p.empresa_id, deporte: p.deporte,
      cancha: nombreDeCancha.get(p.cancha_id) || '',
      // La fecha y hora real; lo que se muestra se calcula al verlo
      fechaHora: p.fecha_hora, maxJugadores: p.max_jugadores, apuesta: p.apuesta,
      creadorId: p.creador_id,
      creador: nombrePorPerfil.get(p.creador_id) || '—',
      jugadoresUnidos: (unidosPorPartido[p.id] || []).map(j => j.nombre),
    })))

    // ── Bitacora ─────────────────────────────────────────────────────────
    reemplazar(D.BITACORA, (bitacora.data || []).map(b => {
      // Fecha y hora, las dos de Bolivia: antes la fecha salía en UTC y la hora
      // en la del equipo, y podía decir «30 Oct, 21:52» de algo del 29
      return {
        id: b.id, empresa_id: b.empresa_id, empleado_id: b.actor_id,
        empleado: b.actor_nombre, tipo: b.tipo, accion: b.accion, detalle: b.detalle,
        fecha: fechaCorta(fechaDeBolivia(b.created_at)),
        hora: horaDeBolivia(b.created_at),
      }
    }))

    // ── Estadisticas del complejo: se calculan, no se guardan ────────────
    calcularEstadisticas()

    yaCargado = true
    return { ok: true }
  } catch (e) {
    return { error: traducirError(e, 'No se pudo conectar con la base de datos') }
  }
}

/**
 * Dias y horarios de mayor demanda, a partir de las reservas reales.
 *
 * Cuenta SOLO lo que pidio un cliente. Las horas que ocupa un torneo tambien
 * son filas de reservas —para que la cancha quede tomada de verdad— pero no
 * son demanda ni son plata: nadie las pidio y no se cobran. Sumarlas hacia que
 * el complejo viera un ingreso que nunca entro y un dia pico que en realidad
 * era el dia en que se juega su propio torneo. Van aparte, en horasDeTorneo.
 */
function calcularEstadisticas() {
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  vaciarObjeto(D.ESTADISTICAS)

  // '2026-09-19' -> 5 (viernes). Se parte el texto en vez de new Date(iso),
  // que lo interpreta en UTC y en Bolivia corre la fecha un dia para atras.
  const diaDeLaSemana = (iso) => {
    if (!iso) return null
    const [a, m, d] = String(iso).split('-').map(Number)
    if (!a || !m || !d) return null
    return new Date(a, m - 1, d).getDay()
  }

  // Todo es del mes en curso y solo de lo confirmado: una pendiente todavía
  // no se pagó, y una que nadie revisó a tiempo ya no se va a pagar. Antes se
  // sumaba todo desde mayo, cada reserva contaba como una hora aunque durara
  // dos, y la ocupación dividía todo eso por lo que da un solo día.
  const hoy = hoyBolivia()
  const mes = hoy.slice(0, 7)
  const [anio, numeroMes] = mes.split('-').map(Number)
  const diasDelMes = new Date(anio, numeroMes, 0).getDate()
  const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                      'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

  // '09:00' a '11:00' → 2. Un cierre a medianoche ('00:00') cuenta como 24:00.
  const minutos = (hhmm) => {
    const [h, m] = String(hhmm || '').split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const horasEntre = (inicio, fin) => {
    let d = minutos(fin) - minutos(inicio)
    if (d <= 0) d += 24 * 60
    return d / 60
  }

  for (const e of D.EMPRESAS) {
    const delMes      = D.RESERVAS_EMPRESA.filter(r => r.empresa_id === e.id && (r.fechaISO || '').startsWith(mes))
    const reservas    = delMes.filter(r => r.origen !== 'torneo')
    const confirmadas = reservas.filter(r => r.estado === 'confirmada')

    const porDia = DIAS.map(d => ({ dia: d, reservas: 0 }))
    const porHora = Array.from({ length: 16 }, (_, i) => ({
      hora: String(6 + i).padStart(2, '0') + ':00', reservas: 0,
    }))
    const porCancha = D.canchasDeEmpresa(e.id).map(c => ({ cancha: c.nombre, reservas: 0, horas: 0, ingreso: 0 }))

    let horasVendidas = 0
    for (const r of confirmadas) {
      const horas = r.horaFin ? horasEntre(r.horaInicio, r.horaFin) : 1
      horasVendidas += horas
      // Cada hora que ocupa cuenta en su franja: una de 09:00 a 11:00 suma en
      // la de las 09 y en la de las 10
      const desde = Math.floor(minutos(r.horaInicio) / 60)
      for (let k = 0; k < Math.ceil(horas); k++) {
        const f = porHora.find(x => x.hora === String(desde + k).padStart(2, '0') + ':00')
        if (f) f.reservas++
      }
      const c = porCancha.find(x => x.cancha === r.cancha)
      if (c) { c.reservas++; c.horas += horas; c.ingreso += Number(r.monto) || 0 }
      // El dia que corresponde, no el de hoy. Antes todas las reservas caian
      // en el dia en que se abria la pantalla, y el grafico de demanda mostraba
      // una sola barra que cambiaba de lugar segun cuando se mirara.
      const d = diaDeLaSemana(r.fechaISO)
      if (d != null) porDia[d].reservas++
    }

    // Lo que el complejo puede vender en el mes: sus canchas activas, las
    // horas que abre cada día y los días del mes
    const horasAbierto = e.apertura && e.cierre ? horasEntre(e.apertura, e.cierre) : 16
    const canchasActivas = D.canchasDeEmpresa(e.id).filter(c => c.disponible).length
    const capacidad = canchasActivas * horasAbierto * diasDelMes

    D.ESTADISTICAS[e.id] = {
      periodo: 'Reservas confirmadas de ' + NOMBRE_MES[numeroMes - 1],
      totalReservas: confirmadas.length,
      horasVendidas,
      ocupacion: capacidad ? Math.min(100, Math.round((horasVendidas / capacidad) * 1000) / 10) : 0,
      ingresoMes: confirmadas.reduce((a, r) => a + (Number(r.monto) || 0), 0),
      // Jornadas de torneo: ocupan la cancha pero no se cobran
      horasDeTorneo: delMes.filter(r => r.origen === 'torneo' && D.ocupaLaCancha(r)).length,
      porDia, porHora,
      porCancha: porCancha.sort((a, b) => b.horas - a.horas),
      noShow: confirmadas.filter(r => r.asistencia === 'ausente').length,
      canceladas: reservas.filter(r => r.estado === 'rechazada' || r.estado === 'cancelada').length,
    }
  }
}

/**
 * Vuelve a leer los partidos de UN torneo y los deja en la lista compartida.
 *
 * La pantalla «En Vivo» la usa cada quince segundos. Antes esa pantalla
 * sumaba un minuto al reloj por su cuenta y no volvia a mirar la base nunca:
 * el que estaba en la tribuna veia un minuto inventado y nunca se enteraba de
 * los goles que la mesa iba cargando.
 *
 * Es una consulta chica a proposito. Recargar todo cada quince segundos serian
 * veintidos consultas por espectador.
 */
export async function recargarPartidosDeTorneo(torneoId) {
  const torneo = D.TORNEOS.find(t => D.mismo(t.id, torneoId))
  if (!torneo) return { error: 'Ese torneo ya no está' }

  const [partidos, eventos] = await Promise.all([
    supabase.from('partidos_torneo').select('*').eq('torneo_id', torneoId),
    supabase.from('eventos_partido').select('*, partidos_torneo!inner(torneo_id)')
      .eq('partidos_torneo.torneo_id', torneoId),
  ])
  if (partidos.error) return { error: traducirError(partidos.error, 'No se pudo actualizar') }

  // Los nombres ya estan en memoria: no hace falta volver a pedirlos
  const nombreEquipo = new Map((torneo.equipos || []).map(e => [e.id, e.nombre]))
  const jugadorPorId = new Map(
    (torneo.equipos || []).flatMap(e => (e.jugadores || []).map(j => [j.id, j])))
  const eventosPorPartido = agrupar(eventos.data || [], 'partido_id')

  torneo.partidos = (partidos.data || []).map(p => ({
    id: p.id, fase: p.fase, grupo: p.grupo,
    ronda: p.ronda, llave: p.ronda,
    equipo1_id: p.equipo_a_id, equipo1: nombreEquipo.get(p.equipo_a_id) || '',
    equipo2_id: p.equipo_b_id, equipo2: nombreEquipo.get(p.equipo_b_id) || '',
    g1: p.goles_a, g2: p.goles_b,
    am1: p.amarillas_a, am2: p.amarillas_b, rj1: p.rojas_a, rj2: p.rojas_b,
    pen1: p.penales_a, pen2: p.penales_b, tanda: p.tanda || undefined,
    estado: p.estado, minuto: p.minuto,
    creado: p.created_at,
    hora: p.fecha_hora ? String(p.fecha_hora).slice(11, 16) : '',
    cancha: p.cancha_id ? (torneo.cancha || '') : '',
    eventos: (eventosPorPartido[p.id] || []).map(ev => {
      const j = jugadorPorId.get(ev.jugador_equipo_id)
      return {
        id: ev.id,
        tipo: ev.tipo, minuto: ev.minuto,
        jugador_id: ev.jugador_equipo_id, jugador: j?.nombre || '—', dorsal: j?.dorsal,
        equipo_id: ev.equipo_id, equipo: nombreEquipo.get(ev.equipo_id) || '',
      }
    }),
  }))

  return { partidos: torneo.partidos }
}

/**
 * Vuelve a leer los comentarios de UN complejo.
 *
 * Se usa despues de escribir, responder, editar o borrar. Es una consulta
 * chica a proposito: recargar toda la base para ver aparecer un comentario
 * serian veintitres consultas.
 */
export async function recargarComentarios(empresaId) {
  const { data, error } = await supabase.from('comentarios')
    .select('*').eq('empresa_id', empresaId).order('created_at')

  if (error) return { error: traducirError(error, 'No se pudieron traer los comentarios') }

  const perfiles = await supabase.from('perfiles_publicos').select('id, nombre, avatar_url')
  const nombrePorPerfil = new Map((perfiles.data || []).map(p => [p.id, p.nombre]))
  const fotoPorPerfil   = new Map((perfiles.data || []).map(p => [p.id, p.avatar_url || null]))

  D.COMENTARIOS_POR_EMPRESA[empresaId] = (data || []).map(c => {
    const autor = nombrePorPerfil.get(c.autor_id) || 'Cliente'
    return {
      id: c.id, empresa_id: c.empresa_id, autor_id: c.autor_id,
      autor, avatar: iniciales(autor), foto: fotoPorPerfil.get(c.autor_id) || null,
      texto: c.texto,
      calificacion_id: c.calificacion_id, responde_a: c.responde_a,
      creado: c.created_at, editado: Boolean(c.editado_at),
    }
  })

  return { comentarios: D.COMENTARIOS_POR_EMPRESA[empresaId] }
}


/**
 * Vuelve a leer qué horas están tomadas en UN complejo.
 *
 * La ficha del complejo la usa cada veinte segundos y justo antes de apartar:
 * si otra persona aparta o reserva una hora mientras el cliente mira la
 * agenda, esa hora aparece tomada sin que tenga que recargar la página. Lee
 * la vista horarios_ocupados, que no trae datos del cliente, así que sirve
 * igual para un cliente que para el personal del mostrador.
 *
 * Solo cambia lo necesario: el estado de las reservas que ya estaban, las que
 * aparecieron y las ajenas que se liberaron.
 */
export async function recargarHorarios(empresaId) {
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1)
  const desde = ayer.getFullYear() + '-' + String(ayer.getMonth() + 1).padStart(2, '0') + '-' +
                String(ayer.getDate()).padStart(2, '0')

  const { data, error } = await supabase.from('horarios_ocupados')
    .select('*').eq('empresa_id', empresaId).gte('fecha', desde)
  if (error) return { error: traducirError(error, 'No se pudo actualizar la agenda') }

  const vivas = new Map((data || []).map(o => [o.id, o]))
  const canchas = new Map(D.canchasDeEmpresa(empresaId).map(c => [c.id, c.nombre]))

  // Las ajenas que ya no figuran se liberaron: se soltó el apartado, se
  // rechazó la reserva o se venció el tiempo
  for (let i = D.RESERVAS_EMPRESA.length - 1; i >= 0; i--) {
    const r = D.RESERVAS_EMPRESA[i]
    if (!D.mismo(r.empresa_id, empresaId) || (r.fechaISO || '') < desde) continue
    const o = vivas.get(r.id)
    if (o) {
      r.estado = o.estado
      r.apartaHasta = o.aparta_hasta || null
      vivas.delete(r.id)
    } else if (r.ajena) {
      D.RESERVAS_EMPRESA.splice(i, 1)
    } else if (r.estado === 'apartada') {
      r.estado = 'vencida'
    }
  }

  // Las que aparecieron desde la última lectura
  for (const o of vivas.values()) {
    D.RESERVAS_EMPRESA.push({
      id: o.id, empresa_id: o.empresa_id, cliente_id: null, cliente: null,
      cancha: canchas.get(o.cancha_id) || '—',
      fecha: fechaReserva(o.fecha), fechaISO: o.fecha,
      horaInicio: hora(o.hora_inicio), horaFin: hora(o.hora_fin),
      estado: o.estado, origen: o.origen, ajena: true,
      apartaHasta: o.aparta_hasta || null,
      torneo_id: o.torneo_id,
      torneo: o.torneo_id ? D.TORNEOS.find(t => D.mismo(t.id, o.torneo_id))?.nombre || 'Torneo' : null,
    })
  }
  return { ok: true }
}
