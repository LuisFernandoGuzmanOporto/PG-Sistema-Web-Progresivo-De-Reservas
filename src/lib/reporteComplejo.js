// ─────────────────────────────────────────────────────────────────────────────
// EL REPORTE DE UN COMPLEJO (Super Admin)
//
// Todo lo que el sistema sabe de un complejo en un período, cancha por cancha:
// cuánto ingresó, cuál es su mejor cancha, quién reservó cada hora, si llegó,
// quién lo atendió, qué hizo el personal y qué torneos, entrenamientos y
// partidos hubo. Es lo que se pide cuando hay un accidente o un reclamo, o
// cuando alguien (la policía, el dueño) quiere ver cómo trabaja el complejo.
//
// calcularReporte() es una función pura: recibe las listas y devuelve los
// números. reporteDeComplejo() junta esas listas de datos.js. Así la misma
// cuenta se prueba sin base de datos y se usa en la pantalla y en el PDF.
// ─────────────────────────────────────────────────────────────────────────────

import * as D from './datos'
import { fechaDeBolivia, horaDeBolivia, hoyBolivia } from './fecha'

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const minutos = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** '09:00' a '11:00' → 2. Un cierre a medianoche ('00:00') cuenta como 24:00. */
export const horasEntre = (inicio, fin) => {
  if (!inicio || !fin) return 1
  let d = minutos(fin) - minutos(inicio)
  if (d <= 0) d += 24 * 60
  return d / 60
}

/** Cuántos días hay entre dos fechas 'AAAA-MM-DD', las dos incluidas. */
export const diasEntre = (desde, hasta) => {
  const a = Date.UTC(...desde.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)))
  const b = Date.UTC(...hasta.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)))
  return Math.max(0, Math.round((b - a) / 86400000) + 1)
}

/** 0 = lunes … 6 = domingo, como DIAS_SEMANA. */
const indiceDia = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return (new Date(a, m - 1, d).getDay() + 6) % 7
}

const redondear = (n, dec = 1) => Math.round(n * 10 ** dec) / 10 ** dec
const dentro = (iso, desde, hasta) => !!iso && iso >= desde && iso <= hasta

// ── Períodos que se ofrecen en la pantalla ──────────────────────────────────

const iso = (fecha) => fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') +
  '-' + String(fecha.getDate()).padStart(2, '0')

const desdeIso = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d) }

export const PERIODOS = [
  { valor: 'mes',      label: 'Este mes' },
  { valor: 'mesPasado', label: 'El mes pasado' },
  { valor: '7',        label: 'Últimos 7 días' },
  { valor: '30',       label: 'Últimos 30 días' },
  { valor: 'anio',     label: 'Este año' },
  { valor: 'todo',     label: 'Desde que empezó' },
  { valor: 'otro',     label: 'Elegir fechas' },
]

/**
 * Las fechas de un período, con «hoy» de Bolivia. «Desde que empezó» va de la
 * primera reserva del complejo a la última (las que vienen también cuentan).
 */
export function fechasDePeriodo(periodo, { hoy = hoyBolivia(), reservas = [] } = {}) {
  const h = desdeIso(hoy)
  if (periodo === 'mes') return { desde: hoy.slice(0, 8) + '01', hasta: hoy }
  if (periodo === 'mesPasado') {
    const inicio = new Date(h.getFullYear(), h.getMonth() - 1, 1)
    const fin = new Date(h.getFullYear(), h.getMonth(), 0)
    return { desde: iso(inicio), hasta: iso(fin) }
  }
  if (periodo === '7' || periodo === '30') {
    const inicio = new Date(h); inicio.setDate(h.getDate() - Number(periodo) + 1)
    return { desde: iso(inicio), hasta: hoy }
  }
  if (periodo === 'anio') return { desde: hoy.slice(0, 4) + '-01-01', hasta: hoy }
  const fechas = reservas.map(r => r.fechaISO).filter(Boolean).sort()
  return { desde: fechas[0] && fechas[0] < hoy ? fechas[0] : hoy,
           hasta: fechas.length && fechas[fechas.length - 1] > hoy ? fechas[fechas.length - 1] : hoy }
}

