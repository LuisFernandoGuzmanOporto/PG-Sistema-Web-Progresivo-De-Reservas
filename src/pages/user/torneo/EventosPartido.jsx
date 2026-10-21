import { iconoEvento, presentacionDeporte } from '../../../lib/torneo'

// ─────────────────────────────────────────────────────────────────────────────
// Quien anoto y quien vio tarjeta en un partido, para el que lo sigue.
//
// Dos columnas, una por equipo, en el orden en que la mesa tecnica los fue
// registrando. El minuto solo se muestra en los deportes que lo llevan
// (futbol); en basquet, voley, wally, tenis y padel no se juega por reloj.
// ─────────────────────────────────────────────────────────────────────────────

export default function EventosPartido({ partido, deporte, compacto = false }) {
  const eventos = partido.eventos || []
  if (eventos.length === 0) return null
  const pres = presentacionDeporte(deporte)

  const columna = (equipoId, alinear) => (
    <div style={{ textAlign: alinear, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {eventos.filter(ev => String(ev.equipo_id) === String(equipoId)).map(ev => (
        <span key={ev.id} style={{ fontSize: compacto ? '0.72rem' : '0.78rem', color: '#bbb' }}>
          {alinear === 'right'
            ? <>{ev.jugador}{ev.dorsal != null ? ` (${ev.dorsal})` : ''}{pres.tieneMinuto && ev.minuto != null ? ` ${ev.minuto}'` : ''} {iconoEvento(ev.tipo, deporte)}</>
            : <>{iconoEvento(ev.tipo, deporte)} {ev.jugador}{ev.dorsal != null ? ` (${ev.dorsal})` : ''}{pres.tieneMinuto && ev.minuto != null ? ` ${ev.minuto}'` : ''}</>}
        </span>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12,
                  paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {columna(partido.equipo1_id, 'right')}
      {columna(partido.equipo2_id, 'left')}
    </div>
  )
}
