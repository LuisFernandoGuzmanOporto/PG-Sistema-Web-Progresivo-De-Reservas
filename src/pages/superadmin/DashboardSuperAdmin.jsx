// DashboardSuperAdmin.jsx
//
// El panel de quien cuida toda la plataforma: primero lo que espera su
// decisión, después cómo va el mes y lo de hoy, y al final la tendencia, los
// mejores complejos, deportes, zonas, usuarios y lo último que pasó.
// Todos los números salen de panelSuperAdmin.js: ninguno va a mano.
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { panelSuperAdmin } from '../../lib/panelSuperAdmin'
import { TIPO_BITACORA } from '../../lib/datos'
import { montoBs, miles } from '../../lib/dinero'
import { diaConFecha } from '../../lib/fecha'

const NIVEL = {
  grave: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Urgente' },
  aviso: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Pendiente' },
  info:  { color: '#00BCD4', bg: 'rgba(0,188,212,0.07)', label: 'Revisar' },
}
const ROL = { cliente: 'Clientes', admin_empresa: 'Administradores de complejo', empleado: 'Empleados', superadmin: 'Super admins' }
const coma = (n) => String(n).replace('.', ',')

/** ↑ 12% / ↓ 5% / «sin dato del mes pasado», con su color. */
function Cambio({ valor, texto = 'vs. el mes pasado a la fecha', antes }) {
  if (valor === null || valor === undefined) {
    return <span style={{ color: '#666' }}>• el mes pasado a esta fecha: {antes ?? 0}</span>
  }
  const sube = valor >= 0
  return (
    <span style={{ color: valor === 0 ? '#888' : sube ? '#22c55e' : '#ef4444' }}>
      {valor === 0 ? '＝' : sube ? '▲' : '▼'} {coma(Math.abs(valor))}% <span style={{ color: '#666' }}>{texto}</span>
    </span>
  )
}

function Seccion({ titulo, accion, onAccion, children, style }) {
  return (
    <div className="card" style={{ padding: 20, ...style }}>
      <div className="section-header" style={{ marginBottom: 14 }}>
        <h3 className="section-title" style={{ fontSize: '1rem' }}>{titulo}</h3>
        {accion && <button className="btn btn-ghost btn-sm" onClick={onAccion}>{accion}</button>}
      </div>
      {children}
    </div>
  )
}

