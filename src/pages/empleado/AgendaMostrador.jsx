import { useState } from 'react'
import { agendaDelDia, hoyISO } from '../../lib/agenda'
import { MESES, DIAS_SEMANA, formatFecha } from '../user/empresa/calendario'

// ─────────────────────────────────────────────────────────────────────────────
// LA AGENDA DEL MOSTRADOR
//
// Lo que el empleado necesita para contestarle al que pregunta «¿hay lugar?»:
//   · un calendario del mes que muestra de un vistazo qué días están llenos,
//     cuáles casi y cuáles libres, y en cuáles hay entrenamientos o torneos;
//   · el resumen del día elegido: qué entrenamientos y torneos ocupan canchas
//     y a qué hora, antes de mirar hora por hora.
// Todo sale de la misma agenda que ve el cliente (lib/agenda.js).
// ─────────────────────────────────────────────────────────────────────────────

/** Cómo está un día en las canchas indicadas. */
export function estadoDelDia(empresaId, canchas, fechaISO) {
  let total = 0, libres = 0, entrenamiento = false, torneo = false
  for (const c of canchas) {
    for (const f of agendaDelDia(empresaId, c.id, fechaISO)) {
      total++
      if (f.estado === 'libre') libres++
      if (f.estado === 'entrenamiento') entrenamiento = true
      if (f.estado === 'torneo' || f.estado === 'torneo_pendiente') torneo = true
    }
  }
  return { total, libres, entrenamiento, torneo }
}

const COLOR_DIA = {
  libre:    { borde: '#22c55e', texto: '#22c55e', fondo: 'rgba(34,197,94,0.06)' },
  casi:     { borde: '#f59e0b', texto: '#f59e0b', fondo: 'rgba(245,158,11,0.07)' },
  completo: { borde: '#ef4444', texto: '#ef4444', fondo: 'rgba(239,68,68,0.08)' },
}

function nivel({ total, libres }) {
  if (!total || libres === 0) return 'completo'
  return libres / total <= 0.25 ? 'casi' : 'libre'
}

