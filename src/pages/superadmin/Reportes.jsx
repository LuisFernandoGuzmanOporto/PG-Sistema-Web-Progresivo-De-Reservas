import { useSearchParams } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { EMPRESAS, estadisticasDe, canchasDeEmpresa, reservasDeEmpresa, torneosDeEmpresa,
         calificacionesDeEmpresa, promedioEstrellas, torneoActivo } from '../../lib/datos'
import { montoBs } from '../../lib/dinero'
import { Titulo, Tarjetas, Vacio } from './comun'
import ReporteComplejo from './ReporteComplejo'

/**
 * Dos vistas: todos los complejos lado a lado, o el reporte completo de uno
 * (con vista previa y PDF). La vista y el complejo van en la dirección
 * (?vista=complejo&complejo=ID) para poder llegar directo desde otra pantalla.
 */
export default function Reportes() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'complejo' || params.get('complejo') ? 'complejo' : 'comparar'
  const cambiar = (v) => {
    const p = new URLSearchParams(params)
    if (v === 'complejo') p.set('vista', 'complejo'); else { p.delete('vista'); p.delete('complejo') }
    setParams(p, { replace: true })
  }

  return (
    <Layout role="superadmin">
      <Titulo icono="📈" texto="Reportes" sub={vista === 'complejo'
        ? 'Todo lo de un complejo en un período, cancha por cancha, para ver y descargar en PDF'
        : 'Cómo le va a cada complejo, uno al lado del otro'} />
      <div className="tabs" role="tablist" style={{ marginBottom: 18, width: 'fit-content', maxWidth: '100%' }}>
        <button role="tab" aria-selected={vista === 'comparar'} className={'tab' + (vista === 'comparar' ? ' active' : '')}
          onClick={() => cambiar('comparar')}>📊 Comparar</button>
        <button role="tab" aria-selected={vista === 'complejo'} className={'tab' + (vista === 'complejo' ? ' active' : '')}
          onClick={() => cambiar('complejo')}>📄 Por complejo</button>
      </div>
      {vista === 'complejo' ? <ReporteComplejo /> : (
        <CompararComplejos onVer={(id) => setParams({ vista: 'complejo', complejo: String(id) }, { replace: true })} />
      )}
    </Layout>
  )
}

/**
 * Cómo le va a cada complejo en el mes: reservas, horas vendidas, ingresos y
 * ocupación. Son las mismas cuentas del panel de cada complejo (carga.js),
 * puestas una al lado de la otra.
 */
function CompararComplejos({ onVer }) {
  const filas = EMPRESAS
    .filter(e => e.estado === 'activo' || e.estado === 'suspendido')
    .map(e => {
      const est = estadisticasDe(e.id)
      const cals = calificacionesDeEmpresa(e.id)
      return {
        e, est,
        canchas: canchasDeEmpresa(e.id).length,
        reservasTotales: reservasDeEmpresa(e.id).filter(r => r.origen !== 'torneo').length,
        torneos: torneosDeEmpresa(e.id).filter(torneoActivo).length,
        prom: cals.length ? Number(promedioEstrellas(cals)) : null,
      }
    })
    .sort((a, b) => b.est.ingresoMes - a.est.ingresoMes)

  const total = (f) => filas.reduce((s, x) => s + (Number(f(x)) || 0), 0)
  const periodo = filas[0]?.est.periodo || 'Este mes'
  const maxIngreso = Math.max(1, ...filas.map(x => x.est.ingresoMes))

  return (
    <>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 14 }}>{periodo}</p>

      <Tarjetas items={[
        { label: 'Ingresos del mes', value: 'Bs. ' + montoBs(total(x => x.est.ingresoMes)), icon: '💰', sub: 'reservas confirmadas de todos' },
        { label: 'Reservas confirmadas', value: total(x => x.est.totalReservas), icon: '✅' },
        { label: 'Horas vendidas', value: String(Math.round(total(x => x.est.horasVendidas) * 10) / 10).replace('.', ','), icon: '⏱️' },
        { label: 'No se presentaron', value: total(x => x.est.noShow), icon: '🚫', sub: total(x => x.est.canceladas) + ' canceladas o rechazadas' },
      ]} />

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>💰 Ingresos del mes por complejo</h3>
        {filas.length === 0 ? <Vacio texto="Todavía no hay complejos aprobados" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filas.map(x => (
              <div key={x.e.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.84rem', color: '#f5f5f5', fontWeight: 600 }}>{x.e.nombre}</span>
                  <span style={{ fontSize: '0.84rem', color: '#f59e0b', fontWeight: 700 }}>Bs. {montoBs(x.est.ingresoMes)}</span>
                </div>
                <div style={{ height: 8, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: (x.est.ingresoMes / maxIngreso * 100) + '%', borderRadius: 4, background: 'linear-gradient(90deg,#8B0000,#f59e0b)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Complejo</th><th>Canchas</th><th>Reservas del mes</th><th>Horas vendidas</th><th>Ocupación</th>
                  <th>Ingresos</th><th>No se presentaron</th><th>Torneos activos</th><th>Calificación</th></tr>
            </thead>
            <tbody>
              {filas.map(x => (
                <tr key={x.e.id}>
                  <td>
                    <p style={{ color: '#f5f5f5', fontWeight: 600 }}>{x.e.nombre}</p>
                    {x.e.estado !== 'activo' && <p style={{ color: '#ef4444', fontSize: '0.72rem' }}>{x.e.estado}</p>}
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 0', fontSize: '0.72rem' }}
                      onClick={() => onVer(x.e.id)}>📄 Ver su reporte</button>
                  </td>
                  <td style={{ color: '#ccc' }}>{x.canchas}</td>
                  <td style={{ color: '#ccc' }}>{x.est.totalReservas} <span style={{ color: '#555', fontSize: '0.72rem' }}>de {x.reservasTotales} en total</span></td>
                  <td style={{ color: '#ccc' }}>{String(Math.round(x.est.horasVendidas * 10) / 10).replace('.', ',')}</td>
                  <td style={{ color: x.est.ocupacion >= 50 ? '#22c55e' : x.est.ocupacion >= 20 ? '#f59e0b' : '#888', fontWeight: 700 }}>
                    {String(x.est.ocupacion).replace('.', ',')}%
                  </td>
                  <td style={{ color: '#f59e0b', fontWeight: 700 }}>Bs. {montoBs(x.est.ingresoMes)}</td>
                  <td style={{ color: x.est.noShow ? '#ef4444' : '#666' }}>{x.est.noShow}</td>
                  <td style={{ color: '#ccc' }}>{x.torneos}</td>
                  <td style={{ color: x.prom === null ? '#666' : x.prom < 3 ? '#ef4444' : '#f59e0b' }}>{x.prom === null ? '—' : '★ ' + String(x.prom).replace('.', ',')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 12 }}>
        Se cuenta solo lo confirmado y lo que pagó un cliente: las horas que ocupa un torneo no son ingreso.
        La ocupación compara las horas vendidas con las que cada complejo podría vender en el mes.
      </p>
    </>
  )
}
