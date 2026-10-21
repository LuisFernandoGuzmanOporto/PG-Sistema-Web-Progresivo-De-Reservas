import { useNavigate } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINAS LEGALES: Política de Privacidad y Términos de Servicio
//
// Son públicas a propósito. El login dice que al continuar se aceptan las
// dos, así que tienen que existir de verdad, y Google pide la dirección de la
// política de privacidad para publicar el inicio de sesión con Google.
//
// Cada página pasa su título y sus secciones; aquí solo se arma cómo se ven.
// Un párrafo puede ser texto, un elemento de React o una lista (un arreglo).
// ─────────────────────────────────────────────────────────────────────────────

export const CORREO_SOPORTE = 'vicholucho8@gmail.com'
export const ACTUALIZADA = '20 de octubre de 2026'

export const Correo = () => (
  <a href={`mailto:${CORREO_SOPORTE}`} style={{ color: '#00BCD4' }}>{CORREO_SOPORTE}</a>
)

const estilos = {
  pagina: { minHeight: '100vh', background: '#0f0f0f', color: '#c8c8c8', fontFamily: 'Outfit, sans-serif' },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '16px 20px', borderBottom: '1px solid #1a1a1a', background: '#0a0a0a',
  },
  cuerpo: { maxWidth: 760, margin: '0 auto', padding: '32px 20px 56px', lineHeight: 1.7, fontSize: '0.95rem' },
  titulo: { fontFamily: 'Bebas Neue', fontSize: '2.4rem', color: '#f5f5f5', letterSpacing: 1, lineHeight: 1.1 },
  fecha: { color: '#777', fontSize: '0.82rem', margin: '6px 0 22px' },
  subtitulo: { fontFamily: 'Bebas Neue', fontSize: '1.35rem', color: '#00BCD4', letterSpacing: 1, margin: '28px 0 8px' },
  parrafo: { margin: '0 0 10px' },
  lista: { margin: '0 0 10px', paddingLeft: 22 },
  pie: {
    display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center',
    padding: '24px 20px', borderTop: '1px solid #1a1a1a', background: '#0a0a0a', fontSize: '0.85rem',
  },
  enlacePie: { color: '#777', cursor: 'pointer' },
}

export default function PaginaLegal({ titulo, intro, secciones }) {
  const navigate = useNavigate()
  const volver = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <div style={estilos.pagina}>
      <header style={estilos.cabecera}>
        <a className="logo" onClick={() => navigate('/')} style={{ fontSize: '1.4rem', cursor: 'pointer' }}>
          SPORT<span>IKA</span>
        </a>
        <button className="btn btn-outline" onClick={volver}>Volver</button>
      </header>

      <main style={estilos.cuerpo}>
        <h1 style={estilos.titulo}>{titulo}</h1>
        <p style={estilos.fecha}>Última actualización: {ACTUALIZADA}</p>
        <p style={estilos.parrafo}>{intro}</p>

        {secciones.map(([subtitulo, parrafos]) => (
          <section key={subtitulo}>
            <h2 style={estilos.subtitulo}>{subtitulo}</h2>
            {parrafos.map((p, i) => Array.isArray(p)
              ? <ul key={i} style={estilos.lista}>{p.map((item, j) => <li key={j}>{item}</li>)}</ul>
              : <p key={i} style={estilos.parrafo}>{p}</p>)}
          </section>
        ))}
      </main>

      <footer style={estilos.pie}>
        <a onClick={() => navigate('/')} style={estilos.enlacePie}>Inicio</a>
        <a onClick={() => navigate('/privacidad')} style={estilos.enlacePie}>Política de Privacidad</a>
        <a onClick={() => navigate('/terminos')} style={estilos.enlacePie}>Términos de Servicio</a>
      </footer>
    </div>
  )
}
