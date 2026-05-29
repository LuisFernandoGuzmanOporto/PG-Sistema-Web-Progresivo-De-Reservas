import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

// ── DATOS MOCK DEL TORNEO EN CURSO ───────────────────────────────────────────
const TORNEO = {
  id: 1, nombre: 'Copa Sportika Fútbol 2025', deporte: 'Fútbol', emoji: '⚽',
  formato: 'grupos_eliminacion', empresa: 'Sport Center',
}

const GRUPOS_INIT = {
  'A': [
    { id: 1, nombre: 'Los Cracks FC',    pj: 2, pg: 2, pe: 0, pp: 0, gf: 3, gc: 1, pts: 6 },
    { id: 2, nombre: 'Deportivo Norte',  pj: 2, pg: 1, pe: 1, pp: 0, gf: 1, gc: 0, pts: 4 },
    { id: 3, nombre: 'Athletic Sur',     pj: 2, pg: 0, pe: 1, pp: 1, gf: 0, gc: 1, pts: 1 },
    { id: 4, nombre: 'Team Rojo',        pj: 2, pg: 0, pe: 0, pp: 2, gf: 1, gc: 3, pts: 0 },
  ],
  'B': [
    { id: 5, nombre: 'Los Tigres',       pj: 2, pg: 2, pe: 0, pp: 0, gf: 4, gc: 1, pts: 6 },
    { id: 6, nombre: 'Real Este',        pj: 2, pg: 1, pe: 0, pp: 1, gf: 3, gc: 2, pts: 3 },
    { id: 7, nombre: 'FC Centro',        pj: 2, pg: 1, pe: 0, pp: 1, gf: 2, gc: 3, pts: 3 },
    { id: 8, nombre: 'Sporting Oeste',   pj: 2, pg: 0, pe: 0, pp: 2, gf: 1, gc: 4, pts: 0 },
  ],
}

const PARTIDOS_INIT = [
  // Finalizados
  { id: 1, grupo: 'A', equipo1: 'Los Cracks FC',   equipo2: 'Team Rojo',       g1: 2, g2: 1, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'finalizado', hora: '09:00', cancha: 'Cancha Principal' },
  { id: 2, grupo: 'A', equipo1: 'Deportivo Norte',  equipo2: 'Athletic Sur',    g1: 0, g2: 0, am1: 0, am2: 1, rj1: 0, rj2: 0, estado: 'finalizado', hora: '10:00', cancha: 'Cancha Auxiliar' },
  { id: 3, grupo: 'B', equipo1: 'Los Tigres',       equipo2: 'Sporting Oeste',  g1: 3, g2: 1, am1: 0, am2: 2, rj1: 0, rj2: 0, estado: 'finalizado', hora: '09:00', cancha: 'Cancha Auxiliar' },
  { id: 4, grupo: 'B', equipo1: 'FC Centro',        equipo2: 'Real Este',       g1: 1, g2: 2, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'finalizado', hora: '10:00', cancha: 'Cancha Principal' },
  // EN VIVO
  { id: 5, grupo: 'A', equipo1: 'Los Cracks FC',   equipo2: 'Deportivo Norte', g1: 1, g2: 0, am1: 0, am2: 1, rj1: 0, rj2: 0, estado: 'en_vivo',    hora: '15:00', cancha: 'Cancha Principal', minuto: 37 },
  { id: 6, grupo: 'B', equipo1: 'Los Tigres',       equipo2: 'Real Este',       g1: 1, g2: 1, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'en_vivo',    hora: '15:00', cancha: 'Cancha Auxiliar', minuto: 52 },
  // Programados
  { id: 7, grupo: 'A', equipo1: 'Team Rojo',        equipo2: 'Athletic Sur',    g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '17:00', cancha: 'Cancha Principal' },
  { id: 8, grupo: 'B', equipo1: 'FC Centro',        equipo2: 'Sporting Oeste',  g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '17:00', cancha: 'Cancha Auxiliar' },
]

