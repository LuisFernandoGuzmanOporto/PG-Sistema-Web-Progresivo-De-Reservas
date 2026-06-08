import { useState } from 'react'
import Layout from '../../components/layout/Layout'

// ── Generador de código único ──────────────────────────────────────────────
const generarCodigo = (tipo) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  if (tipo === 'descuento_reserva') return `SPORT-DESC-${rand(4)}`
  if (tipo === 'torneo_gratis')    return `SPORT-TRN-${rand(4)}`
  return null // fisico: sin código
}

// ── Datos mock ─────────────────────────────────────────────────────────────
const RECOMPENSAS = [
  { id: 1, titulo: 'Prioridad en Reservas',    desc: 'Obtén prioridad para reservar canchas en horarios de alta demanda', puntos: 30,  icon: '📅', disponible: true,  tipo: 'fisico',            empresa: 'Sport Center' },
  { id: 2, titulo: 'Refresco Gratis',          desc: 'Canjea por un refresco gratis en la cafetería',                     puntos: 50,  icon: '🥤', disponible: true,  tipo: 'fisico',            empresa: 'Sport Center' },
  { id: 3, titulo: 'Descuento 20% en Reserva', desc: '20% de descuento en tu próxima reserva de cancha',                 puntos: 80,  icon: '🏷️', disponible: true,  tipo: 'descuento_reserva', empresa: 'Sport Center' },
  { id: 4, titulo: 'Hora Gratis de Cancha',    desc: 'Una hora completamente gratis en cualquier cancha disponible',     puntos: 150, icon: '🎁', disponible: false, tipo: 'descuento_reserva', empresa: 'Gimnasio Central' },
  { id: 5, titulo: 'Inscripción Gratis Torneo',desc: 'Inscripción sin costo al próximo torneo de tu elección',          puntos: 200, icon: '🏆', disponible: true,  tipo: 'torneo_gratis',     empresa: 'Sport Center' },
]

const HISTORIAL_PUNTOS = [
  { concepto: 'Participación en torneo', puntos: '+15', fecha: '28/05/2026', icon: '🏆' },
  { concepto: 'Reserva completada',      puntos: '+5',  fecha: '25/05/2026', icon: '📅' },
  { concepto: 'Partido espontáneo',      puntos: '+10', fecha: '20/05/2026', icon: '⚽' },
  { concepto: 'Reserva completada',      puntos: '+5',  fecha: '15/05/2026', icon: '📅' },
  { concepto: 'Registro en plataforma',  puntos: '+20', fecha: '01/05/2026', icon: '🎉' },
]

const CANJES_INIT = [
  {
    id: 1,
    recompensa: 'Descuento 20% en Reserva',
    icon: '🏷️',
    tipo: 'descuento_reserva',
    empresa: 'Sport Center',
    codigo: 'SPORT-DESC-7K2M',
    estado: 'utilizado',
    fecha: '10/05/2026',
    puntosGastados: 80,
  },
]

const NIVELES = [
  { nivel: 'Principiante', rango: '0-100 pts',  color: '#22c55e' },
  { nivel: 'Intermedio',   rango: '101-250 pts', color: '#00BCD4' },
  { nivel: 'Experto',      rango: '251+ pts',    color: '#f59e0b' },
]

const COMO_GANAR = [
  { accion: 'Reservar canchas',       pts: '5 pts'  },
  { accion: 'Completar reservas',     pts: '5 pts'  },
  { accion: 'Participar en partidos', pts: '10 pts' },
  { accion: 'Inscribirse en torneos', pts: '15 pts' },
]

// ── Helpers visuales ───────────────────────────────────────────────────────
const TIPO_LABEL = {
  descuento_reserva: { label: 'Descuento en reserva', color: '#00BCD4', icon: '🏷️' },
  torneo_gratis:     { label: 'Inscripción gratis',    color: '#a78bfa', icon: '🏆' },
  fisico:            { label: 'Premio físico',          color: '#f59e0b', icon: '🎁' },
}

