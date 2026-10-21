import { useState } from 'react'
import { USUARIO_ACTUAL, SESION, mismo } from '../../../lib/datos'
import { hace } from '../../../lib/notificaciones'
import { guardarComentario, editarComentario, borrarComentario } from '../../../lib/guardar'
import Confirmar from '../../../components/Confirmar'
import Avatar from '../../../components/Avatar'

// ─────────────────────────────────────────────────────────────────────────────
// LA CONVERSACIÓN DE UN COMPLEJO
//
// Cualquiera que entra ve todos los comentarios, puede escribir los que quiera
// y responderle a otro. Va aparte de las estrellas a propósito: la calificación
// es un voto y hay una sola por persona porque arma el promedio; esto es charla
// y no tiene por qué estar limitado. Lo que escribe el administrador del
// complejo lleva su marca.
//
// El hilo se dibuja con un solo nivel de sangría. Si se anidara sin límite,
// en un celular la quinta respuesta quedaría de dos palabras de ancho.
// ─────────────────────────────────────────────────────────────────────────────

const LARGO_MAXIMO = 500

/** Caja de escribir. Se usa igual para un comentario nuevo y para responder. */
function Caja({ valor, onCambiar, onEnviar, onCancelar, enviando, textoBoton, placeholder, autoFoco }) {
  const falta = !valor.trim()
  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        className="input" rows={2} value={valor} placeholder={placeholder}
        autoFocus={autoFoco} maxLength={LARGO_MAXIMO}
        onChange={e => onCambiar(e.target.value)}
        style={{ resize: 'none', width: '100%', boxSizing: 'border-box' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: '#555' }}>
          {valor.length}/{LARGO_MAXIMO}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onCancelar && (
            <button onClick={onCancelar} disabled={enviando}
              style={{ padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Outfit',
                fontWeight: 600, fontSize: '0.78rem', background: 'transparent',
                border: '1px solid #333', color: '#888' }}>
              Cancelar
            </button>
          )}
          <button onClick={onEnviar} disabled={falta || enviando}
            style={{ padding: '7px 16px', borderRadius: 9, fontFamily: 'Outfit',
              fontWeight: 700, fontSize: '0.78rem',
              cursor: falta || enviando ? 'not-allowed' : 'pointer',
              background: falta ? '#1a1a1a' : 'rgba(0,188,212,0.15)',
              border: '1px solid ' + (falta ? '#2a2a2a' : 'rgba(0,188,212,0.4)'),
              color: falta ? '#555' : '#00BCD4' }}>
            {enviando ? 'Enviando…' : textoBoton}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Un comentario con sus respuestas debajo. */