const ESTADO_CONFIG = {
  en_vivo:    { label: '🔴 EN VIVO',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  finalizado: { label: '✅ Finalizado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  programado: { label: '🕐 Programado', color: '#666',    bg: 'rgba(255,255,255,0.04)' },
}

function calcDiff(equipo) { return equipo.gf - equipo.gc }

export default function TorneoEnVivo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [partidos, setPartidos] = useState(PARTIDOS_INIT)
  const [grupos] = useState(GRUPOS_INIT)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date())
  const [segundosRestantes, setSegundosRestantes] = useState(15)
  const [pulsando, setPulsando] = useState(false)
  const [tabVista, setTabVista] = useState('en_vivo')

  // Simula un pequeño cambio en minuto de partido para mostrar que está "vivo"
  const simularActualizacion = useCallback(() => {
    setPartidos(prev => prev.map(p =>
      p.estado === 'en_vivo'
        ? { ...p, minuto: Math.min((p.minuto || 0) + 1, 90) }
        : p
    ))
    setUltimaActualizacion(new Date())
    setSegundosRestantes(15)
    setPulsando(true)
    setTimeout(() => setPulsando(false), 600)
  }, [])

  // Auto-refresh cada 15 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      simularActualizacion()
    }, 15000)
    return () => clearInterval(intervalo)
  }, [simularActualizacion])

  // Contador regresivo
  useEffect(() => {
    const tick = setInterval(() => {
      setSegundosRestantes(s => s > 0 ? s - 1 : 15)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const compartirWhatsApp = (partido) => {
    const estado = partido.estado === 'en_vivo' ? '🔴 EN VIVO' : '✅ Finalizado'
    const texto = `${TORNEO.emoji} ${estado} — ${TORNEO.nombre}\n\n${partido.equipo1} ${partido.g1} - ${partido.g2} ${partido.equipo2}\n\n📍 ${partido.cancha}\n📱 Ver resultados en Sportika`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const partidosEnVivo = partidos.filter(p => p.estado === 'en_vivo')
  const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado')
  const partidosProgramados = partidos.filter(p => p.estado === 'programado')

  return (
    <Layout role="user">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem', marginBottom: 6 }}>
            ← Volver al torneo
          </button>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>
            🔴 EN VIVO — {TORNEO.nombre}
          </h1>
          <p style={{ color: '#666', fontSize: '0.8rem' }}>{TORNEO.empresa} • Formato: Grupos + Eliminación</p>
        </div>

        {/* Auto-refresh indicator */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: pulsando ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${pulsando ? 'rgba(239,68,68,0.4)' : '#2a2a2a'}`,
            borderRadius: 20, transition: 'all 0.3s', cursor: 'pointer',
          }} onClick={simularActualizacion}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.75rem', color: '#888' }}>
              Actualiza en {segundosRestantes}s
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#444', marginTop: 4 }}>
            Última: {ultimaActualizacion.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      </div>

      {/* ── PARTIDOS EN VIVO (destacados) ── */}
      {partidosEnVivo.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ● Partidos en curso
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
            {partidosEnVivo.map(p => (
              <div key={p.id} style={{
                background: 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, rgba(30,30,30,1) 60%)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 16, padding: 24,
                boxShadow: pulsando ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
                transition: 'box-shadow 0.3s',
              }}>
                {/* Badge + minuto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '3px 10px', borderRadius: 20 }}>
                    🔴 EN VIVO
                  </span>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#ef4444' }}>
                    {p.minuto}'
                  </span>
                </div>

                {/* Marcador */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 6 }}>{p.equipo1}</p>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', color: '#f5f5f5', lineHeight: 1 }}>{p.g1}</p>
                    {p.am1 > 0 && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>🟨 ×{p.am1}</p>}
                    {p.rj1 > 0 && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>🟥 ×{p.rj1}</p>}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#444' }}>VS</p>
                    <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 4 }}>📍 {p.cancha}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5', marginBottom: 6 }}>{p.equipo2}</p>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', color: '#f5f5f5', lineHeight: 1 }}>{p.g2}</p>
                    {p.am2 > 0 && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>🟨 ×{p.am2}</p>}
                    {p.rj2 > 0 && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>🟥 ×{p.rj2}</p>}
                  </div>
                </div>

                {/* Compartir */}
                <button
                  onClick={() => compartirWhatsApp(p)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 10, color: '#25d366', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }}
                >
                  📲 Compartir por WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABS: POSICIONES / FIXTURE ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20 }}>
        {[
          { key: 'en_vivo', label: `🔴 En Vivo (${partidosEnVivo.length})` },
          { key: 'posiciones', label: '📊 Posiciones' },
          { key: 'fixture', label: `📋 Fixture (${partidos.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTabVista(t.key)} style={{
            padding: '10px 20px', background: tabVista === t.key ? 'rgba(139,0,0,0.2)' : 'transparent',
            color: tabVista === t.key ? '#ff6b6b' : '#666', border: 'none',
            borderBottom: tabVista === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.85rem',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: POSICIONES ── */}
      {tabVista === 'posiciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {Object.entries(grupos).map(([grupo, equipos]) => {
            const clasificados = [...equipos].sort((a, b) => b.pts - a.pts || calcDiff(b) - calcDiff(a) || b.gf - a.gf)
            return (
              <div key={grupo} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(139,0,0,0.15)', borderBottom: '1px solid #2a2a2a' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>Grupo {grupo}</p>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      {['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', fontSize: '0.68rem', color: '#555', fontWeight: 700, textAlign: h === 'Equipo' ? 'left' : 'center', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clasificados.map((eq, i) => (
                      <tr key={eq.id} style={{
                        borderBottom: '1px solid #1a1a1a',
                        background: i < 2 ? 'rgba(34,197,94,0.04)' : 'transparent',
                      }}>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'Bebas Neue', fontSize: '0.9rem',
                            color: i < 2 ? '#22c55e' : '#555',
                          }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '0.82rem', color: '#f5f5f5', fontWeight: i < 2 ? 700 : 400 }}>
                          {i < 2 && <span style={{ color: '#22c55e', marginRight: 4 }}>→</span>}
                          {eq.nombre}
                        </td>
                        {[eq.pj, eq.pg, eq.pe, eq.pp, eq.gf, eq.gc, calcDiff(eq)].map((v, vi) => (
                          <td key={vi} style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>{v > 0 && vi === 6 ? `+${v}` : v}</td>
                        ))}
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f59e0b' }}>{eq.pts}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '8px 12px', borderTop: '1px solid #1a1a1a' }}>
                  <p style={{ fontSize: '0.68rem', color: '#22c55e' }}>→ Clasifican los 2 primeros</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: FIXTURE ── */}
      {tabVista === 'fixture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['en_vivo', 'programado', 'finalizado'].map(estado => {
            const ps = partidos.filter(p => p.estado === estado)
            if (ps.length === 0) return null
            const cfg = ESTADO_CONFIG[estado]
            return (
              <div key={estado}>
                <p style={{ color: cfg.color, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 4 }}>
                  {cfg.label}
                </p>
                {ps.map(p => (
                  <div key={p.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr auto',
                    alignItems: 'center', gap: 12,
                    padding: '14px 18px', marginBottom: 8,
                    background: '#1a1a1a', border: `1px solid ${p.estado === 'en_vivo' ? 'rgba(239,68,68,0.3)' : '#2a2a2a'}`,
                    borderRadius: 12,
                  }}>
                    {/* Equipo 1 */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.88rem' }}>{p.equipo1}</p>
                      <p style={{ fontSize: '0.7rem', color: '#555' }}>Grupo {p.grupo}</p>
                    </div>
                    {/* Marcador */}
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      {p.estado !== 'programado' ? (
                        <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: p.estado === 'en_vivo' ? '#ef4444' : '#f5f5f5', lineHeight: 1 }}>
                          {p.g1} - {p.g2}
                        </p>
                      ) : (
                        <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#444' }}>{p.hora}</p>
                      )}
                      {p.estado === 'en_vivo' && (
                        <p style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>{p.minuto}'</p>
                      )}
                    </div>
                    {/* Equipo 2 */}
                    <div>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.88rem' }}>{p.equipo2}</p>
                      <p style={{ fontSize: '0.7rem', color: '#555' }}>📍 {p.cancha}</p>
                    </div>
                    {/* WhatsApp */}
                    {p.estado !== 'programado' && (
                      <button
                        onClick={() => compartirWhatsApp(p)}
                        style={{ padding: '6px 10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 8, color: '#25d366', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}
                      >
                        📲 WA
                      </button>
                    )}
                    {p.estado === 'programado' && <div />}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: EN VIVO (detalle) ── */}
      {tabVista === 'en_vivo' && partidosEnVivo.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">⚽</div>
          <h3>No hay partidos en curso</h3>
          <p>Los partidos en vivo aparecerán aquí cuando comiencen</p>
        </div>
      )}
    </Layout>
  )
}
