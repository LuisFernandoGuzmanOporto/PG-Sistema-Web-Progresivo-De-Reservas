import { useState } from 'react'
import { quedanDe } from '../../../lib/datos'

// ─────────────────────────────────────────────────────────────────────────────
// Pestaña «Recompensas» de la ficha de un complejo.
//
// El canje en sí no se hace aquí: se llama a canjear(), que vive en la pantalla
// y termina en una función de la base que descuenta los puntos y crea el canje
// en una sola operación. Este archivo solo muestra y pide.
//
// Solo llegan las recompensas activas (la pantalla las filtra). Las agotadas se
// muestran, pero no se pueden canjear: antes la tarjeta decía "Puedes canjear"
// aunque el complejo la hubiera desactivado o no quedara ninguna, y la base la
// rechazaba recién al tocar el botón. Y, como en la pantalla de Recompensas,
// el canje se confirma antes de gastar los puntos.
// ─────────────────────────────────────────────────────────────────────────────

const AVISO_POR_TIPO = {
  descuento_reserva: '🏷️ Se generará un código de descuento para usar en tu próxima reserva.',
  torneo_gratis:     '🏆 Se generará un código de inscripción gratis para usar en un torneo.',
  fisico:            '🎁 Es un premio físico: retíralo en el complejo mostrando el código.',
}

export default function TabRecompensas({ recompensas, puntosUsuario, empresa,
                                         errorCanje, canjear, handleAccion }) {
  const [porConfirmar, setPorConfirmar] = useState(null)

  const confirmar = () => {
    const r = porConfirmar
    setPorConfirmar(null)
    handleAccion(() => canjear(r))
  }

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,rgba(139,0,0,0.25) 0%,rgba(245,158,11,0.1) 100%)', border:'1px solid rgba(139,0,0,0.3)', borderRadius:14, padding:'18px 24px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ color:'#888', fontSize:'0.8rem', marginBottom:4 }}>Tus puntos disponibles</p>
          <p style={{ fontFamily:'Bebas Neue', fontSize:'2.2rem', color:'#f59e0b', lineHeight:1 }}>{puntosUsuario} pts</p>
          <p style={{ color:'#555', fontSize:'0.75rem', marginTop:4 }}>Ganas puntos reservando, en torneos y partidos</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ color:'#666', fontSize:'0.8rem', marginBottom:4 }}>Recompensas en</p>
          <p style={{ color:'#f5f5f5', fontWeight:700 }}>{empresa.nombre}</p>
        </div>
      </div>

      {errorCanje && (
        <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:10, marginBottom:14 }}>
          <p style={{ color:'#ef4444', fontSize:'0.82rem' }}>{errorCanje}</p>
        </div>
      )}

      {recompensas.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">R</div><h3>Sin recompensas disponibles</h3></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {recompensas.map(r => {
            const quedan = quedanDe(r)
            const agotada = quedan === 0
            const alcanzan = puntosUsuario >= r.puntos
            const puedesCanjear = !agotada && alcanzan
            return (
              <div key={r.id} className="card" style={{ padding:20, opacity:puedesCanjear?1:0.6 }}>
                <div style={{ marginBottom:12 }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'#f5f5f5', marginBottom:2 }}>{r.nombre}</h3>
                  <p style={{ fontSize:'0.75rem', color: agotada ? '#ef4444' : '#666' }}>
                    {agotada ? 'Agotada' : quedan + (quedan === 1 ? ' disponible' : ' disponibles')}
                  </p>
                </div>
                <p style={{ fontSize:'0.8rem', color:'#888', lineHeight:1.5, marginBottom:14 }}>{r.descripcion}</p>
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:puedesCanjear?'#f59e0b':'#555' }}>{r.puntos} pts</span>
                    {agotada
                      ? <span style={{ fontSize:'0.72rem', color:'#ef4444', fontWeight:600 }}>Ya no quedan</span>
                      : alcanzan
                        ? <span style={{ fontSize:'0.72rem', color:'#22c55e', fontWeight:600 }}>Puedes canjear</span>
                        : <span style={{ fontSize:'0.72rem', color:'#555' }}>Te faltan {r.puntos-puntosUsuario} pts</span>}
                  </div>
                  <div style={{ height:5, background:'#2a2a2a', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:Math.min((puntosUsuario/r.puntos)*100,100)+'%', background:puedesCanjear?'#f59e0b':'#8B0000', borderRadius:3 }} />
                  </div>
                </div>
                <button className={'btn w-full '+(puedesCanjear?'btn-primary':'btn-outline')}
                  style={{ justifyContent:'center', opacity:puedesCanjear?1:0.5 }}
                  disabled={!puedesCanjear} onClick={() => setPorConfirmar(r)}>
                  {agotada ? 'Agotada' : alcanzan ? 'Canjear Recompensa' : 'Necesitas '+r.puntos+' pts'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {porConfirmar && (
        <div className="modal-overlay" onClick={() => setPorConfirmar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Canje</h2>
              <button className="btn btn-ghost btn-sm" aria-label="Cerrar" onClick={() => setPorConfirmar(null)}>✕</button>
            </div>
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.4rem', color:'#f5f5f5', marginBottom:4 }}>{porConfirmar.nombre}</h3>
              <p style={{ color:'#00BCD4', fontSize:'0.78rem', fontWeight:600, marginBottom:8 }}>🏢 {empresa.nombre}</p>
              <p style={{ color:'#666', fontSize:'0.84rem', marginBottom:14 }}>{porConfirmar.descripcion}</p>
              {AVISO_POR_TIPO[porConfirmar.tipo] && (
                <p style={{ color:'#bbb', fontSize:'0.8rem', padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, display:'inline-block', marginBottom:16 }}>
                  {AVISO_POR_TIPO[porConfirmar.tipo]}
                </p>
              )}
              <div style={{ display:'flex', justifyContent:'center', gap:24, padding:14, background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
                <div>
                  <p style={{ color:'#555', fontSize:'0.7rem' }}>Tus puntos</p>
                  <p style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#22c55e' }}>{puntosUsuario}</p>
                </div>
                <div style={{ color:'#333', fontSize:'1.4rem', alignSelf:'center' }}>→</div>
                <div>
                  <p style={{ color:'#555', fontSize:'0.7rem' }}>Después del canje</p>
                  <p style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#f59e0b' }}>{puntosUsuario - porConfirmar.puntos}</p>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent:'center' }} onClick={() => setPorConfirmar(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={confirmar}>✅ Confirmar Canje</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
