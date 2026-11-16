// ─────────────────────────────────────────────────────────────────────────────
// EL PANEL DEL SUPER ADMIN
//
// Lo que le importa a quien cuida toda la plataforma, de un vistazo:
//   · lo que espera su decisión (empresas por aprobar, pagos a devolver,
//     reservas que nadie revisó, complejos mal calificados o incompletos);
//   · cómo va el mes frente al anterior (ingresos, reservas, usuarios nuevos);
//   · lo de hoy en todos los complejos;
//   · la tendencia de los últimos meses, los mejores complejos, los deportes
//     y las zonas, quiénes usan el sistema y lo último que pasó.
//
// calcularPanel() es pura: recibe las listas y «hoy», y devuelve los números.
// panelSuperAdmin() las junta de datos.js. Todo se calcula, nada va a mano.
// ─────────────────────────────────────────────────────────────────────────────

import * as D from './datos'
import { hoyBolivia, fechaDeBolivia } from './fecha'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const minutos = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const horasEntre = (inicio, fin) => {
  if (!inicio || !fin) return 1
  let d = minutos(fin) - minutos(inicio)
  if (d <= 0) d += 24 * 60
  return d / 60
}
const redondear = (n, dec = 1) => Math.round(n * 10 ** dec) / 10 ** dec
const suma = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

/** '2026-11' → el mes anterior, '2026-10'. */
export const mesAnterior = (mes, n = 1) => {
  const [a, m] = mes.split('-').map(Number)
  const f = new Date(a, m - 1 - n, 1)
  return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0')
}

/** Cuánto cambió de un período al otro, en %. null si antes era 0 (no hay con qué comparar). */
export const variacion = (ahora, antes) =>
  antes ? redondear((ahora - antes) / antes * 100) : null

/**
 * @param datos { empresas, reservas, canchasPorEmpresa, usuarios, torneos, partidos,
 *                calificacionesPorEmpresa, bitacora }
 * @param hoy   'AAAA-MM-DD' de Bolivia
 */
