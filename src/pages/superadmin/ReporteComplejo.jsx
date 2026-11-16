import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { canchasDeEmpresa, reservasDeEmpresa, USUARIO_ACTUAL } from '../../lib/datos'
import { hoyBolivia } from '../../lib/fecha'
import { PERIODOS, fechasDePeriodo, reporteDeComplejo } from '../../lib/reporteComplejo'
import { descargarReportePDF, ETIQUETA_ESTADO, etiquetaAsistencia, fechaNumerica, fechaConDia, bs, num } from '../../lib/pdfReporte'
import { FiltroComplejo, Vacio } from './comun'

// Las partes del reporte que se pueden quitar antes de descargarlo
const SECCIONES = [
  { clave: 'resumen',     label: 'Resumen' },
  { clave: 'canchas',     label: 'Canchas y la mejor' },
  { clave: 'ingresosDia', label: 'Ingresos día por día' },
  { clave: 'horarios',    label: 'Días y horas con más uso' },
  { clave: 'clientes',    label: 'Quién reservó' },
  { clave: 'reservas',    label: 'Detalle de cada reserva' },
  { clave: 'personal',    label: 'Personal' },
  { clave: 'bitacora',    label: 'Bitácora' },
  { clave: 'actividades', label: 'Torneos, entrenamientos y partidos' },
  { clave: 'opiniones',   label: 'Reseñas y premios' },
]
const TODAS = Object.fromEntries(SECCIONES.map(s => [s.clave, true]))

/** Una tabla de la hoja: encabezados y filas ya escritas como texto. */
function Tabla({ head, filas, pie, ancho }) {
  if (!filas.length) return <p className="nota">Sin datos en este período.</p>
  return (
    <div className="tabla-hoja" style={ancho ? { maxWidth: ancho } : undefined}>
      <table>
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        {pie && <tfoot><tr>{pie.map((c, j) => <td key={j}>{c}</td>)}</tr></tfoot>}
      </table>
    </div>
  )
}

/**
 * El reporte de UN complejo: el Super Admin lo elige, elige las fechas y la
 * cancha, mira la hoja tal como va a salir y la descarga en PDF.
 */
