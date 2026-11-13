import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/Avatar'
import { EMPRESAS, calificacionesDeEmpresa, comentariosDeEmpresa, promedioEstrellas } from '../../lib/datos'
import { fechaCortaDeBolivia, horaDeBolivia } from '../../lib/fecha'
import { Titulo, FiltroComplejo, Tarjetas, nombreDeComplejo, Vacio } from './comun'

const estrellas = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

/**
 * Lo que los clientes dicen de cada complejo: las estrellas y los
 * comentarios. Sirve para encontrar quejas a tiempo. Solo lectura.
 */
export default function ResenasGlobales() {
  const [complejo, setComplejo] = useState('')
  const [vista, setVista]       = useState('comentarios')
  const [soloBajas, setSoloBajas] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const empresas = EMPRESAS.filter(e => !complejo || String(e.id) === complejo)
  const calificaciones = empresas.flatMap(e => calificacionesDeEmpresa(e.id))
  const comentarios = empresas.flatMap(e => comentariosDeEmpresa(e.id))
    .sort((a, b) => String(b.creado || '').localeCompare(String(a.creado || '')))

  const q = busqueda.trim().toLowerCase()
  const comentariosVisibles = comentarios.filter(c => !q || (c.texto + ' ' + c.autor).toLowerCase().includes(q))
  const calificacionesVisibles = calificaciones.filter(c => !soloBajas || c.estrellas <= 2)

  // Ranking: los de peor promedio primero, que es lo que hay que mirar
  const ranking = EMPRESAS
    .map(e => ({ e, cals: calificacionesDeEmpresa(e.id), coms: comentariosDeEmpresa(e.id).length }))
    .filter(x => x.cals.length || x.coms)
    .sort((a, b) => Number(promedioEstrellas(a.cals) || 99) - Number(promedioEstrellas(b.cals) || 99))

  return (
    <Layout role="superadmin">
      <Titulo icono="💬" texto="Reseñas y comentarios" sub="Lo que dicen los clientes de cada complejo. Sirve para enterarse de una queja a tiempo." />

      <Tarjetas items={[
        { label: 'Calificaciones', value: calificaciones.length, icon: '★', sub: 'promedio ' + (calificaciones.length ? promedioEstrellas(calificaciones) : '—') },
        { label: 'Con 1 o 2 estrellas', value: calificaciones.filter(c => c.estrellas <= 2).length, icon: '⚠️' },
        { label: 'Comentarios', value: comentarios.length, icon: '💬' },
        { label: 'Complejos con reseñas', value: ranking.length, icon: '🏟️' },
      ]} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[['comentarios', 'Comentarios'], ['calificaciones', 'Calificaciones'], ['ranking', 'Por complejo']].map(([k, l]) => (
            <button key={k} className={`tab ${vista === k ? 'active' : ''}`} onClick={() => setVista(k)}>{l}</button>
          ))}
        </div>
        {vista !== 'ranking' && <FiltroComplejo valor={complejo} onCambio={setComplejo} />}
        {vista === 'comentarios' && (
          <input className="input" placeholder="🔍 Buscar en los comentarios..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        )}
        {vista === 'calificaciones' && (
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#888', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={soloBajas} onChange={e => setSoloBajas(e.target.checked)} /> Solo 1 o 2 estrellas
          </label>
        )}
      </div>

      <div className="card">
        {vista === 'comentarios' && (comentariosVisibles.length === 0 ? <Vacio texto="No hay comentarios" /> : (
          comentariosVisibles.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid #222' }}>
              <Avatar className="avatar" nombre={c.autor} foto={c.foto} tam={34} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', color: '#888' }}>
                  <strong style={{ color: '#f5f5f5' }}>{c.autor}</strong> sobre <strong style={{ color: '#ccc' }}>{nombreDeComplejo(c.empresa_id)}</strong>
                  {' · '}{fechaCortaDeBolivia(c.creado)} {horaDeBolivia(c.creado)}
                  {c.responde_a && ' · respuesta'}{c.editado && ' · editado'}
                </p>
                <p style={{ color: '#ddd', fontSize: '0.88rem', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.texto}</p>
              </div>
            </div>
          ))
        ))}

        {vista === 'calificaciones' && (calificacionesVisibles.length === 0 ? <Vacio texto="No hay calificaciones" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Cliente</th><th>Complejo</th><th>Estrellas</th><th>Fecha</th></tr></thead>
              <tbody>
                {calificacionesVisibles.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: '#f5f5f5' }}>{c.usuario}</td>
                    <td style={{ color: '#ccc' }}>{nombreDeComplejo(c.empresa_id)}</td>
                    <td style={{ color: c.estrellas <= 2 ? '#ef4444' : '#f59e0b', letterSpacing: 2 }}>{estrellas(c.estrellas)}</td>
                    <td style={{ color: '#888' }}>{c.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {vista === 'ranking' && (ranking.length === 0 ? <Vacio texto="Ningún complejo tiene reseñas todavía" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Complejo</th><th>Promedio</th><th>Calificaciones</th><th>Con 1 o 2 ★</th><th>Comentarios</th></tr></thead>
              <tbody>
                {ranking.map(({ e, cals, coms }) => {
                  const prom = cals.length ? Number(promedioEstrellas(cals)) : null
                  return (
                    <tr key={e.id}>
                      <td style={{ color: '#f5f5f5', fontWeight: 600 }}>{e.nombre}</td>
                      <td style={{ color: prom === null ? '#666' : prom < 3 ? '#ef4444' : prom < 4 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
                        {prom === null ? '—' : '★ ' + String(prom).replace('.', ',')}
                      </td>
                      <td style={{ color: '#ccc' }}>{cals.length}</td>
                      <td style={{ color: cals.some(c => c.estrellas <= 2) ? '#ef4444' : '#666' }}>{cals.filter(c => c.estrellas <= 2).length}</td>
                      <td style={{ color: '#ccc' }}>{coms}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Layout>
  )
}
