import { NIVEL_COLORES } from './colores'
import { DIAS_SEMANA, MESES } from './calendario'
import { montoBs } from '../../../lib/dinero'

// ─────────────────────────────────────────────────────────────────────────────
// Pestaña «Entrenamientos» de la ficha de un complejo.
//
// No hay boton de inscribirse a proposito: los entrenamientos no se reservan
// por la app, se avisa el dia y la hora y el cliente se presenta. Eso lo dice
// el cartel de arriba, para que nadie se quede esperando una confirmacion que
// no va a llegar.
// ─────────────────────────────────────────────────────────────────────────────

export default function TabEntrenamientos({ empresa, entrenamientosBase, celdasEnt,
                                            mesEnt, anioEnt, mesEntAnterior, mesEntSiguiente,
                                            diaEnt, setDiaEnt, hoyDia, hoyMes, hoyAnio }) {
  return (
      <div>
        <div style={{ padding:'10px 16px', background:'rgba(0,188,212,0.06)', border:'1px solid rgba(0,188,212,0.15)', borderRadius:10, marginBottom:20 }}>
          <p style={{ color:'#00BCD4', fontSize:'0.82rem' }}>Horarios de entrenamiento de {empresa.nombre}. No necesitas inscribirte: preséntate en el complejo el dia y la hora indicados.</p>
        </div>

        {entrenamientosBase.length===0 ? (
          <div className="empty-state"><div className="empty-state-icon">E</div><h3>Sin entrenamientos publicados</h3></div>
        ) : (
          <>
            {/* Calendario del mes */}
            <div className="card" style={{ padding:20, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <button onClick={mesEntAnterior} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #2a2a2a', borderRadius:8, color:'#888', width:32, height:32, cursor:'pointer', fontSize:'0.9rem' }}>◀</button>
                <p style={{ fontFamily:'Bebas Neue', fontSize:'1.15rem', color:'#f5f5f5', letterSpacing:1 }}>{MESES[mesEnt]} {anioEnt}</p>
                <button onClick={mesEntSiguiente} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #2a2a2a', borderRadius:8, color:'#888', width:32, height:32, cursor:'pointer', fontSize:'0.9rem' }}>▶</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6, marginBottom:6 }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ textAlign:'center', fontSize:'0.7rem', color:'#555', fontWeight:700, textTransform:'uppercase' }}>{d}</div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6 }}>
                {celdasEnt.map((c, i) => {
                  if (!c) return <div key={'vacio'+i} />
                  const ahora = new Date()
                  const esHoy = c.dia===ahora.getDate() && mesEnt===ahora.getMonth() && anioEnt===ahora.getFullYear()
                  const hay = c.entrenamientos.length > 0
                  const sel = diaEnt === c.dia
                  return (
                    <div key={c.dia} onClick={() => hay && setDiaEnt(sel ? null : c.dia)} style={{
                      aspectRatio:'1',
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      borderRadius:8,
                      background: sel ? 'rgba(0,188,212,0.28)' : hay ? 'rgba(0,188,212,0.12)' : 'rgba(255,255,255,0.02)',
                      border:'1px solid '+(esHoy ? '#8B0000' : hay ? 'rgba(0,188,212,0.35)' : '#1e1e1e'),
                      color: hay ? '#00BCD4' : '#444',
                      fontSize:'0.85rem',
                      fontWeight: hay ? 700 : 400,
                      cursor: hay ? 'pointer' : 'default',
                      transition:'all 0.15s',
                    }}>
                      {c.dia}
                      {hay && (
                        <div style={{ display:'flex', gap:2, marginTop:3 }}>
                          {c.entrenamientos.slice(0,3).map((e,j) => (
                            <span key={j} style={{ width:4, height:4, borderRadius:'50%', background:'#00BCD4' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Detalle del dia seleccionado */}
              {diaEnt && (
                <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(0,188,212,0.05)', border:'1px solid rgba(0,188,212,0.15)', borderRadius:10 }}>
                  <p style={{ color:'#00BCD4', fontSize:'0.82rem', fontWeight:700, marginBottom:8 }}>
                    {diaEnt} de {MESES[mesEnt]}
                  </p>
                  {((celdasEnt.find(c => c && c.dia===diaEnt) || {}).entrenamientos || []).map(e => (
                    <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color:'#f5f5f5', fontSize:'0.82rem' }}>{e.nombre}</span>
                      <span style={{ color:'#888', fontSize:'0.78rem', whiteSpace:'nowrap' }}>{e.horaInicio} - {e.horaFin}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Listado de entrenamientos */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
              {entrenamientosBase.map(ent => {
                const nivCol = NIVEL_COLORES[ent.nivel] || {}
                return (
                  <div key={ent.id} className="card" style={{ padding:20, border: ent.paraNinos ? '1px solid rgba(249,168,212,0.2)' : '1px solid #2a2a2a' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <p style={{ fontSize:'0.73rem', color:'#00BCD4', fontWeight:600 }}>{ent.deporte}</p>
                          {ent.paraNinos && <span style={{ padding:'1px 7px', borderRadius:20, fontSize:'0.65rem', fontWeight:700, background:'rgba(249,168,212,0.15)', color:'#f9a8d4' }}>{ent.edadMin}-{ent.edadMax} años</span>}
                        </div>
                        <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#f5f5f5', lineHeight:1.2 }}>{ent.nombre}</h3>
                      </div>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:nivCol.bg, color:nivCol.color, flexShrink:0, marginLeft:8 }}>{ent.nivel}</span>
                    </div>

                    <p style={{ fontSize:'0.8rem', color:'#888', lineHeight:1.5, marginBottom:12 }}>{ent.descripcion}</p>

                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      <p style={{ fontSize:'0.8rem', color:'#666' }}>{ent.entrenador}</p>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                        {(ent.dias || []).map(d => (
                          <span key={d} style={{ fontSize:'0.68rem', background:'rgba(0,188,212,0.1)', color:'#00BCD4', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(0,188,212,0.2)' }}>{d}</span>
                        ))}
                        <span style={{ fontSize:'0.72rem', color:'#888' }}>{ent.horaInicio} - {ent.horaFin}</span>
                      </div>
                      {ent.precio != null && ent.precio !== '' && (
                        <p style={{ fontSize:'0.78rem', color:'#f59e0b' }}>Bs. {montoBs(ent.precio)} - se paga en el complejo</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
  )
}
