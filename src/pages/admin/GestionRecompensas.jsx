import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const RECOMPENSAS_INIT = [
  { id: 1, emoji: '🥤', nombre: 'Refresco gratis', descripcion: 'Un refresco de tu elección en las instalaciones', puntos: 150, stock: 20, canjeados: 8, activo: true },
  { id: 2, emoji: '🏟️', nombre: '1 hora de cancha gratis', descripcion: 'Una hora de uso en cualquier cancha disponible', puntos: 500, stock: 5, canjeados: 2, activo: true },
  { id: 3, emoji: '🎟️', nombre: 'Descuento 20% en reserva', descripcion: 'Aplica en tu próxima reserva de cancha', puntos: 300, stock: 10, canjeados: 5, activo: true },
  { id: 4, emoji: '👕', nombre: 'Kit deportivo Sportika', descripcion: 'Camiseta + medias + botella oficial Sportika', puntos: 1000, stock: 3, canjeados: 0, activo: false },
  { id: 5, emoji: '🏆', nombre: 'Inscripción gratis a torneo', descripcion: 'Inscripción sin costo al próximo torneo', puntos: 800, stock: 2, canjeados: 1, activo: true },
]

const HISTORIAL_CANJES = [
  { id: 1, usuario: 'Carlos M.', recompensa: 'Refresco gratis', puntos: 150, fecha: '24 May 2026', estado: 'entregado' },
  { id: 2, usuario: 'Ana L.', recompensa: '1 hora de cancha gratis', puntos: 500, fecha: '22 May 2026', estado: 'pendiente' },
  { id: 3, usuario: 'Juan R.', recompensa: 'Descuento 20% en reserva', puntos: 300, fecha: '20 May 2026', estado: 'entregado' },
  { id: 4, usuario: 'María S.', recompensa: 'Refresco gratis', puntos: 150, fecha: '19 May 2026', estado: 'entregado' },
  { id: 5, usuario: 'Pedro G.', recompensa: 'Inscripción gratis a torneo', puntos: 800, fecha: '15 May 2026', estado: 'pendiente' },
]

const EMOJIS_DISPONIBLES = ['🥤', '🏟️', '🎟️', '👕', '🏆', '🍕', '🍔', '🎁', '💧', '🎓', '⏱️', '🎾', '🏀', '⚽', '🏐', '🏓', '🍫', '🎪', '🌟', '💪']

const FORM_VACIO = { emoji: '🎁', nombre: '', descripcion: '', puntos: '', stock: '', activo: true }

