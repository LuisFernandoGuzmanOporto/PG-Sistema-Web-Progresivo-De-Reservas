import { useNavigate } from 'react-router-dom'
import { useAuth, INICIO_POR_ROL } from '../lib/auth'

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA NO ENCONTRADA
//
// Se muestra cuando alguien abre un enlace que ya no existe o escribe mal la
// dirección. No se repite la dirección en pantalla: al usuario no le sirve y
// no se ve bien. La sesión no se toca: cada uno vuelve a su propio inicio
// (el cliente a su tablero, el complejo a su panel, el empleado al mostrador).
// ─────────────────────────────────────────────────────────────────────────────

export default function PaginaInexistente() {
  const navigate = useNavigate()
  const { autenticado, perfil, cargando } = useAuth()

  const inicio = autenticado ? (INICIO_POR_ROL[perfil?.rol] || '/app/dashboard') : '/'
  const hayHistorial = typeof window !== 'undefined' && window.history.length > 1

  // Mientras se lee la sesión no se sabe a qué inicio ofrecer volver
  if (cargando) return <div style={{ minHeight: '100vh', background: '#0f0f0f' }} />

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      padding: 24, textAlign: 'center', background: '#0f0f0f',
    }}>
      <span style={{ fontFamily: 'Bebas Neue', fontSize: '4.5rem', color: '#e53935', lineHeight: 1, letterSpacing: 2 }}>404</span>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', letterSpacing: 1 }}>
        Página no encontrada
      </h1>
      <p style={{ color: '#9a9a9a', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 420 }}>
        La página que buscas no está disponible o el enlace ya no es válido.
        {autenticado && ' Tu sesión sigue activa.'}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
        <button className="btn btn-primary" onClick={() => navigate(inicio, { replace: true })}>
          {autenticado ? 'Ir a mi inicio' : 'Ir al inicio'}
        </button>
        {hayHistorial && (
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            Volver a la página anterior
          </button>
        )}
      </div>
    </div>
  )
}
