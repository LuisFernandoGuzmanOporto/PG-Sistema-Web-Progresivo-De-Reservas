import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import { RECOMPENSAS_POR_EMPRESA, recompensasDeEmpresa,
         CANJES, canjesDeEmpresa, SESION, USUARIO_ACTUAL, pts,
} from '../../lib/datos'
import {
  guardarRecompensa, cambiarEstadoRecompensa, borrarRecompensa,
  entregarCanje, registrarEnBitacora,
} from '../../lib/guardar'

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

// El catalogo es el mismo objeto que ve el cliente. Aqui solo se traduce el
// nombre de dos campos para no tocar todo el formulario.
const aVista = (r) => ({ ...r, emoji: r.icono, activo: r.activa })
const aDatos = (r) => ({
  id: r.id, empresa_id: SESION.empresaId, nombre: r.nombre, icono: r.emoji,
  tipo: r.tipo, descripcion: r.descripcion,
  puntos: Number(r.puntos) || 0, stock: Number(r.stock) || 0,
  canjeados: r.canjeados ?? 0, activa: !!r.activo,
})

// Los canjes son los mismos que el empleado entrega desde su panel.
const aHistorial = (c) => ({
  id: c.id, usuario: c.cliente, recompensa: c.recompensa, tipo: c.tipo,
  codigo: c.codigo, estadoCodigo: c.estado, puntos: c.puntos, fecha: c.fecha,
  usadoEn: c.usadoEn, entregadoPor: c.entregadoPor, entregadoEl: c.entregadoEl,
})

