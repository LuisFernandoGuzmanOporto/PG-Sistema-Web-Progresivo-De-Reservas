import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

// ── DATOS DE EMPRESA (mock — vendrá de Supabase) ─────────────────────────────
const EMPRESAS = {
  1: { nombre: 'Sport Center',          deportes: ['Fútbol', 'Wally', 'Pádel'], canchas: ['Cancha Principal', 'Cancha Auxiliar', 'Cancha de Wally 1', 'Cancha de Pádel'] },
  2: { nombre: 'Gimnasio Central',      deportes: ['Básquetbol'],                canchas: ['Cancha de Baloncesto'] },
  3: { nombre: 'Zona Deportiva Sur',    deportes: ['Voleibol'],                  canchas: ['Cancha de Voleibol'] },
  4: { nombre: 'Complejo Deportivo Este', deportes: ['Wally'],                   canchas: ['Cancha de Wally 1', 'Cancha de Wally 2', 'Cancha de Wally 3'] },
  5: { nombre: 'Zona Deportiva Oeste',  deportes: ['Pádel'],                     canchas: ['Cancha de Pádel Principal'] },
}

// ── CONFIG DINÁMICA POR DEPORTE ───────────────────────────────────────────────
const DEPORTE_CONFIG = {
  'Fútbol': {
    emoji: '⚽',
    jugadoresTitulares: 11,
    suplentes: 3,
    tieneMinutos: true,
    tieneAmarillas: true,
    tieneRojas: true,
    tieneGoles: true,
    tienePuntos: false,
    formatoTiempo: 'tiempos',
    duracionDefault: 45,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa', 'Grupos + Eliminación'],
    reglasBase: [
      'Partidos de 90 minutos (2 tiempos de 45 min)',
      'En caso de empate en eliminatoria: penales',
      'Tarjeta roja = suspensión del siguiente partido',
      'Todos los jugadores deben ser mayores de 16 años',
    ],
  },
  'Básquetbol': {
    emoji: '🏀',
    jugadoresTitulares: 5,
    suplentes: 3,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'cuartos',
    duracionDefault: 10,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa'],
    reglasBase: [
      'Partidos de 4 cuartos de 10 minutos',
      'En caso de empate: tiempo extra de 5 minutos',
      'Mínimo 5 jugadores por equipo en cancha',
    ],
  },
  'Voleibol': {
    emoji: '🏐',
    jugadoresTitulares: 6,
    suplentes: 2,
    tieneMinutos: false,
    tieneAmarillas: true,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 25,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa', 'Grupos + Eliminación'],
    reglasBase: [
      'Sets a 25 puntos con ventaja de 2',
      'Set decisivo a 15 puntos',
      'Mínimo 3 mujeres en cancha (mixto)',
    ],
  },
  'Wally': {
    emoji: '🎾',
    jugadoresTitulares: 2,
    suplentes: 0,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 21,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa'],
    reglasBase: [
      'Modalidad dobles',
      'Partidos al mejor de 3 sets',
      'Set ganado a 21 puntos con ventaja de 2',
    ],
  },
  'Pádel': {
    emoji: '🏓',
    jugadoresTitulares: 2,
    suplentes: 0,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 6,
    formatos: ['Liga (todos contra todos)', 'Eliminación directa'],
    reglasBase: [
      'Modalidad dobles mixtos',
      'Partidos al mejor de 3 sets con tie-break',
      'Reglas oficiales de la FIP',
    ],
  },
  'Tenis': {
    emoji: '🎾',
    jugadoresTitulares: 2,
    suplentes: 0,
    tieneMinutos: false,
    tieneAmarillas: false,
    tieneRojas: false,
    tieneGoles: false,
    tienePuntos: true,
    formatoTiempo: 'sets',
    duracionDefault: 6,
    formatos: ['Eliminación directa'],
    reglasBase: [
      'Partidos al mejor de 3 sets con tie-break',
      'Reglas oficiales de la ITF',
    ],
  },
}

// Pasos del formulario
const PASOS = ['Deporte y Cancha', 'Formato y Fechas', 'Reglas y Equipos', 'Inscripción y QR', 'Confirmar']

