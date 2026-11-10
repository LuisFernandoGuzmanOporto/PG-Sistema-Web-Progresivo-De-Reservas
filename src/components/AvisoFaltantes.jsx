// ─────────────────────────────────────────────────────────────────────────────
// AVISOS JUSTO ARRIBA DEL BOTÓN DE GUARDAR
//
// Lo que falta completar se dice UNA sola vez: debajo de su campo, que queda
// marcado en rojo (ver Validacion.jsx), y la pantalla lleva sola al primero.
// Antes, además, se repetía todo en un resumen amarillo arriba del botón; eran
// dos validaciones para lo mismo y se quitó (pedido de Fernando, noviembre de
// 2026). Por eso aquí ya no se muestra lo que tiene su propio campo.
//
// Sí se muestra:
//   - lo que falta y NO tiene un campo donde decirlo (un texto suelto, sin
//     { campo }), para que nunca quede algo pendiente sin explicar;
//   - lo que rechazó el servidor, en rojo: no es un dato que falte completar
//     sino algo que no se pudo hacer, como guardar sin conexión.
// ─────────────────────────────────────────────────────────────────────────────

const normalizar = (f) => (typeof f === 'string' ? { texto: f } : f)

export default function AvisoFaltantes({ faltantes = [], error = null }) {
  // Lo que tiene campo ya se ve debajo de ese campo
  const sueltos = faltantes.filter(Boolean).map(normalizar).filter(f => f.texto && !f.campo)
  if (!sueltos.length && !error) return null

  return (
    <>
      {sueltos.map((f, i) => (
        <div key={i} role="alert" style={{
          padding: '12px 14px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
        }}>
          <p style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>⚠ {f.texto}</p>
        </div>
      ))}

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
