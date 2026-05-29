import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

// Configuración por deporte: cuántos titulares, suplentes y posiciones disponibles
const SPORT_CONFIG = {
  'Fútbol': {
    titulares: 11,
    suplentes: 3,
    posiciones: ['Portero', 'Defensa', 'Lateral Derecho', 'Lateral Izquierdo', 'Mediocampista', 'Volante', 'Extremo', 'Delantero', 'Otro'],
    labelEquipo: 'Nombre del Equipo',
    infoComposicion: '11 titulares + hasta 3 suplentes',
  },
  'Básquetbol': {
    titulares: 5,
    suplentes: 3,
    posiciones: ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot', 'Otro'],
    labelEquipo: 'Nombre del Equipo',
    infoComposicion: '5 titulares + hasta 3 suplentes',
  },
  'Voleibol': {
    titulares: 6,
    suplentes: 2,
    posiciones: ['Armador', 'Opuesto', 'Receptor', 'Central', 'Líbero', 'Otro'],
    labelEquipo: 'Nombre del Equipo',
    infoComposicion: '6 titulares + hasta 2 suplentes',
  },
  'Wally': {
    titulares: 2,
    suplentes: 0,
    posiciones: [],
    labelEquipo: 'Nombre de la Pareja / Dupla',
    infoComposicion: 'Modalidad dobles — 2 jugadores',
  },
  'Tenis': {
    titulares: 2,
    suplentes: 0,
    posiciones: [],
    labelEquipo: 'Nombre de la Pareja / Dupla',
    infoComposicion: 'Modalidad dobles — 2 jugadores',
  },
  'Pádel': {
    titulares: 2,
    suplentes: 0,
    posiciones: [],
    labelEquipo: 'Nombre de la Pareja / Dupla',
    infoComposicion: 'Modalidad dobles — 2 jugadores',
  },
}

const TORNEOS = [
  { id: 1, nombre: 'Copa Sportika Fútbol 2025', deporteKey: 'Fútbol', precio: 200, empresa: 'Sport Center' },
  { id: 2, nombre: 'Liga de Baloncesto Sportika', deporteKey: 'Básquetbol', precio: 150, empresa: 'Gimnasio Central' },
  { id: 3, nombre: 'Championship Wally Cup', deporteKey: 'Wally', precio: 100, empresa: 'Complejo Deportivo Este' },
  { id: 4, nombre: 'Torneo de Voleibol Sportika', deporteKey: 'Voleibol', precio: 120, empresa: 'Sport Center' },
  { id: 5, nombre: 'Open de Tenis Sportika', deporteKey: 'Tenis', precio: 80, empresa: 'Zona Deportiva Oeste' },
]

const playerEmpty = () => ({ nombre: '', posicion: '' })

