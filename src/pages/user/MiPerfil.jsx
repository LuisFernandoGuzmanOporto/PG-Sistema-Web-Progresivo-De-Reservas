import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

// ── Mock data: Reservas ───────────────────────────────────────────────────
const MIS_RESERVAS = [
  {
    id: 1, nro: 'RSV-2026-00142',
    empresa: 'Sport Center', cancha: 'Cancha de Futbol Principal',
    deporte: 'Futbol', fecha: '28 May 2026', horaInicio: '15:00', horaFin: '16:00',
    monto: 80, estado: 'confirmada',
    confirmadoPor: 'Admin Sport Center', fechaConfirmacion: '27 May 2026',
  },
  {
    id: 2, nro: 'RSV-2026-00138',
    empresa: 'Gimnasio Central', cancha: 'Cancha de Padel 1',
    deporte: 'Padel', fecha: '22 May 2026', horaInicio: '10:00', horaFin: '11:00',
    monto: 60, estado: 'confirmada',
    confirmadoPor: 'Admin Gimnasio Central', fechaConfirmacion: '21 May 2026',
  },
  {
    id: 3, nro: 'RSV-2026-00155',
    empresa: 'Sport Center', cancha: 'Cancha de Futbol B',
    deporte: 'Futbol', fecha: '30 May 2026', horaInicio: '18:00', horaFin: '19:00',
    monto: 80, estado: 'pendiente',
    confirmadoPor: null, fechaConfirmacion: null,
  },
  {
    id: 4, nro: 'RSV-2026-00121',
    empresa: 'Tennis Club Cochabamba', cancha: 'Cancha de Tenis 2',
    deporte: 'Tenis', fecha: '10 May 2026', horaInicio: '08:00', horaFin: '09:00',
    monto: 70, estado: 'rechazada',
    confirmadoPor: null, fechaConfirmacion: null,
  },
]


// ── Mock data: Entrenamientos ─────────────────────────────────────────────
const MIS_ENTRENAMIENTOS = [
  {
    id: 1, nombre: 'Futbol Adultos — Nivel Intermedio', empresa: 'Sport Center',
    entrenador: 'Prof. Carlos Mendoza', dias: 'Lun / Mie / Vie',
    horario: '07:00 – 08:30', precio: 250,
    estadoPago: 'confirmado', polera: 'Talla M',
  },
  {
    id: 2, nombre: 'Padel Iniciantes', empresa: 'Gimnasio Central',
    entrenador: 'Prof. Ana Rios', dias: 'Mar / Jue',
    horario: '18:00 – 19:30', precio: 180,
    estadoPago: 'pendiente', polera: 'Sin polera',
  },
]

