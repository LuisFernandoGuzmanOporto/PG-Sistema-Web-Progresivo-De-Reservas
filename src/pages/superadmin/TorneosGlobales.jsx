import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { TORNEOS, estadoDeTorneo, equiposAprobados, solicitudesPendientes, solicitudDe, torneoActivo } from '../../lib/datos'
import { montoBs } from '../../lib/dinero'
import { Titulo, FiltroComplejo, Tarjetas, nombreDeComplejo, Vacio } from './comun'

const SOLICITUD = {
  aprobada:  { label: 'Cancha aprobada',  color: '#22c55e' },
  pendiente: { label: 'Esperando al complejo', color: '#f59e0b' },
  rechazada: { label: 'Cancha rechazada', color: '#ef4444' },
}

/** Los torneos de todos los complejos: los que arma el complejo y los que arma un cliente. */
export default function TorneosGlobales() {
  const navigate = useNavigate()
  const [complejo, setComplejo] = useState('')
  const [quien, setQuien]       = useState('')
  const [busqueda, setBusqueda] = useState('')

  const q = busqueda.trim().toLowerCase()
  const visibles = [...TORNEOS]
    .filter(t => !complejo || String(t.empresa_id) === complejo)
    .filter(t => !quien || (quien === 'complejo' ? t.creador_tipo === 'complejo' : t.creador_tipo !== 'complejo'))
    .filter(t => !q || (t.nombre + ' ' + t.creador + ' ' + t.deporte).toLowerCase().includes(q))
    .sort((a, b) => (b.fechaInicioISO || '').localeCompare(a.fechaInicioISO || ''))

  return (
    <Layout role="superadmin">
      <Titulo icono="🏆" texto="Torneos" sub="Todos los torneos de la plataforma. Abre uno para ver sus equipos, jugadores, partidos y resultados." />

      <Tarjetas items={[
        { label: 'Torneos', value: visibles.length, icon: '🏆' },
        { label: 'Activos', value: visibles.filter(torneoActivo).length, icon: '🔴', sub: 'en juego o con inscripciones abiertas' },
        { label: 'Equipos inscritos', value: visibles.reduce((s, t) => s + equiposAprobados(t).length, 0), icon: '👥' },
        { label: 'Organizados por clientes', value: visibles.filter(t => t.creador_tipo !== 'complejo').length, icon: '🙋' },
      ]} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input className="input" placeholder="🔍 Nombre, organizador o deporte..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <FiltroComplejo valor={complejo} onCambio={setComplejo} />
        <select className="input" aria-label="Quién lo organiza" value={quien} onChange={e => setQuien(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">Lo organiza cualquiera</option>
          <option value="complejo">Lo organiza el complejo</option>
          <option value="cliente">Lo organiza un cliente</option>
        </select>
      </div>

      <div className="card">
        {visibles.length === 0 ? <Vacio texto="No hay torneos con esos filtros" /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Torneo</th><th>Complejo</th><th>Organiza</th><th>Fechas</th><th>Equipos</th>
                    <th>Inscripción</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {visibles.map(t => {
                  const est = estadoDeTorneo(t) || { corto: t.estado, color: '#888', bg: 'transparent' }
                  const sol = t.creador_tipo === 'complejo' ? null : SOLICITUD[solicitudDe(t).estado]
                  return (
                    <tr key={t.id}>
                      <td>
                        <p style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.88rem' }}>{t.emoji} {t.nombre}</p>
                        <p style={{ color: '#555', fontSize: '0.72rem' }}>{t.deporte}{t.cancha ? ' · ' + t.cancha : ''}</p>
                      </td>
                      <td style={{ color: '#ccc', fontSize: '0.84rem' }}>{nombreDeComplejo(t.empresa_id)}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <p style={{ color: '#ccc' }}>{t.creador}</p>
                        <p style={{ color: '#555', fontSize: '0.7rem' }}>{t.creador_tipo === 'complejo' ? 'El complejo' : 'Un cliente'}</p>
                        {sol && <p style={{ color: sol.color, fontSize: '0.7rem' }}>{sol.label}</p>}
                      </td>
                      <td style={{ color: '#888', fontSize: '0.82rem' }}>{t.fechaInicio} – {t.fechaFin}</td>
                      <td style={{ color: '#ccc', fontSize: '0.84rem' }}>
                        {equiposAprobados(t).length}/{t.maxEquipos}
                        {solicitudesPendientes(t).length > 0 && (
                          <p style={{ color: '#f59e0b', fontSize: '0.7rem' }}>{solicitudesPendientes(t).length} por aprobar</p>
                        )}
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.84rem' }}>Bs. {montoBs(t.precio)}</td>
                      <td><span className="badge" style={{ background: est.bg, color: est.color }}>{est.corto}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/torneos/' + t.id)}>Ver</button>
                          {t.estado === 'en_curso' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/torneos/' + t.id + '/en-vivo')}>🔴 En vivo</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
