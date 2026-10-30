import { supabase } from './supabase'
import * as D from './datos'
import { jornadasDelTorneo, costoDelTorneo } from './jornadas'
import { traducirError } from './errores'

// ─────────────────────────────────────────────────────────────────────────────
// GUARDAR EN LA BASE
//
// Las pantallas ya modifican las listas de datos.js para que el cambio se vea
// al instante. Estas funciones ademas lo escriben en Supabase, para que siga
// ahi al recargar la pagina.
//
// Si la base rechaza algo (por ejemplo, RLS no permite la operacion), se
// devuelve el error para que la pantalla lo muestre en vez de fingir que
// guardo.
// ─────────────────────────────────────────────────────────────────────────────

// Como se llama la funcion de servidor en Supabase. Esta en una sola
// constante porque el panel de Supabase le asigna un nombre al azar cuando se
// crea desde el navegador, y cambiarlo obliga a borrarla y rehacerla: asi se
// ajusta aqui en un solo lugar.
const FUNCION_EMPLEADOS = 'empleados'

const fallo = (error) => ({ error: traducirError(error) })

/**
 * Comprueba que una modificacion haya tocado alguna fila.
 *
 * PostgREST no devuelve error cuando una politica RLS deja la operacion sin
 * efecto: responde 200 con cero filas. Sin este control la pantalla mostraria
 * "guardado" y al recargar nada habria cambiado. Por eso todas las
 * modificaciones piden las filas de vuelta con .select() y pasan por aqui.
 */
const cambio = ({ data, error }) => {
  if (error) return fallo(error)
  if (!data || data.length === 0) {
    return { error: 'No tienes permiso para realizar este cambio con tu cuenta.' }
  }
  return { ok: true, filas: data }
}

// ── Reservas ───────────────────────────────────────────────────────────────

/**
 * El cliente reserva una cancha. Queda pendiente hasta que el complejo confirme.
 *
 * El monto que se manda aca es solo el que vio el cliente en pantalla: la base
 * lo vuelve a calcular con el precio de la cancha, las horas y el codigo de
 * canje, y guarda el suyo. Antes se guardaba tal cual llegaba, y bastaba con
 * abrir las herramientas del navegador para reservar por Bs. 0.
 *
 * Por eso la fila que devuelve es la que vale: puede traer un monto distinto
 * del que se mando, y ese es el bueno.
 */
export async function guardarReserva({ empresaId, canchaId, fecha, horaInicio, horaFin,
                                       monto, comprobante, codigoDescuento }) {
  const { data, error } = await supabase.from('reservas').insert({
    cliente_id: D.SESION.usuarioId,
    empresa_id: empresaId,
    cancha_id: canchaId,
    fecha,                                   // 'YYYY-MM-DD'
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    monto_total: monto,                      // referencial: la base lo recalcula
    codigo_descuento: codigoDescuento || null,
    estado: 'pendiente',
    origen: 'app',
    comprobante_url: comprobante || null,
  }).select().single()

  return error ? fallo(error) : { reserva: data }
}

/**
 * Aparta la hora mientras el cliente paga (migraciones/038).
 *
 * La reserva nace sin comprobante, en estado «apartada», y ocupa la cancha
 * por 10 minutos. Asi el QR solo lo ve quien ya tiene la hora asegurada. Si
 * dos personas la piden a la vez, la base se queda con el pedido que llego
 * primero y al otro le avisa aqui, antes de que pague.
 *
 * El codigo de canje se revisa ahora pero se gasta al enviar el comprobante:
 * quien aparta y despues no paga no lo pierde.
 */
export async function apartarHora({ empresaId, canchaId, fecha, horaInicio, horaFin,
                                    monto, codigoDescuento }) {
  const { data, error } = await supabase.from('reservas').insert({
    cliente_id: D.SESION.usuarioId,
    empresa_id: empresaId,
    cancha_id: canchaId,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    monto_total: monto,                      // referencial: la base lo recalcula
    codigo_descuento: codigoDescuento || null,
    estado: 'apartada',
    origen: 'app',
  }).select().single()

  if (error) {
    // Otra persona la aparto o la reservo un instante antes
    if (/reservas_sin_superponer|exclusion constraint/i.test(error.message || '')) {
      return { error: 'Esta hora ya no está disponible: otra persona la tomó un instante antes que tú. Elige otra.', ocupada: true }
    }
    return fallo(error)
  }
  return { reserva: data }
}

/**
 * Envia el comprobante de una hora apartada. La reserva pasa a pendiente y el
 * complejo la revisa como siempre.
 *
 * Si el tiempo se paso y otra persona ya tomo la hora, la base igual guarda
 * el comprobante (como prueba del pago) y devuelve la reserva «vencida»: la
 * pantalla se lo explica al cliente y el complejo recibe el aviso.
 */
export async function enviarComprobanteReserva(reservaId, comprobante) {
  const { data, error } = await supabase.rpc('enviar_comprobante_reserva',
    { p_reserva: reservaId, p_comprobante: comprobante })
  if (error) return fallo(error)
  const reserva = Array.isArray(data) ? data[0] : data
  return reserva ? { reserva } : { error: 'No se pudo enviar el comprobante. Inténtalo de nuevo.' }
}

/** El cliente cierra el pago sin terminar: la hora queda libre al instante. */
export async function soltarApartado(reservaId) {
  const { error } = await supabase.rpc('soltar_apartado', { p_reserva: reservaId })
  return error ? fallo(error) : { ok: true }
}

/**
 * Mira un codigo de canje sin gastarlo, para mostrar el descuento antes de
 * confirmar. Quien decide de verdad es la base cuando se guarda la reserva;
 * esto es solo para que el cliente vea el precio nuevo mientras completa.
 */
