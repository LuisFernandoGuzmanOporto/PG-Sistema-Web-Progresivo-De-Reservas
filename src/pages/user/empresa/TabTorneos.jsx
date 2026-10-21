import { ESTADO_TORNEO, estadoDeTorneo, conteoEquipos, aceptaInscripciones } from '../../../lib/datos'

// ─────────────────────────────────────────────────────────────────────────────
// Pestaña «Torneos» de la ficha de un complejo.
//
// Sale de EmpresaDetalle, que tenía 1.570 líneas: con seis pestañas y cuatro
// modales adentro, encontrar algo era leer el archivo entero.
//
// handleAccion envuelve lo que un visitante sin cuenta no puede hacer: si no
// inició sesión, lo manda a iniciarla en vez de dejarlo llegar hasta el final
// y fallar ahí.
// ─────────────────────────────────────────────────────────────────────────────

export default function TabTorneos({ torneos, empresaId, navigate, handleAccion }) {
  return (
    <div>
      <div style={{ marginBottom:16, display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => handleAccion(() => navigate('/app/empresa/'+empresaId+'/crear-torneo'))}
          style={{ padding:'10px 18px', background:'rgba(139,0,0,0.15)', border:'1px solid rgba(139,0,0,0.4)', borderRadius:10, color:'#ff6b6b', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:'Outfit' }}>
          Crear Torneo aquí
        </button>
      </div>

      {torneos.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">T</div><h3>Sin torneos activos</h3></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {torneos.map(t => (
            <div key={t.id} className="card">
              <div className="card-body">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#f5f5f5', lineHeight:1.3 }}>{t.nombre}</h3>
                  <span className="badge" style={{ flexShrink:0, marginLeft:8, background:estadoDeTorneo(t).bg, color:estadoDeTorneo(t).color }}>{estadoDeTorneo(t).corto}</span>
                </div>
                <p style={{ fontSize:'0.78rem', color:'#666', marginBottom:10 }}>{t.desc}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:10 }}>
                  <p style={{ fontSize:'0.78rem', color:'#666' }}>{t.fechaInicio} - {t.fechaFin}</p>
                  <p style={{ fontSize:'0.78rem', color:'#666' }}>{conteoEquipos(t)} equipos</p>
                  <p style={{ fontSize:'0.78rem', color:'#666' }}>Hasta {t.inscripcionHasta}</p>
                </div>
                <div style={{ padding:'6px 10px', background:'rgba(245,158,11,0.08)', borderRadius:8, marginBottom:12 }}>
                  <p style={{ fontSize:'0.75rem', color:'#f59e0b', fontWeight:600 }}>{t.premios.primero}</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-outline btn-sm w-full" style={{ justifyContent:'center' }} onClick={() => navigate('/app/torneos/'+t.id)}>Ver Detalles</button>
                  {aceptaInscripciones(t) ? (
                    <button className="btn btn-primary btn-sm w-full" style={{ justifyContent:'center' }} onClick={() => handleAccion(() => navigate('/app/torneos/'+t.id+'/inscribir'))}>Inscribirse</button>
                  ) : (
                    <button className="btn btn-primary btn-sm w-full" style={{ justifyContent:'center' }} onClick={() => navigate('/app/torneos/'+t.id+'/en-vivo')}>🔴 Ver en Vivo</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