export default function Recompensas() {
  const [puntos, setPuntos]             = useState(75)
  const [canjes, setCanjes]             = useState(CANJES_INIT)
  const [tab, setTab]                   = useState('catalogo') // catalogo | miscanjes | historial
  const [showConfirm, setShowConfirm]   = useState(null)  // recompensa a canjear
  const [showExito, setShowExito]       = useState(null)  // canje exitoso con código
  const [copiado, setCopiado]           = useState(false)

  const nivelActual = puntos <= 100 ? 'Principiante' : puntos <= 250 ? 'Intermedio' : 'Experto'
  const puntosParaSig = puntos <= 100 ? 100 - puntos : puntos <= 250 ? 250 - puntos : 0
  const nivelColor = NIVELES.find(n => n.nivel === nivelActual)?.color ?? '#22c55e'

  // ── Confirmar canje ──────────────────────────────────────────────────────
  const confirmarCanje = () => {
    if (!showConfirm) return
    const codigo = generarCodigo(showConfirm.tipo)
    const nuevoCanje = {
      id: Date.now(),
      recompensa:      showConfirm.titulo,
      icon:            showConfirm.icon,
      tipo:            showConfirm.tipo,
      empresa:         showConfirm.empresa,
      codigo,
      estado:          'disponible',
      fecha:           new Date().toLocaleDateString('es-BO'),
      puntosGastados:  showConfirm.puntos,
    }
    setPuntos(p => p - showConfirm.puntos)
    setCanjes(prev => [nuevoCanje, ...prev])
    setShowConfirm(null)
    setShowExito(nuevoCanje)
  }

  // ── Copiar código ────────────────────────────────────────────────────────
  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo).catch(() => {})
    setCopiado(codigo)
    setTimeout(() => setCopiado(false), 2000)
  }

  const canjesDisponibles = canjes.filter(c => c.estado === 'disponible' && c.codigo)

  return (
    <Layout role="user">
      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>⭐ Recompensas</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Gana puntos participando en la plataforma y canjéalos por beneficios reales</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

        {/* ── Panel lateral: mis puntos ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', marginBottom: 16 }}>Mis Puntos</h3>

            {/* Círculo de puntos */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={nivelColor} strokeWidth="8"
                    strokeDasharray={`${Math.min((puntos / 250) * 283, 283)} 283`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', lineHeight: 1 }}>{puntos}</span>
                  <span style={{ fontSize: '0.65rem', color: '#666' }}>puntos</span>
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', color: '#888', fontSize: '0.78rem', marginBottom: 4 }}>
              Nivel: <span style={{ color: nivelColor, fontWeight: 700 }}>{nivelActual}</span>
            </p>
            <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((puntos / 250) * 100, 100)}%`, background: nivelColor, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            {puntosParaSig > 0 && (
              <p style={{ textAlign: 'center', color: '#555', fontSize: '0.72rem', marginBottom: 16 }}>{puntosParaSig} pts más para el siguiente nivel</p>
            )}

            <div className="divider" />

            <p style={{ color: '#888', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>Cómo ganar más puntos:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {COMO_GANAR.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#666' }}>✓ {item.accion}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{item.pts}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            <p style={{ color: '#888', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>Niveles:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {NIVELES.map((n, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: nivelActual === n.nivel ? n.color : '#444', fontWeight: nivelActual === n.nivel ? 700 : 400 }}>
                    {nivelActual === n.nivel ? '▶ ' : ''}{n.nivel}
                  </span>
                  <span style={{ color: '#555' }}>{n.rango}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini alerta si hay canjes disponibles */}
          {canjesDisponibles.length > 0 && (
            <div
              style={{ padding: '12px 16px', background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.25)', borderRadius: 10, cursor: 'pointer' }}
              onClick={() => setTab('miscanjes')}
            >
              <p style={{ color: '#00BCD4', fontSize: '0.8rem', fontWeight: 700, marginBottom: 2 }}>
                🎟️ {canjesDisponibles.length} código{canjesDisponibles.length > 1 ? 's' : ''} disponible{canjesDisponibles.length > 1 ? 's' : ''}
              </p>
              <p style={{ color: '#666', fontSize: '0.72rem' }}>Toca para ver tus códigos</p>
            </div>
          )}
        </div>

        {/* ── Panel principal ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20 }}>
            {[
              { key: 'catalogo',   label: '🎁 Catálogo' },
              { key: 'miscanjes',  label: `🎟️ Mis Canjes${canjesDisponibles.length ? ` (${canjesDisponibles.length})` : ''}` },
              { key: 'historial',  label: '📋 Historial de Puntos' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 20px',
                background: tab === t.key ? 'rgba(139,0,0,0.2)' : 'transparent',
                color: tab === t.key ? '#ff6b6b' : '#666',
                border: 'none',
                borderBottom: tab === t.key ? '2px solid #8B0000' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── TAB: CATÁLOGO ── */}
          {tab === 'catalogo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {RECOMPENSAS.map(r => {
                const puedeComprar = r.disponible && puntos >= r.puntos
                const tipoInfo = TIPO_LABEL[r.tipo]
                return (
                  <div key={r.id} className="card" style={{ padding: 16, opacity: puedeComprar ? 1 : 0.5, position: 'relative', overflow: 'visible' }}>
                    {/* Badge puntos */}
                    <div style={{ position: 'absolute', top: -8, right: 10, background: '#f59e0b', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                      {r.puntos} pts
                    </div>

                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{r.icon}</div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 2 }}>{r.titulo}</h4>
                    {/* Empresa */}
                    <p style={{ fontSize: '0.72rem', color: '#00BCD4', fontWeight: 600, marginBottom: 4 }}>🏢 {r.empresa}</p>
                    <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.4, marginBottom: 8 }}>{r.desc}</p>

                    {/* Badge tipo */}
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: `${tipoInfo.color}18`, color: tipoInfo.color, display: 'inline-block', marginBottom: 10 }}>
                      {tipoInfo.icon} {tipoInfo.label}
                    </span>

                    <button
                      className={`btn btn-sm w-full ${puedeComprar ? 'btn-primary' : 'btn-outline'}`}
                      style={{ justifyContent: 'center', fontSize: '0.78rem' }}
                      onClick={() => puedeComprar && setShowConfirm(r)}
                      disabled={!puedeComprar}
                    >
                      {puedeComprar ? 'Canjear recompensa' : `Necesitas ${r.puntos - puntos} pts más`}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB: MIS CANJES ── */}
          {tab === 'miscanjes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {canjes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎟️</div>
                  <p style={{ fontSize: '0.88rem' }}>Aún no has canjeado ninguna recompensa</p>
                </div>
              )}
              {canjes.map(c => {
                const tipoInfo = TIPO_LABEL[c.tipo]
                const disponible = c.estado === 'disponible'
                return (
                  <div key={c.id} className="card" style={{ padding: 18, borderLeft: `3px solid ${disponible ? tipoInfo.color : '#444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 2 }}>{c.recompensa}</p>
                          <p style={{ fontSize: '0.72rem', color: '#00BCD4', fontWeight: 600, marginBottom: 2 }}>🏢 {c.empresa}</p>
                          <p style={{ fontSize: '0.72rem', color: '#555', marginBottom: 6 }}>Canjeado el {c.fecha} · {c.puntosGastados} pts</p>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: `${tipoInfo.color}18`, color: tipoInfo.color }}>
                            {tipoInfo.icon} {tipoInfo.label}
                          </span>
                        </div>
                      </div>
                      {/* Estado */}
                      <span style={{
                        flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: disponible ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                        color: disponible ? '#22c55e' : '#555',
                      }}>
                        {disponible ? '✅ Disponible' : '✔ Utilizado'}
                      </span>
                    </div>

                    {/* Código (solo para canjes digitales) */}
                    {c.codigo && (
                      <div style={{ marginTop: 14, padding: '10px 14px', background: disponible ? 'rgba(0,188,212,0.06)' : 'rgba(255,255,255,0.03)', border: `1px dashed ${disponible ? 'rgba(0,188,212,0.3)' : '#2a2a2a'}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: '0.68rem', color: '#555', marginBottom: 4 }}>
                            {c.tipo === 'descuento_reserva' ? 'Ingresa este código al hacer tu reserva' : 'Ingresa este código al inscribir tu equipo'}
                          </p>
                          <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: disponible ? '#00BCD4' : '#444', letterSpacing: 3 }}>
                            {c.codigo}
                          </p>
                        </div>
                        {disponible && (
                          <button
                            className="btn btn-sm"
                            style={{ flexShrink: 0, background: copiado === c.codigo ? 'rgba(34,197,94,0.15)' : 'rgba(0,188,212,0.12)', color: copiado === c.codigo ? '#22c55e' : '#00BCD4', border: `1px solid ${copiado === c.codigo ? 'rgba(34,197,94,0.3)' : 'rgba(0,188,212,0.3)'}`, padding: '6px 14px', fontSize: '0.78rem' }}
                            onClick={() => copiarCodigo(c.codigo)}
                          >
                            {copiado === c.codigo ? '✅ Copiado' : '📋 Copiar código'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Premio físico */}
                    {!c.codigo && (
                      <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.05)', border: '1px dashed rgba(245,158,11,0.2)', borderRadius: 8 }}>
                        <p style={{ fontSize: '0.75rem', color: '#888' }}>
                          🎁 Premio físico — preséntate en las instalaciones con tu usuario registrado para retirarlo.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB: HISTORIAL PUNTOS ── */}
          {tab === 'historial' && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5', marginBottom: 16 }}>📋 Historial de Puntos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {HISTORIAL_PUNTOS.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <div>
                        <p style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 500 }}>{item.concepto}</p>
                        <p style={{ fontSize: '0.72rem', color: '#555' }}>{item.fecha}</p>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#22c55e' }}>{item.puntos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL: CONFIRMAR CANJE ══════════════════════════════════════════ */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Canje</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(null)}>✕</button>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 10 }}>{showConfirm.icon}</div>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 4 }}>{showConfirm.titulo}</h3>
              <p style={{ color: '#00BCD4', fontSize: '0.78rem', fontWeight: 600, marginBottom: 8 }}>🏢 {showConfirm.empresa}</p>
              <p style={{ color: '#666', fontSize: '0.84rem', marginBottom: 18 }}>{showConfirm.desc}</p>

              {/* Tipo badge */}
              <div style={{ marginBottom: 18 }}>
                {showConfirm.tipo === 'descuento_reserva' && (
                  <p style={{ color: '#00BCD4', fontSize: '0.8rem', padding: '8px 14px', background: 'rgba(0,188,212,0.08)', borderRadius: 8, display: 'inline-block' }}>
                    🏷️ Se generará un <strong>código de descuento</strong> para usar en tu próxima reserva
                  </p>
                )}
                {showConfirm.tipo === 'torneo_gratis' && (
                  <p style={{ color: '#a78bfa', fontSize: '0.8rem', padding: '8px 14px', background: 'rgba(167,139,250,0.08)', borderRadius: 8, display: 'inline-block' }}>
                    🏆 Se generará un <strong>código de inscripción</strong> gratis para usar en un torneo
                  </p>
                )}
                {showConfirm.tipo === 'fisico' && (
                  <p style={{ color: '#f59e0b', fontSize: '0.8rem', padding: '8px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, display: 'inline-block' }}>
                    🎁 Premio físico — retíralo en las instalaciones mostrando tu usuario
                  </p>
                )}
              </div>

              {/* Puntos antes/después */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20, padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#555', fontSize: '0.7rem' }}>Tus puntos</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#22c55e' }}>{puntos}</p>
                </div>
                <div style={{ color: '#333', fontSize: '1.4rem', alignSelf: 'center' }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#555', fontSize: '0.7rem' }}>Después del canje</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f59e0b' }}>{puntos - showConfirm.puntos}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowConfirm(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={confirmarCanje}>✅ Confirmar Canje</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CANJE EXITOSO + CÓDIGO ══════════════════════════════════ */}
      {showExito && (
        <div className="modal-overlay" onClick={() => setShowExito(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#f5f5f5', marginBottom: 6 }}>¡Canje Exitoso!</h2>
            <p style={{ color: '#666', fontSize: '0.84rem', marginBottom: 20 }}>{showExito.recompensa}</p>

            {/* Código generado */}
            {showExito.codigo ? (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>🏢 {showExito.empresa}</p>
                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 10 }}>
                  {showExito.tipo === 'descuento_reserva'
                    ? `Ingresa este código al reservar en ${showExito.empresa} para aplicar el descuento:`
                    : `Ingresa este código al inscribir tu equipo en un torneo de ${showExito.empresa}:`}
                </p>
                <div style={{ padding: '14px 20px', background: 'rgba(0,188,212,0.08)', border: '2px dashed rgba(0,188,212,0.4)', borderRadius: 12, marginBottom: 12 }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#00BCD4', letterSpacing: 4 }}>{showExito.codigo}</p>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: copiado === showExito.codigo ? 'rgba(34,197,94,0.15)' : 'rgba(0,188,212,0.12)', color: copiado === showExito.codigo ? '#22c55e' : '#00BCD4', border: `1px solid ${copiado === showExito.codigo ? 'rgba(34,197,94,0.3)' : 'rgba(0,188,212,0.3)'}`, padding: '8px 20px', fontSize: '0.82rem', marginBottom: 4 }}
                  onClick={() => copiarCodigo(showExito.codigo)}
                >
                  {copiado === showExito.codigo ? '✅ Código copiado' : '📋 Copiar código'}
                </button>
                <p style={{ color: '#444', fontSize: '0.72rem', marginTop: 8 }}>
                  También puedes encontrar el código en la sección <strong style={{ color: '#f5f5f5' }}>Mis Canjes</strong>
                </p>
              </div>
            ) : (
              <div style={{ padding: '14px 20px', background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: 12, marginBottom: 20 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.82rem' }}>🎁 Preséntate en las instalaciones con tu usuario registrado para retirar tu premio.</p>
              </div>
            )}

            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => { setShowExito(null); setTab('miscanjes') }}>
              Ver en Mis Canjes
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
