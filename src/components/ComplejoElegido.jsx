import { Fragment } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * Envuelve las pantallas del complejo (/admin/...).
 *
 * El administrador del complejo pasa directo: ve el suyo. El super
 * administrador tiene que haber elegido antes qué complejo mirar; si no, se lo
 * manda a elegir. La clave hace que la pantalla se arme de nuevo al cambiar de
 * complejo: si no, se quedaría con las listas del anterior.
 */
export default function ComplejoElegido({ children }) {
  const { perfil, complejoVisto } = useAuth()
  if (perfil?.rol !== 'superadmin') return children
  if (!complejoVisto) return <Navigate to="/superadmin/complejo" replace />
  return <Fragment key={complejoVisto}>{children}</Fragment>
}
