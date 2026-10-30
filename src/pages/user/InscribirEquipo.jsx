import { useState } from 'react'
import { digitosDe, esTelefono } from '../../lib/validaciones'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import NoEncontrado from '../../components/NoEncontrado'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import { validarDorsales } from '../../lib/torneo'
import { torneoPorId, aceptaInscripciones, inscripcionVencida, USUARIO_ACTUAL,
         yaInscritoEn } from '../../lib/datos'
import { guardarEquipo, guardarComprobanteEquipo, revisarCodigoCanje } from '../../lib/guardar'
import { subirComprobante, subirPublico, urlPublica,
         revisarArchivo, TIPOS_IMAGEN } from '../../lib/archivos'
import { montoBs } from '../../lib/dinero'

// Lo unico que de verdad depende del deporte: que posiciones existen.
//
// Cuantos jugadores entran NO esta aca: lo decide quien organiza el torneo al
// crearlo (minimo y maximo), y puede ser distinto en dos torneos del mismo
// deporte. Antes esta tabla lo fijaba, asi que un torneo de wally pedia dos
// jugadores aunque el organizador hubiera puesto cinco.
const POSICIONES = {
  'Fútbol':     ['Portero', 'Defensa', 'Lateral Derecho', 'Lateral Izquierdo',
                  'Mediocampista', 'Volante', 'Extremo', 'Delantero', 'Otro'],
  'Básquetbol': ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot', 'Otro'],
  'Voleibol':   ['Armador', 'Opuesto', 'Receptor', 'Central', 'Líbero', 'Otro'],
  'Wally':      [],
  'Tenis':      [],
  'Pádel':      [],
}

const playerEmpty = () => ({ nombre: '', dorsal: '', posicion: '' })

// Columnas del formulario de jugador: dorsal, nombre y posición si el deporte la usa.
// El C.I. ya no se pide: nadie lo usaba (migraciones/040).
const gridJugador = (config) =>
  config.posiciones.length > 0 ? '70px 2fr 1.3fr' : '70px 1fr'

