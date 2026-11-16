// ─────────────────────────────────────────────────────────────────────────────
// EL REPORTE DE UN COMPLEJO EN PDF
//
// Arma el archivo con jsPDF a partir de lo que calculó reporteComplejo.js: lo
// mismo que se ve en la vista previa, en el mismo orden. Las librerías se
// cargan recién al descargar, para no hacer más pesada la aplicación.
//
// Las fuentes del PDF no tienen emojis ni símbolos raros: todo texto pasa por
// limpio(), que deja solo letras con tilde, ñ y signos comunes.
// ─────────────────────────────────────────────────────────────────────────────

import { montoBs } from './dinero'

export const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente', apartada: 'Apartada (pagando)', confirmada: 'Confirmada',
  rechazada: 'Rechazada', vencida: 'Pagó fuera de tiempo', cancelada: 'Anulada',
}

export const etiquetaAsistencia = (r) =>
  r.asistencia === 'presente' ? 'Llegó'
    : r.asistencia === 'ausente' ? 'No se presentó'
      : r.estado === 'confirmada' ? 'Sin marcar' : '—'

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** '2026-11-16' → '16/11/2026'. */
export const fechaNumerica = (iso) => {
  if (!iso) return '—'
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}

/** '2026-11-16' → 'lun 16/11/2026'. */
export const fechaConDia = (iso) => {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-').map(Number)
  return DIAS[new Date(a, m - 1, d).getDay()] + ' ' + fechaNumerica(iso)
}

export const bs = (n) => 'Bs. ' + montoBs(n || 0)
export const num = (n) => String(n ?? 0).replace('.', ',')

// Solo lo que las fuentes estándar del PDF pueden escribir (Latin-1)
const limpio = (s) => String(s ?? '')
  .replace(/[–—]/g, '-').replace(/[•]/g, '·').replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()

const ROJO = [139, 0, 0]
const AMBAR = [245, 158, 11]
const GRIS = [110, 110, 110]

/**
 * Genera el PDF y lo descarga.
 * @param rep        el resultado de calcularReporte()
 * @param secciones  { resumen, canchas, ingresosDia, horarios, clientes, reservas,
 *                     personal, bitacora, actividades, opiniones } en true/false
 * @param generadoPor el nombre del Super Admin que lo saca
 */
