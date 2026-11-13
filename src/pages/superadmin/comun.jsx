// Piezas que comparten las pantallas del Super Admin que miran todos los
// complejos a la vez: el título, el selector de complejo y cómo se ve el
// estado de una reserva.
import { EMPRESAS, empresaPorId } from '../../lib/datos'
import { hoyBolivia } from '../../lib/fecha'

/** Los mismos nombres y colores que usa Gestión de Reservas del complejo. */
export const ESTADO_RESERVA = {
  pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  apartada:   { label: 'Apartada (pagando)', color: '#00BCD4', bg: 'rgba(0,188,212,0.12)' },
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  rechazada:  { label: 'Rechazada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  vencida:    { label: 'Pago fuera de tiempo', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  pasada:     { label: 'Sin revisar · ya pasó', color: '#888', bg: 'rgba(255,255,255,0.06)' },
  cancelada:  { label: 'Anulada',    color: '#888', bg: 'rgba(255,255,255,0.06)' },
}

/** Una pendiente cuyo día ya pasó no está «por revisar»: nadie la revisó a tiempo. */
export const estadoDeReserva = (r) =>
  r.estado === 'pendiente' && (r.fechaISO || '') < hoyBolivia() ? 'pasada' : r.estado

export function EstadoReserva({ r }) {
  const e = ESTADO_RESERVA[estadoDeReserva(r)] || ESTADO_RESERVA.cancelada
  return <span className="badge" style={{ background: e.bg, color: e.color }}>{e.label}</span>
}

/** Los complejos ordenados por nombre, para los selectores. */
export const complejosOrdenados = () =>
  [...EMPRESAS].sort((a, b) => a.nombre.localeCompare(b.nombre))

export const nombreDeComplejo = (id) => empresaPorId(id)?.nombre || '—'

export function Titulo({ icono, texto, sub, children }) {
  return (
    <div className="section-header">
      <div>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>{icono} {texto}</h1>
        {sub && <p style={{ color: '#666', fontSize: '0.85rem' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

/** Selector «Todos los complejos / uno». */
export function FiltroComplejo({ valor, onCambio, todos = true, style }) {
  return (
    <select className="input" aria-label="Complejo" value={valor} onChange={e => onCambio(e.target.value)}
      style={{ minWidth: 200, ...style }}>
      {todos && <option value="">Todos los complejos</option>}
      {!todos && <option value="">— Elige un complejo —</option>}
      {complejosOrdenados().map(e => (
        <option key={e.id} value={e.id}>{e.nombre}{e.estado !== 'activo' ? ' (' + e.estado + ')' : ''}</option>
      ))}
    </select>
  )
}

/** Fila de tarjetas con números. */
export function Tarjetas({ items }) {
  return (
    <div className="stats-grid" style={{ marginBottom: 20 }}>
      {items.map(s => (
        <div key={s.label} className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">{s.label}</span>
            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
          </div>
          <div className="stat-value">{s.value}</div>
          {s.sub && <div className="stat-change" style={{ color: '#666' }}>• {s.sub}</div>}
        </div>
      ))}
    </div>
  )
}

export function Vacio({ texto, detalle }) {
  return (
    <div className="empty-state">
      <p>{texto}</p>
      {detalle && <p style={{ color: '#555', fontSize: '0.8rem', marginTop: 6, maxWidth: 460, lineHeight: 1.5 }}>{detalle}</p>}
    </div>
  )
}
