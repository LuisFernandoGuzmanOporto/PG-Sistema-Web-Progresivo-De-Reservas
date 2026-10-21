// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMAR ALGO QUE NO SE PUEDE DESHACER
//
// Reemplaza a window.confirm. El confirm del navegador no se puede peinar, en
// el celular aparece con la direccion del sitio arriba y parece un aviso de
// seguridad ajeno a la aplicacion. Ademas no deja explicar QUE va a pasar:
// solo entra una linea.
//
// El boton que confirma es el que puede doler, asi que va en rojo y a la
// derecha, y el que cancela queda primero: si alguien toca sin leer, cancela.
// ─────────────────────────────────────────────────────────────────────────────

export default function Confirmar({ abierto, titulo, detalle, textoSi = 'Sí, hacerlo',
                                    textoNo = 'Cancelar', onSi, onNo, trabajando }) {
  if (!abierto) return null

  return (
    <div className="modal-overlay" onClick={onNo}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f5f5f5',
          marginBottom: 8, letterSpacing: 0.5 }}>
          {titulo}
        </h2>

        {detalle && (
          <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
            {detalle}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onNo} disabled={trabajando}
            style={{ flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.86rem',
              background: 'transparent', border: '1px solid #333', color: '#aaa' }}>
            {textoNo}
          </button>
          <button onClick={onSi} disabled={trabajando}
            style={{ flex: 1, padding: '11px', borderRadius: 10,
              cursor: trabajando ? 'wait' : 'pointer',
              fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.86rem',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.45)',
              color: '#ef4444' }}>
            {trabajando ? 'Un momento…' : textoSi}
          </button>
        </div>
      </div>
    </div>
  )
}
