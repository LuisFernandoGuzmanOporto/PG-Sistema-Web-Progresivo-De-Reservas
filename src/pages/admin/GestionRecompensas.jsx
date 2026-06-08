import { useState } from 'react'
import Layout from '../../components/layout/Layout'

// ── Tipos de recompensa ────────────────────────────────────────────────────
const TIPOS = [
  { value: 'descuento_reserva', label: 'Descuento en reserva', icon: '🏷️', color: '#00BCD4',
    desc: 'El usuario recibe un código que aplica descuento al hacer una reserva' },
  { value: 'torneo_gratis',     label: 'Inscripción gratis torneo', icon: '🏆', color: '#a78bfa',
    desc: 'El usuario recibe un código para inscribir su equipo sin pagar' },
  { value: 'fisico',            label: 'Premio físico',          icon: '🎁', color: '#f59e0b',
    desc: 'El usuario retira el premio físicamente en las instalaciones' },
]

const TIPO_INFO = Object.fromEntries(TIPOS.map(t => [t.value, t]))

// ── Datos mock ─────────────────────────────────────────────────────────────
const RECOMPENSAS_INIT = [
  { id: 1, emoji: '🥤', nombre: 'Refresco gratis',            descripcion: 'Un refresco de tu elección en las instalaciones',   puntos: 150,  stock: 20, canjeados: 8,  activo: true,  tipo: 'fisico' },
  { id: 2, emoji: '🏟️', nombre: '1 hora de cancha gratis',   descripcion: 'Una hora de uso en cualquier cancha disponible',    puntos: 500,  stock: 5,  canjeados: 2,  activo: true,  tipo: 'descuento_reserva' },
  { id: 3, emoji: '🎟️', nombre: 'Descuento 20% en reserva',  descripcion: 'Aplica en tu próxima reserva de cancha',            puntos: 300,  stock: 10, canjeados: 5,  activo: true,  tipo: 'descuento_reserva' },
  { id: 4, emoji: '👕', nombre: 'Kit deportivo Sportika',     descripcion: 'Camiseta + medias + botella oficial Sportika',      puntos: 1000, stock: 3,  canjeados: 0,  activo: false, tipo: 'fisico' },
  { id: 5, emoji: '🏆', nombre: 'Inscripción gratis torneo',  descripcion: 'Inscripción sin costo al próximo torneo',           puntos: 800,  stock: 2,  canjeados: 1,  activo: true,  tipo: 'torneo_gratis' },
]

// Historial incluyendo código generado y estado del código
const HISTORIAL_INIT = [
  { id: 1, usuario: 'Carlos M.',  recompensa: 'Descuento 20% en reserva',   tipo: 'descuento_reserva', codigo: 'SPORT-DESC-7K2M', estadoCodigo: 'utilizado', puntos: 300, fecha: '24 May 2026' },
  { id: 2, usuario: 'Ana L.',     recompensa: '1 hora de cancha gratis',     tipo: 'descuento_reserva', codigo: 'SPORT-DESC-3XQ9', estadoCodigo: 'disponible', puntos: 500, fecha: '22 May 2026' },
  { id: 3, usuario: 'Juan R.',    recompensa: 'Inscripción gratis torneo',   tipo: 'torneo_gratis',     codigo: 'SPORT-TRN-8BFZ',  estadoCodigo: 'utilizado', puntos: 800, fecha: '20 May 2026' },
  { id: 4, usuario: 'María S.',   recompensa: 'Refresco gratis',             tipo: 'fisico',            codigo: null,              estadoCodigo: 'entregado', puntos: 150, fecha: '19 May 2026' },
  { id: 5, usuario: 'Pedro G.',   recompensa: 'Inscripción gratis torneo',   tipo: 'torneo_gratis',     codigo: 'SPORT-TRN-2VKA',  estadoCodigo: 'disponible', puntos: 800, fecha: '15 May 2026' },
  { id: 6, usuario: 'Lucía T.',   recompensa: 'Refresco gratis',             tipo: 'fisico',            codigo: null,              estadoCodigo: 'pendiente', puntos: 150, fecha: '12 May 2026' },
]

const EMOJIS = ['🥤','🏟️','🎟️','👕','🏆','🍕','🍔','🎁','💧','🎓','⏱️','🎾','🏀','⚽','🏐','🏓','🍫','🎪','🌟','💪']
const FORM_VACIO = { emoji: '🎁', nombre: '', descripcion: '', puntos: '', stock: '', activo: true, tipo: 'fisico' }

