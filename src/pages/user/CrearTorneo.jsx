import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import { TORNEOS, USUARIO_ACTUAL, empresaPorId, canchasDeEmpresa } from '../../lib/datos'
import { guardarTorneo, guardarQRTorneo } from '../../lib/guardar'
import { subirPublico, revisarArchivo, TIPOS_IMAGEN } from '../../lib/archivos'
import NoEncontrado from '../../components/NoEncontrado'
import { DEPORTE_CONFIG } from '../../lib/deportes'
import { DIAS_SEMANA, jornadasDelTorneo, costoDelTorneo } from '../../lib/jornadas'
import { hoyBolivia, nombreDia } from '../../lib/fecha'
import { choquesEnFranja } from '../../lib/datos'
import { montoBs } from '../../lib/dinero'

// Pasos del formulario
const PASOS = ['Deporte y Cancha', 'Formato y Fechas', 'Reglas y Equipos', 'Inscripción y QR', 'Confirmar']

export default function CrearTorneo() {
  const { id } = useParams()
  const navigate = useNavigate()

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [paso, setPaso] = useState(0)
  // Complejo y canchas reales: las mismas que el admin publica
  const empresa = empresaPorId(id)
  const canchasEmpresa = canchasDeEmpresa(id).filter(c => c.disponible)

  const [creado, setCreado] = useState(false)
  const [torneoCreado, setTorneoCreado] = useState(null)

  const [form, setForm] = useState({
    nombre: '',
    deporte: '',
    cancha: '',
    formato: '',
    maxEquipos: 8,
    fechaInicio: '',
    fechaFin: '',
    inscripcionHasta: '',
    dias: [],
    horaInicio: '09:00',
    horaFin: '13:00',
    precio: '',
    premioPrimero: '',
    premioSegundo: '',
    premioTercero: '',
    reglas: [],
    nuevaRegla: '',
    titulares: '',
    suplentes: '',
    // Cuantos hay que anotar para inscribirse y cuantos como tope. No es lo
    // mismo que los titulares: se anotan suplentes, y con menos del minimo el
    // equipo no completa.
    jugadoresMin: '',
    jugadoresMax: '',
    puntosPorSet: '',
    setsParaGanar: '',
    qrFile: null,
    qrPreview: null,
    descripcion: '',
  })

  const cfg = DEPORTE_CONFIG[form.deporte]

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  // Cuando cambia el deporte, pre-llenar config
  const seleccionarDeporte = (dep) => {
    const c = DEPORTE_CONFIG[dep]
    setForm(f => ({
      ...f,
      deporte: dep,
      titulares: String(c.jugadoresTitulares),
      suplentes: String(c.suplentes),
      jugadoresMin: String(c.jugadoresTitulares),
      jugadoresMax: String(c.jugadoresTitulares + c.suplentes),
      puntosPorSet:  String(c.puntosPorSet  ?? ''),
      setsParaGanar: String(c.setsParaGanar ?? ''),
      formato: c.formatos[0],
      reglas: [...c.reglasBase],
      cancha: '',
    }))
  }

  const agregarRegla = () => {
    if (!form.nuevaRegla.trim()) return
    setForm(f => ({ ...f, reglas: [...f.reglas, f.nuevaRegla.trim()], nuevaRegla: '' }))
  }

  const quitarRegla = (i) => setForm(f => ({ ...f, reglas: f.reglas.filter((_, idx) => idx !== i) }))

  const [errorQR, setErrorQR] = useState(null)

  /**
   * La imagen se revisa ahora y se sube recién al final: la ruta del archivo
   * lleva el id del torneo adentro, y ese id no existe hasta crearlo.
   *
   * La vista previa es un enlace local (blob:) que solo vive en esta pestana.
   * Sirve para que el organizador confirme que el QR se lee; lo que se guarda
   * es el archivo, no ese enlace.
   */
  const handleQR = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const aviso = revisarArchivo(file, { tipos: TIPOS_IMAGEN, limite: 5 * 1024 * 1024 })
    if (aviso) { setErrorQR(aviso); e.target.value = ''; return }
    setErrorQR(null)
    set('qrFile', file)
    set('qrPreview', URL.createObjectURL(file))
  }

  /**
   * Que le falta a este paso, dicho con palabras.
   *
   * Antes solo se apagaba el boton «Siguiente» y quien lo miraba no tenia
   * forma de saber cual de los seis campos era el que faltaba.
   */
  const [intentoPaso, setIntentoPaso] = useState(false)

  const erroresDelPaso = () => {
    const e = {}
    const hoy = hoyBolivia()
    const n = (v) => Number(v)

    if (paso === 0) {
      if (!form.deporte) e.deporte = 'Elige el deporte del torneo.'
      if (!form.cancha)  e.cancha  = form.deporte
        ? `Elige la cancha de ${form.deporte} donde se jugará.`
        : 'Elige primero el deporte y luego la cancha donde se jugará.'
    }

    if (paso === 1) {
      if (!form.nombre.trim()) e.nombre = 'Escribe el nombre del torneo, por ejemplo «Copa Verano 2026».'
      else if (form.nombre.trim().length < 4) e.nombre = 'El nombre es muy corto: usa al menos 4 caracteres.'
      if (!form.formato) e.formato = 'Elige el formato de competencia.'
      if (!form.fechaInicio) e.fechaInicio = 'Elige la fecha en que empieza el torneo.'
      else if (form.fechaInicio < hoy) e.fechaInicio = 'La fecha de inicio ya pasó. Elige una fecha desde hoy.'
      if (!form.fechaFin) e.fechaFin = 'Elige la fecha en que termina el torneo.'
      else if (form.fechaInicio && form.fechaFin < form.fechaInicio) e.fechaFin = 'La fecha de fin no puede ser anterior a la de inicio.'
      if (!form.inscripcionHasta) e.inscripcionHasta = 'Elige hasta qué fecha se pueden inscribir los equipos.'
      else if (form.inscripcionHasta < hoy) e.inscripcionHasta = 'La fecha límite de inscripción ya pasó. Elige una fecha desde hoy.'
      else if (form.fechaInicio && form.inscripcionHasta > form.fechaInicio)
        e.inscripcionHasta = 'Las inscripciones deben cerrar antes de que empiece el torneo (o el mismo día).'
      if (!e.fechaInicio && !e.fechaFin && form.fechaInicio && form.fechaFin && plan.jornadas === 0)
        e.dias = 'Con esas fechas y esos días no queda ninguna jornada. Amplía el rango de fechas o marca otros días.'
      if (plan.horasPorJornada <= 0) e.horaFin = `La hora de fin debe ser posterior a la de inicio (${form.horaInicio}).`
      else if (choques.length > 0)
        e.horaInicio = `${choques.length} ${choques.length === 1 ? 'hora ya está ocupada' : 'horas ya están ocupadas'} en esa cancha (ver la lista de abajo). Cambia el horario, los días o la cancha.`
    }

    if (paso === 2) {
      const tit = n(form.titulares), min = n(form.jugadoresMin), max = n(form.jugadoresMax)
      if (!form.titulares) e.titulares = 'Escribe cuántos jugadores de cada equipo juegan en la cancha.'
      else if (!Number.isInteger(tit) || tit < 1 || tit > 15) e.titulares = 'Los jugadores en cancha deben ser un número entre 1 y 15.'
      if (!form.jugadoresMin) e.jugadoresMin = 'Escribe el mínimo de jugadores que debe inscribir cada equipo.'
      else if (!e.titulares && min < tit) e.jugadoresMin = `El mínimo no puede ser menor que los que juegan en la cancha (${tit}).`
      if (!form.jugadoresMax) e.jugadoresMax = 'Escribe el máximo de jugadores que puede inscribir cada equipo.'
      else if (form.jugadoresMin && max < min) e.jugadoresMax = `El máximo no puede ser menor que el mínimo (${min}).`
      else if (max > 40) e.jugadoresMax = 'El máximo es 40 jugadores por equipo.'
      if (!form.reglas.length) e.reglas = 'Agrega al menos una regla del torneo.'
    }

    if (paso === 3) {
      if (form.precio === '' || form.precio == null) e.precio = 'Escribe el costo de inscripción por equipo. Usa 0 si es gratis.'
      else if (n(form.precio) < 0) e.precio = 'El costo de inscripción no puede ser negativo.'
      if (!form.qrPreview && n(form.precio) > 0) e.qr = 'Sube la imagen de tu código QR para que los equipos puedan pagar.'
    }
    return e
  }

  const ORDEN_PASO = ['deporte', 'cancha', 'nombre', 'formato', 'fechaInicio', 'fechaFin', 'inscripcionHasta',
    'dias', 'horaInicio', 'horaFin', 'titulares', 'jugadoresMin', 'jugadoresMax', 'reglas', 'precio', 'qr']

  const EMOJI = { 'Fútbol': '⚽', 'Wally': '🎾', 'Básquetbol': '🏀', 'Voleibol': '🏐', 'Pádel': '🏓', 'Futsal': '⚽' }

  const fechaLegible = (iso) => {
    if (!iso) return ''
    const [, m, d] = iso.split('-')
    return d + ' ' + ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][Number(m) - 1]
  }

  /**
   * Registra el torneo y deja el pedido de cancha PENDIENTE.
   * Hasta que el complejo lo apruebe, nadie puede inscribirse.
   */
  const toggleDia = (d) => setForm(f => ({
    ...f, dias: f.dias.includes(d) ? f.dias.filter(x => x !== d) : [...f.dias, d],
  }))

  const canchaElegida = canchasDeEmpresa(id).find(c => c.nombre === form.cancha)

  // Cuantas jornadas salen y cuanto suma la cancha
  const plan = costoDelTorneo({
    fechaInicio: form.fechaInicio, fechaFin: form.fechaFin, dias: form.dias,
    horaInicio: form.horaInicio, horaFin: form.horaFin,
    precioHora: canchaElegida?.precio,
  })

  // Antes de pedir nada, avisar si esas horas ya estan tomadas. Vale para
  // reservas de clientes, entrenamientos y otros torneos: todo ocupa igual.
  const choques = (() => {
    if (!canchaElegida || !form.horaInicio || !form.horaFin) return []
    const fechas = jornadasDelTorneo({
      fechaInicio: form.fechaInicio, fechaFin: form.fechaFin, dias: form.dias,
    })
    if (!fechas.length) return []
    return choquesEnFranja(id, form.cancha, fechas, form.horaInicio, form.horaFin)
      .map(r => {
        const quien = r.torneo ? 'torneo ' + r.torneo
          : r.origen === 'torneo' ? 'otro torneo'
          : 'una reserva' + (r.estado === 'pendiente' ? ' por confirmar' : '')
        return r.fecha + ' ' + r.horaInicio + '-' + r.horaFin + ' · ' + quien
      })
  })()

  const errPaso = paso < 4 ? erroresDelPaso() : {}
  const faltaEnEstePaso = () => intentoPaso
    ? ORDEN_PASO.filter(c => errPaso[c]).map(c => ({ campo: c, texto: errPaso[c] })) : []
  const pc = (c) => propsCampo(c, errPaso[c], intentoPaso)
  const mc = (c) => <MensajeCampo nombre={c} error={errPaso[c]} mostrar={intentoPaso} />

  const avanzar = () => {
    setIntentoPaso(true)
    if (Object.keys(errPaso).length) { irAlPrimerError(errPaso, ORDEN_PASO); return }
    setIntentoPaso(false)
    setPaso(p => p + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const [errorCrear, setErrorCrear] = useState(null)
  const [creando, setCreando] = useState(false)

  const confirmar = async () => {
    const emp = empresa
    const cancha = canchasDeEmpresa(id).find(c => c.nombre === form.cancha)

    setCreando(true)
    setErrorCrear(null)
    const g = await guardarTorneo({
      empresaId: id, canchaId: cancha?.id, creadorTipo: 'cliente',
      nombre: form.nombre.trim(), emoji: EMOJI[form.deporte] || '🏆',
      deporte: form.deporte,
      descripcion: form.descripcion.trim() || null,
      formato: form.formato,
      maxEquipos: form.maxEquipos, jugadoresPorEquipo: form.titulares,
      suplentes: String(Math.max(0, (Number(form.jugadoresMax) || 0) - (Number(form.titulares) || 0))),
      precio: form.precio,
      jugadoresMin: form.jugadoresMin, jugadoresMax: form.jugadoresMax,
      puntosPorSet: form.puntosPorSet, setsParaGanar: form.setsParaGanar,
      premios: { primero: form.premioPrimero, segundo: form.premioSegundo, tercero: form.premioTercero },
      reglas: form.reglas,
      dias: form.dias, horaInicio: form.horaInicio, horaFin: form.horaFin,
      precioHora: canchaElegida?.precio,
      fechaInicio: form.fechaInicio, fechaFin: form.fechaFin,
      inscripcionHasta: form.inscripcionHasta,
    })
    if (g.error) { setCreando(false); setErrorCrear(g.error); return }

    // El QR va despues: su ruta lleva el id del torneo, que recién existe aca.
    // Si esto falla, el torneo igual queda creado y el QR se puede volver a
    // cargar; por eso no se cancela todo, se avisa.
    let rutaQR = null
    if (form.qrFile) {
      const sub = await subirPublico({
        carpeta: 'torneos/' + g.torneo.id, archivo: form.qrFile,
      })
      if (sub.error) setErrorQR('El torneo se creó, pero el QR no se pudo subir: ' + sub.error)
      else {
        rutaQR = sub.ruta
        await guardarQRTorneo({ torneoId: g.torneo.id, qrPago: rutaQR })
      }
    }
    setCreando(false)

    const nuevo = {
      id: g.torneo.id, qrPago: rutaQR,
      creador_id: USUARIO_ACTUAL.id, creador: USUARIO_ACTUAL.nombre, creador_tipo: 'cliente',
      solicitud: { estado: 'pendiente', fecha: fechaLegible(hoyBolivia()), resueltaPor: null, motivo: null },
      nombre: form.nombre.trim(), emoji: EMOJI[form.deporte] || '🏆',
      deporte: form.deporte, deporteKey: form.deporte,
      empresa_id: id, empresa: emp?.nombre || '', cancha: form.cancha,
      fechaInicio: fechaLegible(form.fechaInicio), fechaFin: fechaLegible(form.fechaFin),
      inscripcionHasta: fechaLegible(form.inscripcionHasta),
      precio: Number(form.precio) || 0, estado: 'inscripciones',
      premios: { primero: form.premioPrimero, segundo: form.premioSegundo, tercero: form.premioTercero },
      desc: form.descripcion.trim() || ('Torneo de ' + form.deporte + ' organizado en ' + (emp?.nombre || '') + '.'),
      formato: form.formato, jugadoresPorEquipo: Number(form.titulares) || 5,
      suplentes: Math.max(0, (Number(form.jugadoresMax) || 0) - (Number(form.titulares) || 0)),
      maxEquipos: Number(form.maxEquipos) || 8,
      jugadoresMin: Number(form.jugadoresMin) || null,
      jugadoresMax: Number(form.jugadoresMax) || null,
      puntosPorSet: Number(form.puntosPorSet) || null,
      setsParaGanar: Number(form.setsParaGanar) || null,
      clasificanPorGrupo: 2,
      tieneAmarillas: form.deporte === 'Fútbol', tieneRojas: form.deporte === 'Fútbol',
      tieneGoles: form.deporte === 'Fútbol',
      reglas: form.reglas, calendario: [],
      horarios: form.horarios || emp?.horario || '',
      grupos: null, equipos: [], partidos: [],
    }
    nuevo.creadoEl = new Date().toISOString()
    TORNEOS.push(nuevo)
    setTorneoCreado(nuevo)
    setCreado(true)
  }

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────────
  if (creado) {
    return (
      <Layout role="user">
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>📩</div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 8 }}>
            Solicitud enviada
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 8 }}>
            <strong style={{ color: '#f5f5f5' }}>{form.nombre}</strong> quedó registrado y {empresa?.nombre} ya recibió tu pedido de cancha.
          </p>
          <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, marginBottom: 28, textAlign: 'left' }}>
            <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.84rem', marginBottom: 6 }}>⏳ Qué sigue ahora</p>
            <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.6 }}>
              El administrador del complejo revisa que la cancha esté libre en esas fechas.
              Cuando la apruebe, tu torneo se publica y los equipos podrán inscribirse.
              Si la rechaza vas a ver el motivo para proponer otra fecha.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/app/torneos/${torneoCreado.id}`)}
            >
              📋 Ver mi torneo
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate(`/app/empresa/${id}`)}
            >
              ← Volver a {empresa?.nombre}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // El complejo puede no existir (enlace viejo) o estar dado de baja. Sin esto
  // la pantalla reventaba al leer empresa.nombre y quedaba en blanco.
  if (!empresa) {
    return <NoEncontrado que="Este complejo" volverA="/app/inicio" textoVolver="Ver los complejos" />
  }

  // ── RENDER PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <Layout role="user">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
          style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem', marginBottom: 8 }}
        >
          ← Volver
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5' }}>
          Crear Torneo — {empresa?.nombre}
        </h1>
        <p style={{ color: '#666', fontSize: '0.82rem' }}>
          Primero el complejo aprueba la cancha; después los equipos pueden inscribirse
        </p>
      </div>

      {/* Stepper */}
      <div className="pasos-asistente" style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
        {PASOS.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < paso ? '#22c55e' : i === paso ? '#8B0000' : '#2a2a2a',
                color: i <= paso ? '#fff' : '#555',
                fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
                border: i === paso ? '2px solid #ff6b6b' : 'none',
                transition: 'all 0.2s',
              }}>
                {i < paso ? '✓' : i + 1}
              </div>
              <span className="paso-etiqueta" style={{ fontSize: '0.65rem', color: i === paso ? '#ff6b6b' : i < paso ? '#22c55e' : '#555', whiteSpace: 'nowrap' }}>
                {p}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div className="paso-linea" style={{ width: 40, height: 1, background: i < paso ? '#22c55e' : '#2a2a2a', margin: '0 6px', marginBottom: 20, flexShrink: 0, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>
      {/* En el celular no entran los cinco nombres: se dice en qué paso va */}
      <p className="paso-actual-movil" style={{ marginTop: -22, marginBottom: 24, fontSize: '0.78rem', color: '#ff6b6b', fontWeight: 600 }}>
        Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}
      </p>

      {/* Contenedor del paso */}
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── PASO 0: Deporte y Cancha ── */}
        {paso === 0 && (
          <div>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 20, fontSize: '1.1rem' }}>
              ¿Qué deporte y en qué cancha?
            </h2>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Deporte *</label>
              {mc('deporte')}
              <div id="campo-deporte" tabIndex={-1} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {empresa?.deportes.map(dep => {
                  const c = DEPORTE_CONFIG[dep]
                  return (
                    <button
                      key={dep}
                      onClick={() => seleccionarDeporte(dep)}
                      style={{
                        padding: '16px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'Outfit',
                        background: form.deporte === dep ? 'rgba(139,0,0,0.25)' : '#1a1a1a',
                        border: `1px solid ${form.deporte === dep ? '#8B0000' : '#2a2a2a'}`,
                        color: form.deporte === dep ? '#ff6b6b' : '#888',
                        textAlign: 'center', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>{c?.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{dep}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>
                        {c?.jugadoresTitulares}v{c?.jugadoresTitulares}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {form.deporte && (
              <>
                {/* Info dinámica del deporte */}
                <div style={{ padding: '12px 16px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 10, marginBottom: 20 }}>
                  <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}>
                    {cfg?.emoji} Config para {form.deporte}
                  </p>
                  <p style={{ color: '#888', fontSize: '0.78rem' }}>
                    {cfg?.jugadoresTitulares} jugadores por equipo
                    {cfg?.suplentes > 0 ? ` + ${cfg.suplentes} suplentes` : ''}
                    {cfg?.tieneAmarillas ? ' • Con tarjetas' : ''}
                    {cfg?.tienePuntos ? ' • Puntaje' : ' • Goles'}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Cancha donde se jugará *</label>
                  <select className="input" value={form.cancha} onChange={e => set('cancha', e.target.value)} {...pc('cancha')}>
                    <option value="">Selecciona una cancha de {empresa?.nombre}</option>
                    {canchasEmpresa
                      .filter(c => !form.deporte || c.deporte === form.deporte)
                      .map(c => <option key={c.id} value={c.nombre}>{c.nombre} — Bs. {montoBs(c.precio)}/hora</option>)}
                  </select>
                  {mc('cancha')}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PASO 1: Formato y Fechas ── */}
        {paso === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem' }}>
              {cfg?.emoji} Formato y fechas del torneo
            </h2>

            <div className="form-group">
              <label className="form-label">Nombre del torneo *</label>
              <input
                className="input"
                placeholder={`Ej: Copa ${empresa?.nombre} ${form.deporte} 2026`}
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                {...pc('nombre')}
              />
              {mc('nombre')}
            </div>

            <div className="form-group">
              <label className="form-label">Descripción breve</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Describe brevemente el torneo..."
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Formato de competencia *</label>
              {mc('formato')}
              <div id="campo-formato" tabIndex={-1} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cfg?.formatos.map(f => (
                  <button
                    key={f}
                    onClick={() => set('formato', f)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit',
                      background: form.formato === f ? 'rgba(139,0,0,0.2)' : '#1a1a1a',
                      border: `1px solid ${form.formato === f ? '#8B0000' : '#2a2a2a'}`,
                      color: form.formato === f ? '#ff6b6b' : '#888',
                      textAlign: 'left', fontWeight: form.formato === f ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {form.formato === f ? '● ' : '○ '}{f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Fecha de inicio *</label>
                <input className="input" type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} {...pc('fechaInicio')} />
                {mc('fechaInicio')}
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de fin *</label>
                <input className="input" type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} {...pc('fechaFin')} />
                {mc('fechaFin')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Inscripciones hasta *</label>
              <input className="input" type="date" value={form.inscripcionHasta} onChange={e => set('inscripcionHasta', e.target.value)} {...pc('inscripcionHasta')} />
              {mc('inscripcionHasta')}
            </div>

            {/* ── Cuando se ocupa la cancha ── */}
            <div style={{ padding: 16, background: 'rgba(0,188,212,0.05)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 12 }}>
              <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>
                📅 Cuándo se usa la cancha
              </p>
              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 14, lineHeight: 1.5 }}>
                Elige los días que se juega dentro de ese rango y el horario. Solo
                esos días quedan reservados: el resto sigue libre para otros.
              </p>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Días que se juega</label>
                <div id="campo-dias" tabIndex={-1} style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {DIAS_SEMANA.map(d => {
                    const on = form.dias.includes(d)
                    return (
                      <button key={d} onClick={() => toggleDia(d)}
                        style={{ padding: '9px 13px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Outfit',
                          fontWeight: 700, fontSize: '0.8rem',
                          background: on ? 'rgba(0,188,212,0.18)' : '#1a1a1a',
                          border: '1px solid ' + (on ? '#00BCD4' : '#2a2a2a'),
                          color: on ? '#00BCD4' : '#777' }}>
                        {nombreDia(d)}
                      </button>
                    )
                  })}
                </div>
                {form.dias.length === 0 && (
                  <p style={{ fontSize: '0.74rem', color: '#666', marginTop: 6 }}>
                    Si no marcas ninguno, se toma que se juega todos los días del rango.
                  </p>
                )}
                {mc('dias')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Desde</label>
                  <input className="input" type="time" step="3600" value={form.horaInicio}
                    onChange={e => set('horaInicio', e.target.value)} {...pc('horaInicio')} />
                  {mc('horaInicio')}
                </div>
                <div className="form-group">
                  <label className="form-label">Hasta</label>
                  <input className="input" type="time" step="3600" value={form.horaFin}
                    onChange={e => set('horaFin', e.target.value)} {...pc('horaFin')} />
                  {mc('horaFin')}
                </div>
              </div>

              {/* Lo que va a costar y las jornadas que salen */}
              {plan.jornadas > 0 && plan.horasPorJornada > 0 && (
                <div style={{ marginTop: 4, padding: '12px 14px', background: 'rgba(0,0,0,0.35)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>
                    <span>{plan.jornadas} jornada{plan.jornadas > 1 ? 's' : ''} × {plan.horasPorJornada} h</span>
                    <span>{plan.horasTotales} horas de cancha</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px solid #2a2a2a' }}>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                      Bs. {montoBs(canchaElegida?.precio || 0)} por hora
                    </span>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f59e0b' }}>
                      Total: Bs. {montoBs(plan.total)}
                    </span>
                  </div>
                </div>
              )}

              {/* Si esas horas ya estan tomadas, decirlo antes de mandar nada */}
              {choques.length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10 }}>
                  <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>
                    ⚠ Esas horas ya están ocupadas
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {choques.slice(0, 6).map((c, i) => (
                      <li key={i} style={{ color: '#888', fontSize: '0.76rem', marginBottom: 2 }}>{c}</li>
                    ))}
                  </ul>
                  {choques.length > 6 && (
                    <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 4 }}>
                      y {choques.length - 6} más
                    </p>
                  )}
                  <p style={{ color: '#888', fontSize: '0.76rem', marginTop: 8 }}>
                    Cambia el horario, los días o la cancha para poder continuar.
                  </p>
                </div>
              )}

              {plan.jornadas === 0 && form.fechaInicio && form.fechaFin && (
                <p style={{ color: '#f59e0b', fontSize: '0.78rem', marginTop: 10 }}>
                  Con esos días no cae ninguna jornada dentro del rango de fechas.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── PASO 2: Reglas y Equipos ── */}
        {paso === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem' }}>
              Reglas y composición de equipos
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Máx. equipos</label>
                <select className="input" value={form.maxEquipos} onChange={e => set('maxEquipos', Number(e.target.value))}>
                  {[4, 6, 8, 10, 12, 16, 20, 24, 32].map(n => <option key={n} value={n}>{n} equipos</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Juegan en cancha</label>
                <input
                  className="input" type="number" min={1} max={15}
                  value={form.titulares}
                  onChange={e => set('titulares', e.target.value)}
                  {...pc('titulares')}
                />
                {mc('titulares')}
              </div>
            </div>

            {/* Como se gana un partido. No hay numero universal: el wally se
                juega a 15, a 21 o a 25 segun quien organice. Por eso se elige. */}
            {cfg?.porSets && (
              <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginBottom: 20 }}>
                <p style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>
                  Cómo se gana un partido de {form.deporte}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Puntos por set</label>
                    <input className="input" type="number" min={1} max={99}
                      value={form.puntosPorSet}
                      onChange={e => set('puntosPorSet', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sets para ganar</label>
                    <input className="input" type="number" min={1} max={5}
                      value={form.setsParaGanar}
                      onChange={e => set('setsParaGanar', e.target.value)} />
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 8, lineHeight: 1.5 }}>
                  Gana el que llegue primero a {form.setsParaGanar || '?'} set(s).
                  <br />
                  El set se gana a {form.puntosPorSet || '?'} <strong style={{ color: '#888' }}>con dos
                  de diferencia</strong>: si quedan {form.puntosPorSet ? Number(form.puntosPorSet) - 1 : '?'} iguales,
                  sigue hasta que alguno saque dos.
                </p>
              </div>
            )}

            {/* Cuantos jugadores anota cada equipo.
                Con menos del minimo no completa, y mas del maximo no se
                puede anotar. Los suplentes salen de la diferencia. */}
            <div style={{ padding: '12px 14px', background: 'rgba(0,188,212,0.05)',
              border: '1px solid rgba(0,188,212,0.18)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: '#00BCD4', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>
                Jugadores que puede anotar cada equipo
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mínimo</label>
                  <input className="input" type="number" min={1}
                    value={form.jugadoresMin}
                    onChange={e => set('jugadoresMin', e.target.value)} {...pc('jugadoresMin')} />
                  {mc('jugadoresMin')}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Máximo</label>
                  <input className="input" type="number" min={1}
                    value={form.jugadoresMax}
                    onChange={e => set('jugadoresMax', e.target.value)} {...pc('jugadoresMax')} />
                  {mc('jugadoresMax')}
                </div>
              </div>
              <p style={{ color: '#666', fontSize: '0.74rem', marginTop: 8, lineHeight: 1.5 }}>
                Un equipo no se puede inscribir con menos del mínimo, ni anotar
                más del máximo.
              </p>
            </div>

            {/* Premios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="form-label">Premios (opcional)</label>
              {[
                { campo: 'premioPrimero', label: '🥇 1° lugar' },
                { campo: 'premioSegundo', label: '🥈 2° lugar' },
                { campo: 'premioTercero', label: '🥉 3° lugar' },
              ].map(({ campo, label }) => (
                <div key={campo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', color: '#888', minWidth: 80 }}>{label}</span>
                  <input
                    className="input"
                    placeholder="Ej: Trofeo + Bs. 500"
                    value={form[campo]}
                    onChange={e => set(campo, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Reglas */}
            <div>
              <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                Reglas del torneo ({form.reglas.length}) *
              </label>
              <span id="campo-reglas" tabIndex={-1} />
              {mc('reglas')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {form.reglas.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#bbb', flex: 1 }}>• {r}</span>
                    <button
                      onClick={() => quitarRegla(i)}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.9rem', marginLeft: 8, flexShrink: 0 }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Agregar una regla..."
                  value={form.nuevaRegla}
                  onChange={e => set('nuevaRegla', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarRegla()}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-outline"
                  onClick={agregarRegla}
                  style={{ flexShrink: 0 }}
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 3: Inscripción y QR ── */}
        {paso === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem' }}>
              Precio e inscripción
            </h2>

            <div className="form-group">
              <label className="form-label">Costo de inscripción por equipo (Bs.)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>Bs.</span>
                <input
                  className="input"
                  type="number" min={0}
                  placeholder="Ej: 200"
                  value={form.precio}
                  onChange={e => set('precio', e.target.value)}
                  style={{ fontSize: '1.1rem' }}
                  {...pc('precio')}
                />
              </div>
              {mc('precio')}
              {form.precio === '0' && (
                <p style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: 4 }}>✓ Torneo gratuito</p>
              )}
            </div>

                        {/* QR de pago */}
            <div className="form-group">
              <label className="form-label">Tu código QR de pago</label>
              <span id="campo-qr" tabIndex={-1} />
              {mc('qr')}
              <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 12 }}>
                Los equipos que se inscriban verán este QR para realizar el pago. Sube una imagen clara de tu QR.
              </p>

              {form.qrPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={form.qrPreview}
                    alt="QR de pago"
                    style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 12, border: '1px solid #2a2a2a', background: '#fff', padding: 8 }}
                  />
                  <button
                    onClick={() => { set('qrFile', null); set('qrPreview', null) }}
                    style={{
                      position: 'absolute', top: -8, right: -8, width: 24, height: 24,
                      borderRadius: '50%', background: '#ef4444', border: 'none',
                      color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 30, border: '2px dashed #2a2a2a', borderRadius: 12,
                  cursor: 'pointer', color: '#555', transition: 'all 0.15s',
                  background: '#1a1a1a',
                }}>
                  <span style={{ fontSize: '2.5rem' }}>📱</span>
                  <span style={{ fontWeight: 600, color: '#888' }}>Subir imagen del QR</span>
                  <span style={{ fontSize: '0.72rem', color: '#555' }}>PNG, JPG o PDF • Máx 5MB</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleQR} style={{ display: 'none' }} />
                </label>
              )}

              {errorQR && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 8 }}>{errorQR}</p>
              )}
            </div>

            <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
              <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>💡 ¿Cómo funciona la inscripción?</p>
              <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.6 }}>
                1. Un equipo ve tu torneo y presiona "Inscribirse"<br />
                2. Ven tu QR y realizan el pago<br />
                3. Suben foto de su comprobante<br />
                4. Tú revisas y apruebas o rechazas la inscripción<br />
                5. Los aprobados aparecen en la tabla del torneo
              </p>
            </div>
          </div>
        )}

        {/* ── PASO 4: Resumen / Confirmar ── */}
        {paso === 4 && (
          <div>
            <h2 style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>
              Resumen del torneo
            </h2>

            {/* Card resumen */}
            <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'rgba(139,0,0,0.15)', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f5f5f5' }}>{form.nombre}</p>
                  <p style={{ fontSize: '0.78rem', color: '#666' }}>{cfg?.emoji} {form.deporte} • {empresa?.nombre}</p>
                </div>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f59e0b' }}>Bs. {montoBs(form.precio)}</span>
              </div>
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Cancha', value: form.cancha },
                  { label: 'Formato', value: form.formato.split('(')[0].trim() },
                  { label: 'Máx. equipos', value: `${form.maxEquipos} equipos` },
                  { label: 'Por equipo', value: `${form.titulares} titulares + ${form.suplentes} suplentes` },
                  { label: 'Inicio', value: form.fechaInicio },
                  { label: 'Fin', value: form.fechaFin },
                  { label: 'Inscripciones hasta', value: form.inscripcionHasta },
                  { label: 'Reglas', value: `${form.reglas.length} reglas definidas` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: '0.85rem', color: '#bbb', fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
              {form.premioPrimero && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a2a' }}>
                  <p style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>🏅 Premios</p>
                  {form.premioPrimero && <p style={{ fontSize: '0.78rem', color: '#bbb' }}>🥇 {form.premioPrimero}</p>}
                  {form.premioSegundo && <p style={{ fontSize: '0.78rem', color: '#999' }}>🥈 {form.premioSegundo}</p>}
                  {form.premioTercero && <p style={{ fontSize: '0.78rem', color: '#999' }}>🥉 {form.premioTercero}</p>}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                ⏳ Al enviar, {empresa?.nombre} recibe tu pedido de cancha. El torneo se publica
                recién cuando el complejo aprueba las fechas y el horario que elegiste.
              </p>
            </div>
          </div>
        )}

        {/* ── Navegación entre pasos ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'space-between' }}>
          <button
            className="btn btn-outline"
            onClick={() => { setIntentoPaso(false); paso === 0 ? navigate(-1) : setPaso(p => p - 1) }}
          >
            {paso === 0 ? '✕ Cancelar' : '← Atrás'}
          </button>

          {paso < 4 ? (
            <button
              className="btn btn-primary"
              onClick={avanzar}
            >
              Siguiente →
            </button>
          ) : (
            <div>
              {errorQR && (
                <p style={{ color: '#f59e0b', fontSize: '0.8rem', marginBottom: 8, maxWidth: 320 }}>{errorQR}</p>
              )}

              <button
                className="btn btn-primary"
                onClick={confirmar}
                disabled={creando}
                style={{ background: '#22c55e', border: 'none', opacity: creando ? 0.6 : 1 }}
              >
                {creando ? 'Enviando…' : '📩 Enviar solicitud'}
              </button>
            </div>
          )}
        </div>

        {/* Que falta para poder seguir, en vez de solo apagar el boton */}
        <div style={{ marginTop: 14 }}>
          <AvisoFaltantes
            faltantes={paso < 4 ? faltaEnEstePaso() : []}
            error={errorCrear}
            titulo={`Para pasar al paso ${paso + 2} revisa:`} />
        </div>
      </div>
    </Layout>
  )
}
