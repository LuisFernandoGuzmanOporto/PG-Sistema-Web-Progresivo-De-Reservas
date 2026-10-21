import { etiquetasDeTabla, puntajePorDeporte } from '../../../lib/torneo'
import { MarcaEnJuego, AvisoProvisional } from './MarcaEnJuego'
// ─────────────────────────────────────────────────────────────────────────────
// Pestaña de la ficha de un torneo.
//
// La tabla y los goleadores. No se guardan en ningun lado: se calculan cada
// vez desde los partidos finalizados, asi que no pueden quedar desfasados
// respecto del resultado que cargo la mesa.
//
// Sale de TorneoDetalle, que tenia 1.250 lineas con seis pestañas de
// espectador mas cuatro del organizador metidas en el mismo archivo.
// ─────────────────────────────────────────────────────────────────────────────

export default function TabPosiciones({ tablas, clasifican, goleadores, deporte }) {
  // Las columnas se llaman distinto en cada deporte, y donde no hay empates
  // la columna PE sobra: siempre diria cero.
  const etq = etiquetasDeTabla(deporte)
  const hayEmpates = puntajePorDeporte(deporte).admiteEmpate

  return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div>
          {Object.entries(tablas).map(([grupo, filas]) => (
            <div key={grupo} className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>
                  📊 {grupo === 'Única' ? 'Tabla de Posiciones' : 'Grupo ' + grupo}
                </h3>
                <span style={{ color: '#8B0000', fontSize: '0.75rem', fontWeight: 600 }}>
                  Clasifican los {clasifican} primeros
                </span>
              </div>
              <AvisoProvisional filas={filas} />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      {['#','Equipo','PJ','PG', ...(hayEmpates ? ['PE'] : []), 'PP',
                        etq.aFavor, etq.enContra, 'Pts'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: '#555', fontWeight: 700, textAlign: h === 'Equipo' ? 'left' : 'center', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((pos, i) => (
                      <tr key={pos.id} style={{ borderBottom: '1px solid #1a1a1a', background: i < clasifican ? 'rgba(139,0,0,0.06)' : 'transparent' }}>
                        <td style={{ padding: '10px', color: i < clasifican ? '#8B0000' : '#555', fontWeight: 700, textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ padding: '10px', color: '#f5f5f5', fontWeight: 600 }}>{pos.nombre}<MarcaEnJuego fila={pos} /></td>
                        {[pos.pj, pos.pg, ...(hayEmpates ? [pos.pe] : []), pos.pp,
                          pos.gf, pos.gc].map((v,j) => (
                          <td key={j} style={{ padding: '10px', color: '#888', textAlign: 'center' }}>{v}</td>
                        ))}
                        <td style={{ padding: '10px', color: '#f5f5f5', fontWeight: 700, textAlign: 'center', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{pos.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Goleadores */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>
            {etq.cuenta === 'goles' ? '⚽ Goleadores' : '🎯 Más ' + etq.cuenta}
          </h3>
          {goleadores.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.82rem' }}>Sin {etq.cuenta} registrados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goleadores.map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i === 0 ? 'rgba(139,0,0,0.12)' : '#1a1a1a', borderRadius: 8 }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: '#f5f5f5', fontWeight: 600 }}>{g.jugador}</p>
                    <p style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{g.equipo}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: i === 0 ? '#8B0000' : '#f5f5f5' }}>{g.goles}</span>
                    <span style={{ fontSize: '0.78rem', color: '#555' }}>gol{g.goles !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  )
}
