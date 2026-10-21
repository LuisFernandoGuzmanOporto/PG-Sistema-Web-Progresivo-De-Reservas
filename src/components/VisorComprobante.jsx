import { useState, useEffect } from 'react'
import { enlaceFirmado, esPDF } from '../lib/archivos'

// ─────────────────────────────────────────────────────────────────────────────
// VER EL COMPROBANTE DE PAGO
//
// Lo usan las tres pantallas donde alguien decide si un pago vale: el
// administrador, el empleado y el organizador de un torneo. Antes cada una
// mostraba un emoji 🧾 y el monto, o sea que se aprobaba a ciegas.
//
// El archivo esta en el deposito cerrado, asi que no hay una direccion fija
// que se pueda poner en un <img>. Se pide un enlace firmado que caduca a los
// cinco minutos y se usa ese.
// ─────────────────────────────────────────────────────────────────────────────

export default function VisorComprobante({ ruta, alto = 260 }) {
  const [url, setUrl]       = useState(null)
  const [error, setError]   = useState(null)
  const [cargando, setCarg] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCarg(true); setError(null); setUrl(null)

    ;(async () => {
      const r = await enlaceFirmado(ruta)
      if (cancelado) return
      if (r.error) setError(r.error)
      else setUrl(r.url)
      setCarg(false)
    })()

    return () => { cancelado = true }
  }, [ruta])

  const marco = {
    border: '2px dashed #2a2a2a', borderRadius: 12, padding: 14,
    textAlign: 'center', marginBottom: 14, minHeight: 120,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  }

  if (cargando) {
    return (
      <div style={marco}>
        <p style={{ color: '#666', fontSize: '0.82rem' }}>Abriendo el comprobante…</p>
      </div>
    )
  }

  // No se disimula: si el archivo no esta, quien aprueba tiene que saberlo
  // antes de decidir, no despues.
  if (error) {
    return (
      <div style={{ ...marco, borderColor: 'rgba(245,158,11,0.4)',
        background: 'rgba(245,158,11,0.06)' }}>
        <p style={{ fontSize: '1.6rem' }}>⚠️</p>
        <p style={{ color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600 }}>
          No se puede ver el comprobante
        </p>
        <p style={{ color: '#888', fontSize: '0.76rem', lineHeight: 1.5, maxWidth: 340 }}>
          {error}
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2a2a',
        background: '#fff', height: alto }}>
        {esPDF(ruta)
          ? <iframe src={url} title="Comprobante de pago"
              style={{ width: '100%', height: '100%', border: 'none' }} />
          : <img src={url} alt="Comprobante de pago"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
      </div>

      {/* En el teléfono el recuadro queda chico para leer un monto */}
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 8, color: '#00BCD4',
          fontSize: '0.78rem', textDecoration: 'underline' }}>
        Verlo en grande
      </a>
    </div>
  )
}
