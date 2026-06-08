import { useState } from 'react'
import Layout from '../../components/layout/Layout'

const EMPRESAS_INIT = [
  {
    id: 1, nombre: 'Sport Center', admin: 'Pedro García', adminCorreo: 'pedro@sportcenter.com',
    canchas: 5, estado: 'activo', usuarios: 124, fecha: '15 Ene 2026',
    zona: 'Zona Norte', direccion: 'Av. Blanco Galindo Km 5', telefono: '4-123456',
    deportes: ['Fútbol', 'Wally', 'Pádel'],
    descripcion: 'El complejo deportivo más grande de la zona norte con canchas de primer nivel e iluminación nocturna.',
  },
  {
    id: 2, nombre: 'Complejo Deportivo Norte', admin: 'María Torres', adminCorreo: 'maria@cdnorte.com',
    canchas: 3, estado: 'activo', usuarios: 89, fecha: '20 Ene 2026',
    zona: 'Zona Norte', direccion: 'Calle Lanza 230', telefono: '4-234567',
    deportes: ['Fútbol', 'Básquetbol'],
    descripcion: 'Complejo familiar con canchas techadas y vestuarios completos.',
  },
  {
    id: 3, nombre: 'Complejo Deportivo Este', admin: 'Luis Quispe', adminCorreo: 'luis@cdeste.com',
    canchas: 4, estado: 'activo', usuarios: 76, fecha: '25 Ene 2026',
    zona: 'Zona Este', direccion: 'Av. América 789', telefono: '4-345678',
    deportes: ['Wally'],
    descripcion: 'El mejor complejo de wally en Cochabamba. Tres canchas techadas con iluminación LED.',
  },
  {
    id: 4, nombre: 'Wally Zone', admin: 'Carlos Rios', adminCorreo: 'carlos@wallyzone.com',
    canchas: 0, estado: 'pendiente', usuarios: 0, fecha: '1 Jun 2026',
    zona: 'Zona Sur', direccion: 'Av. Petrolera 456', telefono: '78901234',
    deportes: ['Wally', 'Pádel'],
    descripcion: 'Nuevo complejo especializado en wally y pádel en la zona sur de la ciudad. Canchas techadas con piso sintético.',
    logoUrl: null, fotoUrl: null,
  },
  {
    id: 5, nombre: 'Gimnasio Central', admin: 'Ana Morales', adminCorreo: 'ana@gimcentral.com',
    canchas: 0, estado: 'pendiente', usuarios: 0, fecha: '3 Jun 2026',
    zona: 'Centro', direccion: 'Calle España 234', telefono: '4-234567',
    deportes: ['Básquetbol', 'Voleibol'],
    descripcion: 'Especialistas en básquetbol con cancha techada y piso de madera profesional en pleno centro.',
    logoUrl: null, fotoUrl: null,
  },
  {
    id: 6, nombre: 'Pistas Tennis Club', admin: 'Roberto Silva', adminCorreo: 'roberto@tennisclub.com',
    canchas: 6, estado: 'suspendido', usuarios: 45, fecha: '10 Ene 2026',
    zona: 'Zona Norte', direccion: 'Calle Tarija 100', telefono: '4-456789',
    deportes: ['Tenis', 'Pádel'],
    descripcion: 'Club de tenis y pádel con 6 canchas profesionales.',
  },
]

const ESTADO_STYLE = {
  activo:     { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', label: 'Activo'     },
  pendiente:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Pendiente'  },
  suspendido: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Suspendido' },
  rechazado:  { bg: 'rgba(100,100,100,0.12)', color: '#666',    label: 'Rechazado'  },
}

export default function GestionEmpresas() {
  const [empresas, setEmpresas]       = useState(EMPRESAS_INIT)
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
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, estado: 'activo' } : e))
    setDetalle(null)
    mostrarToast('✅ Empresa aprobada correctamente')
  }

  const rechazar = (id) => {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, estado: 'rechazado' } : e))
    setRechazando(null)
    setMotivoRechazo('')
    setDetalle(null)
    mostrarToast('Solicitud rechazada', '#ef4444')
  }

  const suspender = (id) => {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, estado: 'suspendido' } : e))
    setDetalle(null)
    mostrarToast('Empresa suspendida', '#f59e0b')
  }

  const reactivar = (id) => {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, estado: 'activo' } : e))
    mostrarToast('✅ Empresa reactivada')
  }

  const pendientes  = empresas.filter(e => e.estado === 'pendiente').length
  const activas     = empresas.filter(e => e.estado === 'activo').length
  const suspendidas = empresas.filter(e => e.estado === 'suspendido').length

  const filtradas = filtro === 'todos' ? empresas : empresas.filter(e => e.estado === filtro)

  return (
    <Layout role="superadmin">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
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
      <div className="card" style={{ overflow: 'hidden' }}>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">Solicitud — {detalle.nombre}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(null)}>✕</button>
            </div>

            {/* Estado */}
            <div style={{ marginBottom: 20 }}>
              {(() => { const est = ESTADO_STYLE[detalle.estado] || ESTADO_STYLE.suspendido; return (
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: est.bg, color: est.color }}>{est.label}</span>
              )})()}
            </div>

            {/* Fotos si existen */}
            {(detalle.logoUrl || detalle.fotoUrl) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {detalle.logoUrl && (
                  <div>
                    <p style={{ fontSize: '0.68rem', color: '#555', marginBottom: 4 }}>Logo</p>
                    <img src={detalle.logoUrl} alt="logo" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a2a' }} />
                  </div>
                )}
                {detalle.fotoUrl && (
                  <div>
                    <p style={{ fontSize: '0.68rem', color: '#555', marginBottom: 4 }}>Foto del complejo</p>
                    <img src={detalle.fotoUrl} alt="foto" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a2a' }} />
                  </div>
                )}
              </div>
            )}

            {/* Datos empresa */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <p style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 10 }}>Datos de la empresa</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { label: 'Nombre',    value: detalle.nombre },
                  { label: 'Zona',      value: detalle.zona },
                  { label: 'Dirección', value: detalle.direccion },
                  { label: 'Teléfono', value: detalle.telefono },
                  { label: 'Deportes',  value: detalle.deportes.join(', ') },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', gap: 12, fontSize: '0.83rem' }}>
                    <span style={{ color: '#555', minWidth: 70, flexShrink: 0 }}>{r.label}</span>
                    <span style={{ color: '#ccc', fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ paddingTop: 6, borderTop: '1px solid #2a2a2a', marginTop: 2 }}>
                  <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5 }}>{detalle.descripcion}</p>
                </div>
              </div>
            </div>

            {/* Datos admin */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 10 }}>Administrador</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.83rem' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#555', minWidth: 70 }}>Nombre</span>
                  <span style={{ color: '#ccc', fontWeight: 500 }}>{detalle.admin}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#555', minWidth: 70 }}>Correo</span>
                  <span style={{ color: '#00BCD4' }}>{detalle.adminCorreo}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#555', minWidth: 70 }}>Fecha</span>
                  <span style={{ color: '#666' }}>{detalle.fecha}</span>
                </div>
              </div>
            </div>

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
              Vas a rechazar la solicitud de <strong style={{ color: '#f5f5f5' }}>{rechazando.nombre}</strong>. Podés indicar el motivo para notificar al solicitante.
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