export async function revisarCodigoCanje(codigo, empresaId) {
  const { data, error } = await supabase
    .rpc('revisar_codigo_canje', { p_codigo: codigo, p_empresa: empresaId })
  if (error) return fallo(error)

  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) return { error: 'No se pudo verificar el código. Inténtalo de nuevo.' }
  if (!fila.sirve) return { error: fila.motivo || 'Ese código no sirve aquí' }

  return {
    codigo: String(codigo).trim().toUpperCase(),
    recompensa: fila.recompensa,
    tipo: fila.tipo,
    valor: fila.valor === null ? null : Number(fila.valor),
  }
}

/**
 * Lo que descuenta un canje sobre una reserva concreta.
 *
 * La misma cuenta que hace la base, para poder mostrarla en pantalla. Si
 * alguna vez las dos dejaran de coincidir, manda la de la base: es la que
 * termina guardada.
 */
export function descuentoDeCanje(canje, { horas, precioHora }) {
  if (!canje || !canje.tipo) return 0
  const base = horas * precioHora
  if (canje.tipo === 'porcentaje')   return Math.round(base * (canje.valor / 100) * 100) / 100
  if (canje.tipo === 'horas_gratis') return Math.min(canje.valor, horas) * precioHora
  return 0
}

/**
 * Reserva tomada en el mostrador: ya viene cobrada y confirmada.
 * El que llega al mostrador puede no tener cuenta, asi que se guarda su
 * nombre y telefono en vez de un cliente_id.
 */
export async function guardarReservaPresencial({ empresaId, canchaId, clienteId, nombre, telefono,
                                                fecha, horaInicio, horaFin, monto, comprobante }) {
  const { data, error } = await supabase.from('reservas').insert({
    cliente_id: clienteId || null,
    cliente_nombre: clienteId ? null : nombre,
    cliente_telefono: clienteId ? null : (telefono || null),
    empresa_id: empresaId,
    cancha_id: canchaId,
    fecha, hora_inicio: horaInicio, hora_fin: horaFin,
    monto_total: monto,
    estado: 'confirmada',
    origen: 'presencial',
    // En efectivo no hay nada que adjuntar. Si pago con QR en el mostrador,
    // el empleado le saca una foto al comprobante y queda igual que el de la app.
    comprobante_url: comprobante || null,
    confirmado_por: D.SESION.usuarioId,
    fecha_confirmacion: new Date().toISOString(),
  }).select().single()

  return error ? fallo(error) : { reserva: data }
}

/** El complejo confirma o rechaza una reserva. */
export async function resolverReserva(reservaId, estado) {
  return cambio(await supabase.from('reservas')
    .update({
    estado,
    confirmado_por: D.SESION.usuarioId,
    fecha_confirmacion: new Date().toISOString(),
  }).eq('id', reservaId).select())
}

/** El empleado marca si el cliente se presento. */
export async function marcarAsistencia(reservaId, asistencia) {
  return cambio(await supabase.from('reservas')
    .update({ asistencia }).eq('id', reservaId).select())
}

// ── Recompensas ────────────────────────────────────────────────────────────

/**
 * El cliente canjea puntos por un premio.
 *
 * Todo lo hace la base en una sola operacion (funcion canjear_recompensa):
 * verifica el saldo, crea el canje con su codigo, descuenta los puntos y deja
 * el historial. Se hace asi y no desde aqui porque el navegador no es de fiar:
 * si el descuento de puntos dependiera de esta linea, cualquiera podria
 * saltarsela.
 */
export async function guardarCanje(recompensa) {
  const { data, error } = await supabase.rpc('canjear_recompensa', {
    p_recompensa: recompensa.id,
  })
  if (error) return fallo(error)

  const canje = Array.isArray(data) ? data[0] : data
  return { canje }
}

/**
 * El complejo entrega el premio al cliente que llega con su codigo.
 * Quién lo entregó y a qué hora lo anota la base, con su reloj (migraciones/040).
 */
export async function entregarCanje(canjeId) {
  return cambio(await supabase.from('canjes')
    .update({ estado: 'entregado' }).eq('id', canjeId).select())
}

// ── Canchas y calificaciones ───────────────────────────────────────────────

export async function guardarCancha({ id, empresaId, nombre, deporte, precio, activa,
                                     capacidad, apertura, cierre, descripcion }) {
  const fila = {
    empresa_id: empresaId, nombre, deporte,
    precio_hora: precio, descripcion: descripcion || null,
    capacidad: capacidad || null, apertura: apertura || null, cierre: cierre || null,
  }
  if (activa !== undefined) fila.activa = activa
  const { data, error } = id
    ? await supabase.from('canchas').update(fila).eq('id', id).select().single()
    : await supabase.from('canchas').insert(fila).select().single()
  return error ? fallo(error) : { cancha: data }
}

export async function cambiarEstadoCancha(canchaId, activa) {
  return cambio(await supabase.from('canchas')
    .update({ activa }).eq('id', canchaId).select())
}

/** El cliente califica el complejo. */
/**
 * El voto con estrellas: uno por cliente y complejo, se puede cambiar.
 * No lleva texto: lo que el cliente quiera decir va en los comentarios.
 */
export async function guardarCalificacion({ empresaId, estrellas }) {
  const { data, error } = await supabase.from('calificaciones').upsert({
    empresa_id: empresaId,
    cliente_id: D.SESION.usuarioId,
    estrellas,
  }, { onConflict: 'empresa_id,cliente_id' }).select().single()
  return error ? fallo(error) : { calificacion: data }
}

