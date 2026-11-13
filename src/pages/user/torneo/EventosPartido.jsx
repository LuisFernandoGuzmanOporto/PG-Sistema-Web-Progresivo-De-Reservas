import { iconoEvento, presentacionDeporte, marcadorPorSets } from '../../../lib/torneo'

// ─────────────────────────────────────────────────────────────────────────────
// Quien anoto y quien vio tarjeta en un partido, para el que lo sigue.
//
// Dos columnas, una por equipo, en el orden en que la mesa tecnica los fue
// registrando. El minuto solo se muestra en los deportes que lo llevan
// (futbol); en basquet, voley, wally, tenis y padel no se juega por reloj.
// ─────────────────────────────────────────────────────────────────────────────

export default function EventosPartido({ partido, deporte, sets, compacto = false }) {
  const eventos = partido.eventos || []
  if (eventos.length === 0) return null
  const pres = presentacionDeporte(deporte)

  // En los deportes por sets se anota punto por punto: un partido de wally
  // son 30 o más renglones. Ahí se muestra cómo van los sets y cuántos
  // puntos hizo cada jugador, no cada punto por separado.
  const ms = sets ? marcadorPorSets(eventos, partido.equipo1_id, sets) : null
  if (ms) {
    const porJugador = (equipoId) => {
      const cuenta = new Map()
      for (const ev of eventos) {
        if (ev.tipo !== 'gol' || String(ev.equipo_id) !== String(equipoId)) continue
        const k = ev.jugador + (ev.dorsal != null ? ' (' + ev.dorsal + ')' : '')
        cuenta.set(k, (cuenta.get(k) || 0) + 1)
      }
      return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
    }
    const col = (equipoId, alinear) => (
      <div style={{ textAlign: alinear, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {porJugador(equipoId).map(([j, n]) => (
          <span key={j} style={{ fontSize: compacto ? '0.72rem' : '0.78rem', color: '#bbb' }}>
            {j} · <strong style={{ color: '#f5f5f5' }}>{n}</strong> pt{n > 1 ? 's' : ''}
          </span>
        ))}
      </div>
    )
    return (
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#888', marginBottom: 8 }}>
          Sets <strong style={{ color: '#f5f5f5', fontSize: '1rem' }}>{ms.ganados1} - {ms.ganados2}</strong>
          {!ms.ganador && <> · <span style={{ color: '#00BCD4' }}>Set {ms.setEnJuego}: {ms.actual.a}-{ms.actual.b}</span></>}
          {ms.sets.length > 0 && <span style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginTop: 2 }}>
            {ms.sets.map((x, i) => 'Set ' + (i + 1) + ': ' + x.a + '-' + x.b).join(' · ')}</span>}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {col(partido.equipo1_id, 'right')}
          {col(partido.equipo2_id, 'left')}
        </div>
      </div>
    )
  }

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