export default function CrearTorneo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const empresa = EMPRESAS[Number(id)]

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [paso, setPaso] = useState(0)
  const [creado, setCreado] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    deporte: '',
    cancha: '',
    formato: '',
    maxEquipos: 8,
    fechaInicio: '',
    fechaFin: '',
    inscripcionHasta: '',
    horarios: '',
    precio: '',
    premioPrimero: '',
    premioSegundo: '',
    premioTercero: '',
    reglas: [],
    nuevaRegla: '',
    titulares: '',
    suplentes: '',
    qrFile: null,
    qrPreview: null,
    descripcion: '',
  })

  const cfg = DEPORTE_CONFIG[form.deporte]

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  // Cuando cambia el deporte, pre-llenar config
  const seleccionarDeporte = (dep) => {
    const c = DEPORTE_CONFIG[dep]
    setForm(f => ({
      ...f,
      deporte: dep,
      titulares: String(c.jugadoresTitulares),
      suplentes: String(c.suplentes),
      formato: c.formatos[0],
      reglas: [...c.reglasBase],
      cancha: '',
    }))
  }

  const agregarRegla = () => {
    if (!form.nuevaRegla.trim()) return
    setForm(f => ({ ...f, reglas: [...f.reglas, f.nuevaRegla.trim()], nuevaRegla: '' }))
  }

  const quitarRegla = (i) => setForm(f => ({ ...f, reglas: f.reglas.filter((_, idx) => idx !== i) }))

  const handleQR = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    set('qrFile', file)
    set('qrPreview', url)
  }

  const puedeAvanzar = () => {
    if (paso === 0) return form.deporte && form.cancha
    if (paso === 1) return form.nombre && form.formato && form.fechaInicio && form.fechaFin && form.inscripcionHasta
    if (paso === 2) return form.titulares && form.reglas.length > 0
    if (paso === 3) return form.precio && form.qrPreview
    return true
  }

  const confirmar = () => setCreado(true)

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────────
  if (creado) {
    return (
      <Layout role="user">
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏆</div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 8 }}>
            ¡Torneo Creado!
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 8 }}>
            <strong style={{ color: '#f5f5f5' }}>{form.nombre}</strong> fue publicado en {empresa?.nombre}.
          </p>
          <p style={{ color: '#666', fontSize: '0.82rem', marginBottom: 32 }}>
            Los equipos ya pueden ver tu torneo e inscribirse. Tú recibirás las solicitudes de inscripción y podrás aprobarlas o rechazarlas.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/app/torneos/1`)}
            >
              📋 Ver mi torneo
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate(`/app/empresa/${id}`)}
            >
              ← Volver a {empresa?.nombre}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // ── RENDER PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <Layout role="user">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
          style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem', marginBottom: 8 }}
        >
          ← Volver
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>
          Crear Torneo — {empresa?.nombre}
        </h1>
        <p style={{ color: '#666', fontSize: '0.82rem' }}>
          El torneo se publicará para que otros usuarios puedan inscribirse
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
        {PASOS.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < paso ? '#22c55e' : i === paso ? '#8B0000' : '#2a2a2a',
                color: i <= paso ? '#fff' : '#555',
                fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
                border: i === paso ? '2px solid #ff6b6b' : 'none',
                transition: 'all 0.2s',
              }}>
                {i < paso ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.65rem', color: i === paso ? '#ff6b6b' : i < paso ? '#22c55e' : '#555', whiteSpace: 'nowrap' }}>
                {p}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div style={{ width: 40, height: 1, background: i < paso ? '#22c55e' : '#2a2a2a', margin: '0 6px', marginBottom: 20, flexShrink: 0, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Contenedor del paso */}
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── PASO 0: Deporte y Cancha ── */}
        {paso === 0 && (
          <div>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 20, fontSize: '1.1rem' }}>
              ¿Qué deporte y en qué cancha?
            </h2>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Deporte</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {empresa?.deportes.map(dep => {
                  const c = DEPORTE_CONFIG[dep]
                  return (
                    <button
                      key={dep}
                      onClick={() => seleccionarDeporte(dep)}
                      style={{
                        padding: '16px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'Outfit',
                        background: form.deporte === dep ? 'rgba(139,0,0,0.25)' : '#1a1a1a',
                        border: `1px solid ${form.deporte === dep ? '#8B0000' : '#2a2a2a'}`,
                        color: form.deporte === dep ? '#ff6b6b' : '#888',
                        textAlign: 'center', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>{c?.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{dep}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>
                        {c?.jugadoresTitulares}v{c?.jugadoresTitulares}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {form.deporte && (
              <>
                {/* Info dinámica del deporte */}
                <div style={{ padding: '12px 16px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
                  <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}>
                    {cfg?.emoji} Config para {form.deporte}
                  </p>
                  <p style={{ color: '#888', fontSize: '0.78rem' }}>
                    {cfg?.jugadoresTitulares} jugadores por equipo
                    {cfg?.suplentes > 0 ? ` + ${cfg.suplentes} suplentes` : ''}
                    {cfg?.tieneAmarillas ? ' • Con tarjetas' : ''}
                    {cfg?.tienePuntos ? ' • Puntaje' : ' • Goles'}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Cancha donde se jugará</label>
                  <select className="input" value={form.cancha} onChange={e => set('cancha', e.target.value)}>
                    <option value="">Selecciona una cancha de {empresa?.nombre}</option>
                    {empresa?.canchas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PASO 1: Formato y Fechas ── */}
        {paso === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem' }}>
              {cfg?.emoji} Formato y fechas del torneo
            </h2>

            <div className="form-group">
              <label className="form-label">Nombre del torneo</label>
              <input
                className="input"
                placeholder={`Ej: Copa ${empresa?.nombre} ${form.deporte} 2025`}
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción breve</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Describe brevemente el torneo..."
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Formato de competencia</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cfg?.formatos.map(f => (
                  <button
                    key={f}
                    onClick={() => set('formato', f)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit',
                      background: form.formato === f ? 'rgba(139,0,0,0.2)' : '#1a1a1a',
                      border: `1px solid ${form.formato === f ? '#8B0000' : '#2a2a2a'}`,
                      color: form.formato === f ? '#ff6b6b' : '#888',
                      textAlign: 'left', fontWeight: form.formato === f ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {form.formato === f ? '● ' : '○ '}{f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Fecha de inicio</label>
                <input className="input" type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de fin</label>
                <input className="input" type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Inscripciones hasta</label>
              <input className="input" type="date" value={form.inscripcionHasta} onChange={e => set('inscripcionHasta', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Horarios de juego (opcional)</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Ej: Sábados 09:00-18:00, Domingos 09:00-15:00"
                value={form.horarios}
                onChange={e => set('horarios', e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ── PASO 2: Reglas y Equipos ── */}
        {paso === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem' }}>
              Reglas y composición de equipos
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Máx. equipos</label>
                <select className="input" value={form.maxEquipos} onChange={e => set('maxEquipos', Number(e.target.value))}>
                  {[4, 6, 8, 10, 12, 16, 20, 24, 32].map(n => <option key={n} value={n}>{n} equipos</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Titulares por equipo</label>
                <input
                  className="input" type="number" min={1} max={15}
                  value={form.titulares}
                  onChange={e => set('titulares', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Suplentes</label>
                <input
                  className="input" type="number" min={0} max={10}
                  value={form.suplentes}
                  onChange={e => set('suplentes', e.target.value)}
                />
              </div>
            </div>

            {/* Premios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="form-label">Premios (opcional)</label>
              {[
                { campo: 'premioPrimero', label: '🥇 1° lugar' },
                { campo: 'premioSegundo', label: '🥈 2° lugar' },
                { campo: 'premioTercero', label: '🥉 3° lugar' },
              ].map(({ campo, label }) => (
                <div key={campo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', color: '#888', minWidth: 80 }}>{label}</span>
                  <input
                    className="input"
                    placeholder="Ej: Trofeo + Bs. 500"
                    value={form[campo]}
                    onChange={e => set(campo, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Reglas */}
            <div>
              <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                Reglas del torneo ({form.reglas.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {form.reglas.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#bbb', flex: 1 }}>• {r}</span>
                    <button
                      onClick={() => quitarRegla(i)}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.9rem', marginLeft: 8, flexShrink: 0 }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Agregar una regla..."
                  value={form.nuevaRegla}
                  onChange={e => set('nuevaRegla', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarRegla()}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-outline"
                  onClick={agregarRegla}
                  style={{ flexShrink: 0 }}
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 3: Inscripción y QR ── */}
        {paso === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem' }}>
              Precio e inscripción
            </h2>

            <div className="form-group">
              <label className="form-label">Costo de inscripción por equipo (Bs.)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>Bs.</span>
                <input
                  className="input"
                  type="number" min={0}
                  placeholder="Ej: 200"
                  value={form.precio}
                  onChange={e => set('precio', e.target.value)}
                  style={{ fontSize: '1.1rem' }}
                />
              </div>
              {form.precio === '0' && (
                <p style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: 4 }}>✓ Torneo gratuito</p>
              )}
            </div>

            {/* QR de pago */}
            <div className="form-group">
              <label className="form-label">Tu código QR de pago</label>
              <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 12 }}>
                Los equipos que se inscriban verán este QR para realizar el pago. Sube una imagen clara de tu QR.
              </p>

              {form.qrPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={form.qrPreview}
                    alt="QR de pago"
                    style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 12, border: '1px solid #2a2a2a', background: '#fff', padding: 8 }}
                  />
                  <button
                    onClick={() => { set('qrFile', null); set('qrPreview', null) }}
                    style={{
                      position: 'absolute', top: -8, right: -8, width: 24, height: 24,
                      borderRadius: '50%', background: '#ef4444', border: 'none',
                      color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 30, border: '2px dashed #2a2a2a', borderRadius: 12,
                  cursor: 'pointer', color: '#555', transition: 'all 0.15s',
                  background: '#1a1a1a',
                }}>
                  <span style={{ fontSize: '2.5rem' }}>📱</span>
                  <span style={{ fontWeight: 600, color: '#888' }}>Subir imagen del QR</span>
                  <span style={{ fontSize: '0.72rem', color: '#555' }}>PNG, JPG o PDF • Máx 5MB</span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleQR} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
              <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>💡 ¿Cómo funciona la inscripción?</p>
              <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.6 }}>
                1. Un equipo ve tu torneo y presiona "Inscribirse"<br />
                2. Ven tu QR y realizan el pago<br />
                3. Suben foto de su comprobante<br />
                4. Tú revisas y apruebas o rechazas la inscripción<br />
                5. Los aprobados aparecen en la tabla del torneo
              </p>
            </div>
          </div>
        )}

        {/* ── PASO 4: Resumen / Confirmar ── */}
        {paso === 4 && (
          <div>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>
              Resumen del torneo
            </h2>

            {/* Card resumen */}
            <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'rgba(139,0,0,0.15)', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f5f5f5' }}>{form.nombre}</p>
                  <p style={{ fontSize: '0.78rem', color: '#666' }}>{cfg?.emoji} {form.deporte} • {empresa?.nombre}</p>
                </div>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f59e0b' }}>Bs. {form.precio}</span>
              </div>
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Cancha', value: form.cancha },
                  { label: 'Formato', value: form.formato.split('(')[0].trim() },
                  { label: 'Máx. equipos', value: `${form.maxEquipos} equipos` },
                  { label: 'Por equipo', value: `${form.titulares} titulares + ${form.suplentes} suplentes` },
                  { label: 'Inicio', value: form.fechaInicio },
                  { label: 'Fin', value: form.fechaFin },
                  { label: 'Inscripciones hasta', value: form.inscripcionHasta },
                  { label: 'Reglas', value: `${form.reglas.length} reglas definidas` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: '0.85rem', color: '#bbb', fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
              {form.premioPrimero && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a2a' }}>
                  <p style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>🏅 Premios</p>
                  {form.premioPrimero && <p style={{ fontSize: '0.78rem', color: '#bbb' }}>🥇 {form.premioPrimero}</p>}
                  {form.premioSegundo && <p style={{ fontSize: '0.78rem', color: '#999' }}>🥈 {form.premioSegundo}</p>}
                  {form.premioTercero && <p style={{ fontSize: '0.78rem', color: '#999' }}>🥉 {form.premioTercero}</p>}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ fontSize: '0.8rem', color: '#22c55e' }}>
                ✓ Tu torneo se publicará inmediatamente en la página de {empresa?.nombre} y estará visible para todos los usuarios de Sportika.
              </p>
            </div>
          </div>
        )}

        {/* ── Navegación entre pasos ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'space-between' }}>
          <button
            className="btn btn-outline"
            onClick={() => paso === 0 ? navigate(-1) : setPaso(p => p - 1)}
          >
            {paso === 0 ? '✕ Cancelar' : '← Atrás'}
          </button>

          {paso < 4 ? (
            <button
              className="btn btn-primary"
              disabled={!puedeAvanzar()}
              style={{ opacity: puedeAvanzar() ? 1 : 0.4 }}
              onClick={() => setPaso(p => p + 1)}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={confirmar}
              style={{ background: '#22c55e', border: 'none' }}
            >
              🏆 Publicar Torneo
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}
