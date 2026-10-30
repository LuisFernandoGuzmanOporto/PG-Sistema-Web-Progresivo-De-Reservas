import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import NoEncontrado from '../../components/NoEncontrado'
import VisorComprobante from '../../components/VisorComprobante'
import Confirmar from '../../components/Confirmar'
import { urlPublica } from '../../lib/archivos'
import TabInfo from './torneo/TabInfo'
import TabEquipos from './torneo/TabEquipos'
import TabPosiciones from './torneo/TabPosiciones'
import TabEnVivo from './torneo/TabEnVivo'
import TabCalendario from './torneo/TabCalendario'
import { resolverEquipo, guardarSorteo, deshacerSorteo } from '../../lib/guardar'
import { sortearGrupos, gruposSugeridos, nombreRonda, generarFixture,
         suspensionesPara, calcularTabla } from '../../lib/torneo'

import { TORNEOS, USUARIO_ACTUAL, estadoDeTorneo,
         SOLICITUD_BADGE, equiposPorGrupo, solicitudDe,
         ESTADO_SOLICITUD, aceptaInscripciones, mismo,
         miEquipoEn, yaInscritoEn } from '../../lib/datos'
import { montoBs } from '../../lib/dinero'

export default function TorneoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [torneoData, setTorneoData] = useState(TORNEOS.find(t => mismo(t.id, id)))
  const [tab, setTab] = useState('info')
  const [tabCreador, setTabCreador] = useState('solicitudes')
  const [grupos, setGrupos] = useState(null)
  const [fechaSorteo, setFechaSorteo] = useState(null)
  const [numGrupos, setNumGrupos] = useState(null)
  const [partidoHabilitacion, setPartidoHabilitacion] = useState(null)
  const [modalComprobante, setModalComprobante] = useState(null)

  if (!torneoData) {
    return <NoEncontrado que="Este torneo" volverA="/app/torneos" textoVolver="Ver los torneos" />
  }

  const soyCreador = torneoData.creador_id === USUARIO_ACTUAL.id
  const miEquipo   = miEquipoEn(torneoData)
  const enCurso    = torneoData.estado === 'en_curso'
  // Pasada la fecha límite dice «Inscripciones cerradas», no «Abierto»
  const esBadge    = estadoDeTorneo(torneoData)

  const equiposAprobados  = torneoData.equipos.filter(e => e.estado === 'aprobado')
  const equiposPendientes = torneoData.equipos.filter(e => e.estado === 'pendiente')

  // Las tablas nunca se guardan: se calculan desde los partidos finalizados.
  // En un torneo por grupos hay una tabla por grupo, igual que en En Vivo:
  // clasifican los primeros de CADA grupo, no los primeros del torneo entero.
  const porGrupo = equiposPorGrupo(torneoData)
  const tablas = porGrupo
    ? Object.fromEntries(Object.entries(porGrupo).map(([g, eqs]) => [
        g,
        // Con el resultado parcial de los partidos en juego (solo para mostrar)
        calcularTabla(eqs, torneoData.partidos.filter(p => p.grupo === g), torneoData.deporteKey, { enVivo: true }),
      ]))
    // Solo los de grupos: si entraran los de la llave, un equipo sumaria en la
    // tabla los puntos de una semifinal que ya es otra fase.
    : { 'Única': calcularTabla(equiposAprobados,
        torneoData.partidos.filter(p => p.fase === 'grupos'), torneoData.deporteKey, { enVivo: true }) }
  const clasifican = torneoData.clasificanPorGrupo ?? 2

  // Sorteo de la fase de grupos
  const gruposPorDefecto = gruposSugeridos(equiposAprobados.length)
  const gruposElegidos = numGrupos ?? gruposPorDefecto
  const [fixture, setFixture] = useState([])
  // El sorteo escribe una fila por equipo y una por partido: con ocho grupos
  // son varios segundos. Sin este aviso el boton parecia no hacer nada y se
  // volvia a tocar, lo que duplicaba el fixture entero.
  const [sorteando, setSorteando] = useState(false)
  const [confirmRepetir, setConfirmRepetir] = useState(false)
  const [errorTorneo, setErrorTorneo] = useState(null)

  /**
   * Rehacer el sorteo: se borran los grupos y el fixture de la base.
   *
   * Solo antes de que se juegue el primer partido. La base rechaza el pedido
   * si ya hay resultados cargados, y ese mensaje es el que se muestra.
   */
  const repetirSorteo = async () => {
    setSorteando(true)
    const g = await deshacerSorteo(torneoData.id)
    setSorteando(false)
    setConfirmRepetir(false)
    if (g.error) { setErrorTorneo(g.error); return }

    setGrupos(null); setFechaSorteo(null); setFixture([]); setErrorTorneo(null)
    setTorneoData(t => ({
      ...t, estado: 'inscripciones', partidos: [],
      equipos: t.equipos.map(e => ({ ...e, grupo: null })),
      grupos: null,
    }))
  }

  const realizarSorteo = async () => {
    if (sorteando) return
    setSorteando(true)
    const nuevos = sortearGrupos(equiposAprobados, gruposElegidos)
    // El fixture de la fase de grupos se genera junto con el sorteo
    const nuevoFixture = generarFixture(nuevos, {
      canchas: [torneoData.cancha, 'Cancha Auxiliar'],
      horas: ['09:00', '11:00', '15:00', '17:00', '19:00'],
    })

    // El sorteo no se puede repetir: se guarda antes de mostrarlo, para que
    // nadie vea unos grupos en pantalla y otros distintos al recargar.
    const g = await guardarSorteo(
      torneoData.id,
      Object.entries(nuevos).flatMap(([grupo, equipos]) =>
        equipos.map(e => ({ equipoId: e.id, grupo }))),
      nuevoFixture.map(p => ({
        equipoA: p.equipo1_id, equipoB: p.equipo2_id,
        fase: p.fase, grupo: p.grupo,
      })),
    )
    if (g.error) {
      setSorteando(false)
      setErrorTorneo('No se guardó el sorteo. ' + g.error)
      return
    }
    setSorteando(false)

    setGrupos(nuevos)
    setFixture(nuevoFixture)
    // Al sortear, el torneo deja de recibir inscripciones y pasa a estar en curso
    setTorneoData(t => ({ ...t, estado: 'en_curso' }))
    setErrorTorneo(null)
    setFechaSorteo(new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit' }))
  }

  const goleadores = []
  torneoData.partidos.forEach(p => {
    p.eventos.filter(ev => ev.tipo === 'gol').forEach(ev => {
      const found = goleadores.find(g => g.jugador === ev.jugador)
      if (found) found.goles++
      else goleadores.push({ jugador: ev.jugador, equipo: ev.equipo, goles: 1 })
    })
  })
  goleadores.sort((a, b) => b.goles - a.goles)

  /** Aprobar o rechazar la inscripcion de un equipo, y dejarlo guardado. */
  const resolverInscripcion = async (id, estado) => {
    const g = await resolverEquipo(id, estado)
    if (g.error) { setErrorTorneo('No se guardó el cambio. ' + g.error); return }
    setErrorTorneo(null)
    setTorneoData(p => ({ ...p, equipos: p.equipos.map(e => e.id === id ? { ...e, estado } : e) }))
  }

  const aprobarEquipo  = id => resolverInscripcion(id, 'aprobado')
  const rechazarEquipo = id => resolverInscripcion(id, 'rechazado')

  // Jugadores del equipo suspendidos para el partido que se esta habilitando,
  // con el motivo. El motivo importa: no es lo mismo decirle al capitan que su
  // jugador cumple por la roja de la fecha pasada que decirle que llego a dos
  // amarillas. Antes la pantalla decia siempre «suspendido por roja», aunque
  // fuera por amarillas acumuladas.
  const suspensionesDelEquipo = (equipoId) =>
    partHab ? suspensionesPara(partHab, torneoData.partidos, equipoId) : []

  const suspendidosDelEquipo = (equipoId) =>
    suspensionesDelEquipo(equipoId).map(s => String(s.jugador_id))

  const toggleHabilitado = (equipoId, jugadorId) => {
    // Segunda barrera: aunque se llame por error, no se habilita a un suspendido
    if (suspendidosDelEquipo(equipoId).includes(String(jugadorId))) return
    setTorneoData(p => ({
      ...p,
      equipos: p.equipos.map(eq =>
        eq.id === equipoId
          ? { ...eq, jugadores: eq.jugadores.map(j => j.id === jugadorId ? { ...j, habilitado: !j.habilitado } : j) }
          : eq
      ),
    }))
  }

  const iniciarPartidoDesdeHabilitacion = (partidoId) => {
    setTorneoData(p => ({
      ...p,
      partidos: p.partidos.map(pt =>
        pt.id === partidoId ? { ...pt, estado: 'en_vivo', minuto: 0 } : pt
      ),
    }))
    setPartidoHabilitacion(null)
  }

  const partHab = partidoHabilitacion ? torneoData.partidos.find(pt => pt.id === partidoHabilitacion) : null
  const eq1Hab  = partHab ? torneoData.equipos.find(e => e.id === partHab.equipo1_id) : null
  const eq2Hab  = partHab ? torneoData.equipos.find(e => e.id === partHab.equipo2_id) : null
  const equiposPartidoHab = [eq1Hab, eq2Hab].filter(Boolean)

  const tabsBase = [
    { key: 'info',    label: 'Información' },
    { key: 'equipos', label: `Equipos (${equiposAprobados.length})` },
  ]
  // Las posiciones y el resumen siguen estando cuando el torneo termino: es
  // justo cuando se quiere mirar como quedo todo y quien salio campeon.
  if (enCurso || torneoData.estado === 'finalizado') {
    tabsBase.push({ key: 'posiciones', label: '📊 Posiciones' })
    tabsBase.push({ key: 'envivo',     label: enCurso ? '🔴 En Vivo' : '🏆 Resumen' })
  }
  // El calendario va siempre: antes de sortear dice cuando se juega, y despues
  // muestra el fixture entero con los resultados. Estaba solo en la etapa de
  // inscripciones, que es justo cuando todavia no hay ningun partido.
  tabsBase.push({ key: 'calendario', label: '📅 Calendario' })
  if (soyCreador) tabsBase.push({ key: 'admin', label: '⚙️ Administrar' })


  return (
    <Layout role="user">

      {errorTorneo && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, marginBottom: 14 }}>
          <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>{errorTorneo}</p>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem' }}>
            ← Volver
          </button>
          <span style={{ color: '#444', fontSize: '0.82rem', marginLeft: 8 }}>Detalle del Torneo</span>
        </div>
        {enCurso && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate(`/app/torneos/${torneoData.id}/en-vivo`)}
              style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
              🔴 En Vivo
            </button>
            {soyCreador && (
              <button onClick={() => navigate(`/app/torneos/${torneoData.id}/mesa`)}
                style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                ⚙️ Mesa Técnica
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card principal */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        {/* En el celular la imagen va arriba: al costado dejaba el nombre en
            una columna tan angosta que se partía letra por letra */}
        <div className="cabecera-torneo" style={{ display: 'flex', gap: 0 }}>
          <div className="cabecera-torneo-imagen" style={{ width: 160, minHeight: 140, background: 'linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRight: '1px solid #2a2a2a' }}>
            <span style={{ fontSize: '4rem' }}>{torneoData.emoji}</span>
          </div>
          <div style={{ padding: '18px 22px', flex: 1 }}>
            <div className="cabecera-torneo-titulo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
              <div>
                <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f5f5f5', marginBottom: 4 }}>{torneoData.nombre}</h1>
                <p style={{ fontSize: '0.78rem', color: '#666' }}>📅 {torneoData.fechaInicio} — {torneoData.fechaFin} • 📍 {torneoData.empresa}</p>
              </div>
              <div className="cabecera-torneo-estado" style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700, background: esBadge.bg, color: esBadge.color, marginBottom: 6 }}>
                  {esBadge.label}
                </span>
                <p style={{ fontSize: '0.8rem', color: '#888' }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{equiposAprobados.length}</span>
                  <span style={{ color: '#555' }}>/{torneoData.maxEquipos} equipos</span>
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6, marginBottom: 12 }}>{torneoData.desc}</p>

            {/* Un torneo de un cliente necesita que el complejo apruebe la cancha */}
            {torneoData.creador_tipo === 'cliente' && solicitudDe(torneoData).estado !== 'aprobada' && (
              <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: ESTADO_SOLICITUD[solicitudDe(torneoData).estado].bg,
                border: '1px solid ' + ESTADO_SOLICITUD[solicitudDe(torneoData).estado].color + '44' }}>
                <p style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 4,
                  color: ESTADO_SOLICITUD[solicitudDe(torneoData).estado].color }}>
                  {solicitudDe(torneoData).estado === 'pendiente'
                    ? '⏳ Esperando la aprobación de la cancha'
                    : '✕ El complejo rechazó la cancha'}
                </p>
                <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {solicitudDe(torneoData).estado === 'pendiente'
                    ? torneoData.empresa + ' todavía no confirmó la cancha para estas fechas. Hasta que lo haga, los equipos no pueden inscribirse.'
                    : (solicitudDe(torneoData).motivo || 'El complejo no puede ceder la cancha en esas fechas.')}
                </p>
              </div>
            )}
            {/* Su equipo en este torneo, en el estado que esté. Antes la
                inscripción pendiente no aparecía por ningún lado y el botón
                seguía ofreciendo inscribirse otra vez. */}
            {miEquipo && (
              <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: SOLICITUD_BADGE[miEquipo.estado].color + '14',
                border: '1px solid ' + SOLICITUD_BADGE[miEquipo.estado].color + '44' }}>
                <p style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 4, color: SOLICITUD_BADGE[miEquipo.estado].color }}>
                  {miEquipo.estado === 'pendiente' ? '⏳ Tu equipo está por aprobar'
                    : miEquipo.estado === 'aprobado' ? '✓ Tu equipo está inscrito'
                    : '✕ El organizador rechazó tu inscripción'}
                </p>
                <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f5f5f5' }}>{miEquipo.nombre}</strong>
                  {miEquipo.estado === 'pendiente'
                    ? (miEquipo.comprobante || miEquipo.codigoCanje
                        ? ' · El organizador está revisando tu inscripción.'
                        : ' · Falta el comprobante de pago: súbelo para que el organizador pueda aprobarte.')
                    : miEquipo.estado === 'aprobado'
                      ? ' · Ya tienes tu lugar en el torneo.'
                      : ' · Puedes volver a inscribirlo mientras las inscripciones sigan abiertas.'}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {aceptaInscripciones(torneoData) && !yaInscritoEn(torneoData) && (
                <button className="btn btn-primary" onClick={() => navigate(`/app/torneos/${torneoData.id}/inscribir`)}>
                  👥 Inscribir mi Equipo — Bs. {montoBs(torneoData.precio)}
                </button>
              )}
              {enCurso && (
                <button className="btn btn-primary" style={{ background: '#8B0000', border: 'none' }} onClick={() => navigate(`/app/torneos/${torneoData.id}/en-vivo`)}>
                  🔴 Ver En Vivo
                </button>
              )}
              {soyCreador && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
                  👑 Tú creaste este torneo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 24, overflowX: 'auto' }}>
        {tabsBase.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 22px', background: tab === t.key ? '#8B0000' : 'transparent',
            color: tab === t.key ? '#fff' : '#666', border: 'none',
            borderBottom: tab === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.88rem',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: INFO ══ */}
      {tab === 'info' && (
        <TabInfo torneoData={torneoData} />
      )}

      {/* ══ TAB: EQUIPOS ══ */}
      {tab === 'equipos' && (
        <TabEquipos torneoData={torneoData} equipos={equiposAprobados} navigate={navigate} />
      )}

      {/* ══ TAB: POSICIONES ══ */}
      {tab === 'posiciones' && (
        <TabPosiciones tablas={tablas} clasifican={clasifican} goleadores={goleadores}
                       deporte={torneoData.deporteKey || torneoData.deporte} />
      )}

      {/* ══ TAB: EN VIVO ══ */}
      {tab === 'envivo' && (
        <TabEnVivo torneoData={torneoData} navigate={navigate} />
      )}

      {/* ══ TAB: CALENDARIO ══ */}
      {tab === 'calendario' && (
        <TabCalendario torneoData={torneoData} />
      )}

      {/* ══ TAB: ADMINISTRAR (solo creador) ══ */}
      {tab === 'admin' && soyCreador && (
        <div>
          {/* Sub-tabs del creador */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'solicitudes', label: `📋 Solicitudes (${equiposPendientes.length})` },
              { key: 'sorteo',      label: '🎲 Sorteo de Grupos' },
              { key: 'habilitacion', label: '✅ Habilitación Pre-Partido' },
            ].map(t => (
              <button key={t.key} onClick={() => setTabCreador(t.key)} style={{
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.82rem',
                background: tabCreador === t.key ? '#8B0000' : '#1a1a1a',
                color: tabCreador === t.key ? '#fff' : '#666',
                border: tabCreador === t.key ? 'none' : '1px solid #2a2a2a',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── Sorteo de grupos ── */}
          {tabCreador === 'sorteo' && (
            <div>
              <div style={{ padding: '14px 18px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 12, marginBottom: 20 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                  Sorteo de la fase de grupos
                </p>
                <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  El sorteo reparte al azar los equipos aprobados entre los grupos. Una vez sorteado se
                  genera el fixture de la fase de grupos y ya no se pueden aceptar más inscripciones.
                  Queda registrada la fecha y la hora en que se realizó.
                </p>
              </div>

              {equiposAprobados.length < 4 ? (
                <div className="empty-state" style={{ minHeight: 180 }}>
                  <div className="empty-state-icon">🎲</div>
                  <h3>Aún no se puede sortear</h3>
                  <p>Se necesitan al menos 4 equipos aprobados. Hay {equiposAprobados.length}.</p>
                </div>
              ) : !grupos ? (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#f5f5f5', marginBottom: 4 }}>
                    {equiposAprobados.length} equipos aprobados
                  </p>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 18 }}>
                    Se repartirán en <strong style={{ color: '#00BCD4' }}>{gruposElegidos} grupo{gruposElegidos > 1 ? 's' : ''}</strong> de
                    aproximadamente {Math.ceil(equiposAprobados.length / gruposElegidos)} equipos cada uno.
                  </p>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>Cantidad de grupos:</span>
                    {[1, 2, 4, 8].filter(n => equiposAprobados.length >= n * 2).map(n => (
                      <button key={n} onClick={() => setNumGrupos(n)} style={{
                        padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700,
                        background: gruposElegidos === n ? 'rgba(0,188,212,0.18)' : '#1a1a1a',
                        border: '1px solid ' + (gruposElegidos === n ? '#00BCD4' : '#2a2a2a'),
                        color: gruposElegidos === n ? '#00BCD4' : '#666', fontSize: '0.82rem',
                      }}>{n}</button>
                    ))}
                  </div>

                  <button onClick={realizarSorteo} className="btn btn-primary"
                    disabled={sorteando}
                    style={{ padding: '13px 30px', fontSize: '0.92rem', justifyContent: 'center',
                             opacity: sorteando ? 0.6 : 1, cursor: sorteando ? 'wait' : 'pointer' }}>
                    {sorteando ? 'Sorteando…' : '🎲 Sortear grupos'}
                  </button>
                  <p style={{ color: '#555', fontSize: '0.73rem', marginTop: 12 }}>
                    Clasifican los 2 primeros de cada grupo a la fase eliminatoria.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>
                      ✓ Sorteo realizado el {fechaSorteo}
                    </p>
                    {/* Repetir borra el fixture en la base. Antes solo limpiaba
                        la pantalla: al recargar volvian los mismos grupos, y un
                        segundo sorteo duplicaba todos los partidos. */}
                    <button onClick={() => setConfirmRepetir(true)} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      Repetir sorteo
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {Object.entries(grupos).map(([letra, equipos]) => (
                      <div key={letra} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', background: 'rgba(139,0,0,0.15)', borderBottom: '1px solid #2a2a2a' }}>
                          <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: '#f5f5f5' }}>Grupo {letra}</p>
                        </div>
                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {equipos.map((e, i) => (
                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#1a1a1a', borderRadius: 8 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 6, background: '#2a2a2a', color: '#666', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                              <span style={{ fontSize: '0.83rem', color: '#f5f5f5' }}>{e.nombre}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fixture generado automaticamente */}
                  {fixture.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <p style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                        Fixture generado · {fixture.length} partidos
                      </p>
                      {[...new Set(fixture.map(p => p.jornada))].map(j => (
                        <div key={j} style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600, marginBottom: 6 }}>Jornada {j}</p>
                          {fixture.filter(p => p.jornada === j).map(p => (
                            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 10, alignItems: 'center', padding: '9px 14px', marginBottom: 6, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10 }}>
                              <span style={{ fontSize: '0.83rem', color: '#f5f5f5', textAlign: 'right' }}>{p.equipo1}</span>
                              <span style={{ fontSize: '0.7rem', color: '#555' }}>vs</span>
                              <span style={{ fontSize: '0.83rem', color: '#f5f5f5' }}>{p.equipo2}</span>
                              <span style={{ fontSize: '0.7rem', color: '#666', whiteSpace: 'nowrap' }}>
                                G{p.grupo} · {p.hora} · {p.cancha}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 10 }}>
                    <p style={{ color: '#22c55e', fontSize: '0.8rem', marginBottom: 4, fontWeight: 600 }}>
                      Fase eliminatoria: {nombreRonda(Object.keys(grupos).length)}
                    </p>
                    <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.6 }}>
                      Clasifican {Object.keys(grupos).length * 2} equipos en total. El cuadro se divide en dos
                      lados: el primero de un grupo enfrenta al segundo del grupo emparejado, de modo que los
                      punteros solo pueden encontrarse en la final.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Solicitudes */}
          {tabCreador === 'solicitudes' && (
            <div>
              {torneoData.equipos.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 200 }}>
                  <div className="empty-state-icon">📋</div>
                  <h3>Sin solicitudes aún</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {torneoData.equipos.map(eq => {
                    const badge = SOLICITUD_BADGE[eq.estado]
                    return (
                      <div key={eq.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          {eq.escudo ? (
                            <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#0f0f0f', flexShrink: 0 }}>
                              <img src={urlPublica(eq.escudo)} alt={'Escudo de ' + eq.nombre}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#8B0000', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                              {(eq.nombre || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                              <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{eq.nombre}</p>
                              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, color: badge.color, background: `${badge.color}18` }}>{badge.label}</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#666' }}>👤 Capitán: {eq.capitan} • {eq.jugadores.length} jugadores</p>
                            {/* Cubrio la inscripcion con puntos: no va a haber
                                comprobante que revisar, y esta bien */}
                            {eq.codigoCanje && (
                              <p style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: 3 }}>
                                ✓ Inscripción cubierta con puntos · {eq.codigoCanje}
                              </p>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {eq.comprobante && (
                            <button onClick={() => setModalComprobante(eq)} style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', borderRadius: 8, color: '#00BCD4', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                              🧾 Comprobante
                            </button>
                          )}
                          {eq.estado === 'pendiente' && (
                            <>
                              <button onClick={() => aprobarEquipo(eq.id)} style={{ padding: '7px 14px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 8, color: '#22c55e', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>✓ Aprobar</button>
                              <button onClick={() => rechazarEquipo(eq.id)} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>✗ Rechazar</button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Habilitación pre-partido */}
          {tabCreador === 'habilitacion' && (
            <div>
              {!partidoHabilitacion ? (
                /* Paso 1: seleccionar partido */
                <div>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>
                    Selecciona el partido para habilitar los jugadores antes de que inicie.
                  </p>
                  {torneoData.partidos.filter(p => p.estado === 'programado' || p.estado === 'en_vivo').length === 0 ? (
                    <div className="empty-state" style={{ minHeight: 200 }}>
                      <div className="empty-state-icon">📋</div>
                      <h3>Sin partidos pendientes</h3>
                      <p>No hay partidos programados para habilitar</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {torneoData.partidos.filter(p => p.estado === 'programado' || p.estado === 'en_vivo').map(p => {
                        const eq1 = torneoData.equipos.find(e => e.id === p.equipo1_id)
                        const eq2 = torneoData.equipos.find(e => e.id === p.equipo2_id)
                        const hab1 = eq1 ? eq1.jugadores.filter(j => j.habilitado).length : 0
                        const tot1 = eq1 ? eq1.jugadores.length : 0
                        const hab2 = eq2 ? eq2.jugadores.filter(j => j.habilitado).length : 0
                        const tot2 = eq2 ? eq2.jugadores.length : 0
                        return (
                          <div key={p.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#f5f5f5' }}>{p.equipo1} vs {p.equipo2}</span>
                                <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                                  background: p.estado === 'programado' ? 'rgba(100,100,100,0.12)' : 'rgba(239,68,68,0.12)',
                                  color: p.estado === 'programado' ? '#666' : '#ef4444',
                                }}>{p.estado === 'programado' ? '🕐 Programado' : '🔴 En Vivo'}</span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#555' }}>🕐 {p.hora} • 📍 {p.cancha}</p>
                              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                                <span style={{ fontSize: '0.72rem', color: hab1 === tot1 && tot1 > 0 ? '#22c55e' : '#f59e0b' }}>
                                  {p.equipo1}: {hab1}/{tot1} habilitados
                                </span>
                                <span style={{ fontSize: '0.72rem', color: hab2 === tot2 && tot2 > 0 ? '#22c55e' : '#f59e0b' }}>
                                  {p.equipo2}: {hab2}/{tot2} habilitados
                                </span>
                              </div>
                            </div>
                            <button onClick={() => setPartidoHabilitacion(p.id)} style={{ padding: '10px 18px', background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.4)', borderRadius: 10, color: '#ff6b6b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                              ✅ Habilitar jugadores →
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : partHab ? (
                /* Paso 2: habilitar jugadores del partido seleccionado */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <button onClick={() => setPartidoHabilitacion(null)} style={{ color: '#00BCD4', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', marginBottom: 4 }}>
                        ← Volver a partidos
                      </button>
                      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5' }}>
                        {partHab.equipo1} vs {partHab.equipo2} — {partHab.hora}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: '#555', lineHeight: 1.6 }}>
                        Marca quiénes vinieron. Solo los marcados con ✓ pueden registrar
                        goles y tarjetas. Si alguien llega tarde, entra aquí y márcalo:
                        se puede con el partido ya empezado.
                      </p>
                    </div>
                    {partHab.estado === 'programado' && (
                      <button onClick={() => iniciarPartidoDesdeHabilitacion(partHab.id)} style={{ padding: '12px 22px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#ef4444', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
                        🔴 Iniciar Partido
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {equiposPartidoHab.map(eq => (
                      <div key={eq.id} className="card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#f5f5f5' }}>{eq.nombre}</p>
                          <span style={{ fontSize: '0.72rem', color: '#555' }}>
                            {/* El suspendido no cuenta como presente aunque
                                tenga el visto: no puede jugar este partido */}
                            {eq.jugadores.filter(j => j.habilitado &&
                              !suspendidosDelEquipo(eq.id).includes(String(j.id))).length}/{eq.jugadores.length} presentes
                          </span>
                        </div>
                        {eq.jugadores.length === 0 ? (
                          <p style={{ color: '#555', fontSize: '0.82rem' }}>Sin jugadores registrados</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {eq.jugadores.map(j => {
                              // Ni el expulsado en la fecha anterior ni el que
                              // llego a dos amarillas se pueden habilitar
                              const castigo = suspensionesDelEquipo(eq.id)
                                .find(x => String(x.jugador_id) === String(j.id))
                              const suspendido = Boolean(castigo)
                              return (
                              <div key={j.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', borderRadius: 10, transition: 'all 0.15s',
                                background: suspendido ? 'rgba(239,68,68,0.10)'
                                          : j.habilitado ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)',
                                border: suspendido ? '1px solid rgba(239,68,68,0.45)'
                                      : j.habilitado ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.12)',
                                opacity: suspendido ? 0.75 : 1,
                              }}>
                                <div>
                                  <p style={{ fontSize: '0.88rem', color: suspendido ? '#ef4444' : j.habilitado ? '#f5f5f5' : '#555', fontWeight: 600 }}>
                                    {j.dorsal != null && <span style={{ color: '#666', marginRight: 5 }}>#{j.dorsal}</span>}
                                    {j.nombre}
                                  </p>
                                  <p style={{ fontSize: '0.7rem', color: suspendido ? '#ef4444' : '#555', marginTop: 2 }}>
                                    {castigo
                                      ? (castigo.motivo === 'roja' ? '🟥 ' : '🟨🟨 ') + castigo.detalle
                                      : j.posicion}
                                  </p>
                                </div>
                                <button
                                  onClick={() => { if (!suspendido) toggleHabilitado(eq.id, j.id) }}
                                  disabled={suspendido}
                                  title={castigo ? 'No se puede habilitar: ' + castigo.detalle : undefined}
                                  style={{
                                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                                    cursor: suspendido ? 'not-allowed' : 'pointer',
                                    fontSize: '1.1rem', fontWeight: 700, transition: 'all 0.15s',
                                    background: suspendido ? 'rgba(239,68,68,0.25)'
                                              : j.habilitado ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)',
                                    color: suspendido ? '#ef4444' : j.habilitado ? '#22c55e' : '#ef4444',
                                  }}>
                                  {suspendido ? '🔒' : j.habilitado ? '✓' : '✗'}
                                </button>
                              </div>
                            )})}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>
      )}


      {/* ══ MODAL: Comprobante ══ */}
      {modalComprobante && (
        <div className="modal-overlay" onClick={() => setModalComprobante(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">🧾 Comprobante de Pago</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalComprobante(null)}>✕</button>
            </div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: 14 }}>Equipo: <strong style={{ color: '#f5f5f5' }}>{modalComprobante.nombre}</strong></p>
            <VisorComprobante ruta={modalComprobante.comprobante} alto={220} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { rechazarEquipo(modalComprobante.id); setModalComprobante(null) }}
                style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                ✗ Rechazar
              </button>
              <button onClick={() => { aprobarEquipo(modalComprobante.id); setModalComprobante(null) }}
                style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, color: '#22c55e', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                ✓ Aprobar Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      <Confirmar
        abierto={confirmRepetir}
        titulo="¿Rehacer el sorteo?"
        detalle="Se borran los grupos y todo el fixture, y el torneo vuelve a quedar en inscripciones. Solo se puede mientras no se haya jugado ningún partido."
        textoSi="Sí, rehacerlo"
        trabajando={sorteando}
        onSi={repetirSorteo}
        onNo={() => setConfirmRepetir(false)} />

    </Layout>
  )
}