/**
 * Deja un comentario en un complejo.
 *
 * Sin limite de cuantos: es conversacion, no un voto. El que si esta limitado
 * es la calificacion con estrellas, que es una por persona y por complejo
 * porque arma el promedio.
 *
 * `calificacionId` cuelga el comentario de una reseña; `respondeA`, de otro
 * comentario. Como mucho uno de los dos: la base lo controla.
 */
export async function guardarComentario({ empresaId, texto, calificacionId, respondeA }) {
  const limpio = String(texto || '').trim()
  if (!limpio) return { error: 'Escribe tu comentario antes de enviarlo.' }
  if (limpio.length > 500) return { error: 'El comentario no puede superar los 500 caracteres.' }

  const { data, error } = await supabase.from('comentarios').insert({
    empresa_id: empresaId,
    autor_id: D.SESION.usuarioId,
    texto: limpio,
    calificacion_id: calificacionId || null,
    responde_a: respondeA || null,
  }).select().single()

  return error ? fallo(error) : { comentario: data }
}

/** Corregir lo que uno escribio. Solo el texto: lo demas lo fija la base. */
export async function editarComentario(comentarioId, texto) {
  const limpio = String(texto || '').trim()
  if (!limpio) return { error: 'El comentario no puede quedar vacío.' }
  if (limpio.length > 500) return { error: 'El comentario no puede superar los 500 caracteres.' }

  return cambio(await supabase.from('comentarios')
    .update({ texto: limpio }).eq('id', comentarioId).select())
}

/**
 * Lo borra el autor, o el complejo.
 *
 * El complejo lo necesita para moderar: si alguien insulta en su ficha, tiene
 * que poder sacarlo sin pedirle permiso a nadie. Las respuestas que colgaban
 * de ese comentario se van con el.
 */
export async function borrarComentario(comentarioId) {
  return cambio(await supabase.from('comentarios')
    .delete().eq('id', comentarioId).select())
}

// ── Empleados ──────────────────────────────────────────────────────────────

/**
 * Crea la cuenta de un empleado.
 *
 * Pasa por una funcion en el servidor porque dar de alta un usuario exige la
 * clave de servicio de Supabase, y esa clave no puede vivir en el navegador.
 */
export async function crearCuentaEmpleado({ usuario, password, nombre, telefono, turno, permisos }) {
  const { data, error } = await supabase.functions.invoke(FUNCION_EMPLEADOS, {
    body: {
      accion: 'crear', password, nombre, telefono, turno, permisos,
      correo: D.correoDeAcceso(usuario),   // 'rosa.v' -> rosa.v@empleados.sportika.app
      usuario: String(usuario).trim().toLowerCase(),
    },
  })
  if (error) return fallo(await detalleDeFuncion(error))
  if (data?.error) return { error: data.error }
  return { empleado: data.empleado }
}

/** Cambia la contrasena de un empleado. Solo el administrador puede. */
export async function cambiarClaveEmpleado(empleadoId, password) {
  const { data, error } = await supabase.functions.invoke(FUNCION_EMPLEADOS, {
    body: { accion: 'clave', empleadoId, password },
  })
  if (error) return fallo(await detalleDeFuncion(error))
  if (data?.error) return { error: data.error }
  return { ok: true }
}

/**
 * Cuando la funcion responde con un error, supabase-js entrega un mensaje
 * generico ("non-2xx status code"). El motivo real viene en el cuerpo.
 */
async function detalleDeFuncion(error) {
  try {
    const cuerpo = await error.context?.json?.()
    if (cuerpo?.error) return { message: cuerpo.error }
  } catch { /* si no se puede leer, queda el mensaje generico */ }
  return error
}

/** Cambia los permisos de un empleado. */
export async function guardarPermisos(empleadoId, permisos) {
  return cambio(await supabase.from('empleados')
    .update({ permisos }).eq('id', empleadoId).select())
}

/** Da de baja o reactiva la cuenta de un empleado. */
export async function cambiarEstadoEmpleado(empleadoId, activo) {
  return cambio(await supabase.from('empleados')
    .update({ activo }).eq('id', empleadoId).select())
}

// ── Torneos ───────────────────────────────────────────────────

/**
 * Crea el torneo y, en la misma operacion, el pedido de cancha al complejo.
 * El torneo existe desde ya, pero no acepta inscripciones hasta que el
 * complejo apruebe la cancha: por eso las dos filas van juntas.
 */