/** Una barra horizontal con su nombre y su valor. */
function Barra({ nombre, valor, max, texto, color = '#f59e0b' }) {
  return (
    <div title={nombre + ': ' + texto}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{nombre}</span>
        <span style={{ fontSize: '0.8rem', color: '#f5f5f5', fontWeight: 700, whiteSpace: 'nowrap' }}>{texto}</span>
      </div>
      <div style={{ height: 6, background: '#262626', borderRadius: 4 }}>
        <div style={{ height: '100%', width: Math.max(2, (valor / Math.max(1, max)) * 100) + '%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  )
}

/** Un indicador de 0 a 100 %. */
function Medidor({ label, valor, sufijo = '%', bueno, nota, texto }) {
  const color = bueno === undefined ? '#00BCD4' : bueno ? '#22c55e' : '#f59e0b'
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>{label}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5' }}>{texto ?? (valor === null ? '—' : coma(valor) + sufijo)}</span>
      </div>
      {sufijo === '%' && valor !== null && texto === undefined && (
        <div style={{ height: 5, background: '#262626', borderRadius: 3 }}>
          <div style={{ height: '100%', width: Math.min(100, valor) + '%', background: color, borderRadius: 3 }} />
        </div>
      )}
      {nota && <p style={{ fontSize: '0.7rem', color: '#555', marginTop: 4 }}>{nota}</p>}
    </div>
  )
}

export default function DashboardSuperAdmin() {
  const navigate = useNavigate()
  // Se calcula DENTRO del componente: los datos llegan de Supabase después de
  // iniciar sesión, y una constante de módulo se quedaría con los vacíos.
  const P = panelSuperAdmin()
  const K = P.kpis
  const maxMes = Math.max(1, ...P.tendencia.map(t => t.ingresos))
  const verReporte = (id) => navigate('/superadmin/reportes?vista=complejo&complejo=' + encodeURIComponent(id))

  const TARJETAS = [
    { label: 'Ingresos de ' + P.labelMes, value: 'Bs. ' + montoBs(K.ingresosMes), icon: '💰',
      pie: <Cambio valor={K.ingresosCambio} antes={'Bs. ' + montoBs(K.ingresosPasadoHastaHoy)} />, onClick: () => navigate('/superadmin/reportes') },
    { label: 'Reservas confirmadas', value: miles(K.reservasMes), icon: '📅',
      pie: <Cambio valor={K.reservasCambio} antes={K.reservasPasadoHastaHoy} />, onClick: () => navigate('/superadmin/reservas') },
    { label: 'Usuarios', value: miles(K.usuarios), icon: '👥',
      pie: <span style={{ color: '#888' }}>+{K.nuevosMes} nuevos este mes</span>, onClick: () => navigate('/superadmin/usuarios') },
    { label: 'Complejos activos', value: K.complejosActivos, icon: '🏢',
      pie: <span style={{ color: '#888' }}>{K.canchasActivas} de {K.canchas} canchas habilitadas</span>, onClick: () => navigate('/superadmin/empresas') },
  ]

  return (
    <Layout role="superadmin">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>📊 Panel de la plataforma</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Sportika Cochabamba · {diaConFecha(P.hoy)} · todo lo que pasa en los {K.complejosActivos} complejos</p>
        </div>
      </div>

      {/* ── Lo que espera tu decisión ── */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 12 }}>🔔 Requiere tu atención</h3>
        {P.alertas.length === 0 ? (
          <p style={{ color: '#22c55e', fontSize: '0.88rem' }}>✅ Todo en orden: no hay nada pendiente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {P.alertas.map(a => {
              const n = NIVEL[a.nivel]
              return (
                <div key={a.clave} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px',
                  borderRadius: 8, background: n.bg, borderLeft: '3px solid ' + n.color, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.2rem' }}>{a.icono}</span>
                  <div style={{ flex: '1 1 240px' }}>
                    <span className="badge" style={{ color: n.color, background: 'rgba(0,0,0,0.25)', marginRight: 8, fontSize: '0.68rem' }}>{n.label}</span>
                    <span style={{ color: '#eee', fontSize: '0.86rem' }}>{a.texto}</span>
                    {a.detalle && (
                      <ul style={{ margin: '6px 0 0 18px', color: '#888', fontSize: '0.76rem' }}>
                        {a.detalle.slice(0, 4).map(d => <li key={d}>{d}</li>)}
                        {a.detalle.length > 4 && <li>y {a.detalle.length - 4} más</li>}
                      </ul>
                    )}
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(a.path)}>Ver</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Cómo va el mes ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {TARJETAS.map(s => (
          <button key={s.label} className="stat-card" onClick={s.onClick}
            style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change" style={{ fontSize: '0.74rem' }}>{s.pie}</div>
          </button>
        ))}
      </div>

      {/* ── Hoy ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Hoy en la plataforma</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {[
            ['Reservas', P.hoyDia.reservas, '📅'],
            ['Confirmadas', P.hoyDia.confirmadas, '✅'],
            ['Ingresos', 'Bs. ' + montoBs(P.hoyDia.ingresos), '💰'],
            ['Por revisar', P.hoyDia.porRevisar, '⏳'],
            ['Complejos con reservas', P.hoyDia.complejos, '🏟️'],
            ['Partidos abiertos', P.hoyDia.partidos, '⚽'],
            ['Torneos en curso', P.hoyDia.torneosEnCurso, '🏆'],
          ].map(([k, v, i]) => (
            <div key={k}>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f5f5f5' }}>{i} {v}</p>
              <p style={{ fontSize: '0.72rem', color: '#666' }}>{k}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-fila">
        {/* ── Tendencia ── */}
        <Seccion titulo="📈 Ingresos de los últimos 6 meses" accion="Reportes" onAccion={() => navigate('/superadmin/reportes')}>
          <div role="img" aria-label={'Ingresos por mes: ' + P.tendencia.map(t => t.label + ' Bs. ' + montoBs(t.ingresos)).join(', ')}
            style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 170, padding: '0 4px', borderBottom: '1px solid #2a2a2a' }}>
            {P.tendencia.map(t => {
              const alto = t.ingresos / maxMes * 100
              const destacar = t.enCurso || (t.ingresos === maxMes && t.ingresos > 0)
              return (
                <div key={t.mes} className="barra-mes" title={t.label + ': Bs. ' + montoBs(t.ingresos) + ' · ' + t.reservas + ' reservas confirmadas' + (t.enCurso ? ' (mes en curso)' : '')}
                  style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'default' }}>
                  {destacar && <span style={{ fontSize: '0.7rem', color: '#ccc', marginBottom: 4, whiteSpace: 'nowrap' }}>Bs. {montoBs(t.ingresos)}</span>}
                  <div style={{ width: '100%', maxWidth: 46, height: Math.max(alto, t.ingresos ? 3 : 1) + '%', borderRadius: '4px 4px 0 0',
                    background: t.enCurso ? '#f59e0b' : 'rgba(245,158,11,0.45)' }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '6px 4px 0' }}>
            {P.tendencia.map(t => (
              <span key={t.mes} style={{ flex: 1, textAlign: 'center', fontSize: '0.72rem', color: t.enCurso ? '#f59e0b' : '#777' }}>
                {t.label}<br /><span style={{ color: '#555' }}>{t.reservas} res.</span>
              </span>
            ))}
          </div>
          <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 10 }}>
            Reservas confirmadas que pagó un cliente. {P.labelMes} cuenta hasta hoy; el mes pasado cerró con Bs. {montoBs(K.ingresosMesPasado)}.
          </p>
        </Seccion>

        {/* ── Calidad del servicio ── */}
        <Seccion titulo={'🩺 Calidad del servicio (' + P.labelMes + ')'}>
          <Medidor label="Ocupación de las canchas" valor={P.calidad.ocupacion} nota="Horas vendidas frente a las que se podían vender" />
          <Medidor label="Clientes que no se presentaron" valor={P.calidad.noShow} bueno={P.calidad.noShow < 10} />
          <Medidor label="Reservas rechazadas o anuladas" valor={P.calidad.rechazo} bueno={P.calidad.rechazo < 15} />
          <Medidor label="Calificación promedio" valor={P.calidad.calificacion} sufijo=" ★"
            nota={P.calidad.resenas + ' reseñas en total'} />
          <Medidor label="Ingreso promedio por reserva" texto={'Bs. ' + montoBs(P.calidad.ticket)} />
        </Seccion>
      </div>

      <div className="panel-fila">
        {/* ── Ranking de complejos ── */}
        <Seccion titulo={'🏅 Complejos con más ingresos en ' + P.labelMes} accion="Comparar todos" onAccion={() => navigate('/superadmin/reportes')}>
          {P.ranking.length === 0 ? <p style={{ color: '#666', fontSize: '0.85rem' }}>Todavía no hay complejos aprobados.</p> : (
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>Complejo</th><th>Ingresos</th><th>Reservas</th><th>Cambio</th><th>Calif.</th><th></th></tr></thead>
                <tbody>
                  {P.ranking.slice(0, 6).map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: i === 0 && c.ingresos ? '#f59e0b' : '#666', fontWeight: 700 }}>{i === 0 && c.ingresos ? '🏆' : i + 1}</td>
                      <td>
                        <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.86rem' }}>{c.nombre}</p>
                        <p style={{ color: '#666', fontSize: '0.72rem' }}>{c.zona || 'Sin zona'} · {c.canchas} {c.canchas === 1 ? 'cancha' : 'canchas'}{c.estado !== 'activo' ? ' · ' + c.estado : ''}</p>
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap' }}>Bs. {montoBs(c.ingresos)}</td>
                      <td style={{ color: '#ccc' }}>{c.reservas}</td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: c.cambio === null ? '#555' : c.cambio >= 0 ? '#22c55e' : '#ef4444' }}>
                        {c.cambio === null ? '—' : (c.cambio >= 0 ? '▲ ' : '▼ ') + coma(Math.abs(c.cambio)) + '%'}
                      </td>
                      <td style={{ color: c.calificacion === null ? '#555' : c.calificacion < 3 ? '#ef4444' : '#f59e0b' }}>
                        {c.calificacion === null ? '—' : '★ ' + coma(c.calificacion)}
                      </td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => verReporte(c.id)}>📄 Reporte</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Seccion>

        {/* ── Deportes ── */}
        <Seccion titulo={'⚽ Lo más reservado en ' + P.labelMes}>
          {P.deportes.length === 0 ? <p style={{ color: '#666', fontSize: '0.85rem' }}>Sin reservas confirmadas este mes.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {P.deportes.slice(0, 6).map(d => (
                <Barra key={d.deporte} nombre={d.deporte} valor={d.reservas} max={P.deportes[0].reservas}
                  texto={d.reservas + ' · Bs. ' + montoBs(d.ingresos)} />
              ))}
            </div>
          )}
        </Seccion>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, marginBottom: 16 }}>
        {/* ── Empresas ── */}
        <Seccion titulo="🏢 Empresas" accion="Ver todas" onAccion={() => navigate('/superadmin/empresas')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            {[['Activas', P.empresas.activas, '#22c55e'], ['Por aprobar', P.empresas.pendientes, '#f59e0b'],
              ['Suspendidas', P.empresas.suspendidas, '#ef4444'], ['Rechazadas', P.empresas.rechazadas, '#888']].map(([k, v, c]) => (
              <div key={k} style={{ textAlign: 'center', padding: '8px 4px', background: '#1d1d1d', borderRadius: 8 }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: c }}>{v}</p>
                <p style={{ fontSize: '0.66rem', color: '#777' }}>{k}</p>
              </div>
            ))}
          </div>
          {P.empresas.listaPendientes.length > 0 && (
            <>
              <p style={{ fontSize: '0.74rem', color: '#888', marginBottom: 6 }}>Solicitudes por revisar (la más antigua primero)</p>
              {P.empresas.listaPendientes.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p style={{ color: '#f5f5f5', fontSize: '0.84rem', fontWeight: 600 }}>{e.nombre}</p>
                    <p style={{ color: '#666', fontSize: '0.72rem' }}>{e.admin} · pidió el {e.fechaSolicitud}</p>
                  </div>
                  <button className="btn btn-sm" onClick={() => navigate('/superadmin/empresas')}
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>Revisar</button>
                </div>
              ))}
            </>
          )}
        </Seccion>

        {/* ── Usuarios ── */}
        <Seccion titulo="👥 Quién usa Sportika" accion="Ver usuarios" onAccion={() => navigate('/superadmin/usuarios')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(P.usuarios.porRol).filter(([, n]) => n > 0).map(([rol, n]) => (
              <Barra key={rol} nombre={ROL[rol] || rol} valor={n} max={P.usuarios.total} texto={String(n)} color="#00BCD4" />
            ))}
          </div>
          <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 12 }}>
            {K.nuevosMes} se registraron en {P.labelMes}
            {K.nuevosCambio !== null && <> (<Cambio valor={K.nuevosCambio} texto="vs. el mes pasado" />)</>}
            {P.usuarios.suspendidos > 0 && <> · <span style={{ color: '#ef4444' }}>{P.usuarios.suspendidos} suspendidos</span></>}
          </p>
        </Seccion>

        {/* ── Zonas y torneos ── */}
        <Seccion titulo="🗺️ Zonas y torneos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {P.zonas.length === 0 ? <p style={{ color: '#666', fontSize: '0.85rem' }}>Sin complejos activos.</p>
              : P.zonas.slice(0, 5).map(z => (
                <Barra key={z.zona} nombre={z.zona} valor={z.complejos} max={P.zonas[0].complejos} color="#8b5cf6"
                  texto={z.complejos + (z.complejos === 1 ? ' complejo' : ' complejos') + ' · ' + z.canchas + (z.canchas === 1 ? ' cancha' : ' canchas')} />
              ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[['Con inscripciones', P.torneos.inscripciones], ['En curso', P.torneos.enCurso], ['Finalizados', P.torneos.finalizados]].map(([k, v]) => (
              <button key={k} onClick={() => navigate('/superadmin/torneos')} style={{ textAlign: 'center', padding: '8px 4px',
                background: '#1d1d1d', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f5f5f5' }}>🏆 {v}</p>
                <p style={{ fontSize: '0.66rem', color: '#777' }}>{k}</p>
              </button>
            ))}
          </div>
          <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 10 }}>⚽ {P.torneos.partidosAbiertos} partidos abiertos por jugarse</p>
        </Seccion>
      </div>

      {/* ── Lo último que pasó ── */}
      <Seccion titulo="📋 Lo último que pasó en los complejos" accion="Ver bitácora" onAccion={() => navigate('/superadmin/bitacora')}>
        {P.actividad.length === 0 ? <p style={{ color: '#666', fontSize: '0.85rem' }}>Todavía no hay movimientos.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {P.actividad.map(b => {
              const t = TIPO_BITACORA[b.tipo] || { icon: '•', color: '#888' }
              return (
                <div key={b.id} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1rem', width: 22, textAlign: 'center' }}>{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#eee', fontSize: '0.84rem' }}>
                      <strong>{b.empleado}</strong> <span style={{ color: '#aaa' }}>{b.accion.charAt(0).toLowerCase() + b.accion.slice(1)}</span>
                    </p>
                    <p style={{ color: '#666', fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.complejo}{b.detalle ? ' · ' + b.detalle : ''}
                    </p>
                  </div>
                  <span style={{ color: '#555', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{b.fecha} {b.hora}</span>
                </div>
              )
            })}
          </div>
        )}
      </Seccion>
    </Layout>
  )
}
