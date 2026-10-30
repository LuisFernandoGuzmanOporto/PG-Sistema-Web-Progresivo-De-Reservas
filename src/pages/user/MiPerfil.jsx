import { useState } from 'react'
import { digitosDe, esTelefono, tieneNombreYApellido } from '../../lib/validaciones'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import AvisoFaltantes from '../../components/AvisoFaltantes'
import { propsCampo, MensajeCampo, irAlPrimerError } from '../../components/Validacion'
import { calcularTabla } from '../../lib/torneo'
import { USUARIO_ACTUAL, ESTADO_TORNEO, torneosCreadosPor, torneosDondeParticipa,
         miEquipoEn, equiposAprobados, solicitudesPendientes,
         equiposPorGrupo, misReservas, canjesDeCliente, PARTIDOS_ESPONTANEOS,
         FORMAS_DE_GANAR_PUNTOS, canchasDeEmpresa, DEPORTES, pts } from '../../lib/datos'
import { guardarPerfil as guardarPerfilEnBase } from '../../lib/guardar'
import FotoDePerfil from '../../components/FotoDePerfil'
import { EMOJI_DEPORTE } from '../../lib/preferencias'
import { useAuth } from '../../lib/auth'
import { montoBs } from '../../lib/dinero'

// Las reservas del cliente son las mismas filas que ve el complejo:
// si el administrador confirma una, aqui aparece confirmada.
const conDeporte = (r) => {
  const c = canchasDeEmpresa(r.empresa_id).find(x => x.nombre === r.cancha)
  return { ...r, deporte: c?.deporte || '',
           confirmadoPor: r.atendidoPor, fechaConfirmacion: r.estado === 'confirmada' ? r.fecha : null }
}