// ── Helpers ────────────────────────────────────────────────────────────────
const ESTADO_CODIGO_STYLE = {
  disponible: { bg: 'rgba(34,197,94,0.12)',    color: '#22c55e', label: '✅ Disponible' },
  utilizado:  { bg: 'rgba(100,100,100,0.12)',  color: '#888',    label: '✔ Utilizado'  },
  entregado:  { bg: 'rgba(0,188,212,0.12)',    color: '#00BCD4', label: '📦 Entregado' },
  pendiente:  { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b', label: '⏳ Pendiente'  },
}

export default function GestionRecompensas() {
  const [recompensas, setRecompensas] = useState(RECOMPENSAS_INIT)
  const [historial, setHistorial]     = useState(HISTORIAL_INIT)
  const [tab, setTab]                 = useState('recompensas')
  const [showModal, setShowModal]     = useState(false)
  const [editando, setEditando]       = useState(null)
  const [form, setForm]               = useState(FORM_VACIO)
  const [showEliminar, setShowEliminar] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [copiado, setCopiado]         = useState(false)

  // ── Stats ──────────────────────────────────────────────────────────────
  const totalCanjeados    = recompensas.reduce((s, r) => s + r.canjeados, 0)
  const puntosEntregados  = recompensas.reduce((s, r) => s + r.puntos * r.canjeados, 0)
  const activas           = recompensas.filter(r => r.activo).length
  const codesActivos      = historial.filter(h => h.codigo && h.estadoCodigo === 'disponible').length
  const pendientesEntrega = historial.filter(h => h.estadoCodigo === 'pendiente').length

  // ── CRUD recompensas ──────────────────────────────────────────────────
  const abrirCrear = () => { setEditando(null); setForm(FORM_VACIO); setShowModal(true) }
  const abrirEditar = (r) => {
    setEditando(r)
    setForm({ emoji: r.emoji, nombre: r.nombre, descripcion: r.descripcion, puntos: r.puntos, stock: r.stock, activo: r.activo, tipo: r.tipo })
    setShowModal(true)
  }
  const guardar = () => {
    if (!form.nombre || !form.puntos || !form.stock) return
    if (editando) {
      setRecompensas(prev => prev.map(r => r.id === editando.id ? { ...r, ...form, puntos: Number(form.puntos), stock: Number(form.stock) } : r))
    } else {
      setRecompensas(prev => [...prev, { ...form, id: Date.now(), puntos: Number(form.puntos), stock: Number(form.stock), canjeados: 0 }])
    }
    setShowModal(false)
  }
  const toggleActivo = (id) => setRecompensas(prev => prev.map(r => r.id === id ? { ...r, activo: !r.activo } : r))
  const eliminar     = (id) => { setRecompensas(prev => prev.filter(r => r.id !== id)); setShowEliminar(null) }

  // ── Acciones historial ────────────────────────────────────────────────
  const marcarEntregado = (id) => setHistorial(prev => prev.map(h => h.id === id ? { ...h, estadoCodigo: 'entregado' } : h))
  const copiarCodigo    = (codigo) => { navigator.clipboard.writeText(codigo).catch(() => {}); setCopiado(codigo); setTimeout(() => setCopiado(false), 2000) }

  const historialFiltrado = filtroEstado === 'todos'
    ? historial
    : historial.filter(h => h.estadoCodigo === filtroEstado)

  return (
    <Layout role="admin">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>⭐ Gestión de Recompensas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Define recompensas y revisa los canjes realizados por los usuarios</p>
        </div>
        <button className="btn btn-primary" onClick={abrirCrear}>+ Nueva Recompensa</button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Recompensas activas',  valor: activas,                       color: '#22c55e', emoji: '✅' },
          { label: 'Total canjeadas',       valor: totalCanjeados,                color: '#00BCD4', emoji: '🎁' },
          { label: 'Puntos entregados',     valor: puntosEntregados.toLocaleString(), color: '#f59e0b', emoji: '⭐' },
          { label: 'Códigos disponibles',   valor: codesActivos,                  color: '#a78bfa', emoji: '🎟️' },
          { label: 'Premios pendientes',    valor: pendientesEntrega,             color: '#ef4444', emoji: '⏳' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: 6 }}>{s.emoji} {s.label}</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: s.color }}>{s.valor}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20 }}>
        {[
          { key: 'recompensas', label: `⭐ Mis Recompensas (${recompensas.length})` },
          { key: 'canjes',      label: `🎟️ Canjes de Recompensas (${historial.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 22px',
            background: tab === t.key ? 'rgba(139,0,0,0.2)' : 'transparent',
            color: tab === t.key ? '#ff6b6b' : '#666',
            border: 'none',
            borderBottom: tab === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer',
            fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: RECOMPENSAS ══════════════════════════════════════════════ */}
      {tab === 'recompensas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {recompensas.map(r => {
            const tipoInfo = TIPO_INFO[r.tipo]
            return (
              <div key={r.id} className="card" style={{ padding: 20, opacity: r.activo ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '2rem' }}>{r.emoji}</span>
                    <div>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 2 }}>{r.nombre}</h3>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: `${tipoInfo.color}18`, color: tipoInfo.color }}>
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: r.activo ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: r.activo ? '#22c55e' : '#555' }}>
                    {r.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5, marginBottom: 14 }}>{r.descripcion}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14, padding: '10px 0', borderTop: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f59e0b' }}>⭐ {r.puntos}</p>
                    <p style={{ fontSize: '0.65rem', color: '#555' }}>Puntos</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#00BCD4' }}>{r.stock}</p>
                    <p style={{ fontSize: '0.65rem', color: '#555' }}>Stock</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#22c55e' }}>{r.canjeados}</p>
                    <p style={{ fontSize: '0.65rem', color: '#555' }}>Canjeados</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center', flex: 1 }} onClick={() => toggleActivo(r.id)}>
                    {r.activo ? '⏸ Pausar' : '▶ Activar'}
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center', flex: 1 }} onClick={() => abrirEditar(r)}>
                    ✏️ Editar
                  </button>
                  <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 10px' }} onClick={() => setShowEliminar(r)}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}

          <div
            className="card"
            style={{ padding: 20, border: '2px dashed #2a2a2a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 200 }}
            onClick={abrirCrear}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#8B0000'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
          >
            <span style={{ fontSize: '2rem', marginBottom: 10 }}>➕</span>
            <p style={{ color: '#555', fontWeight: 600, fontSize: '0.88rem' }}>Agregar Recompensa</p>
          </div>
        </div>
      )}

      {/* ══ TAB: CANJES DE RECOMPENSAS ════════════════════════════════════ */}
      {tab === 'canjes' && (
        <div>
          {/* Filtro por estado */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'todos',      label: `Todos (${historial.length})` },
              { key: 'disponible', label: `✅ Disponible (${historial.filter(h => h.estadoCodigo === 'disponible').length})` },
              { key: 'utilizado',  label: `✔ Utilizado (${historial.filter(h => h.estadoCodigo === 'utilizado').length})` },
              { key: 'entregado',  label: `📦 Entregado (${historial.filter(h => h.estadoCodigo === 'entregado').length})` },
              { key: 'pendiente',  label: `⏳ Pendiente (${historial.filter(h => h.estadoCodigo === 'pendiente').length})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroEstado(f.key)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  border: filtroEstado === f.key ? '1px solid #8B0000' : '1px solid #2a2a2a',
                  background: filtroEstado === f.key ? 'rgba(139,0,0,0.2)' : 'transparent',
                  color: filtroEstado === f.key ? '#ff6b6b' : '#666',
                  transition: 'all 0.15s',
                }}
              >{f.label}</button>
            ))}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {['Cliente', 'Recompensa', 'Tipo', 'Código generado', 'Estado código', 'Puntos', 'Fecha', 'Acción'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>
                      No hay canjes con ese estado
                    </td>
                  </tr>
                )}
                {historialFiltrado.map((c, i) => {
                  const tipoInfo = TIPO_INFO[c.tipo]
                  const estadoStyle = ESTADO_CODIGO_STYLE[c.estadoCodigo] ?? ESTADO_CODIGO_STYLE.pendiente
                  return (
                    <tr key={c.id} style={{ borderBottom: i < historialFiltrado.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                      {/* Cliente */}
                      <td style={{ padding: '14px 14px', fontSize: '0.85rem', color: '#f5f5f5', fontWeight: 600 }}>{c.usuario}</td>

                      {/* Recompensa */}
                      <td style={{ padding: '14px 14px', fontSize: '0.82rem', color: '#888', maxWidth: 160 }}>{c.recompensa}</td>

                      {/* Tipo */}
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: `${tipoInfo.color}18`, color: tipoInfo.color, whiteSpace: 'nowrap' }}>
                          {tipoInfo.icon} {tipoInfo.label}
                        </span>
                      </td>

                      {/* Código generado */}
                      <td style={{ padding: '14px 14px' }}>
                        {c.codigo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: c.estadoCodigo === 'disponible' ? '#00BCD4' : '#444', letterSpacing: 2 }}>
                              {c.codigo}
                            </span>
                            {c.estadoCodigo === 'disponible' && (
                              <button
                                title="Copiar código"
                                onClick={() => copiarCodigo(c.codigo)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: copiado === c.codigo ? '#22c55e' : '#555', padding: '2px 4px' }}
                              >
                                {copiado === c.codigo ? '✅' : '📋'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#444', fontSize: '0.78rem' }}>— Sin código</span>
                        )}
                      </td>

                      {/* Estado código */}
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: estadoStyle.bg, color: estadoStyle.color, whiteSpace: 'nowrap' }}>
                          {estadoStyle.label}
                        </span>
                      </td>

                      {/* Puntos */}
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f59e0b' }}>⭐ {c.puntos}</span>
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: '14px 14px', fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>{c.fecha}</td>

                      {/* Acción */}
                      <td style={{ padding: '14px 14px' }}>
                        {c.estadoCodigo === 'pendiente' && (
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', padding: '4px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            onClick={() => marcarEntregado(c.id)}
                          >
                            📦 Marcar entregado
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ MODAL: CREAR / EDITAR RECOMPENSA ══════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editando ? 'Editar Recompensa' : 'Nueva Recompensa'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tipo de recompensa */}
              <div className="form-group">
                <label className="form-label">Tipo de recompensa *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TIPOS.map(t => (
                    <label
                      key={t.value}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: form.tipo === t.value ? `1px solid ${t.color}55` : '1px solid #2a2a2a',
                        background: form.tipo === t.value ? `${t.color}0d` : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={t.value}
                        checked={form.tipo === t.value}
                        onChange={() => setForm(p => ({ ...p, tipo: t.value }))}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <p style={{ color: form.tipo === t.value ? t.color : '#ccc', fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
                          {t.icon} {t.label}
                        </p>
                        <p style={{ color: '#555', fontSize: '0.74rem' }}>{t.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ícono emoji */}
              <div className="form-group">
                <label className="form-label">Ícono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setForm(p => ({ ...p, emoji: e }))}
                      style={{
                        width: 36, height: 36, fontSize: '1.2rem', borderRadius: 8, cursor: 'pointer',
                        border: form.emoji === e ? '2px solid #8B0000' : '2px solid #2a2a2a',
                        background: form.emoji === e ? 'rgba(139,0,0,0.2)' : 'transparent',
                      }}
                    >{e}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input" placeholder="Ej: Descuento 20% en reserva" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input" rows={2} placeholder="Describe qué recibe el usuario..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Puntos requeridos *</label>
                  <input className="input" type="number" placeholder="Ej: 300" value={form.puntos} onChange={e => setForm(p => ({ ...p, puntos: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock disponible *</label>
                  <input className="input" type="number" placeholder="Ej: 10" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
                </div>
              </div>

              {/* Preview */}
              {form.nombre && form.puntos && (
                <div style={{ padding: '12px 16px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10 }}>
                  <p style={{ color: '#00BCD4', fontSize: '0.72rem', fontWeight: 600, marginBottom: 6 }}>Vista previa</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem' }}>{form.emoji}</span>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{form.nombre}</p>
                      <p style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>⭐ {form.puntos} pts</p>
                      <span style={{ fontSize: '0.65rem', color: TIPO_INFO[form.tipo]?.color }}>
                        {TIPO_INFO[form.tipo]?.icon} {TIPO_INFO[form.tipo]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center', opacity: (!form.nombre || !form.puntos || !form.stock) ? 0.5 : 1 }}
                  onClick={guardar}
                  disabled={!form.nombre || !form.puntos || !form.stock}
                >
                  {editando ? '✅ Guardar Cambios' : '➕ Crear Recompensa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CONFIRMAR ELIMINAR ══════════════════════════════════════ */}
      {showEliminar && (
        <div className="modal-overlay" onClick={() => setShowEliminar(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 8 }}>¿Eliminar recompensa?</h2>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 24 }}>
              Se eliminará <strong style={{ color: '#f5f5f5' }}>"{showEliminar.nombre}"</strong> y ya no aparecerá para los usuarios.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowEliminar(null)}>Cancelar</button>
              <button className="btn w-full" style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => eliminar(showEliminar.id)}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