export async function descargarReportePDF(rep, secciones, { generadoPor = 'Super Admin', ahora = new Date() } = {}) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ANCHO = doc.internal.pageSize.getWidth()
  const ALTO = doc.internal.pageSize.getHeight()
  const M = 14
  let y = 0

  const e = rep.empresa || {}
  const r = rep.resumen
  const marca = ahora.toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  // Folio: el final del id del complejo y el momento, con la hora de Bolivia
  const [fd, fm, fa, fh, fmin] = limpio(marca).match(/\d+/g) || []
  const folio = 'REP-' + String(e.id ?? '').replace(/-/g, '').slice(-6).toUpperCase() + '-' + fa + fm + fd + fh + fmin

  const espacio = (alto) => { if (y + alto > ALTO - 18) { doc.addPage(); y = 18 } }

  const titulo = (texto) => {
    espacio(16)
    y += 4
    doc.setFillColor(...ROJO); doc.rect(M, y, 3, 6, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30)
    doc.text(limpio(texto), M + 5, y + 4.6)
    y += 9
  }
  const subtitulo = (texto) => {
    espacio(10)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...ROJO)
    doc.text(limpio(texto), M, y + 3.5)
    y += 5.5
  }
  const nota = (texto) => {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
    const lineas = doc.splitTextToSize(limpio(texto), ANCHO - 2 * M)
    espacio(lineas.length * 3.4 + 2)
    doc.text(lineas, M, y + 3)
    y += lineas.length * 3.4 + 2
  }
  const tabla = (head, body, opciones = {}) => {
    if (!body.length) { nota('Sin datos en este período.'); return }
    autoTable(doc, {
      startY: y, margin: { left: M, right: M, top: 18, bottom: 18 },
      head: [head.map(limpio)], body: body.map(f => f.map(limpio)),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.4, textColor: 40, lineColor: 210, lineWidth: 0.1 },
      headStyles: { fillColor: ROJO, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 246, 244] },
      ...opciones,
    })
    y = doc.lastAutoTable.finalY + 4
  }

  // ── Encabezado ──
  doc.setFillColor(...ROJO); doc.rect(0, 0, ANCHO, 26, 'F')
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17)
  doc.text('SPORTIKA', M, 11)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text('Reporte del complejo deportivo', M, 17)
  doc.setFontSize(8)
  doc.text('Folio: ' + folio, ANCHO - M, 11, { align: 'right' })
  doc.text('Generado: ' + limpio(marca), ANCHO - M, 16, { align: 'right' })
  doc.text('Por: ' + limpio(generadoPor), ANCHO - M, 21, { align: 'right' })
  y = 32

  doc.setTextColor(25); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text(limpio(e.nombre || 'Complejo'), M, y + 2)
  y += 7
  const ficha = [
    ['Período', fechaNumerica(rep.desde) + ' al ' + fechaNumerica(rep.hasta) + ' (' + r.dias + ' días)'],
    ['Canchas', rep.cancha ? 'Solo ' + rep.cancha : 'Todas (' + rep.porCancha.length + ')'],
    ['Estado', e.estado || '—'],
    ['Dirección', [e.direccion, e.zona].filter(Boolean).join(' · ') || '—'],
    ['Teléfono', e.telefono || '—'],
    ['Horario', e.horario || '—'],
    ['Administrador', [e.admin, e.adminEmail].filter(Boolean).join(' · ') || '—'],
  ]
  autoTable(doc, {
    startY: y, margin: { left: M, right: M }, theme: 'plain', body: ficha.map(f => f.map(limpio)),
    styles: { fontSize: 8.5, cellPadding: 0.9, textColor: 40 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30, textColor: GRIS } },
  })
  y = doc.lastAutoTable.finalY + 3

  // ── Resumen ──
  if (secciones.resumen) {
    titulo('Resumen del período')
    const cajas = [
      ['Ingresos confirmados', bs(r.ingresos)],
      ['Reservas confirmadas', String(r.confirmadas) + ' de ' + r.reservas],
      ['Horas vendidas', num(r.horasVendidas)],
      ['Ocupación', num(r.ocupacion) + '%'],
      ['Mejor cancha', rep.mejorCancha?.nombre || '—'],
      ['Clientes distintos', String(r.clientes)],
    ]
    const w = (ANCHO - 2 * M - 10) / 3
    cajas.forEach(([label, valor], i) => {
      const cx = M + (i % 3) * (w + 5), cy = y + Math.floor(i / 3) * 17
      doc.setDrawColor(225); doc.setFillColor(250, 248, 246); doc.roundedRect(cx, cy, w, 14, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
      doc.text(limpio(label), cx + 3, cy + 4.8)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(25)
      doc.text(doc.splitTextToSize(limpio(valor), w - 6)[0], cx + 3, cy + 11)
    })
    y += 36
    tabla(['Dato', 'Valor', 'Dato', 'Valor'], [
      ['Por cobrar (pendientes)', bs(r.porCobrar), 'Pagaron fuera de tiempo (a devolver)', bs(r.aDevolver)],
      ['Pendientes', r.pendientes, 'Rechazadas', r.rechazadas],
      ['Anuladas', r.canceladas, 'Vencidas', r.vencidas],
      ['Llegaron', r.presentes, 'No se presentaron', r.noShow],
      ['Asistencia sin marcar', r.sinMarcar, 'Con código de descuento', r.conDescuento],
      ['Por la aplicación', r.porApp, 'Presenciales (mostrador)', r.presenciales],
      ['Ingreso promedio por reserva', bs(r.ticketPromedio), 'Ingreso promedio por día', bs(r.promedioDiario)],
      ['Día con más reservas', r.diaPico ? r.diaPico.dia + ' (' + r.diaPico.reservas + ')' : '—',
       'Hora con más uso', r.horaPico ? r.horaPico.hora + ' (' + r.horaPico.reservas + ')' : '—'],
      ['Horas usadas por torneos (no se cobran)', num(r.horasDeTorneo), 'Calificación',
       r.calificacion == null ? 'Sin reseñas' : num(r.calificacion) + ' de 5'],
    ].map(f => f.map(String)), { columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } } })
  }

  // ── Canchas ──
  if (secciones.canchas) {
    titulo('Canchas: de la que más ingresó a la que menos')
    const max = Math.max(1, ...rep.porCancha.map(c => c.ingreso))
    const filas = rep.porCancha.slice(0, 12)
    espacio(filas.length * 6 + 4)
    filas.forEach((c, i) => {
      const cy = y + i * 6
      doc.setFont('helvetica', i === 0 && c.ingreso > 0 ? 'bold' : 'normal'); doc.setFontSize(7.5); doc.setTextColor(40)
      doc.text(doc.splitTextToSize(limpio(c.nombre), 52)[0], M, cy + 3.6)
      doc.setFillColor(235); doc.rect(M + 55, cy + 1, 95, 3.6, 'F')
      doc.setFillColor(...(i === 0 && c.ingreso > 0 ? AMBAR : ROJO))
      doc.rect(M + 55, cy + 1, 95 * c.ingreso / max, 3.6, 'F')
      doc.text(bs(c.ingreso), ANCHO - M, cy + 3.6, { align: 'right' })
    })
    y += filas.length * 6 + 3
    tabla(['#', 'Cancha', 'Deporte', 'Precio/h', 'Reservas', 'Confirm.', 'Horas', 'Ocupación', 'Ingresos', 'No vinieron', 'Clientes'],
      rep.porCancha.map((c, i) => [i + 1, c.nombre + (c.activa ? '' : ' (inactiva)'), c.deporte || '—', bs(c.precio),
        c.reservas, c.confirmadas, num(c.horas), num(c.ocupacion) + '%', bs(c.ingreso), c.noShow, c.clientes].map(String)))
    if (rep.mejorCancha) {
      nota('Mejor cancha: ' + rep.mejorCancha.nombre + ', con ' + bs(rep.mejorCancha.ingreso) + ' en ' +
        num(rep.mejorCancha.horas) + ' horas vendidas.' +
        (rep.menosUsada && rep.menosUsada.nombre !== rep.mejorCancha.nombre
          ? ' La que menos se usó: ' + rep.menosUsada.nombre + ' (' + num(rep.menosUsada.horas) + ' h).' : ''))
    }
  }

  // ── Ingresos día por día ──
  if (secciones.ingresosDia) {
    titulo('Ingresos día por día')
    tabla(['Fecha', 'Reservas confirmadas', 'Horas', 'Ingresos'],
      rep.porFecha.map(f => [fechaConDia(f.fecha), f.reservas, num(f.horas), bs(f.ingreso)].map(String)),
      { foot: rep.porFecha.length ? [['Total', String(r.confirmadas), num(r.horasVendidas), bs(r.ingresos)]] : undefined,
        footStyles: { fillColor: [240, 236, 232], textColor: 30, fontStyle: 'bold' } })
  }

  // ── Cuándo se juega ──
  if (secciones.horarios) {
    titulo('Cuándo se juega')
    subtitulo('Por día de la semana')
    tabla(rep.porDia.map(d => d.dia), [rep.porDia.map(d => String(d.reservas)), rep.porDia.map(d => bs(d.ingreso))])
    subtitulo('Por hora (horas confirmadas que ocupan esa franja)')
    tabla(['Hora', 'Reservas'], rep.porHora.map(h => [h.hora, String(h.reservas)]), { tableWidth: 60 })
  }

  // ── Clientes ──
  if (secciones.clientes) {
    titulo('Quién reservó')
    tabla(['Cliente', 'Tipo', 'Teléfono', 'Correo', 'Reservas', 'Confirm.', 'Horas', 'Pagado', 'No vino', 'Última', 'Canchas'],
      rep.clientes.map(c => [c.nombre, c.tipo, c.telefono || '—', c.correo || '—', c.reservas, c.confirmadas,
        num(c.horas), bs(c.pagado), c.noShow, fechaNumerica(c.ultima), c.canchas].map(String)),
      { styles: { fontSize: 6.8, cellPadding: 1.2 } })
  }

  // ── Detalle de reservas, cancha por cancha ──
  if (secciones.reservas) {
    titulo('Detalle de reservas, cancha por cancha')
    const nombres = [...new Set([...rep.porCancha.map(c => c.nombre), ...rep.reservas.map(x => x.cancha)])]
    for (const nombre of nombres) {
      const suyas = rep.reservas.filter(x => x.cancha === nombre)
      const c = rep.porCancha.find(x => x.nombre === nombre)
      subtitulo(nombre + ' · ' + suyas.length + (suyas.length === 1 ? ' reserva' : ' reservas') + (c ? ' · ' + bs(c.ingreso) + ' confirmados' : ''))
      tabla(['Nº', 'Fecha', 'Hora', 'Cliente', 'Teléfono', 'Estado', 'Monto', 'Asistencia', 'Origen', 'Atendió'],
        suyas.map(x => [x.nro || '—', fechaConDia(x.fechaISO), x.horaInicio + '-' + (x.horaFin || ''), x.cliente || '—',
          x.telefono || '—', ETIQUETA_ESTADO[x.estado] || x.estado, bs(x.monto), etiquetaAsistencia(x),
          x.origen === 'presencial' ? 'Mostrador' : 'App', x.atendidoPor || '—'].map(String)),
        { styles: { fontSize: 6.8, cellPadding: 1.1 } })
    }
    if (rep.jornadasDeTorneo.length) {
      subtitulo('Horas ocupadas por torneos')
      tabla(['Fecha', 'Hora', 'Cancha', 'Torneo', 'Estado'],
        rep.jornadasDeTorneo.map(x => [fechaConDia(x.fechaISO), x.horaInicio + '-' + (x.horaFin || ''), x.cancha,
          x.torneo || 'Torneo', ETIQUETA_ESTADO[x.estado] || x.estado]))
    }
  }

  // ── Personal ──
  if (secciones.personal) {
    titulo('Personal del complejo')
    tabla(['Nombre', 'Usuario', 'Teléfono', 'Turno', 'Estado', 'Reservas que atendió', 'Acciones en la bitácora'],
      rep.personal.map(p => [p.nombre, p.usuario || '—', p.telefono || '—', p.turno, p.activo ? 'Activo' : 'De baja',
        p.atendidas, p.acciones].map(String)))
    nota('El administrador (' + (e.admin || '—') + ') atendió ' + rep.atendidasPorAdmin +
      ' reservas en el período. El turno es el que anotó el administrador: el sistema no registra la hora de entrada y salida del personal.')
  }

  // ── Bitácora ──
  if (secciones.bitacora) {
    titulo('Bitácora: quién hizo qué y cuándo')
    tabla(['Fecha', 'Hora', 'Persona', 'Acción', 'Detalle'],
      rep.bitacora.map(b => [fechaNumerica(b.fechaISO), b.hora, b.empleado, b.accion, b.detalle || '']),
      { styles: { fontSize: 6.8, cellPadding: 1.1 }, columnStyles: { 4: { cellWidth: 70 } } })
  }

  // ── Torneos, entrenamientos y partidos ──
  if (secciones.actividades) {
    titulo('Torneos, entrenamientos y partidos')
    subtitulo('Torneos en el período')
    tabla(['Torneo', 'Deporte', 'Desde', 'Hasta', 'Cancha', 'Organiza', 'Estado'],
      rep.torneos.map(t => [t.nombre, t.deporte, fechaNumerica(t.fechaInicioISO), fechaNumerica(t.fechaFinISO),
        t.cancha || '—', t.creador || '—', t.estado || '—']))
    subtitulo('Entrenamientos fijos')
    tabla(['Entrenamiento', 'Deporte', 'Entrenador', 'Cancha', 'Días', 'Horario', 'Precio'],
      rep.entrenamientos.map(t => [t.nombre, t.deporte, t.entrenador, t.cancha || '—', (t.dias || []).join(', '),
        t.horaInicio + '-' + t.horaFin, t.precio == null ? 'Gratis' : bs(t.precio)]))
    subtitulo('Partidos abiertos')
    tabla(['Fecha', 'Hora', 'Deporte', 'Cancha', 'Organizó', 'Jugadores'],
      rep.partidos.map(p => [fechaConDia(p.fechaISO), p.hora, p.deporte, p.cancha || '—', p.creador,
        (p.jugadoresUnidos || []).length + ' de ' + p.maxJugadores]).map(f => f.map(String)))
  }

  // ── Reseñas y premios ──
  if (secciones.opiniones) {
    titulo('Reseñas y premios canjeados')
    subtitulo('Reseñas del período' + (r.calificacionPeriodo == null ? '' : ' · promedio ' + num(r.calificacionPeriodo) + ' de 5'))
    tabla(['Fecha', 'Cliente', 'Estrellas'], rep.calificaciones.map(c => [fechaNumerica(c.fechaISO), c.usuario, String(c.estrellas)]),
      { tableWidth: 110 })
    subtitulo('Premios canjeados')
    tabla(['Fecha', 'Cliente', 'Premio', 'Puntos', 'Código', 'Estado', 'Entregó'],
      rep.canjes.map(c => [fechaNumerica(c.fechaISO), c.cliente, c.recompensa, c.puntos, c.codigo, c.estado,
        c.entregadoPor || '—'].map(String)))
  }

  titulo('Lo que el sistema no registra')
  nota('Este reporte sale de lo que se guardó en SPORTIKA. No incluye accidentes ni incidentes (no se registran), ' +
    'ni la hora real de entrada y salida del personal. Las reservas presenciales llevan el nombre y teléfono que ' +
    'anotó el empleado. La ocupación compara las horas vendidas con las que cada cancha activa podía vender en el período.')

  // ── Pie de cada página ──
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(220); doc.line(M, ALTO - 12, ANCHO - M, ALTO - 12)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS)
    doc.text(limpio('SPORTIKA · ' + (e.nombre || '') + ' · Folio ' + folio + ' · Contiene datos personales: uso confidencial'),
      M, ALTO - 8)
    doc.text('Página ' + p + ' de ' + total, ANCHO - M, ALTO - 8, { align: 'right' })
  }

  const nombreArchivo = 'Reporte ' + limpio(e.nombre || 'complejo').replace(/[\\/:*?"<>|]/g, '') +
    ' ' + rep.desde + ' a ' + rep.hasta + (rep.cancha ? ' ' + limpio(rep.cancha) : '') + '.pdf'
  doc.save(nombreArchivo)
  return { folio, nombreArchivo }
}
