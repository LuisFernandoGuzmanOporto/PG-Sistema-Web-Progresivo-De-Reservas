import { useState } from 'react'
import Avatar from './Avatar'
import { useAuth, fotoDeGoogle } from '../lib/auth'
import { subirPublico, borrarPublico } from '../lib/archivos'
import { guardarFotoDePerfil } from '../lib/guardar'
import { USUARIO_ACTUAL } from '../lib/datos'

const boton = {
  padding: '7px 12px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600,
  fontFamily: 'Outfit', cursor: 'pointer', background: 'transparent',
}

/**
 * La foto de perfil y lo que se puede hacer con ella: subir una, cambiarla,
 * quitarla o volver a la de la cuenta de Google. La usan el cliente (Mi Perfil)
 * y el personal (Mi cuenta).
 *
 * La foto se guarda en avatares/<id>/ (solo esa persona puede escribir ahí,
 * migraciones/039). Primero se sube la nueva y se guarda en el perfil; recién
 * después se borra la anterior, para no quedarse sin foto si algo falla.
 */
export default function FotoDePerfil({ tam = 80, centrada = true }) {
  const { perfil, sesion, recargarPerfil } = useAuth()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError]       = useState(null)
  const [aviso, setAviso]       = useState(null)

  const actual   = perfil?.avatar_url || null
  const google   = fotoDeGoogle(sesion?.user)
  const subida   = actual && !/^https:\/\//.test(actual)
  const usaGoogle = Boolean(actual && google && actual === google)

  /** Guarda la foto nueva y, si la anterior era una subida, la borra. */
  const cambiar = async (nueva, mensaje) => {
    setError(null); setAviso(null)
    const g = await guardarFotoDePerfil(nueva)
    if (g.error) { setError(g.error); return false }
    if (subida && actual !== nueva) await borrarPublico(actual)
    USUARIO_ACTUAL.foto = nueva || null
    await recargarPerfil()
    setAviso(mensaje)
    return true
  }

  const elegir = async (archivo) => {
    if (!archivo || !perfil?.id) return
    setError(null); setAviso(null); setSubiendo(true)
    const r = await subirPublico({ carpeta: 'avatares/' + perfil.id, archivo })
    if (r.error) { setSubiendo(false); setError(r.error); return }
    const ok = await cambiar(r.ruta, 'Listo, tu foto quedó guardada.')
    // Si no quedó en el perfil, el archivo no sirve: no se deja suelto
    if (!ok) await borrarPublico(r.ruta)
    setSubiendo(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: centrada ? 'column' : 'row', alignItems: 'center',
      gap: centrada ? 10 : 16, marginBottom: centrada ? 16 : 0 }}>
      <Avatar nombre={perfil?.nombre} foto={actual} tam={tam} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: centrada ? 'center' : 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: centrada ? 'center' : 'flex-start' }}>
          <label style={{ ...boton, border: '1px solid rgba(0,188,212,0.4)', color: '#00BCD4',
            cursor: subiendo ? 'wait' : 'pointer' }}>
            {subiendo ? 'Subiendo…' : actual ? '📷 Cambiar foto' : '📷 Subir foto'}
            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
              disabled={subiendo} aria-label="Elegir una foto de perfil"
              onChange={e => { elegir(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {google && !usaGoogle && (
            <button type="button" style={{ ...boton, border: '1px solid #333', color: '#bbb' }}
              onClick={() => cambiar(google, 'Listo, ahora usas la foto de tu cuenta de Google.')}>
              Usar mi foto de Google
            </button>
          )}
          {actual && (
            <button type="button" style={{ ...boton, border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}
              onClick={() => cambiar(null, 'Quitamos tu foto. Ahora se ven tus iniciales.')}>
              Quitar foto
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.7rem', color: '#555', textAlign: centrada ? 'center' : 'left' }}>
          JPG, PNG o WEBP, hasta 5 MB.
        </p>
        {aviso && <p style={{ fontSize: '0.75rem', color: '#22c55e' }}>✓ {aviso}</p>}
        {error && <p style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</p>}
      </div>
    </div>
  )
}
