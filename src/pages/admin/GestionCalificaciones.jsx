import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import Comentarios from '../user/empresa/Comentarios'
import { calificacionesDeEmpresa, promedioEstrellas, hiloDeComentarios,
         comentariosDeEmpresa, SESION, mismo } from '../../lib/datos'
import { recargarComentarios } from '../../lib/carga'

// ─────────────────────────────────────────────────────────────────────────────
// CALIFICACIONES Y COMENTARIOS DEL COMPLEJO
//
// Las estrellas y los comentarios van por separado, igual que en la ficha que
// ven los clientes:
//
//   - arriba, el promedio y cuántos votos hay de cada estrella
//   - abajo, la misma conversación pública, donde el administrador responde y
//     su mensaje sale marcado como «Administrador del complejo»
// ─────────────────────────────────────────────────────────────────────────────

export default function GestionCalificaciones() {
  const empresaId = SESION.empresaId
  const calificaciones = calificacionesDeEmpresa(empresaId)

  const [version, setVersion]   = useState(0)
  const [cargando, setCargando] = useState(true)
  const refrescar = async () => {
    await recargarComentarios(empresaId)
    setVersion(v => v + 1)
  }
  useEffect(() => {
    refrescar().finally(() => setCargando(false))
  }, [empresaId])

  const hilo = hiloDeComentarios(empresaId)
  const todos = comentariosDeEmpresa(empresaId)

  // Un comentario de un cliente queda «sin responder» mientras nadie del
  // complejo le haya contestado
  const respondidos = new Set(todos.filter(c => mismo(c.autor_id, SESION.usuarioId) && c.responde_a)
                                   .map(c => String(c.responde_a)))
  const sinResponder = hilo.filter(c => !mismo(c.autor_id, SESION.usuarioId) && !respondidos.has(String(c.id))).length

  const promedio = promedioEstrellas(calificaciones)
  const distribucion = [5,4,3,2,1].map(e => ({
    estrella: e,
    cantidad: calificaciones.filter(c => c.estrellas === e).length,
  }))

  return (
    <Layout role="admin">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>★ Calificaciones y comentarios</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Las estrellas que votaron los clientes y lo que escriben sobre tu complejo</p>
      </div>

      {/* Estrellas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, marginBottom: 24, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24 }}>
        <div style={{ textAlign: 'center', paddingRight: 28, borderRight: '1px solid #2a2a2a' }}>
          <p style={{ fontFamily: 'Bebas Neue', fontSize: '4.5rem', color: '#f59e0b', lineHeight: 1, marginBottom: 6 }}>{promedio}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 8 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ fontSize: 22, color: n <= Math.round(promedio) ? '#f59e0b' : '#2a2a2a' }}>★</span>
            ))}
          </div>
          <p style={{ color: '#555', fontSize: '0.78rem' }}>{calificaciones.length} votos</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          {distribucion.map(d => {
            const pct = calificaciones.length ? Math.round((d.cantidad / calificaciones.length) * 100) : 0
            return (
              <div key={d.estrella} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, minWidth: 10 }}>{d.estrella}</span>
                <span style={{ fontSize: 13, color: '#f59e0b' }}>★</span>
                <div style={{ flex: 1, height: 7, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: '#f59e0b', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#555', minWidth: 20, textAlign: 'right' }}>{d.cantidad}</span>
                <span style={{ fontSize: '0.7rem', color: '#444', minWidth: 28 }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* De a cuatro en la computadora; en el celular, de a dos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Promedio',           valor: promedio + ' ★',                                    color: '#f59e0b', emoji: '⭐' },
          { label: 'Votos de 4 y 5',     valor: calificaciones.filter(c => c.estrellas >= 4).length, color: '#22c55e', emoji: '👍' },
          { label: 'Votos de 1 y 2',     valor: calificaciones.filter(c => c.estrellas <= 2).length, color: '#ef4444', emoji: '👎' },
          { label: 'Comentarios sin responder', valor: sinResponder,                               color: '#00BCD4', emoji: '💬' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: 6 }}>{s.emoji} {s.label}</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: s.color }}>{s.valor}</p>
          </div>
        ))}
      </div>

      {/* Comentarios: el admin responde y su mensaje sale marcado */}
      <div className="card" style={{ padding: 20 }}>
        {cargando && hilo.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Cargando comentarios…</p>
        ) : (
          <Comentarios
            key={'admin-' + version}
            empresaId={empresaId}
            adminId={SESION.usuarioId}
            hilo={hilo}
            esAdmin
            onCambio={refrescar}
            titulo="Comentarios de los clientes" />
        )}
      </div>
    </Layout>
  )
}