export default function InscribirEquipo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const torneo = TORNEOS.find(t => t.id === Number(id))
  const config = torneo ? SPORT_CONFIG[torneo.deporteKey] : null

  const [nombreEquipo, setNombreEquipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [capitan, setCapitan] = useState({ nombre: '', telefono: '', ci: '' })
  const [jugadores, setJugadores] = useState(
    config ? Array.from({ length: config.titulares }, playerEmpty) : []
  )
  const [suplentes, setSuplentes] = useState(
    config ? Array.from({ length: config.suplentes }, playerEmpty) : []
  )
  const [experiencia, setExperiencia] = useState('')
  const [expectativas, setExpectativas] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!torneo || !config) {
    return (
      <Layout role="user">
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <h3>Torneo no encontrado</h3>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>
      </Layout>
    )
  }

  const updateJugador = (lista, setLista, index, field, value) => {
    setLista(prev => prev.map((j, i) => i === index ? { ...j, [field]: value } : j))
  }

  const handleSubmit = () => setSubmitted(true)

  // ── PANTALLA DE CONFIRMACIÓN ──
  if (submitted) {
    return (
      <Layout role="user">
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#22c55e', marginBottom: 8 }}>
            ¡Equipo Inscrito!
          </h1>
          <p style={{ color: '#888', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 24 }}>
            Tu equipo <strong style={{ color: '#f5f5f5' }}>{nombreEquipo}</strong> ha sido inscrito correctamente en{' '}
            <strong style={{ color: '#f5f5f5' }}>{torneo.nombre}</strong>.
          </p>

          <div style={{ padding: 20, background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 14, marginBottom: 24, textAlign: 'left' }}>
            <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>💳 Siguiente paso — Pago con QR</p>
            <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12 }}>
              Para confirmar tu inscripción, realiza el pago de{' '}
              <strong style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>Bs. {torneo.precio}</strong>{' '}
              al organizador mediante código QR y sube el comprobante.
            </p>
            {/* Placeholder QR */}
            <div style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: 28, textAlign: 'center', marginBottom: 12 }}>
              <p style={{ color: '#555', fontSize: '0.82rem', marginBottom: 8 }}>📷 Código QR del organizador</p>
              <p style={{ color: '#444', fontSize: '0.75rem' }}>{torneo.empresa}</p>
            </div>
            <button className="btn btn-accent w-full" style={{ color: '#000', justifyContent: 'center' }}>
              📎 Subir Comprobante de Pago
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => navigate('/app/inicio')}>
              Ir al Inicio
            </button>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${id}`)}>
              Ver Detalles del Torneo
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // ── FORMULARIO DE INSCRIPCIÓN ──
  return (
    <Layout role="user">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
          style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem' }}
        >
          ← Volver
        </button>
        <span style={{ color: '#444', fontSize: '0.82rem', marginLeft: 8 }}>Inscribir Equipo</span>
      </div>

      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', marginBottom: 6 }}>
        👥 Inscribir Equipo
      </h1>

      {/* Banner del torneo */}
      <div style={{
        background: 'rgba(0,188,212,0.06)',
        border: '1px solid rgba(0,188,212,0.2)',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem' }}>Inscribiendo en: {torneo.nombre}</p>
          <p style={{ color: '#666', fontSize: '0.8rem', marginTop: 2 }}>
            {torneo.deporteKey} • {config.infoComposicion}
          </p>
        </div>
        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f59e0b' }}>Bs. {torneo.precio}</span>
      </div>

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── SECCIÓN 1: Información del Equipo ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>🏆 Información del Equipo</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">{config.labelEquipo} *</label>
              <input
                className="input"
                placeholder={torneo.deporteKey === 'Fútbol' ? 'Ej: Los Cracks FC' : 'Ej: Dúo Imparable'}
                value={nombreEquipo}
                onChange={e => setNombreEquipo(e.target.value)}
              />
            </div>
            {config.titulares > 2 && (
              <div className="form-group">
                <label className="form-label">Descripción del Equipo (opcional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Describe tu equipo, experiencia, objetivos, etc."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── SECCIÓN 2: Información del Capitán / Contacto ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>
            {config.titulares > 2 ? '👤 Información del Capitán' : '👤 Información del Responsable'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre Completo *</label>
              <input
                className="input"
                placeholder="Tu nombre completo"
                value={capitan.nombre}
                onChange={e => setCapitan(p => ({ ...p, nombre: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono / WhatsApp *</label>
              <input
                className="input"
                placeholder="Ej: 71234567"
                value={capitan.telefono}
                onChange={e => setCapitan(p => ({ ...p, telefono: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">C.I. (Carnet de Identidad)</label>
              <input
                className="input"
                placeholder="Ej: 12345678"
                value={capitan.ci}
                onChange={e => setCapitan(p => ({ ...p, ci: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 3: Lista de Jugadores (Titulares) ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem' }}>
              {config.titulares > 2 ? `📋 Lista de Jugadores (${config.titulares}/${config.titulares + config.suplentes})` : '📋 Jugadores'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {jugadores.map((j, i) => (
              <div key={i}>
                <p style={{ fontSize: '0.78rem', color: '#555', fontWeight: 600, marginBottom: 8 }}>
                  Jugador {i + 1} {i === 0 && config.titulares > 2 ? '(Capitán)' : ''} *
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: config.posiciones.length > 0 ? '2fr 1.5fr 1.5fr' : '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Nombre Completo</label>
                    <input
                      className="input"
                      placeholder="Nombre del jugador"
                      value={j.nombre}
                      onChange={e => updateJugador(jugadores, setJugadores, i, 'nombre', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>C.I.</label>
                    <input
                      className="input"
                      placeholder="Ej: 12345678"
                      value={j.ci || ''}
                      onChange={e => updateJugador(jugadores, setJugadores, i, 'ci', e.target.value)}
                    />
                  </div>
                  {config.posiciones.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Posición</label>
                      <select
                        className="input"
                        value={j.posicion}
                        onChange={e => updateJugador(jugadores, setJugadores, i, 'posicion', e.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {config.posiciones.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Aviso composición */}
          <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(0,188,212,0.05)', border: '1px solid rgba(0,188,212,0.1)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.75rem', color: '#00BCD4' }}>
              Composición: {config.infoComposicion}
            </p>
          </div>
        </div>

        {/* ── SECCIÓN 4: Suplentes (solo si el deporte los requiere) ── */}
        {config.suplentes > 0 && (
          <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
            <p style={{ color: '#888', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>
              🔄 Suplentes (hasta {config.suplentes})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {suplentes.map((j, i) => (
                <div key={i}>
                  <p style={{ fontSize: '0.78rem', color: '#555', fontWeight: 600, marginBottom: 8 }}>Suplente {i + 1}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: config.posiciones.length > 0 ? '2fr 1.5fr 1.5fr' : '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Nombre Completo</label>
                      <input
                        className="input"
                        placeholder="Nombre del suplente"
                        value={j.nombre}
                        onChange={e => updateJugador(suplentes, setSuplentes, i, 'nombre', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>C.I.</label>
                      <input
                        className="input"
                        placeholder="Ej: 12345678"
                        value={j.ci || ''}
                        onChange={e => updateJugador(suplentes, setSuplentes, i, 'ci', e.target.value)}
                      />
                    </div>
                    {config.posiciones.length > 0 && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Posición</label>
                        <select
                          className="input"
                          value={j.posicion}
                          onChange={e => updateJugador(suplentes, setSuplentes, i, 'posicion', e.target.value)}
                        >
                          <option value="">Seleccionar</option>
                          {config.posiciones.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECCIÓN 5: Información Adicional ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <p style={{ color: '#888', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>📝 Información Adicional</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Experiencia del Equipo</label>
              <select className="input" value={experiencia} onChange={e => setExperiencia(e.target.value)}>
                <option value="">Selecciona el nivel</option>
                <option>Principiantes (primer torneo)</option>
                <option>Intermedio (1-3 torneos)</option>
                <option>Avanzado (más de 3 torneos)</option>
                <option>Competitivo (torneos oficiales)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expectativas</label>
              <select className="input" value={expectativas} onChange={e => setExpectativas(e.target.value)}>
                <option value="">¿Qué esperas del torneo?</option>
                <option>Divertirse y conocer gente</option>
                <option>Ganar experiencia</option>
                <option>Competir para ganar</option>
                <option>Entrenar para torneos mayores</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── BOTÓN ENVIAR ── */}
        <button
          className="btn btn-primary w-full"
          style={{ justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
          onClick={handleSubmit}
        >
          👥 Inscribir Equipo en {torneo.nombre}
        </button>
        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.75rem', marginTop: -10 }}>
          Al inscribir tu equipo, aceptas las reglas del torneo y te comprometes a participar.
        </p>
      </div>
    </Layout>
  )
}
