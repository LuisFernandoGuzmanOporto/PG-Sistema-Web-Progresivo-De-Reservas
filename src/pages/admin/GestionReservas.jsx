// GestionReservas.jsx
import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import VisorComprobante from '../../components/VisorComprobante'
import {
  reservasDeEmpresa, canchasDeEmpresa, EMPRESAS, BITACORA, SESION, USUARIO_ACTUAL, porRevisar,
} from '../../lib/datos'
import { resolverReserva, registrarEnBitacora } from '../../lib/guardar'
import { hoyBolivia, ahoraEnBolivia } from '../../lib/fecha'
import { montoBs } from '../../lib/dinero'


const ESTADO = {
  pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  rechazada:  { label: 'Rechazada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  // Pagó cuando ya se le había pasado el tiempo y otra persona tomó la hora
  vencida:    { label: 'Pago fuera de tiempo', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  // Quedó pendiente y su día ya pasó: nadie la revisó a tiempo
  pasada:     { label: 'Sin revisar · ya pasó', color: '#888', bg: 'rgba(255,255,255,0.06)' },
  // Se anuló después de pedirla, o era la jornada de un torneo que ya terminó
  cancelada:  { label: 'Anulada',    color: '#888', bg: 'rgba(255,255,255,0.06)' },
}

export function GestionReservas() {
  // Las mismas reservas que atiende el empleado en su panel
  const [reservas, setReservas]   = useState(reservasDeEmpresa(SESION.empresaId))
  const [filtro, setFiltro]       = useState('todas')
  const [comprobante, setComprob] = useState(null)
  const [aviso, setAviso]         = useState(null)

  const empresa = EMPRESAS.find(e => e.id === SESION.empresaId)
  const canchas = canchasDeEmpresa(SESION.empresaId)

  const avisar = (txt) => { setAviso(txt); setTimeout(() => setAviso(null), 3000) }

  /** Aprobar o rechazar deja rastro, igual que cuando lo hace un empleado. */
  const resolver = async (r, nuevoEstado) => {
    const g = await resolverReserva(r.id, nuevoEstado)
    if (g.error) { avisar('No se guardó el cambio. ' + g.error); return }

    setReservas(prev => prev.map(x => x.id === r.id
      ? { ...x, estado: nuevoEstado, atendidoPor: USUARIO_ACTUAL.nombre } : x))
    setComprob(null)

    const accion = nuevoEstado === 'confirmada' ? 'Confirmó una reserva' : 'Rechazó una reserva'
    const detalle = `${r.nro} · ${r.cliente} · ${r.cancha} ${r.horaInicio}`
    registrarEnBitacora({ tipo: 'reserva', accion, detalle })
    BITACORA.unshift({
      id: Date.now(), empresa_id: SESION.empresaId, empleado_id: 0, empleado: 'Administrador',
      tipo: 'reserva',
      accion: nuevoEstado === 'confirmada' ? 'Confirmó una reserva' : 'Rechazó una reserva',
      detalle: `${r.nro} · ${r.cliente} · ${r.cancha} ${r.horaInicio}`,
      ...ahoraEnBolivia(),
    })
    avisar(nuevoEstado === 'confirmada'
      ? `Reserva ${r.nro} confirmada. ${r.cliente} recibirá la notificación.`
      : `Reserva ${r.nro} rechazada.`)
  }

  // Las horas que ocupa un torneo son reservas en la base —asi la cancha queda
  // tomada de verdad— pero NO son reservas de un cliente: nadie las pidio,
  // nadie las paga y no hay comprobante que revisar. Iban mezcladas con las
  // demas: aparecian con el cliente en blanco, sumaban a «confirmadas» y su
  // monto entraba al ingreso, que era plata que nunca se cobro.
  // Las horas apartadas tampoco: el cliente todavía está pagando y no hay
  // comprobante que revisar (migraciones/038)
  const deClientes = reservas.filter(r => r.origen !== 'torneo' && r.estado !== 'apartada')
  const deTorneos  = reservas.filter(r => r.origen === 'torneo')

  // Una pendiente cuyo día ya pasó no es algo por revisar: va aparte. Antes
  // seguían en «Por revisar» reservas pendientes de hace meses.
  const hoy = hoyBolivia()
  const yaPaso = (r) => (r.fechaISO || '') < hoy
  const estadoDe = (r) => r.estado === 'pendiente' && yaPaso(r) ? 'pasada' : r.estado

  // El mismo criterio que la tarjeta «Pagos pendientes» del Dashboard
  const pendientes  = deClientes.filter(porRevisar)
  const pasadas     = deClientes.filter(r => estadoDe(r) === 'pasada')
  const confirmadas = deClientes.filter(r => r.estado === 'confirmada')
  const rechazadas  = deClientes.filter(r => r.estado === 'rechazada')
  const fueraDeTiempo = deClientes.filter(r => r.estado === 'vencida')
  const canceladas  = deClientes.filter(r => r.estado === 'cancelada')
  // «Hoy» es la fecha de la reserva, no cuándo se confirmó: antes contaba las
  // confirmadas de cualquier mes
  const confirmadasHoy = confirmadas.filter(r => r.fechaISO === hoy)

  // Primero lo que viene, de lo más cercano a lo más lejano; después lo que
  // ya pasó, de lo más reciente a lo más antiguo. Antes iban en el orden en
  // que llegaban de la base, y costaba encontrar una reserva.
  const ordenar = (lista) => [...lista].sort((a, b) => {
    const pa = yaPaso(a), pb = yaPaso(b)
    if (pa !== pb) return pa ? 1 : -1
    const ka = (a.fechaISO || '') + (a.horaInicio || '')
    const kb = (b.fechaISO || '') + (b.horaInicio || '')
    return pa ? kb.localeCompare(ka) : ka.localeCompare(kb)
  })

  const visibles = ordenar(filtro === 'todas'   ? deClientes
                         : filtro === 'torneos' ? deTorneos
                         : deClientes.filter(r => estadoDe(r) === filtro))

  // Ingreso de hoy: solo lo confirmado, y solo lo que pagó un cliente
  const ingresoConfirmado = confirmadasHoy.reduce((s, r) => s + r.monto, 0)

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>📅 Gestión de Reservas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>
            Revisa el comprobante y confirma las reservas de {empresa?.nombre}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-warning">{pendientes.length} pendientes</span>
          <span className="badge badge-success">{confirmadas.length} confirmadas</span>
        </div>
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>✓ {aviso}</p>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Por revisar',       value: pendientes.length,          icon: '⏳' },
          { label: 'Confirmadas hoy',   value: confirmadasHoy.length,      icon: '✅' },
          { label: 'Rechazadas',        value: rechazadas.length,          icon: '✕'  },
          { label: 'Ingreso de hoy',    value: 'Bs. ' + montoBs(ingresoConfirmado), icon: '💰' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          ['todas',      `Todas (${deClientes.length})`],
          ['pendiente',  `Por revisar (${pendientes.length})`],
          ['confirmada', `Confirmadas (${confirmadas.length})`],
          ['rechazada',  `Rechazadas (${rechazadas.length})`],
          ...(fueraDeTiempo.length ? [['vencida', `Pagos fuera de tiempo (${fueraDeTiempo.length})`]] : []),
          ...(pasadas.length ? [['pasada', `Sin revisar, ya pasadas (${pasadas.length})`]] : []),
          ['cancelada',  `Anuladas (${canceladas.length})`],
          ['torneos',    `🏆 Horas de torneo (${deTorneos.length})`],
        ].map(([k, label]) => (
          <button key={k} className={`tab ${filtro === k ? 'active' : ''}`} onClick={() => setFiltro(k)}>{label}</button>
        ))}
      </div>

      <div className="card">
        {visibles.length === 0 ? (
          <div className="empty-state">
            <p>No hay reservas en esta vista</p>
            {/* Una reserva confirmada no se borra desde la aplicación: se anula y
                queda aquí. Las que la bitácora marca como eliminadas las borraron
                las pruebas automáticas del sistema. */}
            {filtro === 'cancelada' && (
              <p style={{ color: '#555', fontSize: '0.8rem', marginTop: 6, maxWidth: 440, lineHeight: 1.5 }}>
                Aquí aparecen las reservas anuladas y las jornadas de torneos que terminaron antes de lo previsto.
              </p>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nº</th><th>Cliente</th><th>Cancha</th><th>Fecha</th><th>Hora</th>
                  <th>Monto</th><th>Comprobante</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#555', fontSize: '0.78rem' }}>{r.nro}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar">{r.torneo ? '🏆' : (r.cliente[0] || '?')}</div>
                        <div>
                          <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.86rem' }}>
                            {r.torneo || r.cliente}
                          </p>
                          <p style={{ color: '#555', fontSize: '0.72rem' }}>
                            {r.torneo ? 'Jornada del torneo' : r.telefono}
                          </p>
                        </div>
                        {r.origen === 'presencial' && (
                          <span style={{ fontSize: '0.64rem', color: '#8b5cf6', fontWeight: 700 }}>PRESENCIAL</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.cancha}</td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.fecha}</td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.horaInicio}-{r.horaFin}</td>
                    {/* La hora de torneo no se cobra: poner un monto ahi hacia
                        pensar que era plata cobrada */}
                    <td style={{ color: r.torneo ? '#555' : '#f59e0b', fontWeight: 700 }}>
                      {r.torneo ? '—' : 'Bs. ' + montoBs(r.monto)}
                      {/* Sin esto el complejo veia una reserva mas barata que
                          las demas y no sabia por que */}
                      {r.codigoDescuento && (
                        <p style={{ color: '#22c55e', fontSize: '0.66rem', fontWeight: 600, marginTop: 2 }}>
                          canje {r.codigoDescuento}
                        </p>
                      )}
                    </td>
                    <td>
                      {/* En la reserva de mostrador se paga en efectivo: no hay
                          comprobante que falte */}
                      {r.comprobante
                        ? <button className="btn btn-ghost btn-sm" onClick={() => setComprob(r)}>📎 Ver</button>
                        : r.torneo
                          ? <span style={{ color: '#555', fontSize: '0.76rem' }}>No corresponde</span>
                          : r.origen === 'presencial'
                            ? <span style={{ color: '#8b5cf6', fontSize: '0.76rem' }}>Efectivo</span>
                            : <span style={{ color: '#ef4444', fontSize: '0.76rem' }}>Sin comprobante</span>}
                    </td>
                    <td>
                      <span className="badge" style={{ background: (ESTADO[estadoDe(r)] || ESTADO.cancelada).bg, color: (ESTADO[estadoDe(r)] || ESTADO.cancelada).color }}>
                        {(ESTADO[estadoDe(r)] || ESTADO.cancelada).label}
                      </span>
                    </td>
                    <td>
                      {r.torneo ? (
                        <span style={{ color: '#555', fontSize: '0.75rem' }}>Cancha tomada</span>
                      ) : r.estado === 'pendiente' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => resolver(r, 'confirmada')}>✓ Aprobar</button>
                          <button className="btn btn-outline btn-sm" onClick={() => resolver(r, 'rechazada')}>✕</button>
                        </div>
                      ) : r.estado === 'vencida' ? (
                        <span style={{ color: '#a855f7', fontSize: '0.75rem' }}>Devolver el pago u ofrecer otra hora</span>
                      ) : (
                        <span style={{ color: '#555', fontSize: '0.75rem' }}>{r.atendidoPor || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 14 }}>
        🧾 Tus empleados con el permiso «Confirmar reservas» ven esta misma lista desde su panel,
        y cada acción queda registrada en la bitácora.
      </p>

      {/* Modal comprobante */}
      {comprobante && (
        <div className="modal-overlay" onClick={() => setComprob(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Comprobante de pago</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>{comprobante.nro} · {comprobante.cliente}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setComprob(null)}>✕</button>
            </div>
            <VisorComprobante ruta={comprobante.comprobante} />
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: '0.72rem', color: '#666' }}>El cliente dice haber pagado</p>
              <p style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>Bs. {montoBs(comprobante.monto)}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                ['Cancha', comprobante.cancha],
                ['Precio de lista', 'Bs. ' + montoBs(canchas.find(c => c.nombre === comprobante.cancha)?.precio)],
                ['Fecha', comprobante.fecha],
                ['Horario', comprobante.horaInicio + ' - ' + comprobante.horaFin],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: 2 }}>{k}</p>
                  <p style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600 }}>{v}</p>
                </div>
              ))}
            </div>
            {comprobante.estado === 'vencida' && (
              <p style={{ color: '#a855f7', fontSize: '0.8rem', lineHeight: 1.5, padding: '10px 12px', marginBottom: 14,
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }}>
                El cliente pagó cuando ya se le había terminado el tiempo para hacerlo, y otra persona tomó la hora. Su comprobante queda aquí como prueba del pago: devuélvele el dinero u ofrécele otra hora.
              </p>
            )}
            {comprobante.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => resolver(comprobante, 'rechazada')}>Rechazar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => resolver(comprobante, 'confirmada')}>Confirmar pago</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default GestionReservas
