import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import VisorComprobante from '../../components/VisorComprobante'
import { RESERVAS_EMPRESA, ordenarReservas } from '../../lib/datos'
import { hoyBolivia } from '../../lib/fecha'
import { montoBs } from '../../lib/dinero'
import { Titulo, FiltroComplejo, Tarjetas, EstadoReserva, estadoDeReserva, nombreDeComplejo, Vacio } from './comun'

/**
 * Las reservas de todos los complejos, en una sola lista. Solo lectura: las
 * confirma o rechaza cada complejo.
 */
export default function ReservasGlobales() {
  const [complejo, setComplejo] = useState('')
  const [estado, setEstado]     = useState('')
  const [desde, setDesde]       = useState('')
  const [hasta, setHasta]       = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [comprobante, setComprobante] = useState(null)

  // Las ajenas (solo hora ocupada, sin datos) no llegan al Super Admin: él
  // lee todas las reservas completas. Se dejan afuera por las dudas.
  const todas = RESERVAS_EMPRESA.filter(r => !r.ajena)
  const q = busqueda.trim().toLowerCase()

  const visibles = ordenarReservas(todas
    .filter(r => !complejo || String(r.empresa_id) === complejo)
    .filter(r => !estado || (estado === 'torneo' ? r.origen === 'torneo' : r.origen !== 'torneo' && estadoDeReserva(r) === estado))
    .filter(r => !desde || (r.fechaISO || '') >= desde)
    .filter(r => !hasta || (r.fechaISO || '') <= hasta)
    .filter(r => !q || [r.nro, r.cliente, r.telefono, r.cancha, r.torneo].some(x => String(x || '').toLowerCase().includes(q))))

  const deClientes = visibles.filter(r => r.origen !== 'torneo')
  const hoy = hoyBolivia()

  return (
    <Layout role="superadmin">
      <Titulo icono="📅" texto="Reservas" sub="Las reservas de todos los complejos. Para confirmarlas o rechazarlas está cada complejo: aquí solo se miran." />

      <Tarjetas items={[
        { label: 'En esta lista', value: deClientes.length, icon: '📋', sub: 'sin contar horas de torneo' },
        { label: 'Hoy', value: deClientes.filter(r => r.fechaISO === hoy).length, icon: '📅' },
        { label: 'Por revisar', value: deClientes.filter(r => estadoDeReserva(r) === 'pendiente').length, icon: '⏳' },
        { label: 'Confirmadas', value: deClientes.filter(r => r.estado === 'confirmada').length, icon: '✅',
          sub: 'Bs. ' + montoBs(deClientes.filter(r => r.estado === 'confirmada').reduce((s, r) => s + (r.monto || 0), 0)) },
      ]} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input className="input" placeholder="🔍 Nº, cliente, teléfono o cancha..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <FiltroComplejo valor={complejo} onCambio={setComplejo} />
        <select className="input" aria-label="Estado" value={estado} onChange={e => setEstado(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Por revisar</option>
          <option value="confirmada">Confirmadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="apartada">Apartadas (pagando)</option>
          <option value="vencida">Pago fuera de tiempo</option>
          <option value="pasada">Sin revisar, ya pasadas</option>
          <option value="cancelada">Anuladas</option>
          <option value="torneo">Horas de torneo</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: '0.8rem' }}>
          Desde <input type="date" className="input" value={desde} onChange={e => setDesde(e.target.value)} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: '0.8rem' }}>
          Hasta <input type="date" className="input" value={hasta} onChange={e => setHasta(e.target.value)} />
        </label>
      </div>

      <div className="card">
        {visibles.length === 0 ? <Vacio texto="No hay reservas con esos filtros" /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Nº</th><th>Complejo</th><th>Cliente</th><th>Cancha</th><th>Fecha</th><th>Hora</th>
                    <th>Monto</th><th>Comprobante</th><th>Estado</th><th>Atendió</th></tr>
              </thead>
              <tbody>
                {visibles.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#555', fontSize: '0.78rem' }}>{r.nro || '—'}</td>
                    <td style={{ color: '#ccc', fontSize: '0.84rem' }}>{nombreDeComplejo(r.empresa_id)}</td>
                    <td>
                      <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.86rem' }}>{r.torneo ? '🏆 ' + r.torneo : r.cliente}</p>
                      <p style={{ color: '#555', fontSize: '0.72rem' }}>
                        {r.torneo ? 'Jornada del torneo' : (r.telefono || '')}
                        {r.origen === 'presencial' && <span style={{ color: '#8b5cf6', fontWeight: 700 }}> · PRESENCIAL</span>}
                      </p>
                    </td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.cancha}</td>
                    <td style={{ color: '#888', fontSize: '0.85rem' }}>{r.fecha}</td>
                    <td style={{ color: '#00BCD4', fontSize: '0.85rem' }}>{r.horaInicio}-{r.horaFin}</td>
                    <td style={{ color: r.torneo ? '#555' : '#f59e0b', fontWeight: 700 }}>{r.torneo ? '—' : 'Bs. ' + montoBs(r.monto)}</td>
                    <td>
                      {r.comprobante
                        ? <button className="btn btn-ghost btn-sm" onClick={() => setComprobante(r)}>📎 Ver</button>
                        : <span style={{ color: '#555', fontSize: '0.76rem' }}>
                            {r.torneo ? 'No corresponde' : r.origen === 'presencial' ? 'Efectivo' : 'Sin comprobante'}
                          </span>}
                    </td>
                    <td><EstadoReserva r={r} /></td>
                    <td style={{ color: '#666', fontSize: '0.78rem' }}>
                      {r.atendidoPor || '—'}
                      {r.asistencia && (
                        <p style={{ color: r.asistencia === 'presente' ? '#22c55e' : '#ef4444', fontSize: '0.7rem' }}>
                          {r.asistencia === 'presente' ? 'Llegó' : 'No se presentó'}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {comprobante && (
        <div className="modal-overlay" onClick={() => setComprobante(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Comprobante de pago</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>{comprobante.nro} · {comprobante.cliente} · {nombreDeComplejo(comprobante.empresa_id)}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setComprobante(null)}>✕</button>
            </div>
            <VisorComprobante ruta={comprobante.comprobante} />
            <p style={{ textAlign: 'center', color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1.5rem' }}>Bs. {montoBs(comprobante.monto)}</p>
          </div>
        </div>
      )}
    </Layout>
  )
}
