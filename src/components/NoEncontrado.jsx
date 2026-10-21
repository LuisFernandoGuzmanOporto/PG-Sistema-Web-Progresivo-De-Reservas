import { useNavigate } from 'react-router-dom'
import Layout from './layout/Layout'

// ─────────────────────────────────────────────────────────────────────────────
// LO QUE BUSCABAS NO ESTA
//
// Pasa cuando alguien abre un enlace viejo, o cuando lo que estaba mirando se
// borro mientras tanto (un torneo cancelado, un complejo dado de baja).
//
// Antes dos pantallas resolvian esto asi:
//
//     const TORNEO = torneoPorId(id) || TORNEOS[0]
//
// Es decir: si no encontraban el torneo, mostraban OTRO. El que abria el
// enlace creia estar viendo el suyo. En la mesa tecnica era peor todavia,
// porque los goles se le cargaban al torneo equivocado.
//
// Mejor decir que no esta y ofrecer la salida.
// ─────────────────────────────────────────────────────────────────────────────

export default function NoEncontrado({ role = 'user', que = 'Esto', volverA = '/', textoVolver = 'Volver' }) {
  const navigate = useNavigate()

  return (
    <Layout role={role}>
      <div className="empty-state" style={{ padding: '48px 20px' }}>
        <div className="empty-state-icon">🔍</div>
        <h3 style={{ marginBottom: 8 }}>{que} no está disponible</h3>
        <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
          Es posible que el enlace haya caducado o que se haya dado de baja.
          Tu sesión sigue activa.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 20 }}
          onClick={() => navigate(volverA)}>
          {textoVolver}
        </button>
      </div>
    </Layout>
  )
}
