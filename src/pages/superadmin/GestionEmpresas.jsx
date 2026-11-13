import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import { EMPRESAS, canchasDeEmpresa, empresaPorId, todosLosUsuarios, empleadosDeEmpresa, mismo } from '../../lib/datos'
import Avatar from '../../components/Avatar'
import { cambiarEstadoEmpresa } from '../../lib/guardar'
import { urlPublica } from '../../lib/archivos'
import { MapaDeUbicacion } from '../../components/SelectorUbicacion'

// ── Piezas del detalle de una solicitud ─────────────────────────────────────

function Bloque({ titulo, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
      <p style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 10 }}>{titulo}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  )
}

/** Un dato; si lo dejó vacío se dice «No lo indicó» en vez de dejar el hueco. */
function Fila({ k, v, color = '#ccc' }) {
  const vacio = v == null || String(v).trim() === ''
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: '0.84rem' }}>
      <span style={{ color: '#555', minWidth: 84, flexShrink: 0 }}>{k}</span>
      <span style={{ color: vacio ? '#666' : color, fontWeight: vacio ? 400 : 500, fontStyle: vacio ? 'italic' : 'normal', wordBreak: 'break-word' }}>
        {vacio ? 'No lo indicó' : v}
      </span>
    </div>
  )
}

/** Una imagen subida, que se abre en grande; o el aviso de que no la subió. */
function Imagen({ titulo, ruta, falta, contener = false }) {
  const url = urlPublica(ruta)
  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: 5 }}>{titulo}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" title="Ver en grande">
          <img src={url} alt={titulo} style={{ width: '100%', height: 130, objectFit: contener ? 'contain' : 'cover',
            background: contener ? '#fff' : '#111', borderRadius: 8, border: '1px solid #2a2a2a', display: 'block' }} />
        </a>
      ) : (
        <div style={{ height: 130, borderRadius: 8, border: '1px dashed #333', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4, color: '#666', fontSize: '0.76rem', textAlign: 'center', padding: 8 }}>
          <span style={{ fontSize: '1.4rem', opacity: 0.5 }}>🖼️</span>{falta}
        </div>
      )}
    </div>
  )
}

