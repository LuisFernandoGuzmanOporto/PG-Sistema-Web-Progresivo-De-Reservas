import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const DEPORTES = ['Voleibol', 'Baloncesto', 'Fútbol', 'Futsal', 'Wally', 'Tenis']

const ENTRENAMIENTOS = {
  Voleibol: [
    { dia: 'Lunes', horario: '16:00 - 18:00', cancha: 'Cancha de Voleibol', entrenador: 'Prof. María González', email: 'maria.gonzalez@sportika.com', telefono: '+57 300 123 4567', desc: 'Entrenamiento abierto para aprender fundamentos y técnicas básicas de voleibol.', empresa: 'Sport Center' },
    { dia: 'Miércoles', horario: '17:00 - 19:00', cancha: 'Cancha de Voleibol', entrenador: 'Prof. Carlos Ruiz', email: 'carlos.ruiz@sportika.com', telefono: '+57 300 234 5678', desc: 'Sesión de práctica y mejora de técnicas. Todos los niveles bienvenidos.', empresa: 'Sport Center' },
    { dia: 'Viernes', horario: '15:00 - 17:00', cancha: 'Cancha de Voleibol', entrenador: 'Prof. Ana Martínez', email: 'ana.martinez@sportika.com', telefono: '+57 300 345 6789', desc: 'Entrenamiento y partidos de práctica para todos los que quieran aprender.', empresa: 'Sport Center' },
  ],
  Baloncesto: [
    { dia: 'Martes', horario: '17:00 - 19:00', cancha: 'Cancha de Baloncesto', entrenador: 'Prof. Roberto Silva', email: 'roberto.silva@sportika.com', telefono: '+57 300 456 7890', desc: 'Fundamentos de baloncesto para principiantes e intermedios.', empresa: 'Gimnasio Central' },
    { dia: 'Jueves', horario: '16:00 - 18:00', cancha: 'Cancha de Baloncesto', entrenador: 'Prof. Laura Pérez', email: 'laura.perez@sportika.com', telefono: '+57 300 567 8901', desc: 'Práctica de tiro, dribbling y juego colectivo.', empresa: 'Gimnasio Central' },
  ],
  Fútbol: [
    { dia: 'Lunes', horario: '18:00 - 20:00', cancha: 'Cancha Fútbol Principal', entrenador: 'Prof. Diego Torres', email: 'diego.torres@sportika.com', telefono: '+57 300 678 9012', desc: 'Técnica individual y juego colectivo para todos los niveles.', empresa: 'Sport Center' },
    { dia: 'Sábado', horario: '09:00 - 11:00', cancha: 'Cancha Fútbol Principal', entrenador: 'Prof. Diego Torres', email: 'diego.torres@sportika.com', telefono: '+57 300 678 9012', desc: 'Entrenamiento intensivo de fines de semana.', empresa: 'Sport Center' },
  ],
  Futsal: [],
  Wally: [
    { dia: 'Miércoles', horario: '19:00 - 21:00', cancha: 'Cancha de Wally 1', entrenador: 'Prof. Carmen López', email: 'carmen.lopez@sportika.com', telefono: '+57 300 789 0123', desc: 'Aprende wally desde cero con técnicas profesionales.', empresa: 'Complejo Deportivo Este' },
  ],
  Tenis: [],
}

const PASOS = [
  { num: '1', titulo: 'Llega al horario', desc: 'Solo preséntate en la cancha a la hora indicada' },
  { num: '2', titulo: 'Trae ropa deportiva', desc: 'Usa ropa cómoda y zapatos deportivos' },
  { num: '3', titulo: '¡A aprender!', desc: 'Los entrenadores te ayudarán sin importar tu nivel' },
]

export default function Entrenamientos() {
  const navigate = useNavigate()
  const [deporteActivo, setDeporteActivo] = useState('Voleibol')

  const entrenamientosActivos = ENTRENAMIENTOS[deporteActivo] || []

  return (
    <Layout role="user">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/dashboard')} style={{ padding: '4px 0' }}>
          ← Volver al Dashboard
        </button>
      </div>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#f5f5f5', marginBottom: 4 }}>🏃 Entrenamientos Deportivos</h1>

      {/* Info banner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ color: '#00BCD4', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>📋 Horarios de Entrenamientos</p>
          <p style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Todos los entrenamientos son <strong style={{ color: '#ccc' }}>gratuitos y abiertos</strong> para cualquier usuario que quiera aprender a jugar. ¡Solo ven y participa!
          </p>
        </div>
        <div style={{ background: 'rgba(139,0,0,0.1)', border: '1px solid rgba(139,0,0,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ color: '#ff6b6b', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>❓ ¿Cómo participar?</p>
          <p style={{ color: '#666', fontSize: '0.78rem' }}>Solo llega al horario indicado con ropa deportiva</p>
        </div>
      </div>

      {/* Tabs deportes */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {DEPORTES.map(d => (
          <button key={d} onClick={() => setDeporteActivo(d)} style={{
            padding: '8px 18px',
            borderRadius: 20,
            border: '1px solid',
            borderColor: deporteActivo === d ? '#00BCD4' : '#2a2a2a',
            background: deporteActivo === d ? 'rgba(0,188,212,0.15)' : 'transparent',
            color: deporteActivo === d ? '#00BCD4' : '#666',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Outfit',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: deporteActivo === d ? '#00BCD4' : '#444', display: 'inline-block' }} />
            {d}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#f5f5f5', marginBottom: 2 }}>
          Entrenamientos de {deporteActivo}
        </h2>
        <p style={{ color: '#666', fontSize: '0.8rem' }}>Horarios semanales disponibles para todos los niveles</p>
      </div>

      {entrenamientosActivos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
          {entrenamientosActivos.map((e, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5' }}>{e.dia}</h3>
                <span style={{ color: '#00BCD4', fontSize: '0.85rem', fontWeight: 600 }}>🕐 {e.horario}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <p style={{ fontSize: '0.82rem', color: '#888' }}>📍 {e.cancha}</p>
                <p style={{ fontSize: '0.82rem', color: '#888' }}>🏢 {e.empresa}</p>
                <p style={{ fontSize: '0.82rem', color: '#ff6b6b', fontWeight: 600 }}>👨‍🏫 {e.entrenador}</p>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.5, marginBottom: 14 }}>{e.desc}</p>

              <div style={{ padding: '10px 12px', background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 8 }}>
                <p style={{ color: '#00BCD4', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>Información de Contacto</p>
                <p style={{ color: '#666', fontSize: '0.75rem' }}>✉️ {e.email}</p>
                <p style={{ color: '#666', fontSize: '0.75rem', marginTop: 2 }}>📱 {e.telefono}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon">🏃</div>
          <h3>No hay entrenamientos disponibles</h3>
          <p>Aún no hay entrenamientos registrados para {deporteActivo}</p>
        </div>
      )}

      {/* Como participar banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, rgba(0,188,212,0.1) 100%)', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#f5f5f5', marginBottom: 16, textAlign: 'center' }}>
          ¿Cómo participar en los entrenamientos?
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {PASOS.map((paso, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,188,212,0.2)', border: '2px solid rgba(0,188,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#00BCD4' }}>
                {paso.num}
              </div>
              <p style={{ fontWeight: 700, color: '#f5f5f5', fontSize: '0.88rem', marginBottom: 4 }}>{paso.titulo}</p>
              <p style={{ color: '#666', fontSize: '0.78rem', lineHeight: 1.4 }}>{paso.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