export function CalendarioMostrador({ empresaId, canchas, fecha, onElegir }) {
  const base = new Date(fecha + 'T12:00:00')
  const [mes, setMes] = useState({ anio: base.getFullYear(), mes: base.getMonth() })
  const hoy = hoyISO()

  const primero = new Date(mes.anio, mes.mes, 1)
  const dias = new Date(mes.anio, mes.mes + 1, 0).getDate()
  const celdas = Array((primero.getDay() + 6) % 7).fill(null)
  for (let d = 1; d <= dias; d++) celdas.push(formatFecha(new Date(mes.anio, mes.mes, d)))

  const mover = (n) => setMes(m => {
    const x = new Date(m.anio, m.mes + n, 1)
    return { anio: x.getFullYear(), mes: x.getMonth() }
  })
  const esMesActual = mes.anio === new Date().getFullYear() && mes.mes === new Date().getMonth()

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 12, padding: 12, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button type="button" onClick={() => mover(-1)} disabled={esMesActual} aria-label="Mes anterior"
          className="btn btn-ghost btn-sm" style={{ opacity: esMesActual ? 0.3 : 1 }}>◀</button>
        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: '#f5f5f5', letterSpacing: 1 }}>
          {MESES[mes.mes]} {mes.anio}
        </span>
        <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" className="btn btn-ghost btn-sm">▶</button>
      </div>

      {/* minmax(0, 1fr): en un celular angosto los días se achican; con 1fr y
          un alto mínimo, la columna del domingo quedaba fuera de la pantalla */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
        {DIAS_SEMANA.map(d => (
          <span key={d} style={{ textAlign: 'center', fontSize: '0.66rem', color: '#555', fontWeight: 700 }}>
            {d.toUpperCase()}
          </span>
        ))}
        {celdas.map((iso, i) => {
          if (!iso) return <span key={'v' + i} />
          const pasado = iso < hoy
          const elegido = iso === fecha
          const est = pasado ? null : estadoDelDia(empresaId, canchas, iso)
          const c = est ? COLOR_DIA[nivel(est)] : null
          return (
            <button key={iso} type="button" disabled={pasado} onClick={() => onElegir(iso)}
              title={est ? `${est.libres} de ${est.total} horas libres` : undefined}
              style={{
                aspectRatio: '1', minWidth: 0, borderRadius: 8, cursor: pasado ? 'default' : 'pointer',
                fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.82rem', padding: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: elegido ? 'rgba(0,188,212,0.18)' : c ? c.fondo : 'transparent',
                border: '1px solid ' + (elegido ? '#00BCD4' : c ? c.borde + '55' : '#1e1e1e'),
                color: pasado ? '#333' : elegido ? '#00BCD4' : c.texto,
              }}>
              {Number(iso.slice(8))}
              {est && (est.entrenamiento || est.torneo) && (
                <span style={{ display: 'flex', gap: 2 }}>
                  {est.entrenamiento && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6' }} />}
                  {est.torneo && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff6b6b' }} />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: '0.68rem', color: '#777' }}>
        <Leyenda color="#22c55e" texto="Con lugar" />
        <Leyenda color="#f59e0b" texto="Casi lleno" />
        <Leyenda color="#ef4444" texto="Completo" />
        <Leyenda color="#8b5cf6" texto="Entrenamiento" punto />
        <Leyenda color="#ff6b6b" texto="Torneo" punto />
      </div>
    </div>
  )
}

function Leyenda({ color, texto, punto }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: punto ? 6 : 10, height: punto ? 6 : 10, borderRadius: punto ? '50%' : 3,
        background: punto ? color : 'transparent', border: punto ? 'none' : '1px solid ' + color }} />
      {texto}
    </span>
  )
}

/** Entrenamientos y torneos del día, agrupados con su horario y su cancha. */
export function ResumenDelDia({ empresaId, canchas, fecha }) {
  const eventos = new Map()
  for (const c of canchas) {
    for (const f of agendaDelDia(empresaId, c.id, fecha)) {
      if (!['entrenamiento', 'torneo', 'torneo_pendiente'].includes(f.estado)) continue
      const clave = f.estado + '|' + f.titulo + '|' + c.id
      const e = eventos.get(clave) || { tipo: f.estado, titulo: f.titulo, detalle: f.detalle,
                                        cancha: c.nombre, desde: f.slot, hasta: f.fin }
      e.desde = e.desde < f.slot ? e.desde : f.slot
      e.hasta = e.hasta > f.fin ? e.hasta : f.fin
      eventos.set(clave, e)
    }
  }
  const lista = [...eventos.values()].sort((a, b) => a.desde.localeCompare(b.desde))
  const est = estadoDelDia(empresaId, canchas, fecha)

  return (
    <div style={{ padding: '12px 14px', border: '1px solid #2a2a2a', borderRadius: 12, marginBottom: 14,
      background: 'rgba(255,255,255,0.02)' }}>
      <p style={{ color: '#f5f5f5', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
        Este día en el complejo · {est.libres} de {est.total} horas libres
      </p>
      {lista.length === 0 ? (
        <p style={{ color: '#666', fontSize: '0.78rem' }}>No hay entrenamientos ni torneos: las canchas solo tienen reservas.</p>
      ) : lista.map(e => {
        const esTorneo = e.tipo !== 'entrenamiento'
        return (
          <div key={e.tipo + e.titulo + e.cancha} style={{ display: 'flex', justifyContent: 'space-between',
            gap: 10, padding: '6px 0', borderTop: '1px solid #1e1e1e', fontSize: '0.78rem' }}>
            <span>
              <span style={{ color: esTorneo ? '#ff6b6b' : '#a78bfa', fontWeight: 700 }}>
                {esTorneo ? '🏆 ' : '🏃 '}{e.titulo}
              </span>
              <span style={{ color: '#666' }}> · {e.cancha}{e.tipo === 'torneo_pendiente' ? ' · por aprobar' : ''}</span>
            </span>
            <span style={{ color: '#888', whiteSpace: 'nowrap' }}>{e.desde} – {e.hasta}</span>
          </div>
        )
      })}
    </div>
  )
}
