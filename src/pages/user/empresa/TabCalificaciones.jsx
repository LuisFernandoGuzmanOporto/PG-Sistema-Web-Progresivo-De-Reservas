// ─────────────────────────────────────────────────────────────────────────────
// Pestaña «Calificaciones» de la ficha de un complejo.
//
// Tiene dos partes que van por separado, como en un mapa de lugares:
//
//   Las ESTRELLAS son un voto: una por persona y por complejo, y se puede
//   cambiar tocando otra estrella. Es lo que arma el promedio, y por eso está
//   limitada — si cada uno pudiera votar diez veces, un complejo consigue tres
//   amigos y se compra la nota. El voto no lleva texto.
//
//   Los COMENTARIOS son conversación: cualquiera que entra los ve todos, puede
//   escribir los que quiera y responderle a otro. Cuando responde el
//   administrador del complejo, su mensaje queda marcado como tal.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Comentarios from './Comentarios'

const ETIQUETA = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' }

export default function TabCalificaciones({ calificaciones, promedio, distribucion,
                                            miCalificacion, calificar, errorCal,
                                            empresaId, adminId, hiloGeneral, versionHilo,
                                            soyDelComplejo, refrescarHilo }) {
  const [hover, setHover]       = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso]       = useState(null)
  const miVoto = miCalificacion?.estrellas || 0

  const votar = async (n) => {
    if (guardando || n === miVoto) return
    setGuardando(true); setAviso(null)
    const ok = await calificar(n)
    setGuardando(false)
    if (ok) setAviso(miVoto ? 'Tu calificación se actualizó' : '¡Gracias por calificar!')
  }

  return (
    <div>
      {/* ── Estrellas ── */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, marginBottom:16, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:14, padding:24 }}>

        <div style={{ textAlign:'center', paddingRight:24, borderRight:'1px solid #2a2a2a' }}>
          <p style={{ fontFamily:'Bebas Neue', fontSize:'4rem', color:'#f59e0b', lineHeight:1, marginBottom:4 }}>{promedio}</p>
          <div style={{ display:'flex', justifyContent:'center', gap:3, marginBottom:6 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ fontSize:20, color: n <= Math.round(promedio) ? '#f59e0b' : '#333' }}>★</span>
            ))}
          </div>
          <p style={{ color:'#555', fontSize:'0.75rem' }}>
            {calificaciones.length} calificaci{calificaciones.length !== 1 ? 'ones' : 'ón'}
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6, justifyContent:'center' }}>
          {distribucion.map(d => {
            const pct = calificaciones.length ? Math.round((d.cantidad / calificaciones.length) * 100) : 0
            return (
              <div key={d.estrella} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:'0.72rem', color:'#f59e0b', fontWeight:700, minWidth:10 }}>{d.estrella}</span>
                <span style={{ fontSize:12, color:'#f59e0b' }}>★</span>
                <div style={{ flex:1, height:6, background:'#2a2a2a', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width: pct + '%', background:'#f59e0b', borderRadius:3, transition:'width 0.4s' }} />
                </div>
                <span style={{ fontSize:'0.72rem', color:'#555', minWidth:28, textAlign:'right' }}>{d.cantidad}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mi voto: se toca una estrella y queda guardado */}
      {!soyDelComplejo && (
        <div className="card" style={{ padding:'16px 20px', marginBottom:24, display:'flex',
          alignItems:'center', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
          <div>
            <p style={{ color:'#f5f5f5', fontWeight:700, fontSize:'0.9rem', marginBottom:2 }}>
              {miVoto ? 'Tu calificación' : 'Califica este complejo'}
            </p>
            <p style={{ color:'#666', fontSize:'0.75rem' }}>
              {miVoto ? 'Toca otra estrella si quieres cambiarla.' : 'Toca las estrellas. Es un voto por persona.'}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', gap:4 }} onMouseLeave={() => setHover(0)}>
              {[1,2,3,4,5].map(n => (
                <span key={n}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => votar(n)}
                  style={{ fontSize:32, lineHeight:1, cursor: guardando ? 'wait' : 'pointer',
                    color: n <= (hover || miVoto) ? '#f59e0b' : '#2a2a2a',
                    transition:'color 0.1s, transform 0.1s',
                    transform: n <= (hover || miVoto) ? 'scale(1.1)' : 'scale(1)' }}>★</span>
              ))}
            </div>
            <span style={{ fontSize:'0.8rem', fontWeight:700, color:'#f59e0b', minWidth:64 }}>
              {ETIQUETA[hover || miVoto] || ''}
            </span>
          </div>
          {(aviso || errorCal) && (
            <p style={{ width:'100%', fontSize:'0.78rem', color: errorCal ? '#ef4444' : '#22c55e' }}>
              {errorCal || '✓ ' + aviso}
            </p>
          )}
        </div>
      )}

      {/* ── Comentarios, aparte de las estrellas ── */}
      <div className="card" style={{ padding:20 }}>
        <Comentarios
          key={'general-' + versionHilo}
          empresaId={empresaId}
          adminId={adminId}
          hilo={hiloGeneral}
          esAdmin={soyDelComplejo}
          onCambio={refrescarHilo}
          titulo="Comentarios" />
      </div>
    </div>
  )
}
