import { useState } from 'react'
import { digitosDe, esTelefono, esUsuario, tieneNombreYApellido } from '../../lib/validaciones'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import {
  PERMISOS_EMPLEADO, PERMISOS_POR_DEFECTO, RESTRICCIONES_EMPLEADO, TURNOS,
  empleadosDeEmpresa, bitacoraDeEmpresa, TIPO_BITACORA, SESION, reservasDeEmpresa,
} from '../../lib/datos'
import { fechaCorta, hoyBolivia } from '../../lib/fecha'
import {
  guardarPermisos as guardarPermisosEnBase, cambiarEstadoEmpleado, registrarEnBitacora,
  crearCuentaEmpleado, cambiarClaveEmpleado,
} from '../../lib/guardar'


const FORM_INIT = {
  nombre: '', usuario: '', telefono: '',
  password: '', password2: '',
  turno: '',
  permisos: PERMISOS_POR_DEFECTO,
}

const COLORES = ['#8b5cf6', '#00BCD4', '#f59e0b', '#22c55e', '#ef4444', '#e879f9']

const iniciales = (nombre) => {
  const p = nombre.trim().split(' ')
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase()
}

export default function GestionEmpleados() {
  const [empleados, setEmpleados] = useState(empleadosDeEmpresa(SESION.empresaId))
  const [bitacora]                = useState(bitacoraDeEmpresa(SESION.empresaId))

  const [tab, setTab]           = useState('cuentas')
  const [filtroEmp, setFiltro]  = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)   // empleado al que se le editan permisos
  const [claveDe, setClaveDe]   = useState(null)   // empleado al que se le cambia la clave
  const [nuevaClave, setClave]  = useState({ a: '', b: '' })
  const [form, setForm]         = useState(FORM_INIT)
  const [aviso, setAviso]       = useState(null)

  const avisar = (txt) => { setAviso(txt); setTimeout(() => setAviso(null), 3000) }

  const togglePermisoForm = (key) => setForm(f => ({
    ...f,
    permisos: f.permisos.includes(key) ? f.permisos.filter(p => p !== key) : [...f.permisos, key],
  }))

  const togglePermisoEmpleado = (key) => setEditando(e => ({
    ...e,
    permisos: e.permisos.includes(key) ? e.permisos.filter(p => p !== key) : [...e.permisos, key],
  }))

  const usuarioRepetido = form.usuario.trim() !== '' &&
    empleados.some(e => e.usuario.toLowerCase() === form.usuario.trim().toLowerCase())
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm]  = useState(null)
  const [intento, setIntento]      = useState(false)

  // Cada campo con su motivo. Se muestran después del primer intento de guardar.
  const erroresEmp = {}
  {
    const usuario = form.usuario.trim()
    const digitos = digitosDe(form.telefono)
    if (!form.nombre.trim()) erroresEmp.nombre = 'Escribe el nombre y apellido del empleado.'
    else if (!tieneNombreYApellido(form.nombre)) erroresEmp.nombre = 'Falta el apellido: escribe nombre y apellido.'
    if (form.telefono.trim() && !esTelefono(form.telefono))
      erroresEmp.telefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}). Déjalo vacío si no lo sabes.`
    if (!usuario) erroresEmp.usuario = 'Escribe el usuario con el que va a entrar, por ejemplo rosa.v.'
    else if (!esUsuario(usuario))
      erroresEmp.usuario = 'El usuario solo puede tener letras sin tilde, números, punto o guion, y al menos 3 caracteres.'
    else if (usuarioRepetido) erroresEmp.usuario = `El usuario «${usuario}» ya existe en tu complejo. Prueba con otro, por ejemplo ${usuario}2.`
    if (!form.password) erroresEmp.password = 'Crea una contraseña para el empleado.'
    else if (form.password.length < 6) erroresEmp.password = `La contraseña debe tener al menos 6 caracteres (tiene ${form.password.length}).`
    if (!form.password2) erroresEmp.password2 = 'Repite la contraseña para confirmarla.'
    else if (form.password !== form.password2) erroresEmp.password2 = 'Las contraseñas no coinciden. Escríbelas de nuevo.'
  }
  const ORDEN_EMP = ['nombre', 'telefono', 'usuario', 'password', 'password2']
  const faltaEnEmpleado = intento
    ? ORDEN_EMP.filter(c => erroresEmp[c]).map(c => ({ campo: c, texto: erroresEmp[c] })) : []
  const pe = (c) => propsCampo(c, erroresEmp[c], intento)
  const me = (c) => <MensajeCampo nombre={c} error={erroresEmp[c]} mostrar={intento} />

  const crearEmpleado = async () => {
    setIntento(true)
    if (Object.keys(erroresEmp).length) { irAlPrimerError(erroresEmp, ORDEN_EMP); return }
    setGuardando(true)
    setErrorForm(null)
    const g = await crearCuentaEmpleado({
      usuario: form.usuario.trim(), password: form.password,
      nombre: form.nombre.trim(), telefono: form.telefono,
      turno: form.turno, permisos: form.permisos,
    })
    setGuardando(false)
    if (g.error) { setErrorForm(g.error); return }

    const nuevo = {
      id: g.empleado.id, empresa_id: SESION.empresaId,
      nombre: form.nombre.trim(), usuario: form.usuario.trim(), telefono: form.telefono,
      turno: form.turno, activo: true, permisos: form.permisos,
      creado: fechaCorta(hoyBolivia()),
    }
    setEmpleados(prev => [...prev, nuevo])
    setForm(FORM_INIT)
    setShowForm(false)
    avisar('Cuenta de ' + nuevo.nombre + ' creada. Entrégale el usuario y la contraseña.')
  }

  const guardarPermisos = async () => {
    const g = await guardarPermisosEnBase(editando.id, editando.permisos)
    if (g.error) { avisar('No se guardó el cambio. ' + g.error); return }

    setEmpleados(prev => prev.map(e => e.id === editando.id ? editando : e))
    registrarEnBitacora({
      tipo: 'cuenta', accion: 'Cambió los permisos de un empleado',
      detalle: editando.nombre + ' · ' + (editando.permisos.length || 'sin') + ' permisos',
    })
    avisar('Permisos de ' + editando.nombre + ' actualizados')
    setEditando(null)
  }

  const alternarActivo = async (emp) => {
    const g = await cambiarEstadoEmpleado(emp.id, !emp.activo)
    if (g.error) { avisar('No se guardó el cambio. ' + g.error); return }

    setEmpleados(prev => prev.map(e => e.id === emp.id ? { ...e, activo: !e.activo } : e))
    registrarEnBitacora({
      tipo: 'cuenta',
      accion: emp.activo ? 'Dio de baja a un empleado' : 'Reactivó a un empleado',
      detalle: emp.nombre,
    })
    avisar(emp.activo
      ? emp.nombre + ' fue dado de baja. Ya no puede entrar, pero su historial se conserva.'
      : emp.nombre + ' fue reactivado')
  }

  const [intentoClave, setIntentoClave] = useState(false)
  const erroresClave = {}
  if (!nuevaClave.a) erroresClave.claveA = 'Escribe la nueva contraseña.'
  else if (nuevaClave.a.length < 6) erroresClave.claveA = `La contraseña debe tener al menos 6 caracteres (tiene ${nuevaClave.a.length}).`
  if (!nuevaClave.b) erroresClave.claveB = 'Repite la contraseña para confirmarla.'
  else if (nuevaClave.a !== nuevaClave.b) erroresClave.claveB = 'Las contraseñas no coinciden. Escríbelas de nuevo.'

  const guardarClave = async () => {
    setIntentoClave(true)
    if (Object.keys(erroresClave).length) { irAlPrimerError(erroresClave, ['claveA', 'claveB']); return }
    setGuardando(true)
    setErrorForm(null)
    const g = await cambiarClaveEmpleado(claveDe.id, nuevaClave.a)
    setGuardando(false)
    if (g.error) { setErrorForm(g.error); return }

    avisar('Contraseña de ' + claveDe.nombre + ' actualizada. Comunícasela en persona.')
    setClaveDe(null)
    setClave({ a: '', b: '' })
  }

  const bitacoraVisible = filtroEmp === 'todos'
    ? bitacora
    : bitacora.filter(b => String(b.empleado_id) === String(filtroEmp))
  const numerosDeReserva = new Set(reservasDeEmpresa(SESION.empresaId).map(r => r.nro))

  const activos = empleados.filter(e => e.activo)

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🧑‍💼 Empleados</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>
            Crea las cuentas de tu personal y decide qué puede hacer cada uno
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(FORM_INIT); setIntento(false); setErrorForm(null); setShowForm(true) }}>
          + Nuevo empleado
        </button>
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>✓ {aviso}</p>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'cuentas' ? 'active' : ''}`} onClick={() => setTab('cuentas')}>
          Cuentas ({activos.length} activas de {empleados.length})
        </button>
        <button className={`tab ${tab === 'bitacora' ? 'active' : ''}`} onClick={() => setTab('bitacora')}>
          🧾 Bitácora ({bitacora.length})
        </button>
      </div>

      {/* ══ CUENTAS ══ */}
      {tab === 'cuentas' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
            {empleados.map((e, i) => {
              const color = COLORES[i % COLORES.length]
              return (
                <div key={e.id} className="card" style={{ padding: 20, opacity: e.activo ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                      {iniciales(e.nombre)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.95rem' }}>{e.nombre}</p>
                      <p style={{ color: '#666', fontSize: '0.78rem' }}>usuario: <strong style={{ color: '#888' }}>{e.usuario}</strong></p>
                    </div>
                    <span className="badge" style={{ marginLeft: 'auto', flexShrink: 0,
                      background: e.activo ? 'rgba(34,197,94,0.12)' : 'rgba(100,100,100,0.15)',
                      color: e.activo ? '#22c55e' : '#777' }}>
                      {e.activo ? 'Activo' : 'De baja'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                    <p style={{ color: '#666', fontSize: '0.78rem' }}>🕐 {e.turno}</p>
                    {e.telefono && <p style={{ color: '#666', fontSize: '0.78rem' }}>📞 {e.telefono}</p>}
                    <p style={{ color: '#555', fontSize: '0.75rem' }}>Cuenta creada el {e.creado}</p>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 12 }}>
                    <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Puede hacer ({e.permisos.length} de {PERMISOS_EMPLEADO.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {e.permisos.length === 0 && <span style={{ color: '#555', fontSize: '0.75rem' }}>Sin permisos asignados</span>}
                      {PERMISOS_EMPLEADO.filter(p => e.permisos.includes(p.key)).map(p => (
                        <span key={p.key} style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', background: 'rgba(0,188,212,0.1)', color: '#00BCD4' }}>
                          {p.icon} {p.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...e })}>Permisos</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setClaveDe(e); setClave({ a: '', b: '' }); setIntentoClave(false); setErrorForm(null) }}>🔑 Contraseña</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => alternarActivo(e)}>
                      {e.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lo que ningun empleado puede hacer */}
          <div className="card" style={{ padding: 20, borderLeft: '3px solid #ef4444' }}>
            <h3 style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
              🔒 Ningún empleado puede hacer esto
            </h3>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 12 }}>
              Está bloqueado siempre, sin importar los permisos que le actives. Solo tú lo haces.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {RESTRICCIONES_EMPLEADO.map(r => (
                <p key={r} style={{ color: '#888', fontSize: '0.8rem' }}>✕ {r}</p>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ BITACORA ══ */}
      {tab === 'bitacora' && (
        <div className="card">
          <div style={{ padding: 18, borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700 }}>Bitácora de actividad</h3>
              <p style={{ color: '#666', fontSize: '0.8rem' }}>Cada acción que hace un empleado queda registrada aquí</p>
            </div>
            <select className="input" style={{ maxWidth: 220 }} value={filtroEmp} onChange={e => setFiltro(e.target.value)}>
              <option value="todos">Todos los empleados</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>

          {bitacoraVisible.length === 0 ? (
            <div className="empty-state"><p>Sin actividad registrada</p></div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bitacoraVisible.map(b => {
                const t = TIPO_BITACORA[b.tipo] || TIPO_BITACORA.cuenta
                // La bitácora guarda lo que se hizo aunque la reserva después se
                // borre. Sin este aviso parecía una reserva perdida, que no
                // estaba en ninguna pestaña de Reservas.
                const nro = String(b.detalle || '').match(/RSV-[\w-]+/)?.[0]
                const yaNoExiste = nro && !numerosDeReserva.has(nro)
                return (
                  <div key={b.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a2a', borderRadius: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{t.icon}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.87rem' }}>
                        {b.accion} <span style={{ color: t.color, fontWeight: 700 }}>· {b.empleado}</span>
                      </p>
                      <p style={{ color: '#666', fontSize: '0.78rem' }}>
                        {b.detalle}
                        {yaNoExiste && <span style={{ color: '#555', fontStyle: 'italic' }}> · esta reserva ya fue eliminada</span>}
                      </p>
                    </div>
                    <span style={{ color: '#555', fontSize: '0.75rem', flexShrink: 0, textAlign: 'right' }}>
                      {b.fecha}<br />{b.hora}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL: NUEVO EMPLEADO ══ */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Nuevo empleado</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>
                  Tú creas la cuenta y le entregas el usuario y la contraseña en persona
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a', marginBottom: 16 }}>
              <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>👤 Datos de la persona</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Rosa Villarroel" {...pe('nombre')} />
                  {me('nombre')}
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="input" inputMode="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="Ej: 70012345" {...pe('telefono')} />
                  {me('telefono')}
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Turno (opcional)</label>
                  <select className="input" value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}>
                    <option value="">Sin turno fijo</option>
                    {TURNOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 4 }}>
                    Solo sirve para saber a quién buscar a cada hora. No limita cuándo
                    puede entrar: si trabaja todo el día, déjalo sin turno.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a', marginBottom: 16 }}>
              <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>🔑 Acceso al sistema</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Usuario *</label>
                  <input className="input" autoComplete="off" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} placeholder="Ej: rosa.v" {...pe('usuario')} />
                  {me('usuario')}
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña *</label>
                  <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" {...pe('password')} />
                  {me('password')}
                </div>
                <div className="form-group">
                  <label className="form-label">Repetir contraseña *</label>
                  <input className="input" type="password" autoComplete="new-password" value={form.password2} onChange={e => setForm(f => ({ ...f, password2: e.target.value }))} placeholder="Repite la contraseña" {...pe('password2')} />
                  {me('password2')}
                </div>
              </div>
              <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 6 }}>
                Solo tú puedes cambiar esta contraseña después. El empleado no puede modificarla.
              </p>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #2a2a2a', marginBottom: 16 }}>
              <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>✅ ¿Qué podrá hacer?</p>
              <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 12 }}>
                Solo verá en su panel las funciones que actives aquí.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PERMISOS_EMPLEADO.map(p => {
                  const on = form.permisos.includes(p.key)
                  return (
                    <button key={p.key} onClick={() => togglePermisoForm(p.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: 10,
                        background: on ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid ' + (on ? 'rgba(34,197,94,0.35)' : '#2a2a2a') }}>
                      <span style={{ width: 38, height: 22, borderRadius: 20, background: on ? '#22c55e' : '#333', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
                        <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', color: '#f5f5f5', fontWeight: 600, fontSize: '0.85rem' }}>{p.icon} {p.label}</span>
                        <span style={{ display: 'block', color: '#666', fontSize: '0.76rem' }}>{p.desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <AvisoFaltantes faltantes={faltaEnEmpleado} error={errorForm} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
                disabled={guardando} onClick={crearEmpleado}>
                {guardando ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: EDITAR PERMISOS ══ */}
      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Permisos de {editando.nombre}</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Activa o desactiva lo que puede hacer</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {PERMISOS_EMPLEADO.map(p => {
                const on = editando.permisos.includes(p.key)
                return (
                  <button key={p.key} onClick={() => togglePermisoEmpleado(p.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: 10,
                      background: on ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid ' + (on ? 'rgba(34,197,94,0.35)' : '#2a2a2a') }}>
                    <span style={{ width: 38, height: 22, borderRadius: 20, background: on ? '#22c55e' : '#333', position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: '#f5f5f5', fontWeight: 600, fontSize: '0.85rem' }}>{p.icon} {p.label}</span>
                      <span style={{ display: 'block', color: '#666', fontSize: '0.76rem' }}>{p.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={guardarPermisos}>Guardar permisos</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CAMBIAR CONTRASEÑA ══ */}
      {claveDe && (
        <div className="modal-overlay" onClick={() => setClaveDe(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Cambiar contraseña</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>{claveDe.nombre} · usuario {claveDe.usuario}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setClaveDe(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nueva contraseña *</label>
              <input className="input" type="password" autoComplete="new-password" value={nuevaClave.a} onChange={e => setClave(c => ({ ...c, a: e.target.value }))} placeholder="Mínimo 6 caracteres" {...propsCampo('claveA', erroresClave.claveA, intentoClave)} />
              <MensajeCampo nombre="claveA" error={erroresClave.claveA} mostrar={intentoClave} />
            </div>
            <div className="form-group">
              <label className="form-label">Repetir contraseña *</label>
              <input className="input" type="password" autoComplete="new-password" value={nuevaClave.b} onChange={e => setClave(c => ({ ...c, b: e.target.value }))} placeholder="Repite la contraseña" {...propsCampo('claveB', erroresClave.claveB, intentoClave)} />
              <MensajeCampo nombre="claveB" error={erroresClave.claveB} mostrar={intentoClave} />
            </div>
            <p style={{ color: '#555', fontSize: '0.75rem', marginBottom: 14 }}>
              Entrégasela en persona. El empleado no puede cambiarla por su cuenta.
            </p>
            <AvisoFaltantes error={errorForm} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setClaveDe(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
                disabled={guardando} onClick={guardarClave}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
