import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import { catalogoRecompensas, NIVELES as NIVELES_BASE, nivelDe,
         FORMAS_DE_GANAR_PUNTOS, USUARIO_ACTUAL, canjesDeCliente,
         registrarCanje, empresaPorId, TIPO_RECOMPENSA,
         PUNTOS_HISTORIAL, quedanDe, comoUsarCanje } from '../../lib/datos'
import { guardarCanje } from '../../lib/guardar'
import { useAuth } from '../../lib/auth'


// Los canjes de este cliente, del mismo registro que ven el complejo y su
// personal. Se traducen los nombres de dos campos para el diseno de la tarjeta.
const aTarjeta = (c) => ({
  id: c.id, recompensa: c.recompensa, tipo: c.tipo, codigo: c.codigo,
  estado: c.estado, fecha: c.fecha, puntosGastados: c.puntos,
  empresa: empresaPorId(c.empresa_id)?.nombre || '',
  icon: TIPO_RECOMPENSA[c.tipo]?.icon || '🎁',
})

const COLOR_NIVEL = ['#22c55e', '#00BCD4', '#f59e0b']

const NIVELES = NIVELES_BASE.map((n, i) => ({
  nivel: n.nombre,
  rango: n.hasta === Infinity ? n.desde + '+ pts' : n.desde + '-' + n.hasta + ' pts',
  color: COLOR_NIVEL[i],
}))

const COMO_GANAR = FORMAS_DE_GANAR_PUNTOS.map(f => ({ accion: f.accion, pts: f.puntos + ' pts' }))

// ── Helpers visuales ───────────────────────────────────────────────────────
const TIPO_LABEL = {
  descuento_reserva: { label: 'Descuento en reserva', color: '#00BCD4', icon: '🏷️' },
  torneo_gratis:     { label: 'Inscripción gratis',    color: '#a78bfa', icon: '🏆' },
  fisico:            { label: 'Premio físico',          color: '#f59e0b', icon: '🎁' },
}

export default function Recompensas() {
  // Para que los puntos de la cabecera bajen apenas se canjea
  const { recargarPerfil } = useAuth()
  const [puntos, setPuntos]             = useState(USUARIO_ACTUAL.puntos)
  const [canjes, setCanjes]             = useState(canjesDeCliente().map(aTarjeta))
  const [tab, setTab]                   = useState('catalogo') // catalogo | miscanjes | historial

  // Se calcula DENTRO del componente, no al cargar el archivo: los datos
  // llegan de Supabase despues de iniciar sesion, y una constante de modulo
  // se quedaria con los valores vacios del arranque.
  // El catalogo son las recompensas activas que publica cada complejo.
  // Es exactamente la misma lista que el cliente ve en el perfil del complejo
  // y que el administrador administra desde su panel.
  const RECOMPENSAS = catalogoRecompensas()
    .map(r => ({
      id: r.id, titulo: r.nombre, desc: r.descripcion, puntos: r.puntos,
      icon: r.icono, tipo: r.tipo, empresa: r.empresa, empresa_id: r.empresa_id,
      disponible: quedanDe(r) > 0,
    }))
    .sort((a, b) => a.puntos - b.puntos)

  const [showConfirm, setShowConfirm]   = useState(null)  // recompensa a canjear
  const [showExito, setShowExito]       = useState(null)  // canje exitoso con código
  const [copiado, setCopiado]           = useState(false)

  const nivel        = nivelDe(puntos)
  const nivelActual  = nivel.nombre
  const puntosParaSig = nivel.hasta === Infinity ? 0 : nivel.hasta - puntos + 1
  const nivelColor = NIVELES.find(n => n.nivel === nivelActual)?.color ?? '#22c55e'

  // ── Confirmar canje ──────────────────────────────────────────────────────
  const [errorCanje, setErrorCanje] = useState(null)

  const confirmarCanje = async () => {
    if (!showConfirm || puntos < showConfirm.puntos) return

    // El saldo lo verifica la base, no esta pantalla: es lo unico que no se
    // puede falsear desde el navegador.
    const g = await guardarCanje(showConfirm)
    if (g.error) { setErrorCanje(g.error); return }

    // Queda en el registro compartido: el complejo lo ve al instante
    const canje = registrarCanje({
      id: showConfirm.id,
      empresa_id: showConfirm.empresa_id, nombre: showConfirm.titulo,
      tipo: showConfirm.tipo, puntos: showConfirm.puntos,
    }, g.canje)
    const tarjeta = aTarjeta(canje)
    setErrorCanje(null)
    USUARIO_ACTUAL.puntos -= showConfirm.puntos
    setPuntos(p => p - showConfirm.puntos)
    setCanjes(prev => [tarjeta, ...prev])
    setShowConfirm(null)
    setShowExito(tarjeta)
    recargarPerfil?.()
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
          <div className="barra-pestanas" style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20 }}>
            {[
              { key: 'catalogo',   label: '🎁 Catálogo' },
              { key: 'miscanjes',  label: `🎟️ Mis Canjes${canjes.length ? ` (${canjes.length})` : ''}` },
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
                            {comoUsarCanje(c.tipo, c.empresa || 'el complejo')}
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
              {PUNTOS_HISTORIAL.length === 0 && (
                <p style={{ color: '#666', fontSize: '0.84rem' }}>
                  Todavía no tienes movimientos. Vas a ver aquí cada vez que ganes
                  o canjees puntos.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PUNTOS_HISTORIAL.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <div>
                        <p style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 500 }}>{item.concepto}</p>
                        <p style={{ fontSize: '0.72rem', color: '#555' }}>{item.fecha}</p>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem',
                                   color: String(item.puntos).startsWith('-') ? '#ef4444' : '#22c55e' }}>{item.puntos}</span>
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

            {errorCanje && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 10 }}>{errorCanje}</p>
            )}

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
