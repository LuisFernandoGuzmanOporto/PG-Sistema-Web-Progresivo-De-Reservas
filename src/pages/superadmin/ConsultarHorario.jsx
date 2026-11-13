import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { reservasDeEmpresa, bitacoraDeEmpresa, entrenamientosDeEmpresa, empleadosDeEmpresa,
         canchasDeEmpresa, PARTIDOS_ESPONTANEOS, TIPO_BITACORA, empresaPorId, mismo } from '../../lib/datos'
import { hoyBolivia, horaDeBolivia, fechaDeBolivia, diaConFecha, diasLegibles } from '../../lib/fecha'
import { montoBs } from '../../lib/dinero'
import { Titulo, FiltroComplejo, EstadoReserva, Vacio } from './comun'

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAR UN HORARIO
//
// Para cuando alguien pregunta qué pasaba en un complejo un día a una hora:
// un accidente, un reclamo, un objeto perdido. Junta en una sola pantalla lo
// que el sistema ya guarda: quién tenía la cancha, si llegó, quién lo atendió
// (bitácora), qué entrenamiento o partido había y qué hizo el personal ese día.
//
// Lo que el sistema NO sabe se dice en la misma pantalla: el turno del
// empleado es un texto informativo (no hay marcado de entrada y salida) y los
// accidentes no se registran.
// ─────────────────────────────────────────────────────────────────────────────

const minutos = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
// Una reserva que termina a las 00:00 termina a medianoche
const finEnMinutos = (inicio, fin) => {
  const f = minutos(fin)
  return f <= minutos(inicio) ? 24 * 60 : f
}
const seCruza = (inicio, fin, desde, hasta) =>
  minutos(inicio) < hasta && finEnMinutos(inicio, fin) > desde

const SIN_TILDE = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 3)
const DIA_SEMANA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
const diaDeLaSemana = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return DIA_SEMANA[new Date(a, m - 1, d).getDay()]
}

// Las que no ocuparon la cancha: se muestran, pero se aclara
const NO_OCUPO = { rechazada: 'Se rechazó', cancelada: 'Se anuló', vencida: 'Pagó fuera de tiempo: la hora la tomó otro' }

const MARGENES = [
  { valor: 0,   label: 'Solo esa hora' },
  { valor: 60,  label: '1 hora antes y después' },
  { valor: 120, label: '2 horas antes y después' },
  { valor: -1,  label: 'Todo el día' },
]

const ahoraRedondeada = () => horaDeBolivia(new Date()).slice(0, 2) + ':00'

