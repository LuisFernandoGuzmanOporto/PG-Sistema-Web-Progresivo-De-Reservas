import { useState, useEffect, useRef } from 'react'
import { rutaInterna } from '../lib/rutas'
import { useNavigate } from 'react-router-dom'
import { traerNotificaciones, marcarLeida, marcarTodasLeidas,
         ICONO_NOTIFICACION } from '../lib/notificaciones'

// ─────────────────────────────────────────────────────────────────────────────
// LA CAMPANA
//
// Va en el encabezado, igual para todos los roles: al cliente le avisa que le
// confirmaron la reserva, al complejo que le entro una, al organizador que se
// le inscribio un equipo.
//
// Se relee cada minuto. No es tiempo real y no hace falta que lo sea: nadie
// esta mirando la campana esperando el segundo exacto, y una consulta por
// minuto pesa mucho menos que mantener una conexion abierta por persona.
// ─────────────────────────────────────────────────────────────────────────────

const CADA = 60000

export default function Notificaciones() {
  const navigate = useNavigate()
  const [lista, setLista]   = useState([])
  const [abierta, setAbrir] = useState(false)
  const caja = useRef(null)

  const sinLeer = lista.filter(n => !n.leida).length

  const recargar = async () => {
    const r = await traerNotificaciones()
    if (r.lista) setLista(r.lista)
  }

  useEffect(() => {
    recargar()
    const t = setInterval(recargar, CADA)
    return () => clearInterval(t)
  }, [])

  // Cerrar al tocar fuera: en el celular no hay otra forma de salir del panel
  useEffect(() => {
    if (!abierta) return
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbrir(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierta])

  const abrir = async (n) => {
    setAbrir(false)
    if (!n.leida) {
      setLista(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x))
      await marcarLeida(n.id)
    }
    if (rutaInterna(n.enlace)) navigate(n.enlace)
  }

  const leerTodas = async () => {
    setLista(prev => prev.map(n => ({ ...n, leida: true })))
    await marcarTodasLeidas()
  }

  return (
    <div style={{ position: 'relative' }} ref={caja}>
      <button
        onClick={() => { setAbrir(a => !a); if (!abierta) recargar() }}
        aria-label={sinLeer ? sinLeer + ' notificaciones sin leer' : 'Notificaciones'}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 8,
          background: abierta ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
          border: '1px solid #333', cursor: 'pointer', fontSize: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background =
          abierta ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}
      >
        🔔
        {sinLeer > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18,
            padding: '0 5px', borderRadius: 9, background: '#8B0000',
            border: '2px solid #0f0f0f', color: '#fff', fontSize: '0.66rem',
            fontWeight: 700, fontFamily: 'Outfit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierta && (
        // En el celular el panel ocupa el ancho de la pantalla (globals.css):
        // pegado a la campana se salía por la izquierda
        <div className="panel-avisos" style={{
          position: 'absolute', top: 44, right: 0, zIndex: 60,
          width: 330, maxWidth: 'calc(100vw - 24px)',
          maxHeight: 420, overflowY: 'auto',
          background: '#141414', border: '1px solid #2a2a2a', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #222',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0, background: '#141414' }}>
            <span style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.86rem' }}>
              Notificaciones
            </span>
            {sinLeer > 0 && (
              <button onClick={leerTodas}
                style={{ background: 'none', border: 'none', color: '#00BCD4',
                  fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit', padding: 0 }}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          {lista.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.6rem', marginBottom: 6 }}>🔕</p>
              <p style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.5 }}>
                No tienes nada por ahora. Aquí te van a llegar las reservas,
                los torneos y las inscripciones.
              </p>
            </div>
          ) : lista.map(n => (
            <button key={n.id} onClick={() => abrir(n)}
              style={{
                width: '100%', display: 'flex', gap: 10, textAlign: 'left',
                padding: '12px 14px', borderTop: '1px solid #1e1e1e',
                background: n.leida ? 'transparent' : 'rgba(0,188,212,0.05)',
                border: 'none', cursor: 'pointer', fontFamily: 'Outfit',
              }}>
              <span style={{ fontSize: '1.05rem', flexShrink: 0, lineHeight: 1.3 }}>
                {ICONO_NOTIFICACION[n.tipo] || '🔔'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between',
                  gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.83rem', fontWeight: n.leida ? 500 : 700,
                    color: n.leida ? '#bbb' : '#f5f5f5' }}>
                    {n.titulo}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#555', flexShrink: 0 }}>
                    {n.cuando}
                  </span>
                </span>
                {n.detalle && (
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#777',
                    marginTop: 2, lineHeight: 1.45 }}>
                    {n.detalle}
                  </span>
                )}
              </span>
              {!n.leida && (
                <span style={{ width: 7, height: 7, borderRadius: '50%',
                  background: '#00BCD4', flexShrink: 0, marginTop: 6 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
