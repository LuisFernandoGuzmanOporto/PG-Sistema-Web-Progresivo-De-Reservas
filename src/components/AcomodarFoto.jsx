import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ACOMODAR UNA FOTO ANTES DE SUBIRLA
//
// En vez de pedir una foto de un tamaño exacto (nadie sabe qué son 1200 × 600
// píxeles, y la foto del celular se subía igual y se recortaba a ciegas), el
// dueño ve un recuadro con la forma exacta en que se va a mostrar, arrastra la
// foto para elegir qué parte se ve y la acerca o aleja.
//
// Al confirmar, la foto se recorta aquí mismo, en el navegador, con un canvas:
// se sube solo la parte elegida y a la medida justa. Una foto de celular de
// 3 a 5 MB queda en unos 150 KB, y la lista de complejos carga más rápido.
//
// No usa ninguna librería: arrastrar, acercar y recortar son pocas cuentas.
// ─────────────────────────────────────────────────────────────────────────────

/** Las dos formas que se usan hoy. */
export const FORMAS = {
  // La portada de la tarjeta en la lista de complejos (más ancha que alta)
  portada: {
    aspecto: 2, ancho: 1200, alto: 600, tipo: 'image/jpeg', calidad: 0.85, minimo: 800,
    // La foto siempre llena el recuadro: no quedan bordes vacíos en la tarjeta
    entera: false, boton: 'Usar esta foto',
    titulo: 'Acomoda la foto del complejo',
    ayuda: 'Así se verá en la lista de complejos. Arrastra la foto para elegir qué parte se ve: las canchas, la entrada o la fachada.',
  },
  // El logo, cuadrado, adentro de la ficha del complejo
  logo: {
    aspecto: 1, ancho: 512, alto: 512, tipo: 'image/png', calidad: 1, minimo: 256,
    // Un logo casi nunca es cuadrado: se puede alejar hasta verlo entero, y lo
    // que sobra queda transparente (en la ficha se ve sobre fondo blanco)
    entera: true, boton: 'Usar este logo',
    titulo: 'Acomoda el logo',
    ayuda: 'Así se verá en la ficha de tu complejo. Deja el logo entero y centrado.',
  },
}

const ZOOM_MAX = 4