export default function ConsultarHorario() {
  const navigate = useNavigate()
  const [complejo, setComplejo] = useState('')
  const [fecha, setFecha]       = useState(hoyBolivia())
  const [hora, setHora]         = useState(ahoraRedondeada())
  const [margen, setMargen]     = useState(60)
  const [cancha, setCancha]     = useState('')

  const empresa = complejo ? empresaPorId(complejo) : null
  const todoElDia = margen === -1
  const desde = todoElDia ? 0 : Math.max(0, minutos(hora) - margen)
  // «Solo esa hora» mira la hora completa: 20:00 cubre de 20:00 a 21:00
  const hasta = todoElDia ? 24 * 60 : Math.min(24 * 60, minutos(hora) + (margen || 60))
  const enVentana = (hhmm) => { const m = minutos(hhmm); return m >= desde && m < hasta }
  const textoHora = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
  const ventana = todoElDia ? 'todo el día' : textoHora(desde) + ' a ' + (hasta >= 24 * 60 ? '24:00' : textoHora(hasta))

  // ── Lo que había en ese momento ─────────────────────────────────────────
  const reservas = !empresa ? [] : reservasDeEmpresa(empresa.id)
    .filter(r => !r.ajena && r.fechaISO === fecha && seCruza(r.horaInicio, r.horaFin, desde, hasta))
    .filter(r => !cancha || r.cancha === cancha)
    .sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio))

  const bitacoraDelDia = !empresa ? [] : bitacoraDeEmpresa(empresa.id).filter(b => b.fechaISO === fecha)
  const rastroDe = (r) => r.nro ? bitacoraDeEmpresa(empresa.id).filter(b => String(b.detalle || '').includes(r.nro)) : []

  const dia = diaDeLaSemana(fecha)
  const entrenamientos = !empresa ? [] : entrenamientosDeEmpresa(empresa.id)
    .filter(t => (t.dias || []).some(d => SIN_TILDE(d) === dia))
    .filter(t => seCruza(t.horaInicio, t.horaFin, desde, hasta))
    .filter(t => !cancha || t.cancha === cancha)

  // Un partido armado entre clientes dura, para esto, una hora
  const espontaneos = !empresa ? [] : PARTIDOS_ESPONTANEOS
    .filter(p => mismo(p.empresa_id, empresa.id) && fechaDeBolivia(p.fechaHora) === fecha)
    .filter(p => { const h = horaDeBolivia(p.fechaHora); return seCruza(h, textoHora(Math.min(minutos(h) + 60, 24 * 60 - 1)), desde, hasta) })
    .filter(p => !cancha || p.cancha === cancha)

  const empleados = !empresa ? [] : empleadosDeEmpresa(empresa.id)
  const huboAlgo = reservas.length || entrenamientos.length || espontaneos.length

  return (
    <Layout role="superadmin">
      <Titulo icono="🔍" texto="Consultar un horario"
        sub="Qué pasaba en un complejo un día a una hora: quién tenía la cancha, si llegó, quién lo atendió y qué hizo el personal. Sirve ante un accidente o un reclamo.">
        {empresa && <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ Imprimir</button>}
      </Titulo>

      {/* ── La pregunta ── */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <label className="campo-consulta">Complejo
            <FiltroComplejo valor={complejo} onCambio={(v) => { setComplejo(v); setCancha('') }} todos={false} style={{ minWidth: 0, width: '100%' }} />
          </label>
          <label className="campo-consulta">Día
            <input type="date" className="input" defaultValue={fecha} onChange={e => { if (e.target.value) setFecha(e.target.value) }} />
          </label>
          <label className="campo-consulta">Hora
            <input type="time" className="input" defaultValue={hora} disabled={todoElDia} onChange={e => { if (e.target.value) setHora(e.target.value) }} />
          </label>
          <label className="campo-consulta">Cuánto mirar
            <select className="input" value={margen} onChange={e => setMargen(Number(e.target.value))}>
              {MARGENES.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
            </select>
          </label>
          <label className="campo-consulta">Cancha
            <select className="input" value={cancha} onChange={e => setCancha(e.target.value)} disabled={!empresa}>
              <option value="">Todas</option>
              {empresa && canchasDeEmpresa(empresa.id).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </label>
        </div>
      </div>

      {!empresa ? (
        <div className="card"><Vacio texto="Elige un complejo para empezar" detalle="Después ajusta el día y la hora. Por defecto se mira la hora actual, una hora antes y una después." /></div>
      ) : (
        <>
          <p style={{ color: '#888', fontSize: '0.86rem', marginBottom: 14 }}>
            <strong style={{ color: '#f5f5f5' }}>{empresa.nombre}</strong> · {diaConFecha(fecha)} · {ventana}
            {cancha && <> · {cancha}</>}
            {empresa.telefono && <> · Teléfono del complejo: <strong style={{ color: '#ccc' }}>{empresa.telefono}</strong></>}
          </p>

          {/* ── 1. Quién tenía la cancha ── */}
          <Seccion titulo="📅 Quién tenía la cancha" cuantos={reservas.length}>
            {reservas.length === 0 ? (
              <Vacio texto="No había ninguna reserva en ese horario" />
            ) : reservas.map(r => {
              const rastro = rastroDe(r)
              return (
                <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #222', opacity: NO_OCUPO[r.estado] ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.92rem' }}>
                        {r.torneo ? '🏆 ' + r.torneo : r.cliente}
                        {r.origen === 'presencial' && <span style={{ color: '#8b5cf6', fontSize: '0.68rem', fontWeight: 700 }}> · PRESENCIAL</span>}
                      </p>
                      <p style={{ color: '#888', fontSize: '0.8rem' }}>
                        {r.cancha} · <span style={{ color: '#00BCD4' }}>{r.horaInicio}-{r.horaFin}</span>
                        {r.nro && <> · {r.nro}</>}
                        {!r.torneo && <> · Bs. {montoBs(r.monto)}</>}
                      </p>
                      {!r.torneo && (
                        <p style={{ color: '#ccc', fontSize: '0.8rem', marginTop: 4 }}>
                          📞 {r.telefono || <span style={{ color: '#666' }}>sin teléfono (reservó desde su cuenta)</span>}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <EstadoReserva r={r} />
                      <p style={{ fontSize: '0.76rem', marginTop: 6, color: r.asistencia === 'presente' ? '#22c55e' : r.asistencia === 'ausente' ? '#ef4444' : '#666' }}>
                        {r.asistencia === 'presente' ? '✓ Se marcó que llegó'
                          : r.asistencia === 'ausente' ? '✕ Se marcó que no se presentó'
                          : 'No se marcó la asistencia'}
                      </p>
                    </div>
                  </div>
                  {NO_OCUPO[r.estado] && <p style={{ color: '#888', fontSize: '0.76rem', marginTop: 6 }}>⚠ {NO_OCUPO[r.estado]}: no estaba en la cancha por esta reserva.</p>}
                  {r.torneo_id && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, padding: '2px 0' }}
                      onClick={() => navigate('/app/torneos/' + r.torneo_id)}>Ver equipos y jugadores del torneo →</button>
                  )}
                  {(r.atendidoPor || rastro.length > 0) && (
                    <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid #333' }}>
                      {r.atendidoPor && <p style={{ color: '#aaa', fontSize: '0.78rem' }}>Confirmó: <strong>{r.atendidoPor}</strong></p>}
                      {rastro.map(b => (
                        <p key={b.id} style={{ color: '#888', fontSize: '0.76rem' }}>
                          {b.fecha} {b.hora} · <strong style={{ color: '#ccc' }}>{b.empleado}</strong> · {b.accion}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Seccion>

          {/* ── 2. Entrenamientos y partidos ── */}
          <Seccion titulo="🏃 Entrenamientos programados" cuantos={entrenamientos.length}>
            {entrenamientos.length === 0 ? <Vacio texto="No había entrenamientos programados" /> : entrenamientos.map(t => (
              <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid #222' }}>
                <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{t.nombre} {t.paraNinos && <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>· niños {t.edadMin}–{t.edadMax} años</span>}</p>
                <p style={{ color: '#888', fontSize: '0.8rem' }}>
                  A cargo de <strong style={{ color: '#ccc' }}>{t.entrenador}</strong> · {t.cancha || 'sin cancha asignada'} ·
                  <span style={{ color: '#00BCD4' }}> {t.horaInicio}-{t.horaFin}</span> · {diasLegibles(t.dias)}
                </p>
              </div>
            ))}
          </Seccion>

          <Seccion titulo="⚽ Partidos armados entre clientes" cuantos={espontaneos.length}>
            {espontaneos.length === 0 ? <Vacio texto="No había partidos armados entre clientes" /> : espontaneos.map(p => (
              <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid #222' }}>
                <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{p.deporte} · {p.cancha || 'sin cancha'} · {horaDeBolivia(p.fechaHora)}</p>
                <p style={{ color: '#888', fontSize: '0.8rem' }}>
                  Lo armó <strong style={{ color: '#ccc' }}>{p.creador}</strong>
                  {p.jugadoresUnidos?.length ? ' · se anotaron: ' + p.jugadoresUnidos.join(', ') : ' · nadie más se anotó'}
                </p>
              </div>
            ))}
          </Seccion>

          {!huboAlgo && (
            <p style={{ color: '#888', fontSize: '0.82rem', margin: '-6px 0 18px' }}>
              En el sistema no figura nadie en ese horario. Pudo haber gente que entró sin reserva: eso el sistema no lo sabe.
            </p>
          )}

          {/* ── 3. El personal ── */}
          <Seccion titulo="🧑‍💼 Lo que hizo el personal ese día" cuantos={bitacoraDelDia.length}>
            {bitacoraDelDia.length === 0 ? <Vacio texto="El personal no registró ninguna acción ese día" /> : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Hora</th><th>Quién</th><th>Qué hizo</th><th>Detalle</th></tr></thead>
                  <tbody>
                    {[...bitacoraDelDia].sort((a, b) => (a.hora || '').localeCompare(b.hora || '')).map(b => (
                      <tr key={b.id} style={{ background: enVentana(b.hora) ? 'rgba(245,158,11,0.06)' : undefined }}>
                        <td style={{ color: enVentana(b.hora) ? '#f59e0b' : '#888', fontWeight: enVentana(b.hora) ? 700 : 400 }}>{b.hora}</td>
                        <td style={{ color: '#ccc' }}>{b.empleado}</td>
                        <td style={{ color: '#ccc' }}>{(TIPO_BITACORA[b.tipo]?.icon || '•') + ' ' + b.accion}</td>
                        <td style={{ color: '#888', fontSize: '0.8rem' }}>{b.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>

          <Seccion titulo="📋 Empleados del complejo" cuantos={empleados.length}>
            {empleados.length === 0 ? <Vacio texto="El complejo no tiene empleados con cuenta" detalle="Lo atiende su administrador." /> : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Empleado</th><th>Usuario</th><th>Teléfono</th><th>Turno anotado</th><th>Cuenta</th></tr></thead>
                  <tbody>
                    {empleados.map(e => (
                      <tr key={e.id}>
                        <td style={{ color: '#f5f5f5', fontWeight: 600 }}>{e.nombre}</td>
                        <td style={{ color: '#888' }}>{e.usuario}</td>
                        <td style={{ color: '#ccc' }}>{e.telefono || '—'}</td>
                        <td style={{ color: '#ccc' }}>{e.turno || '—'}</td>
                        <td style={{ color: e.activo ? '#22c55e' : '#ef4444' }}>{e.activo ? 'Activa' : 'Dada de baja'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ color: '#666', fontSize: '0.74rem', padding: '10px 16px' }}>
              Administrador del complejo: <strong style={{ color: '#aaa' }}>{empresa.admin}</strong>
              {empresa.adminEmail && <> · {empresa.adminEmail}</>}
            </p>
          </Seccion>

          {/* Lo que el sistema no sabe: mejor decirlo que dejarlo suponer */}
          <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a', borderRadius: 12, marginTop: 8 }}>
            <p style={{ color: '#ccc', fontSize: '0.84rem', fontWeight: 600, marginBottom: 6 }}>ℹ️ Lo que esta consulta no puede decir</p>
            <ul style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.7, paddingLeft: 18 }}>
              <li>El turno del empleado es un dato informativo: no hay marcado de entrada y salida. Se sabe quién <em>registró acciones</em> a esa hora, no quién estaba en el complejo.</li>
              <li>El sistema no registra accidentes ni incidentes: eso lo informa el complejo.</li>
              <li>Quien entra sin reserva (acompañantes, público) no figura en ningún lado.</li>
            </ul>
          </div>
        </>
      )}
    </Layout>
  )
}

function Seccion({ titulo, cuantos, children }) {
  return (
    <div className="card" style={{ marginBottom: 18, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="section-title" style={{ fontSize: '1rem' }}>{titulo}</h3>
        <span style={{ color: '#666', fontSize: '0.78rem' }}>{cuantos}</span>
      </div>
      {children}
    </div>
  )
}