// ── La cuenta ───────────────────────────────────────────────────────────────

/**
 * @param datos   { empresa, canchas, reservas, empleados, bitacora, torneos,
 *                  entrenamientos, partidos, calificaciones, canjes, usuarios }
 *                todo de ESE complejo (usuarios: todos, para el correo).
 * @param filtro  { desde, hasta, cancha } — cancha es el nombre, o '' para todas.
 */
export function calcularReporte(datos, { desde, hasta, cancha = '' }) {
  const { empresa, canchas = [], reservas = [], empleados = [], bitacora = [], torneos = [],
          entrenamientos = [], partidos = [], calificaciones = [], canjes = [], usuarios = [] } = datos

  const deLaCancha = (nombre) => !cancha || nombre === cancha
  const canchasVistas = canchas.filter(c => deLaCancha(c.nombre))
  const dias = diasEntre(desde, hasta)

  // Las del período. Las «ajenas» son solo horas tomadas sin cliente ni monto:
  // las ve un cliente, no sirven para un reporte.
  const delPeriodo = reservas
    .filter(r => !r.ajena && dentro(r.fechaISO, desde, hasta) && deLaCancha(r.cancha))
    .sort((a, b) => (a.fechaISO + a.horaInicio + a.cancha).localeCompare(b.fechaISO + b.horaInicio + b.cancha))

  // El teléfono de la reserva; si el cliente tiene cuenta y no lo anotó ahí, el de su perfil
  const perfilDe = new Map(usuarios.map(u => [String(u.id), u]))
  const deTorneo = delPeriodo.filter(r => r.origen === 'torneo')
  const lista = delPeriodo.filter(r => r.origen !== 'torneo').map(r => (
    r.telefono || !r.cliente_id ? r : { ...r, telefono: perfilDe.get(String(r.cliente_id))?.telefono || null }))
  const confirmadas = lista.filter(r => r.estado === 'confirmada')
  const horasDe = (r) => horasEntre(r.horaInicio, r.horaFin)
  const suma = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

  // Lo que el complejo pudo vender: cada cancha activa, las horas que abre, los días del período
  const horasAbierta = (c) => {
    const a = c.apertura || empresa?.apertura, z = c.cierre || empresa?.cierre
    return a && z ? horasEntre(a, z) : 16
  }
  const capacidadDe = (c) => (c.disponible === false ? 0 : horasAbierta(c) * dias)

  // ── Por cancha ──
  const porCancha = canchasVistas.map(c => {
    const suyas = lista.filter(r => r.cancha === c.nombre)
    const conf = suyas.filter(r => r.estado === 'confirmada')
    const horas = suma(conf, horasDe)
    const capacidad = capacidadDe(c)
    return {
      nombre: c.nombre, deporte: c.deporte, precio: c.precio, activa: c.disponible !== false,
      reservas: suyas.length, confirmadas: conf.length, horas: redondear(horas),
      ingreso: suma(conf, r => r.monto),
      ocupacion: capacidad ? Math.min(100, redondear(horas / capacidad * 100)) : 0,
      noShow: conf.filter(r => r.asistencia === 'ausente').length,
      horasDeTorneo: redondear(suma(deTorneo.filter(r => r.cancha === c.nombre && D.ocupaLaCancha(r)), horasDe)),
      clientes: new Set(suyas.map(r => r.cliente_id || r.cliente)).size,
    }
  })
  // La mejor: la que más ingresó; si empatan, la que más horas vendió
  const ranking = [...porCancha].sort((a, b) => b.ingreso - a.ingreso || b.horas - a.horas)
  const mejorCancha = ranking.find(c => c.ingreso > 0 || c.horas > 0) || null
  const masUsada = [...porCancha].sort((a, b) => b.horas - a.horas)[0]
  const menosUsada = porCancha.length > 1 ? [...porCancha].sort((a, b) => a.horas - b.horas)[0] : null

  // ── Cuándo se juega ──
  const porDia = DIAS_SEMANA.map(dia => ({ dia, reservas: 0, ingreso: 0 }))
  const porHora = Array.from({ length: 24 }, (_, i) => ({ hora: String(i).padStart(2, '0') + ':00', reservas: 0 }))
  for (const r of confirmadas) {
    const d = porDia[indiceDia(r.fechaISO)]
    d.reservas++; d.ingreso += Number(r.monto) || 0
    const inicio = Math.floor(minutos(r.horaInicio) / 60)
    for (let k = 0; k < Math.ceil(horasDe(r)); k++) {
      const f = porHora[(inicio + k) % 24]
      if (f) f.reservas++
    }
  }
  const pico = (serie) => serie.reduce((m, x) => (x.reservas > (m?.reservas || 0) ? x : m), null)

  // Ingresos día por día
  const porFechaMap = new Map()
  for (const r of confirmadas) {
    const f = porFechaMap.get(r.fechaISO) || { fecha: r.fechaISO, reservas: 0, horas: 0, ingreso: 0 }
    f.reservas++; f.horas += horasDe(r); f.ingreso += Number(r.monto) || 0
    porFechaMap.set(r.fechaISO, f)
  }
  const porFecha = [...porFechaMap.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(f => ({ ...f, horas: redondear(f.horas) }))

  // ── Quién reservó ──
  const clientesMap = new Map()
  for (const r of lista) {
    const clave = r.cliente_id ? 'id:' + r.cliente_id : 'n:' + (r.cliente || '—') + '|' + (r.telefono || '')
    const u = r.cliente_id ? perfilDe.get(String(r.cliente_id)) : null
    const c = clientesMap.get(clave) || {
      nombre: r.cliente || u?.nombre || '—',
      telefono: r.telefono || u?.telefono || null,
      correo: u?.email || null,
      tipo: r.cliente_id ? 'Con cuenta' : 'Presencial',
      reservas: 0, confirmadas: 0, horas: 0, pagado: 0, noShow: 0, ultima: '', canchas: new Set(),
    }
    c.reservas++
    if (r.estado === 'confirmada') {
      c.confirmadas++; c.horas += horasDe(r); c.pagado += Number(r.monto) || 0
      if (r.asistencia === 'ausente') c.noShow++
    }
    if (!c.telefono && r.telefono) c.telefono = r.telefono
    c.canchas.add(r.cancha)
    if ((r.fechaISO || '') > c.ultima) c.ultima = r.fechaISO
    clientesMap.set(clave, c)
  }
  const clientes = [...clientesMap.values()]
    .map(c => ({ ...c, horas: redondear(c.horas), canchas: [...c.canchas].join(', ') }))
    .sort((a, b) => b.pagado - a.pagado || b.reservas - a.reservas || a.nombre.localeCompare(b.nombre))

  // ── Personal ──
  const bitacoraPeriodo = bitacora
    .filter(b => dentro(b.fechaISO, desde, hasta))
    .sort((a, b) => (b.fechaISO + b.hora).localeCompare(a.fechaISO + a.hora))
  const personal = empleados.map(e => ({
    nombre: e.nombre, usuario: e.usuario, telefono: e.telefono || null, turno: e.turno || '—',
    activo: e.activo !== false, permisos: (e.permisos || []).length,
    atendidas: lista.filter(r => r.atendidoPor === e.nombre).length,
    acciones: bitacoraPeriodo.filter(b => D.mismo(b.empleado_id, e.id) || b.empleado === e.nombre).length,
  }))
  // El administrador también confirma reservas: se cuenta aparte
  const atendidasPorAdmin = lista.filter(r => r.atendidoPor && r.atendidoPor === empresa?.admin).length

  // ── Lo demás que pasó en el período ──
  const torneosPeriodo = torneos.filter(t => {
    const ini = t.fechaInicioISO, fin = t.fechaFinISO || t.fechaInicioISO
    return ini && ini <= hasta && fin >= desde
  })
  const partidosPeriodo = partidos
    .map(p => ({ ...p, fechaISO: fechaDeBolivia(p.fechaHora), hora: horaDeBolivia(p.fechaHora) }))
    .filter(p => dentro(p.fechaISO, desde, hasta) && (!cancha || p.cancha === cancha))
    .sort((a, b) => (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora))
  const entrenamientosVistos = entrenamientos.filter(t => !cancha || t.cancha === cancha)
  const calificacionesPeriodo = calificaciones.filter(c => dentro(c.fechaISO, desde, hasta))
  const canjesPeriodo = canjes
    .map(c => ({ ...c, fechaISO: c.creadoEl ? fechaDeBolivia(c.creadoEl) : '' }))
    .filter(c => dentro(c.fechaISO, desde, hasta))
  const promedio = (cals) => cals.length ? redondear(suma(cals, c => c.estrellas) / cals.length) : null

  // ── Resumen ──
  const horasVendidas = suma(confirmadas, horasDe)
  const capacidad = suma(canchasVistas, capacidadDe)
  const ingresos = suma(confirmadas, r => r.monto)
  const contar = (estado) => lista.filter(r => r.estado === estado).length

  const resumen = {
    dias,
    ingresos,
    porCobrar: suma(lista.filter(r => r.estado === 'pendiente' || r.estado === 'apartada'), r => r.monto),
    // Pagó pero fuera de tiempo y la hora la tomó otro: hay que devolverle
    aDevolver: suma(lista.filter(r => r.estado === 'vencida' && r.comprobante), r => r.monto),
    reservas: lista.length,
    confirmadas: confirmadas.length,
    pendientes: contar('pendiente') + contar('apartada'),
    rechazadas: contar('rechazada'),
    canceladas: contar('cancelada'),
    vencidas: contar('vencida'),
    horasVendidas: redondear(horasVendidas),
    ocupacion: capacidad ? Math.min(100, redondear(horasVendidas / capacidad * 100)) : 0,
    presentes: confirmadas.filter(r => r.asistencia === 'presente').length,
    noShow: confirmadas.filter(r => r.asistencia === 'ausente').length,
    sinMarcar: confirmadas.filter(r => !r.asistencia).length,
    porApp: lista.filter(r => r.origen !== 'presencial').length,
    presenciales: lista.filter(r => r.origen === 'presencial').length,
    conDescuento: lista.filter(r => r.codigoDescuento).length,
    ticketPromedio: confirmadas.length ? redondear(ingresos / confirmadas.length, 2) : 0,
    promedioDiario: dias ? redondear(ingresos / dias, 2) : 0,
    clientes: clientes.length,
    horasDeTorneo: redondear(suma(deTorneo.filter(D.ocupaLaCancha), horasDe)),
    calificacion: promedio(calificaciones),
    calificacionPeriodo: promedio(calificacionesPeriodo),
    diaPico: pico(porDia),
    horaPico: pico(porHora),
  }

  return {
    empresa, desde, hasta, cancha, resumen,
    porCancha: ranking, mejorCancha, masUsada, menosUsada,
    porDia, porHora: porHora.filter(h => h.reservas > 0), porFecha,
    reservas: lista, jornadasDeTorneo: deTorneo,
    clientes, personal, atendidasPorAdmin, bitacora: bitacoraPeriodo,
    torneos: torneosPeriodo, entrenamientos: entrenamientosVistos, partidos: partidosPeriodo,
    calificaciones: calificacionesPeriodo, canjes: canjesPeriodo,
  }
}

/** Junta de datos.js todo lo de un complejo y arma su reporte. */
export function reporteDeComplejo(empresaId, filtro) {
  const id = empresaId
  return calcularReporte({
    empresa: D.empresaPorId(id),
    canchas: D.canchasDeEmpresa(id),
    reservas: D.reservasDeEmpresa(id),
    empleados: D.empleadosDeEmpresa(id),
    bitacora: D.bitacoraDeEmpresa(id),
    torneos: D.TORNEOS.filter(t => D.mismo(t.empresa_id, id)),
    entrenamientos: D.entrenamientosDeEmpresa(id),
    partidos: D.PARTIDOS_ESPONTANEOS.filter(p => D.mismo(p.empresa_id, id)),
    calificaciones: D.calificacionesDeEmpresa(id),
    canjes: (D.CANJES || []).filter(c => D.mismo(c.empresa_id, id)),
    usuarios: D.USUARIOS || [],
  }, filtro)
}
