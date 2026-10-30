import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { estadisticasDe, pico, reservasDeEmpresa, BITACORA, SESION, USUARIO_ACTUAL,
         empresaPorId, canchasDeEmpresa, torneosDeEmpresa,
         entrenadoresDeEmpresa } from '../../lib/datos'
import { resolverReserva, registrarEnBitacora } from '../../lib/guardar'
import { montoBs } from '../../lib/dinero'


// Mientras no exista el login real, el admin ve su propio complejo
export default function DashboardAdmin() {
  const navigate = useNavigate()

  // La empresa sale de la sesion. Antes estaba fija en 1, de cuando los datos
  // eran de prueba; con los identificadores reales de la base no existia.
  const EMPRESA_ID = SESION.empresaId

  // Se calcula DENTRO del componente, no al cargar el archivo: los datos
  // llegan de Supabase despues de iniciar sesion, y una constante de modulo
  // se quedaria con los valores vacios del arranque.
  const EST         = estadisticasDe(EMPRESA_ID)
  const DIA_PICO    = pico(EST.porDia)
  const HORA_PICO   = pico(EST.porHora)
  const CANCHA_PICO = pico(EST.porCancha)
  // Un complejo recién aprobado todavia no tiene nada que graficar
  const SIN_DATOS   = EST.totalReservas === 0

  const empresa  = empresaPorId(EMPRESA_ID)
  const canchas  = canchasDeEmpresa(EMPRESA_ID)
  const torneos  = torneosDeEmpresa(EMPRESA_ID)

  const FIN_SEMANA  = EST.porDia
    .filter(d => d.dia === 'Sáb' || d.dia === 'Dom')
    .reduce((a, d) => a + d.reservas, 0)


  // Las mismas reservas que gestiona el admin y atiende el empleado.
  //
  // Las jornadas de un torneo se guardan tambien como reservas, para que la
  // cancha quede tomada, pero aca no cuentan: no las pidio nadie, no se cobran
  // y no hay comprobante que revisar. Se muestran aparte, como horas ocupadas.
  const todasLasReservas = reservasDeEmpresa(EMPRESA_ID)
  // Las horas apartadas (el cliente esta pagando) y los pagos fuera de tiempo
  // tampoco son reservas del dia: se atienden en Gestión de Reservas.
  const [reservas, setReservas] = useState(
    todasLasReservas.filter(r => r.origen !== 'torneo' && r.estado !== 'apartada' && r.estado !== 'vencida'))
  const RESERVAS_HOY = reservas.filter(r => r.fecha === 'Hoy')

  // Las tarjetas de arriba salen de las reservas reales del complejo. Antes
  // estaban escritas a mano en el archivo, asi que cualquier administrador
  // veia los mismos numeros inventados: '12 reservas hoy', 'Bs. 3.240'.
  const porConfirmar = reservas.filter(r => r.estado === 'pendiente')
  const STATS = [
    { label: 'Reservas Hoy', value: String(RESERVAS_HOY.length),
      change: RESERVAS_HOY.filter(r => r.estado === 'confirmada').length + ' confirmadas',
      up: null, icon: '📅' },
    { label: 'Ingresos registrados', value: 'Bs. ' + montoBs(EST.ingresoMes),
      change: EST.totalReservas + ' reservas en total'
        + (EST.horasDeTorneo ? ' · ' + EST.horasDeTorneo + ' jornadas de torneo' : ''),
      up: null, icon: '💰' },
    { label: 'Canchas publicadas', value: String(canchas.length),
      change: canchas.filter(c => c.disponible).length + ' disponibles',
      up: null, icon: '🏟️' },
    { label: 'Pagos pendientes', value: String(porConfirmar.length),
      change: porConfirmar.length ? 'Requieren validación' : 'Nada por revisar',
      up: porConfirmar.length ? false : null, icon: '⏳' },
  ]

  const [errorResolver, setErrorResolver] = useState(null)

  /** Resolver aqui es lo mismo que resolver en Gestion de Reservas. */
  const resolver = async (r, estado) => {
    const g = await resolverReserva(r.id, estado)
    if (g.error) {
      setErrorResolver('No se guardó el cambio. ' + g.error)
      setTimeout(() => setErrorResolver(null), 4000)
      return
    }

    setReservas(prev => prev.map(x => x.id === r.id ? { ...x, estado, atendidoPor: USUARIO_ACTUAL.nombre } : x))
    const accion = estado === 'confirmada' ? 'Confirmó una reserva' : 'Rechazó una reserva'
    const detalle = r.nro + ' · ' + r.cliente + ' · ' + r.cancha + ' ' + r.horaInicio
    registrarEnBitacora({ tipo: 'reserva', accion, detalle })
    BITACORA.unshift({
      id: Date.now(), empresa_id: EMPRESA_ID, empleado_id: 0, empleado: 'Administrador',
      tipo: 'reserva',
      accion: estado === 'confirmada' ? 'Confirmó una reserva' : 'Rechazó una reserva',
      detalle: r.nro + ' · ' + r.cliente + ' · ' + r.cancha + ' ' + r.horaInicio,
      fecha: new Date().toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', year: 'numeric' }),
      hora: new Date().toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false }),
    })
  }

  return (
    <Layout role="admin">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>📊 Dashboard</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>
          {empresa?.nombre || 'Tu complejo'} — Panel de Administración
          {empresa?.estado === 'pendiente' && (
            <span style={{ color: '#f59e0b', fontWeight: 600 }}> · pendiente de aprobación</span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.up === true ? 'stat-up' : s.up === false ? 'stat-down' : ''}`} style={s.up === null ? { color: '#666' } : {}}>
              {s.up === true ? '↑' : s.up === false ? '↓' : '•'} {s.change}
            </div>
          </div>
        ))}
      </div>


      {/* ══ ESTADÍSTICAS DE GESTIÓN ══ */}
      <div style={{ marginBottom: 12, marginTop: 8 }}>
        <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f5f5f5' }}>📈 Estadísticas de gestión</h2>
        <p style={{ color: '#666', fontSize: '0.82rem' }}>{EST.periodo} · para saber cuándo conviene abrir más canchas o subir el precio</p>
      </div>

      {/* Titulares */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Día de mayor demanda', value: DIA_PICO ? DIA_PICO.dia : '—',
            sub: DIA_PICO ? DIA_PICO.reservas + ' reservas en el mes' : 'sin reservas todavía', icon: '🔥' },
          { label: 'Horario más usado', value: HORA_PICO ? HORA_PICO.hora : '—',
            sub: HORA_PICO ? HORA_PICO.reservas + ' reservas en esa franja' : 'sin reservas todavía', icon: '⏰' },
          { label: 'Ocupación de canchas', value: EST.ocupacion + '%', sub: EST.horasVendidas + ' horas vendidas', icon: '📊' },
          { label: 'No se presentaron',    value: EST.noShow, sub: EST.canceladas + ' canceladas además', icon: '🚫' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change" style={{ color: '#666' }}>• {s.sub}</div>
          </div>
        ))}
      </div>

      {SIN_DATOS && (
        <div style={{ padding: '14px 18px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 12, marginBottom: 20 }}>
          <p style={{ color: '#00BCD4', fontSize: '0.86rem', fontWeight: 600, marginBottom: 4 }}>
            📊 Todavía no hay movimiento
          </p>
          <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
            Los gráficos se llenan solos con las reservas. Empieza publicando tus
            canchas en «Mis Canchas»: recién ahí los clientes pueden reservar.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Reservas por día de la semana */}
        <div className="card" style={{ padding: 20 }}>
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 4 }}>📅 Días con mayor demanda</h3>
          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 18 }}>Reservas por día de la semana</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
            {EST.porDia.map(d => {
              const alto = DIA_PICO?.reservas ? (d.reservas / DIA_PICO.reservas) * 100 : 0
              const esPico = DIA_PICO ? d.dia === DIA_PICO.dia : false
              return (
                <div key={d.dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.72rem', color: esPico ? '#f59e0b' : '#666', fontWeight: esPico ? 700 : 500 }}>{d.reservas}</span>
                  <div title={d.dia + ': ' + d.reservas + ' reservas'} style={{
                    width: '100%', height: alto + '%', minHeight: 4, borderRadius: '6px 6px 0 0',
                    background: esPico ? 'linear-gradient(180deg,#f59e0b,#b45309)' : 'linear-gradient(180deg,#8B0000,#5a0000)',
                  }} />
                  <span style={{ fontSize: '0.72rem', color: esPico ? '#f59e0b' : '#888', fontWeight: esPico ? 700 : 500 }}>{d.dia}</span>
                </div>
              )
            })}
          </div>
          <p style={{ color: '#888', fontSize: '0.78rem', marginTop: 14, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
            {!SIN_DATOS && DIA_PICO ? <>
              El <strong style={{ color: '#f59e0b' }}>{DIA_PICO.dia}</strong> concentra la mayor demanda.
              El fin de semana suma {FIN_SEMANA} de las {EST.totalReservas} reservas del mes.
            </> : 'Cuando tengas reservas vas a ver aquí qué días se llenan más.'}
          </p>
        </div>

        {/* Reservas por franja horaria */}
        <div className="card" style={{ padding: 20 }}>
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 4 }}>⏰ Horarios más utilizados</h3>
          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 18 }}>Reservas por franja horaria</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 150 }}>
            {EST.porHora.map(h => {
              const alto = HORA_PICO?.reservas ? (h.reservas / HORA_PICO.reservas) * 100 : 0
              const esPico = HORA_PICO ? h.hora === HORA_PICO.hora : false
              return (
                <div key={h.hora} title={h.hora + ': ' + h.reservas + ' reservas'} style={{
                  flex: 1, height: alto + '%', minHeight: 4, borderRadius: '4px 4px 0 0',
                  background: esPico ? 'linear-gradient(180deg,#00BCD4,#00707f)' : 'linear-gradient(180deg,#2f6f78,#1d454a)',
                }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['06:00', '12:00', '18:00', '21:00'].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', color: '#666' }}>{h}</span>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: '0.78rem', marginTop: 14, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
            {!SIN_DATOS && HORA_PICO ? <>
              La franja pico es <strong style={{ color: '#00BCD4' }}>{HORA_PICO.hora}</strong> con {HORA_PICO.reservas} reservas.
              Entre 12:00 y 14:00 casi no hay movimiento: ahí conviene promoción.
            </> : 'Cuando tengas reservas vas a ver aquí en qué horarios se concentran.'}
          </p>
        </div>

        {/* Uso por cancha */}
        <div className="card" style={{ padding: 20 }}>
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 4 }}>🏟️ Uso por cancha</h3>
          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 18 }}>Cuánto se usó cada una</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {EST.porCancha.map(c => {
              const pct = CANCHA_PICO?.reservas ? Math.round((c.reservas / CANCHA_PICO.reservas) * 100) : 0
              return (
                <div key={c.cancha}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: '0.8rem', color: '#f5f5f5', fontWeight: 600 }}>{c.cancha}</span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{c.reservas} h</span>
                  </div>
                  <div style={{ height: 8, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', borderRadius: 4, background: 'linear-gradient(90deg,#8B0000,#00BCD4)' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{ color: '#888', fontSize: '0.78rem', marginTop: 16, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
            {!SIN_DATOS && CANCHA_PICO
              ? <><strong style={{ color: '#f5f5f5' }}>{CANCHA_PICO.cancha}</strong> es la más pedida del complejo.</>
              : 'Todavía no publicaste ninguna cancha.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Reservas del día */}
        <div className="card" style={{ padding: 20 }}>
          <div className="section-header">
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>📅 Reservas de Hoy</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/reservas')}>Ver todas</button>
          </div>
          {/* Sin esto quedaba la tabla con los titulos y nada debajo, y no se
              entendia si es que no habia reservas o si algo habia fallado */}
          {RESERVAS_HOY.length === 0 ? (
            <div style={{ padding: '22px 4px', color: '#555', fontSize: '0.84rem', lineHeight: 1.6 }}>
              Hoy no hay ninguna reserva. Las que se pidan desde la app van a
              aparecer aquí para que las revises.
            </div>
          ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Cancha</th>
                  <th>Hora</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {RESERVAS_HOY.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#f5f5f5', fontWeight: 500 }}>{r.cliente}</td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.cancha}</td>
                    <td style={{ color: '#00BCD4', fontSize: '0.85rem' }}>{r.horaInicio}-{r.horaFin}</td>
                    <td style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>Bs. {montoBs(r.monto)}</td>
                    <td><span className={`badge ${r.estado === 'confirmada' ? 'badge-success' : 'badge-warning'}`}>{r.estado}</span></td>
                    <td>
                      {r.estado === 'pendiente' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button title="Confirmar" onClick={() => resolver(r, 'confirmada')} className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, cursor: 'pointer' }}>✓</button>
                          <button title="Rechazar" onClick={() => resolver(r, 'rechazada')} className="btn btn-sm" style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer' }}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>⚡ Acciones Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '+ Nueva Cancha', path: '/admin/canchas', color: '#8B0000' },
                { label: '+ Agregar Entrenador', path: '/admin/entrenadores', color: '#00BCD4' },
                { label: '🧑‍💼 Crear cuenta de empleado', path: '/admin/empleados', color: '#8b5cf6' },
                { label: '🏆 Crear Torneo', path: '/admin/torneos', color: '#f59e0b' },
                { label: '💳 Subir QR de Pago', path: '/admin/canchas', color: '#22c55e' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} className="btn btn-outline" style={{ justifyContent: 'flex-start', borderColor: item.color + '33', color: '#ccc', fontSize: '0.85rem' }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(0,188,212,0.08) 0%, rgba(0,0,0,0) 100%)' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>📈 Resumen Mensual</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Total Reservas', String(EST.totalReservas)],
                ['Ingresos', 'Bs. ' + montoBs(EST.ingresoMes)],
                ['Torneos Activos', String(torneos.filter(t => t.estado !== 'finalizado').length)],
                ['Entrenadores', String(entrenadoresDeEmpresa(EMPRESA_ID).length)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.82rem', color: '#666' }}>{k}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5f5' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