// Qué pasó con el código, para que el administrador tenga el registro:
// quién entregó el premio y cuándo, o dónde se usó el descuento.
const FECHA_Y_HORA = { timeZone: 'America/La_Paz', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
function queSeHizo(c) {
  if (c.estadoCodigo === 'entregado') {
    const cuando = c.entregadoEl ? new Date(c.entregadoEl).toLocaleString('es-BO', FECHA_Y_HORA) : ''
    return ['Entregó ' + (c.entregadoPor || 'el complejo'), cuando].filter(Boolean).join(' · ')
  }
  if (c.estadoCodigo === 'utilizado') {
    return c.usadoEn === 'torneo' ? 'Usado en una inscripción' : 'Usado en una reserva'
  }
  return ''
}

const EMOJIS = ['🥤','🏟️','🎟️','👕','🏆','🍕','🍔','🎁','💧','🎓','⏱️','🎾','🏀','⚽','🏐','🏓','🍫','🎪','🌟','💪']
const FORM_VACIO = { emoji: '🎁', nombre: '', descripcion: '', puntos: '', stock: '', activo: true,
                     tipo: 'fisico', descuentoTipo: 'porcentaje', descuentoValor: '' }

// ── Helpers ────────────────────────────────────────────────────────────────
const ESTADO_CODIGO_STYLE = {
  disponible: { bg: 'rgba(34,197,94,0.12)',    color: '#22c55e', label: '✅ Disponible' },
  utilizado:  { bg: 'rgba(100,100,100,0.12)',  color: '#888',    label: '✔ Utilizado'  },
  entregado:  { bg: 'rgba(0,188,212,0.12)',    color: '#00BCD4', label: '📦 Entregado' },
  pendiente:  { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b', label: '⏳ Pendiente'  },
}

export default function GestionRecompensas() {
  const [recompensas, setRecompensas] = useState(recompensasDeEmpresa(SESION.empresaId).map(aVista))

  // Guardar escribe en la fuente unica: lo que se publica aqui es lo que el
  // cliente ve en Recompensas y en el perfil del complejo.
  const publicar = (lista) => {
    RECOMPENSAS_POR_EMPRESA[SESION.empresaId] = lista.map(aDatos)
    setRecompensas(lista)
  }
  const [historial, setHistorial]     = useState(canjesDeEmpresa(SESION.empresaId).map(aHistorial))
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
  // Esperando que el cliente pase a retirar su premio
  const pendientesEntrega = historial.filter(h => h.estadoCodigo === 'disponible').length

  // ── CRUD recompensas ──────────────────────────────────────────────────
  const abrirCrear = () => { setEditando(null); setForm(FORM_VACIO); setIntento(false); setShowModal(true) }
  const abrirEditar = (r) => {
    setEditando(r)
    setIntento(false)
    setForm({ emoji: r.emoji, nombre: r.nombre, descripcion: r.descripcion, puntos: r.puntos,
              stock: r.stock, activo: r.activo, tipo: r.tipo,
              descuentoTipo: r.descuentoTipo || 'porcentaje',
              descuentoValor: r.descuentoValor ?? '' })
    setShowModal(true)
  }
  const [errorGuardar, setErrorGuardar] = useState(null)

  // Que le falta al formulario, para decirlo en vez de solo apagar el boton
  const [intento, setIntento] = useState(false)
  const errores = {}
  {
    const n = (v) => Number(v)
    if (form.tipo === 'descuento_reserva') {
      // Una recompensa de descuento sin numero cobra puntos y no descuenta nada
      if (form.descuentoValor === '' || form.descuentoValor == null) errores.descuentoValor = 'Escribe de cuánto es el descuento.'
      else if (form.descuentoTipo === 'porcentaje' && (n(form.descuentoValor) < 1 || n(form.descuentoValor) > 100))
        errores.descuentoValor = 'El porcentaje debe estar entre 1 y 100.'
      else if (form.descuentoTipo === 'horas_gratis' && (!Number.isInteger(n(form.descuentoValor)) || n(form.descuentoValor) < 1 || n(form.descuentoValor) > 12))
        errores.descuentoValor = 'Las horas gratis deben ser un número entero entre 1 y 12.'
    }
    if (!String(form.nombre).trim()) errores.nombre = 'Escribe el nombre de la recompensa, por ejemplo «Descuento 20 % en reserva».'
    if (form.puntos === '' || form.puntos == null) errores.puntos = 'Escribe cuántos puntos cuesta canjearla.'
    else if (!Number.isInteger(n(form.puntos)) || n(form.puntos) < 1) errores.puntos = 'Los puntos deben ser un número entero mayor a 0.'
    if (form.stock === '' || form.stock == null) errores.stock = 'Escribe cuántas hay disponibles.'
    else if (!Number.isInteger(n(form.stock)) || n(form.stock) < 0) errores.stock = 'El stock debe ser un número entero (0 o más).'
  }
  const ORDEN = ['descuentoValor', 'nombre', 'puntos', 'stock']
  const faltaEnRecompensa = intento ? ORDEN.filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] })) : []
  const pc = (c) => propsCampo(c, errores[c], intento)
  const mc = (c) => <MensajeCampo nombre={c} error={errores[c]} mostrar={intento} />

  const guardar = async () => {
    setIntento(true)
    if (Object.keys(errores).length) { irAlPrimerError(errores, ORDEN); return }

    const g = await guardarRecompensa({
      id: editando?.id, empresaId: SESION.empresaId,
      emoji: form.emoji, nombre: form.nombre, descripcion: form.descripcion,
      puntos: form.puntos, tipo: form.tipo, stock: form.stock, activa: form.activo,
      descuentoTipo: form.descuentoTipo, descuentoValor: form.descuentoValor,
    })
    if (g.error) { setErrorGuardar(g.error); return }

    if (editando) {
      publicar(recompensas.map(r => r.id === editando.id ? { ...r, ...form, puntos: Number(form.puntos), stock: Number(form.stock) } : r))
    } else {
      publicar([...recompensas, { ...form, id: g.recompensa.id, puntos: Number(form.puntos), stock: Number(form.stock), canjeados: 0 }])
    }
    registrarEnBitacora({
      tipo: 'recompensa',
      accion: editando ? 'Editó una recompensa' : 'Publicó una recompensa',
      detalle: form.nombre + ' · ' + pts(form.puntos),
    })
    setErrorGuardar(null)
    setShowModal(false)
  }
  const toggleActivo = async (id) => {
    const r = recompensas.find(x => x.id === id)
    const g = await cambiarEstadoRecompensa(id, !r.activo)
    if (g.error) { setErrorGuardar(g.error); return }
    publicar(recompensas.map(x => x.id === id ? { ...x, activo: !x.activo } : x))
  }

  const eliminar = async (id) => {
    const r = recompensas.find(x => x.id === id)
    const g = await borrarRecompensa(id)
    if (g.error) { setErrorGuardar(g.error); setShowEliminar(null); return }
    publicar(recompensas.filter(x => x.id !== id))
    registrarEnBitacora({ tipo: 'recompensa', accion: 'Eliminó una recompensa', detalle: r?.nombre || '' })
    setShowEliminar(null)
  }

  // ── Acciones historial ────────────────────────────────────────────────
  const marcarEntregado = async (id) => {
    const g = await entregarCanje(id)
    if (g.error) { setErrorGuardar(g.error); return }

    const real = CANJES.find(c => c.id === id)
    if (real) Object.assign(real, { estado: 'entregado', entregadoPor: USUARIO_ACTUAL.nombre, entregadoEl: new Date().toISOString() })
    // La base anota quién y cuándo; aquí se muestra lo mismo sin recargar
    setHistorial(prev => prev.map(h => h.id === id
      ? { ...h, estadoCodigo: 'entregado', entregadoPor: USUARIO_ACTUAL.nombre, entregadoEl: new Date().toISOString() }
      : h))
    const h = historial.find(x => x.id === id)
    registrarEnBitacora({
      tipo: 'recompensa', accion: 'Entregó una recompensa',
      detalle: (h?.codigo || '') + ' · ' + (h?.recompensa || ''),
    })
  }
  const copiarCodigo    = (codigo) => { navigator.clipboard.writeText(codigo).catch(() => {}); setCopiado(codigo); setTimeout(() => setCopiado(false), 2000) }

  const historialFiltrado = filtroEstado === 'todos'
    ? historial
    : historial.filter(h => h.estadoCodigo === filtroEstado)

  return (
    <Layout role="admin">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>⭐ Gestión de Recompensas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Define recompensas y revisa los canjes realizados por los usuarios</p>
        </div>
        <button className="btn btn-primary" onClick={abrirCrear}>+ Nueva Recompensa</button>
      </div>

      {/* ── Stats ── */}
      {/* De a cinco en la computadora; en el celular, de a dos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 24 }}>
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
      <div className="barra-pestanas" style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 20 }}>
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

          <div className="card tabla-desplazable" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {['Cliente', 'Recompensa', 'Tipo', 'Código generado', 'Estado código', 'Puntos', 'Fecha', 'Entrega o uso'].map(h => (
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

                      {/* Entrega o uso: el botón, o quién lo entregó y cuándo */}
                      <td style={{ padding: '14px 14px' }}>
                        {c.estadoCodigo !== 'disponible' && (
                          <span style={{ fontSize: '0.78rem', color: '#888', whiteSpace: 'nowrap' }}>{queSeHizo(c)}</span>
                        )}
                        {c.estadoCodigo === 'disponible' && (
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

              {/* ── De cuánto es el descuento ──
                  Solo para las de descuento en reserva. Sin esto la tabla
                  sabía que la recompensa era «un descuento», pero no cuánto
                  descontaba: el 20% vivía dentro del nombre, como texto, y
                  el cliente gastaba sus puntos para después pagar igual. */}
              {form.tipo === 'descuento_reserva' && (
                <div className="form-group">
                  <label className="form-label">¿De cuánto es el descuento? *</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <select className="input" style={{ flex: 1 }}
                      value={form.descuentoTipo}
                      onChange={e => setForm(p => ({ ...p, descuentoTipo: e.target.value }))}>
                      <option value="porcentaje">% de descuento</option>
                      <option value="horas_gratis">Horas gratis</option>
                    </select>
                    <input className="input" type="number" min="1" style={{ width: 110 }}
                      placeholder={form.descuentoTipo === 'porcentaje' ? '20' : '1'}
                      value={form.descuentoValor}
                      onChange={e => setForm(p => ({ ...p, descuentoValor: e.target.value }))} {...pc('descuentoValor')} />
                  </div>
                  {mc('descuentoValor')}
                  <p style={{ color: '#666', fontSize: '0.75rem', marginTop: 6, lineHeight: 1.5 }}>
                    {form.descuentoTipo === 'porcentaje'
                      ? 'Se le descuenta ese porcentaje de lo que salga la reserva.'
                      : 'Se le regalan esas horas al precio de la cancha que reserve. Si reserva menos horas, se le descuentan solo las que reservó.'}
                  </p>
                </div>
              )}

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
                <input className="input" placeholder="Ej: Descuento 20% en reserva" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} {...pc('nombre')} />
                {mc('nombre')}
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input" rows={2} placeholder="Describe qué recibe el usuario..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Puntos requeridos *</label>
                  <input className="input" type="number" min="1" placeholder="Ej: 300" value={form.puntos} onChange={e => setForm(p => ({ ...p, puntos: e.target.value }))} {...pc('puntos')} />
                  {mc('puntos')}
                </div>
                <div className="form-group">
                  <label className="form-label">Stock disponible *</label>
                  <input className="input" type="number" min="0" placeholder="Ej: 10" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} {...pc('stock')} />
                  {mc('stock')}
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
                      <p style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>⭐ {pts(form.puntos)}</p>
                      <span style={{ fontSize: '0.65rem', color: TIPO_INFO[form.tipo]?.color }}>
                        {TIPO_INFO[form.tipo]?.icon} {TIPO_INFO[form.tipo]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <AvisoFaltantes faltantes={faltaEnRecompensa} error={errorGuardar} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                  onClick={guardar}
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