export async function guardarTorneo({ empresaId, canchaId, creadorTipo, nombre, emoji, deporte,
                                      descripcion, formato, maxEquipos, jugadoresPorEquipo,
                                      jugadoresMin, jugadoresMax,
                                      puntosPorSet, setsParaGanar,
                                      suplentes, precio, premios, reglas,
                                      fechaInicio, fechaFin, inscripcionHasta,
                                      dias, horaInicio, horaFin, precioHora }) {
  const { data: torneo, error } = await supabase.from('torneos').insert({
    empresa_id: empresaId,
    creador_id: D.SESION.usuarioId,
    creador_tipo: creadorTipo || 'cliente',
    nombre, emoji: emoji || null, deporte,
    descripcion: descripcion || null,
    formato: formato || null,
    max_equipos: Number(maxEquipos) || 8,
    // Cuantos jugadores se anotan. Distinto de los que juegan en cancha:
    // se anotan suplentes, y con menos del minimo el equipo no completa.
    jugadores_min: Number(jugadoresMin) || null,
    jugadores_max: Number(jugadoresMax) || null,
    // Como se gana un partido en los deportes que van por sets. En futbol y
    // basquet quedan en null: ahi gana el que tiene mas al terminar.
    puntos_por_set:  Number(puntosPorSet)  || null,
    sets_para_ganar: Number(setsParaGanar) || null,
    jugadores_por_equipo: Number(jugadoresPorEquipo) || 5,
    suplentes: Number(suplentes) || 0,
    precio_inscripcion: Number(precio) || 0,
    premio_primero: premios?.primero || null,
    premio_segundo: premios?.segundo || null,
    premio_tercero: premios?.tercero || null,
    reglas: reglas || [],
    horarios: dias?.length && horaInicio
      ? dias.join(', ') + ': ' + horaInicio + ' a ' + horaFin
      : null,
    fecha_inicio: fechaInicio || null,
    fecha_fin: fechaFin || null,
    inscripcion_hasta: inscripcionHasta || null,
    estado: 'inscripciones',
  }).select().single()

  if (error) return fallo(error)

  // Si lo organiza el propio complejo no hay a quien pedirle permiso
  const loCreaElComplejo = creadorTipo === 'complejo'
  const costo = costoDelTorneo({ fechaInicio, fechaFin, dias, horaInicio, horaFin, precioHora })

  const { error: errorSolicitud } = await supabase.from('solicitudes_cancha').insert({
    torneo_id: torneo.id, empresa_id: empresaId,
    cancha_id: canchaId || null,
    dias: dias || [], hora_inicio: horaInicio || null, hora_fin: horaFin || null,
    costo_total: costo.total,
    // Quién la resolvió y cuándo lo anota la base (migraciones/040)
    estado: loCreaElComplejo ? 'aprobada' : 'pendiente',
  })
  if (errorSolicitud) {
    // Un torneo sin pedido de cancha se quedaria colgado esperando para siempre
    await supabase.from('torneos').delete().eq('id', torneo.id)
    return fallo(errorSolicitud)
  }

  // Y la cancha queda tomada esos dias. Son reservas comunes: por eso la
  // agenda del cliente y el control de choques las respetan sin logica aparte.
  const r = await reservarJornadas({
    torneoId: torneo.id, empresaId, canchaId,
    fechaInicio, fechaFin, dias, horaInicio, horaFin, precioHora,
    confirmadas: loCreaElComplejo,
  })
  if (r.error) {
    await supabase.from('torneos').delete().eq('id', torneo.id)
    return { error: r.error }
  }

  return { torneo, jornadas: r.jornadas, costo }
}

/**
 * Crea (o rehace) las reservas que ocupa un torneo.
 *
 * Se borran primero las que hubiera: al reprogramar, las jornadas viejas ya no
 * corresponden y dejarlas bloquearia la cancha para siempre.
 */
export async function reservarJornadas({ torneoId, empresaId, canchaId,
                                         fechaInicio, fechaFin, dias, horaInicio, horaFin,
                                         precioHora, confirmadas }) {
  if (!canchaId || !horaInicio || !horaFin) return { jornadas: [] }

  await supabase.from('reservas').delete().eq('torneo_id', torneoId)

  const fechas = jornadasDelTorneo({ fechaInicio, fechaFin, dias })
  if (!fechas.length) return { jornadas: [] }

  const horas = Math.max(1, Number(horaFin.slice(0, 2)) - Number(horaInicio.slice(0, 2)))
  const filas = fechas.map(fecha => ({
    torneo_id: torneoId, empresa_id: empresaId, cancha_id: canchaId,
    cliente_id: null, cliente_nombre: null,
    fecha, hora_inicio: horaInicio, hora_fin: horaFin,
    monto_total: horas * (Number(precioHora) || 0),
    estado: confirmadas ? 'confirmada' : 'pendiente',
    origen: 'torneo',
    confirmado_por: confirmadas ? D.SESION.usuarioId : null,
    fecha_confirmacion: confirmadas ? new Date().toISOString() : null,
  }))

  const { error } = await supabase.from('reservas').insert(filas)
  return error ? fallo(error) : { jornadas: fechas }
}

/**
 * Inscribe un equipo en un torneo, con todo su plantel.
 *
 * Queda pendiente hasta que el organizador revise el comprobante de pago.
 * Si algun jugador falla (por ejemplo, dos con el mismo dorsal) se borra el
 * equipo entero: mejor eso que dejar un equipo a medio plantel.
 */
export async function guardarEquipo({ torneoId, nombre, capitanNombre, capitanTelefono,
                                      comprobante, jugadores, escudo, codigoCanje }) {
  const { data: equipo, error } = await supabase.from('equipos').insert({
    torneo_id: torneoId, nombre,
    capitan_id: D.SESION.usuarioId,
    capitan_nombre: capitanNombre,
    capitan_telefono: capitanTelefono || null,
    comprobante_url: comprobante || null,
    escudo_url: escudo || null,
    // Inscripcion cubierta con puntos. Lo valida un disparador de la base, que
    // ademas solo lo acepta en los torneos que organiza el complejo.
    codigo_canje: codigoCanje || null,
    estado: 'pendiente',
  }).select().single()

  if (error) return fallo(error)

  const plantel = (jugadores || [])
    .filter(j => j.nombre?.trim())
    .map(j => ({
      equipo_id: equipo.id, nombre: j.nombre.trim(), dorsal: Number(j.dorsal),
      posicion: j.posicion || null,
    }))

  let anotados = []
  if (plantel.length) {
    const { data, error: errorPlantel } = await supabase.from('equipo_jugadores')
      .insert(plantel).select('id, dorsal, nombre, posicion, habilitado')
    if (errorPlantel) {
      await supabase.from('equipos').delete().eq('id', equipo.id)
      return fallo(errorPlantel)
    }
    anotados = data || []
  }

  return { equipo, jugadores: anotados }
}