export function calcularPanel(datos, hoy = hoyBolivia()) {
  const { empresas = [], reservas = [], canchasPorEmpresa = {}, usuarios = [], torneos = [],
          partidos = [], calificacionesPorEmpresa = {}, bitacora = [] } = datos

  const mes = hoy.slice(0, 7)
  const mesPasado = mesAnterior(mes)
  const diaDelMes = Number(hoy.slice(8, 10))
  // Para comparar justo: el mes pasado hasta el mismo día
  const mismoDiaMesPasado = mesPasado + '-' + String(diaDelMes).padStart(2, '0')

  const canchasDe = (id) => canchasPorEmpresa[id] || []
  const nombreDe = new Map(empresas.map(e => [String(e.id), e.nombre]))

  // Solo lo que pidió un cliente: las jornadas de torneo y las horas «ajenas» no cuentan
  const lista = reservas.filter(r => !r.ajena && r.origen !== 'torneo' && r.fechaISO)
  const confirmadas = lista.filter(r => r.estado === 'confirmada')
  const delMes = (m, hasta) => confirmadas.filter(r => r.fechaISO.startsWith(m) && (!hasta || r.fechaISO <= hasta))

  const esteMes = delMes(mes, hoy)
  const elPasadoHastaHoy = delMes(mesPasado, mismoDiaMesPasado)
  const elPasadoEntero = delMes(mesPasado)

  const ingresosMes = suma(esteMes, r => r.monto)
  const ingresosPasadoHastaHoy = suma(elPasadoHastaHoy, r => r.monto)

  // ── Usuarios ──
  const porRol = { cliente: 0, admin_empresa: 0, empleado: 0, superadmin: 0 }
  for (const u of usuarios) porRol[u.rol] = (porRol[u.rol] || 0) + 1
  const nuevosMes = usuarios.filter(u => (u.altaISO || '').startsWith(mes)).length
  const nuevosPasado = usuarios.filter(u => (u.altaISO || '') >= mesPasado && (u.altaISO || '') <= mismoDiaMesPasado).length
  const suspendidos = usuarios.filter(u => u.estado === 'suspendido').length

  // ── Hoy ──
  const deHoy = lista.filter(r => r.fechaISO === hoy)
  const hoyConfirmadas = deHoy.filter(r => r.estado === 'confirmada')

  // ── Lo que espera una decisión ──
  const activas = empresas.filter(e => e.estado === 'activo')
  const pendientesAprobar = empresas.filter(e => e.estado === 'pendiente')
    .sort((a, b) => (a.fechaSolicitudISO || '').localeCompare(b.fechaSolicitudISO || ''))
  const aDevolver = lista.filter(r => r.estado === 'vencida' && r.comprobante)
  const sinRevisar = lista.filter(r => r.estado === 'pendiente' && r.fechaISO < hoy)
  const porRevisarHoy = lista.filter(r => r.estado === 'pendiente' && r.fechaISO >= hoy)

  const calificacion = (id) => {
    const cals = calificacionesPorEmpresa[id] || []
    return cals.length ? redondear(suma(cals, c => c.estrellas) / cals.length) : null
  }
  const malCalificados = activas
    .map(e => ({ e, prom: calificacion(e.id), n: (calificacionesPorEmpresa[e.id] || []).length }))
    .filter(x => x.prom !== null && x.prom < 3)
  // Un complejo aprobado que todavía no puede recibir reservas como se debe
  const incompletos = activas.map(e => {
    const faltan = []
    if (!canchasDe(e.id).some(c => c.disponible !== false)) faltan.push('canchas activas')
    if (!e.qrPago) faltan.push('QR de pago')
    if (e.lat == null || e.lng == null) faltan.push('ubicación en el mapa')
    if (!e.apertura || !e.cierre) faltan.push('horario')
    return { e, faltan }
  }).filter(x => x.faltan.length)

  const alertas = []
  if (pendientesAprobar.length) alertas.push({ nivel: 'aviso', icono: '⏳', clave: 'aprobar', path: '/superadmin/empresas',
    texto: pendientesAprobar.length + (pendientesAprobar.length === 1 ? ' empresa espera' : ' empresas esperan') + ' tu aprobación' })
  if (aDevolver.length) alertas.push({ nivel: 'grave', icono: '💸', clave: 'devolver', path: '/superadmin/reservas',
    texto: aDevolver.length + ' pago' + (aDevolver.length === 1 ? '' : 's') + ' fuera de tiempo por devolver (Bs. ' +
      suma(aDevolver, r => r.monto) + ')' })
  if (sinRevisar.length) alertas.push({ nivel: 'aviso', icono: '🕒', clave: 'sinRevisar', path: '/superadmin/reservas',
    texto: sinRevisar.length + ' reserva' + (sinRevisar.length === 1 ? '' : 's') + ' que el complejo nunca revisó y ya pasaron' })
  if (malCalificados.length) alertas.push({ nivel: 'grave', icono: '⭐', clave: 'calificacion', path: '/superadmin/resenas',
    texto: malCalificados.length + ' complejo' + (malCalificados.length === 1 ? '' : 's') + ' con calificación menor a 3: ' +
      malCalificados.map(x => x.e.nombre).join(', ') })
  if (incompletos.length) alertas.push({ nivel: 'info', icono: '🧩', clave: 'incompletos', path: '/superadmin/empresas',
    texto: incompletos.length + ' complejo' + (incompletos.length === 1 ? '' : 's') + ' aprobado' +
      (incompletos.length === 1 ? '' : 's') + ' con datos sin completar', detalle: incompletos.map(x => x.e.nombre + ': falta ' + x.faltan.join(', ')) })

  // ── Tendencia: los últimos 6 meses ──
  const tendencia = Array.from({ length: 6 }, (_, i) => {
    const m = mesAnterior(mes, 5 - i)
    // El mes en curso, hasta hoy: las reservas de los días que vienen todavía no se jugaron
    const del = delMes(m, m === mes ? hoy : undefined)
    return { mes: m, label: MESES[Number(m.slice(5, 7)) - 1], ingresos: suma(del, r => r.monto), reservas: del.length,
             enCurso: m === mes }
  })

  // ── Ranking de complejos del mes ──
  const ranking = empresas
    .filter(e => e.estado === 'activo' || e.estado === 'suspendido')
    .map(e => {
      const suyas = esteMes.filter(r => D.mismo(r.empresa_id, e.id))
      const antes = elPasadoHastaHoy.filter(r => D.mismo(r.empresa_id, e.id))
      const ingresos = suma(suyas, r => r.monto)
      return { id: e.id, nombre: e.nombre, estado: e.estado, zona: e.zona, ingresos, reservas: suyas.length,
               horas: redondear(suma(suyas, r => horasEntre(r.horaInicio, r.horaFin))),
               cambio: variacion(ingresos, suma(antes, r => r.monto)), calificacion: calificacion(e.id),
               canchas: canchasDe(e.id).length }
    })
    .sort((a, b) => b.ingresos - a.ingresos || b.reservas - a.reservas)

  // ── Deportes: reservas confirmadas del mes por el deporte de la cancha ──
  const deporteDe = new Map()
  for (const e of empresas) for (const c of canchasDe(e.id)) deporteDe.set(String(e.id) + '|' + c.nombre, c.deporte)
  const deportesMap = new Map()
  for (const r of esteMes) {
    const dep = deporteDe.get(String(r.empresa_id) + '|' + r.cancha) || 'Otro'
    const x = deportesMap.get(dep) || { deporte: dep, reservas: 0, ingresos: 0 }
    x.reservas++; x.ingresos += Number(r.monto) || 0
    deportesMap.set(dep, x)
  }
  const deportes = [...deportesMap.values()].sort((a, b) => b.reservas - a.reservas)

  // ── Zonas: complejos activos y canchas por zona ──
  const zonasMap = new Map()
  for (const e of activas) {
    const z = e.zona || 'Sin zona'
    const x = zonasMap.get(z) || { zona: z, complejos: 0, canchas: 0 }
    x.complejos++; x.canchas += canchasDe(e.id).length
    zonasMap.set(z, x)
  }
  const zonas = [...zonasMap.values()].sort((a, b) => b.complejos - a.complejos || a.zona.localeCompare(b.zona))

  // ── Calidad del servicio ──
  const confirmadasMes = esteMes.length
  const ausentes = esteMes.filter(r => r.asistencia === 'ausente').length
  const todasCals = Object.values(calificacionesPorEmpresa).flat()
  const capacidadMes = suma(activas, e => {
    const abiertas = e.apertura && e.cierre ? horasEntre(e.apertura, e.cierre) : 16
    return canchasDe(e.id).filter(c => c.disponible !== false).length * abiertas * diaDelMes
  })
  const horasMes = suma(esteMes, r => horasEntre(r.horaInicio, r.horaFin))
  const delMesTodas = lista.filter(r => r.fechaISO.startsWith(mes) && r.fechaISO <= hoy)
  const rechazadasMes = delMesTodas.filter(r => r.estado === 'rechazada' || r.estado === 'cancelada').length

  return {
    hoy, mes, labelMes: MESES[Number(mes.slice(5, 7)) - 1],
    kpis: {
      ingresosMes, ingresosCambio: variacion(ingresosMes, ingresosPasadoHastaHoy), ingresosPasadoHastaHoy,
      reservasPasadoHastaHoy: elPasadoHastaHoy.length,
      ingresosMesPasado: suma(elPasadoEntero, r => r.monto),
      reservasMes: confirmadasMes, reservasCambio: variacion(confirmadasMes, elPasadoHastaHoy.length),
      usuarios: usuarios.length, nuevosMes, nuevosCambio: variacion(nuevosMes, nuevosPasado),
      complejosActivos: activas.length,
      canchas: suma(activas, e => canchasDe(e.id).length),
      canchasActivas: suma(activas, e => canchasDe(e.id).filter(c => c.disponible !== false).length),
    },
    hoyDia: {
      reservas: deHoy.length, confirmadas: hoyConfirmadas.length, ingresos: suma(hoyConfirmadas, r => r.monto),
      porRevisar: porRevisarHoy.filter(r => r.fechaISO === hoy).length,
      complejos: new Set(deHoy.map(r => String(r.empresa_id))).size,
      partidos: partidos.filter(p => (p.fechaISO || '') === hoy).length,
      torneosEnCurso: torneos.filter(t => t.estado === 'en_curso').length,
    },
    alertas,
    empresas: {
      activas: activas.length, pendientes: pendientesAprobar.length,
      suspendidas: empresas.filter(e => e.estado === 'suspendido').length,
      rechazadas: empresas.filter(e => e.estado === 'rechazado').length,
      listaPendientes: pendientesAprobar.slice(0, 5),
    },
    usuarios: { porRol, suspendidos, total: usuarios.length },
    calidad: {
      ocupacion: capacidadMes ? Math.min(100, redondear(horasMes / capacidadMes * 100)) : 0,
      noShow: confirmadasMes ? redondear(ausentes / confirmadasMes * 100) : 0,
      rechazo: delMesTodas.length ? redondear(rechazadasMes / delMesTodas.length * 100) : 0,
      calificacion: todasCals.length ? redondear(suma(todasCals, c => c.estrellas) / todasCals.length) : null,
      resenas: todasCals.length,
      ticket: confirmadasMes ? redondear(ingresosMes / confirmadasMes, 2) : 0,
    },
    torneos: {
      inscripciones: torneos.filter(t => t.estado === 'inscripciones').length,
      enCurso: torneos.filter(t => t.estado === 'en_curso').length,
      finalizados: torneos.filter(t => t.estado === 'finalizado').length,
      partidosAbiertos: partidos.filter(p => (p.fechaISO || '') >= hoy).length,
    },
    tendencia, ranking, deportes, zonas,
    actividad: [...bitacora]
      .sort((a, b) => ((b.fechaISO || '') + b.hora).localeCompare((a.fechaISO || '') + a.hora))
      .slice(0, 8)
      .map(b => ({ ...b, complejo: nombreDe.get(String(b.empresa_id)) || '—' })),
  }
}

/** Junta de datos.js todo lo de la plataforma y arma el panel. */
export function panelSuperAdmin() {
  const hoy = hoyBolivia()
  return calcularPanel({
    empresas: D.EMPRESAS,
    reservas: D.RESERVAS_EMPRESA,
    canchasPorEmpresa: D.CANCHAS_POR_EMPRESA,
    usuarios: D.todosLosUsuarios(),
    // Uno que ya pasó su fecha o cerró inscripciones no cuenta como «en curso» ni «abierto»
    torneos: D.TORNEOS.map(t => ({ ...t,
      estado: t.estado === 'finalizado' ? 'finalizado' : D.torneoActivo(t) ? t.estado : 'sin_actividad' })),
    partidos: D.PARTIDOS_ESPONTANEOS.map(p => ({ ...p, fechaISO: fechaDeBolivia(p.fechaHora) })),
    calificacionesPorEmpresa: D.CALIFICACIONES_POR_EMPRESA,
    bitacora: D.BITACORA,
  }, hoy)
}