export default function GestionRecompensas() {
  const [recompensas, setRecompensas] = useState(RECOMPENSAS_INIT)
  const [tab, setTab] = useState('recompensas')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null) // null = crear, objeto = editar
  const [form, setForm] = useState(FORM_VACIO)
  const [showEliminar, setShowEliminar] = useState(null)
  const [historial] = useState(HISTORIAL_CANJES)

  // Stats rápidas
  const totalCanjeados = recompensas.reduce((s, r) => s + r.canjeados, 0)
  const puntosEntregados = recompensas.reduce((s, r) => s + r.puntos * r.canjeados, 0)
  const activas = recompensas.filter(r => r.activo).length

  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setShowModal(true)
  }

  const abrirEditar = (r) => {
    setEditando(r)
    setForm({ emoji: r.emoji, nombre: r.nombre, descripcion: r.descripcion, puntos: r.puntos, stock: r.stock, activo: r.activo })
    setShowModal(true)
  }

  const guardar = () => {
    if (!form.nombre || !form.puntos || !form.stock) return
    if (editando) {
      setRecompensas(prev => prev.map(r => r.id === editando.id ? { ...r, ...form, puntos: Number(form.puntos), stock: Number(form.stock) } : r))
    } else {
      const nueva = { ...form, id: Date.now(), puntos: Number(form.puntos), stock: Number(form.stock), canjeados: 0 }
      setRecompensas(prev => [...prev, nueva])
    }
    setShowModal(false)
  }

  const toggleActivo = (id) => {
    setRecompensas(prev => prev.map(r => r.id === id ? { ...r, activo: !r.activo } : r))
  }

  const eliminar = (id) => {
    setRecompensas(prev => prev.filter(r => r.id !== id))
    setShowEliminar(null)
  }

  return (
    <Layout role="admin">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>⭐ Gestión de Recompensas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Define qué pueden canjear los usuarios con sus puntos en tu complejo</p>
        </div>
        <button className="btn btn-primary" onClick={abrirCrear}>+ Nueva Recompensa</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Recompensas activas', valor: activas, color: '#22c55e', emoji: '✅' },
          { label: 'Total canjeadas', valor: totalCanjeados, color: '#00BCD4', emoji: '🎁' },
          { label: 'Puntos entregados', valor: puntosEntregados.toLocaleString(), color: '#f59e0b', emoji: '⭐' },
          { label: 'Pendientes de entrega', valor: historial.filter(h => h.estado === 'pendiente').length, color: '#ef4444', emoji: '⏳' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: 6 }}>{s.emoji} {s.label}</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: s.color }}>{s.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20 }}>
        {[
          { key: 'recompensas', label: `⭐ Mis Recompensas (${recompensas.length})` },
          { key: 'historial',   label: `📋 Historial de Canjes (${historial.length})` },
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

      {/* ── TAB: RECOMPENSAS ── */}
      {tab === 'recompensas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {recompensas.map(r => (
            <div key={r.id} className="card" style={{ padding: 20, opacity: r.activo ? 1 : 0.55 }}>
              {/* Header card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '2rem' }}>{r.emoji}</span>
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f5f5f5', marginBottom: 2 }}>{r.nombre}</h3>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                      background: r.activo ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                      color: r.activo ? '#22c55e' : '#555',
                    }}>
                      {r.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5, marginBottom: 14 }}>{r.descripcion}</p>

              {/* Stats de la recompensa */}
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

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'center', flex: 1 }}
                  onClick={() => toggleActivo(r.id)}
                >
                  {r.activo ? '⏸ Pausar' : '▶ Activar'}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'center', flex: 1 }}
                  onClick={() => abrirEditar(r)}
                >
                  ✏️ Editar
                </button>
                <button
                  className="btn btn-sm"
                  style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 10px' }}
                  onClick={() => setShowEliminar(r)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}

          {/* Card agregar nueva */}
          <div
            className="card"
            style={{ padding: 20, border: '2px dashed #2a2a2a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 200, transition: 'border-color 0.2s' }}
            onClick={abrirCrear}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#8B0000'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
          >
            <span style={{ fontSize: '2rem', marginBottom: 10 }}>➕</span>
            <p style={{ color: '#555', fontWeight: 600, fontSize: '0.88rem' }}>Agregar Recompensa</p>
          </div>
        </div>
      )}

      {/* ── TAB: HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                {['Usuario', 'Recompensa', 'Puntos', 'Fecha', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < historial.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#f5f5f5', fontWeight: 600 }}>{c.usuario}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#888' }}>{c.recompensa}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f59e0b' }}>⭐ {c.puntos}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#666' }}>{c.fecha}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: c.estado === 'entregado' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: c.estado === 'entregado' ? '#22c55e' : '#f59e0b',
                    }}>
                      {c.estado === 'entregado' ? '✅ Entregado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {c.estado === 'pendiente' && (
                      <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', padding: '4px 12px', fontSize: '0.75rem' }}>
                        Marcar entregado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR RECOMPENSA ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editando ? 'Editar Recompensa' : 'Nueva Recompensa'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Selector de emoji */}
              <div className="form-group">
                <label className="form-label">Ícono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EMOJIS_DISPONIBLES.map(e => (
                    <button
                      key={e}
                      onClick={() => setForm(p => ({ ...p, emoji: e }))}
                      style={{
                        width: 38, height: 38, fontSize: '1.3rem', borderRadius: 8, cursor: 'pointer',
                        border: form.emoji === e ? '2px solid #8B0000' : '2px solid #2a2a2a',
                        background: form.emoji === e ? 'rgba(139,0,0,0.2)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre de la recompensa *</label>
                <input className="input" placeholder="Ej: Refresco gratis" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input" rows={2} placeholder="Describe qué recibe el usuario..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Puntos requeridos *</label>
                  <input className="input" type="number" placeholder="Ej: 200" value={form.puntos} onChange={e => setForm(p => ({ ...p, puntos: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock disponible *</label>
                  <input className="input" type="number" placeholder="Ej: 10" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
                </div>
              </div>

              {/* Preview */}
              {form.nombre && form.puntos && (
                <div style={{ padding: '12px 16px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10 }}>
                  <p style={{ color: '#00BCD4', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>Vista previa</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem' }}>{form.emoji}</span>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{form.nombre}</p>
                      <p style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>⭐ {form.puntos} pts</p>
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

      {/* ── MODAL: CONFIRMAR ELIMINAR ── */}
      {showEliminar && (
        <div className="modal-overlay" onClick={() => setShowEliminar(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 8 }}>
              ¿Eliminar recompensa?
            </h2>
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
