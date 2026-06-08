import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const CALIFICACIONES = [
  { id: 1, usuario: 'Carlos M.',  avatar: 'CM', estrellas: 5, comentario: 'Excelentes canchas, iluminación nocturna de primer nivel. Muy recomendado.',       fecha: '28 May 2026', respondido: false },
  { id: 2, usuario: 'Ana L.',     avatar: 'AL', estrellas: 4, comentario: 'Buena atención y canchas en buen estado. El estacionamiento es un poco limitado.',   fecha: '22 May 2026', respondido: false },
  { id: 3, usuario: 'Pedro G.',   avatar: 'PG', estrellas: 5, comentario: 'El mejor complejo de la zona norte. Siempre limpio y bien organizado.',               fecha: '15 May 2026', respondido: true  },
  { id: 4, usuario: 'María S.',   avatar: 'MS', estrellas: 3, comentario: 'Las canchas están bien pero los vestuarios necesitan mantenimiento.',                 fecha: '10 May 2026', respondido: false },
  { id: 5, usuario: 'Juan R.',    avatar: 'JR', estrellas: 5, comentario: 'Perfectas instalaciones. Los entrenamientos son muy profesionales.',                  fecha: '05 May 2026', respondido: true  },
  { id: 6, usuario: 'Lucía T.',   avatar: 'LT', estrellas: 2, comentario: 'Tuve problemas con la reserva. La atención podría mejorar bastante.',                 fecha: '01 May 2026', respondido: false },
]

const ESTRELLA_LABEL = { 1:'Muy malo', 2:'Malo', 3:'Regular', 4:'Bueno', 5:'Excelente' }
const ESTRELLA_COLOR = { 1:'#ef4444', 2:'#f59e0b', 3:'#f59e0b', 4:'#22c55e', 5:'#22c55e' }

export default function GestionCalificaciones() {
  const [calificaciones] = useState(CALIFICACIONES)
  const [filtro, setFiltro]           = useState('todas') // todas | 5 | 4 | 3 | 2 | 1
  const [respondiendo, setRespondiendo] = useState(null)
  const [respuestaTexto, setRespuestaTexto] = useState('')

  const promedio = (calificaciones.reduce((s, c) => s + c.estrellas, 0) / calificaciones.length).toFixed(1)
  const distribucion = [5,4,3,2,1].map(e => ({
    estrella: e,
    cantidad: calificaciones.filter(c => c.estrellas === e).length,
  }))

  const filtradas = filtro === 'todas'
    ? calificaciones
    : calificaciones.filter(c => c.estrellas === Number(filtro))

  return (
    <Layout role="admin">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>★ Calificaciones</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Reseñas que los usuarios dejaron sobre tu empresa</p>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, marginBottom: 24, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24 }}>

        {/* Promedio */}
        <div style={{ textAlign: 'center', paddingRight: 28, borderRight: '1px solid #2a2a2a' }}>
          <p style={{ fontFamily: 'Bebas Neue', fontSize: '4.5rem', color: '#f59e0b', lineHeight: 1, marginBottom: 6 }}>{promedio}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 8 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ fontSize: 22, color: n <= Math.round(promedio) ? '#f59e0b' : '#2a2a2a' }}>★</span>
            ))}
          </div>
          <p style={{ color: '#555', fontSize: '0.78rem' }}>{calificaciones.length} reseñas totales</p>
        </div>

        {/* Distribución */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          {distribucion.map(d => {
            const pct = Math.round((d.cantidad / calificaciones.length) * 100)
            return (
              <div key={d.estrella} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, minWidth: 10 }}>{d.estrella}</span>
                <span style={{ fontSize: 13, color: '#f59e0b' }}>★</span>
                <div style={{ flex: 1, height: 7, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: '#f59e0b', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#555', minWidth: 20, textAlign: 'right' }}>{d.cantidad}</span>
                <span style={{ fontSize: '0.7rem', color: '#444', minWidth: 28 }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Promedio general',  valor: promedio + ' ★',                                              color: '#f59e0b', emoji: '⭐' },
          { label: 'Reseñas positivas', valor: calificaciones.filter(c => c.estrellas >= 4).length,           color: '#22c55e', emoji: '👍' },
          { label: 'Reseñas negativas', valor: calificaciones.filter(c => c.estrellas <= 2).length,           color: '#ef4444', emoji: '👎' },
          { label: 'Sin responder',     valor: calificaciones.filter(c => !c.respondido).length,              color: '#00BCD4', emoji: '💬' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: 6 }}>{s.emoji} {s.label}</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: s.color }}>{s.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { key: 'todas', label: `Todas (${calificaciones.length})` },
          { key: '5',     label: '★★★★★' },
          { key: '4',     label: '★★★★' },
          { key: '3',     label: '★★★' },
          { key: '2',     label: '★★' },
          { key: '1',     label: '★' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              border: filtro === f.key ? '1px solid #f59e0b' : '1px solid #2a2a2a',
              background: filtro === f.key ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: filtro === f.key ? '#f59e0b' : '#666',
              transition: 'all 0.15s',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Lista de calificaciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtradas.length === 0 && (
          <div className="empty-state" style={{ minHeight: 120 }}>
            <p style={{ color: '#555' }}>No hay calificaciones con ese filtro</p>
          </div>
        )}
        {filtradas.map(c => (
          <div
            key={c.id}
            className="card"
            style={{ padding: 20, borderLeft: `3px solid ${c.estrellas <= 2 ? '#ef4444' : c.estrellas === 3 ? '#f59e0b' : '#22c55e'}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c.avatar}
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 3 }}>{c.usuario}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3,4,5].map(n => (
                        <span key={n} style={{ fontSize: 14, color: n <= c.estrellas ? '#f59e0b' : '#2a2a2a' }}>★</span>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ESTRELLA_COLOR[c.estrellas] }}>
                      {ESTRELLA_LABEL[c.estrellas]}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.72rem', color: '#555' }}>{c.fecha}</span>
                {c.respondido && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: 'rgba(0,188,212,0.12)', color: '#00BCD4' }}>
                    ✔ Respondido
                  </span>
                )}
              </div>
            </div>

            {c.comentario && (
              <p style={{ fontSize: '0.84rem', color: '#aaa', lineHeight: 1.6, paddingLeft: 52, marginBottom: c.respondido ? 0 : 12 }}>
                "{c.comentario}"
              </p>
            )}

            {!c.respondido && (
              respondiendo === c.id ? (
                <div style={{ paddingLeft: 52, marginTop: 12 }}>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Escribe una respuesta para el usuario..."
                    value={respuestaTexto}
                    onChange={e => setRespuestaTexto(e.target.value)}
                    style={{ resize: 'none', marginBottom: 10, fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }} onClick={() => { setRespondiendo(null); setRespuestaTexto('') }}>Cancelar</button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ justifyContent: 'center', opacity: respuestaTexto.trim() ? 1 : 0.4 }}
                      disabled={!respuestaTexto.trim()}
                      onClick={() => { setRespondiendo(null); setRespuestaTexto('') }}
                    >
                      Enviar respuesta
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ paddingLeft: 52 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(0,188,212,0.08)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.25)', padding: '5px 14px', fontSize: '0.75rem' }}
                    onClick={() => setRespondiendo(c.id)}
                  >
                    💬 Responder
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
