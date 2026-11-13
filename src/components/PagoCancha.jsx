import { useState } from 'react'
import { urlPublica, revisarArchivo, subirComprobante, TIPOS_COMPROBANTE } from '../lib/archivos'
import { enviarComprobanteCancha } from '../lib/guardar'
import { montoBs } from '../lib/dinero'

// ─────────────────────────────────────────────────────────────────────────────
// PAGAR LA CANCHA DE UN TORNEO
//
// Cuando un cliente organiza un torneo, la cancha se la paga al complejo. Aquí
// ve el QR del complejo, el total, y elige la foto (o el PDF) del comprobante.
//
// Lo usan dos pantallas: el último paso de «Crear torneo», donde el archivo
// se guarda recién al enviar (el torneo todavía no existe), y la ficha del
// torneo, por si al crearlo no lo subió o la subida falló.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE = 10 * 1024 * 1024

/** Sube el comprobante a la carpeta del torneo y lo anota en la solicitud. */
export async function subirPagoDeCancha({ empresaId, torneoId, archivo }) {
  const sub = await subirComprobante({ carpeta: empresaId + '/torneos/' + torneoId, archivo })
  if (sub.error) return { error: sub.error }
  const g = await enviarComprobanteCancha({ torneoId, comprobante: sub.ruta })
  if (g.error) return { error: g.error }
  return { ruta: sub.ruta }
}

export default function PagoCancha({ empresa, total, archivo, onArchivo, error }) {
  const [aviso, setAviso] = useState(null)
  const qr = empresa?.qrPago ? urlPublica(empresa.qrPago) : null

  const elegir = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const problema = revisarArchivo(f, { tipos: TIPOS_COMPROBANTE, limite: LIMITE })
    if (problema) { setAviso(problema); return }
    setAviso(null)
    onArchivo(f)
  }

  return (
    <div id="campo-comprobante" tabIndex={-1} style={{ padding: 16, background: 'rgba(34,197,94,0.05)',
      border: '1px solid ' + (error ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.25)'), borderRadius: 12 }}>
      <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
        💳 Pago de la cancha a {empresa?.nombre}
      </p>
      <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 14 }}>
        La cancha se le paga al complejo. Paga con el QR y sube la foto del
        comprobante: el complejo lo revisa antes de aprobar.
      </p>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {qr ? (
          <img src={qr} alt={'QR de pago de ' + (empresa?.nombre || 'el complejo')}
            style={{ width: 170, height: 170, objectFit: 'contain', background: '#fff',
              borderRadius: 12, padding: 8, border: '1px solid #2a2a2a', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 170, minHeight: 120, padding: 12, borderRadius: 12, flexShrink: 0,
            background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ color: '#f59e0b', fontSize: '0.76rem', lineHeight: 1.5 }}>
              {empresa?.nombre} todavía no cargó su QR. Coordina el pago directamente con el complejo.
            </p>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: '0.74rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total a pagar</p>
          <p style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f59e0b', lineHeight: 1.1, marginBottom: 12 }}>
            Bs. {montoBs(total || 0)}
          </p>

          {archivo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'rgba(34,197,94,0.1)', borderRadius: 10 }}>
              <span style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600, flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ✓ {archivo.name}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onArchivo(null)}>Cambiar</button>
            </div>
          ) : (
            <label className="btn btn-outline" style={{ cursor: 'pointer', justifyContent: 'center' }}>
              📎 Subir comprobante
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={elegir} style={{ display: 'none' }} />
            </label>
          )}
          <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 6 }}>Foto o PDF · máx. 10 MB</p>
        </div>
      </div>

      {(aviso || error) && (
        <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 10 }}>{aviso || error}</p>
      )}
    </div>
  )
}

/**
 * En la ficha del torneo, mientras la cancha espera aprobación: si el
 * organizador todavía no mandó el comprobante, puede mandarlo desde aquí.
 */
export function PagoPendiente({ torneo, empresa, onEnviado }) {
  const sol = torneo.solicitud || {}
  const [archivo, setArchivo]   = useState(null)
  const [error, setError]       = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (sol.comprobante) {
    return (
      <p style={{ color: '#22c55e', fontSize: '0.8rem', marginTop: 8 }}>
        ✓ Ya enviaste el comprobante del pago de la cancha. El complejo lo revisa al aprobar.
      </p>
    )
  }
  if (!(Number(sol.costoTotal) > 0)) return null

  const enviar = async () => {
    if (!archivo) { setError('Elige primero la foto o el PDF del comprobante.'); return }
    setEnviando(true); setError(null)
    const r = await subirPagoDeCancha({ empresaId: torneo.empresa_id, torneoId: torneo.id, archivo })
    setEnviando(false)
    if (r.error) { setError(r.error); return }
    onEnviado(r.ruta)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <PagoCancha empresa={empresa} total={sol.costoTotal}
        archivo={archivo} error={error}
        onArchivo={(f) => { setArchivo(f); if (f) setError(null) }} />
      <button type="button" className="btn btn-primary" style={{ marginTop: 10 }}
        disabled={enviando || !archivo} onClick={enviar}>
        {enviando ? 'Enviando…' : '📩 Enviar comprobante al complejo'}
      </button>
    </div>
  )
}