/** El organizador aprueba o rechaza la inscripcion de un equipo. */
export async function resolverEquipo(equipoId, estado) {
  return cambio(await supabase.from('equipos')
    .update({ estado }).eq('id', equipoId).select())
}

/** El complejo aprueba o rechaza la cancha pedida para un torneo. */
export async function resolverSolicitudCancha(torneoId, estado, motivo = null) {
  // Quién la resolvió y cuándo lo anota la base (migraciones/040)
  const r = cambio(await supabase.from('solicitudes_cancha')
    .update({ estado, motivo }).eq('torneo_id', torneoId).select())
  if (r.error) return r

  // Las jornadas del torneo siguen la suerte de la solicitud: aprobada, la
  // cancha queda tomada de verdad; rechazada, se libera para los clientes.
  await supabase.from('reservas').update({
    estado: estado === 'aprobada' ? 'confirmada' : 'rechazada',
    confirmado_por: D.SESION.usuarioId,
    fecha_confirmacion: new Date().toISOString(),
  }).eq('torneo_id', torneoId)

  return r
}

/**
 * Guarda el sorteo de grupos: a cada equipo le queda su grupo y se crea el
 * calendario de partidos. El torneo pasa a estar en curso.
 *
 * Se hace en este orden a proposito: si el calendario fallara, los grupos ya
 * asignados no tendrian sentido, asi que el torneo se queda en inscripciones.
 */
export async function guardarSorteo(torneoId, gruposPorEquipo, calendario) {
  // gruposPorEquipo: [{ equipoId, grupo }]
  for (const { equipoId, grupo } of gruposPorEquipo) {
    const r = cambio(await supabase.from('equipos')
      .update({ grupo }).eq('id', equipoId).select())
    if (r.error) return r
  }

  if (calendario?.length) {
    const filas = calendario.map(p => ({
      torneo_id: torneoId,
      equipo_a_id: p.equipoA, equipo_b_id: p.equipoB,
      fase: p.fase || 'grupos', grupo: p.grupo || null, ronda: p.ronda || null,
      estado: 'programado',
    }))
    const { error } = await supabase.from('partidos_torneo').insert(filas)
    if (error) return fallo(error)
  }

  return cambio(await supabase.from('torneos')
    .update({ estado: 'en_curso', sorteado_at: new Date().toISOString() })
    .eq('id', torneoId).select())
}

/**
 * Deshace el sorteo: borra el fixture de grupos y saca a los equipos del grupo.
 *
 * El boton «Repetir sorteo» solo limpiaba la pantalla. La base seguia con los
 * grupos puestos y con los 48 partidos creados, asi que al recargar volvian a
 * aparecer, y si se sorteaba otra vez se insertaba un fixture nuevo ENCIMA del
 * anterior: cada partido duplicado.
 *
 * No se permite si ya se jugo algo. Rehacer los grupos con partidos cargados
 * dejaria resultados de enfrentamientos que ya no existen.
 */
export async function deshacerSorteo(torneoId) {
  const { data: jugados, error: errorLeer } = await supabase
    .from('partidos_torneo').select('id')
    .eq('torneo_id', torneoId).neq('estado', 'programado').limit(1)
  if (errorLeer) return fallo(errorLeer)
  if (jugados?.length) {
    return { error: 'Ya se jugaron partidos de este torneo: el sorteo no se puede repetir.' }
  }

  const borrado = await supabase.from('partidos_torneo')
    .delete().eq('torneo_id', torneoId)
  if (borrado.error) return fallo(borrado.error)

  const equipos = await supabase.from('equipos')
    .update({ grupo: null }).eq('torneo_id', torneoId).select()
  if (equipos.error) return fallo(equipos.error)

  return cambio(await supabase.from('torneos')
    .update({ estado: 'inscripciones', sorteado_at: null })
    .eq('id', torneoId).select())
}

/**
 * Devuelve la fila del partido de una llave, creandola si todavia no existe.
 *
 * A diferencia de los de grupos, estos partidos no se pueden crear todos al
 * sortear: hasta que no termina la ronda anterior no se sabe quien juega, y la
 * tabla exige los dos equipos. Asi que cada llave nace cuando queda definida.
 *
 * 'ronda' guarda la llave completa ('Semifinales 1', 'Final') y tiene indice
 * unico por torneo: si dos personas de la mesa la abren a la vez, la segunda
 * recibe la fila que creo la primera en vez de duplicarla.
 */
export async function asegurarPartidoDeLlave({ torneoId, llave, fase, equipoAId, equipoBId }) {
  const buscar = () => supabase.from('partidos_torneo')
    .select('*').eq('torneo_id', torneoId).eq('ronda', llave).maybeSingle()

  const { data: existente } = await buscar()
  if (existente) return { partido: existente }

  const { data, error } = await supabase.from('partidos_torneo').insert({
    torneo_id: torneoId,
    equipo_a_id: equipoAId, equipo_b_id: equipoBId,
    fase: fase || 'eliminatoria', ronda: llave, estado: 'programado',
  }).select().single()

  if (error) {
    // 23505 = otra persona la creo entre nuestra busqueda y nuestro insert
    if (error.code === '23505') {
      const { data: ajena } = await buscar()
      if (ajena) return { partido: ajena }
    }
    return fallo(error)
  }
  return { partido: data }
}

