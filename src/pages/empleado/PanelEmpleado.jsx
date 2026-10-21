import { useState, useEffect } from 'react'
import { digitosDe, esTelefono } from '../../lib/validaciones'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import VisorComprobante from '../../components/VisorComprobante'
import { CalendarioMostrador, ResumenDelDia } from './AgendaMostrador'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import {
  EMPLEADO_ACTUAL, PERMISOS_EMPLEADO, puede, empresaPorId, BITACORA,
  reservasDeEmpresa, canjesDeEmpresa, canchasDeEmpresa, CANJES, RESERVAS_EMPRESA,
  entrenamientosDeEmpresa, torneosDeEmpresa,
} from '../../lib/datos'
import { agendaDelDia, franjaDeCancha, horasLibres, hoyISO, fechaLegible,
         finDeFranja } from '../../lib/agenda'
import {
  resolverReserva as guardarEstadoReserva, marcarAsistencia as guardarAsistencia,
  entregarCanje as guardarEntrega, cambiarEstadoCancha, guardarReservaPresencial,
  registrarEnBitacora,
} from '../../lib/guardar'
import { subirComprobante, urlPublica } from '../../lib/archivos'
import { recargarHorarios } from '../../lib/carga'

const ESTADO_RESERVA = {
  pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  rechazada:  { label: 'Rechazada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  // Pagó cuando ya se le había pasado el tiempo y otra persona tomó la hora
  vencida:    { label: 'Pago fuera de tiempo', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
}

const hora = () => new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function PanelEmpleado() {
  const navigate = useNavigate()

  // El empleado es siempre el que inicio sesion. Antes habia un selector para
  // cambiar de empleado, util cuando no existia el login; ahora seria un
  // agujero: permitiria usar los permisos de un companero.
  const empleado = EMPLEADO_ACTUAL
  const empresa  = empresaPorId(empleado.empresa_id)

  // Sin las jornadas de torneo: ocupan la cancha pero no son una reserva que
  // haya que atender. Nadie las pidio, no hay comprobante y no se cobran. En
  // el mostrador aparecian mezcladas con las de los clientes, con el nombre en
  // blanco y un monto que nadie iba a pagar.
  // Tampoco las horas apartadas: el cliente todavía está pagando y no hay
  // comprobante que revisar. Se ven en la agenda del mostrador, como ocupadas.
  const [reservas, setReservas]   = useState(
    reservasDeEmpresa(empleado.empresa_id).filter(r => r.origen !== 'torneo' && r.estado !== 'apartada'))
  const [canjes, setCanjes]       = useState(canjesDeEmpresa(empleado.empresa_id))
  const [canchas, setCanchas]     = useState(canchasDeEmpresa(empleado.empresa_id))
  const [registro, setRegistro]   = useState([])   // lo que este empleado hizo en el turno
  const [aviso, setAviso]         = useState(null)
  const [comprobante, setComprob] = useState(null)

  // Formulario de reserva presencial
  const [form, setForm] = useState({ cliente: '', telefono: '', cancha: '' })

  // Como paga el que vino al mostrador. En efectivo no hay nada que guardar;
  // con QR el empleado le saca una foto al comprobante y va con la reserva,
  // igual que el que reserva desde la app.
  const [pago, setPago]                 = useState('efectivo')
  const [compNombre, setCompNombre]     = useState('')
  const [compRuta, setCompRuta]         = useState(null)
  const [subiendoComp, setSubiendoComp] = useState(false)
  // En efectivo: cuánto entrega el cliente, para calcular el vuelto
  const [recibido, setRecibido]         = useState('')
  // La constancia de la última reserva registrada, para mostrársela al cliente
  const [constancia, setConstancia]     = useState(null)

  const elegirComprobante = async (archivo) => {
    if (!archivo) return
    setErrorReserva(null)
    setCompNombre(archivo.name)
    setCompRuta(null)
    setSubiendoComp(true)
    const r = await subirComprobante({ carpeta: empleado.empresa_id + '/reservas', archivo })
    setSubiendoComp(false)
    if (r.error) { setErrorReserva(r.error); setCompNombre(''); return }
    setCompRuta(r.ruta)
  }

  // Que dia y que horas se estan mirando en el mostrador. Antes solo se podia
  // reservar para hoy y a ciegas: el empleado no veia si la hora estaba tomada.
  const [fechaPresencial, setFechaPresencial] = useState(hoyISO())
  const [slotsElegidos, setSlotsElegidos]     = useState([])

  const canchaPresencial = canchas.find(c => c.nombre === form.cancha)
  const canchasActivas   = canchas.filter(c => c.disponible)
  const montoPresencial  = slotsElegidos.length * (canchaPresencial?.precio ?? 0)
  const recibidoNum      = Number(String(recibido).replace(',', '.'))
  const vuelto           = recibido !== '' && Number.isFinite(recibidoNum) ? recibidoNum - montoPresencial : null

  // Mientras el mostrador está abierto, la agenda se vuelve a mirar cada 20
  // segundos: si un cliente aparta una hora desde la app, aquí se ve tomada
  const [, setVersionAgenda] = useState(0)
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      const r = await recargarHorarios(empleado.empresa_id)
      if (!r.error) setVersionAgenda(v => v + 1)
    }, 20000)
    return () => clearInterval(t)
  }, [empleado.empresa_id])

  const agendaPresencial = canchaPresencial
    ? agendaDelDia(empleado.empresa_id, canchaPresencial.id, fechaPresencial)
    : []

  const sinHorasLibres = Boolean(canchaPresencial) &&
    agendaPresencial.length > 0 &&
    !agendaPresencial.some(f => f.estado === 'libre')

  /** El primer dia con lugar, para no dejar al cliente sin respuesta. */
  const proximoDiaLibre = (() => {
    if (!sinHorasLibres || !canchaPresencial) return null
    const base = new Date(fechaPresencial + 'T12:00:00')
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
        '-' + String(d.getDate()).padStart(2, '0')
      if (horasLibres(empleado.empresa_id, canchaPresencial.id, iso).length) return iso
    }
    return null
  })()

  // Solo aparecen las pestanas de los permisos que el administrador le activo
  const tabs = PERMISOS_EMPLEADO.filter(p => puede(empleado, p.key))
  const [tabElegida, setTab] = useState(null)
  const tab = tabs.some(t => t.key === tabElegida) ? tabElegida : (tabs[0]?.key || null)

  /** Toda accion pasa por aqui: se registra y el administrador la ve en la bitacora. */
  const registrar = (tipo, accion, detalle) => {
    const ahora = hora()
    setRegistro(prev => [{ id: Date.now(), tipo, accion, detalle, hora: ahora }, ...prev])
    // La misma linea va a la bitacora que revisa el administrador
    BITACORA.unshift({
      id: Date.now(), empresa_id: empleado.empresa_id,
      empleado_id: empleado.id, empleado: empleado.nombre,
      tipo, accion, detalle,
      fecha: new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
      hora: ahora,
    })
    registrarEnBitacora({ tipo, accion, detalle })
    setAviso(accion + ' — registrado en la bitácora')
    setTimeout(() => setAviso(null), 3000)
  }

  const resolverReserva = async (r, nuevoEstado) => {
    const g = await guardarEstadoReserva(r.id, nuevoEstado)
    if (g.error) { setAviso('No se guardó el cambio. ' + g.error); return }

    setReservas(prev => prev.map(x => x.id === r.id
      ? { ...x, estado: nuevoEstado, atendidoPor: empleado.nombre } : x))
    setComprob(null)
    registrar('reserva',
      nuevoEstado === 'confirmada' ? 'Confirmó una reserva' : 'Rechazó una reserva',
      `${r.nro} · ${r.cliente} · ${r.cancha} ${r.horaInicio}`)
  }

  const marcarAsistencia = async (r, valor) => {
    const g = await guardarAsistencia(r.id, valor)
    if (g.error) { setAviso('No se guardó el cambio. ' + g.error); return }

    setReservas(prev => prev.map(x => x.id === r.id ? { ...x, asistencia: valor } : x))
    registrar('asistencia',
      valor === 'presente' ? 'Marcó asistencia' : 'Marcó inasistencia',
      `${r.nro} · ${r.cliente}${valor === 'ausente' ? ' no se presentó' : ''}`)
  }

  const entregarCanje = async (c) => {
    const g = await guardarEntrega(c.id)
    if (g.error) { setAviso('No se guardó el cambio. ' + g.error); return }

    // Se marca en el registro compartido: el administrador lo ve igual
    // (quién y cuándo lo anota la base; aquí se muestra lo mismo sin recargar)
    const entrega = { estado: 'entregado', entregadoPor: empleado.nombre, entregadoEl: new Date().toISOString() }
    const real = CANJES.find(x => x.id === c.id)
    if (real) Object.assign(real, entrega)
    setCanjes(prev => prev.map(x => x.id === c.id ? { ...x, ...entrega } : x))
    registrar('recompensa', 'Entregó una recompensa', `${c.codigo} · ${c.recompensa} (${c.puntos} pts) · ${c.cliente}`)
  }

  const alternarCancha = async (cancha, motivo) => {
    const g = await cambiarEstadoCancha(cancha.id, !cancha.disponible)
    if (g.error) { setAviso('No se guardó el cambio. ' + g.error); return }

    setCanchas(prev => prev.map(x => x.id === cancha.id ? { ...x, disponible: !x.disponible } : x))
    registrar('cancha',
      cancha.disponible ? 'Marcó una cancha fuera de servicio' : 'Habilitó una cancha',
      cancha.nombre + (cancha.disponible && motivo ? ' · ' + motivo : ''))
  }

  const [errorReserva, setErrorReserva] = useState(null)
  const [intentoReserva, setIntentoReserva] = useState(false)
  const erroresReserva = {}
  {
    const digitos = digitosDe(form.telefono)
    if (!form.cliente.trim()) erroresReserva.cliente = 'Escribe el nombre del cliente que hace la reserva.'
    else if (form.cliente.trim().length < 3) erroresReserva.cliente = 'El nombre es muy corto: escribe nombre y apellido.'
    if (form.telefono.trim() && !esTelefono(form.telefono))
      erroresReserva.telefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}). Déjalo vacío si el cliente no lo da.`
    if (pago === 'qr' && !compRuta) erroresReserva.comprobante = 'Falta la foto del comprobante de la transferencia. Tómala o cambia el pago a efectivo.'
    if (pago === 'efectivo' && recibido !== '' && (!Number.isFinite(recibidoNum) || recibidoNum < montoPresencial))
      erroresReserva.recibido = `El cliente entrega menos de lo que cuesta: faltan Bs. ${Math.max(0, montoPresencial - (recibidoNum || 0))}. Déjalo vacío si paga justo.`
  }
  const ORDEN_RESERVA = ['cliente', 'telefono', 'recibido', 'comprobante']

  /** Dos reservas no pueden pisarse en la misma cancha y franja horaria. */
  /**
   * Registra la reserva del que llego al mostrador.
   *
   * Ya no hace falta comprobar choques a mano: las horas se eligen de la
   * agenda, que solo deja tocar las libres. Igual se vuelve a mirar antes de
   * guardar, por si alguien reservo esa misma hora desde la app mientras el
   * empleado llenaba el formulario.
   */
  const guardarPresencial = async () => {
    setErrorReserva(null)
    if (!canchaPresencial)     { setErrorReserva('Elige la cancha en la que se va a jugar.'); return }
    if (!slotsElegidos.length) { setErrorReserva('Elige al menos una hora libre en la agenda.'); return }
    setIntentoReserva(true)
    if (Object.keys(erroresReserva).length) { irAlPrimerError(erroresReserva, ORDEN_RESERVA); return }

    const slots   = [...slotsElegidos].sort()
    const tomada  = slots.find(s =>
      franjaDeCancha(empleado.empresa_id, canchaPresencial.id, fechaPresencial, s).estado !== 'libre')
    if (tomada) {
      setErrorReserva(`La hora de las ${tomada} se acaba de ocupar desde la app. La quitamos de tu selección: elige otra.`)
      setSlotsElegidos(prev => prev.filter(s => s !== tomada))
      return
    }

    const horaInicio = slots[0]
    const horaFin    = finDeFranja(slots[slots.length - 1])
    const monto      = slots.length * (canchaPresencial.precio ?? 0)

    const g = await guardarReservaPresencial({
      empresaId: empleado.empresa_id, canchaId: canchaPresencial.id,
      nombre: form.cliente.trim(), telefono: form.telefono.trim(),
      fecha: fechaPresencial, horaInicio, horaFin, monto,
      comprobante: pago === 'qr' ? compRuta : null,
    })
    if (g.error) { setErrorReserva(g.error); return }

    const nueva = {
      id: g.reserva.id, nro: g.reserva.nro,
      empresa_id: empleado.empresa_id, cliente: form.cliente, telefono: form.telefono,
      cancha: canchaPresencial.nombre,
      fecha: fechaPresencial === hoyISO() ? 'Hoy' : fechaPresencial,
      fechaISO: fechaPresencial,
      horaInicio, horaFin, monto, estado: 'confirmada',
      comprobante: pago === 'qr' ? compRuta : null,
      asistencia: null, origen: 'presencial', atendidoPor: empleado.nombre,
    }
    // Se suma a la lista compartida para que la agenda la muestre ocupada ya
    RESERVAS_EMPRESA.push(nueva)
    setReservas(prev => [nueva, ...prev])
    registrar('reserva', 'Registro una reserva presencial',
      nueva.nro + ' · ' + nueva.cliente + ' · ' + nueva.cancha + ' ' +
      horaInicio + '-' + horaFin + ' · Bs. ' + monto +
      (pago === 'qr' ? ' por QR, con comprobante' : ' en efectivo'))
    setConstancia({
      nro: nueva.nro, cliente: nueva.cliente.trim(), telefono: form.telefono.trim(),
      cancha: nueva.cancha, fecha: fechaLegible(fechaPresencial), horaInicio, horaFin,
      horas: slots.length, monto, pago,
      recibido: pago === 'efectivo' && recibido !== '' ? recibidoNum : null,
      vuelto: pago === 'efectivo' && recibido !== '' ? recibidoNum - monto : null,
      atendio: empleado.nombre, complejo: empresa?.nombre || '',
    })
    setForm({ cliente: '', telefono: '', cancha: form.cancha })
    setIntentoReserva(false)
    setSlotsElegidos([])
    setPago('efectivo'); setCompNombre(''); setCompRuta(null); setRecibido('')
  }

  // La mesa tecnica solo aplica a los torneos que organiza el complejo:
  // si lo armo un cliente, la mesa la maneja el propio organizador.
  const enCurso        = torneosDeEmpresa(empleado.empresa_id).filter(t => t.estado === 'en_curso')
  const mesaHabilitada = enCurso.filter(t => t.creador_tipo === 'complejo')
  const mesaDeClientes = enCurso.filter(t => t.creador_tipo !== 'complejo')

  const pendientes  = reservas.filter(r => r.estado === 'pendiente')
  const confirmadas = reservas.filter(r => r.estado === 'confirmada')
  // Un canje esperando ser entregado esta en estado 'disponible':
  // el cliente ya tiene el codigo pero todavia no retiro el premio.
  const canjesPend  = canjes.filter(c => c.estado === 'disponible')

  // Cuenta dada de baja: no puede operar nada
  if (!empleado.activo) {
    return (
      <Layout role="empleado">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Cuenta desactivada</h3>
          <p>Tu cuenta fue dada de baja por el administrador del complejo. Contáctalo para reactivarla.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="empleado">
      {/* Cabecera */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(0,188,212,0.06) 100%)', border: '1px solid #2a2a2a', borderRadius: 20, padding: 24, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.9rem', color: '#f5f5f5', marginBottom: 2 }}>
            Hola, {empleado.nombre.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>
            {empresa?.emoji} {empresa?.nombre}
            {empleado.turno ? ' · Turno ' + empleado.turno : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge badge-warning">{pendientes.length} reservas por revisar</span>
          {puede(empleado, 'recompensas') && <span className="badge badge-success">{canjesPend.length} canjes por entregar</span>}
        </div>
      </div>

      {/* Aviso de bitacora */}
      <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, marginBottom: 20 }}>
        <p style={{ color: '#a78bfa', fontSize: '0.82rem' }}>
          🧾 Todo lo que registres aquí queda guardado con tu nombre y la hora. El administrador lo revisa en la bitácora.
        </p>
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>✓ {aviso}</p>
        </div>
      )}

      {tabs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔑</div>
          <h3>Sin permisos asignados</h3>
          <p>El administrador todavía no te activó ninguna función. Pídele que te habilite las que necesitas.</p>
        </div>
      ) : (
        <>
          <div className="tabs" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ══ CONFIRMAR RESERVAS ══ */}
          {tab === 'reservas_confirmar' && (
            <div className="card">
              <div style={{ padding: 18, borderBottom: '1px solid #2a2a2a' }}>
                {/* Decia «de hoy» y listaba todas las del complejo, de
                    cualquier fecha. Las que hay que atender primero son las
                    pendientes, y esas van arriba. */}
                <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>Reservas del complejo</h3>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>
                  {pendientes.length > 0
                    ? 'Primero las ' + pendientes.length + ' que esperan revisión. Abre el comprobante antes de confirmar.'
                    : 'No queda ninguna esperando revisión.'}
                </p>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Nº</th><th>Cliente</th><th>Cancha</th><th>Hora</th><th>Monto</th><th>Comprobante</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {[...reservas]
                      .sort((a, b) => (a.estado === 'pendiente' ? 0 : 1) - (b.estado === 'pendiente' ? 0 : 1))
                      .map(r => (
                      <tr key={r.id}>
                        <td style={{ color: '#555', fontSize: '0.78rem' }}>{r.nro}</td>
                        <td>
                          <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{r.cliente}</span>
                          {r.origen === 'presencial' && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#8b5cf6', fontWeight: 700 }}>PRESENCIAL</span>}
                        </td>
                        <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.cancha}</td>
                        <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.horaInicio} - {r.horaFin}</td>
                        <td style={{ color: '#f59e0b', fontWeight: 700 }}>
                        Bs. {r.monto}
                        {/* De donde sale el precio mas bajo */}
                        {r.codigoDescuento && (
                          <p style={{ color: '#22c55e', fontSize: '0.66rem', fontWeight: 600, marginTop: 2 }}>
                            canje {r.codigoDescuento}
                          </p>
                        )}
                      </td>
                        <td>
                          {/* La reserva de mostrador se cobra en efectivo: ahi no
                              falta ningun comprobante, no hubo transferencia */}
                          {r.comprobante
                            ? <button className="btn btn-ghost btn-sm" onClick={() => setComprob(r)}>📎 Ver</button>
                            : r.origen === 'presencial'
                              ? <span style={{ color: '#8b5cf6', fontSize: '0.78rem' }}>Efectivo</span>
                              : <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>Sin comprobante</span>}
                        </td>
                        <td>
                          <span className="badge" style={{ background: ESTADO_RESERVA[r.estado].bg, color: ESTADO_RESERVA[r.estado].color }}>
                            {ESTADO_RESERVA[r.estado].label}
                          </span>
                        </td>
                        <td>
                          {r.estado === 'pendiente' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-primary btn-sm" onClick={() => resolverReserva(r, 'confirmada')}>Confirmar</button>
                              <button className="btn btn-outline btn-sm" onClick={() => resolverReserva(r, 'rechazada')}>Rechazar</button>
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
            </div>
          )}

          {/* ══ RESERVA PRESENCIAL ══ */}
          {tab === 'reservas_crear' && (
            <div className="card" style={{ padding: 20, maxWidth: 660 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 4 }}>Reserva presencial</h3>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 18 }}>
                Para el cliente que llega al complejo sin usar la app. Mira qué horas
                quedan libres, elige las que quiera y cóbrale en efectivo o con el QR
                del complejo.
              </p>

              {/* La cancha, con su precio, como en la reserva de la app */}
              <label className="form-label">Cancha</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0 14px' }}>
                {canchasActivas.map(c => {
                  const activa = form.cancha === c.nombre
                  return (
                    <button key={c.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, cancha: c.nombre })); setSlotsElegidos([]) }}
                      style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit',
                        textAlign: 'center', lineHeight: 1.3,
                        background: activa ? 'rgba(0,188,212,0.15)' : '#1a1a1a',
                        border: '1px solid ' + (activa ? '#00BCD4' : '#2a2a2a') }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: activa ? '#00BCD4' : '#ccc' }}>{c.nombre}</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: activa ? '#00BCD4' : '#777' }}>Bs. {c.precio}/hora</span>
                    </button>
                  )
                })}
                {canchasActivas.length === 0 && (
                  <p style={{ color: '#f59e0b', fontSize: '0.8rem' }}>No hay canchas habilitadas en este momento.</p>
                )}
              </div>

              {/* El mes completo: qué días tienen lugar, de la cancha elegida o de todas */}
              <label className="form-label">
                Día {canchaPresencial ? '· ' + canchaPresencial.nombre : '· todas las canchas'}
              </label>
              <div style={{ marginTop: 6 }}>
                <CalendarioMostrador empresaId={empleado.empresa_id}
                  canchas={canchaPresencial ? [canchaPresencial] : canchasActivas}
                  fecha={fechaPresencial}
                  onElegir={iso => { setFechaPresencial(iso); setSlotsElegidos([]) }} />
              </div>

              {/* Entrenamientos y torneos de ese día, en todas las canchas */}
              <ResumenDelDia empresaId={empleado.empresa_id} canchas={canchasActivas} fecha={fechaPresencial} />

              {!canchaPresencial ? (
                <p style={{ color: '#666', fontSize: '0.84rem', marginBottom: 16 }}>
                  Elige una cancha para ver sus horas libres ese día.
                </p>
              ) : (
                <>
                  <p style={{ color: '#f59e0b', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', marginBottom: 8 }}>
                    {canchaPresencial.nombre} · {fechaLegible(fechaPresencial)}
                  </p>

                  {/* La misma agenda que ve el cliente en su app */}
                  <div style={{ border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                    {agendaPresencial.map(f => {
                      const elegido = slotsElegidos.includes(f.slot)
                      const libre   = f.estado === 'libre'
                      const look = elegido                     ? { linea: '#00BCD4', fondo: 'rgba(0,188,212,0.10)', texto: '#00BCD4' }
                        : f.estado === 'entrenamiento'         ? { linea: '#8b5cf6', fondo: 'rgba(139,92,246,0.07)', texto: '#a78bfa' }
                        : f.estado === 'torneo'                ? { linea: '#8B0000', fondo: 'rgba(139,0,0,0.10)',    texto: '#ff6b6b' }
                        : f.estado === 'torneo_pendiente'      ? { linea: '#8B0000', fondo: 'rgba(139,0,0,0.05)',    texto: '#c96' }
                        : f.estado === 'apartada'              ? { linea: '#fb923c', fondo: 'rgba(251,146,60,0.07)', texto: '#fb923c' }
                        : f.estado === 'pendiente'             ? { linea: '#f59e0b', fondo: 'rgba(245,158,11,0.06)', texto: '#f59e0b' }
                        : f.estado === 'ocupada'               ? { linea: '#ef4444', fondo: 'rgba(239,68,68,0.05)',  texto: '#ef4444' }
                        :                                        { linea: '#2a2a2a', fondo: 'transparent',           texto: '#f5f5f5' }

                      return (
                        <button key={f.slot} disabled={!libre}
                          onClick={() => setSlotsElegidos(prev => prev.includes(f.slot)
                            ? prev.filter(s => s !== f.slot) : [...prev, f.slot])}
                          style={{ width: '100%', display: 'flex', alignItems: 'stretch', textAlign: 'left',
                            background: look.fondo, border: 'none', borderTop: '1px solid #1e1e1e',
                            cursor: libre ? 'pointer' : 'default', fontFamily: 'Outfit', padding: 0 }}>
                          <span style={{ width: 62, flexShrink: 0, padding: '11px 0 11px 14px',
                            fontSize: '0.78rem', fontWeight: 600, color: '#666' }}>{f.slot}</span>
                          <span style={{ width: 3, background: look.linea, flexShrink: 0 }} />
                          <span style={{ flex: 1, padding: '9px 14px', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <span>
                              <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: look.texto }}>
                                {elegido ? '✓ Elegida' : libre ? 'Libre' : f.titulo}
                              </span>
                              {f.detalle && !libre && !elegido && (
                                <span style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginTop: 1 }}>
                                  {f.detalle}
                                </span>
                              )}
                            </span>
                            {libre && !elegido && (
                              <span style={{ fontSize: '0.74rem', color: '#555' }}>Bs. {canchaPresencial.precio}</span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Si ese día no hay lugar, ofrecer el siguiente que sí */}
                  {sinHorasLibres && (
                    <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, marginBottom: 14 }}>
                      <p style={{ color: '#f59e0b', fontSize: '0.83rem', fontWeight: 600, marginBottom: 4 }}>
                        Ese día está completo
                      </p>
                      <p style={{ color: '#888', fontSize: '0.78rem' }}>
                        {proximoDiaLibre
                          ? <>El primer día con lugar es el <strong style={{ color: '#f5f5f5' }}>{fechaLegible(proximoDiaLibre)}</strong>.{' '}
                              <button onClick={() => { setFechaPresencial(proximoDiaLibre); setSlotsElegidos([]) }}
                                style={{ background: 'none', border: 'none', color: '#00BCD4', fontFamily: 'Outfit',
                                  fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                                Ver ese día
                              </button></>
                          : 'Prueba con otra cancha o más adelante.'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Los datos del cliente, recién cuando ya eligió horario */}
              {slotsElegidos.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Nombre del cliente *</label>
                      <input className="input" value={form.cliente} placeholder="Ej: Carlos Mamani"
                        onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                        {...propsCampo('cliente', erroresReserva.cliente, intentoReserva)} />
                      <MensajeCampo nombre="cliente" error={erroresReserva.cliente} mostrar={intentoReserva} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input className="input" inputMode="tel" value={form.telefono} placeholder="Ej: 70012345"
                        onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                        {...propsCampo('telefono', erroresReserva.telefono, intentoReserva)} />
                      <MensajeCampo nombre="telefono" error={erroresReserva.telefono} mostrar={intentoReserva} />
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>
                      <span>{[...slotsElegidos].sort().join(', ')}</span>
                      <span>{slotsElegidos.length} hora{slotsElegidos.length > 1 ? 's' : ''}</span>
                    </div>
                    <p style={{ color: '#f59e0b', fontSize: '0.95rem', fontWeight: 700 }}>
                      A cobrar: Bs. {slotsElegidos.length * (canchaPresencial?.precio ?? 0)}
                    </p>
                  </div>

                  {/* Como paga el que esta en el mostrador */}
                  <div className="form-group">
                    <label className="form-label">¿Cómo paga?</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      {[['efectivo', '💵 Efectivo'], ['qr', '🔲 QR o transferencia']].map(([k, txt]) => (
                        <button key={k} type="button"
                          onClick={() => { setPago(k); setErrorReserva(null) }}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                            fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.82rem',
                            background: pago === k ? 'rgba(0,188,212,0.15)' : '#1a1a1a',
                            border: '1px solid ' + (pago === k ? '#00BCD4' : '#2a2a2a'),
                            color: pago === k ? '#00BCD4' : '#888' }}>
                          {txt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {pago === 'efectivo' && (
                    <div className="form-group">
                      <label className="form-label">¿Con cuánto paga? (opcional)</label>
                      <input className="input" inputMode="decimal" value={recibido}
                        placeholder={'Ej: ' + (Math.ceil(montoPresencial / 50) * 50 || 50)}
                        onChange={e => setRecibido(e.target.value.replace(/[^0-9.,]/g, ''))}
                        {...propsCampo('recibido', erroresReserva.recibido, intentoReserva)} />
                      <MensajeCampo nombre="recibido" error={erroresReserva.recibido} mostrar={intentoReserva} />
                      {vuelto !== null && vuelto >= 0 && (
                        <p style={{ marginTop: 6, fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>
                          {vuelto === 0 ? 'Paga justo, sin vuelto.' : 'Vuelto a entregar: Bs. ' + vuelto}
                        </p>
                      )}
                      {vuelto !== null && vuelto < 0 && !intentoReserva && (
                        <p style={{ marginTop: 6, fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>
                          Faltan Bs. {-vuelto} para cubrir el total.
                        </p>
                      )}
                    </div>
                  )}

                  {pago === 'qr' && (
                    <div style={{ padding: 14, border: '1px solid #2a2a2a', borderRadius: 12, marginBottom: 14 }}>
                      {/* El mismo QR del complejo que ve el que reserva por la app.
                          Se lo mostras en la pantalla para que lo escanee. */}
                      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 10, textAlign: 'center' }}>
                        {empresa?.qrPago
                          ? 'Muéstrale esta pantalla al cliente para que escanee el QR'
                          : 'Tu complejo todavía no cargó su QR'}
                      </p>

                      {empresa?.qrPago ? (
                        <div style={{ width: 170, height: 170, margin: '0 auto 12px', background: '#fff',
                          borderRadius: 12, padding: 6, border: '2px dashed rgba(34,197,94,0.4)' }}>
                          <img src={urlPublica(empresa.qrPago)} alt="QR de pago del complejo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <p style={{ color: '#f59e0b', fontSize: '0.78rem', textAlign: 'center',
                          lineHeight: 1.5, marginBottom: 12 }}>
                          Pídele al administrador que lo cargue en «Mi cuenta». Mientras tanto
                          puedes cobrar en efectivo, o tomar igual la foto del comprobante si
                          te transfieren.
                        </p>
                      )}

                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 6, padding: 16, borderRadius: 12,
                        border: '2px dashed ' + (compRuta ? '#22c55e' : subiendoComp ? '#f59e0b' : '#2a2a2a'),
                        background: compRuta ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                        cursor: subiendoComp ? 'wait' : 'pointer' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, textAlign: 'center',
                          color: compRuta ? '#22c55e' : subiendoComp ? '#f59e0b' : '#888' }}>
                          {subiendoComp ? 'Subiendo…' : compRuta ? '✓ ' + compNombre
                            : '📷 Toma una foto del comprobante'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#555', textAlign: 'center' }}>
                          {compRuta
                            ? 'Queda guardado con la reserva'
                            : 'Desde el celular se abre la cámara. También puedes subir la foto o el PDF que te muestre.'}
                        </span>
                        {/* capture abre la camara directamente en el celular */}
                        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                          capture="environment" style={{ display: 'none' }} disabled={subiendoComp}
                          onChange={e => { elegirComprobante(e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                      <span id="campo-comprobante" tabIndex={-1} />
                      <MensajeCampo nombre="comprobante" error={erroresReserva.comprobante} mostrar={intentoReserva} />
                    </div>
                  )}
                </>
              )}

              {errorReserva && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, marginBottom: 12 }}>
                  <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>✕ {errorReserva}</p>
                </div>
              )}

              {constancia && slotsElegidos.length === 0 && (
                <div role="status" style={{ padding: 16, border: '1px solid rgba(34,197,94,0.4)', borderRadius: 12,
                  background: 'rgba(34,197,94,0.06)', marginBottom: 14 }}>
                  <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>
                    ✓ Reserva registrada · Nº {constancia.nro}
                  </p>
                  {[
                    ['Cliente', constancia.cliente + (constancia.telefono ? ' · ' + constancia.telefono : '')],
                    ['Cancha', constancia.cancha],
                    ['Día y hora', `${constancia.fecha}, ${constancia.horaInicio} – ${constancia.horaFin} (${constancia.horas} h)`],
                    ['Cobrado', `Bs. ${constancia.monto} · ${constancia.pago === 'qr' ? 'QR, con comprobante' : 'efectivo'}`],
                    ...(constancia.vuelto != null ? [['Recibido / vuelto', `Bs. ${constancia.recibido} / Bs. ${constancia.vuelto}`]] : []),
                    ['Atendió', constancia.atendio],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.8rem',
                      padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#777' }}>{k}</span>
                      <span style={{ color: '#ddd', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}
                    onClick={() => setConstancia(null)}>
                    Nueva reserva
                  </button>
                </div>
              )}

              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
                disabled={!slotsElegidos.length || subiendoComp}
                onClick={guardarPresencial}>
                {slotsElegidos.length === 0     ? 'Elige las horas en la lista'
                  : subiendoComp                ? 'Subiendo el comprobante…'
                  : 'Registrar y cobrar Bs. ' + montoPresencial}
              </button>
            </div>
          )}

          {/* ══ ASISTENCIA ══ */}
          {tab === 'asistencia' && (
            <div className="card">
              <div style={{ padding: 18, borderBottom: '1px solid #2a2a2a' }}>
                <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>Asistencia de hoy</h3>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Marca quién llegó a usar su cancha</p>
              </div>
              {confirmadas.length === 0 ? (
                <div className="empty-state"><p>No hay reservas confirmadas para hoy</p></div>
              ) : (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {confirmadas.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a2a', borderRadius: 10, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{r.cliente}</p>
                        <p style={{ color: '#666', fontSize: '0.78rem' }}>{r.cancha} · {r.horaInicio} - {r.horaFin}</p>
                      </div>
                      {r.asistencia ? (
                        <span className="badge" style={{
                          background: r.asistencia === 'presente' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: r.asistencia === 'presente' ? '#22c55e' : '#ef4444' }}>
                          {r.asistencia === 'presente' ? '✓ Se presentó' : '✕ No se presentó'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => marcarAsistencia(r, 'presente')}>Llegó</button>
                          <button className="btn btn-outline btn-sm" onClick={() => marcarAsistencia(r, 'ausente')}>No llegó</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ RECOMPENSAS ══ */}
          {tab === 'recompensas' && (
            <div className="card">
              <div style={{ padding: 18, borderBottom: '1px solid #2a2a2a' }}>
                <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>Canjes por entregar</h3>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Pide el código al cliente y verifícalo antes de entregar</p>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {canjes.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a2a', borderRadius: 10, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: 1 }}>{c.codigo}</p>
                      <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{c.recompensa}</p>
                      <p style={{ color: '#666', fontSize: '0.78rem' }}>{c.cliente} · {c.puntos} puntos · {c.fecha}</p>
                    </div>
                    {c.estado === 'entregado'
                      ? <span className="badge badge-success">✓ Entregado{c.entregadoPor ? ' por ' + c.entregadoPor : ''}</span>
                      : <button className="btn btn-primary btn-sm" onClick={() => entregarCanje(c)}>Entregar</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ESTADO DE CANCHAS ══ */}
          {tab === 'canchas_estado' && (
            <div className="card">
              <div style={{ padding: 18, borderBottom: '1px solid #2a2a2a' }}>
                <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>Estado de las canchas</h3>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>
                  Puedes sacarla de servicio si no se puede jugar. No puedes cambiar precios ni crear canchas.
                </p>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {canchas.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a2a', borderRadius: 10, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{c.nombre}</p>
                      <p style={{ color: '#666', fontSize: '0.78rem' }}>{c.deporte} · Bs. {c.precio} la hora</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="badge" style={{
                        background: c.disponible ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: c.disponible ? '#22c55e' : '#ef4444' }}>
                        {c.disponible ? 'Disponible' : 'Fuera de servicio'}
                      </span>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => alternarCancha(c, c.disponible ? 'reportada por el empleado' : '')}>
                        {c.disponible ? 'Sacar de servicio' : 'Habilitar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ENTRENAMIENTOS (solo consulta) ══ */}
          {tab === 'entrenamientos' && (
            <div className="card">
              <div style={{ padding: 18, borderBottom: '1px solid #2a2a2a' }}>
                <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>Entrenamientos del complejo</h3>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Solo consulta. El horario lo publica el administrador.</p>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entrenamientosDeEmpresa(empleado.empresa_id).map(e => (
                  <div key={e.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a2a', borderRadius: 10 }}>
                    <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{e.nombre}</p>
                    <p style={{ color: '#666', fontSize: '0.78rem' }}>
                      {e.entrenador} · {e.dias.join(', ')} · {e.horaInicio} - {e.horaFin}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ MESA TECNICA ══ */}
          {tab === 'torneos_mesa' && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 4 }}>Mesa técnica</h3>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 16 }}>
                Solo los torneos que organiza el complejo. Los que arma un cliente los maneja
                él mismo desde su cuenta.
              </p>
              {mesaHabilitada.length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.85rem' }}>
                  El complejo no tiene torneos en curso en este momento.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mesaHabilitada.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a2a', borderRadius: 10, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{t.emoji} {t.nombre}</p>
                        <p style={{ color: '#666', fontSize: '0.78rem' }}>
                          {t.formato} · organiza {t.creador}
                        </p>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/torneos/' + t.id + '/mesa')}>Abrir mesa</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Los de clientes se muestran, pero sin acceso */}
              {mesaDeClientes.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #2a2a2a' }}>
                  <p style={{ color: '#555', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Se juegan aquí, pero no los operas tú
                  </p>
                  {mesaDeClientes.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.015)', border: '1px dashed #2a2a2a', borderRadius: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ color: '#888', fontWeight: 600, fontSize: '0.88rem' }}>{t.emoji} {t.nombre}</p>
                        <p style={{ color: '#555', fontSize: '0.76rem' }}>Lo organiza {t.creador}, un cliente</p>
                      </div>
                      <span style={{ color: '#555', fontSize: '0.75rem' }}>🔒 Mesa del organizador</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Lo que hice en el turno */}
      {registro.length > 0 && (
        <div className="card" style={{ padding: 18, marginTop: 20 }}>
          <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 12 }}>🧾 Lo que registraste en este turno</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registro.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.8rem' }}>
                <span style={{ color: '#555', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{a.hora}</span>
                <span style={{ color: '#f5f5f5', fontWeight: 600, flexShrink: 0 }}>{a.accion}</span>
                <span style={{ color: '#666' }}>{a.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <p style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>Bs. {comprobante.monto}</p>
            </div>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 14 }}>
              {comprobante.cancha} · {comprobante.horaInicio} - {comprobante.horaFin}
            </p>
            {comprobante.estado === 'vencida' && (
              <p style={{ color: '#a855f7', fontSize: '0.8rem', lineHeight: 1.5, padding: '10px 12px', marginBottom: 14,
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }}>
                El cliente pagó cuando ya se le había terminado el tiempo para hacerlo, y otra persona tomó la hora. Su comprobante queda aquí como prueba del pago: devuélvele el dinero u ofrécele otra hora.
              </p>
            )}
            {comprobante.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => resolverReserva(comprobante, 'rechazada')}>Rechazar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => resolverReserva(comprobante, 'confirmada')}>Confirmar pago</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