const RESERVA_ESTADO = {
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  rechazada:  { label: 'Rechazada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
}

const PAGO_ESTADO = {
  confirmado: { label: 'Pago Confirmado', color: '#22c55e' },
  pendiente:  { label: 'Pago Pendiente',  color: '#f59e0b' },
}

const MIS_TORNEOS_CREADOS = [
  {
    id: 1, nombre: 'Copa Sportika Futbol 2025', deporte: 'Futbol', empresa: 'Sport Center',
    estado: 'en_curso', equiposAprobados: 8, maxEquipos: 16, pendientes: 2, fechaInicio: '14 Feb',
  },
]

const MIS_TORNEOS_INSCRITO = [
  {
    id: 2, nombre: 'Liga de Baloncesto Sportika', deporte: 'Basquetbol', empresa: 'Gimnasio Central',
    estado: 'inscripciones', miEquipo: 'Los Bulldogs', estadoInscripcion: 'aprobado',
    posicion: null, proximoPartido: null, fechaInicio: '28 Feb',
  },
  {
    id: 1, nombre: 'Copa Sportika Futbol 2025', deporte: 'Futbol', empresa: 'Sport Center',
    estado: 'en_curso', miEquipo: 'Los Cracks FC', estadoInscripcion: 'aprobado',
    posicion: 1, proximoPartido: { rival: 'Deportivo Norte', hora: '15:00', cancha: 'Cancha Principal' },
    fechaInicio: '14 Feb',
  },
]

const ESTADO_BADGE = {
  inscripciones: { label: 'Inscripciones', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  en_curso:      { label: 'En Curso',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  finalizado:    { label: 'Finalizado',     color: '#666',    bg: 'rgba(100,100,100,0.12)'},
}

const INSCRIPCION_BADGE = {
  aprobado:  { label: 'Aprobado',  color: '#22c55e' },
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  rechazado: { label: 'Rechazado', color: '#ef4444' },
}



export default function MiPerfil() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('perfil')

  const puntos = 75
  const [comprobante, setComprobante] = useState(null) // reserva a mostrar en modal

  const usuario = { nombre: 'Juan Garcia', email: 'juan@email.com' }

  const descargarComprobante = (r) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Comprobante ${r.nro} — Sportika</title>
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
      <div class="nro-value">${r.nro}</div>
    </div>

    <!-- Datos del usuario -->
    <div class="section">
      <div class="section-title">Datos del Usuario</div>
      <div class="row">
        <span class="row-label">Nombre</span>
        <span class="row-value">${usuario.nombre}</span>
      </div>
      <div class="row">
        <span class="row-label">Email</span>
        <span class="row-value">${usuario.email}</span>
      </div>
    </div>

    <!-- Detalle de la reserva -->
    <div class="section">
      <div class="section-title">Detalle de la Reserva</div>
      <div class="row">
        <span class="row-label">Empresa</span>
        <span class="row-value">${r.empresa}</span>
      </div>
      <div class="row">
        <span class="row-label">Cancha</span>
        <span class="row-value">${r.cancha}</span>
      </div>
      <div class="row">
        <span class="row-label">Deporte</span>
        <span class="row-value">${r.deporte}</span>
      </div>
      <div class="row">
        <span class="row-label">Fecha</span>
        <span class="row-value">${r.fecha}</span>
      </div>
      <div class="row">
        <span class="row-label">Horario</span>
        <span class="row-value">${r.horaInicio} – ${r.horaFin}</span>
      </div>
    </div>

    <!-- Monto -->
    <div class="monto-box">
      <span class="monto-label">Monto pagado</span>
      <span class="monto-value">Bs. ${r.monto}</span>
    </div>

    <!-- Footer del comprobante -->
    <div class="footer">
      <div>
        <div class="confirmado-label">Confirmado por</div>
        <div class="confirmado-value">${r.confirmadoPor} &nbsp;·&nbsp; ${r.fechaConfirmacion}</div>
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
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 24 }}>
        {[
          { key: 'perfil',        label: 'Perfil' },
          { key: 'reservas',      label: 'Mis Reservas (' + MIS_RESERVAS.length + ')' },
          { key: 'entrenamientos',label: 'Mis Entrenamientos (' + MIS_ENTRENAMIENTOS.length + ')' },
          { key: 'torneos',       label: 'Mis Torneos (' + (MIS_TORNEOS_CREADOS.length + MIS_TORNEOS_INSCRITO.length) + ')' },
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

      {/* ══ TAB: PERFIL ══ */}
      {tab === 'perfil' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>JG</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#f5f5f5', marginBottom: 4 }}>Juan Garcia</h2>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>juan@email.com</p>
            <span className="badge badge-success" style={{ marginBottom: 20 }}>Cliente Activo</span>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, color: '#f59e0b', fontWeight: 700 }}>
              75 puntos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Reservas', value: '12' },
                { label: 'Torneos', value: '3'  },
                { label: 'Partidos', value: '8'  },
                { label: 'Goles',   value: '5'  },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f5f5f5' }}>{s.value}</p>
                  <p style={{ fontSize: '0.72rem', color: '#555' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-outline w-full" style={{ justifyContent: 'center', marginTop: 20 }}>
              Editar Perfil
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 16 }}>Informacion Personal</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Nombre completo', value: 'Juan Garcia' },
                  { label: 'Email', value: 'juan@email.com' },
                  { label: 'Telefono', value: '+591 70000000' },
                  { label: 'Ciudad', value: 'Cochabamba, Bolivia' },
                  { label: 'Deporte favorito', value: 'Futbol' },
                  { label: 'Miembro desde', value: 'Enero 2025' },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: '0.88rem', color: '#bbb' }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 14 }}>Historial de Actividad</h3>
              {[
                { icon: '📅', texto: 'Reservaste Cancha de Futbol Principal en Sport Center', tiempo: 'Hace 2 dias' },
                { icon: '🏆', texto: 'Te inscribiste en Copa Sportika Futbol 2025', tiempo: 'Hace 5 dias' },
                { icon: '🏋️', texto: 'Te inscribiste a Padel Iniciantes en Gimnasio Central', tiempo: 'Hace 1 semana' },
                { icon: '⚽', texto: 'Participaste en partido espontaneo en Sport Center', tiempo: 'Hace 1 semana' },
              ].map((a, i) => (
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
                          <p style={{ fontSize: '0.88rem', color: '#f59e0b', fontWeight: 700 }}>Bs {r.monto}</p>
                        </div>
                      </div>
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

      {/* ══ TAB: MIS ENTRENAMIENTOS ══ */}
      {tab === 'entrenamientos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 6 }}>
            Mis Entrenamientos ({MIS_ENTRENAMIENTOS.length})
          </h3>
          {MIS_ENTRENAMIENTOS.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 140 }}>
              <p style={{ color: '#555' }}>No estas inscrito en ningun entrenamiento</p>
            </div>
          ) : (
            MIS_ENTRENAMIENTOS.map(e => {
              const pagoBadge = PAGO_ESTADO[e.estadoPago]
              return (
                <div key={e.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.95rem', marginBottom: 4 }}>{e.nombre}</p>
                      <p style={{ fontSize: '0.75rem', color: '#666' }}>{e.empresa} • {e.entrenador}</p>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem',
                      fontWeight: 700, color: pagoBadge.color,
                      background: pagoBadge.color + '18', whiteSpace: 'nowrap',
                    }}>
                      {pagoBadge.label}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Dias</p>
                      <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{e.dias}</p>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Horario</p>
                      <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{e.horario}</p>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Precio</p>
                      <p style={{ fontSize: '0.88rem', color: '#f59e0b', fontWeight: 700 }}>Bs {e.precio}/mes</p>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Polera</p>
                      <p style={{ fontSize: '0.82rem', color: '#bbb' }}>{e.polera}</p>
                    </div>
                  </div>
                  {e.estadoPago === 'pendiente' && (
                    <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
                      <p style={{ fontSize: '0.78rem', color: '#f59e0b' }}>
                        ⚠️ Tu comprobante de pago está pendiente de validación por el administrador.
                      </p>
                    </div>
                  )}
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
                              {t.pendientes} pendientes
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
                            Mesa Tecnica
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
                            <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Posicion</p>
                            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: t.posicion <= 2 ? '#22c55e' : '#f5f5f5', lineHeight: 1 }}>
                              #{t.posicion}
                            </p>
                          </div>
                        )}
                        {t.proximoPartido && (
                          <div style={{ padding: '10px 14px', background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.2)', borderRadius: 10 }}>
                            <p style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Proximo Partido</p>
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
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', color: '#f59e0b', lineHeight: 1 }}>{puntos} pts</p>
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
                    Necesitas {puntos >= 101 ? 251 - puntos : 101 - puntos} pts más
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
                { icono: '📅', categoria: 'Reservas de canchas', pts: 50,  cantidad: 2, color: '#00BCD4' },
                { icono: '🏆', categoria: 'Torneos',             pts: 50,  cantidad: 1, color: '#f59e0b' },
                { icono: '🏋️', categoria: 'Entrenamientos',      pts: 15,  cantidad: 1, color: '#22c55e' },
                { icono: '👤', categoria: 'Referidos',           pts: 20,  cantidad: 1, color: '#a78bfa' },
              ].map((c, i) => {
                const pct = Math.round((c.pts / 135) * 100)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem', minWidth: 28 }}>{c.icono}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: '0.82rem', color: '#bbb' }}>
                          {c.categoria}
                          <span style={{ color: '#555', marginLeft: 6, fontSize: '0.72rem' }}>({c.cantidad} {c.cantidad === 1 ? 'vez' : 'veces'})</span>
                        </p>
                        <p style={{ fontSize: '0.82rem', color: c.color, fontWeight: 700 }}>+{c.pts} pts</p>
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
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#f59e0b' }}>Bs. {comprobante.monto}</span>
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

    </Layout>
  )
}
