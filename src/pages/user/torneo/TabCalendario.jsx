// ─────────────────────────────────────────────────────────────────────────────
// Pestaña «Calendario» de la ficha de un torneo.
//
// El fixture completo: todos los partidos, agrupados por grupo y por ronda,
// con el resultado de los que ya se jugaron.
//
// Antes esta pestaña leia torneoData.calendario, que la carga desde Supabase
// deja siempre vacio: el que entraba veia una pantalla en blanco. Y solo
// aparecia durante las inscripciones, o sea justo cuando todavia no hay
// fixture. Ahora sale del mismo lugar que la tabla de posiciones —los
// partidos— y se puede mirar durante todo el torneo.
//
// Es la unica forma que tiene un espectador de ver el fixture entero: la
// pestaña «En Vivo» solo muestra lo que se esta jugando ahora, y el Fixture
// del panel de Administrar lo ve nada mas que quien organiza.
// ─────────────────────────────────────────────────────────────────────────────

const RESULTADO = {
  // Dice «Jugado» y no «Final»: al lado de la ronda que se llama Final
  // quedaban dos cosas distintas con la misma palabra
  finalizado: { label: 'Jugado',   color: '#666'    },
  en_vivo:    { label: 'En vivo',  color: '#ef4444' },
  programado: { label: 'Por jugar', color: '#00BCD4' },
}

// Los partidos ordenados y repartidos en bloques: un bloque por grupo y uno
// por ronda de la eliminatoria, en el orden en que se juegan.
function bloquesDe(partidos) {
  const porClave = new Map()
  const orden = (p) => String(p.creado || '')

  ;[...partidos]
    .sort((a, b) => orden(a).localeCompare(orden(b)))
    .forEach(p => {
      // Los de la llave se agrupan por RONDA, no por llave: 'Octavos de final 3'
      // entra en el bloque 'Octavos de final'. Si no, salian dieciseis titulos
      // con un partido cada uno.
      const clave = p.fase === 'grupos'
        ? 'Grupo ' + (p.grupo || '—')
        : String(p.ronda || p.llave || 'Fase eliminatoria').replace(/ \d+$/, '')
      if (!porClave.has(clave)) porClave.set(clave, [])
      porClave.get(clave).push(p)
    })

  // Los grupos primero, por letra; despues la llave, en el orden en que se
  // juega. Por nombre quedaba «Cuartos, Final, Octavos, Semifinales», que es
  // el orden del diccionario y no el del torneo.
  const ORDEN_RONDA = ['Octavos de final', 'Cuartos de final', 'Semifinales',
                       'Final', 'Tercer puesto']
  const puesto = (clave) => {
    const i = ORDEN_RONDA.findIndex(r => clave.startsWith(r))
    return i === -1 ? ORDEN_RONDA.length : i
  }

  return [...porClave.entries()].sort(([a], [b]) => {
    const esGrupoA = a.startsWith('Grupo'), esGrupoB = b.startsWith('Grupo')
    if (esGrupoA !== esGrupoB) return esGrupoA ? -1 : 1
    if (esGrupoA) return a.localeCompare(b)
    return puesto(a) - puesto(b) || a.localeCompare(b)
  })
}

export default function TabCalendario({ torneoData }) {
  const partidos = torneoData.partidos || []

  // Antes del sorteo no hay fixture todavia: lo que se puede decir es cuando
  // se juega, que es justo lo que necesita saber el que esta por inscribirse.
  if (partidos.length === 0) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 14 }}>📅 Cuándo se juega</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Dato etiqueta="Fechas" valor={[torneoData.fechaInicio, torneoData.fechaFin].filter(Boolean).join(" — ")} />
          {torneoData.horarios && <Dato etiqueta="Días y horario" valor={torneoData.horarios} />}
          <Dato etiqueta="Formato" valor={torneoData.formato} />
        </div>
        <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 16, lineHeight: 1.6 }}>
          El fixture se arma cuando se cierran las inscripciones y se sortean
          los grupos. Cuando eso pase, aquí vas a ver todos los partidos con día
          y hora.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {bloquesDe(partidos).map(([titulo, lista]) => (
        <div key={titulo}>
          <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: '#00BCD4', marginBottom: 10, letterSpacing: 1 }}>
            {titulo}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
            {lista.map(p => {
              const r = RESULTADO[p.estado] || RESULTADO.programado
              const jugado = p.estado !== 'programado'
              return (
                <div key={p.id} className="card" style={{ padding: 14, borderLeft: '3px solid ' + r.color }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.68rem', color: r.color, fontWeight: 700, textTransform: 'uppercase' }}>
                      {/* En la llave interesa cual de las ocho es */}
                      {p.fase !== 'grupos' && p.ronda ? p.ronda : r.label}
                    </span>
                    {p.hora && <span style={{ fontSize: '0.7rem', color: '#555' }}>🕐 {p.hora}</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: '0.83rem', color: '#ddd', textAlign: 'right' }}>{p.equipo1}</span>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: jugado ? '#f5f5f5' : '#444', minWidth: 46, textAlign: 'center' }}>
                      {jugado ? `${p.g1} - ${p.g2}` : 'vs'}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.83rem', color: '#ddd' }}>{p.equipo2}</span>
                  </div>

                  {/* Como se definio si el marcador quedo igualado */}
                  {p.pen1 != null && p.pen2 != null && p.g1 === p.g2 && (
                    <p style={{ fontSize: '0.7rem', color: '#f59e0b', textAlign: 'center', marginTop: 6 }}>
                      Penales {p.pen1} - {p.pen2}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const Dato = ({ etiqueta, valor }) => (
  <div>
    <p style={{ fontSize: '0.74rem', color: '#00BCD4', fontWeight: 600 }}>{etiqueta}</p>
    <p style={{ fontSize: '0.88rem', color: '#ccc' }}>{valor || '—'}</p>
  </div>
)