export default function AcomodarFoto({ archivo, forma = 'portada', onListo, onCancelar }) {
  const f = FORMAS[forma] || FORMAS.portada
  const marco = useRef(null)
  const arrastre = useRef(null)

  const [img, setImg] = useState(null)          // la imagen cargada
  const [errorCarga, setErrorCarga] = useState(null)
  const [anchoMarco, setAnchoMarco] = useState(480)
  const [zoom, setZoom] = useState(1)            // 1 = la foto justo cubre el recuadro
  const [pos, setPos] = useState({ x: 0, y: 0 }) // esquina de la foto dentro del recuadro, en px
  const [guardando, setGuardando] = useState(false)

  const altoMarco = anchoMarco / f.aspecto

  // ── Cargar la foto elegida ──────────────────────────────────────────────
  useEffect(() => {
    if (!archivo) return
    // «vivo»: si el efecto se deshace antes de que la imagen cargue (React en
    // desarrollo lo monta dos veces), esa carga vieja ya no avisa nada. Sin
    // esto salía «No pudimos abrir esa imagen» aunque la foto se veía bien.
    let vivo = true
    setErrorCarga(null)
    const url = URL.createObjectURL(archivo)
    const i = new Image()
    i.onload = () => { if (vivo) setImg(i) }
    i.onerror = () => { if (vivo) setErrorCarga('No pudimos abrir esa imagen. Prueba con otra (JPG, PNG o WEBP).') }
    i.src = url
    return () => { vivo = false; URL.revokeObjectURL(url) }
  }, [archivo])

  // ── El recuadro se adapta al ancho de la pantalla (celular o computadora) ─
  useLayoutEffect(() => {
    const medir = () => { if (marco.current) setAnchoMarco(marco.current.parentElement.clientWidth) }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  // La escala que hace que la foto cubra justo el recuadro, por el zoom elegido
  const escalaBase = img ? Math.max(anchoMarco / img.naturalWidth, altoMarco / img.naturalHeight) : 1
  const escala = escalaBase * zoom
  const anchoFoto = img ? img.naturalWidth * escala : 0
  const altoFoto = img ? img.naturalHeight * escala : 0

  // El zoom más chico: 1 (la foto cubre el recuadro) o, para el logo, el que
  // lo deja entero adentro
  const zoomMin = img && f.entera
    ? Math.min(anchoMarco / img.naturalWidth, altoMarco / img.naturalHeight) / escalaBase
    : 1

  /**
   * Que la foto nunca deje un hueco vacío dentro del recuadro. Si es más chica
   * que el recuadro (un logo alejado), queda centrada en ese sentido.
   */
  const limitar = (p, aF = anchoFoto, hF = altoFoto) => ({
    x: aF <= anchoMarco ? (anchoMarco - aF) / 2 : Math.min(0, Math.max(anchoMarco - aF, p.x)),
    y: hF <= altoMarco ? (altoMarco - hF) / 2 : Math.min(0, Math.max(altoMarco - hF, p.y)),
  })

  // Al abrir (o si cambia el tamaño del recuadro), la foto va centrada
  useEffect(() => {
    if (!img) return
    // La foto empieza cubriendo el recuadro; el logo, entero
    const cubre = Math.max(anchoMarco / img.naturalWidth, altoMarco / img.naturalHeight)
    const entra = Math.min(anchoMarco / img.naturalWidth, altoMarco / img.naturalHeight)
    const s = f.entera ? entra : cubre
    setZoom(s / cubre)
    setPos({ x: (anchoMarco - img.naturalWidth * s) / 2, y: (altoMarco - img.naturalHeight * s) / 2 })
  }, [img, anchoMarco]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Acercar o alejar sin perder el centro de lo que se está mirando. */
  const cambiarZoom = (nuevo) => {
    if (!img) return
    const z = Math.min(ZOOM_MAX, Math.max(zoomMin, nuevo))
    const cx = anchoMarco / 2, cy = altoMarco / 2
    const factor = z / zoom
    const aF = img.naturalWidth * escalaBase * z
    const hF = img.naturalHeight * escalaBase * z
    setZoom(z)
    setPos(limitar({ x: cx - (cx - pos.x) * factor, y: cy - (cy - pos.y) * factor }, aF, hF))
  }

  // ── Arrastrar con el dedo o el mouse ────────────────────────────────────
  const alBajar = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, inicio: pos }
  }
  const alMover = (e) => {
    const a = arrastre.current
    if (!a) return
    setPos(limitar({ x: a.inicio.x + (e.clientX - a.x), y: a.inicio.y + (e.clientY - a.y) }))
  }
  const alSoltar = () => { arrastre.current = null }

  // Con el teclado: flechas para mover, + y - para acercar
  const alTeclado = (e) => {
    const paso = e.shiftKey ? 40 : 10
    const mov = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] }[e.key]
    if (mov) { e.preventDefault(); setPos(p => limitar({ x: p.x + mov[0], y: p.y + mov[1] })) }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); cambiarZoom(zoom + 0.2) }
    if (e.key === '-') { e.preventDefault(); cambiarZoom(zoom - 0.2) }
  }

  // ── Recortar y entregar el archivo listo para subir ─────────────────────
  const confirmar = async () => {
    if (!img) return
    setGuardando(true)
    const lienzo = document.createElement('canvas')
    lienzo.width = f.ancho
    lienzo.height = f.alto
    const ctx = lienzo.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    if (f.tipo === 'image/jpeg') { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, f.ancho, f.alto) }
    // Se dibuja la foto entera tal como está en el recuadro, agrandada a la
    // medida final: lo que queda fuera del lienzo se corta solo. Sirve igual
    // para una foto que sobresale (portada) que para un logo que queda chico.
    const k = f.ancho / anchoMarco
    ctx.drawImage(img, pos.x * k, pos.y * k, anchoFoto * k, altoFoto * k)

    const blob = await new Promise(ok => lienzo.toBlob(ok, f.tipo, f.calidad))
    setGuardando(false)
    if (!blob) { setErrorCarga('No se pudo preparar la imagen. Prueba con otra.'); return }
    const ext = f.tipo === 'image/png' ? 'png' : 'jpg'
    const base = String(archivo.name || 'foto').replace(/\.[^.]+$/, '')
    onListo(new File([blob], `${base}.${ext}`, { type: f.tipo }))
  }

  // Una foto chica se puede usar, pero se avisa que puede verse borrosa
  const pequena = img && Math.min(img.naturalWidth / f.aspecto, img.naturalHeight) * f.aspecto < f.minimo

  return (
    <div className="modal-overlay" onClick={onCancelar} style={{ zIndex: 400 }}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={f.titulo}>
        <div className="modal-header" style={{ marginBottom: 10 }}>
          <h2 className="modal-title" style={{ fontSize: '1.4rem' }}>{f.titulo}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelar} aria-label="Cerrar">✕</button>
        </div>
        <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 14 }}>{f.ayuda}</p>

        <div style={{ width: '100%' }}>
          <div ref={marco} tabIndex={0} onKeyDown={alTeclado}
            onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
            aria-label="Recuadro de la foto: arrástrala para acomodarla"
            style={{
              width: anchoMarco, height: altoMarco, position: 'relative', overflow: 'hidden',
              borderRadius: forma === 'logo' ? 18 : 12, background: forma === 'logo' ? '#fff' : '#111',
              border: '2px solid #00BCD4', cursor: arrastre.current ? 'grabbing' : 'grab',
              touchAction: 'none', userSelect: 'none', outline: 'none', margin: '0 auto',
            }}>
            {img && (
              <img src={img.src} alt="" draggable={false}
                style={{ position: 'absolute', left: pos.x, top: pos.y, width: anchoFoto, height: altoFoto,
                  maxWidth: 'none', pointerEvents: 'none' }} />
            )}
            {!img && !errorCarga && (
              <p style={{ color: '#666', fontSize: '0.84rem', position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Abriendo la imagen…</p>
            )}
            {/* Líneas guía de tercios, para encuadrar mejor */}
            {img && (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(to right, transparent 33.2%, rgba(255,255,255,0.25) 33.3%, transparent 33.5%, transparent 66.5%, rgba(255,255,255,0.25) 66.6%, transparent 66.8%), linear-gradient(to bottom, transparent 33.2%, rgba(255,255,255,0.25) 33.3%, transparent 33.5%, transparent 66.5%, rgba(255,255,255,0.25) 66.6%, transparent 66.8%)' }} />
            )}
          </div>
        </div>

        {/* Acercar y alejar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarZoom(zoom - 0.25)}
            aria-label="Alejar" disabled={!img || zoom <= zoomMin + 0.001}>➖</button>
          <input type="range" min={zoomMin} max={ZOOM_MAX} step={0.01} value={zoom} disabled={!img}
            onChange={e => cambiarZoom(Number(e.target.value))} aria-label="Acercar o alejar la foto"
            style={{ flex: 1, accentColor: '#00BCD4' }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarZoom(zoom + 0.25)}
            aria-label="Acercar" disabled={!img || zoom >= ZOOM_MAX}>➕</button>
        </div>
        <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 6 }}>
          Arrastra la foto con el dedo o el mouse · acerca o aleja con la barra
        </p>

        {pequena && (
          <p role="status" style={{ color: '#f59e0b', fontSize: '0.78rem', lineHeight: 1.5, marginTop: 10 }}>
            ⚠ Esta imagen es pequeña ({img.naturalWidth} × {img.naturalHeight}) y puede verse borrosa.
            Si tienes una más grande, mejor; si no, puedes usarla igual.
          </p>
        )}
        {errorCarga && (
          <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 10 }}>{errorCarga}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="button" className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
            onClick={confirmar} disabled={!img || guardando}>
            {guardando ? 'Preparando…' : f.boton}
          </button>
        </div>
      </div>
    </div>
  )
}
