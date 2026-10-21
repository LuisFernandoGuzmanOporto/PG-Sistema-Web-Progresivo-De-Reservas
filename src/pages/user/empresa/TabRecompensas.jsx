// ─────────────────────────────────────────────────────────────────────────────
// Pestaña «Recompensas» de la ficha de un complejo.
//
// El canje en sí no se hace aquí: se llama a canjear(), que vive en la pantalla
// y termina en una función de la base que descuenta los puntos y crea el canje
// en una sola operación. Este archivo solo muestra y pide.
// ─────────────────────────────────────────────────────────────────────────────

export default function TabRecompensas({ recompensas, puntosUsuario, empresa,
                                         errorCanje, canjear, handleAccion }) {
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
            const puedesCanjear = puntosUsuario >= r.puntos
            return (
              <div key={r.id} className="card" style={{ padding:20, opacity:puedesCanjear?1:0.6 }}>
                <div style={{ marginBottom:12 }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'#f5f5f5', marginBottom:2 }}>{r.nombre}</h3>
                  <p style={{ fontSize:'0.75rem', color:'#666' }}>{r.stock} disponibles</p>
                </div>
                <p style={{ fontSize:'0.8rem', color:'#888', lineHeight:1.5, marginBottom:14 }}>{r.descripcion}</p>
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:puedesCanjear?'#f59e0b':'#555' }}>{r.puntos} pts</span>
                    {puedesCanjear
                      ? <span style={{ fontSize:'0.72rem', color:'#22c55e', fontWeight:600 }}>Puedes canjear</span>
                      : <span style={{ fontSize:'0.72rem', color:'#555' }}>Te faltan {r.puntos-puntosUsuario} pts</span>}
                  </div>
                  <div style={{ height:5, background:'#2a2a2a', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:Math.min((puntosUsuario/r.puntos)*100,100)+'%', background:puedesCanjear?'#f59e0b':'#8B0000', borderRadius:3 }} />
                  </div>
                </div>
                <button className={'btn w-full '+(puedesCanjear?'btn-primary':'btn-outline')}
                  style={{ justifyContent:'center', opacity:puedesCanjear?1:0.5 }}
                  disabled={!puedesCanjear} onClick={() => handleAccion(() => canjear(r))}>
                  {puedesCanjear ? 'Canjear Recompensa' : 'Necesitas '+r.puntos+' pts'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