export default function InscribirEquipo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const torneo = torneoPorId(id)

  // Cuantos jugadores se anotan lo dice el torneo, no el deporte. Si es de dos
  // se habla de pareja; de mas, de equipo.
  const minJugadores = torneo?.jugadoresMin || torneo?.jugadoresPorEquipo || 0
  const maxJugadores = torneo?.jugadoresMax
    || ((torneo?.jugadoresPorEquipo || 0) + (torneo?.suplentes || 0))
  const esPareja = maxJugadores > 0 && maxJugadores <= 2

  const config = torneo ? {
    posiciones: POSICIONES[torneo.deporteKey] || [],
    labelEquipo: esPareja ? 'Nombre de la Pareja / Dupla' : 'Nombre del Equipo',
    infoComposicion: minJugadores === maxJugadores
      ? minJugadores + ' jugadores'
      : 'De ' + minJugadores + ' a ' + maxJugadores + ' jugadores',
  } : null

  const [nombreEquipo, setNombreEquipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // 'nombre' es lo que ve el capitan; 'ruta' es donde quedo guardado el
  // archivo. Antes solo existia el nombre, asi que el organizador no tenia
  // nada que revisar.
  const [comprobante, setComprobante]     = useState(null)
  const [compRuta, setCompRuta]           = useState(null)
  const [subiendoComp, setSubiendoComp]   = useState(false)
  const [errorComp, setErrorComp]         = useState(null)
  const [equipoId, setEquipoId]           = useState(null)
  // El que inscribe suele ser el capitán: sus datos ya vienen de su cuenta y
  // los puede cambiar si el capitán es otro. Antes había que escribirlos.
  const [capitan, setCapitan] = useState({
    nombre: USUARIO_ACTUAL.nombre || '', telefono: USUARIO_ACTUAL.telefono || '',
  })
  // Una sola lista, no titulares y suplentes por separado.
  //
  // Al inscribirse nadie sabe todavia quien va a ser titular: eso se decide
  // partido a partido, en la habilitacion previa. Separarlos aca obligaba al
  // capitan a inventar una alineacion semanas antes de jugar.
  //
  // Arranca con el minimo de filas y se agregan las que hagan falta.
  const [jugadores, setJugadores] = useState(
    Array.from({ length: Math.max(1, minJugadores) }, playerEmpty)
  )
  const [experiencia, setExperiencia] = useState('')
  const [expectativas, setExpectativas] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // El escudo del equipo. Se sube apenas se elige, como el comprobante: si
  // falla, el capitan se entera antes de completar todo el resto.
  const [escudoNombre, setEscudoNombre] = useState('')
  const [escudoRuta, setEscudoRuta]     = useState(null)
  const [subiendoEscudo, setSubEscudo]  = useState(false)
  const [errorEscudo, setErrorEscudo]   = useState(null)

  // Inscripcion cubierta con puntos. Solo en los torneos que organiza el
  // COMPLEJO: si lo organiza un cliente, la plata de las inscripciones es
  // suya —con eso paga la cancha, el trofeo, los carteles— y no tiene por
  // que perderla por una promocion del complejo en la que no participo.
  const [codigoCanje, setCodigoCanje]     = useState('')
  const [canjeAplicado, setCanjeAplicado] = useState(null)
  const [revisandoCodigo, setRevisando]   = useState(false)
  const [errorCodigo, setErrorCodigo]     = useState(null)

  if (!torneo || !config) {
    return <NoEncontrado que="Este torneo" volverA="/app/torneos" textoVolver="Ver los torneos" />
  }

  // Si el torneo ya no recibe equipos (pasó la fecha límite, ya empezó o el
  // complejo todavía no aprobó la cancha), se dice antes de llenar el formulario
  if (!aceptaInscripciones(torneo)) {
    const motivo = torneo.estado !== 'inscripciones'
      ? 'Este torneo ya empezó o terminó.'
      : inscripcionVencida(torneo)
        ? `Las inscripciones cerraron el ${torneo.inscripcionHasta}.`
        : 'El complejo todavía no aprobó la cancha de este torneo.'
    return (
      <Layout role="user">
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">🏆</div>
          <h3 style={{ marginBottom: 8 }}>Este torneo no está recibiendo inscripciones</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>{motivo}</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/app/torneos/' + torneo.id)}>
            Ver el torneo
          </button>
        </div>
      </Layout>
    )
  }

  // Ya tiene un equipo pendiente o aprobado en este torneo: no se inscribe
  // dos veces. Pasaba al volver atrás o al entrar otra vez por el enlace.
  const yaInscrito = yaInscritoEn(torneo)
  if (yaInscrito && !submitted) {
    return (
      <Layout role="user">
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">👥</div>
          <h3 style={{ marginBottom: 8 }}>Ya inscribiste un equipo en este torneo</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
            <strong style={{ color: '#f5f5f5' }}>{yaInscrito.nombre}</strong>
            {yaInscrito.estado === 'pendiente'
              ? ' está por aprobar: el organizador revisa la inscripción.'
              : ' ya está aprobado en el torneo.'}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/app/torneos/' + torneo.id)}>
            Ver el torneo
          </button>
        </div>
      </Layout>
    )
  }

  const updateJugador = (lista, setLista, index, field, value) => {
    setLista(prev => prev.map((j, i) => i === index ? { ...j, [field]: value } : j))
  }

  const agregarJugador = () => {
    if (jugadores.length >= maxJugadores) return
    setJugadores(prev => [...prev, playerEmpty()])
  }

  const quitarJugador = (i) => {
    if (jugadores.length <= 1) return
    setJugadores(prev => prev.filter((_, k) => k !== i))
  }

  /** El escudo va al bucket publico: lo ve cualquiera que mire la tabla. */
  const elegirEscudo = async (archivo) => {
    if (!archivo) return
    const aviso = revisarArchivo(archivo, TIPOS_IMAGEN)
    if (aviso) { setErrorEscudo(aviso); return }
    setErrorEscudo(null); setSubEscudo(true); setEscudoNombre(archivo.name)
    const r = await subirPublico({ carpeta: 'equipos/' + torneo.id, archivo })
    setSubEscudo(false)
    if (r.error) { setErrorEscudo(r.error); setEscudoNombre(''); return }
    setEscudoRuta(r.ruta)
  }

  const aplicarCodigo = async () => {
    const codigo = codigoCanje.trim()
    if (!codigo) return
    setRevisando(true); setErrorCodigo(null)
    const r = await revisarCodigoCanje(codigo, torneo?.empresa_id)
    setRevisando(false)
    // revisarCodigoCanje mira los de descuento en reserva. El de inscripcion a
    // torneo lo rechaza con su propio mensaje, y ese es justo el que sirve aca.
    if (r.error && !/inscribir un equipo/.test(r.error)) {
      setCanjeAplicado(null); setErrorCodigo(r.error); return
    }
    if (r.error) { setCanjeAplicado({ codigo: codigo.toUpperCase() }); setErrorCodigo(null); return }
    setCanjeAplicado(null)
    setErrorCodigo('Ese canje es un descuento de cancha, no sirve para inscribir un equipo.')
  }

  // Los dorsales tienen que ser unicos dentro del equipo
  const plantel = jugadores
  const erroresDorsal = validarDorsales(plantel)
  const errorTitular  = (i) => erroresDorsal[i]

  // Los que de verdad se anotaron: una fila vacia no cuenta
  const anotados = plantel.filter(j => j.nombre.trim()).length


  /**
   * Lo que falta, junto y al final.
   *
   * Los problemas de dorsal se nombran con el jugador, no con el numero de
   * fila: en un plantel de once, 'revisa el jugador 7' no ayuda si no se ve
   * de quien se trata.
   */
  const [intento, setIntento] = useState(false)
  const errores = {}
  const orden = []
  {
    const quien = (i) => plantel[i]?.nombre?.trim() ? ` (${plantel[i].nombre.trim()})` : ''
    const digitos = digitosDe(capitan.telefono)
    if (!nombreEquipo.trim()) errores.nombreEquipo = `Escribe el nombre ${esPareja ? 'de la pareja' : 'del equipo'}.`
    else if (nombreEquipo.trim().length < 3) errores.nombreEquipo = 'El nombre es muy corto: usa al menos 3 caracteres.'
    if (!capitan.nombre.trim()) errores.capitanNombre = `Escribe el nombre completo ${esPareja ? 'del responsable' : 'del capitán'}.`
    if (!digitos) errores.capitanTelefono = 'Escribe un teléfono o WhatsApp para que el organizador pueda contactarte.'
    else if (!esTelefono(capitan.telefono)) errores.capitanTelefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}).`
    if (anotados < minJugadores) errores.jugadores = `Este torneo pide al menos ${minJugadores} jugadores y llevas ${anotados}. Completa ${minJugadores - anotados} más.`
    else if (anotados > maxJugadores) errores.jugadores = `Este torneo permite como máximo ${maxJugadores} jugadores y llevas ${anotados}. Quita ${anotados - maxJugadores}.`
    orden.push('nombreEquipo', 'capitanNombre', 'capitanTelefono', 'jugadores')
    jugadores.forEach((j, i) => {
      const nombre = j.nombre.trim()
      if (!nombre && (i < minJugadores || String(j.dorsal).trim()))
        errores['jugador-' + i] = `Escribe el nombre del jugador ${i + 1}.`
      if (nombre && !String(j.dorsal).trim()) errores['dorsal-' + i] = `Falta el dorsal de ${nombre}.`
      else if (erroresDorsal[i]) errores['dorsal-' + i] = erroresDorsal[i].replace(/\.$/, '') + quien(i) + '.'
      orden.push('dorsal-' + i, 'jugador-' + i)
    })
  }
  const faltaEnLaInscripcion = intento
    ? orden.filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] })) : []
  const puedeEnviar = Object.keys(errores).length === 0
  const pc = (c) => propsCampo(c, errores[c], intento)
  const mc = (c) => <MensajeCampo nombre={c} error={errores[c]} mostrar={intento} />

  const [errorEnvio, setErrorEnvio] = useState(null)
  const [enviando, setEnviando]     = useState(false)

  const handleSubmit = async () => {
    setIntento(true)
    if (!puedeEnviar) { irAlPrimerError(errores, orden); return }

    setEnviando(true)
    setErrorEnvio(null)
    const g = await guardarEquipo({
      torneoId: torneo.id, nombre: nombreEquipo.trim(),
      capitanNombre: capitan.nombre.trim(), capitanTelefono: capitan.telefono,
      comprobante: null,          // el pago viene en el paso siguiente
      jugadores: plantel,
      escudo: escudoRuta,
      codigoCanje: canjeAplicado?.codigo || null,
    })
    setEnviando(false)
    if (g.error) { setErrorEnvio(g.error); return }

    // Se suma a los datos que ya están en memoria: así el torneo y «Mis
    // participaciones» lo muestran como pendiente sin recargar la página.
    const e = g.equipo
    torneo.equipos.push({
      id: e.id, nombre: e.nombre, capitan: e.capitan_nombre, estado: e.estado,
      comprobante: e.comprobante_url, capitan_id: e.capitan_id, integrantes_ids: [e.capitan_id],
      escudo: e.escudo_url || null, codigoCanje: e.codigo_canje || null,
      jugadores: g.jugadores,
    })
    setEquipoId(e.id)
    setSubmitted(true)
  }

  /**
   * Sube el comprobante y lo deja pegado al equipo. Son dos pasos y los dos
   * tienen que salir bien: si el archivo sube pero la fila no se actualiza,
   * el organizador no lo va a encontrar nunca.
   */
  const elegirComprobante = async (archivo) => {
    if (!archivo) return
    setErrorComp(null)
    setComprobante(archivo.name)
    setCompRuta(null)
    setSubiendoComp(true)

    const r = await subirComprobante({
      carpeta: torneo.empresa_id + '/torneos/' + torneo.id, archivo,
    })
    if (r.error) { setSubiendoComp(false); setErrorComp(r.error); setComprobante(null); return }

    const g = await guardarComprobanteEquipo({ equipoId, comprobante: r.ruta })
    setSubiendoComp(false)
    if (g.error) { setErrorComp(g.error); setComprobante(null); return }

    const enMemoria = torneo.equipos.find(e => e.id === equipoId)
    if (enMemoria) enMemoria.comprobante = r.ruta

    setCompRuta(r.ruta)
  }

  // ── PANTALLA DE CONFIRMACIÓN ──
  if (submitted) {
    return (
      <Layout role="user">
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#22c55e', marginBottom: 8 }}>
            ¡Equipo Inscrito!
          </h1>
          <p style={{ color: '#888', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 24 }}>
            Tu equipo <strong style={{ color: '#f5f5f5' }}>{nombreEquipo}</strong> ha sido inscrito correctamente en{' '}
            <strong style={{ color: '#f5f5f5' }}>{torneo.nombre}</strong>.
          </p>

          {/* Cubierta con puntos: no hay nada que pagar ni que subir */}
          {canjeAplicado && (
            <div style={{ padding: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, marginBottom: 24, textAlign: 'left' }}>
              <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>✓ Inscripción cubierta con tus puntos</p>
              <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
                Usaste el código {canjeAplicado.codigo}. No tienes que pagar ni subir comprobante; solo falta que el organizador apruebe tu equipo.
              </p>
            </div>
          )}

          {!canjeAplicado && (
          <div style={{ padding: 20, background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 14, marginBottom: 24, textAlign: 'left' }}>
            <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>💳 Siguiente paso — Pago con QR</p>
            <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12 }}>
              Para confirmar tu inscripción, realiza el pago de{' '}
              <strong style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>Bs. {montoBs(torneo.precio)}</strong>{' '}
              al organizador mediante código QR y sube el comprobante.
            </p>
            {/* El QR que cargó el organizador. Sobre blanco, que es como lo
                lee la cámara */}
            <div style={{ border: '2px dashed ' + (torneo.qrPago ? 'rgba(34,197,94,0.4)' : '#2a2a2a'),
              borderRadius: 10, padding: torneo.qrPago ? 10 : 28, textAlign: 'center', marginBottom: 12,
              background: torneo.qrPago ? '#fff' : 'transparent' }}>
              {torneo.qrPago ? (
                <img src={urlPublica(torneo.qrPago)} alt="QR del organizador"
                  style={{ width: 170, height: 170, objectFit: 'contain' }} />
              ) : (
                <>
                  <p style={{ color: '#f59e0b', fontSize: '0.82rem', marginBottom: 8 }}>
                    El organizador todavía no cargó su QR
                  </p>
                  <p style={{ color: '#666', fontSize: '0.75rem', lineHeight: 1.5 }}>
                    Coordina el pago con {torneo.creador || torneo.empresa} y sube igual
                    el comprobante cuando lo tengas.
                  </p>
                </>
              )}
            </div>

            <label className="btn btn-accent w-full"
              style={{ color: '#000', justifyContent: 'center', cursor: subiendoComp ? 'wait' : 'pointer' }}>
              {subiendoComp ? 'Subiendo…' : compRuta ? '✓ ' + comprobante : '📎 Subir Comprobante de Pago'}
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                style={{ display: 'none' }} disabled={subiendoComp || !equipoId}
                onChange={e => { elegirComprobante(e.target.files?.[0]); e.target.value = '' }} />
            </label>

            {compRuta && (
              <p style={{ color: '#22c55e', fontSize: '0.75rem', marginTop: 6, textAlign: 'center' }}>
                Comprobante guardado. El organizador ya puede revisarlo.
              </p>
            )}
            {errorComp && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 6, textAlign: 'center' }}>
                {errorComp}
              </p>
            )}
            {!compRuta && !errorComp && !subiendoComp && (
              <p style={{ color: '#666', fontSize: '0.75rem', marginTop: 6, textAlign: 'center' }}>
                Sin el comprobante el organizador no podrá aprobar tu equipo
              </p>
            )}
          </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => navigate('/app/inicio')}>
              Ir al Inicio
            </button>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/app/torneos/${id}`)}>
              Ver Detalles del Torneo
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // ── FORMULARIO DE INSCRIPCIÓN ──
  return (
    <Layout role="user">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
          style={{ padding: '4px 0', color: '#00BCD4', fontSize: '0.82rem' }}
        >
          ← Volver
        </button>
        <span style={{ color: '#444', fontSize: '0.82rem', marginLeft: 8 }}>Inscribir Equipo</span>
      </div>

      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#f5f5f5', marginBottom: 6 }}>
        👥 Inscribir Equipo
      </h1>

      {/* Banner del torneo */}
      <div style={{
        background: 'rgba(0,188,212,0.06)',
        border: '1px solid rgba(0,188,212,0.2)',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem' }}>Inscribiendo en: {torneo.nombre}</p>
          <p style={{ color: '#666', fontSize: '0.8rem', marginTop: 2 }}>
            {torneo.deporteKey} • {config.infoComposicion}
          </p>
        </div>
        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f59e0b' }}>Bs. {montoBs(torneo.precio)}</span>
      </div>

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── SECCIÓN 1: Información del Equipo ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>🏆 Información del Equipo</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* El escudo. Es lo primero que se reconoce en una tabla o en el
                  cuadro; si no suben ninguno se muestra la inicial. */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Escudo</label>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 4, width: 92, height: 92, borderRadius: 14,
                  border: '2px dashed ' + (escudoRuta ? '#22c55e' : subiendoEscudo ? '#f59e0b' : '#2a2a2a'),
                  background: escudoRuta ? 'transparent' : 'rgba(255,255,255,0.02)',
                  cursor: subiendoEscudo ? 'wait' : 'pointer', overflow: 'hidden' }}>
                  {escudoRuta ? (
                    <img src={urlPublica(escudoRuta)} alt="Escudo del equipo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <span style={{ fontSize: '1.6rem' }}>{subiendoEscudo ? '⏳' : '🛡️'}</span>
                      <span style={{ fontSize: '0.66rem', color: '#555', textAlign: 'center', lineHeight: 1.2 }}>
                        {subiendoEscudo ? 'Subiendo' : 'Subir\nescudo'}
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                    disabled={subiendoEscudo}
                    onChange={e => { elegirEscudo(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {escudoRuta && (
                  <button onClick={() => { setEscudoRuta(null); setEscudoNombre('') }}
                    style={{ marginTop: 6, width: 92, padding: '4px', background: 'transparent',
                      border: '1px solid #333', borderRadius: 8, color: '#888', fontSize: '0.68rem',
                      cursor: 'pointer', fontFamily: 'Outfit' }}>
                    Quitar
                  </button>
                )}
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                <label className="form-label">{config.labelEquipo} *</label>
                <input
                  className="input"
                  placeholder={torneo.deporteKey === 'Fútbol' ? 'Ej: Los Cracks FC' : 'Ej: Dúo Imparable'}
                  value={nombreEquipo}
                  onChange={e => setNombreEquipo(e.target.value)}
                  {...pc('nombreEquipo')}
                />
                {mc('nombreEquipo')}
                {errorEscudo && (
                  <p style={{ color: '#ef4444', fontSize: '0.74rem', marginTop: 6 }}>{errorEscudo}</p>
                )}
                <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 6, lineHeight: 1.5 }}>
                  Este torneo admite de {minJugadores} a {maxJugadores} jugadores por equipo.
                  {' '}Llevas {anotados}.
                </p>
              </div>
            </div>
            {!esPareja && (
              <div className="form-group">
                <label className="form-label">Descripción del Equipo (opcional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Describe tu equipo, experiencia, objetivos, etc."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── SECCIÓN 2: Información del Capitán / Contacto ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>
            {esPareja ? '👤 Información del Responsable' : '👤 Información del Capitán'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre Completo *</label>
              <input
                className="input"
                placeholder="Tu nombre completo"
                value={capitan.nombre}
                onChange={e => setCapitan(p => ({ ...p, nombre: e.target.value }))}
                {...pc('capitanNombre')}
              />
              {mc('capitanNombre')}
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono / WhatsApp *</label>
              <input
                className="input"
                placeholder="Ej: 71234567"
                inputMode="tel"
                value={capitan.telefono}
                onChange={e => setCapitan(p => ({ ...p, telefono: e.target.value }))}
                {...pc('capitanTelefono')}
              />
              {mc('capitanTelefono')}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 3: Lista de Jugadores (Titulares) ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ color: '#00BCD4', fontWeight: 700, fontSize: '0.88rem' }}>
                📋 Jugadores ({anotados}/{maxJugadores})
              </p>
              <p style={{ color: '#555', fontSize: '0.74rem', marginTop: 2 }}>
                Anota a todos. Antes de cada partido se marca quiénes vinieron.
              </p>
              <span id="campo-jugadores" tabIndex={-1} />
              {mc('jugadores')}
            </div>
            {jugadores.length < maxJugadores && (
              <button onClick={agregarJugador}
                style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.12)',
                  border: '1px solid rgba(0,188,212,0.35)', borderRadius: 8, color: '#00BCD4',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit',
                  whiteSpace: 'nowrap' }}>
                + Agregar jugador
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {jugadores.map((j, i) => (
              <div key={i}>
                <p style={{ fontSize: '0.78rem', color: '#555', fontWeight: 600, marginBottom: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Jugador {i + 1} {i < minJugadores ? '*' : '(opcional)'}</span>
                  {jugadores.length > 1 && (
                    <button onClick={() => quitarJugador(i)}
                      style={{ background: 'transparent', border: 'none', color: '#555',
                        fontSize: '0.74rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      quitar
                    </button>
                  )}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: gridJugador(config), gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Dorsal *</label>
                    <input
                      className="input"
                      type="number" min="1" max="99"
                      placeholder="10"
                      value={j.dorsal}
                      onChange={e => updateJugador(jugadores, setJugadores, i, 'dorsal', e.target.value)}
                      style={{ textAlign: 'center', fontWeight: 700,
                               borderColor: errorTitular(i) ? '#ef4444' : undefined }}
                      {...pc('dorsal-' + i)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Nombre Completo</label>
                    <input
                      className="input"
                      placeholder="Nombre del jugador"
                      value={j.nombre}
                      onChange={e => updateJugador(jugadores, setJugadores, i, 'nombre', e.target.value)}
                      {...pc('jugador-' + i)}
                    />
                  </div>
                  {config.posiciones.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Posición</label>
                      <select
                        className="input"
                        value={j.posicion}
                        onChange={e => updateJugador(jugadores, setJugadores, i, 'posicion', e.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {config.posiciones.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {mc('dorsal-' + i)}
                {mc('jugador-' + i)}
              </div>
            ))}
          </div>

          {/* Aviso composición */}
          <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(0,188,212,0.05)', border: '1px solid rgba(0,188,212,0.1)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.75rem', color: '#00BCD4' }}>
              Composición: {config.infoComposicion}
            </p>
          </div>
        </div>

        {/* ── SECCIÓN 5: Información Adicional ── */}
        <div style={{ padding: 20, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14 }}>
          <p style={{ color: '#888', fontWeight: 700, fontSize: '0.88rem', marginBottom: 16 }}>📝 Información Adicional</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Experiencia del Equipo</label>
              <select className="input" value={experiencia} onChange={e => setExperiencia(e.target.value)}>
                <option value="">Selecciona el nivel</option>
                <option>Principiantes (primer torneo)</option>
                <option>Intermedio (1-3 torneos)</option>
                <option>Avanzado (más de 3 torneos)</option>
                <option>Competitivo (torneos oficiales)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expectativas</label>
              <select className="input" value={expectativas} onChange={e => setExpectativas(e.target.value)}>
                <option value="">¿Qué esperas del torneo?</option>
                <option>Divertirse y conocer gente</option>
                <option>Ganar experiencia</option>
                <option>Competir para ganar</option>
                <option>Entrenar para torneos mayores</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inscripcion cubierta con puntos.
            Solo en los torneos que organiza el COMPLEJO. Cuando lo organiza un
            cliente, la plata de las inscripciones es suya —con eso paga la
            cancha, el trofeo, los carteles— y no tiene por qué perderla por
            una promoción del complejo en la que no participó. */}
        {torneo.creador_tipo === 'complejo' && torneo.precio > 0 && (
          <div style={{ padding: 16, background: 'rgba(0,188,212,0.05)', border: '1px solid rgba(0,188,212,0.18)', borderRadius: 14 }}>
            {canjeAplicado ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 700 }}>
                    ✓ Inscripción cubierta con tus puntos
                  </p>
                  <p style={{ fontSize: '0.74rem', color: '#666' }}>
                    Código {canjeAplicado.codigo} · no vas a tener que pagar ni subir comprobante
                  </p>
                </div>
                <button onClick={() => { setCanjeAplicado(null); setCodigoCanje('') }}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #333',
                    borderRadius: 8, color: '#888', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Quitar
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.82rem', color: '#00BCD4', fontWeight: 600, marginBottom: 8 }}>
                  ¿Canjeaste una inscripción gratis con tus puntos?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="SPK-XXXXXX" value={codigoCanje}
                    onChange={e => { setCodigoCanje(e.target.value.toUpperCase()); setErrorCodigo(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') aplicarCodigo() }}
                    style={{ flex: 1, letterSpacing: 1 }} />
                  <button onClick={aplicarCodigo} disabled={!codigoCanje.trim() || revisandoCodigo}
                    style={{ padding: '0 18px', borderRadius: 10, cursor: codigoCanje.trim() ? 'pointer' : 'not-allowed',
                      background: codigoCanje.trim() ? 'rgba(0,188,212,0.15)' : '#1a1a1a',
                      border: '1px solid ' + (codigoCanje.trim() ? 'rgba(0,188,212,0.4)' : '#2a2a2a'),
                      color: codigoCanje.trim() ? '#00BCD4' : '#444', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.82rem' }}>
                    {revisandoCodigo ? '...' : 'Aplicar'}
                  </button>
                </div>
                {errorCodigo && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 8, lineHeight: 1.5 }}>{errorCodigo}</p>
                )}
                <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 8, lineHeight: 1.5 }}>
                  Lo consigues canjeando tus puntos en Recompensas. Está en Mis Canjes.
                </p>
              </>
            )}
          </div>
        )}

        {/* BOTON ENVIAR */}
        <AvisoFaltantes faltantes={faltaEnLaInscripcion} error={errorEnvio}
          titulo="Para inscribir el equipo revisa:" />
        <button
          className="btn btn-primary w-full"
          style={{ justifyContent: 'center', padding: '14px', fontSize: '0.95rem',
                   opacity: enviando ? 0.6 : 1 }}
          disabled={enviando}
          onClick={handleSubmit}
        >
          {enviando ? 'Inscribiendo…' : '👥 Inscribir Equipo en ' + torneo.nombre}
        </button>
        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.75rem', marginTop: -10 }}>
          Al inscribir tu equipo, aceptas las reglas del torneo y te comprometes a participar.
        </p>
      </div>
    </Layout>
  )
}