const RESERVA_ESTADO = {
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  rechazada:  { label: 'Rechazada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  // Pagó cuando ya se le había pasado el tiempo y otra persona tomó la hora
  vencida:    { label: 'Pago fuera de tiempo', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
}

// Mismo estado que el resto de la app, con la etiqueta corta
const ESTADO_BADGE = Object.fromEntries(
  Object.entries(ESTADO_TORNEO).map(([k, v]) => [k, { ...v, label: v.corto }]))

const INSCRIPCION_BADGE = {
  aprobado:  { label: 'Aprobado',  color: '#22c55e' },
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  rechazado: { label: 'Rechazado', color: '#ef4444' },
}



// Todo dato que entra en el HTML del comprobante se escapa: el nombre de la
// cancha o del complejo lo escribe otra persona, y la ventana del comprobante
// comparte el origen de la aplicación (y con él, la sesión).
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default function MiPerfil() {
  const navigate = useNavigate()

  // ── Mi contraseña ──────────────────────────────────────────────────────
  //
  // El cliente no tenia por donde cambiarla: si se la olvidaba, su unica
  // salida era cerrar sesion y usar «olvide mi contraseña» desde el ingreso.
  // El administrador y el super administrador si podian, desde Mi cuenta.
  //
  // El que entro con Google no tiene ninguna todavia: poner una aca le deja
  // entrar de las dos formas, y es su red de seguridad si alguna vez pierde
  // el acceso a esa cuenta de Google.
  const { sesion, cambiarMiClave } = useAuth()
  const entroConGoogle = (sesion?.user?.app_metadata?.provider || 'email') === 'google'
  const tieneClave = (sesion?.user?.identities || [])
    .some(i => i.provider === 'email')

  const [clave, setClave] = useState({ nueva: '', repetir: '' })
  const [guardandoClave, setGuardandoClave] = useState(false)
  const [avisoClave, setAvisoClave] = useState(null)
  const [errorClave, setErrorClave] = useState(null)

  const [intentoClave, setIntentoClave] = useState(false)
  const errClave = {}
  if (!clave.nueva) errClave.claveNueva = 'Escribe la contraseña nueva.'
  else if (clave.nueva.length < 6) errClave.claveNueva = `La contraseña debe tener al menos 6 caracteres (tiene ${clave.nueva.length}).`
  if (!clave.repetir) errClave.claveRepetir = 'Repite la contraseña para confirmarla.'
  else if (clave.nueva !== clave.repetir) errClave.claveRepetir = 'Las contraseñas no coinciden. Escríbelas de nuevo.'
  const ORDEN_CLAVE = ['claveNueva', 'claveRepetir']
  const faltaEnClave = intentoClave
    ? ORDEN_CLAVE.filter(c => errClave[c]).map(c => ({ campo: c, texto: errClave[c] })) : []

  const guardarClave = async () => {
    setAvisoClave(null); setErrorClave(null)
    setIntentoClave(true)
    if (Object.keys(errClave).length) { irAlPrimerError(errClave, ORDEN_CLAVE); return }
    setGuardandoClave(true)
    const r = await cambiarMiClave(clave.nueva)
    setGuardandoClave(false)
    if (r.error) { setErrorClave(r.error); return }
    setClave({ nueva: '', repetir: '' })
    setIntentoClave(false)
    setAvisoClave(tieneClave
      ? 'Contraseña actualizada. Úsala la próxima vez que inicies sesión.'
      : 'Contraseña creada. Ahora también puedes iniciar sesión con tu correo y esta contraseña.')
  }

  const [tab, setTab] = useState('perfil')

  // Se calcula DENTRO del componente, no al cargar el archivo: los datos
  // llegan de Supabase despues de iniciar sesion, y una constante de modulo
  // se quedaria con los valores vacios del arranque.
  // Torneos derivados de la fuente unica: el conteo de equipos, la posicion en la
  // tabla y el proximo partido se calculan, no se escriben a mano.
  const MIS_TORNEOS_CREADOS = torneosCreadosPor().map(t => ({
    ...t,
    equiposAprobados: equiposAprobados(t).length,
    pendientes: solicitudesPendientes(t).length,
  }))

  const MIS_TORNEOS_INSCRITO = torneosDondeParticipa().map(t => {
    const eq = miEquipoEn(t)
    // En torneos por grupos la posicion es dentro de SU grupo, no del torneo entero
    const porGrupo = equiposPorGrupo(t)
    const miGrupo  = porGrupo && Object.values(porGrupo).find(g => g.some(e => e.id === eq.id))
    const rivales  = miGrupo || equiposAprobados(t)
    const fila = calcularTabla(rivales, t.partidos, t.deporteKey).find(f => f.id === eq.id)
    const prox = (t.partidos || []).find(p =>
      p.estado === 'programado' && (p.equipo1_id === eq.id || p.equipo2_id === eq.id))
    return {
      ...t,
      miEquipo: eq.nombre,
      estadoInscripcion: eq.estado,
      posicion: t.estado === 'en_curso' && fila ? fila.pos : null,
      proximoPartido: prox
        ? { rival: prox.equipo1_id === eq.id ? prox.equipo2 : prox.equipo1, hora: prox.hora, cancha: prox.cancha }
        : null,
    }
  })

  // Un torneo que ademas organizo no se cuenta dos veces
  const TORNEOS_DISTINTOS = new Set(
    [...MIS_TORNEOS_CREADOS, ...MIS_TORNEOS_INSCRITO].map(t => t.id)).size


  const puntos = USUARIO_ACTUAL.puntos
  const [comprobante, setComprobante] = useState(null) // reserva a mostrar en modal

  // Editar perfil: datos del usuario y validacion antes de guardar
  const [datos, setDatos]     = useState({ nombre: USUARIO_ACTUAL.nombre, email: USUARIO_ACTUAL.email,
                                           telefono: USUARIO_ACTUAL.telefono, deporteFav: USUARIO_ACTUAL.deporteFav || '' })
  const [editando, setEdit]   = useState(false)
  const [borrador, setBorr]   = useState(datos)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso]     = useState(null)

  const abrirEdicion = () => { setBorr(datos); setErrores({}); setEdit(true) }

  const validarPerfil = () => {
    const e = {}
    const digitos = digitosDe(borrador.telefono)
    if (!borrador.nombre.trim()) e.nombre = 'Escribe tu nombre completo.'
    else if (!tieneNombreYApellido(borrador.nombre)) e.nombre = 'Falta el apellido: escribe nombre y apellido.'
    if (borrador.telefono.trim() && /[^0-9\s-]/.test(borrador.telefono)) e.telefono = 'El teléfono solo puede tener números, espacios o guiones.'
    else if (borrador.telefono.trim() && !esTelefono(borrador.telefono))
      e.telefono = `El teléfono debe tener 7 u 8 dígitos (tiene ${digitos.length}).`
    return e
  }

  const guardarPerfil = async () => {
    const e = validarPerfil()
    setErrores(e)
    if (Object.keys(e).length > 0) { irAlPrimerError(e, ['nombre', 'telefono']); return }

    const limpio = { nombre: borrador.nombre.trim(), email: borrador.email.trim(), telefono: borrador.telefono.trim(),
                     deporteFav: borrador.deporteFav || '' }

    // El correo no se toca: es con lo que se inicia sesion, y cambiarlo exige
    // confirmar la direccion nueva. Por eso van el nombre, el telefono y el
    // deporte favorito.
    const g = await guardarPerfilEnBase({ nombre: limpio.nombre, telefono: limpio.telefono,
                                          deporteFav: limpio.deporteFav })
    if (g.error) {
      setErrores({ general: g.error })
      return
    }

    setDatos({ ...limpio, email: datos.email })
    Object.assign(USUARIO_ACTUAL, { nombre: limpio.nombre, telefono: limpio.telefono,
                                    deporteFav: limpio.deporteFav || null })
    setEdit(false)
    setAviso('Tus datos quedaron actualizados.')
    setTimeout(() => setAviso(null), 3000)
  }

  const usuario = datos

  // Reservas y canjes reales de este cliente
  const MIS_RESERVAS = misReservas().map(conDeporte)
  const MIS_CANJES   = canjesDeCliente()

  // Los partidos abiertos se apuntan por nombre, igual que en la pantalla de
  // Partidos: ahi es asi como se sabe si uno ya esta anotado.
  const MIS_PARTIDOS = PARTIDOS_ESPONTANEOS
    .filter(p => (p.jugadoresUnidos || []).includes(USUARIO_ACTUAL.nombre)).length


  // La actividad sale de lo que el usuario hizo, no de una lista escrita a
  // mano: antes todos veian las mismas cuatro lineas inventadas.
  const MI_ACTIVIDAD = [
    ...MIS_RESERVAS.map(r => ({
      icon: '📅',
      texto: 'Reservaste ' + r.cancha + (r.empresa ? ' en ' + r.empresa : ''),
      tiempo: r.fecha,
    })),
    ...MIS_TORNEOS_INSCRITO.map(t => ({
      icon: '🏆', texto: 'Te inscribiste en ' + t.nombre, tiempo: t.fechaInicio || '',
    })),
    ...MIS_TORNEOS_CREADOS.map(t => ({
      icon: '🏆', texto: 'Creaste el torneo ' + t.nombre, tiempo: t.fechaInicio || '',
    })),
    ...MIS_CANJES.map(c => ({
      icon: '🎁', texto: 'Canjeaste ' + (c.recompensa || 'una recompensa'), tiempo: c.fecha || '',
    })),
  ].slice(0, 8)

  const descargarComprobante = (r) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Comprobante ${esc(r.nro)} — Sportika</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', 'Segoe UI', sans-serif;
      background: #fff;
      color: #111;
      padding: 48px;
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Cabecera ── */
    .header {
      background: #8B0000;
      border-radius: 12px 12px 0 0;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 2px; }
    .logo span { color: #00BCD4; }
    .logo-sub { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; }
    .badge-confirmada {
      background: rgba(34,197,94,0.2);
      border: 1px solid rgba(34,197,94,0.5);
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #22c55e;
    }

    /* ── Cuerpo ── */
    .body {
      border: 1px solid #e5e5e5;
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 28px;
    }

    /* N° reserva */
    .nro-box {
      background: #f8f8f8;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 22px;
    }
    .nro-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 4px; }
    .nro-value { font-size: 20px; font-weight: 700; color: #8B0000; letter-spacing: 2px; }

    /* Secciones */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
      color: #999; font-weight: 700; margin-bottom: 10px;
      padding-bottom: 6px; border-bottom: 1px solid #f0f0f0;
    }
    .row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13.5px; padding: 5px 0;
    }
    .row-label { color: #777; }
    .row-value { font-weight: 600; color: #111; text-align: right; }

    /* Monto */
    .monto-box {
      background: #fffbf0;
      border: 1px solid #f3d08a;
      border-radius: 8px;
      padding: 16px 18px;
      display: flex; justify-content: space-between; align-items: center;
      margin: 20px 0;
    }
    .monto-label { font-size: 13px; color: #999; }
    .monto-value { font-size: 26px; font-weight: 700; color: #b45309; }

    /* Footer */
    .footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 10px;
    }
    .confirmado-label { font-size: 10px; color: #aaa; margin-bottom: 2px; }
    .confirmado-value { font-size: 12px; color: #777; }
    .footer-nota {
      font-size: 10px; color: #bbb; text-align: right; max-width: 200px; line-height: 1.5;
    }

    /* Pie de página */
    .pie {
      margin-top: 32px;
      text-align: center;
      font-size: 10px;
      color: #ccc;
      letter-spacing: 0.03em;
    }

    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>

  <!-- Cabecera -->
  <div class="header">
    <div>
      <div class="logo">SPORT<span>IKA</span></div>
      <div class="logo-sub">Plataforma Deportiva — Cochabamba</div>
    </div>
    <div class="badge-confirmada">✓ Confirmada</div>
  </div>

  <!-- Cuerpo -->
  <div class="body">

    <!-- N° Reserva -->
    <div class="nro-box">
      <div class="nro-label">N° de Reserva</div>
      <div class="nro-value">${esc(r.nro)}</div>
    </div>

    <!-- Datos del usuario -->
    <div class="section">
      <div class="section-title">Datos del Usuario</div>
      <div class="row">
        <span class="row-label">Nombre</span>
        <span class="row-value">${esc(usuario.nombre)}</span>
      </div>
      <div class="row">
        <span class="row-label">Email</span>
        <span class="row-value">${esc(usuario.email)}</span>
      </div>
    </div>

    <!-- Detalle de la reserva -->
    <div class="section">
      <div class="section-title">Detalle de la Reserva</div>
      <div class="row">
        <span class="row-label">Empresa</span>
        <span class="row-value">${esc(r.empresa)}</span>
      </div>
      <div class="row">
        <span class="row-label">Cancha</span>
        <span class="row-value">${esc(r.cancha)}</span>
      </div>
      <div class="row">
        <span class="row-label">Deporte</span>
        <span class="row-value">${esc(r.deporte)}</span>
      </div>
      <div class="row">
        <span class="row-label">Fecha</span>
        <span class="row-value">${esc(r.fecha)}</span>
      </div>
      <div class="row">
        <span class="row-label">Horario</span>
        <span class="row-value">${esc(r.horaInicio)} – ${esc(r.horaFin)}</span>
      </div>
    </div>

    <!-- Monto -->
    <div class="monto-box">
      <span class="monto-label">Monto pagado</span>
      <span class="monto-value">Bs. ${esc(montoBs(r.monto))}</span>
    </div>

    <!-- Footer del comprobante -->
    <div class="footer">
      <div>
        <div class="confirmado-label">Confirmado por</div>
        <div class="confirmado-value">${esc(r.confirmadoPor)} &nbsp;·&nbsp; ${esc(r.fechaConfirmacion)}</div>
      </div>
      <div class="footer-nota">
        Este documento es un comprobante digital generado por la plataforma Sportika.
      </div>
    </div>

  </div>

  <!-- Pie -->
  <div class="pie">sportika.bo &nbsp;·&nbsp; Cochabamba, Bolivia &nbsp;·&nbsp; ${new Date().getFullYear()}</div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

    const ventana = window.open('', '_blank', 'width=700,height=900')
    ventana.document.write(html)
    ventana.document.close()
  }

  return (
    <Layout role="user">
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 20 }}>Mi Perfil</h1>

      {/* Tabs */}
      <div className="barra-pestanas" style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 24 }}>
        {[
          { key: 'perfil',        label: 'Perfil' },
          { key: 'reservas',      label: 'Mis Reservas (' + MIS_RESERVAS.length + ')' },
          { key: 'torneos',       label: 'Mis Torneos (' + TORNEOS_DISTINTOS + ')' },
          { key: 'puntos',        label: 'Puntos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 24px', background: tab === t.key ? '#8B0000' : 'transparent',
            color: tab === t.key ? '#fff' : '#666', border: 'none',
            borderBottom: tab === t.key ? '2px solid #8B0000' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.88rem',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>✓ {aviso}</p>
        </div>
      )}

      {/* ══ TAB: PERFIL ══ */}
      {tab === 'perfil' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <FotoDePerfil tam={84} />
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 4 }}>{usuario.nombre}</h2>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>{usuario.email}</p>
            <span className="badge badge-success" style={{ marginBottom: 20 }}>Cliente Activo</span>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, color: '#f59e0b', fontWeight: 700 }}>
              {puntos} puntos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Reservas', value: MIS_RESERVAS.length },
                { label: 'Torneos',  value: TORNEOS_DISTINTOS   },
                { label: 'Partidos', value: MIS_PARTIDOS        },
                { label: 'Canjes',   value: MIS_CANJES.length   },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f5f5f5' }}>{s.value}</p>
                  <p style={{ fontSize: '0.72rem', color: '#555' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-outline w-full" style={{ justifyContent: 'center', marginTop: 20 }} onClick={abrirEdicion}>
              Editar Perfil
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>Información Personal</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Nombre completo', value: usuario.nombre },
                  { label: 'Email', value: usuario.email },
                  { label: 'Teléfono', value: usuario.telefono || 'Sin cargar' },
                  { label: 'Deporte favorito', value: usuario.deporteFav
                      ? (EMOJI_DEPORTE[usuario.deporteFav] || '') + ' ' + usuario.deporteFav
                      : 'Todavía no lo elegiste' },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: '0.88rem', color: '#bbb' }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mi contraseña */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 4 }}>
                {tieneClave ? 'Mi contraseña' : 'Pon una contraseña'}
              </h3>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.6 }}>
                {tieneClave
                  ? 'Puedes cambiarla cuando quieras; no necesitas la contraseña anterior.'
                  : 'Iniciaste sesión con Google, así que aún no tienes contraseña. Si creas una, podrás entrar de las dos formas.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Contraseña nueva</label>
                  <input className="input" type="password" autoComplete="new-password" value={clave.nueva} placeholder="Mínimo 6 caracteres"
                    onChange={e => { setClave(c => ({ ...c, nueva: e.target.value })); setAvisoClave(null) }}
                    {...propsCampo('claveNueva', errClave.claveNueva, intentoClave)} />
                  <MensajeCampo nombre="claveNueva" error={errClave.claveNueva} mostrar={intentoClave} />
                </div>
                <div className="form-group">
                  <label className="form-label">Repítela</label>
                  <input className="input" type="password" autoComplete="new-password" value={clave.repetir} placeholder="Repite la contraseña"
                    onChange={e => { setClave(c => ({ ...c, repetir: e.target.value })); setAvisoClave(null) }}
                    {...propsCampo('claveRepetir', errClave.claveRepetir, intentoClave)} />
                  <MensajeCampo nombre="claveRepetir" error={errClave.claveRepetir} mostrar={intentoClave} />
                </div>
              </div>

              {avisoClave && (
                <p style={{ color: '#22c55e', fontSize: '0.82rem', marginBottom: 10 }}>{'\u2713 '}{avisoClave}</p>
              )}
              <AvisoFaltantes faltantes={faltaEnClave} error={errorClave} />

              <button className="btn btn-outline" style={{ justifyContent: 'center' }}
                disabled={guardandoClave}
                onClick={guardarClave}>
                {guardandoClave ? 'Guardando…' : tieneClave ? 'Cambiar la contraseña' : 'Guardar la contraseña'}
              </button>

              {entroConGoogle && tieneClave && (
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 10, lineHeight: 1.5 }}>
                  Sigues pudiendo entrar con Google igual: esto es una segunda forma, no la reemplaza.
                </p>
              )}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 14 }}>Historial de Actividad</h3>
              {MI_ACTIVIDAD.length === 0 && (
                <p style={{ color: '#666', fontSize: '0.82rem' }}>
                  Todavía no hay nada por aquí. Cuando reserves una cancha o te sumes
                  a un torneo, lo vas a ver aquí.
                </p>
              )}
              {MI_ACTIVIDAD.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{a.texto}</p>
                    <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{a.tiempo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: MIS RESERVAS ══ */}
      {tab === 'reservas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 6 }}>
            Mis Reservas ({MIS_RESERVAS.length})
          </h3>
          {MIS_RESERVAS.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 140 }}>
              <p style={{ color: '#555' }}>No tienes reservas registradas</p>
            </div>
          ) : (
            MIS_RESERVAS.map(r => {
              const badge = RESERVA_ESTADO[r.estado]
              return (
                <div key={r.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{r.cancha}</p>
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Empresa</p>
                          <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{r.empresa}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Fecha</p>
                          <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{r.fecha}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Horario</p>
                          <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{r.horaInicio} – {r.horaFin}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Deporte</p>
                          <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{r.deporte}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Monto</p>
                          <p style={{ fontSize: '0.88rem', color: '#f59e0b', fontWeight: 700 }}>Bs. {montoBs(r.monto)}</p>
                          {/* Que se vea que el precio bajo por el canje y no
                              por un error del complejo */}
                          {r.codigoDescuento && (
                            <p style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: 2 }}>
                              con tu canje {r.codigoDescuento}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* El comprobante no se perdió: es la prueba para el reclamo */}
                      {r.estado === 'vencida' && (
                        <p style={{ fontSize: '0.78rem', color: '#a855f7', lineHeight: 1.5, marginTop: 12,
                          padding: '10px 12px', background: 'rgba(168,85,247,0.08)',
                          border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }}>
                          Se terminó tu tiempo para pagar y otra persona tomó esta hora. Tu comprobante
                          quedó guardado y el complejo ya lo tiene: se comunicará contigo para devolverte
                          el dinero o darte otra hora.
                        </p>
                      )}
                    </div>
                    {r.estado === 'confirmada' && (
                      <button
                        onClick={() => setComprobante(r)}
                        style={{
                          padding: '7px 14px', background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8,
                          color: '#22c55e', fontSize: '0.78rem', cursor: 'pointer',
                          fontFamily: 'Outfit', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                        📄 Ver Comprobante
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══ TAB: TORNEOS ══ */}
      {tab === 'torneos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Torneos que cree */}
          <div>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 14 }}>
              Torneos que cree ({MIS_TORNEOS_CREADOS.length})
            </h3>
            {MIS_TORNEOS_CREADOS.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <p style={{ color: '#555' }}>No has creado torneos aun</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MIS_TORNEOS_CREADOS.map(t => {
                  const badge = ESTADO_BADGE[t.estado]
                  return (
                    <div key={t.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{t.nombre}</p>
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          {t.pendientes > 0 && (
                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                              {t.pendientes} pendiente{t.pendientes > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#666' }}>
                          {t.empresa} • {t.equiposAprobados}/{t.maxEquipos} equipos • Inicio: {t.fechaInicio}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate('/app/torneos/' + t.id)}
                          style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.25)', borderRadius: 8, color: '#00BCD4', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          Ver
                        </button>
                        <button onClick={() => navigate('/app/torneos/' + t.id)}
                          style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, color: '#f59e0b', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          Administrar
                        </button>
                        {t.estado === 'en_curso' && (
                          <button onClick={() => navigate('/app/torneos/' + t.id + '/mesa')}
                            style={{ padding: '7px 14px', background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.35)', borderRadius: 8, color: '#ff6b6b', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                            Mesa Técnica
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Torneos donde estoy inscrito */}
          <div>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 14 }}>
              Torneos donde estoy inscrito ({MIS_TORNEOS_INSCRITO.length})
            </h3>
            {MIS_TORNEOS_INSCRITO.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <p style={{ color: '#555' }}>No estas inscrito en ningun torneo</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MIS_TORNEOS_INSCRITO.map(t => {
                  const estadoBadge = ESTADO_BADGE[t.estado]
                  const inscBadge = INSCRIPCION_BADGE[t.estadoInscripcion]
                  return (
                    <div key={t.id} className="card" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem' }}>{t.nombre}</p>
                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: estadoBadge.bg, color: estadoBadge.color }}>{estadoBadge.label}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#666' }}>
                            {t.empresa} • Mi equipo: <strong style={{ color: '#bbb' }}>{t.miEquipo}</strong>
                          </p>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: inscBadge.color, background: inscBadge.color + '18' }}>
                          {inscBadge.label}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
                        {t.posicion !== null && (
                          <div style={{ padding: '10px 14px', background: t.posicion <= 2 ? 'rgba(34,197,94,0.08)' : '#1a1a1a', border: '1px solid ' + (t.posicion <= 2 ? 'rgba(34,197,94,0.2)' : '#2a2a2a'), borderRadius: 10 }}>
                            <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Posición</p>
                            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: t.posicion <= 2 ? '#22c55e' : '#f5f5f5', lineHeight: 1 }}>
                              #{t.posicion}
                            </p>
                          </div>
                        )}
                        {t.proximoPartido && (
                          <div style={{ padding: '10px 14px', background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.2)', borderRadius: 10 }}>
                            <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Próximo Partido</p>
                            <p style={{ fontSize: '0.82rem', color: '#f5f5f5', fontWeight: 600 }}>vs {t.proximoPartido.rival}</p>
                            <p style={{ fontSize: '0.72rem', color: '#888', marginTop: 2 }}>{t.proximoPartido.hora} - {t.proximoPartido.cancha}</p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate('/app/torneos/' + t.id)}
                          style={{ padding: '7px 14px', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.25)', borderRadius: 8, color: '#00BCD4', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                          Ver Torneo
                        </button>
                        {t.estado === 'en_curso' && (
                          <button onClick={() => navigate('/app/torneos/' + t.id + '/en-vivo')}
                            style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                            En Vivo
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: PUNTOS ══ */}
      {tab === 'puntos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Banner principal de puntos */}
          <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.25) 0%, rgba(245,158,11,0.1) 100%)', border: '1px solid rgba(139,0,0,0.3)', borderRadius: 14, padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 4 }}>Tus puntos totales</p>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', color: '#f59e0b', lineHeight: 1 }}>{pts(puntos)}</p>
              <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 6 }}>
                Nivel: <span style={{ color: '#22c55e', fontWeight: 700 }}>{puntos >= 251 ? 'Experto' : puntos >= 101 ? 'Intermedio' : 'Principiante'}</span>
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 2 }}>Próximo nivel</p>
                <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9rem' }}>
                  {puntos >= 251 ? '¡Nivel máximo!' : puntos >= 101 ? 'Experto' : 'Intermedio'}
                </p>
                {puntos < 251 && (
                  <p style={{ color: '#555', fontSize: '0.72rem' }}>
                    Necesitas {pts(puntos >= 101 ? 251 - puntos : 101 - puntos)} más
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/app/recompensas')}
                style={{ padding: '10px 20px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, color: '#f59e0b', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}
              >
                ⭐ Canjear recompensas →
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#555', marginBottom: 6 }}>
              <span>0 pts</span>
              <span style={{ color: puntos >= 101 ? '#00BCD4' : '#555' }}>101 pts — Intermedio</span>
              <span style={{ color: puntos >= 251 ? '#f59e0b' : '#555' }}>251 pts — Experto</span>
            </div>
            <div style={{ height: 8, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min((puntos / 251) * 100, 100) + '%', background: 'linear-gradient(90deg,#8B0000,#f59e0b)', borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* Cómo gané mis puntos */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>Cómo gané mis puntos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icono: '📅', categoria: 'Reservas completadas', pts: 5 * 6, cantidad: 6, color: '#00BCD4' },
                { icono: '⚽', categoria: 'Partidos jugados',      pts: 10 * 2, cantidad: 2, color: '#22c55e' },
                { icono: '🏆', categoria: 'Torneos',               pts: 15 * 1, cantidad: 1, color: '#f59e0b' },
              ].map((c, i) => {
                const total = 5 * 6 + 10 * 2 + 15
                const pct = Math.round((c.pts / total) * 100)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem', minWidth: 28 }}>{c.icono}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: '0.82rem', color: '#bbb' }}>
                          {c.categoria}
                          <span style={{ color: '#555', marginLeft: 6, fontSize: '0.72rem' }}>({c.cantidad} {c.cantidad === 1 ? 'vez' : 'veces'})</span>
                        </p>
                        <p style={{ fontSize: '0.82rem', color: c.color, fontWeight: 700 }}>+{pts(c.pts)}</p>
                      </div>
                      <div style={{ height: 5, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: c.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Acceso directo a recompensas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { icon: '🎁', label: 'Ver catálogo',    sub: 'Recompensas disponibles', path: '/app/recompensas', color: '#22c55e' },
              { icon: '🎟️', label: 'Mis canjes',      sub: 'Códigos generados',       path: '/app/recompensas', color: '#00BCD4' },
              { icon: '📋', label: 'Historial',       sub: 'Movimientos de puntos',   path: '/app/recompensas', color: '#f59e0b' },
            ].map((item, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: '18px 16px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s' }}
                onClick={() => navigate(item.path)}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color + '55'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{item.icon}</div>
                <p style={{ color: item.color, fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{item.label}</p>
                <p style={{ color: '#555', fontSize: '0.72rem' }}>{item.sub}</p>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ══ MODAL: COMPROBANTE DIGITAL DE RESERVA ══════════════════════ */}
      {comprobante && (
        <div className="modal-overlay" onClick={() => setComprobante(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, padding: 0, overflow: 'hidden' }}>

            {/* Cabecera roja */}
            <div style={{ background: '#8B0000', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                  SPORT<span style={{ color: '#00BCD4' }}>IKA</span>
                </p>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#fff', letterSpacing: 1 }}>
                  Comprobante de Reserva
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                  ✅ Confirmada
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onClick={() => setComprobante(null)}
                >✕</button>
              </div>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* N° de reserva */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>N° de Reserva</p>
                <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#00BCD4', letterSpacing: 2 }}>{comprobante.nro}</p>
              </div>

              {/* Datos usuario */}
              <div style={{ borderTop: '1px solid #222', paddingTop: 14 }}>
                <p style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700 }}>Datos del Usuario</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: '👤 Nombre', value: usuario.nombre },
                    { label: '✉️ Email',  value: usuario.email  },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                      <span style={{ color: '#666' }}>{f.label}</span>
                      <span style={{ color: '#ccc', fontWeight: 600 }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detalle reserva */}
              <div style={{ borderTop: '1px solid #222', paddingTop: 14 }}>
                <p style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700 }}>Detalle de la Reserva</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { label: '🏢 Empresa',  value: comprobante.empresa },
                    { label: '🏟️ Cancha',   value: comprobante.cancha  },
                    { label: '⚽ Deporte',  value: comprobante.deporte },
                    { label: '📅 Fecha',    value: comprobante.fecha   },
                    { label: '🕐 Horario',  value: `${comprobante.horaInicio} – ${comprobante.horaFin}` },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                      <span style={{ color: '#666' }}>{f.label}</span>
                      <span style={{ color: '#ccc', fontWeight: 600 }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monto */}
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#888' }}>Monto pagado</span>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#f59e0b' }}>Bs. {montoBs(comprobante.monto)}</span>
              </div>

              {/* Confirmado por */}
              <div style={{ borderTop: '1px solid #222', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={{ fontSize: '0.68rem', color: '#555', marginBottom: 2 }}>Confirmado por</p>
                  <p style={{ fontSize: '0.8rem', color: '#888' }}>
                    {comprobante.confirmadoPor} · {comprobante.fechaConfirmacion}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                  onClick={() => descargarComprobante(comprobante)}
                >
                  ⬇️ Descargar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* Modal: editar los datos del perfil */}
      {editando && (
        <div className="modal-overlay" onClick={() => setEdit(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Editar perfil</h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Estos datos los ve el complejo cuando reservas</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre completo *</label>
              <input className="input" value={borrador.nombre}
                onChange={e => { setBorr(b => ({ ...b, nombre: e.target.value })); setErrores(x => ({ ...x, nombre: null })) }}
                {...propsCampo('nombre', errores.nombre)} />
              <MensajeCampo nombre="nombre" error={errores.nombre} />
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input className="input" type="email" value={borrador.email} disabled
                style={{ opacity: 0.55, cursor: 'not-allowed' }} />
              <p style={{ color: '#666', fontSize: '0.72rem', marginTop: 4 }}>
                Es con lo que inicias sesión. Para cambiarlo hay que confirmar la dirección nueva.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="input" inputMode="tel" value={borrador.telefono} placeholder="Ej: 70012345"
                onChange={e => { setBorr(b => ({ ...b, telefono: e.target.value })); setErrores(x => ({ ...x, telefono: null })) }}
                {...propsCampo('telefono', errores.telefono)} />
              <MensajeCampo nombre="telefono" error={errores.telefono} />
            </div>

            {/* Con esto la aplicación le muestra primero lo de su deporte */}
            <div className="form-group">
              <label className="form-label">Deporte favorito</label>
              <select className="input" value={borrador.deporteFav || ''}
                onChange={e => setBorr(b => ({ ...b, deporteFav: e.target.value }))}>
                <option value="">Todavía no lo elijo</option>
                {DEPORTES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <p style={{ color: '#666', fontSize: '0.72rem', marginTop: 4 }}>
                Te mostramos primero los complejos, partidos y torneos de ese deporte.
              </p>
            </div>

            <AvisoFaltantes
              faltantes={['nombre', 'telefono'].filter(c => errores[c]).map(c => ({ campo: c, texto: errores[c] }))}
              error={errores.general} />

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-outline w-full" style={{ justifyContent: 'center' }} onClick={() => setEdit(false)}>Cancelar</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={guardarPerfil}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