export default function ReporteComplejo() {
  const [params, setParams] = useSearchParams()
  const complejo = params.get('complejo') || ''
  const [periodo, setPeriodo] = useState('mes')
  const [propias, setPropias] = useState(() => fechasDePeriodo('mes'))
  const [cancha, setCancha]   = useState('')
  const [secciones, setSecciones] = useState(TODAS)
  const [generando, setGenerando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const elegirComplejo = (id) => {
    const p = new URLSearchParams(params)
    if (id) p.set('complejo', id); else p.delete('complejo')
    setParams(p, { replace: true })
    setCancha('')
    setAviso(null)
  }

  const fechas = periodo === 'otro'
    ? propias
    : fechasDePeriodo(periodo, { reservas: complejo ? reservasDeEmpresa(complejo) : [] })
  const fechasMal = !fechas.desde || !fechas.hasta || fechas.desde > fechas.hasta

  const rep = useMemo(
    () => (complejo && !fechasMal ? reporteDeComplejo(complejo, { ...fechas, cancha }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [complejo, fechas.desde, fechas.hasta, cancha, fechasMal])

  const descargar = async () => {
    setGenerando(true); setAviso(null)
    try {
      const { nombreArchivo } = await descargarReportePDF(rep, secciones, { generadoPor: USUARIO_ACTUAL.nombre || 'Super Admin' })
      setAviso({ ok: true, texto: 'Se descargó «' + nombreArchivo + '».' })
    } catch (e) {
      console.error(e)
      setAviso({ ok: false, texto: 'No se pudo armar el PDF. Intenta de nuevo.' })
    } finally {
      setGenerando(false)
    }
  }

  const canchas = complejo ? canchasDeEmpresa(complejo) : []
  const ver = secciones

  return (
    <>
      {/* ── Filtros ── */}
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px' }}>
            <span style={{ color: '#888', fontSize: '0.75rem' }}>Complejo</span>
            <FiltroComplejo valor={complejo} onCambio={elegirComplejo} todos={false} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 170px' }}>
            <span style={{ color: '#888', fontSize: '0.75rem' }}>Período</span>
            <select className="input" aria-label="Período" value={periodo} onChange={e => {
              const v = e.target.value
              if (v === 'otro') setPropias(fechas)
              setPeriodo(v)
            }}>
              {PERIODOS.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
            </select>
          </label>
          {periodo === 'otro' && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#888', fontSize: '0.75rem' }}>Desde</span>
                <input className="input" type="date" aria-label="Desde" value={propias.desde}
                  onChange={e => setPropias(f => ({ ...f, desde: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#888', fontSize: '0.75rem' }}>Hasta</span>
                <input className="input" type="date" aria-label="Hasta" value={propias.hasta}
                  onChange={e => setPropias(f => ({ ...f, hasta: e.target.value }))} />
              </label>
            </>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 190px' }}>
            <span style={{ color: '#888', fontSize: '0.75rem' }}>Cancha</span>
            <select className="input" aria-label="Cancha" value={cancha} onChange={e => setCancha(e.target.value)}
              disabled={!complejo}>
              <option value="">Todas las canchas</option>
              {canchas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </label>
        </div>

        <p style={{ color: '#888', fontSize: '0.75rem', margin: '14px 0 6px' }}>Qué incluir</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SECCIONES.map(s => (
            <label key={s.clave} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer',
              padding: '5px 10px', borderRadius: 20, border: '1px solid ' + (ver[s.clave] ? '#f59e0b' : '#333'),
              color: ver[s.clave] ? '#f5f5f5' : '#777',
            }}>
              <input type="checkbox" checked={ver[s.clave]}
                onChange={() => setSecciones(v => ({ ...v, [s.clave]: !v[s.clave] }))} />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {!complejo ? (
        <div className="card"><Vacio texto="Elige un complejo para ver su reporte"
          detalle="Vas a ver todo lo del período: cuánto ingresó, cuál es su mejor cancha, quién reservó cada hora, si llegó, quién lo atendió y qué hizo el personal. Después lo puedes descargar en PDF." /></div>
      ) : fechasMal ? (
        <div className="card"><Vacio texto="Revisa las fechas" detalle="La fecha «desde» tiene que ser anterior o igual a «hasta»." /></div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <p style={{ color: '#888', fontSize: '0.8rem' }}>Vista previa: así va a salir el PDF.</p>
            <button className="btn btn-primary" onClick={descargar} disabled={generando}>
              {generando ? 'Armando el PDF…' : '📄 Descargar PDF'}
            </button>
          </div>
          {aviso && (
            <p role="status" style={{ color: aviso.ok ? '#22c55e' : '#ef4444', fontSize: '0.8rem', marginBottom: 12 }}>{aviso.texto}</p>
          )}
          <Hoja rep={rep} ver={ver} />
        </>
      )}
    </>
  )
}

function Hoja({ rep, ver }) {
  const e = rep.empresa || {}
  const r = rep.resumen
  const maxIngreso = Math.max(1, ...rep.porCancha.map(c => c.ingreso))
  const nombresCancha = [...new Set([...rep.porCancha.map(c => c.nombre), ...rep.reservas.map(x => x.cancha)])]

  return (
    <div className="hoja-reporte">
      <div className="encabezado">
        <div>
          <p style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: 1 }}>SPORTIKA</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>Reporte del complejo deportivo</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.72rem', opacity: 0.9 }}>
          <p>Generado: {fechaNumerica(hoyBolivia())}</p>
          <p>Por: {USUARIO_ACTUAL.nombre || 'Super Admin'}</p>
        </div>
      </div>

      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#191919', marginBottom: 6 }}>{e.nombre}</p>
      <table style={{ width: 'auto', marginBottom: 4 }}>
        <tbody>
          {[
            ['Período', fechaNumerica(rep.desde) + ' al ' + fechaNumerica(rep.hasta) + ' (' + r.dias + ' días)'],
            ['Canchas', rep.cancha ? 'Solo ' + rep.cancha : 'Todas (' + rep.porCancha.length + ')'],
            ['Estado', e.estado || '—'],
            ['Dirección', [e.direccion, e.zona].filter(Boolean).join(' · ') || '—'],
            ['Teléfono', e.telefono || '—'],
            ['Horario', e.horario || '—'],
            ['Administrador', [e.admin, e.adminEmail].filter(Boolean).join(' · ') || '—'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ border: 'none', background: 'none', color: '#777', fontWeight: 700, paddingLeft: 0 }}>{k}</td>
              <td style={{ border: 'none', background: 'none' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {ver.resumen && (
        <>
          <h2>Resumen del período</h2>
          <div className="cajas">
            {[
              ['Ingresos confirmados', bs(r.ingresos)],
              ['Reservas confirmadas', r.confirmadas + ' de ' + r.reservas],
              ['Horas vendidas', num(r.horasVendidas)],
              ['Ocupación', num(r.ocupacion) + '%'],
              ['Mejor cancha', rep.mejorCancha?.nombre || '—'],
              ['Clientes distintos', r.clientes],
            ].map(([k, v]) => <div key={k} className="caja"><span>{k}</span><strong>{v}</strong></div>)}
          </div>
          <Tabla head={['Dato', 'Valor', 'Dato', 'Valor']} filas={[
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
          ]} />
        </>
      )}

      {ver.canchas && (
        <>
          <h2>Canchas: de la que más ingresó a la que menos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {rep.porCancha.map((c, i) => {
              const top = i === 0 && c.ingreso > 0
              return (
                <div key={c.nombre} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 30%) 1fr auto', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontWeight: top ? 700 : 400, fontSize: '0.76rem' }}>{top ? '🏆 ' : ''}{c.nombre}</span>
                  <div style={{ height: 9, background: '#ebebeb', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: (c.ingreso / maxIngreso * 100) + '%', background: top ? '#f59e0b' : '#8B0000', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{bs(c.ingreso)}</span>
                </div>
              )
            })}
          </div>
          <Tabla head={['#', 'Cancha', 'Deporte', 'Precio/h', 'Reservas', 'Confirm.', 'Horas', 'Ocupación', 'Ingresos', 'No vinieron', 'Clientes']}
            filas={rep.porCancha.map((c, i) => [i + 1, c.nombre + (c.activa ? '' : ' (inactiva)'), c.deporte || '—', bs(c.precio),
              c.reservas, c.confirmadas, num(c.horas), num(c.ocupacion) + '%', bs(c.ingreso), c.noShow, c.clientes])} />
          {rep.mejorCancha && (
            <p className="nota">
              Mejor cancha: {rep.mejorCancha.nombre}, con {bs(rep.mejorCancha.ingreso)} en {num(rep.mejorCancha.horas)} horas vendidas.
              {rep.menosUsada && rep.menosUsada.nombre !== rep.mejorCancha.nombre &&
                ' La que menos se usó: ' + rep.menosUsada.nombre + ' (' + num(rep.menosUsada.horas) + ' h).'}
            </p>
          )}
        </>
      )}

      {ver.ingresosDia && (
        <>
          <h2>Ingresos día por día</h2>
          <Tabla head={['Fecha', 'Reservas confirmadas', 'Horas', 'Ingresos']}
            filas={rep.porFecha.map(f => [fechaConDia(f.fecha), f.reservas, num(f.horas), bs(f.ingreso)])}
            pie={['Total', r.confirmadas, num(r.horasVendidas), bs(r.ingresos)]} ancho={620} />
        </>
      )}

      {ver.horarios && (
        <>
          <h2>Cuándo se juega</h2>
          <h3>Por día de la semana</h3>
          <Tabla head={rep.porDia.map(d => d.dia)} filas={[rep.porDia.map(d => d.reservas), rep.porDia.map(d => bs(d.ingreso))]} />
          <h3>Por hora (horas confirmadas que ocupan esa franja)</h3>
          <Tabla head={['Hora', 'Reservas']} filas={rep.porHora.map(h => [h.hora, h.reservas])} ancho={240} />
        </>
      )}

      {ver.clientes && (
        <>
          <h2>Quién reservó</h2>
          <Tabla head={['Cliente', 'Tipo', 'Teléfono', 'Correo', 'Reservas', 'Confirm.', 'Horas', 'Pagado', 'No vino', 'Última', 'Canchas']}
            filas={rep.clientes.map(c => [c.nombre, c.tipo, c.telefono || '—', c.correo || '—', c.reservas, c.confirmadas,
              num(c.horas), bs(c.pagado), c.noShow, fechaNumerica(c.ultima), c.canchas])} />
        </>
      )}

      {ver.reservas && (
        <>
          <h2>Detalle de reservas, cancha por cancha</h2>
          {nombresCancha.map(nombre => {
            const suyas = rep.reservas.filter(x => x.cancha === nombre)
            const c = rep.porCancha.find(x => x.nombre === nombre)
            return (
              <div key={nombre}>
                <h3>{nombre} · {suyas.length} {suyas.length === 1 ? 'reserva' : 'reservas'}{c ? ' · ' + bs(c.ingreso) + ' confirmados' : ''}</h3>
                <Tabla head={['Nº', 'Fecha', 'Hora', 'Cliente', 'Teléfono', 'Estado', 'Monto', 'Asistencia', 'Origen', 'Atendió']}
                  filas={suyas.map(x => [x.nro || '—', fechaConDia(x.fechaISO), x.horaInicio + '-' + (x.horaFin || ''), x.cliente || '—',
                    x.telefono || '—', ETIQUETA_ESTADO[x.estado] || x.estado, bs(x.monto), etiquetaAsistencia(x),
                    x.origen === 'presencial' ? 'Mostrador' : 'App', x.atendidoPor || '—'])} />
              </div>
            )
          })}
          {rep.jornadasDeTorneo.length > 0 && (
            <>
              <h3>Horas ocupadas por torneos</h3>
              <Tabla head={['Fecha', 'Hora', 'Cancha', 'Torneo', 'Estado']}
                filas={rep.jornadasDeTorneo.map(x => [fechaConDia(x.fechaISO), x.horaInicio + '-' + (x.horaFin || ''), x.cancha,
                  x.torneo || 'Torneo', ETIQUETA_ESTADO[x.estado] || x.estado])} />
            </>
          )}
        </>
      )}

      {ver.personal && (
        <>
          <h2>Personal del complejo</h2>
          <Tabla head={['Nombre', 'Usuario', 'Teléfono', 'Turno', 'Estado', 'Reservas que atendió', 'Acciones en la bitácora']}
            filas={rep.personal.map(p => [p.nombre, p.usuario || '—', p.telefono || '—', p.turno, p.activo ? 'Activo' : 'De baja',
              p.atendidas, p.acciones])} />
          <p className="nota">
            El administrador ({e.admin || '—'}) atendió {rep.atendidasPorAdmin} reservas en el período. El turno es el que
            anotó el administrador: el sistema no registra la hora de entrada y salida del personal.
          </p>
        </>
      )}

      {ver.bitacora && (
        <>
          <h2>Bitácora: quién hizo qué y cuándo</h2>
          <Tabla head={['Fecha', 'Hora', 'Persona', 'Acción', 'Detalle']}
            filas={rep.bitacora.map(b => [fechaNumerica(b.fechaISO), b.hora, b.empleado, b.accion, b.detalle || ''])} />
        </>
      )}

      {ver.actividades && (
        <>
          <h2>Torneos, entrenamientos y partidos</h2>
          <h3>Torneos en el período</h3>
          <Tabla head={['Torneo', 'Deporte', 'Desde', 'Hasta', 'Cancha', 'Organiza', 'Estado']}
            filas={rep.torneos.map(t => [t.nombre, t.deporte, fechaNumerica(t.fechaInicioISO), fechaNumerica(t.fechaFinISO),
              t.cancha || '—', t.creador || '—', t.estado || '—'])} />
          <h3>Entrenamientos fijos</h3>
          <Tabla head={['Entrenamiento', 'Deporte', 'Entrenador', 'Cancha', 'Días', 'Horario', 'Precio']}
            filas={rep.entrenamientos.map(t => [t.nombre, t.deporte, t.entrenador, t.cancha || '—', (t.dias || []).join(', '),
              t.horaInicio + '-' + t.horaFin, t.precio == null ? 'Gratis' : bs(t.precio)])} />
          <h3>Partidos abiertos</h3>
          <Tabla head={['Fecha', 'Hora', 'Deporte', 'Cancha', 'Organizó', 'Jugadores']}
            filas={rep.partidos.map(p => [fechaConDia(p.fechaISO), p.hora, p.deporte, p.cancha || '—', p.creador,
              (p.jugadoresUnidos || []).length + ' de ' + p.maxJugadores])} />
        </>
      )}

      {ver.opiniones && (
        <>
          <h2>Reseñas y premios canjeados</h2>
          <h3>Reseñas del período{r.calificacionPeriodo == null ? '' : ' · promedio ' + num(r.calificacionPeriodo) + ' de 5'}</h3>
          <Tabla head={['Fecha', 'Cliente', 'Estrellas']}
            filas={rep.calificaciones.map(c => [fechaNumerica(c.fechaISO), c.usuario, c.estrellas])} ancho={420} />
          <h3>Premios canjeados</h3>
          <Tabla head={['Fecha', 'Cliente', 'Premio', 'Puntos', 'Código', 'Estado', 'Entregó']}
            filas={rep.canjes.map(c => [fechaNumerica(c.fechaISO), c.cliente, c.recompensa, c.puntos, c.codigo, c.estado, c.entregadoPor || '—'])} />
        </>
      )}

      <h2>Lo que el sistema no registra</h2>
      <p className="nota">
        Este reporte sale de lo que se guardó en SPORTIKA. No incluye accidentes ni incidentes (no se registran), ni la hora
        real de entrada y salida del personal. Las reservas presenciales llevan el nombre y teléfono que anotó el empleado.
        La ocupación compara las horas vendidas con las que cada cancha activa podía vender en el período.
      </p>
    </div>
  )
}