/** La mesa tecnica guarda como va o como termino un partido. */
export async function guardarPartidoTorneo(partidoId, { golesA, golesB, amarillasA, amarillasB,
                                                        rojasA, rojasB, penalesA, penalesB,
                                                        tanda, estado, minuto }) {
  const fila = {}
  if (golesA     !== undefined) fila.goles_a     = golesA
  if (golesB     !== undefined) fila.goles_b     = golesB
  if (amarillasA !== undefined) fila.amarillas_a = amarillasA
  if (amarillasB !== undefined) fila.amarillas_b = amarillasB
  if (rojasA     !== undefined) fila.rojas_a     = rojasA
  if (rojasB     !== undefined) fila.rojas_b     = rojasB
  if (penalesA   !== undefined) fila.penales_a   = penalesA
  if (penalesB   !== undefined) fila.penales_b   = penalesB
  if (tanda      !== undefined) fila.tanda       = tanda
  if (estado     !== undefined) fila.estado      = estado
  if (minuto     !== undefined) fila.minuto      = minuto

  return cambio(await supabase.from('partidos_torneo')
    .update(fila).eq('id', partidoId).select())
}

/**
 * Suma (o resta) uno al marcador, leyendo primero lo que hay en la base.
 *
 * Antes la mesa mandaba el numero ya calculado desde su propia copia:
 *
 *     guardarPartidoTorneo(id, { golesA: (p.g1 || 0) + 1 })
 *
 * En los partidos de grupos andaba, porque esa copia se actualizaba. En los de
 * la llave no: la pantalla se quedaba con el valor viejo y cada gol nuevo
 * volvia a escribir el mismo numero. Se comprobo con Juventud Norte - Los
 * Andes: dos goles cargados, el marcador clavado en 1, y un solo toque al
 * boton de restar lo mando de 2 a 0.
 *
 * Leyendo la fila justo antes de escribir, el numero sale de la base y no de
 * lo que la pantalla cree recordar. Devuelve la fila actualizada para que la
 * pantalla se acomode a ella en vez de al reves.
 */
export async function sumarAlMarcador(partidoId, campo, delta = 1) {
  const COLUMNAS = {
    g1: 'goles_a', g2: 'goles_b',
    am1: 'amarillas_a', am2: 'amarillas_b',
    rj1: 'rojas_a', rj2: 'rojas_b',
  }
  const columna = COLUMNAS[campo]
  if (!columna) return { error: 'Campo desconocido: ' + campo }

  const { data: actual, error: errorLeer } = await supabase
    .from('partidos_torneo').select(columna).eq('id', partidoId).single()
  if (errorLeer) return fallo(errorLeer)

  const nuevo = Math.max(0, (Number(actual[columna]) || 0) + delta)

  const { data, error } = await supabase.from('partidos_torneo')
    .update({ [columna]: nuevo }).eq('id', partidoId).select().single()

  return error ? fallo(error) : { partido: data, valor: nuevo }
}

/**
 * Da el torneo por terminado.
 *
 * Se llama al finalizar la final: hay campeon, ya no queda nada por jugar.
 * Antes el torneo se quedaba «en curso» para siempre —con la copa entregada y
 * el cartel de EN CURSO en la ficha— porque nada lo cerraba.
 *
 * Es idempotente: si ya estaba finalizado no cambia nada.
 */
export async function cerrarTorneo(torneoId) {
  return cambio(await supabase.from('torneos')
    .update({ estado: 'finalizado' })
    .eq('id', torneoId).neq('estado', 'finalizado').select())
}

/** Un gol, una amarilla o una roja, con el jugador que la hizo. */
export async function guardarEventoPartido({ partidoId, equipoId, jugadorEquipoId, tipo, minuto }) {
  const { data, error } = await supabase.from('eventos_partido').insert({
    partido_id: partidoId, equipo_id: equipoId,
    jugador_equipo_id: jugadorEquipoId, tipo, minuto: minuto ?? null,
  }).select().single()
  return error ? fallo(error) : { evento: data }
}

/** Deshacer: la mesa se equivoco de jugador o de equipo. */
export async function borrarEventoPartido(eventoId) {
  return cambio(await supabase.from('eventos_partido')
    .delete().eq('id', eventoId).select())
}

// ── Partidos espontaneos ───────────────────────────────────────────────────

/**
 * Publica un partido espontáneo. fechaHora es la fecha y hora real en que se
 * juega; si no viene («Ahora mismo»), la pone la base con su reloj.
 */
export async function guardarPartidoEspontaneo({ empresaId, canchaId, deporte, fechaHora, maxJugadores, apuesta }) {
  const { data, error } = await supabase.from('partidos_espontaneos').insert({
    empresa_id: empresaId, cancha_id: canchaId, creador_id: D.SESION.usuarioId,
    deporte, max_jugadores: maxJugadores, apuesta: apuesta || null,
    ...(fechaHora ? { fecha_hora: fechaHora } : {}),
  }).select().single()
  if (error) return fallo(error)

  // Quien lo crea queda anotado como primer jugador
  await supabase.from('partido_jugadores').insert({
    partido_id: data.id, jugador_id: D.SESION.usuarioId, nombre: D.USUARIO_ACTUAL.nombre,
  })
  return { partido: data }
}

export async function unirseAPartido(partidoId) {
  const { error } = await supabase.from('partido_jugadores').insert({
    partido_id: partidoId, jugador_id: D.SESION.usuarioId, nombre: D.USUARIO_ACTUAL.nombre,
  })
  return error ? fallo(error) : { ok: true }
}

export async function salirDePartido(partidoId) {
  return cambio(await supabase.from('partido_jugadores')
    .delete().eq('partido_id', partidoId).eq('jugador_id', D.SESION.usuarioId).select())
}

// ── Perfil del propio usuario ──────────────────────────────────────────────

/**
 * El usuario edita sus datos. Solo nombre y telefono: el correo es con lo que
 * inicia sesion y cambiarlo exige confirmar la direccion nueva, y los puntos y
 * el rol los protege un disparador en la base.
 */
