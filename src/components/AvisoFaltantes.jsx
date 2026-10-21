import { irAlCampo } from './Validacion'

// ─────────────────────────────────────────────────────────────────────────────
// RESUMEN DE LO QUE FALTA PARA PODER CONTINUAR
//
// Va siempre justo arriba del botón, con todo lo pendiente junto, para que no
// se pase nada por alto aunque el campo haya quedado fuera de la vista. Cada
// punto puede indicar su campo ({ campo, texto }): entonces se puede tocar y
// lleva a ese campo, que además está marcado en rojo con su mensaje debajo
// (ver Validacion.jsx).
//
// Lo que rechazó el servidor se muestra aparte, en rojo: no es un dato que
// falte completar sino algo que no se pudo hacer.
// ─────────────────────────────────────────────────────────────────────────────

const normalizar = (f) => (typeof f === 'string' ? { texto: f } : f)

export default function AvisoFaltantes({ faltantes = [], error = null, titulo }) {
  const lista = faltantes.filter(Boolean).map(normalizar).filter(f => f.texto)
  if (!lista.length && !error) return null

  const item = (f) => f.campo ? (
    <button type="button" onClick={() => irAlCampo(f.campo)}
      // verticalAlign: con dos líneas, la viñeta de la lista queda en la primera
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', verticalAlign: 'top',
               color: 'inherit', font: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3,
               textDecorationColor: 'rgba(245,158,11,0.5)' }}>
      {f.texto}
    </button>
  ) : f.texto

  return (
    <>
      {lista.length > 0 && (
        <div role="alert" style={{
          padding: '12px 14px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
        }}>
          {lista.length === 1 ? (
            <p style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>⚠ {item(lista[0])}</p>
          ) : (
            <>
              <p style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                {titulo || (lista.length === 1 ? 'Revisa este dato antes de continuar:' : `Revisa ${lista.length} datos antes de continuar:`)}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {lista.map((f, i) => (
                  <li key={i} style={{ color: '#bbb', fontSize: '0.78rem', lineHeight: 1.6 }}>{item(f)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {error && (
        <div role="alert" style={{
          padding: '12px 14px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
        }}>
          <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>✕ {error}</p>
        </div>
      )}
    </>
  )
}
