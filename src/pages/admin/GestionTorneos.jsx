import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import {
  torneosDelComplejo, solicitudesDeCancha, conteoEquipos, solicitudesPendientes,
  ESTADO_TORNEO, estadoDeTorneo, ESTADO_SOLICITUD, canchasDeEmpresa, torneoPorId,
  TORNEOS, EMPRESAS, SESION, USUARIO_ACTUAL,
} from '../../lib/datos'
import { resolverSolicitudCancha, registrarEnBitacora, guardarTorneo,
         guardarQRTorneo } from '../../lib/guardar'
import { jornadasDelTorneo, DIAS_SEMANA, costoDelTorneo } from '../../lib/jornadas'
import { subirPublico, revisarArchivo, TIPOS_IMAGEN, urlPublica } from '../../lib/archivos'
import { DEPORTE_CONFIG } from '../../lib/deportes'


export default function GestionTorneos() {
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [tab, setTab]             = useState('mios')
  const [solicitudes, setSolic]   = useState(solicitudesDeCancha(SESION.empresaId))
  const [rechazando, setRechaz]   = useState(null)
  const [motivo, setMotivo]       = useState('')
  const [aviso, setAviso]         = useState(null)

  const canchas = canchasDeEmpresa(SESION.empresaId)

  // Solo los deportes que este complejo ofrece. Antes la lista tenia los cinco
  // fijos, asi que un complejo de wally podia crear un torneo de basquet sin
  // tener donde jugarlo.
  const empresa  = EMPRESAS.find(e => e.id === SESION.empresaId)
  const deportes = (empresa?.deportes?.length ? empresa.deportes : ['Fútbol'])
    .filter(d => DEPORTE_CONFIG[d])

  const avisar = (txt) => { setAviso(txt); setTimeout(() => setAviso(null), 3500) }

  /**
   * Elegir el deporte precarga como se juega: cuantos entran a la cancha,
   * cuantos se pueden anotar, que formatos tienen sentido.
   *
   * Es la misma configuracion que usa el formulario del cliente, para que un
   * torneo de futbol salga igual lo arme quien lo arme.
   */
  const elegirDeporte = (dep) => {
    const c = DEPORTE_CONFIG[dep]
    setForm(f => ({
      ...f,
      deporte: dep,
      formato: c?.formatos?.includes(f.formato) ? f.formato : (c?.formatos?.[0] || f.formato),
      jugadores:    String(c?.jugadoresTitulares ?? f.jugadores),
      jugadoresMin: String(c?.jugadoresTitulares ?? f.jugadoresMin),
      jugadoresMax: String((c?.jugadoresTitulares ?? 5) + (c?.suplentes ?? 0)),
      puntosPorSet:  String(c?.puntosPorSet  ?? ''),
      setsParaGanar: String(c?.setsParaGanar ?? ''),
    }))
  }

  const hoy = () => new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })

  /**
   * Escribe en el torneo real: recién ahi los equipos pueden inscribirse.
   * Se guarda primero en la base; si falla, la pantalla no miente.
   */
  const resolverSolicitud = async (t, solicitud) => {
    const g = await resolverSolicitudCancha(t.id, solicitud.estado, solicitud.motivo)
    if (g.error) { avisar('No se guardó el cambio. ' + g.error); return false }

    const real = torneoPorId(t.id)
    if (real) real.solicitud = solicitud
    setSolic(prev => prev.map(x => x.id === t.id ? { ...x, solicitud } : x))
    registrarEnBitacora({
      tipo: 'torneo',
      accion: solicitud.estado === 'aprobada' ? 'Aprobó la cancha de un torneo' : 'Rechazó la cancha de un torneo',
      detalle: t.nombre + (solicitud.motivo ? ' · ' + solicitud.motivo : ''),
    })
    return true
  }

  const aprobar = async (t) => {
    const ok = await resolverSolicitud(t, { estado: 'aprobada', fecha: hoy(), resueltaPor: USUARIO_ACTUAL.nombre, motivo: null })
    if (ok) avisar('Cancha aprobada para "' + t.nombre + '". Los equipos ya pueden inscribirse.')
  }

  const rechazar = async () => {
    const ok = await resolverSolicitud(rechazando, { estado: 'rechazada', fecha: hoy(), resueltaPor: USUARIO_ACTUAL.nombre, motivo })
    if (!ok) return
    avisar('Solicitud de "' + rechazando.nombre + '" rechazada. El organizador verá el motivo.')
    setRechaz(null)
    setMotivo('')
  }

  const pendientes = solicitudes.filter(s => s.solicitud?.estado === 'pendiente')

  // ── Formulario de torneo propio del complejo ──────────────────────────
  const EMOJI = { 'Fútbol': '⚽', 'Wally': '🎾', 'Básquetbol': '🏀', 'Voleibol': '🏐', 'Pádel': '🏓' }
  const primerDeporte = deportes[0] || 'Fútbol'
  const cfgPrimero    = DEPORTE_CONFIG[primerDeporte]

  const FORM_VACIO = {
    nombre: '', deporte: primerDeporte, cancha: canchas[0]?.nombre || '',
    formato: cfgPrimero?.formatos?.[0] || 'Grupos + Eliminación',
    inicio: '', fin: '', limite: '',
    maxEquipos: '8',
    jugadores: String(cfgPrimero?.jugadoresTitulares ?? 5),
    // Cuantos hay que anotar para que la inscripcion valga, y cuantos como
    // tope. No es lo mismo que cuantos juegan en cancha: se anotan suplentes.
    jugadoresMin: String(cfgPrimero?.jugadoresTitulares ?? 5),
    jugadoresMax: String((cfgPrimero?.jugadoresTitulares ?? 5) + (cfgPrimero?.suplentes ?? 0)),
    puntosPorSet:  String(cfgPrimero?.puntosPorSet  ?? ''),
    setsParaGanar: String(cfgPrimero?.setsParaGanar ?? ''),
    precio: '', descripcion: '',
    premio1: '', premio2: '', premio3: '',
    // Que dias y a que hora se juega. Sin esto la cancha no queda tomada y
    // alguien podria reservarla justo encima de una jornada del torneo.
    dias: [], horaInicio: '', horaFin: '',
  }
  const [form, setForm]       = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [qr, setQr]           = useState(null)        // el archivo elegido
  const [errorQR, setErrorQR] = useState(null)
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState(null)
  const [misTorneos, setMis]  = useState(torneosDelComplejo(SESION.empresaId))

  const set = (campo) => (e) => {
    setForm(f => ({ ...f, [campo]: e.target.value }))
    setErrores(er => ({ ...er, [campo]: null }))
  }

  const abrirCrear = () => {
    setForm(FORM_VACIO); setErrores({}); setQr(null)
    setErrorQR(null); setErrorCrear(null); setShowModal(true)
  }

  const alternarDia = (d) => setForm(f => ({
    ...f, dias: f.dias.includes(d) ? f.dias.filter(x => x !== d) : [...f.dias, d],
  }))

  const elegirQR = (archivo) => {
    if (!archivo) return
    const aviso = revisarArchivo(archivo, { tipos: TIPOS_IMAGEN, limite: 5 * 1024 * 1024 })
    if (aviso) { setErrorQR(aviso); return }
    setErrorQR(null); setQr(archivo)
  }

  const fechaLegible = (iso) => {
    if (!iso) return ''
    const [a, m, d] = iso.split('-')
    return d + ' ' + ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][Number(m) - 1]
  }

  /** Fechas coherentes, cupo par y mayor a 3, precio no negativo. */
  const validarTorneo = () => {
    const e = {}
    const hoy = new Date().toISOString().slice(0, 10)
    if (!form.nombre.trim()) e.nombre = 'Escribe el nombre del torneo, por ejemplo «Copa Sport Center 2026».'
    else if (form.nombre.trim().length < 4) e.nombre = 'El nombre es muy corto: usa al menos 4 caracteres.'
    else if (TORNEOS.some(t => t.nombre.toLowerCase() === form.nombre.trim().toLowerCase()))
      e.nombre = `Ya existe un torneo llamado «${form.nombre.trim()}». Usa otro nombre.`

    if (!form.cancha) e.cancha = 'Elige la cancha donde se jugará el torneo.'
    if (!form.limite) e.limite = 'Elige la fecha límite para inscribir equipos.'
    else if (form.limite < hoy) e.limite = 'La fecha límite de inscripción ya pasó. Elige una fecha desde hoy.'
    else if (form.inicio && form.limite > form.inicio) e.limite = 'La inscripción debe cerrar antes de que empiece el torneo.'
    if (!form.inicio) e.inicio = 'Elige la fecha en que empieza el torneo.'
    else if (form.inicio < hoy) e.inicio = 'La fecha de inicio ya pasó. Elige una fecha desde hoy.'
    if (!form.fin) e.fin = 'Elige la fecha en que termina el torneo.'
    else if (form.inicio && form.fin < form.inicio) e.fin = 'La fecha de fin no puede ser anterior a la de inicio.'

    const max = Number(form.maxEquipos)
    if (!form.maxEquipos) e.maxEquipos = 'Escribe cuántos equipos pueden participar.'
    else if (!Number.isInteger(max) || max < 4) e.maxEquipos = 'Se necesitan al menos 4 equipos para jugar grupos y eliminatoria.'
    else if (max % 2 !== 0) e.maxEquipos = `Usa un número par de equipos (${max - 1} o ${max + 1}) para poder armar los cruces.`
    else if (max > 64) e.maxEquipos = 'El máximo es 64 equipos por torneo.'

    const jug = Number(form.jugadores)
    if (!form.jugadores || jug < 1) e.jugadores = 'Escribe cuántos jugadores de cada equipo juegan en la cancha.'

    if (form.precio !== '' && Number(form.precio) < 0) e.precio = 'La inscripción no puede ser negativa. Usa 0 si es gratis.'

    const minJ = Number(form.jugadoresMin)
    const maxJ = Number(form.jugadoresMax)
    if (!form.jugadoresMin || minJ < 1) e.jugadoresMin = 'Escribe el mínimo de jugadores que debe inscribir cada equipo.'
    else if (jug && minJ < jug) e.jugadoresMin = `El mínimo no puede ser menor que los que juegan en la cancha (${jug}).`
    if (!form.jugadoresMax || maxJ < 1) e.jugadoresMax = 'Escribe el máximo de jugadores que puede inscribir cada equipo.'
    else if (minJ && maxJ < minJ)       e.jugadoresMax = `El máximo no puede ser menor que el mínimo (${minJ}).`

    if (!form.dias.length) e.dias = 'Elige al menos un día de la semana en que se jugará.'
    if (!form.horaInicio || !form.horaFin) e.horaInicio = 'Elige el horario de juego: desde qué hora y hasta qué hora.'
    else if (form.horaFin <= form.horaInicio) e.horaInicio = `La hora de fin debe ser posterior a la de inicio (${form.horaInicio}).`
    if (!form.premio1.trim()) e.premio1 = 'Escribe al menos el premio del primer lugar, por ejemplo «Trofeo + Bs. 500».'
    return e
  }

  /**
   * Antes esto solo empujaba el torneo a la lista en memoria con
   * id: Date.now(). Se veia publicado hasta que se recargaba la pagina y
   * desaparecia: nunca habia llegado a la base.
   */
  const crearTorneo = async () => {
    const e = validarTorneo()
    setErrores(e)
    if (Object.keys(e).length > 0) { irAlPrimerError(e); return }

    const empresa = EMPRESAS.find(x => x.id === SESION.empresaId)
    const cancha  = canchas.find(c => c.nombre === form.cancha)

    setCreando(true); setErrorCrear(null); setErrorQR(null)
    const g = await guardarTorneo({
      empresaId: SESION.empresaId, canchaId: cancha?.id, creadorTipo: 'complejo',
      nombre: form.nombre.trim(), emoji: EMOJI[form.deporte] || '🏆',
      deporte: form.deporte,
      descripcion: form.descripcion.trim() || null,
      formato: form.formato,
      maxEquipos: form.maxEquipos, jugadoresPorEquipo: form.jugadores,
      jugadoresMin: form.jugadoresMin, jugadoresMax: form.jugadoresMax,
      puntosPorSet: form.puntosPorSet, setsParaGanar: form.setsParaGanar,
      suplentes: 2, precio: form.precio,
      premios: { primero: form.premio1.trim(), segundo: form.premio2.trim(), tercero: form.premio3.trim() },
      reglas: [],
      dias: form.dias, horaInicio: form.horaInicio, horaFin: form.horaFin,
      precioHora: cancha?.precio,
      fechaInicio: form.inicio, fechaFin: form.fin, inscripcionHasta: form.limite,
    })
    if (g.error) { setCreando(false); setErrorCrear(g.error); return }

    // El QR va despues porque su ruta lleva el id del torneo.
    //
    // Si el complejo no subio uno para este torneo, se usa el que ya tiene
    // cargado en Mi cuenta: es el mismo con el que cobra las reservas y no
    // tiene por que volver a subirlo.
    let rutaQR = null
    if (qr) {
      const sub = await subirPublico({ carpeta: 'torneos/' + g.torneo.id, archivo: qr })
      if (sub.error) setErrorQR('El torneo quedó creado, pero el QR no se subió: ' + sub.error)
      else {
        rutaQR = sub.ruta
        await guardarQRTorneo({ torneoId: g.torneo.id, qrPago: rutaQR })
      }
    } else if (empresa?.qrPago) {
      rutaQR = empresa.qrPago
      await guardarQRTorneo({ torneoId: g.torneo.id, qrPago: rutaQR })
    }
    setCreando(false)

    const nuevo = {
      id: g.torneo.id, qrPago: rutaQR,
      creador_id: SESION.usuarioId, creador: empresa.nombre, creador_tipo: 'complejo',
      nombre: form.nombre.trim(), emoji: EMOJI[form.deporte] || '🏆',
      deporte: form.deporte, deporteKey: form.deporte,
      empresa_id: SESION.empresaId, empresa: empresa.nombre, cancha: form.cancha,
      fechaInicio: fechaLegible(form.inicio), fechaFin: fechaLegible(form.fin),
      inscripcionHasta: fechaLegible(form.limite),
      precio: Number(form.precio) || 0, estado: 'inscripciones',
      premios: { primero: form.premio1.trim(), segundo: form.premio2.trim(), tercero: form.premio3.trim() },
      desc: form.descripcion.trim() || 'Torneo organizado por ' + empresa.nombre + '.',
      formato: form.formato, jugadoresPorEquipo: Number(form.jugadores), suplentes: 2,
      maxEquipos: Number(form.maxEquipos), clasificanPorGrupo: 2,
      jugadoresMin: Number(form.jugadoresMin), jugadoresMax: Number(form.jugadoresMax),
      puntosPorSet: Number(form.puntosPorSet) || null,
      setsParaGanar: Number(form.setsParaGanar) || null,
      tieneAmarillas: form.deporte === 'Fútbol', tieneRojas: form.deporte === 'Fútbol',
      tieneGoles: form.deporte === 'Fútbol',
      reglas: [], calendario: [],
      horarios: form.dias.join(', ') + ': ' + form.horaInicio + ' a ' + form.horaFin,
      // Lo organiza el complejo, asi que no hay a quien pedirle la cancha:
      // la solicitud nace aprobada y las jornadas ya quedan ocupadas
      solicitud: { estado: 'aprobada', fecha: fechaLegible(new Date().toISOString().slice(0, 10)),
                   resueltaPor: USUARIO_ACTUAL.nombre, motivo: null,
                   cancha: form.cancha, dias: form.dias,
                   horaInicio: form.horaInicio, horaFin: form.horaFin,
                   costoTotal: g.costo?.total ?? 0 },
      grupos: null, equipos: [], partidos: [],
    }
    TORNEOS.push(nuevo)
    setMis(torneosDelComplejo(SESION.empresaId))
    setShowModal(false)
    avisar('«' + nuevo.nombre + '» ya está publicado. La cancha quedó tomada ' +
           (g.jornadas?.length || 0) + ' ' + ((g.jornadas?.length === 1) ? 'jornada' : 'jornadas') + '.')
  }

  return (
    <Layout role="admin">
      <div className="section-header">
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5' }}>🏆 Gestión de Torneos</h1>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>
            Los torneos que organizas y las solicitudes de cancha de los clientes
          </p>
        </div>
        <button className="btn btn-primary" onClick={abrirCrear}>+ Crear Torneo</button>
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>✓ {aviso}</p>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'mios' ? 'active' : ''}`} onClick={() => setTab('mios')}>
          Mis torneos ({misTorneos.length})
        </button>
        <button className={`tab ${tab === 'solicitudes' ? 'active' : ''}`} onClick={() => setTab('solicitudes')}>
          📩 Solicitudes de cancha ({pendientes.length} por revisar)
        </button>
      </div>

      {/* ══ TORNEOS QUE ORGANIZA EL COMPLEJO ══ */}
      {tab === 'mios' && (
        misTorneos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <h3>No organizas torneos aún</h3>
            <p>Crea tu primer torneo y empieza a recibir inscripciones</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={abrirCrear}>+ Crear Torneo</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {misTorneos.map(t => {
              const pend = solicitudesPendientes(t).length
              const est  = estadoDeTorneo(t)
              return (
                <div key={t.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.95rem' }}>{t.emoji} {t.nombre}</p>
                      <p style={{ color: '#666', fontSize: '0.78rem' }}>{t.deporte} · {t.formato}</p>
                    </div>
                    <span className="badge" style={{ background: est.bg, color: est.color, flexShrink: 0 }}>{est.corto}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                    <p style={{ color: '#666', fontSize: '0.78rem' }}>📅 {t.fechaInicio} — {t.fechaFin}</p>
                    <p style={{ color: '#666', fontSize: '0.78rem' }}>👥 {conteoEquipos(t)} equipos aprobados</p>
                    <p style={{ color: '#666', fontSize: '0.78rem' }}>📍 {t.cancha}</p>
                  </div>

                  {pend > 0 && (
                    <p style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>
                      ⏳ {pend} equipo{pend > 1 ? 's' : ''} esperando aprobación
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/torneos/' + t.id)}>Gestionar</button>
                    {t.estado === 'en_curso' && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/torneos/' + t.id + '/en-vivo')}>🔴 En vivo</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/torneos/' + t.id + '/mesa')}>⚙️ Mesa</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ══ SOLICITUDES DE CANCHA ══ */}
      {tab === 'solicitudes' && (
        <>
          <div style={{ padding: '10px 14px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
            <p style={{ color: '#00BCD4', fontSize: '0.82rem' }}>
              📩 Cuando un cliente organiza su torneo en tu complejo, te pide la cancha.
              Hasta que la apruebes, no puede abrir inscripciones.
            </p>
          </div>

          {solicitudes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📩</div>
              <h3>Sin solicitudes</h3>
              <p>Ningún cliente pidió una cancha para organizar su torneo</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {solicitudes.map(t => {
                const sol = t.solicitud || { estado: 'pendiente' }
                const es  = ESTADO_SOLICITUD[sol.estado]
                return (
                  <div key={t.id} className="card" style={{ padding: 20, borderLeft: '3px solid ' + es.color }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div>
                        <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.95rem' }}>{t.emoji} {t.nombre}</p>
                        <p style={{ color: '#666', fontSize: '0.8rem' }}>
                          Lo organiza <strong style={{ color: '#00BCD4' }}>{t.creador}</strong> · solicitado el {sol.fecha}
                        </p>
                      </div>
                      <span className="badge" style={{ background: es.bg, color: es.color, flexShrink: 0 }}>{es.label}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
                      {[
                        ['Cancha pedida', sol.cancha || t.cancha || '—'],
                        ['Fechas', t.fechaInicio + ' — ' + t.fechaFin],
                        ['Días que se juega', sol.dias?.length ? sol.dias.join(', ') : 'Todos los del rango'],
                        ['Horario', sol.horaInicio ? sol.horaInicio + ' a ' + sol.horaFin : '—'],
                        ['Jornadas', jornadasDelTorneo({
                          fechaInicio: t.fechaInicioISO || t.fechaInicio,
                          fechaFin: t.fechaFinISO || t.fechaFin,
                          dias: sol.dias,
                        }).length || '—'],
                        ['Costo de la cancha', sol.costoTotal != null ? 'Bs. ' + sol.costoTotal : '—'],
                        ['Equipos', t.maxEquipos + ' máximo'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                          <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: 2 }}>{k}</p>
                          <p style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600 }}>{v}</p>
                        </div>
                      ))}
                    </div>

                    {sol.estado === 'pendiente' ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => aprobar(t)}>✓ Aprobar la cancha</button>
                        <button className="btn btn-outline btn-sm" onClick={() => { setRechaz(t); setMotivo('') }}>Rechazar</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/torneos/' + t.id)}>Ver el torneo</button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: '#555', fontSize: '0.78rem' }}>
                          {es.label} el {sol.fecha}{sol.resueltaPor ? ' por ' + sol.resueltaPor : ''}
                        </p>
                        {sol.motivo && (
                          <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>Motivo: {sol.motivo}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══ MODAL: RECHAZAR SOLICITUD ══ */}
      {rechazando && (
        <div className="modal-overlay" onClick={() => setRechaz(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Rechazar solicitud</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>{rechazando.nombre} · {rechazando.creador}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setRechaz(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Motivo del rechazo *</label>
              <textarea className="input" rows={3} style={{ resize: 'none' }} value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: La cancha ya está comprometida esas fechas por mantenimiento" />
              <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 4 }}>
                El organizador verá este mensaje para poder proponer otra fecha.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setRechaz(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={!motivo.trim()} onClick={rechazar}>
                Rechazar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CREAR TORNEO ══ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Crear Torneo</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nombre del torneo *</label>
                <input className="input" placeholder="Ej: Copa Sport Center 2026"
                  value={form.nombre} onChange={set('nombre')}
                  {...propsCampo('nombre', errores.nombre)} />
                <MensajeCampo nombre="nombre" error={errores.nombre} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Deporte *</label>
                  <select className="input" value={form.deporte}
                    onChange={e => elegirDeporte(e.target.value)}>
                    {deportes.map(d => (
                      <option key={d} value={d}>{DEPORTE_CONFIG[d]?.emoji} {d}</option>
                    ))}
                  </select>
                  <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 4 }}>
                    Son los deportes que ofrece tu complejo.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Formato *</label>
                  <select className="input" value={form.formato} onChange={set('formato')}>
                    {(DEPORTE_CONFIG[form.deporte]?.formatos
                      || ['Grupos + Eliminación', 'Eliminación directa', 'Liga (todos contra todos)'])
                      .map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cancha *</label>
                <select className="input" value={form.cancha} onChange={set('cancha')}
                  {...propsCampo('cancha', errores.cancha)}>
                  <option value="">Selecciona la cancha</option>
                  {canchas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
                <MensajeCampo nombre="cancha" error={errores.cancha} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['limite', 'Límite de inscripciones *'],
                  ['inicio', 'Fecha de inicio *'],
                  ['fin',    'Fecha de fin *'],
                ].map(([campo, label]) => (
                  <div className="form-group" key={campo}>
                    <label className="form-label">{label}</label>
                    <input className="input" type="date" value={form[campo]} onChange={set(campo)}
                      {...propsCampo(campo, errores[campo])} />
                    <MensajeCampo nombre={campo} error={errores[campo]} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Máx. equipos *</label>
                  <input className="input" type="number" min="4" step="2" placeholder="8"
                    value={form.maxEquipos} onChange={set('maxEquipos')}
                    {...propsCampo('maxEquipos', errores.maxEquipos)} />
                  <MensajeCampo nombre="maxEquipos" error={errores.maxEquipos} />
                </div>
                <div className="form-group">
                  <label className="form-label">Juegan en cancha *</label>
                  <input className="input" type="number" min="1" placeholder="5"
                    value={form.jugadores} onChange={set('jugadores')}
                    {...propsCampo('jugadores', errores.jugadores)} />
                  <MensajeCampo nombre="jugadores" error={errores.jugadores} />
                </div>
                <div className="form-group">
                  <label className="form-label">Inscripción (Bs.)</label>
                  <input className="input" type="number" min="0" placeholder="0 = gratis"
                    value={form.precio} onChange={set('precio')}
                    {...propsCampo('precio', errores.precio)} />
                  <MensajeCampo nombre="precio" error={errores.precio} />
                </div>
              </div>

              {/* Cuantos jugadores se anotan.
                  Es otra cosa que «juegan en cancha»: un equipo de fútbol 11
                  anota más de once porque lleva suplentes, y no puede
                  inscribirse con nueve porque no completa. */}
              <div style={{ padding: '12px 14px', background: 'rgba(0,188,212,0.05)',
                border: '1px solid rgba(0,188,212,0.18)', borderRadius: 10, marginBottom: 14 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>
                  Jugadores que puede anotar cada equipo
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mínimo *</label>
                    <input className="input" type="number" min="1"
                      value={form.jugadoresMin} onChange={set('jugadoresMin')}
                      {...propsCampo('jugadoresMin', errores.jugadoresMin)} />
                    <MensajeCampo nombre="jugadoresMin" error={errores.jugadoresMin} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Máximo *</label>
                    <input className="input" type="number" min="1"
                      value={form.jugadoresMax} onChange={set('jugadoresMax')}
                      {...propsCampo('jugadoresMax', errores.jugadoresMax)} />
                    <MensajeCampo nombre="jugadoresMax" error={errores.jugadoresMax} />
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 8, lineHeight: 1.5 }}>
                  Con menos del mínimo no se puede inscribir un equipo, y más del
                  máximo no se puede anotar.
                </p>
              </div>

              {/* Como se gana un partido.
                  No hay un numero universal: el wally se juega a 15, a 21 o a
                  25 segun quien organice, y el voley oficial va a 25 al mejor
                  de cinco pero en un torneo de barrio se juega al mejor de
                  tres. Por eso se elige, con una sugerencia por deporte. */}
              {DEPORTE_CONFIG[form.deporte]?.porSets && (
                <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginBottom: 14 }}>
                  <p style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>
                    Cómo se gana un partido de {form.deporte}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Puntos por set</label>
                      <input className="input" type="number" min="1" max="99"
                        value={form.puntosPorSet} onChange={set('puntosPorSet')} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Sets para ganar</label>
                      <input className="input" type="number" min="1" max="5"
                        value={form.setsParaGanar} onChange={set('setsParaGanar')} />
                    </div>
                  </div>
                  <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 8, lineHeight: 1.5 }}>
                    Gana el que llegue primero a {form.setsParaGanar || '?'} set(s). Es al mejor
                    de {form.setsParaGanar ? (Number(form.setsParaGanar) * 2 - 1) : '?'}.
                    <br />
                    El set se gana a {form.puntosPorSet || '?'} <strong style={{ color: '#888' }}>con dos
                    de diferencia</strong>: si quedan {form.puntosPorSet ? Number(form.puntosPorSet) - 1 : '?'} iguales,
                    sigue hasta que alguno saque dos.
                  </p>
                </div>
              )}

              {/* Que dias y a que hora se juega: con esto la cancha queda
                  tomada y nadie puede reservarla encima del torneo */}
              <div className="form-group">
                <label className="form-label">Días de juego *</label>
                <div id="campo-dias" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {DIAS_SEMANA.map(d => {
                    const on = form.dias.includes(d)
                    return (
                      <button key={d} type="button" onClick={() => alternarDia(d)}
                        style={{ padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
                          fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.8rem',
                          background: on ? 'rgba(0,188,212,0.15)' : '#1a1a1a',
                          border: '1px solid ' + (on ? '#00BCD4' : '#2a2a2a'),
                          color: on ? '#00BCD4' : '#888' }}>
                        {d}
                      </button>
                    )
                  })}
                </div>
                <MensajeCampo nombre="dias" error={errores.dias} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Desde las *</label>
                  <input className="input" type="time" step="3600" value={form.horaInicio}
                    onChange={set('horaInicio')}
                    {...propsCampo('horaInicio', errores.horaInicio)} />
                  <MensajeCampo nombre="horaInicio" error={errores.horaInicio} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hasta las *</label>
                  <input className="input" type="time" step="3600" value={form.horaFin}
                    onChange={set('horaFin')} />
                </div>
              </div>
              {errores.horaInicio && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: -6, marginBottom: 10 }}>{errores.horaInicio}</p>
              )}

              {/* Cuanto vale tener la cancha ocupada todas esas jornadas */}
              {form.dias.length > 0 && form.inicio && form.fin && form.horaInicio && form.horaFin && (
                <div style={{ padding: '12px 14px', background: 'rgba(0,188,212,0.06)',
                  border: '1px solid rgba(0,188,212,0.22)', borderRadius: 10, marginBottom: 14 }}>
                  {(() => {
                    const cancha = canchas.find(c => c.nombre === form.cancha)
                    const costo = costoDelTorneo({ fechaInicio: form.inicio, fechaFin: form.fin,
                      dias: form.dias, horaInicio: form.horaInicio, horaFin: form.horaFin,
                      precioHora: cancha?.precio })
                    // Si las fechas estan al reves no hay ninguna jornada. Antes
                    // el aviso decia «Son 0 jornadas», que parecia un error del
                    // sistema y no lo que era: la fecha de fin puesta antes que
                    // la de inicio.
                    if (costo.jornadas === 0) {
                      return (
                        <p style={{ color: '#f59e0b', fontSize: '0.8rem', lineHeight: 1.6 }}>
                          Con esas fechas y esos días no queda ninguna jornada.
                          {form.fin < form.inicio
                            ? ' La fecha de fin es anterior a la de inicio.'
                            : ' Fíjate si los días que elegiste caen dentro del rango.'}
                        </p>
                      )
                    }
                    return (
                      <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        Son <strong style={{ color: '#f5f5f5' }}>{costo.jornadas} jornadas</strong> de{' '}
                        {costo.horasPorJornada} h en {form.cancha}. Como el torneo es tuyo no se
                        te cobra, pero la cancha te queda ocupada{' '}
                        <strong style={{ color: '#f5f5f5' }}>{costo.jornadas * costo.horasPorJornada} horas</strong>{' '}
                        (equivalen a Bs. {costo.total} que no vas a poder alquilar).
                      </p>
                    )
                  })()}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">🥇 1er lugar *</label>
                  <input className="input" placeholder="Trofeo + Bs. 500" value={form.premio1} onChange={set('premio1')}
                    {...propsCampo('premio1', errores.premio1)} />
                  <MensajeCampo nombre="premio1" error={errores.premio1} />
                </div>
                <div className="form-group">
                  <label className="form-label">🥈 2do lugar</label>
                  <input className="input" placeholder="Medalla + Bs. 200" value={form.premio2} onChange={set('premio2')} />
                </div>
                <div className="form-group">
                  <label className="form-label">🥉 3er lugar</label>
                  <input className="input" placeholder="Medalla" value={form.premio3} onChange={set('premio3')} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input" rows={3} style={{ resize: 'none' }}
                  placeholder="Para quién es el torneo, nivel, condiciones..."
                  value={form.descripcion} onChange={set('descripcion')} />
              </div>

                            <div className="form-group">
                <label className="form-label">🔲 Código QR de pago de inscripción</label>

                {/* El complejo ya tiene su QR cargado en Mi cuenta, el mismo con
                    el que cobra las reservas. Lo normal es usar ese; subir otro
                    sirve cuando el torneo cobra en otra cuenta. */}
                {empresa?.qrPago && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: qr ? 'transparent' : 'rgba(34,197,94,0.06)',
                    border: '1px solid ' + (qr ? '#2a2a2a' : 'rgba(34,197,94,0.3)'),
                    borderRadius: 10, marginBottom: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#fff',
                      padding: 3, flexShrink: 0 }}>
                      <img src={urlPublica(empresa.qrPago)} alt="QR del complejo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', color: qr ? '#666' : '#22c55e', fontWeight: 600 }}>
                        {qr ? 'El QR de tu complejo' : '✓ Se va a usar el QR de tu complejo'}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#555' }}>
                        El mismo con el que cobras las reservas
                      </p>
                    </div>
                    {qr && (
                      <button onClick={() => setQr(null)}
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #333',
                          borderRadius: 8, color: '#888', fontSize: '0.75rem', cursor: 'pointer',
                          fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
                        Usar este
                      </button>
                    )}
                  </div>
                )}

                <div style={{ border: '2px dashed ' + (qr ? '#22c55e' : '#2a2a2a'), borderRadius: 10, padding: 20, textAlign: 'center' }}>
                  <p style={{ color: qr ? '#22c55e' : '#555', fontSize: '0.85rem' }}>
                    {qr ? '✓ ' + qr.name
                        : empresa?.qrPago ? 'O sube otro QR solo para este torneo'
                        : 'Sube el QR para recibir los pagos de inscripción'}
                  </p>
                  <label className="btn btn-outline btn-sm" style={{ marginTop: 8, cursor: 'pointer', display: 'inline-flex' }}>
                    {qr ? 'Cambiar imagen' : 'Subir otro QR'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                      onChange={e => { elegirQR(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                </div>
                {errorQR && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 6 }}>{errorQR}</p>}
              </div>
              <AvisoFaltantes faltantes={Object.entries(errores).filter(([, v]) => v).map(([campo, texto]) => ({ campo, texto }))} error={errorCrear} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }}
                  disabled={creando} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
                  disabled={creando} onClick={crearTorneo}>
                  {creando ? 'Creando…' : 'Crear torneo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
