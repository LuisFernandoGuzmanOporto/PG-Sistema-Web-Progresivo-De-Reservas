// ─────────────────────────────────────────────────────────────────────────────
// La tabla de posiciones «en vivo»: cómo se marca a un equipo que está
// jugando y el aviso de que las posiciones todavía pueden cambiar.
// ─────────────────────────────────────────────────────────────────────────────

const ESTILO = {
  gana:   { color: '#22c55e', texto: 'Gana' },
  empata: { color: '#f59e0b', texto: 'Empata' },
  pierde: { color: '#ef4444', texto: 'Pierde' },
}

/** «● EN VIVO · Gana 2-1» al lado del nombre del equipo. */
export function MarcaEnJuego({ fila }) {
  if (!fila?.enJuego) return null
  const e = ESTILO[fila.enJuego]
  return (
    <span style={{ marginLeft: 8, fontSize: '0.68rem', fontWeight: 700, color: e.color,
                   whiteSpace: 'nowrap' }}>
      ● EN VIVO · {e.texto} {fila.marcador}
    </span>
  )
}

/** Aviso sobre la tabla cuando alguno de sus equipos está jugando. */
export function AvisoProvisional({ filas }) {
  if (!(filas || []).some(f => f.enJuego)) return null
  return (
    <p style={{ fontSize: '0.74rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '6px 10px',
                margin: '8px 12px' }}>
      Posiciones provisionales: incluyen el resultado parcial de los partidos que se están jugando.
    </p>
  )
}