export async function guardarPerfil({ nombre, telefono, deporteFav }) {
  const cambios = { nombre, telefono: telefono || null }
  // El deporte favorito solo lo manda el cliente desde Mi Perfil
  if (deporteFav !== undefined) cambios.deporte_fav = deporteFav || null
  return cambio(await supabase.from('profiles')
    .update(cambios)
    .eq('id', D.SESION.usuarioId).select())
}

/**
 * Cambia la foto de perfil: la ruta de una foto subida, la direccion de la
 * foto de Google o null para quitarla. La base solo acepta una foto de la
 * propia carpeta del usuario o una de Google (migraciones/039).
 */
export async function guardarFotoDePerfil(foto) {
  return cambio(await supabase.from('profiles')
    .update({ avatar_url: foto || null })
    .eq('id', D.SESION.usuarioId).select())
}

/**
 * El administrador corrige los datos de su complejo.
 *
 * Hasta ahora esto solo se cargaba al registrarse: si se equivocaba en la
 * direccion, no marcaba la ubicacion o cambiaba de horario, quedaba asi para
 * siempre y el cliente veia el dato viejo.
 *
 * No se toca 'estado' ni 'admin_id' a proposito: aprobar un complejo es cosa
 * del super administrador.
 */
export async function guardarMiComplejo({ empresaId, nombre, telefono, zona, direccion,
                                         referencia, descripcion, horaInicio, horaFin,
                                         lat, lng, deportes, qrPago, logo, foto }) {
  const r = cambio(await supabase.from('empresas').update({
    nombre, zona, direccion,
    telefono: telefono || null,
    referencia: referencia || null,
    descripcion: descripcion || null,
    horario_inicio: horaInicio || null,
    horario_fin: horaFin || null,
    lat: lat ?? null, lng: lng ?? null,
    // Las rutas de los archivos dentro del deposito, no las imagenes
    qr_pago_url: qrPago || null,
    logo_url: logo || null,
    foto_url: foto || null,
  }).eq('id', empresaId).select())
  if (r.error) return r

  // Los deportes viven en su propia tabla. Se rehace la lista entera en vez de
  // calcular altas y bajas: son cinco filas como mucho y asi no quedan restos.
  const { error: errorBorrado } = await supabase.from('empresa_deportes')
    .delete().eq('empresa_id', empresaId)
  if (errorBorrado) return fallo(errorBorrado)

  if (deportes?.length) {
    const { error } = await supabase.from('empresa_deportes')
      .insert(deportes.map(deporte => ({ empresa_id: empresaId, deporte })))
    if (error) return fallo(error)
  }

  return { ok: true }
}

/**
 * Guarda el logo y la foto del complejo.
 *
 * Va aparte de crear la empresa porque la ruta de los archivos lleva el id
 * del complejo adentro, y ese id recién existe despues del insert.
 */
export async function guardarImagenesEmpresa({ empresaId, logo, foto }) {
  const fila = {}
  if (logo !== undefined) fila.logo_url = logo || null
  if (foto !== undefined) fila.foto_url = foto || null
  if (!Object.keys(fila).length) return { ok: true }

  return cambio(await supabase.from('empresas')
    .update(fila).eq('id', empresaId).select())
}

/**
 * Adjunta el comprobante de pago a un equipo ya inscrito.
 *
 * Va despues de crear el equipo porque el pago se hace recién cuando el
 * capitan ve el QR del organizador, y eso pasa en la pantalla siguiente.
 */
export async function guardarComprobanteEquipo({ equipoId, comprobante }) {
  return cambio(await supabase.from('equipos')
    .update({ comprobante_url: comprobante || null }).eq('id', equipoId).select())
}

/** El QR con el que se le paga la inscripcion al organizador del torneo. */
export async function guardarQRTorneo({ torneoId, qrPago }) {
  return cambio(await supabase.from('torneos')
    .update({ qr_pago_url: qrPago || null }).eq('id', torneoId).select())
}

// ── Recompensas del complejo ───────────────────────────────────────────────

export async function guardarRecompensa({ id, empresaId, emoji, nombre, descripcion,
                                         puntos, tipo, stock, activa,
                                         descuentoTipo, descuentoValor }) {
  const fila = {
    empresa_id: empresaId, emoji: emoji || '🎁', nombre,
    descripcion: descripcion || null, puntos: Number(puntos),
    tipo, stock: Number(stock) || 0,
    // Cuanto descuenta. Solo tiene sentido en las de descuento en reserva:
    // en las demas se limpia, para que no quede un dato viejo si el complejo
    // cambia el tipo de una recompensa que ya existia.
    descuento_tipo:  tipo === 'descuento_reserva' && descuentoTipo ? descuentoTipo : null,
    descuento_valor: tipo === 'descuento_reserva' && descuentoTipo
      ? Number(descuentoValor) : null,
  }
  if (activa !== undefined) fila.activa = activa
  const { data, error } = id
    ? await supabase.from('recompensas').update(fila).eq('id', id).select().single()
    : await supabase.from('recompensas').insert(fila).select().single()
  return error ? fallo(error) : { recompensa: data }
}

export async function cambiarEstadoRecompensa(recompensaId, activa) {
  return cambio(await supabase.from('recompensas').update({ activa }).eq('id', recompensaId).select())
}

export async function borrarRecompensa(recompensaId) {
  return cambio(await supabase.from('recompensas')
    .delete().eq('id', recompensaId).select())
}

// ── Entrenadores y horarios de entrenamiento ─────────────────────────

