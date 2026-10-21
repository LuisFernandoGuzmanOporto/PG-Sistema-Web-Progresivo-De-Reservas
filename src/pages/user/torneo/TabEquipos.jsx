import { aceptaInscripciones } from '../../../lib/datos'

// ─────────────────────────────────────────────────────────────────────────────
// Pestaña de la ficha de un torneo.
//
// Los equipos inscritos. Los pendientes se muestran igual, en gris: el que
// se anoto tiene que poder ver que su solicitud existe y esta esperando.
//
// Sale de TorneoDetalle, que tenia 1.250 lineas con seis pestañas de
// espectador mas cuatro del organizador metidas en el mismo archivo.
// ─────────────────────────────────────────────────────────────────────────────

// 'equipos' llega como prop y no se calcula aca a proposito: en datos.js hay
// una funcion que se llama equiposAprobados(), y al importarla se pisaba con
// la lista ya calculada de la pantalla. El resultado era que .map no existia
// y la pestaña reventaba.
// El escudo del equipo. Si no subieron ninguno se muestra la inicial del
// nombre, que es mejor que un hueco gris.
function Escudo({ equipo, tam = 40 }) {
  const estilo = {
    width: tam, height: tam, borderRadius: 10, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', background: '#8B0000',
    color: '#fff', fontWeight: 800, fontSize: tam * 0.4,
  }
  if (equipo?.escudo) {
    return (
      <div style={{ ...estilo, background: '#0f0f0f' }}>
        <img src={urlPublica(equipo.escudo)} alt={'Escudo de ' + equipo.nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return <div style={estilo}>{(equipo?.nombre || '?').charAt(0).toUpperCase()}</div>
}

export default function TabEquipos({ torneoData, equipos, navigate }) {
  return (
      <div>
        {equipos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No hay equipos inscritos aún</h3>
            <p>{aceptaInscripciones(torneoData)
              ? 'Sé el primero en inscribir tu equipo'
              : 'Las inscripciones se abren cuando el complejo apruebe la cancha'}</p>
            {aceptaInscripciones(torneoData) && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(`/app/torneos/${torneoData.id}/inscribir`)}>👥 Inscribir mi Equipo</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {equipos.map(eq => (
              <div key={eq.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Escudo equipo={eq} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{eq.nombre}</p>
                      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>👤 {eq.capitan}</p>
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✓ Aprobado</span>
                </div>
                {eq.jugadores.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Jugadores ({eq.jugadores.length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {eq.jugadores.slice(0,5).map(j => (
                        <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#aaa' }}>
                          <span>{j.nombre}</span>
                          <span style={{ color: j.habilitado ? '#22c55e' : '#444' }}>{j.habilitado ? '✓' : '✗'}</span>
                        </div>
                      ))}
                      {eq.jugadores.length > 5 && <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 4 }}>+{eq.jugadores.length - 5} más...</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
