import { Component } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// SI ALGO FALLA
//
// Cuando una pantalla revienta al dibujarse, React desmonta TODO el arbol y
// deja la ventana en blanco. Sin esto, el usuario ve una pagina vacia y no
// sabe si se colgo, si perdio la conexion o si hizo algo mal.
//
// Tiene que ser una clase: los ganchos de error (componentDidCatch,
// getDerivedStateFromError) no existen como hook todavia.
// ─────────────────────────────────────────────────────────────────────────────

export default class SiAlgoFalla extends Component {
  state = { fallo: null }

  static getDerivedStateFromError(error) {
    return { fallo: error }
  }

  componentDidCatch(error, info) {
    // Queda en la consola para poder encontrarlo despues. Al usuario no se le
    // muestra: no le dice nada y lo asusta.
    console.error('Sportika — se rompió una pantalla:', error, info?.componentStack)
  }

  render() {
    if (!this.state.fallo) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24, background: '#0f0f0f',
        fontFamily: 'Outfit, system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: '2.6rem', marginBottom: 12 }}>😕</div>

          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.7rem',
            color: '#f5f5f5', marginBottom: 10, letterSpacing: 1 }}>
            Se nos rompió esta pantalla
          </h1>

          <p style={{ color: '#888', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 22 }}>
            No es algo que hayas hecho mal. Lo que ya habías guardado está a
            salvo: nada se pierde por esto.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '0.88rem',
                background: '#8B0000', border: '1px solid rgba(139,0,0,0.7)', color: '#fff' }}>
              Volver a cargar
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              style={{ padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem',
                background: 'transparent', border: '1px solid #333', color: '#aaa' }}>
              Ir al inicio
            </button>
          </div>

          <p style={{ color: '#444', fontSize: '0.72rem', marginTop: 20, lineHeight: 1.5 }}>
            Si te sigue pasando en el mismo lugar, contanos qué estabas haciendo
            justo antes.
          </p>
        </div>
      </div>
    )
  }
}