export async function guardarEntrenador({ id, empresaId, nombre, deporte, especialidad, correo, telefono, activo }) {
  const fila = {
    empresa_id: empresaId, nombre, deporte,
    especialidad: especialidad || null,
    correo: correo || null, telefono: telefono || null,
  }
  if (activo !== undefined) fila.activo = activo
  const { data, error } = id
    ? await supabase.from('entrenadores').update(fila).eq('id', id).select().single()
    : await supabase.from('entrenadores').insert(fila).select().single()
  return error ? fallo(error) : { entrenador: data }
}

export async function borrarEntrenador(entrenadorId) {
  return cambio(await supabase.from('entrenadores')
    .delete().eq('id', entrenadorId).select())
}

export async function guardarEntrenamiento({ id, empresaId, entrenadorId, canchaId, nombre, deporte, nivel,
                                            dias, horaInicio, horaFin, precio, descripcion,
                                            paraNinos, edadMin, edadMax, activo, cupo }) {
  const fila = {
    empresa_id: empresaId, entrenador_id: entrenadorId || null,
    cancha_id: canchaId || null,
    nombre, deporte, nivel, dias,
    hora_inicio: horaInicio, hora_fin: horaFin,
    precio: precio === '' || precio == null ? null : Number(precio),
    descripcion: descripcion || null,
    para_ninos: Boolean(paraNinos),
    edad_min: edadMin === '' || edadMin == null ? null : Number(edadMin),
    edad_max: edadMax === '' || edadMax == null ? null : Number(edadMax),
    // Vacio = sin limite. Es distinto de cero, que seria «no entra nadie»
    cupo_maximo: cupo === '' || cupo == null ? null : Number(cupo),
  }
  if (activo !== undefined) fila.activo = activo
  const { data, error } = id
    ? await supabase.from('entrenamientos').update(fila).eq('id', id).select().single()
    : await supabase.from('entrenamientos').insert(fila).select().single()
  return error ? fallo(error) : { entrenamiento: data }
}

export async function borrarEntrenamiento(entrenamientoId) {
  return cambio(await supabase.from('entrenamientos')
    .delete().eq('id', entrenamientoId).select())
}

// ── Alta de un complejo ────────────────────────────────────────

/**
 * Un dueno pide sumar su complejo a la plataforma.
 *
 * Se crea su cuenta y queda la solicitud pendiente. La empresa todavia no
 * existe: la crea el super administrador cuando aprueba. Hasta entonces el
 * dueno puede entrar, pero no tiene complejo que administrar.
 */
export async function registrarSolicitudEmpresa({ nombreEmpresa, zona, direccion, telefono,
                                                  descripcion, deportes, lat, lng, referencia,
                                                  horaInicio, horaFin,
                                                  adminNombre, adminCorreo, adminPassword }) {
  const { data, error } = await supabase.auth.signUp({
    email: adminCorreo.trim(), password: adminPassword,
    options: { data: { nombre: adminNombre, rol: 'admin_empresa' } },
  })
  if (error) {
    const m = (error.message || '').toLowerCase()
    if (m.includes('already registered')) return { error: 'Ya existe una cuenta con ese correo. Usa otro correo o inicia sesión.' }
    return fallo(error)
  }

  // El complejo se crea ya mismo, en estado 'pendiente'. Ese estado existe
  // justamente para esto: la empresa figura, pero los clientes no la ven
  // (la politica solo muestra las 'activo') y el super administrador la
  // encuentra en su pantalla para aprobarla o rechazarla.
  const { data: empresa, error: errorEmpresa } = await supabase.from('empresas').insert({
    nombre: nombreEmpresa, zona, direccion,
    telefono: telefono || null, descripcion: descripcion || null,
    lat: lat ?? null, lng: lng ?? null, referencia: referencia || null,
    horario_inicio: horaInicio || null, horario_fin: horaFin || null,
    estado: 'pendiente', admin_id: data.user.id,
  }).select().single()

  if (errorEmpresa) return fallo(errorEmpresa)

  if (deportes?.length) {
    await supabase.from('empresa_deportes')
      .insert(deportes.map(deporte => ({ empresa_id: empresa.id, deporte })))
  }

  return { usuario: data.user, empresa }
}

// ── Super administrador ────────────────────────────────────────────────────

/** Aprueba, suspende o reactiva un complejo. Solo el super administrador. */
export async function cambiarEstadoEmpresa(empresaId, estado) {
  return cambio(await supabase.from('empresas')
    .update({ estado }).eq('id', empresaId).select())
}

/** Suspende o reactiva la cuenta de cualquier usuario de la plataforma. */
export async function cambiarEstadoUsuario(usuarioId, activo) {
  return cambio(await supabase.from('profiles')
    .update({ activo }).eq('id', usuarioId).select())
}

// ── Bitacora ───────────────────────────────────────────────────────────────


/**
 * Deja constancia de lo que hizo el personal del complejo.
 * Se guarda el nombre ademas del id: si la cuenta se da de baja, el historial
 * sigue siendo legible.
 */
export async function registrarEnBitacora({ tipo, accion, detalle }) {
  const { error } = await supabase.from('bitacora').insert({
    empresa_id: D.SESION.empresaId,
    actor_id: D.SESION.usuarioId,
    actor_nombre: D.USUARIO_ACTUAL.nombre,
    tipo, accion, detalle,
  })
  if (error) {
    // Anotar en la bitacora no debe interrumpir lo que el usuario estaba
    // haciendo, pero tampoco puede desaparecer en silencio: asi se detecto que
    // varias categorias se estaban rechazando sin que nadie lo notara.
    console.warn('No se pudo anotar en la bitacora:', accion, '—', error.message)
    return fallo(error)
  }
  return { ok: true }
}