const ESTADO_STYLE = {
  activo:     { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', label: 'Activo'     },
  pendiente:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Pendiente'  },
  suspendido: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Suspendido' },
  rechazado:  { bg: 'rgba(100,100,100,0.12)', color: '#666',    label: 'Rechazado'  },
}

export default function GestionEmpresas() {
  // Se arma DENTRO del componente, no al cargar el archivo. Calculada afuera,
  // se quedaba con las empresas vacias del arranque y esta pantalla nunca
  // llegaba a mostrar lo que hay en la base: por eso una solicitud nueva no
  // aparecia nunca.
  const [empresas, setEmpresas] = useState(() => EMPRESAS.map(e => ({
    ...e,
    adminCorreo: e.adminEmail,
    canchas: canchasDeEmpresa(e.id).length,
    fecha: e.fechaSolicitud,
  })))

  /**
   * Cambia el estado en la empresa real: solo las activas las ven los clientes.
   * Se guarda antes de tocar la pantalla, para no mostrar como aprobado algo
   * que la base rechazo.
   */
  const cambiarEstado = async (id, estado) => {
    const g = await cambiarEstadoEmpresa(id, estado)
    if (g.error) { mostrarToast('No se guardó el cambio. ' + g.error, '#ef4444'); return false }

    const real = empresaPorId(id)
    if (real) real.estado = estado
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, estado } : e))
    return true
  }
  const [filtro, setFiltro]           = useState('todos')
  const [detalle, setDetalle]         = useState(null)   // empresa en modal
  const [rechazando, setRechazando]   = useState(null)   // empresa a rechazar
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [toast, setToast]             = useState(null)

  const mostrarToast = (msg, color = '#22c55e') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  const aprobar = (id) => {
    cambiarEstado(id, 'activo')
    setDetalle(null)
    mostrarToast('✅ Empresa aprobada correctamente')
  }

  const rechazar = (id) => {
    cambiarEstado(id, 'rechazado')
    setRechazando(null)
    setMotivoRechazo('')
    setDetalle(null)
    mostrarToast('Solicitud rechazada', '#ef4444')
  }

  const suspender = (id) => {
    cambiarEstado(id, 'suspendido')
    setDetalle(null)
    mostrarToast('Empresa suspendida', '#f59e0b')
  }

  const reactivar = (id) => {
    cambiarEstado(id, 'activo')
    mostrarToast('✅ Empresa reactivada')
  }

  const pendientes  = empresas.filter(e => e.estado === 'pendiente').length
  const activas     = empresas.filter(e => e.estado === 'activo').length
  const suspendidas = empresas.filter(e => e.estado === 'suspendido').length

  const filtradas = filtro === 'todos' ? empresas : empresas.filter(e => e.estado === filtro)

  return (
    <Layout role="superadmin">
      {/* Header: en el celular, los contadores bajan y el título queda entero */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏢 Gestión de Empresas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Administra todos los complejos deportivos de Sportika</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendientes > 0 && <span className="badge badge-warning">⏳ {pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>}
          <span className="badge badge-success">✅ {activas} activa{activas !== 1 ? 's' : ''}</span>
          {suspendidas > 0 && <span className="badge badge-error">🚫 {suspendidas} suspendida{suspendidas !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Alerta pendientes */}
      {pendientes > 0 && (
        <div style={{ padding: '12px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>⏳</span>
          <p style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
            Hay {pendientes} solicitud{pendientes > 1 ? 'es' : ''} de empresa pendiente{pendientes > 1 ? 's' : ''} de revisión.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'todos',     label: `Todos (${empresas.length})` },
          { key: 'activo',    label: `Activos (${activas})` },
          { key: 'pendiente', label: `Pendientes (${pendientes})` },
          { key: 'suspendido',label: `Suspendidos (${suspendidas})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            padding: '6px 16px', borderRadius: 20, border: '1px solid',
            borderColor: filtro === f.key ? '#8B0000' : '#2a2a2a',
            background: filtro === f.key ? 'rgba(139,0,0,0.2)' : 'transparent',
            color: filtro === f.key ? '#ff6b6b' : '#666',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.2s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card tabla-desplazable" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
              {['Empresa', 'Administrador', 'Zona', 'Deportes', 'Fecha Solicitud', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((e, i) => {
              const est = ESTADO_STYLE[e.estado] || ESTADO_STYLE.suspendido
              return (
                <tr key={e.id} style={{ borderBottom: i < filtradas.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <td style={{ padding: '14px 16px', color: '#f5f5f5', fontWeight: 700, fontSize: '0.88rem' }}>{e.nombre}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <p style={{ color: '#ccc', fontSize: '0.83rem' }}>{e.admin}</p>
                    <p style={{ color: '#555', fontSize: '0.72rem' }}>{e.adminCorreo}</p>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#888', fontSize: '0.82rem' }}>{e.zona}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {e.deportes.slice(0, 2).map(d => (
                        <span key={d} style={{ padding: '2px 7px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 600, background: 'rgba(0,188,212,0.1)', color: '#00BCD4' }}>{d}</span>
                      ))}
                      {e.deportes.length > 2 && <span style={{ fontSize: '0.65rem', color: '#555' }}>+{e.deportes.length - 2}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#666', fontSize: '0.8rem' }}>{e.fecha}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: est.bg, color: est.color }}>
                      {est.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {e.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => aprobar(e.id)}
                            style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.75rem', fontWeight: 700 }}
                          >✓ Aprobar</button>
                          <button
                            onClick={() => setRechazando(e)}
                            style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.75rem', fontWeight: 700 }}
                          >✕ Rechazar</button>
                        </>
                      )}
                      {e.estado === 'activo' && (
                        <button
                          onClick={() => suspender(e.id)}
                          style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.75rem' }}
                        >Suspender</button>
                      )}
                      {e.estado === 'suspendido' && (
                        <button
                          onClick={() => reactivar(e.id)}
                          style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.75rem' }}
                        >Reactivar</button>
                      )}
                      <button
                        onClick={() => setDetalle(e)}
                        style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.75rem' }}
                      >Ver detalles</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ══ MODAL: DETALLE EMPRESA ══════════════════════════════════════ */}
      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2 className="modal-title">Solicitud — {detalle.nombre}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(null)}>✕</button>
            </div>

            {/* Estado y cuándo lo pidió */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              {(() => { const est = ESTADO_STYLE[detalle.estado] || ESTADO_STYLE.suspendido; return (
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: est.bg, color: est.color }}>{est.label}</span>
              )})()}
              <span style={{ color: '#666', fontSize: '0.8rem' }}>Solicitud del {detalle.fecha}</span>
              {detalle.estado === 'activo' && (
                <span style={{ color: '#666', fontSize: '0.8rem' }}>· {detalle.canchas} cancha{detalle.canchas === 1 ? '' : 's'} publicada{detalle.canchas === 1 ? '' : 's'}</span>
              )}
            </div>

            {/* Las imágenes que subió. Si no subió alguna, se dice: así se ve
                que falta y no parece que no cargó */}
            <Bloque titulo="Imágenes">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <Imagen titulo="Logo" ruta={detalle.logo} falta="No subió logo" />
                <Imagen titulo="Foto del complejo" ruta={detalle.foto} falta="No subió foto del complejo" />
                <Imagen titulo="QR de pago" ruta={detalle.qrPago} falta="Todavía no subió su QR de pago" contener />
              </div>
            </Bloque>

            {/* Todo lo que llenó al registrarse */}
            <Bloque titulo="Datos del complejo">
              {[
                ['Nombre',     detalle.nombre],
                ['Zona',       detalle.zona],
                ['Dirección',  detalle.direccion],
                ['Referencia', detalle.referencia],
                ['Teléfono',   detalle.telefono],
                ['Horario',    detalle.horario],
                ['Deportes',   (detalle.deportes || []).join(', ')],
              ].map(([k, v]) => <Fila key={k} k={k} v={v} />)}
              <div style={{ paddingTop: 8, borderTop: '1px solid #2a2a2a', marginTop: 4 }}>
                <p style={{ color: '#555', fontSize: '0.74rem', marginBottom: 3 }}>Descripción</p>
                <p style={{ fontSize: '0.84rem', color: detalle.descripcion ? '#bbb' : '#666', lineHeight: 1.55, whiteSpace: 'pre-wrap', fontStyle: detalle.descripcion ? 'normal' : 'italic' }}>
                  {detalle.descripcion || 'No escribió una descripción'}
                </p>
              </div>
            </Bloque>

            <Bloque titulo="Ubicación en el mapa">
              <MapaDeUbicacion lat={detalle.lat} lng={detalle.lng} alto={220} />
            </Bloque>

            {/* Todo lo que se sabe de la persona que pidió el complejo: su
                cuenta, no solo el nombre y el correo */}
            {(() => {
              const u = todosLosUsuarios().find(x => mismo(x.id, detalle.adminId))
              const empleados = empleadosDeEmpresa(detalle.id)
              return (
                <Bloque titulo="Administrador">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <Avatar className="avatar" nombre={detalle.admin} foto={u?.foto} tam={48} />
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.95rem' }}>{detalle.admin}</p>
                      <p style={{ color: u?.foto ? '#666' : '#555', fontSize: '0.74rem', fontStyle: u?.foto ? 'normal' : 'italic' }}>
                        {u?.foto ? 'Con foto de perfil' : 'No subió foto de perfil'}
                      </p>
                    </div>
                  </div>
                  <Fila k="Correo" v={detalle.adminCorreo} color="#00BCD4" />
                  <Fila k="Teléfono" v={u?.telefono} />
                  <Fila k="Ciudad" v={u?.ciudad} />
                  <Fila k="Cuenta" v={u ? (u.estado === 'activo' ? 'Activa' : 'Suspendida') : null}
                    color={u?.estado === 'activo' ? '#22c55e' : '#ef4444'} />
                  <Fila k="Se registró" v={u?.alta || detalle.fecha} />
                  <Fila k="Último cambio" v={u?.actualizado} />
                  <Fila k="Empleados" v={empleados.length
                    ? empleados.length + ' con cuenta (' + empleados.filter(e => e.activo).length + ' activos)'
                    : 'Ninguno: atiende el administrador'} />
                </Bloque>
              )
            })()}

            {/* Acciones desde modal */}
            {detalle.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn w-full"
                  style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  onClick={() => { setRechazando(detalle); setDetalle(null) }}
                >✕ Rechazar</button>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                  onClick={() => aprobar(detalle.id)}
                >✓ Aprobar empresa</button>
              </div>
            )}
            {detalle.estado === 'activo' && (
              <button
                className="btn w-full"
                style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={() => suspender(detalle.id)}
              >Suspender empresa</button>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: RECHAZAR CON MOTIVO ══════════════════════════════════ */}
      {rechazando && (
        <div className="modal-overlay" onClick={() => setRechazando(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Rechazar solicitud</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setRechazando(null)}>✕</button>
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 16 }}>
              Vas a rechazar la solicitud de <strong style={{ color: '#f5f5f5' }}>{rechazando.nombre}</strong>. Puedes indicar el motivo para notificar al solicitante.
            </p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Motivo del rechazo (opcional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Ej: La dirección indicada no corresponde a un local comercial..."
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setRechazando(null)}>Cancelar</button>
              <button
                className="btn w-full"
                style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' }}
                onClick={() => rechazar(rechazando.id)}
              >Confirmar rechazo</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1a1a1a', border: `1px solid ${toast.color}44`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 300, animation: 'fadeIn 0.3s ease', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: '0.88rem', color: toast.color, fontWeight: 600 }}>{toast.msg}</span>
        </div>
      )}
    </Layout>
  )
}
