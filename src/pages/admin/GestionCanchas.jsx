// GestionCanchas.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import { CANCHAS_POR_EMPRESA, canchasDeEmpresa, reservasDeEmpresa,
         EMPRESAS, SESION, DEPORTES, ocupaLaCancha,
} from '../../lib/datos'
import { guardarCancha, cambiarEstadoCancha, registrarEnBitacora } from '../../lib/guardar'
import { urlPublica } from '../../lib/archivos'


const EMOJI_DEPORTE = {
  'Fútbol': '⚽', 'Wally': '🎾', 'Básquetbol': '🏀',
  'Voleibol': '🏐', 'Pádel': '🏓', 'Tenis': '🎾',
}

export function GestionCanchas() {
  const [showModal, setShowModal] = useState(false)

  // Las canchas son las mismas que ve el cliente en el perfil del complejo
  const [canchas, setCanchas] = useState(canchasDeEmpresa(SESION.empresaId))
  const reservas = reservasDeEmpresa(SESION.empresaId)
  const empresa  = EMPRESAS.find(e => e.id === SESION.empresaId)

  // Solo los deportes que el complejo declaro al registrarse: ofrecer todos
  // llevaba a publicar una cancha de tenis en un complejo que no lo tiene.
  // Si por algun motivo no quedo ninguno declarado, se ofrecen todos para no
  // dejar al administrador sin poder cargar nada.
  const deportesDelComplejo = empresa?.deportes?.length ? empresa.deportes : DEPORTES

  const reservasHoy = (nombre) =>
    reservas.filter(r => r.cancha === nombre && r.fecha === 'Hoy' && ocupaLaCancha(r)).length

  // Activar o desactivar escribe en la fuente unica: el cliente deja de verla
  const alternar = async (id) => {
    const cancha = canchas.find(c => c.id === id)
    const g = await cambiarEstadoCancha(id, !cancha.disponible)
    if (g.error) { setAvisoError(g.error); return }

    publicar(canchas.map(c => c.id === id ? { ...c, disponible: !c.disponible } : c))
    registrarEnBitacora({
      tipo: 'cancha',
      accion: cancha.disponible ? 'Dio de baja una cancha' : 'Habilitó una cancha',
      detalle: cancha.nombre,
    })
  }

  // Guardar escribe en la fuente unica: el cliente ve el cambio al instante
  const publicar = (lista) => {
    CANCHAS_POR_EMPRESA[SESION.empresaId] = lista
    setCanchas(lista)
  }

  // ── Formulario de cancha (nueva o edicion) ────────────────────────────
  const FORM_VACIO = { nombre: '', deporte: deportesDelComplejo[0], precio: '', capacidad: '',
                       apertura: '07:00', cierre: '22:00', descripcion: '' }
  const [form, setForm]       = useState(FORM_VACIO)
  const [editando, setEdit]   = useState(null)
  const [errores, setErrores] = useState({})
  const [avisoError, setAvisoError] = useState(null)
  const [aviso, setAviso]     = useState(null)

  const set = (campo) => (e) => {
    setForm(f => ({ ...f, [campo]: e.target.value }))
    setErrores(er => ({ ...er, [campo]: null }))
  }

  const abrirNueva = () => {
    setEdit(null); setForm(FORM_VACIO); setErrores({}); setShowModal(true)
  }

  const abrirEdicion = (c) => {
    setEdit(c.id)
    setForm({ nombre: c.nombre, deporte: c.deporte, precio: String(c.precio),
              capacidad: String(c.capacidad ?? ''), apertura: c.apertura || '07:00',
              cierre: c.cierre || '22:00', descripcion: c.descripcion || '' })
    setErrores({}); setShowModal(true)
  }

  /** Nombre unico, precio mayor a cero y horario coherente. */
  const validar = () => {
    const e = {}
    const nombre = form.nombre.trim()
    if (!nombre) e.nombre = 'Escribe el nombre de la cancha, por ejemplo «Cancha de Fútbol 1».'
    else if (nombre.length < 3) e.nombre = 'El nombre es muy corto: usa al menos 3 caracteres.'
    else if (canchas.some(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== editando))
      e.nombre = `Ya tienes una cancha llamada «${nombre}». Usa otro nombre para distinguirlas.`

    const precio = Number(form.precio)
    if (!form.precio) e.precio = 'Escribe el precio por hora en bolivianos.'
    else if (!Number.isFinite(precio) || precio <= 0) e.precio = 'El precio debe ser un número mayor a 0.'
    else if (precio > 5000) e.precio = 'El precio parece muy alto (más de Bs. 5.000 por hora). Revísalo.'

    if (form.capacidad && (!Number.isInteger(Number(form.capacidad)) || Number(form.capacidad) <= 0))
      e.capacidad = 'La capacidad debe ser un número entero mayor a 0.'
    if (form.apertura >= form.cierre)
      e.cierre = `La hora de cierre debe ser posterior a la de apertura (${form.apertura}).`
    return e
  }

  const guardar = async () => {
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) { irAlPrimerError(e); return }
    const datos = {
      nombre: form.nombre.trim(), deporte: form.deporte,
      precio: Number(form.precio), capacidad: Number(form.capacidad) || null,
      apertura: form.apertura, cierre: form.cierre,
      descripcion: form.descripcion.trim(),
    }
    const g = await guardarCancha({
      id: editando || undefined, empresaId: SESION.empresaId, ...datos,
      activa: editando ? undefined : true,
    })
    if (g.error) { setAvisoError(g.error); return }

    if (editando) {
      publicar(canchas.map(c => c.id === editando ? { ...c, ...datos } : c))
      setAviso('«' + datos.nombre + '» actualizada.')
    } else {
      publicar([...canchas, { id: g.cancha.id, ...datos, disponible: true }])
      setAviso('«' + datos.nombre + '» ya está publicada para los clientes.')
    }
    registrarEnBitacora({
      tipo: 'cancha',
      accion: editando ? 'Editó una cancha' : 'Publicó una cancha nueva',
      detalle: datos.nombre + ' · ' + datos.deporte + ' · Bs. ' + datos.precio + '/h',
    })
    setShowModal(false)
    setTimeout(() => setAviso(null), 3500)
  }

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏟️ Mis Canchas</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Gestiona las canchas de {empresa?.nombre}</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNueva}>+ Nueva Cancha</button>
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>✓ {aviso}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {canchas.map(c => (
          <div key={c.id} className="card" style={{ padding: 20 }}>
            <div className="cancha-img" style={{ height: 120, marginBottom: 16, borderRadius: 10 }}>
              <span style={{ fontSize: '2.5rem' }}>{EMOJI_DEPORTE[c.deporte] || '🏟️'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f5f5f5' }}>{c.nombre}</h3>
              <span className={`badge ${c.disponible ? 'badge-success' : 'badge-error'}`}>{c.disponible ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.82rem', color: '#666' }}>{c.deporte}</span>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f59e0b' }}>Bs. {c.precio}/hr</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#00BCD4', marginBottom: 12 }}>📅 {reservasHoy(c.nombre)} reservas hoy</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => abrirEdicion(c)}>Editar</button>
              <button className="btn btn-sm w-full" onClick={() => alternar(c.id)} style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                {c.disponible ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}

        {/* Add cancha card */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, cursor: 'pointer', border: '2px dashed #2a2a2a' }} onClick={abrirNueva}>
          <span style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>+</span>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>Agregar Cancha</p>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editando ? 'Editar cancha' : 'Nueva cancha'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nombre de la cancha *</label>
                <input className="input" placeholder="Ej: Cancha de Fútbol Principal"
                  value={form.nombre} onChange={set('nombre')}
                  {...propsCampo('nombre', errores.nombre)} />
                <MensajeCampo nombre="nombre" error={errores.nombre} />
              </div>

              <div className="form-group">
                <label className="form-label">Deporte *</label>
                <select className="input" value={form.deporte} onChange={set('deporte')}>
                  {deportesDelComplejo.map(d => <option key={d}>{d}</option>)}
                </select>
                {empresa?.deportes?.length > 0 && (
                  <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 4 }}>
                    Son los deportes que declaraste al registrar {empresa.nombre}.
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Precio por hora (Bs.) *</label>
                  <input className="input" type="number" min="1" placeholder="120"
                    value={form.precio} onChange={set('precio')}
                    {...propsCampo('precio', errores.precio)} />
                  <MensajeCampo nombre="precio" error={errores.precio} />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidad</label>
                  <input className="input" type="number" min="1" placeholder="10"
                    value={form.capacidad} onChange={set('capacidad')}
                    {...propsCampo('capacidad', errores.capacidad)} />
                  <MensajeCampo nombre="capacidad" error={errores.capacidad} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apertura</label>
                  <input className="input" type="time" value={form.apertura} onChange={set('apertura')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cierre</label>
                  <input className="input" type="time" value={form.cierre} onChange={set('cierre')}
                    {...propsCampo('cierre', errores.cierre)} />
                  <MensajeCampo nombre="cierre" error={errores.cierre} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input" rows={3} style={{ resize: 'none' }}
                  placeholder="Césped sintético, iluminación LED, vestuarios..."
                  value={form.descripcion} onChange={set('descripcion')} />
              </div>

              {/* El QR no va por cancha: el dinero cae siempre a la misma
                  cuenta. Se carga una sola vez en «Mi cuenta» y sirve para
                  todas. Antes habia un campo aca que no guardaba nada. */}
              <div className="form-group">
                <label className="form-label">🔲 Código QR de pago</label>
                <div style={{ border: '1px solid ' + (empresa?.qrPago ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'),
                  background: empresa?.qrPago ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.07)',
                  borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12,
                  alignItems: 'center', flexWrap: 'wrap' }}>
                  {empresa?.qrPago ? (
                    <>
                      <img src={urlPublica(empresa.qrPago)} alt="QR de pago"
                        style={{ width: 54, height: 54, objectFit: 'contain', background: '#fff',
                          borderRadius: 8, padding: 3 }} />
                      <p style={{ color: '#888', fontSize: '0.8rem', flex: 1, minWidth: 180, lineHeight: 1.5 }}>
                        Ya tienes tu QR cargado. Es el mismo para todas tus canchas.
                      </p>
                    </>
                  ) : (
                    <p style={{ color: '#f59e0b', fontSize: '0.8rem', flex: 1, minWidth: 180, lineHeight: 1.5 }}>
                      Todavía no cargaste tu QR. Sin él, el cliente no puede pagarte
                      la reserva de esta cancha.
                    </p>
                  )}
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => navigate('/mi-cuenta')}>
                    {empresa?.qrPago ? 'Cambiarlo' : 'Cargarlo ahora'}
                  </button>
                </div>
              </div>

              <AvisoFaltantes faltantes={Object.entries(errores).filter(([, v]) => v).map(([campo, texto]) => ({ campo, texto }))} error={avisoError} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={guardar}>
                  {editando ? 'Guardar cambios' : 'Crear cancha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default GestionCanchas
