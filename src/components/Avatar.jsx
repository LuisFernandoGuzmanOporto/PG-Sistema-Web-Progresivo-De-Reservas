import { useEffect, useState } from 'react'
import { urlDeFoto } from '../lib/archivos'

/** 'Juan García' → 'JG'. Es lo que se ve mientras no haya foto. */
export const iniciales = (nombre) =>
  (nombre || '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

/**
 * La foto de perfil de alguien, o sus iniciales si no tiene.
 *
 * La foto puede ser una subida al sistema (avatares/<id>/...) o la de su
 * cuenta de Google. Si por algo no carga (la quitó de Google, sin conexión),
 * vuelven las iniciales en vez de quedar un cuadro roto.
 */
export default function Avatar({ nombre, foto, tam = 36, fondo = '#8B0000', className = '', style }) {
  const [rota, setRota] = useState(false)
  useEffect(() => { setRota(false) }, [foto])

  const url = rota ? null : urlDeFoto(foto)
  return (
    <div className={className}
      style={{ width: tam, height: tam, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: fondo,
        color: '#fff', fontWeight: 700, fontSize: Math.round(tam * 0.36), ...style }}>
      {url ? (
        // Google no entrega la foto si le llega de dónde viene la persona
        <img src={url} alt={'Foto de ' + (nombre || 'perfil')} referrerPolicy="no-referrer"
          onError={() => setRota(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : iniciales(nombre)}
    </div>
  )
}
