import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { empresasActivas, entrenamientosDeEmpresa } from '../../lib/datos'

const DEPORTE_COLORES = {
  'Fútbol': '#ef4444', 'Wally': '#00BCD4', 'Básquetbol': '#f59e0b',
  'Voleibol': '#22c55e', 'Pádel': '#8b5cf6',
}

const NIVEL_COLORES = {
  'Principiante': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  'Intermedio':   { color: '#00BCD4', bg: 'rgba(0,188,212,0.12)'  },
  'Avanzado':     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const DIA_LARGO = { Lun: 'Lunes', Mar: 'Martes', Mie: 'Miércoles', Jue: 'Jueves', Vie: 'Viernes', Sab: 'Sábado', Dom: 'Domingo' }

// Todos los entrenamientos publicados por los complejos activos, con su sede
const listaEntrenamientos = () => empresasActivas().flatMap(e =>
  entrenamientosDeEmpresa(e.id).map(ent => ({ ...ent, empresa: e.nombre, empresa_id: e.id, emoji: e.emoji })))

export default function Entrenamientos() {
  const navigate = useNavigate()

  const [filtroDeporte, setDeporte] = useState('todos')
  const [filtroDia, setDia]         = useState('todos')

  const TODOS = listaEntrenamientos()

  const deportes = ['todos', ...new Set(TODOS.map(e => e.deporte))]

  const visibles = TODOS.filter(e =>
    (filtroDeporte === 'todos' || e.deporte === filtroDeporte) &&
    (filtroDia === 'todos' || (e.dias || []).includes(filtroDia)))

  return (
    <Layout role="user">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏃 Entrenamientos</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>
          Horarios publicados por los complejos deportivos de Cochabamba
        </p>
      </div>

      {/* Cómo funciona: es horario informativo, no hay inscripción en línea */}
      <div style={{ padding: '14px 18px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.18)', borderRadius: 12, marginBottom: 20 }}>
        <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
          ❓ ¿Cómo participo?
        </p>
        <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.6 }}>
          No hay inscripción en línea. Preséntate en el complejo el día y la hora indicados, con ropa
          deportiva, y coordina el pago directamente con el entrenador. El precio de cada entrenamiento
          está en su tarjeta.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {deportes.map(d => (
          <button key={d} onClick={() => setDeporte(d)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: '0.8rem', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer',
              background: filtroDeporte === d ? 'rgba(139,0,0,0.2)' : 'rgba(255,255,255,0.03)',
              border: '1px solid ' + (filtroDeporte === d ? 'rgba(139,0,0,0.5)' : '#2a2a2a'),
              color: filtroDeporte === d ? '#ff6b6b' : '#888',
            }}>
            {d === 'todos' ? 'Todos los deportes' : d}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {['todos', ...DIAS_SEMANA].map(d => (
          <button key={d} onClick={() => setDia(d)}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: '0.76rem', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer',
              background: filtroDia === d ? 'rgba(0,188,212,0.15)' : 'transparent',
              border: '1px solid ' + (filtroDia === d ? 'rgba(0,188,212,0.4)' : '#2a2a2a'),
              color: filtroDia === d ? '#00BCD4' : '#666',
            }}>
            {d === 'todos' ? 'Cualquier día' : DIA_LARGO[d]}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏃</div>
          <h3>Sin entrenamientos con esos filtros</h3>
          <p>Prueba con otro deporte u otro día de la semana</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {visibles.map(e => {
            const color = DEPORTE_COLORES[e.deporte] || '#00BCD4'
            const nivel = NIVEL_COLORES[e.nivel] || NIVEL_COLORES['Principiante']
            return (
              <div key={e.empresa_id + '-' + e.id} className="card" style={{ padding: 20, borderLeft: '3px solid ' + color }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div>
                    <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.95rem' }}>{e.nombre}</p>
                    <p style={{ color, fontSize: '0.78rem', fontWeight: 600 }}>{e.deporte}</p>
                  </div>
                  <span className="badge" style={{ background: nivel.bg, color: nivel.color, flexShrink: 0 }}>{e.nivel}</span>
                </div>

                {e.descripcion && (
                  <p style={{ color: '#777', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 12 }}>{e.descripcion}</p>
                )}

                {/* Días y horario */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {DIAS_SEMANA.map(d => {
                    const toca = (e.dias || []).includes(d)
                    return (
                      <span key={d} style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                        background: toca ? color + '22' : 'transparent',
                        border: '1px solid ' + (toca ? color + '55' : '#232323'),
                        color: toca ? color : '#3a3a3a',
                      }}>{d}</span>
                    )
                  })}
                </div>
                <p style={{ color: '#f5f5f5', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
                  🕐 {e.horaInicio} - {e.horaFin}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                  <p style={{ color: '#888', fontSize: '0.8rem' }}>👨‍🏫 {e.entrenador}</p>
                  <p style={{ color: '#888', fontSize: '0.8rem' }}>{e.emoji} {e.empresa}</p>
                  {/* Cuantos entran. Si el complejo no puso limite no se dice nada:
                      inventar un «sin limite» seria decir algo que no eligio */}
                  {e.cupo != null && (
                    <p style={{ color: '#888', fontSize: '0.8rem' }}>👥 Cupo: {e.cupo} personas</p>
                  )}
                  {e.paraNinos && (
                    <p style={{ color: '#f9a8d4', fontSize: '0.78rem', fontWeight: 600 }}>
                      👶 Para niños de {e.edadMin} a {e.edadMax} años
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f59e0b' }}>
                    {e.precio ? 'Bs. ' + e.precio : 'Gratuito'}
                    {e.precio ? <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'Outfit' }}> / mes</span> : null}
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/empresa/' + e.empresa_id + '?tab=entrenamientos')}>
                    Ver complejo
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
