import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import { BITACORA, TIPO_BITACORA } from '../../lib/datos'
import { Titulo, FiltroComplejo, Tarjetas, nombreDeComplejo, Vacio } from './comun'
import { hoyBolivia } from '../../lib/fecha'

const TIPOS = {
  reserva: 'Reservas', asistencia: 'Asistencia', recompensa: 'Recompensas', cancha: 'Canchas',
  torneo: 'Torneos', cuenta: 'Cuentas', entrenador: 'Entrenadores', entrenamiento: 'Entrenamientos',
  calificacion: 'Calificaciones',
}

// Para no dibujar miles de filas de golpe
const POR_PAGINA = 100

/**
 * Quién hizo qué y cuándo, en todos los complejos. Nadie puede editarla ni
 * borrarla (lo impide la base): es el registro de auditoría.
 */
export default function BitacoraGlobal() {
  const [complejo, setComplejo] = useState('')
  const [tipo, setTipo]         = useState('')
  const [fecha, setFecha]       = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cuantos, setCuantos]   = useState(POR_PAGINA)

  const q = busqueda.trim().toLowerCase()
  const visibles = BITACORA
    .filter(b => !complejo || String(b.empresa_id) === complejo)
    .filter(b => !tipo || b.tipo === tipo)
    .filter(b => !fecha || b.fechaISO === fecha)
    .filter(b => !q || (b.empleado + ' ' + b.accion + ' ' + (b.detalle || '')).toLowerCase().includes(q))

  const hoy = hoyBolivia()
  const personas = new Set(visibles.map(b => b.empleado)).size

  return (
    <Layout role="superadmin">
      <Titulo icono="📋" texto="Bitácora" sub="Quién hizo qué y cuándo en cada complejo: confirmar o rechazar reservas, marcar asistencia, entregar premios y más. Nadie puede borrarla." />

      <Tarjetas items={[
        { label: 'Movimientos', value: visibles.length, icon: '📋' },
        { label: 'Hoy', value: visibles.filter(b => b.fechaISO === hoy).length, icon: '📅' },
        { label: 'Personas', value: personas, icon: '🧑‍💼', sub: 'administradores y empleados' },
      ]} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input className="input" placeholder="🔍 Persona, acción o Nº de reserva..." value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setCuantos(POR_PAGINA) }} style={{ flex: 1, minWidth: 220 }} />
        <FiltroComplejo valor={complejo} onCambio={(v) => { setComplejo(v); setCuantos(POR_PAGINA) }} />
        <select className="input" aria-label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Todo</option>
          {Object.entries(TIPOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input type="date" className="input" aria-label="Día" value={fecha} onChange={e => setFecha(e.target.value)} />
      </div>

      <div className="card">
        {visibles.length === 0 ? <Vacio texto="No hay movimientos con esos filtros" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Fecha</th><th>Hora</th><th>Complejo</th><th>Quién</th><th>Qué hizo</th><th>Detalle</th></tr></thead>
              <tbody>
                {visibles.slice(0, cuantos).map(b => (
                  <tr key={b.id}>
                    <td style={{ color: '#888', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{b.fecha}</td>
                    <td style={{ color: '#00BCD4', fontSize: '0.82rem' }}>{b.hora}</td>
                    <td style={{ color: '#ccc', fontSize: '0.82rem' }}>{nombreDeComplejo(b.empresa_id)}</td>
                    <td style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.84rem' }}>{b.empleado}</td>
                    <td style={{ color: TIPO_BITACORA[b.tipo]?.color || '#ccc', fontSize: '0.84rem' }}>
                      {(TIPO_BITACORA[b.tipo]?.icon || '•') + ' ' + b.accion}
                    </td>
                    <td style={{ color: '#888', fontSize: '0.8rem' }}>{b.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {visibles.length > cuantos && (
          <div style={{ padding: 14, textAlign: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setCuantos(n => n + POR_PAGINA)}>
              Ver más ({visibles.length - cuantos} restantes)
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