function Comentario({ c, esAdmin, adminId, sangria, onResponder, onEditar, onBorrar, trabajando }) {
  const [respondiendo, setRespondiendo] = useState(false)
  const [editando, setEditando]         = useState(false)
  const [texto, setTexto]               = useState('')
  const [borrador, setBorrador]         = useState(c.texto)

  const esMio    = mismo(c.autor_id, SESION.usuarioId)
  // Lo escribio quien administra el complejo: se marca para que nadie lo
  // confunda con la opinion de un cliente
  const delComplejo = Boolean(adminId) && mismo(c.autor_id, adminId)
  const puedeBorrar = esMio || esAdmin      // el complejo modera su propia ficha

  const enviarRespuesta = async () => {
    const ok = await onResponder(c, texto)
    if (ok) { setTexto(''); setRespondiendo(false) }
  }

  const guardarEdicion = async () => {
    const ok = await onEditar(c, borrador)
    if (ok) setEditando(false)
  }

  return (
    <div style={{ marginLeft: sangria ? 34 : 0, marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Avatar nombre={c.autor} foto={c.foto} tam={30}
          fondo={delComplejo ? '#f59e0b' : esMio ? '#00BCD4' : '#8B0000'} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#f5f5f5' }}>
              {c.autor}{esMio && <span style={{ color: '#00BCD4', fontWeight: 600 }}> · tú</span>}
            </span>
            {delComplejo && (
              <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b' }}>
                ADMINISTRADOR DEL COMPLEJO
              </span>
            )}
            <span style={{ fontSize: '0.68rem', color: '#555' }}>
              {hace(c.creado)}{c.editado && ' · editado'}
            </span>
          </div>

          {editando ? (
            <Caja valor={borrador} onCambiar={setBorrador} onEnviar={guardarEdicion}
              onCancelar={() => { setBorrador(c.texto); setEditando(false) }}
              enviando={trabajando} textoBoton="Guardar" autoFoco />
          ) : (
            <p style={{ fontSize: '0.83rem', color: '#bbb', lineHeight: 1.55, marginTop: 2,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {c.texto}
            </p>
          )}

          {!editando && (
            // Con relleno, para que el dedo los acierte en el celular
            <div style={{ display: 'flex', gap: 10, marginTop: 0 }}>
              <button onClick={() => setRespondiendo(r => !r)}
                style={{ background: 'none', border: 'none', padding: '7px 4px', cursor: 'pointer',
                  fontFamily: 'Outfit', fontSize: '0.72rem', color: '#00BCD4', fontWeight: 600 }}>
                {respondiendo ? 'Cerrar' : 'Responder'}
              </button>
              {esMio && (
                <button onClick={() => setEditando(true)}
                  style={{ background: 'none', border: 'none', padding: '7px 4px', cursor: 'pointer',
                    fontFamily: 'Outfit', fontSize: '0.72rem', color: '#666' }}>
                  Editar
                </button>
              )}
              {puedeBorrar && (
                <button onClick={() => onBorrar(c)}
                  style={{ background: 'none', border: 'none', padding: '7px 4px', cursor: 'pointer',
                    fontFamily: 'Outfit', fontSize: '0.72rem', color: '#666' }}>
                  {esMio ? 'Borrar' : 'Quitar'}
                </button>
              )}
            </div>
          )}

          {respondiendo && (
            <Caja valor={texto} onCambiar={setTexto} onEnviar={enviarRespuesta}
              onCancelar={() => { setTexto(''); setRespondiendo(false) }}
              enviando={trabajando} textoBoton="Responder"
              placeholder={'Responderle a ' + c.autor + '…'} autoFoco />
          )}
        </div>
      </div>

      {/* Las respuestas van con una sola sangría, no una por nivel */}
      {(c.respuestas || []).map(r => (
        <Comentario key={r.id} c={r} esAdmin={esAdmin} adminId={adminId} sangria
          onResponder={onResponder} onEditar={onEditar} onBorrar={onBorrar}
          trabajando={trabajando} />
      ))}
    </div>
  )
}

export default function Comentarios({ empresaId, hilo, esAdmin, adminId,
                                      onCambio, titulo = 'Comentarios' }) {
  const [nuevo, setNuevo]         = useState('')
  const [trabajando, setTrabajo]  = useState(false)
  const [error, setError]         = useState(null)
  const [porBorrar, setPorBorrar] = useState(null)

  const cuantos = (lista) => lista.reduce((n, c) => n + 1 + cuantos(c.respuestas || []), 0)

  const publicar = async () => {
    setError(null); setTrabajo(true)
    const r = await guardarComentario({ empresaId, texto: nuevo })
    setTrabajo(false)
    if (r.error) { setError(r.error); return }
    setNuevo('')
    onCambio()
  }

  const responder = async (c, texto) => {
    setError(null); setTrabajo(true)
    const r = await guardarComentario({ empresaId, texto, respondeA: c.id })
    setTrabajo(false)
    if (r.error) { setError(r.error); return false }
    onCambio()
    return true
  }

  const editar = async (c, texto) => {
    setError(null); setTrabajo(true)
    const r = await editarComentario(c.id, texto)
    setTrabajo(false)
    if (r.error) { setError(r.error); return false }
    onCambio()
    return true
  }

  const borrar = async () => {
    setTrabajo(true)
    const r = await borrarComentario(porBorrar.id)
    setTrabajo(false)
    setPorBorrar(null)
    if (r.error) { setError(r.error); return }
    onCambio()
  }

  const total = cuantos(hilo)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <h3 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.95rem' }}>💬 {titulo}</h3>
        <span style={{ color: '#555', fontSize: '0.78rem' }}>
          {total === 0 ? 'todavía nadie escribió' : total + (total === 1 ? ' mensaje' : ' mensajes')}
        </span>
      </div>

      <p style={{ color: '#666', fontSize: '0.75rem', lineHeight: 1.5, marginBottom: 4 }}>
        Todos pueden leer los comentarios, escribir uno nuevo o responderle a
        cualquiera. Las estrellas van aparte: son un voto por persona.
      </p>

      <Caja valor={nuevo} onCambiar={setNuevo} onEnviar={publicar} enviando={trabajando}
        textoBoton="Comentar"
        placeholder="Escribe tu comentario…" />

      {error && (
        <p role="alert" className="mensaje-campo" style={{ marginTop: 8 }}>⚠ {error}</p>
      )}

      <div style={{ marginTop: 10 }}>
        {hilo.map(c => (
          <Comentario key={c.id} c={c} esAdmin={esAdmin} adminId={adminId}
            onResponder={responder} onEditar={editar} onBorrar={setPorBorrar}
            trabajando={trabajando} />
        ))}
      </div>

      <Confirmar
        abierto={Boolean(porBorrar)}
        titulo={mismo(porBorrar?.autor_id, SESION.usuarioId)
          ? '¿Borrar tu comentario?'
          : '¿Quitar el comentario de ' + (porBorrar?.autor || '') + '?'}
        detalle="Las respuestas que cuelgan de él también se van. No se puede deshacer."
        textoSi="Sí, borrarlo"
        trabajando={trabajando}
        onSi={borrar}
        onNo={() => setPorBorrar(null)} />
    </div>
  )
}
