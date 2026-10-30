// ─────────────────────────────────────────────────────────────────────────────
// FUENTE UNICA DE DATOS — SPORTIKA
//
// Todas las pantallas leen los torneos, las empresas y los partidos desde aqui.
// Antes cada pagina tenia su propia copia escrita a mano y el mismo torneo
// aparecia distinto segun la pantalla (0/16, 2/16 y 8/16 a la vez).
// Cuando se conecte Supabase, este archivo se reemplaza por las consultas.
// ─────────────────────────────────────────────────────────────────────────────

import { yaSeJugo } from './horaDelPartido.js'
import { hoyBolivia } from './fecha.js'

/**
 * Compara dos identificadores sin importar si son numero o texto.
 * Hace falta porque los ids de la base son UUID (texto) y los de las rutas
 * llegan siempre como texto, mientras que los datos de prueba usaban numeros.
 */
// Los empleados no entran con un correo propio: el administrador les entrega
// un usuario ('rosa.v') y una contrasena. Pero Supabase autentica con correo,
// asi que por dentro ese usuario se convierte en rosa.v@empleados.sportika.app.
// El empleado nunca ve esa direccion: escribe su usuario y listo.
export const DOMINIO_EMPLEADOS = 'empleados.sportika.app'

/** Convierte lo que se escribio en el correo con el que se consulta a Supabase. */
export const correoDeAcceso = (loQueEscribio) => {
  const txt = String(loQueEscribio || '').trim().toLowerCase()
  return txt.includes('@') ? txt : txt + '@' + DOMINIO_EMPLEADOS
}

export const mismo = (a, b) => a != null && b != null && String(a) === String(b)

/**
 * Quien esta usando la aplicacion en este momento. Lo llena src/lib/auth.jsx
 * al iniciar sesion. Se modifica en el sitio (Object.assign) porque las
 * pantallas ya importaron ESTA referencia.
 */
export const SESION = { usuarioId: null, empresaId: null, rol: null, permisos: [] }

export const USUARIO_ACTUAL = {
  id: 99,
  nombre: 'Juan García',
  email: 'juan.garcia@sportika.bo',
  telefono: '700-12345',
  puntos: 75,
  foto: null,          // avatares/<id>/... o la foto de Google (migraciones/039)
  deporteFav: null,    // el que elige en Mi Perfil: se le muestra primero
}

// ── Deportes que maneja el sistema ─────────────────────────────────────────
// Una sola lista para todo: la usa el registro del complejo, "Mi cuenta" y el
// alta de canchas. Si estuviera escrita en cada pantalla, agregar un deporte
// nuevo obligaria a acordarse de los tres lugares.
export const DEPORTES = ['Fútbol', 'Wally', 'Básquetbol', 'Voleibol', 'Pádel', 'Tenis']

// Las zonas de Cochabamba con las que el cliente filtra los complejos
export const ZONAS = ['Centro', 'Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste',
                      'Quillacollo', 'Sacaba', 'Otro']

// ── Empresas / complejos deportivos ────────────────────────────────────────
// estado: 'activo' | 'pendiente' | 'suspendido'
// Solo las ACTIVAS se muestran a los clientes. Las pendientes esperan que el
// Super Admin las apruebe; las suspendidas fueron dadas de baja por el.
export const EMPRESAS = [
  { id: 1, nombre: 'Sport Center',           zona: 'Zona Norte', direccion: 'Av. Blanco Galindo Km 5', telefono: '4-123456', emoji: '🏟️', horario: '06:00 - 22:00', deportes: ['Fútbol', 'Wally', 'Pádel'],    descripcion: 'El complejo deportivo más grande de la zona norte con canchas de primer nivel e iluminación nocturna.', lat: -17.3731, lng: -66.1568, referencia: 'Sobre Blanco Galindo, frente a la gasolinera',
    estado: 'activo',     admin: 'Pedro García',    adminEmail: 'pedro@sportcenter.com',  fechaSolicitud: '15 Ene 2026' },
  { id: 2, nombre: 'Gimnasio Central',        zona: 'Centro',     direccion: 'Calle España 234',         telefono: '4-234567', emoji: '🏀', horario: '07:00 - 21:00', deportes: ['Básquetbol'],                  descripcion: 'Especialistas en básquetbol con cancha techada y piso de madera profesional.',                       lat: -17.3935, lng: -66.1568, referencia: 'Entre Av. Ayacucho y Jordán, piso 2',
    estado: 'activo',     admin: 'Ana Morales',     adminEmail: 'ana@gimcentral.com',     fechaSolicitud: '18 Ene 2026' },
  { id: 3, nombre: 'Zona Deportiva Sur',      zona: 'Zona Sur',   direccion: 'Av. Petrolera 456',        telefono: '4-345678', emoji: '🏐', horario: '08:00 - 20:00', deportes: ['Voleibol'],                    descripcion: 'Complejo multideportivo en la zona sur con canchas de voleibol.',                                    lat: -17.4280, lng: -66.1650, referencia: 'Av. Petrolera, pasando el mercado Sur',
    estado: 'activo',     admin: 'Sandra Vega',     adminEmail: 'sandra@zdsur.com',       fechaSolicitud: '20 Ene 2026' },
  { id: 4, nombre: 'Complejo Deportivo Este', zona: 'Zona Este',  direccion: 'Av. América 789',          telefono: '4-456789', emoji: '🎾', horario: '07:00 - 22:00', deportes: ['Wally'],                       descripcion: 'El mejor complejo de wally en Cochabamba. Tres canchas techadas con iluminación LED.',               lat: -17.3850, lng: -66.1200, referencia: 'Zona Este, Av. América casi Circunvalación',
    estado: 'activo',     admin: 'Luis Quispe',     adminEmail: 'luis@cdeste.com',        fechaSolicitud: '25 Ene 2026' },
  { id: 5, nombre: 'Zona Deportiva Oeste',    zona: 'Zona Oeste', direccion: 'Calle Lanza 101',          telefono: '4-567890', emoji: '🏓', horario: '06:00 - 21:00', deportes: ['Pádel'],                       descripcion: 'Canchas de pádel profesionales con torneos semanales.',                                              lat: -17.3890, lng: -66.1900, referencia: 'Calle Lanza esquina con Punata',
    estado: 'activo',     admin: 'María Torres',    adminEmail: 'maria@zdoeste.com',      fechaSolicitud: '02 Feb 2026' },

  // Todavía no aprobadas: el Super Admin las revisa. No las ve ningún cliente.
  { id: 6, nombre: 'Wally Zone',              zona: 'Zona Sur',   direccion: 'Av. Villazón 320',         telefono: '4-678901', emoji: '🎾', horario: '08:00 - 22:00', deportes: ['Wally', 'Pádel'],              descripcion: 'Complejo nuevo de wally y pádel en la zona sur.',                                                    lat: -17.4310, lng: -66.1580, referencia: 'Av. Villazón, a media cuadra de la plaza',
    estado: 'pendiente',  admin: 'Carlos Ríos',     adminEmail: 'carlos@wallyzone.com',   fechaSolicitud: '01 Jun 2026' },
  { id: 7, nombre: 'Complejo Los Álamos',     zona: 'Zona Norte', direccion: 'Av. Melchor Pérez 1450',   telefono: '4-789012', emoji: '⚽', horario: '06:00 - 23:00', deportes: ['Fútbol', 'Voleibol'],          descripcion: 'Canchas de césped sintético y voleibol de arena.',                                                   lat: -17.3690, lng: -66.1720, referencia: 'Melchor Pérez, frente al colegio',
    estado: 'pendiente',  admin: 'Rocío Ferrufino', adminEmail: 'rocio@losalamos.com',    fechaSolicitud: '03 Jun 2026' },

  // Dada de baja por el Super Admin
  { id: 8, nombre: 'Pistas Tennis Club',      zona: 'Zona Norte', direccion: 'Av. Pando 88',             telefono: '4-890123', emoji: '🎾', horario: '07:00 - 20:00', deportes: ['Tenis', 'Pádel'],              descripcion: 'Club de tenis y pádel con canchas de polvo de ladrillo.',                                            lat: -17.3660, lng: -66.1490, referencia: 'Av. Pando, dentro del club',
    estado: 'suspendido', admin: 'Hernán Zapata',   adminEmail: 'hernan@tennisclub.com',  fechaSolicitud: '10 Ene 2026' },
]

/**
 * Lo unico que ve un cliente: las empresas aprobadas y activas.
 * Es una funcion, no un arreglo fijo: cuando el Super Admin aprueba o
 * suspende una empresa, el cambio se refleja de inmediato.
 */
export const empresasActivas = () => EMPRESAS.filter(e => e.estado === 'activo')

export const empresaPorId = (id) => EMPRESAS.find(e => mismo(e.id, id)) || null

// ── Plantillas ─────────────────────────────────────────────────────────────
const POSICIONES_BASE = ['Portero', 'Defensa', 'Defensa', 'Defensa', 'Defensa',
  'Mediocampista', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero', 'Delantero']

/** Arma la plantilla de un equipo: id correlativo desde `base`, dorsal 1..n */
const roster = (base, nombres) =>
  nombres.map((n, i) => ({
    id: base + i,
    dorsal: i + 1,
    nombre: n,
    posicion: POSICIONES_BASE[i % POSICIONES_BASE.length],
    habilitado: true,
  }))

// ── Torneos ────────────────────────────────────────────────────────────────
// El numero de equipos NUNCA se escribe a mano: se calcula con conteoEquipos().
// La tabla de posiciones tampoco se guarda: se calcula con calcularTabla().
export const TORNEOS = [
  {
    id: 1, creador_id: 99, creador: 'Juan García', creador_tipo: 'cliente',
    solicitud: { estado: 'aprobada', fecha: '08 Feb', resueltaPor: 'Admin Sport Center', motivo: null },
    nombre: 'Copa Sportika Fútbol 2025', emoji: '⚽', deporte: 'Fútbol', deporteKey: 'Fútbol',
    empresa_id: 1, empresa: 'Sport Center', cancha: 'Cancha de Fútbol Principal',
    fechaInicio: '14 Feb', fechaFin: '28 Feb', inscripcionHasta: '10 Feb',
    precio: 200, estado: 'en_curso',
    premios: { primero: 'Trofeo + Bs. 500', segundo: 'Trofeo + Bs. 300', tercero: 'Trofeo + Bs. 150' },
    desc: 'El torneo de fútbol más grande de Cochabamba. Equipos de todos los niveles compiten por la gloria.',
    formato: 'Grupos + Eliminación', jugadoresPorEquipo: 11, suplentes: 3, maxEquipos: 16,
    clasificanPorGrupo: 2,
    tieneAmarillas: true, tieneRojas: true, tieneGoles: true,
    reglas: [
      'Equipos mixtos permitidos (mínimo 2 mujeres por equipo)',
      'Mínimo 11 jugadores, máximo 14',
      'Partidos de 90 minutos (2 tiempos de 45 min)',
      'En caso de empate en eliminatoria: penales',
      'Tarjeta roja = suspensión del siguiente partido',
    ],
    calendario: [
      { fase: 'Fase de Grupos',   desc: '2 grupos de 4 — todos contra todos', fecha: '14-16 Feb' },
      { fase: 'Semifinales',      desc: 'Clasifican los 2 primeros de cada grupo', fecha: '24 Feb' },
      { fase: 'Final',            desc: 'Gran final + 3er puesto',            fecha: '28 Feb'    },
    ],
    horarios: 'Lunes a Viernes: 2:00 PM - 8:00 PM',
    // Resultado del sorteo: 8 equipos aprobados repartidos en 2 grupos
    grupos: { A: [1, 2, 3, 4], B: [5, 6, 7, 8] },
    equipos: [
      {
        id: 1, nombre: 'Los Cracks FC', capitan: 'Pedro Rojas', estado: 'aprobado',
        comprobante: 'comp1.jpg', integrantes_ids: [99],
        jugadores: [
          { id: 1,  dorsal: 1 , nombre: 'Pedro Rojas',   posicion: 'Portero',       habilitado: true  },
          { id: 2,  dorsal: 2 , nombre: 'Carlos Mamani', posicion: 'Defensa',       habilitado: true  },
          { id: 3,  dorsal: 3 , nombre: 'Luis Flores',   posicion: 'Defensa',       habilitado: true  },
          { id: 4,  dorsal: 4 , nombre: 'Marco Quispe',  posicion: 'Mediocampista', habilitado: false },
          { id: 5,  dorsal: 5 , nombre: 'Diego Vargas',  posicion: 'Mediocampista', habilitado: true  },
          { id: 6,  dorsal: 6 , nombre: 'Alex Torrez',   posicion: 'Delantero',     habilitado: true  },
          { id: 7,  dorsal: 7 , nombre: 'Juan García',   posicion: 'Delantero',     habilitado: true  },
          { id: 8,  dorsal: 8 , nombre: 'René Copa',     posicion: 'Mediocampista', habilitado: true  },
          { id: 9,  dorsal: 9 , nombre: 'Simón Arce',    posicion: 'Defensa',       habilitado: true  },
          { id: 10, dorsal: 10, nombre: 'Erick Mendez',  posicion: 'Defensa',       habilitado: true  },
          { id: 11, dorsal: 11, nombre: 'Abel Soliz',    posicion: 'Mediocampista', habilitado: true  },
          { id: 13, dorsal: 13, nombre: 'Omar Cruz',     posicion: 'Defensa',       habilitado: true  },
          { id: 14, dorsal: 14, nombre: 'Iván Medina',   posicion: 'Delantero',     habilitado: true  },
        ],
      },
      {
        id: 2, nombre: 'Deportivo Norte', capitan: 'Ana López', estado: 'aprobado',
        comprobante: 'comp2.jpg', integrantes_ids: [],
        jugadores: [
          { id: 15, dorsal: 1 , nombre: 'Ana López',    posicion: 'Portero',       habilitado: true  },
          { id: 16, dorsal: 2 , nombre: 'Fran Morales', posicion: 'Defensa',       habilitado: true  },
          { id: 17, dorsal: 3 , nombre: 'Nico Reyes',   posicion: 'Mediocampista', habilitado: true  },
          { id: 18, dorsal: 4 , nombre: 'Sara Blanco',  posicion: 'Delantero',     habilitado: true  },
          { id: 19, dorsal: 5 , nombre: 'Camila Ríos',  posicion: 'Defensa',       habilitado: false },
          { id: 20, dorsal: 6 , nombre: 'Luis Méndez',  posicion: 'Mediocampista', habilitado: true  },
          { id: 21, dorsal: 7 , nombre: 'Jorge Paz',    posicion: 'Defensa',       habilitado: true  },
          { id: 22, dorsal: 8 , nombre: 'René Alva',    posicion: 'Mediocampista', habilitado: true  },
          { id: 23, dorsal: 9 , nombre: 'Mario Soto',   posicion: 'Delantero',     habilitado: true  },
          { id: 24, dorsal: 10, nombre: 'Óscar Tito',   posicion: 'Defensa',       habilitado: true  },
          { id: 25, dorsal: 11, nombre: 'Elena Coss',   posicion: 'Mediocampista', habilitado: true  },
        ],
      },
      {
        id: 3, nombre: 'Athletic Sur', capitan: 'Roberto Chávez', estado: 'aprobado',
        comprobante: 'comp3.jpg', integrantes_ids: [],
        jugadores: roster(300, ['Roberto Chávez', 'Iván Loayza', 'Marcos Aliaga', 'Tito Ferrufino',
                                'Willy Zeballos', 'Grover Pinto', 'Saúl Berrios', 'Hugo Lima',
                                'Denis Aguilar', 'Rubén Ovando', 'Fabio Terceros']),
      },
      {
        id: 4, nombre: 'Team Rojo', capitan: 'Sofía Vargas', estado: 'aprobado',
        comprobante: 'comp4.jpg', integrantes_ids: [],
        jugadores: roster(400, ['Sofía Vargas', 'Nadia Claros', 'Lucía Ergueta', 'Rocío Peñaranda',
                                'Kevin Ustariz', 'Bruno Salazar', 'Iker Montaño', 'Rodrigo Suárez',
                                'Hugo Vaca', 'Andrés Zurita', 'Gabriel Bustos']),
      },
      {
        id: 5, nombre: 'Los Tigres', capitan: 'Marcelo Ledezma', estado: 'aprobado',
        comprobante: 'comp5.jpg', integrantes_ids: [],
        jugadores: roster(500, ['Marcelo Ledezma', 'Freddy Zambrana', 'Óscar Villarroel', 'Elías Durán',
                                'Josué Careaga', 'Nelson Aruquipa', 'Bruno Salas', 'Ronald Tapia',
                                'Emilio Zurita', 'Wilson Choque', 'Ariel Cuéllar']),
      },
      {
        id: 6, nombre: 'Real Este', capitan: 'Gonzalo Arnez', estado: 'aprobado',
        comprobante: 'comp6.jpg', integrantes_ids: [],
        jugadores: roster(600, ['Gonzalo Arnez', 'Rolando Pardo', 'Édgar Camargo', 'Ismael Vera',
                                'Boris Colodro', 'Fabio Ortiz', 'Néstor Quiroga', 'Rodrigo Nina',
                                'Israel Choque', 'Marvin Zapata', 'Alan Fernández']),
      },
      {
        id: 7, nombre: 'FC Centro', capitan: 'Álvaro Peredo', estado: 'aprobado',
        comprobante: 'comp7.jpg', integrantes_ids: [],
        jugadores: roster(700, ['Álvaro Peredo', 'Jaime Villca', 'Ronald Illanes', 'Marcos Chuquimia',
                                'Renzo Vallejos', 'Ariel Mercado', 'Josué Ledezma', 'Ariel Sandoval',
                                'Iván Suárez', 'Danilo Cabrera', 'Pedro Ustariz']),
      },
      {
        id: 8, nombre: 'Sporting Oeste', capitan: 'Christian Ballón', estado: 'aprobado',
        comprobante: 'comp8.jpg', integrantes_ids: [],
        jugadores: roster(800, ['Christian Ballón', 'Marco Aramayo', 'Jhonny Rivas', 'Aldo Barrientos',
                                'Darío Lima', 'Sergio Iriarte', 'Nicolás Cussi', 'Emilio Padilla',
                                'Franz Delgado', 'Kevin Rocha', 'Julio Céspedes']),
      },
      {
        id: 9, nombre: 'Juventud FC', capitan: 'Ramiro Céspedes', estado: 'pendiente',
        comprobante: 'comp9.jpg', integrantes_ids: [],
        jugadores: roster(900, ['Ramiro Céspedes', 'Elías Rocha', 'Adrián Nina', 'Jhonny Camacho',
                                'Sergio Baldivieso', 'Pablo Guzmán', 'Cristian Antezana',
                                'Fernando Orellana', 'Álvaro Sejas', 'Milton Yucra', 'Dilan Escobar']),
      },
    ],
    // Fase de grupos completa: todos contra todos dentro de cada grupo
    partidos: [
      { id: 1, fase: 'grupos', grupo: 'A', equipo1_id: 1, equipo1: 'Los Cracks FC', equipo2_id: 4, equipo2: 'Team Rojo',
        g1: 2, g2: 1, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'finalizado', hora: '09:00', cancha: 'Cancha Principal', minuto: 90,
        eventos: [
          { tipo: 'gol',      jugador_id: 6,   jugador: 'Alex Torrez',   dorsal: 6, equipo_id: 1, equipo: 'Los Cracks FC', minuto: 14 },
          { tipo: 'gol',      jugador_id: 14,  jugador: 'Iván Medina',   dorsal: 14, equipo_id: 1, equipo: 'Los Cracks FC', minuto: 52 },
          { tipo: 'amarilla', jugador_id: 2,   jugador: 'Carlos Mamani', dorsal: 2, equipo_id: 1, equipo: 'Los Cracks FC', minuto: 66 },
          { tipo: 'gol',      jugador_id: 408, jugador: 'Hugo Vaca',     dorsal: 9, equipo_id: 4, equipo: 'Team Rojo',     minuto: 71 },
        ] },
      { id: 2, fase: 'grupos', grupo: 'A', equipo1_id: 2, equipo1: 'Deportivo Norte', equipo2_id: 3, equipo2: 'Athletic Sur',
        g1: 0, g2: 0, am1: 0, am2: 1, rj1: 0, rj2: 0, estado: 'finalizado', hora: '10:00', cancha: 'Cancha Auxiliar', minuto: 90,
        eventos: [
          { tipo: 'amarilla', jugador_id: 302, jugador: 'Marcos Aliaga', dorsal: 3, equipo_id: 3, equipo: 'Athletic Sur', minuto: 40 },
        ] },
      { id: 3, fase: 'grupos', grupo: 'A', equipo1_id: 1, equipo1: 'Los Cracks FC', equipo2_id: 2, equipo2: 'Deportivo Norte',
        g1: 1, g2: 0, am1: 0, am2: 1, rj1: 0, rj2: 0, estado: 'en_vivo', hora: '15:00', cancha: 'Cancha Principal', minuto: 37,
        eventos: [
          { tipo: 'gol',      jugador_id: 6,  jugador: 'Alex Torrez', dorsal: 6, equipo_id: 1, equipo: 'Los Cracks FC',   minuto: 12 },
          { tipo: 'amarilla', jugador_id: 17, jugador: 'Nico Reyes',  dorsal: 3, equipo_id: 2, equipo: 'Deportivo Norte', minuto: 28 },
        ] },
      { id: 4, fase: 'grupos', grupo: 'A', equipo1_id: 4, equipo1: 'Team Rojo', equipo2_id: 3, equipo2: 'Athletic Sur',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '17:00', cancha: 'Cancha Auxiliar', minuto: null, eventos: [] },
      { id: 5, fase: 'grupos', grupo: 'A', equipo1_id: 1, equipo1: 'Los Cracks FC', equipo2_id: 3, equipo2: 'Athletic Sur',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '18:00', cancha: 'Cancha Principal', minuto: null, eventos: [] },
      { id: 6, fase: 'grupos', grupo: 'A', equipo1_id: 2, equipo1: 'Deportivo Norte', equipo2_id: 4, equipo2: 'Team Rojo',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '19:00', cancha: 'Cancha Auxiliar', minuto: null, eventos: [] },
      { id: 7, fase: 'grupos', grupo: 'B', equipo1_id: 5, equipo1: 'Los Tigres', equipo2_id: 8, equipo2: 'Sporting Oeste',
        g1: 3, g2: 1, am1: 0, am2: 2, rj1: 0, rj2: 1, estado: 'finalizado', hora: '09:00', cancha: 'Cancha Auxiliar', minuto: 90,
        eventos: [
          { tipo: 'gol',      jugador_id: 506, jugador: 'Bruno Salas',   dorsal: 7,  equipo_id: 5, equipo: 'Los Tigres',     minuto: 9  },
          { tipo: 'gol',      jugador_id: 506, jugador: 'Bruno Salas',   dorsal: 7,  equipo_id: 5, equipo: 'Los Tigres',     minuto: 33 },
          { tipo: 'gol',      jugador_id: 809, jugador: 'Kevin Rocha',   dorsal: 10, equipo_id: 8, equipo: 'Sporting Oeste', minuto: 60 },
          { tipo: 'gol',      jugador_id: 510, jugador: 'Ariel Cuéllar', dorsal: 11, equipo_id: 5, equipo: 'Los Tigres',     minuto: 78 },
          { tipo: 'roja',     jugador_id: 804, jugador: 'Darío Lima',    dorsal: 5,  equipo_id: 8, equipo: 'Sporting Oeste', minuto: 84 },
        ] },
      { id: 8, fase: 'grupos', grupo: 'B', equipo1_id: 7, equipo1: 'FC Centro', equipo2_id: 6, equipo2: 'Real Este',
        g1: 1, g2: 2, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'finalizado', hora: '10:00', cancha: 'Cancha Principal', minuto: 90,
        eventos: [
          { tipo: 'gol',      jugador_id: 708, jugador: 'Iván Suárez',  dorsal: 9, equipo_id: 7, equipo: 'FC Centro', minuto: 22 },
          { tipo: 'gol',      jugador_id: 605, jugador: 'Fabio Ortiz',  dorsal: 6, equipo_id: 6, equipo: 'Real Este', minuto: 44 },
          { tipo: 'amarilla', jugador_id: 708, jugador: 'Iván Suárez',  dorsal: 9, equipo_id: 7, equipo: 'FC Centro', minuto: 55 },
          { tipo: 'gol',      jugador_id: 607, jugador: 'Rodrigo Nina', dorsal: 8, equipo_id: 6, equipo: 'Real Este', minuto: 69 },
        ] },
      { id: 9, fase: 'grupos', grupo: 'B', equipo1_id: 5, equipo1: 'Los Tigres', equipo2_id: 6, equipo2: 'Real Este',
        g1: 1, g2: 1, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'en_vivo', hora: '15:00', cancha: 'Cancha Auxiliar', minuto: 52,
        eventos: [
          { tipo: 'gol',      jugador_id: 506, jugador: 'Bruno Salas',  dorsal: 7, equipo_id: 5, equipo: 'Los Tigres', minuto: 18 },
          { tipo: 'amarilla', jugador_id: 503, jugador: 'Elías Durán',  dorsal: 4, equipo_id: 5, equipo: 'Los Tigres', minuto: 35 },
          { tipo: 'gol',      jugador_id: 607, jugador: 'Rodrigo Nina', dorsal: 8, equipo_id: 6, equipo: 'Real Este',  minuto: 47 },
        ] },
      { id: 10, fase: 'grupos', grupo: 'B', equipo1_id: 7, equipo1: 'FC Centro', equipo2_id: 8, equipo2: 'Sporting Oeste',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '17:00', cancha: 'Cancha Principal', minuto: null, eventos: [] },
      { id: 11, fase: 'grupos', grupo: 'B', equipo1_id: 5, equipo1: 'Los Tigres', equipo2_id: 7, equipo2: 'FC Centro',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '18:00', cancha: 'Cancha Auxiliar', minuto: null, eventos: [] },
      { id: 12, fase: 'grupos', grupo: 'B', equipo1_id: 6, equipo1: 'Real Este', equipo2_id: 8, equipo2: 'Sporting Oeste',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '19:00', cancha: 'Cancha Principal', minuto: null, eventos: [] },
    ],
  },
  {
    id: 2, creador_id: 5, creador: 'Marco Flores', creador_tipo: 'cliente',
    solicitud: { estado: 'aprobada', fecha: '22 Feb', resueltaPor: 'Admin Gimnasio Central', motivo: null },
    nombre: 'Liga de Baloncesto Sportika', emoji: '🏀', deporte: 'Básquetbol', deporteKey: 'Básquetbol',
    empresa_id: 2, empresa: 'Gimnasio Central', cancha: 'Cancha de Baloncesto',
    fechaInicio: '28 Feb', fechaFin: '14 Mar', inscripcionHasta: '24 Feb',
    precio: 150, estado: 'inscripciones',
    premios: { primero: 'Trofeo + Bs. 400', segundo: 'Medalla + Bs. 200', tercero: 'Medalla' },
    desc: 'Competencia de baloncesto para todos los niveles. Organizada por Gimnasio Central.',
    formato: 'Grupos + Eliminación', jugadoresPorEquipo: 5, suplentes: 3, maxEquipos: 12,
    clasificanPorGrupo: 2,
    tieneAmarillas: false, tieneRojas: false, tieneGoles: false,
    reglas: [
      'Partidos de 4 cuartos de 10 minutos',
      'Mínimo 5 jugadores por equipo, máximo 8',
      'En caso de empate: tiempo extra de 5 minutos',
    ],
    calendario: [
      { fase: 'Fase de Grupos', desc: 'Todos contra todos dentro del grupo', fecha: '28 Feb - 5 Mar' },
      { fase: 'Semifinales',    desc: 'Eliminación directa',                 fecha: '10-11 Mar'      },
      { fase: 'Final',          desc: 'Gran final',                          fecha: '14 Mar'         },
    ],
    horarios: 'Martes y Jueves: 6:00 PM - 10:00 PM',
    grupos: null,
    equipos: [
      { id: 10, nombre: 'Baloncesto Élite', capitan: 'Marco Flores', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(1000, ['Marco Flores', 'Aldo Villca', 'Nelson Rojas', 'Ariel Peña', 'Tomás Uzeda', 'Ignacio Arispe']) },
      { id: 11, nombre: 'Los Bulldogs', capitan: 'Juan García', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [99],
        jugadores: roster(1100, ['Juan García', 'Fabián Cossío', 'Leandro Poma', 'Sergio Andia', 'Braian Colque', 'Josué Miranda']) },
      { id: 12, nombre: 'Titanes CBBA', capitan: 'Erika Salvatierra', estado: 'pendiente', comprobante: null, integrantes_ids: [],
        jugadores: roster(1200, ['Erika Salvatierra', 'Noelia Aramayo', 'Paola Guzmán', 'Vanesa Trigo', 'Karen Zambrana']) },
    ],
    partidos: [],
  },
  {
    id: 3, creador_id: 12, creador: 'Complejo Deportivo Este', creador_tipo: 'complejo',
    nombre: 'Championship Wally Cup', emoji: '🎾', deporte: 'Wally', deporteKey: 'Wally',
    empresa_id: 4, empresa: 'Complejo Deportivo Este', cancha: 'Cancha de Wally 1',
    fechaInicio: '19 Feb', fechaFin: '24 Feb', inscripcionHasta: '17 Feb',
    precio: 100, estado: 'inscripciones',
    premios: { primero: 'Trofeo + Bs. 200', segundo: 'Medalla', tercero: '' },
    desc: 'El torneo de wally más emocionante del semestre.',
    formato: 'Eliminación directa', jugadoresPorEquipo: 2, suplentes: 1, maxEquipos: 8,
    clasificanPorGrupo: 2,
    tieneAmarillas: false, tieneRojas: false, tieneGoles: false,
    reglas: ['Partidos al mejor de 3 sets', 'Parejas fijas durante todo el torneo'],
    calendario: [
      { fase: 'Cuartos de Final', desc: 'Eliminación directa', fecha: '19-20 Feb' },
      { fase: 'Semifinales',      desc: 'Eliminación directa', fecha: '22 Feb'    },
      { fase: 'Final',            desc: 'Gran final',          fecha: '24 Feb'    },
    ],
    horarios: 'Lunes a Sábado: 6:00 PM - 10:00 PM',
    grupos: null,
    equipos: [
      { id: 20, nombre: 'Dúo Relámpago', capitan: 'Diego Ramos', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [], jugadores: roster(2000, ['Diego Ramos', 'Elena Cruz']) },
      { id: 21, nombre: 'Los Halcones',  capitan: 'Juan Rivas',  estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [], jugadores: roster(2100, ['Juan Rivas', 'Luisa Rocha']) },
    ],
    partidos: [],
  },
  {
    id: 4, creador_id: 15, creador: 'Zona Deportiva Sur', creador_tipo: 'complejo',
    nombre: 'Torneo de Vóleibol Sportika', emoji: '🏐', deporte: 'Voleibol', deporteKey: 'Voleibol',
    empresa_id: 3, empresa: 'Zona Deportiva Sur', cancha: 'Cancha de Voleibol',
    fechaInicio: '8 Mar', fechaFin: '19 Mar', inscripcionHasta: '4 Mar',
    precio: 120, estado: 'inscripciones',
    premios: { primero: 'Trofeo + Bs. 350', segundo: 'Medalla + Bs. 150', tercero: '' },
    desc: 'Competencia oficial de voleibol con equipos mixtos de toda la ciudad.',
    formato: 'Liga (todos contra todos)', jugadoresPorEquipo: 6, suplentes: 2, maxEquipos: 10,
    clasificanPorGrupo: 2,
    tieneAmarillas: false, tieneRojas: false, tieneGoles: false,
    reglas: ['Partidos al mejor de 3 sets', 'Equipos mixtos obligatorios (mínimo 2 mujeres en cancha)'],
    calendario: [
      { fase: 'Liga',  desc: 'Todos contra todos',   fecha: '8-17 Mar' },
      { fase: 'Final', desc: '1º vs 2º de la tabla', fecha: '19 Mar'   },
    ],
    horarios: 'Sábados y Domingos: 9:00 AM - 1:00 PM',
    grupos: null,
    equipos: [
      { id: 30, nombre: 'Voley Sur', capitan: 'Sandra Vega', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(3000, ['Sandra Vega', 'Melina Cárdenas', 'Ruth Ayala', 'Cinthia Roca', 'Katia Duran', 'Yesica Balderrama']) },
    ],
    partidos: [],
  },
  {
    id: 5, creador_id: 99, creador: 'Juan García', creador_tipo: 'cliente',
    solicitud: { estado: 'pendiente', fecha: '28 Ago', resueltaPor: null, motivo: null },
    nombre: 'Torneo de Pádel Abierto', emoji: '🏓', deporte: 'Pádel', deporteKey: 'Pádel',
    empresa_id: 1, empresa: 'Sport Center', cancha: 'Cancha de Pádel',
    fechaInicio: '15 Mar', fechaFin: '20 Mar', inscripcionHasta: '12 Mar',
    precio: 80, estado: 'inscripciones',
    premios: { primero: 'Trofeo + Bs. 200', segundo: 'Medalla', tercero: '' },
    desc: 'Torneo de pádel en modalidad dobles para todos los niveles.',
    formato: 'Eliminación directa', jugadoresPorEquipo: 2, suplentes: 0, maxEquipos: 8,
    clasificanPorGrupo: 2,
    tieneAmarillas: false, tieneRojas: false, tieneGoles: false,
    reglas: ['Modalidad dobles', 'Partidos al mejor de 3 sets'],
    calendario: [
      { fase: 'Cuartos de Final', desc: 'Eliminación directa', fecha: '15-16 Mar' },
      { fase: 'Semifinales',      desc: 'Eliminación directa', fecha: '18 Mar'    },
      { fase: 'Final',            desc: 'Gran final',          fecha: '20 Mar'    },
    ],
    horarios: 'Lunes a Viernes: 6:00 PM - 9:00 PM',
    grupos: null,
    equipos: [],
    partidos: [],
  },
  {
    id: 6, creador_id: 20, creador: 'Zona Deportiva Oeste', creador_tipo: 'complejo',
    nombre: 'Open de Pádel Sportika', emoji: '🏓', deporte: 'Pádel', deporteKey: 'Pádel',
    empresa_id: 5, empresa: 'Zona Deportiva Oeste', cancha: 'Cancha de Pádel Principal',
    fechaInicio: '31 Mar', fechaFin: '6 Abr', inscripcionHasta: '27 Mar',
    precio: 80, estado: 'inscripciones',
    premios: { primero: 'Trofeo + Bs. 250', segundo: 'Medalla + Bs. 100', tercero: '' },
    desc: 'Torneo de pádel en modalidad dobles para deportistas de Cochabamba.',
    formato: 'Grupos + Eliminación', jugadoresPorEquipo: 2, suplentes: 0, maxEquipos: 18,
    clasificanPorGrupo: 2,
    tieneAmarillas: false, tieneRojas: false, tieneGoles: false,
    reglas: ['Modalidad dobles', 'Fase de grupos y luego eliminación directa'],
    calendario: [
      { fase: 'Fase de Grupos', desc: 'Todos contra todos dentro del grupo', fecha: '31 Mar - 3 Abr' },
      { fase: 'Semifinales',    desc: 'Eliminación directa',                 fecha: '5 Abr'          },
      { fase: 'Final',          desc: 'Gran final',                          fecha: '6 Abr'          },
    ],
    horarios: 'Lunes a Domingo: 6:00 AM - 9:00 PM',
    grupos: null,
    equipos: [
      { id: 40, nombre: 'Pádel Oeste', capitan: 'Juan Torres', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [], jugadores: roster(4000, ['Juan Torres', 'Marcelo Iriarte']) },
    ],
    partidos: [],
  },
  {
    // Torneo organizado por el propio complejo: su personal puede operar la mesa
    id: 7, creador_id: 1, creador: 'Sport Center', creador_tipo: 'complejo',
    nombre: 'Copa Interna Sport Center', emoji: '⚽', deporte: 'Fútbol', deporteKey: 'Fútbol',
    empresa_id: 1, empresa: 'Sport Center', cancha: 'Cancha de Fútbol Principal',
    fechaInicio: '22 Ago', fechaFin: '6 Sep', inscripcionHasta: '18 Ago',
    precio: 150, estado: 'en_curso',
    premios: { primero: 'Trofeo + Bs. 400', segundo: 'Medalla + Bs. 150', tercero: 'Medalla' },
    desc: 'Torneo organizado por Sport Center para los equipos del barrio. Fútbol 5 en la cancha principal.',
    formato: 'Grupos + Eliminación', jugadoresPorEquipo: 5, suplentes: 2, maxEquipos: 8,
    clasificanPorGrupo: 2,
    tieneAmarillas: true, tieneRojas: true, tieneGoles: true,
    reglas: [
      'Fútbol 5: mínimo 5 jugadores, máximo 7',
      'Partidos de 2 tiempos de 20 minutos',
      'Dos grupos de 3 equipos, clasifican los 2 primeros de cada grupo',
      'En caso de empate en semifinal o final: penales',
    ],
    calendario: [
      { fase: 'Fase de Grupos', desc: '2 grupos de 3 — todos contra todos', fecha: '22-30 Ago' },
      { fase: 'Semifinales',    desc: 'Clasifican los 2 primeros de cada grupo', fecha: '3 Sep' },
      { fase: 'Final',          desc: 'Gran final + 3er puesto',                 fecha: '6 Sep' },
    ],
    horarios: 'Sábados y Domingos: 3:00 PM - 8:00 PM',
    grupos: { A: [71, 72, 73], B: [74, 75, 76] },
    equipos: [
      { id: 71, nombre: 'Blanco Galindo FC', capitan: 'Efraín Rocha', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(7100, ['Efraín Rocha', 'Tito Salvatierra', 'Álvaro Mustafá', 'Nilo Barrientos', 'Percy Guzmán', 'Lucho Añez', 'Beto Mercado']) },
      { id: 72, nombre: 'Villa Pagador', capitan: 'Genaro Mamani', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(7200, ['Genaro Mamani', 'Justino Apaza', 'Remberto Quispe', 'Félix Huanca', 'Casimiro Poma', 'Teodoro Laime', 'Anselmo Vargas']) },
      { id: 73, nombre: 'Los Andes FC', capitan: 'Ramiro Balderrama', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(7300, ['Ramiro Balderrama', 'Óscar Encinas', 'Vladimir Rojas', 'Gustavo Camacho', 'Fidel Arispe', 'Marcial Vega', 'Herlan Siles']) },
      { id: 74, nombre: 'Juventud Norte', capitan: 'Álex Peñaranda', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(7400, ['Álex Peñaranda', 'Danny Zurita', 'Cristian Bejarano', 'Iván Terán', 'Mauricio Solís', 'Paúl Delgadillo', 'Jhon Trigo']) },
      { id: 75, nombre: 'Deportivo Quillacollo', capitan: 'Wálter Cabrera', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(7500, ['Wálter Cabrera', 'Edwin Claros', 'Rodolfo Pinaya', 'Israel Maldonado', 'Ronaldo Fuentes', 'Miguel Chumacero', 'Adalid Rivero']) },
      { id: 76, nombre: 'Alto Cochabamba', capitan: 'Sabino Colque', estado: 'aprobado', comprobante: 'comp.jpg', integrantes_ids: [],
        jugadores: roster(7600, ['Sabino Colque', 'Vicente Yujra', 'Eulogio Ticona', 'Nemesio Alanoca', 'Bernardo Chino', 'Julián Mamani', 'Zenón Aruquipa']) },
    ],
    partidos: [
      { id: 71, fase: 'grupos', grupo: 'A', equipo1_id: 71, equipo1: 'Blanco Galindo FC', equipo2_id: 72, equipo2: 'Villa Pagador',
        g1: 3, g2: 2, am1: 0, am2: 1, rj1: 0, rj2: 0, estado: 'finalizado', hora: '15:00', cancha: 'Cancha de Fútbol Principal', minuto: 40,
        eventos: [
          { tipo: 'gol',      jugador_id: 7105, jugador: 'Lucho Añez',       dorsal: 6, equipo_id: 71, equipo: 'Blanco Galindo FC', minuto: 5  },
          { tipo: 'gol',      jugador_id: 7203, jugador: 'Félix Huanca',     dorsal: 4, equipo_id: 72, equipo: 'Villa Pagador',     minuto: 11 },
          { tipo: 'gol',      jugador_id: 7105, jugador: 'Lucho Añez',       dorsal: 6, equipo_id: 71, equipo: 'Blanco Galindo FC', minuto: 23 },
          { tipo: 'amarilla', jugador_id: 7201, jugador: 'Justino Apaza',    dorsal: 2, equipo_id: 72, equipo: 'Villa Pagador',     minuto: 28 },
          { tipo: 'gol',      jugador_id: 7206, jugador: 'Anselmo Vargas',   dorsal: 7, equipo_id: 72, equipo: 'Villa Pagador',     minuto: 33 },
          { tipo: 'gol',      jugador_id: 7102, jugador: 'Álvaro Mustafá',   dorsal: 3, equipo_id: 71, equipo: 'Blanco Galindo FC', minuto: 38 },
        ] },
      { id: 72, fase: 'grupos', grupo: 'B', equipo1_id: 74, equipo1: 'Juventud Norte', equipo2_id: 75, equipo2: 'Deportivo Quillacollo',
        g1: 1, g2: 1, am1: 1, am2: 0, rj1: 0, rj2: 0, estado: 'finalizado', hora: '16:00', cancha: 'Cancha de Fútbol Principal', minuto: 40,
        eventos: [
          { tipo: 'gol',      jugador_id: 7404, jugador: 'Mauricio Solís',   dorsal: 5, equipo_id: 74, equipo: 'Juventud Norte',       minuto: 14 },
          { tipo: 'amarilla', jugador_id: 7402, jugador: 'Cristian Bejarano', dorsal: 3, equipo_id: 74, equipo: 'Juventud Norte',      minuto: 21 },
          { tipo: 'gol',      jugador_id: 7504, jugador: 'Ronaldo Fuentes',  dorsal: 5, equipo_id: 75, equipo: 'Deportivo Quillacollo', minuto: 36 },
        ] },
      { id: 73, fase: 'grupos', grupo: 'A', equipo1_id: 73, equipo1: 'Los Andes FC', equipo2_id: 71, equipo2: 'Blanco Galindo FC',
        g1: 0, g2: 1, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'en_vivo', hora: '17:00', cancha: 'Cancha de Fútbol Principal', minuto: 26,
        eventos: [
          { tipo: 'gol', jugador_id: 7106, jugador: 'Beto Mercado', dorsal: 7, equipo_id: 71, equipo: 'Blanco Galindo FC', minuto: 19 },
        ] },
      { id: 74, fase: 'grupos', grupo: 'B', equipo1_id: 76, equipo1: 'Alto Cochabamba', equipo2_id: 74, equipo2: 'Juventud Norte',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '18:00', cancha: 'Cancha de Fútbol Principal', minuto: null, eventos: [] },
      { id: 75, fase: 'grupos', grupo: 'A', equipo1_id: 72, equipo1: 'Villa Pagador', equipo2_id: 73, equipo2: 'Los Andes FC',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '15:00', cancha: 'Cancha de Fútbol Principal', minuto: null, eventos: [] },
      { id: 76, fase: 'grupos', grupo: 'B', equipo1_id: 75, equipo1: 'Deportivo Quillacollo', equipo2_id: 76, equipo2: 'Alto Cochabamba',
        g1: 0, g2: 0, am1: 0, am2: 0, rj1: 0, rj2: 0, estado: 'programado', hora: '16:00', cancha: 'Cancha de Fútbol Principal', minuto: null, eventos: [] },
    ],
  },
]

// ── Derivaciones: nadie escribe estos numeros a mano ────────────────────────
export const torneoPorId = (id) => TORNEOS.find(t => mismo(t.id, id)) || null

export const equiposAprobados = (t) => (t?.equipos || []).filter(e => e.estado === 'aprobado')

export const solicitudesPendientes = (t) => (t?.equipos || []).filter(e => e.estado === 'pendiente')

/** "8/16" — el unico lugar donde se arma ese texto. */
export const conteoEquipos = (t) => `${equiposAprobados(t).length}/${t?.maxEquipos ?? 0}`

export const torneosDeEmpresa = (empresaId) =>
  TORNEOS.filter(t => mismo(t.empresa_id, empresaId))

/** Torneos que organiza el propio complejo (no un cliente). */
export const torneosDelComplejo = (empresaId) =>
  torneosDeEmpresa(empresaId).filter(t => t.creador_tipo === 'complejo')

/** Torneos que un cliente quiere jugar en este complejo: el admin aprueba la cancha. */
export const solicitudesDeCancha = (empresaId) =>
  torneosDeEmpresa(empresaId).filter(t => t.creador_tipo === 'cliente')

/** Estado del pedido de cancha. Los del complejo no piden permiso a nadie. */
export const solicitudDe = (t) =>
  t.creador_tipo === 'complejo' ? { estado: 'aprobada' } : (t.solicitud || { estado: 'pendiente' })

// La fecha de hoy en Bolivia, como 'AAAA-MM-DD'
const hoyLocal = hoyBolivia

/** El organizador puso una fecha límite de inscripción y ya pasó. */
export const inscripcionVencida = (t) =>
  t.estado === 'inscripciones' && !!t.inscripcionHastaISO && t.inscripcionHastaISO < hoyLocal()

/**
 * Un torneo recibe equipos solo si las inscripciones estan abiertas, el
 * complejo ya aprobo la cancha y no paso la fecha limite. Mientras la
 * solicitud este pendiente o rechazada, el torneo existe pero nadie puede
 * inscribirse.
 */
export const aceptaInscripciones = (t) =>
  t.estado === 'inscripciones' && solicitudDe(t).estado === 'aprobada' && !inscripcionVencida(t)

export const ESTADO_SOLICITUD = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  aprobada:  { label: 'Aprobada',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  rechazada: { label: 'Rechazada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
}

/** Torneos creados por un cliente (los del complejo no cuentan como suyos). */
export const torneosCreadosPor = (usuarioId = USUARIO_ACTUAL.id) =>
  TORNEOS.filter(t => t.creador_tipo === 'cliente' && mismo(t.creador_id, usuarioId))

/**
 * El equipo del usuario en ese torneo. Si le rechazaron uno y volvio a
 * inscribirse, cuenta el nuevo: el rechazado solo se devuelve si no hay otro.
 */
export const miEquipoEn = (t, usuarioId = USUARIO_ACTUAL.id) => {
  const mios = (t?.equipos || []).filter(e => (e.integrantes_ids || []).some(x => mismo(x, usuarioId)))
  return mios.find(e => e.estado !== 'rechazado') || mios[0] || null
}

/**
 * Ya tiene un equipo pendiente o aprobado en el torneo: no puede inscribir otro.
 * Uno rechazado no cuenta, puede corregir lo que faltaba y volver a intentar.
 */
export const yaInscritoEn = (t, usuarioId = USUARIO_ACTUAL.id) => {
  const eq = miEquipoEn(t, usuarioId)
  return eq && eq.estado !== 'rechazado' ? eq : null
}

export const torneosDondeParticipa = (usuarioId = USUARIO_ACTUAL.id) =>
  TORNEOS.filter(t => miEquipoEn(t, usuarioId))

/** Equipos de un torneo agrupados como quedaron en el sorteo: { A: [equipo], B: [...] } */
export const equiposPorGrupo = (t) => {
  if (!t?.grupos) return null
  const porId = Object.fromEntries((t.equipos || []).map(e => [e.id, e]))
  // Ordenados por letra. El objeto se arma recorriendo los equipos, asi que
  // sin esto los grupos salian en el orden que devolvia la base: con ocho
  // grupos la pantalla de posiciones mostraba B, C, F, D, E, H, G, A.
  return Object.fromEntries(
    Object.entries(t.grupos)
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([g, ids]) => [g, ids.map(id => porId[id]).filter(Boolean)]))
}

/** Plantilla de cada equipo indexada por id: { 1: { nombre, jugadores } } */
export const plantillasDe = (t) =>
  Object.fromEntries((t?.equipos || []).map(e => [e.id, { nombre: e.nombre, jugadores: e.jugadores || [] }]))

export const ESTADO_TORNEO = {
  inscripciones: { label: 'Inscripciones Abiertas', corto: 'Abierto',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  en_curso:      { label: '🔴 EN CURSO',            corto: 'En Curso',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  finalizado:    { label: 'Finalizado',             corto: 'Finalizado', color: '#666',    bg: 'rgba(100,100,100,0.12)' },
}

// Pasada la fecha límite, el torneo deja de decir «Abierto» aunque el
// organizador todavía no lo haya empezado
const INSCRIPCIONES_CERRADAS = { label: 'Inscripciones cerradas', corto: 'Cerrado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }

/** El estado que se muestra de un torneo. */
export const estadoDeTorneo = (t) =>
  inscripcionVencida(t) ? INSCRIPCIONES_CERRADAS : ESTADO_TORNEO[t.estado]

export const SOLICITUD_BADGE = {
  aprobado:  { label: 'Aprobado',  color: '#22c55e' },
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  rechazado: { label: 'Rechazado', color: '#ef4444' },
}

// ── Canchas por complejo ────────────────────────
export const CANCHAS_POR_EMPRESA = {
  1: [
    { id: 1, nombre: 'Cancha de Fútbol Principal', deporte: 'Fútbol', precio: 120, disponible: true },
    { id: 4, nombre: 'Cancha de Wally 1',          deporte: 'Wally',  precio: 60,  disponible: true },
    { id: 7, nombre: 'Cancha de Pádel',            deporte: 'Pádel',  precio: 90,  disponible: true },
  ],
  2: [{ id: 2, nombre: 'Cancha de Baloncesto', deporte: 'Básquetbol', precio: 80, disponible: true }],
  3: [{ id: 3, nombre: 'Cancha de Voleibol',   deporte: 'Voleibol',   precio: 70, disponible: false }],
  4: [
    { id: 5, nombre: 'Cancha de Wally 1', deporte: 'Wally', precio: 60, disponible: true },
    { id: 6, nombre: 'Cancha de Wally 2', deporte: 'Wally', precio: 60, disponible: true },
    { id: 8, nombre: 'Cancha de Wally 3', deporte: 'Wally', precio: 60, disponible: true },
  ],
  5: [{ id: 9, nombre: 'Cancha de Pádel Principal', deporte: 'Pádel', precio: 90, disponible: true }],
}

export const canchasDeEmpresa = (empresaId) => CANCHAS_POR_EMPRESA[empresaId] || []

// Entrenamientos: horario informativo publicado por el admin. Sin inscripcion en linea.
export const ENTRENAMIENTOS_POR_EMPRESA = {
  1: [
    { id: 1, deporte: 'Fútbol', nombre: 'Fútbol Técnico Avanzado',  entrenador: 'Prof. Mario Quispe', dias: ['Lun','Mie','Vie'], horaInicio: '07:00', horaFin: '09:00', nivel: 'Avanzado',     precio: 150, descripcion: 'Entrenamiento técnico enfocado en control, pase y finalización para jugadores avanzados.' },
    { id: 2, deporte: 'Wally',  nombre: 'Wally para Principiantes', entrenador: 'Prof. Lucía Flores', dias: ['Mar','Jue'],       horaInicio: '18:00', horaFin: '20:00', nivel: 'Principiante', precio: 100, descripcion: 'Aprende las reglas y técnicas básicas del wally desde cero con nuestra entrenadora.' },
    { id: 3, deporte: 'Pádel',  nombre: 'Pádel Intermedio',         entrenador: 'Prof. Carlos Rojas', dias: ['Sab'],             horaInicio: '09:00', horaFin: '12:00', nivel: 'Intermedio',   precio: 120, descripcion: 'Clases de pádel para jugadores con base. Trabajamos táctica de dobles y golpes técnicos.' },
    { id: 10, deporte: 'Fútbol', nombre: 'Escuela de Fútbol Infantil', entrenador: 'Prof. Mario Quispe', dias: ['Sab','Dom'], horaInicio: '09:00', horaFin: '11:00', nivel: 'Principiante', precio: 80, paraNinos: true, edadMin: 6, edadMax: 12, descripcion: 'Escuela de fútbol para niños de 6 a 12 años. Técnica, trabajo en equipo y valores deportivos.' },
  ],
  2: [
    { id: 4, deporte: 'Básquetbol', nombre: 'Básquetbol Infantil',  entrenador: 'Prof. Ana López',   dias: ['Lun','Mie'],       horaInicio: '15:00', horaFin: '17:00', nivel: 'Principiante', precio: 80,  paraNinos: true, edadMin: 8, edadMax: 14, descripcion: 'Escuela de básquetbol para niños de 8 a 14 años.' },
    { id: 5, deporte: 'Básquetbol', nombre: 'Técnica y Tiro Libre', entrenador: 'Prof. Roberto Paz', dias: ['Mar','Jue','Sab'], horaInicio: '07:00', horaFin: '09:00', nivel: 'Intermedio',   precio: 130, descripcion: 'Perfeccionamiento de tiro libre, bandeja y defensas individuales.' },
  ],
  3: [{ id: 6, deporte: 'Voleibol', nombre: 'Voleibol Mixto Recreativo', entrenador: 'Prof. Sandra Vega', dias: ['Lun','Vie'], horaInicio: '18:00', horaFin: '20:00', nivel: 'Principiante', precio: 90, descripcion: 'Voleibol recreativo para adultos mixtos. Sin requisitos previos.' }],
  4: [
    { id: 7, deporte: 'Wally', nombre: 'Wally Competitivo', entrenador: 'Prof. Diego Ramos', dias: ['Mar','Jue','Sab'], horaInicio: '06:00', horaFin: '08:00', nivel: 'Avanzado',     precio: 160, descripcion: 'Entrenamiento de alta intensidad para jugadores que compiten en torneos.' },
    { id: 8, deporte: 'Wally', nombre: 'Wally para Niños',  entrenador: 'Prof. Elena Cruz',  dias: ['Mie','Vie'],       horaInicio: '17:00', horaFin: '19:00', nivel: 'Principiante', precio: 90,  paraNinos: true, edadMin: 6, edadMax: 12, descripcion: 'Introducción al wally para niños de 6 a 12 años. Ambiente amigable y divertido.' },
  ],
  5: [{ id: 9, deporte: 'Pádel', nombre: 'Pádel Dobles Profesional', entrenador: 'Prof. Juan Torres', dias: ['Lun','Mie','Vie'], horaInicio: '06:00', horaFin: '08:00', nivel: 'Avanzado', precio: 180, descripcion: 'Preparación profesional para torneos de pádel dobles. Alta exigencia técnica.' }],
}

export const entrenamientosDeEmpresa = (empresaId) => ENTRENAMIENTOS_POR_EMPRESA[empresaId] || []

// ── Partidos espontaneos ───────────────────────────────────────────────────
// Con la fecha y hora real del partido (migraciones/040)
const dentroDe = (m) => new Date(Date.now() + m * 60000).toISOString()
export const PARTIDOS_ESPONTANEOS = [
  { id: 1, empresa_id: 1, deporte: 'Fútbol 5',   cancha: 'Cancha de Fútbol Principal', fechaHora: dentroDe(0),  jugadoresUnidos: ['Carlos M.', 'Pedro R.', 'Ana L.', 'Luis F.'], maxJugadores: 10, creadorId: 5, creador: 'Carlos M.', apuesta: 'Perdedores invitan refrescos' },
  { id: 2, empresa_id: 1, deporte: 'Wally',      cancha: 'Cancha de Wally 1',          fechaHora: dentroDe(60), jugadoresUnidos: ['Luisa R.'], maxJugadores: 2, creadorId: 7, creador: 'Luisa R.', apuesta: null },
  { id: 3, empresa_id: 2, deporte: 'Básquetbol', cancha: 'Cancha de Baloncesto',       fechaHora: dentroDe(30), jugadoresUnidos: ['Ana L.', 'Mario S.'], maxJugadores: 10, creadorId: 8, creador: 'Ana L.', apuesta: null },
  { id: 4, empresa_id: 4, deporte: 'Wally',      cancha: 'Cancha de Wally 3',          fechaHora: dentroDe(60), jugadoresUnidos: ['Juan R.'], maxJugadores: 2, creadorId: 9, creador: 'Juan R.', apuesta: 'Perdedores invitan almuerzo' },
]

// Los que todavía se pueden jugar: una hora después de empezar, el partido
// ya se jugó y no aparece en las listas (sí cuenta en el perfil de quien jugó)
export const partidosVigentes = () => PARTIDOS_ESPONTANEOS.filter(p => !yaSeJugo(p.fechaHora))

export const partidosDeEmpresa = (empresaId) =>
  partidosVigentes().filter(p => mismo(p.empresa_id, empresaId))

// ─────────────────────────────────────────────────────────────────────────────
// EMPLEADOS
//
// El Administrador crea la cuenta (usuario y contrasena) y le activa uno por uno
// los permisos. Cada accion que el empleado realiza queda registrada en BITACORA
// para que el Administrador la revise. Solo el Administrador puede cambiar la
// contrasena o dar de baja la cuenta.
// ─────────────────────────────────────────────────────────────────────────────

/** Permisos que el Administrador activa o desactiva por cada empleado. */
export const PERMISOS_EMPLEADO = [
  { key: 'reservas_confirmar', icon: '✅', label: 'Confirmar reservas',
    desc: 'Revisar el comprobante de pago y aprobar o rechazar la reserva' },
  { key: 'reservas_crear', icon: '🧾', label: 'Reserva presencial',
    desc: 'Registrar al cliente que llega sin la app y cobrarle en efectivo o con el QR del complejo' },
  { key: 'asistencia', icon: '📍', label: 'Marcar asistencia',
    desc: 'Registrar si el cliente se presentó o no a su reserva' },
  { key: 'recompensas', icon: '🎁', label: 'Entregar recompensas',
    desc: 'Validar los puntos del cliente y entregar el premio canjeado' },
  { key: 'canchas_estado', icon: '🛠️', label: 'Estado de cancha',
    desc: 'Marcar una cancha fuera de servicio por mantenimiento' },
  { key: 'entrenamientos', icon: '🏃', label: 'Ver entrenamientos',
    desc: 'Consultar el horario de entrenamientos del día' },
  { key: 'torneos_mesa', icon: '⚙️', label: 'Mesa técnica',
    desc: 'Registrar goles y tarjetas durante un partido del torneo' },
]

export const PERMISOS_POR_DEFECTO = ['reservas_confirmar', 'reservas_crear', 'asistencia', 'recompensas']

/** Fijo: ningun empleado puede hacer esto, sin importar los permisos que tenga. */
export const RESTRICCIONES_EMPLEADO = [
  'Crear, editar o eliminar canchas y sus precios',
  'Ver ingresos o reportes financieros del complejo',
  'Crear, editar o eliminar cuentas de empleado',
  'Crear o cancelar torneos',
  'Eliminar registros del historial',
  'Modificar los datos del complejo',
]

// El turno es informativo: sirve para saber a quien buscar a cada hora, no
// limita nada. Muchos complejos chicos tienen una sola persona todo el dia,
// por eso se puede dejar sin turno.
export const TURNOS = [
  'Mañana (06:00 - 14:00)',
  'Tarde (14:00 - 22:00)',
  'Noche (16:00 - 23:00)',
  'Todo el día',
  'Rotativo',
]

export const EMPLEADOS = [
  { id: 1, empresa_id: 1, nombre: 'Rosa Villarroel', usuario: 'rosa.v', telefono: '765-43210',
    turno: 'Mañana (06:00 - 14:00)', activo: true, creado: '12 Ene 2026',
    permisos: ['reservas_confirmar', 'reservas_crear', 'asistencia', 'recompensas'] },
  { id: 2, empresa_id: 1, nombre: 'Willy Aramayo', usuario: 'willy.a', telefono: '712-88541',
    turno: 'Tarde (14:00 - 22:00)', activo: true, creado: '12 Ene 2026',
    permisos: ['reservas_confirmar', 'asistencia', 'canchas_estado', 'torneos_mesa'] },
  { id: 3, empresa_id: 1, nombre: 'Nelson Choque', usuario: 'nelson.c', telefono: '708-11223',
    turno: 'Noche (16:00 - 23:00)', activo: false, creado: '03 Mar 2026',
    permisos: ['reservas_confirmar'] },
]

export const empleadosDeEmpresa = (empresaId) =>
  EMPLEADOS.filter(e => mismo(e.empresa_id, empresaId))

/** Un empleado dado de baja no puede hacer nada, tenga los permisos que tenga. */
export const puede = (empleado, permiso) =>
  Boolean(empleado?.activo) && (empleado?.permisos || []).includes(permiso)

/** Empleado con la sesion abierta. Lo llena src/lib/auth.jsx al entrar. */
export const EMPLEADO_ACTUAL = { id: null, empresa_id: null, nombre: '', turno: null, permisos: [], activo: true }

// ── Bitácora: toda acción del empleado queda registrada ────────────────────
export const BITACORA = [
  { id: 1, empresa_id: 1, empleado_id: 1, empleado: 'Rosa Villarroel', tipo: 'reserva',
    accion: 'Confirmó una reserva', detalle: 'RSV-2026-00142 · Carlos M. · Cancha de Fútbol Principal 09:00',
    fecha: '30 Ago 2026', hora: '08:14' },
  { id: 2, empresa_id: 1, empleado_id: 1, empleado: 'Rosa Villarroel', tipo: 'recompensa',
    accion: 'Entregó una recompensa', detalle: 'Refresco gratis (150 pts) · Ana L.',
    fecha: '30 Ago 2026', hora: '08:31' },
  { id: 3, empresa_id: 1, empleado_id: 1, empleado: 'Rosa Villarroel', tipo: 'reserva',
    accion: 'Rechazó una reserva', detalle: 'RSV-2026-00151 · Pedro R. · comprobante ilegible',
    fecha: '30 Ago 2026', hora: '09:02' },
  { id: 4, empresa_id: 1, empleado_id: 2, empleado: 'Willy Aramayo', tipo: 'cancha',
    accion: 'Marcó una cancha fuera de servicio', detalle: 'Cancha de Wally 1 · piso mojado por lluvia',
    fecha: '29 Ago 2026', hora: '17:45' },
  { id: 5, empresa_id: 1, empleado_id: 2, empleado: 'Willy Aramayo', tipo: 'asistencia',
    accion: 'Marcó inasistencia', detalle: 'RSV-2026-00139 · Luis G. no se presentó',
    fecha: '29 Ago 2026', hora: '16:10' },
]

export const bitacoraDeEmpresa = (empresaId) =>
  BITACORA.filter(b => mismo(b.empresa_id, empresaId))

export const TIPO_BITACORA = {
  reserva:    { icon: '📅', color: '#00BCD4' },
  recompensa: { icon: '🎁', color: '#f59e0b' },
  cancha:     { icon: '🛠️', color: '#8b5cf6' },
  asistencia: { icon: '📍', color: '#22c55e' },
  torneo:     { icon: '⚙️', color: '#ef4444' },
  cuenta:     { icon: '🔑', color: '#888'    },
}

// ── Reservas del complejo: lo que el empleado atiende en el mostrador ──────
export const RESERVAS_EMPRESA = [
  { id: 1, nro: 'RSV-2026-00160', empresa_id: 1, cliente_id: 21, cliente: 'Carlos Mamani', telefono: '765-11223',
    cancha: 'Cancha de Fútbol Principal', fecha: 'Hoy', horaInicio: '09:00', horaFin: '10:00',
    monto: 120, estado: 'pendiente', comprobante: true, asistencia: null, origen: 'app', atendidoPor: null },
  { id: 2, nro: 'RSV-2026-00161', empresa_id: 1, cliente_id: 8, cliente: 'Ana López', telefono: '712-99001',
    cancha: 'Cancha de Wally 1', fecha: 'Hoy', horaInicio: '10:00', horaFin: '11:00',
    monto: 60, estado: 'pendiente', comprobante: true, asistencia: null, origen: 'app', atendidoPor: null },
  { id: 3, nro: 'RSV-2026-00162', empresa_id: 1, cliente_id: 0, cliente: 'Pedro Rojas', telefono: '708-44556',
    cancha: 'Cancha de Pádel', fecha: 'Hoy', horaInicio: '11:00', horaFin: '12:00',
    monto: 90, estado: 'pendiente', comprobante: false, asistencia: null, origen: 'app', atendidoPor: null },
  { id: 4, nro: 'RSV-2026-00158', empresa_id: 1, cliente_id: 0, cliente: 'María Sejas', telefono: '760-33445',
    cancha: 'Cancha de Fútbol Principal', fecha: 'Hoy', horaInicio: '14:00', horaFin: '15:00',
    monto: 120, estado: 'confirmada', comprobante: true, asistencia: null, origen: 'app', atendidoPor: 'Rosa Villarroel' },
  { id: 5, nro: 'RSV-2026-00157', empresa_id: 1, cliente_id: 0, cliente: 'Luis Guzmán', telefono: '719-77889',
    cancha: 'Cancha de Wally 1', fecha: 'Hoy', horaInicio: '07:00', horaFin: '08:00',
    monto: 60, estado: 'confirmada', comprobante: true, asistencia: 'presente', origen: 'presencial', atendidoPor: 'Rosa Villarroel' },
  { id: 6, nro: 'RSV-2026-00155', empresa_id: 1, cliente_id: 0, cliente: 'Jorge Paz', telefono: '733-10101',
    cancha: 'Cancha de Pádel', fecha: 'Hoy', horaInicio: '08:00', horaFin: '09:00',
    monto: 90, estado: 'confirmada', comprobante: true, asistencia: 'ausente', origen: 'app', atendidoPor: 'Willy Aramayo' },
  // Reservas de Juan Garcída en distintos complejos (las que ve en Mi Perfil)
  { id: 7, nro: 'RSV-2026-00142', empresa_id: 1, cliente_id: 99, cliente: 'Juan García', telefono: '700-12345',
    cancha: 'Cancha de Fútbol Principal', fecha: '28 May 2026', horaInicio: '15:00', horaFin: '16:00',
    monto: 120, estado: 'confirmada', comprobante: true, asistencia: 'presente', origen: 'app', atendidoPor: 'Rosa Villarroel' },
  { id: 8, nro: 'RSV-2026-00155', empresa_id: 1, cliente_id: 99, cliente: 'Juan García', telefono: '700-12345',
    cancha: 'Cancha de Pádel', fecha: '30 May 2026', horaInicio: '18:00', horaFin: '19:00',
    monto: 90, estado: 'pendiente', comprobante: true, asistencia: null, origen: 'app', atendidoPor: null },
  { id: 9, nro: 'RSV-2026-00138', empresa_id: 2, cliente_id: 99, cliente: 'Juan García', telefono: '700-12345',
    cancha: 'Cancha de Baloncesto', fecha: '22 May 2026', horaInicio: '10:00', horaFin: '11:00',
    monto: 80, estado: 'confirmada', comprobante: true, asistencia: 'presente', origen: 'app', atendidoPor: 'Admin Gimnasio Central' },
  { id: 10, nro: 'RSV-2026-00121', empresa_id: 4, cliente_id: 99, cliente: 'Juan García', telefono: '700-12345',
    cancha: 'Cancha de Wally 2', fecha: '10 May 2026', horaInicio: '08:00', horaFin: '09:00',
    monto: 60, estado: 'rechazada', comprobante: false, asistencia: null, origen: 'app', atendidoPor: 'Admin Complejo Deportivo Este' },
]

export const reservasDeEmpresa = (empresaId) =>
  RESERVAS_EMPRESA.filter(r => mismo(r.empresa_id, empresaId))

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS DE GESTIÓN
//
// Objetivo 2 del proyecto: que el Administrador vea los días con mayor demanda
// de canchas y los horarios más utilizados para tomar decisiones.
// Los valores salen del historial de reservas del complejo.
// ─────────────────────────────────────────────────────────────────────────────

export const ESTADISTICAS = {
  1: {
    periodo: 'Últimos 30 días',
    totalReservas: 248,
    horasVendidas: 248,
    ocupacion: 62,          // % de las franjas disponibles que se ocuparon
    ingresoMes: 3240,
    // Reservas por día de la semana
    porDia: [
      { dia: 'Lun', reservas: 22 },
      { dia: 'Mar', reservas: 26 },
      { dia: 'Mié', reservas: 24 },
      { dia: 'Jue', reservas: 31 },
      { dia: 'Vie', reservas: 44 },
      { dia: 'Sáb', reservas: 58 },
      { dia: 'Dom', reservas: 43 },
    ],
    // Reservas por franja horaria
    porHora: [
      { hora: '06:00', reservas: 8  },
      { hora: '07:00', reservas: 14 },
      { hora: '08:00', reservas: 11 },
      { hora: '09:00', reservas: 9  },
      { hora: '10:00', reservas: 12 },
      { hora: '11:00', reservas: 10 },
      { hora: '12:00', reservas: 6  },
      { hora: '13:00', reservas: 5  },
      { hora: '14:00', reservas: 9  },
      { hora: '15:00', reservas: 16 },
      { hora: '16:00', reservas: 21 },
      { hora: '17:00', reservas: 27 },
      { hora: '18:00', reservas: 34 },
      { hora: '19:00', reservas: 31 },
      { hora: '20:00', reservas: 23 },
      { hora: '21:00', reservas: 12 },
    ],
    // Uso por cancha
    porCancha: [
      { cancha: 'Cancha de Fútbol Principal', reservas: 128, ingreso: 15360 },
      { cancha: 'Cancha de Wally 1',          reservas: 74,  ingreso: 4440  },
      { cancha: 'Cancha de Pádel',            reservas: 46,  ingreso: 4140  },
    ],
    // Cuántas reservas se cancelaron o no se presentaron
    noShow: 11,
    canceladas: 7,
  },
}

// Un complejo recién creado, o uno sin reservas todavia, no tiene estadisticas.
// Se devuelve la misma forma vacia en vez de null: asi la pantalla muestra
// ceros en lugar de romperse.
const SIN_ESTADISTICAS = {
  periodo: 'Sin datos todavía', totalReservas: 0, horasVendidas: 0,
  ocupacion: 0, ingresoMes: 0, horasDeTorneo: 0, noShow: 0, canceladas: 0,
  porDia: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(dia => ({ dia, reservas: 0 })),
  porHora: [], porCancha: [],
}

export const estadisticasDe = (empresaId) => ESTADISTICAS[empresaId] || SIN_ESTADISTICAS

/**
 * El pico de una serie, para dibujar las barras y para resaltar el maximo.
 *
 * Un complejo recién aprobado no tiene canchas ni reservas, asi que la serie
 * llega vacia. Antes eso devolvia undefined y la pantalla del administrador
 * quedaba en blanco al leerle un campo. Ahora devuelve null: quien lo use
 * tiene que contemplar que todavia no hay datos.
 */
export const pico = (serie, campo = 'reservas') =>
  serie?.length
    ? serie.reduce((max, x) => (x[campo] > max[campo] ? x : max), serie[0])
    : null

// ─────────────────────────────────────────────────────────────────────────────
// RECOMPENSAS
//
// Un solo catálogo por complejo. El Administrador lo define y es exactamente
// el mismo que ve el cliente en el perfil del complejo y en Recompensas.
// Antes había tres listas distintas con precios distintos para el mismo premio.
// ─────────────────────────────────────────────────────────────────────────────

export const TIPO_RECOMPENSA = {
  fisico:            { label: 'Premio físico',        icon: '🎁' },
  descuento_reserva: { label: 'Descuento en reserva', icon: '🏷️' },
  torneo_gratis:     { label: 'Inscripción a torneo', icon: '🏆' },
}

export const RECOMPENSAS_POR_EMPRESA = {
  1: [
    { id: 6, empresa_id: 1, nombre: 'Botella de agua',           icono: '💧', tipo: 'fisico',            descripcion: 'Una botella de agua fría al terminar tu partido',    puntos: 50,   stock: 40, canjeados: 22, activa: true  },
    { id: 1, empresa_id: 1, nombre: 'Refresco gratis',          icono: '🥤', tipo: 'fisico',            descripcion: 'Un refresco de tu elección en las instalaciones',    puntos: 150,  stock: 20, canjeados: 8, activa: true  },
    { id: 2, empresa_id: 1, nombre: 'Descuento 20% en reserva', icono: '🏷️', tipo: 'descuento_reserva', descripcion: 'Aplica en tu próxima reserva de cancha',             puntos: 300,  stock: 10, canjeados: 5, activa: true  },
    { id: 3, empresa_id: 1, nombre: '1 hora de cancha gratis',  icono: '🏟️', tipo: 'descuento_reserva', descripcion: 'Una hora de uso en cualquier cancha disponible',     puntos: 500,  stock: 5,  canjeados: 2, activa: true  },
    { id: 4, empresa_id: 1, nombre: 'Inscripción gratis torneo',icono: '🏆', tipo: 'torneo_gratis',     descripcion: 'Inscripción sin costo al próximo torneo',            puntos: 800,  stock: 2,  canjeados: 1, activa: true  },
    { id: 5, empresa_id: 1, nombre: 'Kit deportivo Sportika',   icono: '👕', tipo: 'fisico',            descripcion: 'Camiseta + medias + botella oficial Sportika',       puntos: 1000, stock: 3,  canjeados: 0, activa: false },
  ],
  2: [
    { id: 10, empresa_id: 2, nombre: 'Botella de agua gratis',  icono: '💧', tipo: 'fisico',            descripcion: 'Botella de agua fría en el gimnasio',                puntos: 100, stock: 30, canjeados: 12, activa: true },
    { id: 11, empresa_id: 2, nombre: '1 hora de cancha gratis', icono: '🏀', tipo: 'descuento_reserva', descripcion: 'Una hora en la cancha de básquetbol',                puntos: 400, stock: 8,  canjeados: 3,  activa: true },
  ],
  3: [
    { id: 20, empresa_id: 3, nombre: 'Snack deportivo gratis',  icono: '🍫', tipo: 'fisico',            descripcion: 'Un snack deportivo al terminar tu partido',          puntos: 120, stock: 25, canjeados: 6, activa: true },
  ],
  4: [
    { id: 30, empresa_id: 4, nombre: 'Refresco gratis',         icono: '🥤', tipo: 'fisico',            descripcion: 'Un refresco en las instalaciones',                   puntos: 150, stock: 20, canjeados: 9, activa: true },
    { id: 31, empresa_id: 4, nombre: '1 hora de cancha gratis', icono: '🎾', tipo: 'descuento_reserva', descripcion: 'Una hora en las canchas de wally',                   puntos: 400, stock: 5,  canjeados: 2, activa: true },
  ],
  5: [
    { id: 40, empresa_id: 5, nombre: 'Refresco gratis',         icono: '🥤', tipo: 'fisico',            descripcion: 'Un refresco en las instalaciones',                   puntos: 150, stock: 15, canjeados: 4, activa: true },
  ],
}

export const recompensasDeEmpresa = (empresaId) => RECOMPENSAS_POR_EMPRESA[empresaId] || []

/** Catálogo completo que ve el cliente: las recompensas activas de todos los complejos. */
/**
 * Cuántas quedan de una recompensa. El stock es lo que el complejo ofreció en
 * total; cada canje se lleva una. Antes se mostraba el stock tal cual, y una
 * recompensa con 5 de stock y 3 canjes seguía diciendo "5 disponibles".
 */
export const quedanDe = (r) => Math.max((Number(r?.stock) || 0) - (Number(r?.canjeados) || 0), 0)

/** Cómo se usa el código de un canje. Depende de lo que se canjeó: antes la
 * botella de agua decía que el código era para inscribir un equipo. */
export const comoUsarCanje = (tipo, empresa = 'el complejo') =>
  tipo === 'descuento_reserva' ? `Ingresa este código al hacer tu reserva en ${empresa}: el descuento se aplica solo.`
  : tipo === 'torneo_gratis'   ? `Ingresa este código al inscribir tu equipo en un torneo de ${empresa}.`
  : `Muestra este código en el mostrador de ${empresa}. El personal lo valida y te entrega tu premio.`

/** Las que un cliente puede ver en un complejo: solo las activas. */
export const recompensasVisibles = (empresaId) =>
  recompensasDeEmpresa(empresaId).filter(r => r.activa)

export const catalogoRecompensas = () =>
  empresasActivas().flatMap(e => recompensasDeEmpresa(e.id)
    .filter(r => r.activa)
    .map(r => ({ ...r, empresa: e.nombre })))

// ── Niveles de puntos ──────────────────────────────────────────────────────
export const NIVELES = [
  { nombre: 'Principiante', desde: 0,   hasta: 100  },
  { nombre: 'Intermedio',   desde: 101, hasta: 250  },
  { nombre: 'Experto',      desde: 251, hasta: Infinity },
]

export const nivelDe = (puntos) =>
  NIVELES.find(n => puntos >= n.desde && puntos <= n.hasta) || NIVELES[0]

/** «1 pt», «2 pts»: un solo punto no va en plural («Se descontaron 1 pts»). */
export const pts = (n) => n + (Math.abs(Number(n)) === 1 ? ' pt' : ' pts')

export const FORMAS_DE_GANAR_PUNTOS = [
  { accion: 'Reservar una cancha',        puntos: 5  },
  { accion: 'Completar la reserva',       puntos: 5  },
  { accion: 'Participar en un partido',   puntos: 10 },
  { accion: 'Inscribirse en un torneo',   puntos: 15 },
  { accion: 'Calificar un complejo',      puntos: 5  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CALIFICACIONES
// Las mismas reseñas que ve el cliente en el complejo son las que el
// Administrador responde desde su panel.
// ─────────────────────────────────────────────────────────────────────────────

export const CALIFICACIONES_POR_EMPRESA = {
  1: [
    { id: 1, empresa_id: 1, usuario: 'Carlos M.', avatar: 'CM', estrellas: 5, fecha: '28 May 2026', comentario: 'Excelentes canchas, iluminación nocturna de primer nivel. Muy recomendado.',       respuesta: null },
    { id: 2, empresa_id: 1, usuario: 'Ana L.',    avatar: 'AL', estrellas: 4, fecha: '22 May 2026', comentario: 'Buena atención y canchas en buen estado. El estacionamiento es un poco limitado.', respuesta: null },
    { id: 3, empresa_id: 1, usuario: 'Pedro G.',  avatar: 'PG', estrellas: 5, fecha: '15 May 2026', comentario: 'El mejor complejo de la zona norte. Siempre limpio y bien organizado.',             respuesta: '¡Gracias Pedro! Te esperamos pronto.' },
    { id: 4, empresa_id: 1, usuario: 'María S.',  avatar: 'MS', estrellas: 3, fecha: '10 May 2026', comentario: 'Las canchas están bien pero los vestuarios necesitan mantenimiento.',               respuesta: null },
    { id: 5, empresa_id: 1, usuario: 'Juan R.',   avatar: 'JR', estrellas: 5, fecha: '05 May 2026', comentario: 'Perfectas instalaciones. Los entrenamientos son muy profesionales.',                respuesta: 'Gracias por tu comentario, nos alegra que disfrutes el complejo.' },
  ],
  2: [
    { id: 10, empresa_id: 2, usuario: 'Luis F.',   avatar: 'LF', estrellas: 5, fecha: '25 May 2026', comentario: 'La cancha de básquetbol con piso de madera es increíble. Vale cada centavo.', respuesta: null },
    { id: 11, empresa_id: 2, usuario: 'Sandra V.', avatar: 'SV', estrellas: 4, fecha: '18 May 2026', comentario: 'Buen lugar, los entrenadores son muy profesionales.',                          respuesta: null },
    { id: 12, empresa_id: 2, usuario: 'Diego R.',  avatar: 'DR', estrellas: 4, fecha: '12 May 2026', comentario: 'Excelente ambiente para practicar básquetbol en el centro de la ciudad.',      respuesta: null },
  ],
  3: [
    { id: 20, empresa_id: 3, usuario: 'Elena C.', avatar: 'EC', estrellas: 4, fecha: '20 May 2026', comentario: 'Buen complejo para voleibol, canchas limpias y personal amable.', respuesta: null },
    { id: 21, empresa_id: 3, usuario: 'Mario Q.', avatar: 'MQ', estrellas: 3, fecha: '14 May 2026', comentario: 'Está bien pero los horarios son un poco limitados.',              respuesta: null },
  ],
  4: [
    { id: 30, empresa_id: 4, usuario: 'Lucía T.',   avatar: 'LT', estrellas: 5, fecha: '27 May 2026', comentario: 'Las canchas de wally son las mejores de Cochabamba. Iluminación LED perfecta.', respuesta: null },
    { id: 31, empresa_id: 4, usuario: 'Roberto P.', avatar: 'RP', estrellas: 5, fecha: '21 May 2026', comentario: 'Tres canchas techadas, siempre disponibles. El ambiente es muy bueno.',         respuesta: null },
    { id: 32, empresa_id: 4, usuario: 'Fátima R.',  avatar: 'FR', estrellas: 4, fecha: '16 May 2026', comentario: 'Muy buenas instalaciones, los precios son justos para la calidad que ofrecen.', respuesta: null },
  ],
  5: [
    { id: 40, empresa_id: 5, usuario: 'Pablo M.',    avatar: 'PM', estrellas: 5, fecha: '29 May 2026', comentario: 'Los torneos semanales de pádel son espectaculares. Muy bien organizados.', respuesta: null },
    { id: 41, empresa_id: 5, usuario: 'Verónica H.', avatar: 'VH', estrellas: 4, fecha: '23 May 2026', comentario: 'Excelentes canchas de pádel. El entrenador es muy bueno.',                 respuesta: null },
  ],
}

export const calificacionesDeEmpresa = (empresaId) => CALIFICACIONES_POR_EMPRESA[empresaId] || []

// ── Comentarios ────────────────────────────────────────────────────────────
// Van aparte de las calificaciones a proposito: la calificacion es un voto y
// hay una sola por persona, porque arma el promedio. El comentario es
// conversacion y no tiene por que estar limitado.
//
// Cada uno puede colgar de nada (comentario suelto sobre el complejo), de una
// reseña, o de otro comentario.
export const COMENTARIOS_POR_EMPRESA = {}

export const comentariosDeEmpresa = (empresaId) => COMENTARIOS_POR_EMPRESA[empresaId] || []

/**
 * Arma el hilo: cada comentario con los que le responden adentro.
 *
 * Se calcula al mostrar y no se guarda armado, porque la base guarda una lista
 * plana con «a quien le respondo» y de ahi sale cualquier forma que necesite
 * la pantalla.
 */
export function hiloDeComentarios(empresaId, { calificacionId = null } = {}) {
  const todos = comentariosDeEmpresa(empresaId)
  const hijos = {}
  for (const c of todos) {
    if (c.responde_a) (hijos[c.responde_a] ??= []).push(c)
  }
  const conRespuestas = (c) => ({ ...c, respuestas: (hijos[c.id] || []).map(conRespuestas) })

  // Los comentarios que antes colgaban de una reseña ahora son parte del
  // mismo hilo: estrellas y comentarios van por separado
  return todos
    .filter(c => !c.responde_a && (!calificacionId || mismo(c.calificacion_id, calificacionId)))
    .map(conRespuestas)
}

/** Promedio con un decimal. El mismo número en el perfil del complejo y en el panel del admin. */
export const promedioEstrellas = (cals) =>
  !cals || cals.length === 0 ? 0 : (cals.reduce((s, c) => s + c.estrellas, 0) / cals.length).toFixed(1)

// ─────────────────────────────────────────────────────────────────────────────
// USUARIOS (vista del Super Admin)
// Los clientes salen de esta lista; los administradores, de EMPRESAS;
// los empleados, de EMPLEADOS. Así nunca hay un usuario que exista en una
// pantalla y no en la otra.
// ─────────────────────────────────────────────────────────────────────────────

export const CLIENTES = [
  { id: 99, nombre: 'Juan García',    email: 'juan.garcia@sportika.bo', puntos: 75,  reservas: 12, estado: 'activo', alta: '10 Ene 2026' },
  { id: 5,  nombre: 'Marco Flores',   email: 'marco@email.com',         puntos: 120, reservas: 8,  estado: 'activo', alta: '10 Ene 2026' },
  { id: 7,  nombre: 'Luisa Rocha',    email: 'luisa@email.com',         puntos: 85,  reservas: 5,  estado: 'activo', alta: '12 Ene 2026' },
  { id: 8,  nombre: 'Ana López',      email: 'ana.lopez@email.com',     puntos: 210, reservas: 17, estado: 'activo', alta: '14 Ene 2026' },
  { id: 9,  nombre: 'Juan Rivas',     email: 'juanr@email.com',         puntos: 45,  reservas: 3,  estado: 'activo', alta: '25 Ene 2026' },
  { id: 12, nombre: 'Diego Ramos',    email: 'diego@email.com',         puntos: 310, reservas: 24, estado: 'activo', alta: '28 Ene 2026' },
  { id: 15, nombre: 'Sandra Vega',    email: 'sandra.v@email.com',      puntos: 60,  reservas: 4,  estado: 'activo', alta: '02 Feb 2026' },
  { id: 20, nombre: 'Juan Torres',    email: 'juant@email.com',         puntos: 155, reservas: 11, estado: 'activo', alta: '05 Feb 2026' },
  { id: 21, nombre: 'Carlos Mamani',  email: 'carlosm@email.com',       puntos: 30,  reservas: 2,  estado: 'suspendido', alta: '08 Feb 2026' },
]

export const ROL_USUARIO = {
  cliente:       { label: 'Cliente',       color: '#00BCD4', bg: 'rgba(0,188,212,0.1)'  },
  admin_empresa: { label: 'Admin Empresa', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  empleado:      { label: 'Empleado',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  superadmin:    { label: 'Super Admin',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

/**
 * Los usuarios tal como estan en la base. La llena carga.js consultando
 * profiles; el super administrador es el unico que los ve a todos.
 */
export const USUARIOS = []

/**
 * Todos los usuarios del sistema.
 *
 * Se prefiere la lista que viene de la base, porque trae el identificador real
 * de cada uno: la de abajo se arma pegando prefijos ('c', 'a', 'e') a ids de
 * otras tablas, asi que servia para mostrar pero no para actuar sobre nadie.
 * Ademas dejaba fuera a los super administradores.
 */
export const todosLosUsuarios = () =>
  USUARIOS.length ? USUARIOS : usuariosArmados()

const usuariosArmados = () => [
  ...CLIENTES.map(c => ({
    id: 'c' + c.id, nombre: c.nombre, email: c.email, rol: 'cliente',
    puntos: c.puntos, reservas: c.reservas, estado: c.estado, alta: c.alta, empresa: null,
  })),
  ...EMPRESAS.map(e => ({
    id: 'a' + e.id, nombre: e.admin, email: e.adminEmail, rol: 'admin_empresa',
    puntos: 0, reservas: 0,
    estado: e.estado === 'suspendido' ? 'suspendido' : e.estado === 'pendiente' ? 'pendiente' : 'activo',
    alta: e.fechaSolicitud, empresa: e.nombre,
  })),
  ...EMPLEADOS.map(em => ({
    id: 'e' + em.id, nombre: em.nombre, email: em.usuario + '@sportika.bo', rol: 'empleado',
    puntos: 0, reservas: 0, estado: em.activo ? 'activo' : 'suspendido',
    alta: em.creado, empresa: empresaPorId(em.empresa_id)?.nombre || null,
  })),
]

// ── Resumen global para el Super Admin: todo calculado, nada a mano ─────────
export const resumenGlobal = () => {
  const usuarios = todosLosUsuarios()
  // Solo las que pidio un cliente. Las jornadas de un torneo tambien se
  // guardan como reservas para tomar la cancha, pero contarlas aca inflaba el
  // total del sistema con horas que nadie reservo.
  const reservas = RESERVAS_EMPRESA.filter(r => r.origen !== 'torneo')
  return {
    empresasActivas:    EMPRESAS.filter(e => e.estado === 'activo').length,
    empresasPendientes: EMPRESAS.filter(e => e.estado === 'pendiente').length,
    empresasSuspend:    EMPRESAS.filter(e => e.estado === 'suspendido').length,
    usuariosTotales:    usuarios.length,
    clientes:           CLIENTES.length,
    canchasTotales:     empresasActivas().reduce((a, e) => a + canchasDeEmpresa(e.id).length, 0),
    torneosActivos:     TORNEOS.filter(t => t.estado === 'en_curso' || t.estado === 'inscripciones').length,
    torneosEnCurso:     TORNEOS.filter(t => t.estado === 'en_curso').length,
    partidosAbiertos:   partidosVigentes().length,
    reservasTotales:    reservas.length,
    reservasPendientes: reservas.filter(r => r.estado === 'pendiente').length,
    puntosOtorgados:    CLIENTES.reduce((a, c) => a + c.puntos, 0),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRENADORES
// La lista sale de los entrenamientos publicados: si alguien dicta un
// entrenamiento aparece aqui, y cada entrenador muestra los suyos de verdad.
// ─────────────────────────────────────────────────────────────────────────────

export const ENTRENADORES = [
  { id: 1, empresa_id: 1, nombre: 'Prof. Mario Quispe', email: 'mario.quispe@sportika.bo', telefono: '765-43210', deporte: 'Fútbol',     especialidad: 'Fútbol infantil y juvenil',         activo: true },
  { id: 2, empresa_id: 1, nombre: 'Prof. Lucía Flores', email: 'lucia.flores@sportika.bo', telefono: '778-91234', deporte: 'Wally',      especialidad: 'Iniciación al wally',               activo: true },
  { id: 3, empresa_id: 1, nombre: 'Prof. Carlos Rojas', email: 'carlos.rojas@sportika.bo', telefono: '712-34567', deporte: 'Pádel',      especialidad: 'Pádel dobles, nivel intermedio',    activo: true },
  { id: 4, empresa_id: 1, nombre: 'Prof. Elena Vargas', email: 'elena.vargas@sportika.bo', telefono: '706-55889', deporte: 'Fútbol',     especialidad: 'Preparación física',                activo: false },
  { id: 5, empresa_id: 2, nombre: 'Prof. Ana Lopez',    email: 'ana.lopez@sportika.bo',    telefono: '733-22114', deporte: 'Básquetbol', especialidad: 'Básquetbol infantil',               activo: true },
  { id: 6, empresa_id: 2, nombre: 'Prof. Roberto Paz',  email: 'roberto.paz@sportika.bo',  telefono: '744-66332', deporte: 'Básquetbol', especialidad: 'Técnica de tiro y defensa',         activo: true },
]

export const entrenadoresDeEmpresa = (empresaId) =>
  ENTRENADORES.filter(e => mismo(e.empresa_id, empresaId))

/** Los entrenamientos que dicta un entrenador, tomados del horario publicado. */
export const entrenamientosDe = (entrenador) =>
  entrenamientosDeEmpresa(entrenador.empresa_id).filter(e => e.entrenador === entrenador.nombre)

// ─────────────────────────────────────────────────────────────────────────────
// CANJES DE RECOMPENSA
// Un solo registro: el cliente canjea y genera el codigo, el empleado o el
// administrador lo entregan. Los tres ven exactamente la misma fila.
// ─────────────────────────────────────────────────────────────────────────────

/** Codigo unico del canje. Los premios fisicos tambien llevan uno para el mostrador. */
export const generarCodigoCanje = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return 'CNJ-' + rand(4)
}

// Como el cliente fue ganando y gastando sus puntos. Lo escribe la base
// (canjes, reservas cumplidas); aqui solo se muestra.
export const PUNTOS_HISTORIAL = []

export const CANJES = [
  { id: 1, empresa_id: 1, cliente_id: 8,  cliente: 'Ana López',     recompensa: 'Refresco gratis',          tipo: 'fisico',            puntos: 150, codigo: 'CNJ-4821', estado: 'disponible', fecha: 'Hoy'         },
  { id: 2, empresa_id: 1, cliente_id: 12, cliente: 'Diego Ramos',   recompensa: '1 hora de cancha gratis',  tipo: 'descuento_reserva', puntos: 500, codigo: 'CNJ-4822', estado: 'disponible', fecha: 'Hoy'         },
  { id: 3, empresa_id: 1, cliente_id: 21, cliente: 'Carlos Mamani', recompensa: 'Descuento 20% en reserva', tipo: 'descuento_reserva', puntos: 300, codigo: 'CNJ-4819', estado: 'entregado',  fecha: 'Ayer'        },
  { id: 4, empresa_id: 1, cliente_id: 99, cliente: 'Juan García',   recompensa: 'Descuento 20% en reserva', tipo: 'descuento_reserva', puntos: 300, codigo: 'CNJ-4790', estado: 'utilizado',  fecha: '10 May 2026' },
  { id: 5, empresa_id: 1, cliente_id: 5,  cliente: 'Marco Flores',  recompensa: 'Inscripción gratis torneo',tipo: 'torneo_gratis',     puntos: 800, codigo: 'CNJ-4776', estado: 'utilizado',  fecha: '20 May 2026' },
  { id: 6, empresa_id: 1, cliente_id: 20, cliente: 'Juan Torres',   recompensa: 'Botella de agua',          tipo: 'fisico',            puntos: 50,  codigo: 'CNJ-4830', estado: 'disponible', fecha: 'Hoy'         },
]

export const canjesDeEmpresa = (empresaId) =>
  CANJES.filter(c => mismo(c.empresa_id, empresaId))

export const canjesDeCliente = (clienteId = USUARIO_ACTUAL.id) =>
  CANJES.filter(c => c.cliente_id === clienteId)

/** Registra un canje nuevo y devuelve la fila creada (con su codigo). */
/**
 * Suma el canje a la lista que ven las pantallas.
 * El id y el codigo los genera la base (funcion canjear_recompensa); si no
 * vienen, se usan valores locales para que la vista siga funcionando.
 */
export const registrarCanje = (recompensa, guardado = null, cliente = USUARIO_ACTUAL) => {
  const nuevo = {
    id: guardado?.id ?? Date.now(), empresa_id: recompensa.empresa_id,
    cliente_id: cliente.id, cliente: cliente.nombre,
    recompensa: recompensa.nombre, tipo: recompensa.tipo, puntos: recompensa.puntos,
    codigo: guardado?.codigo ?? generarCodigoCanje(), estado: 'disponible', fecha: 'Hoy',
  }
  CANJES.unshift(nuevo)
  // La recompensa canjeada queda con una menos disponible
  const real = (RECOMPENSAS_POR_EMPRESA[recompensa.empresa_id] || []).find(r => mismo(r.id, recompensa.id))
  if (real) real.canjeados = (Number(real.canjeados) || 0) + 1
  return nuevo
}

// ─────────────────────────────────────────────────────────────────────────────
// RESERVAS DEL CLIENTE
// Las mismas filas de RESERVAS_EMPRESA, vistas desde el lado del cliente.
// ─────────────────────────────────────────────────────────────────────────────

// Un apartado es el paso de pago, que dura 10 minutos: no es todavia una
// reserva que el cliente tenga que seguir. Una vencida si se muestra cuando
// trae comprobante: es el pago que el complejo tiene que devolver.
export const misReservas = (clienteId = USUARIO_ACTUAL.id) =>
  RESERVAS_EMPRESA
    .filter(r => r.cliente_id === clienteId && r.estado !== 'apartada')
    .map(r => ({ ...r, empresa: empresaPorId(r.empresa_id)?.nombre || '' }))

/**
 * ¿Ya se le paso el tiempo a este apartado? La hora vale la del servidor
 * (apartaHasta); la base es la que decide de verdad al guardar.
 */
export const apartadoVencido = (r) =>
  r.estado === 'apartada' && Boolean(r.apartaHasta) && new Date(r.apartaHasta).getTime() <= Date.now()

/**
 * ¿Esta reserva ocupa la cancha? Las pendientes y confirmadas si; un apartado
 * solo mientras le quede tiempo; las rechazadas y las vencidas no. Es la
 * misma regla que la base usa para no dejar dos reservas en la misma hora.
 */
export const ocupaLaCancha = (r) =>
  r.estado === 'pendiente' || r.estado === 'confirmada' ||
  (r.estado === 'apartada' && !apartadoVencido(r))

/** Convierte "09:00" en minutos, para comparar franjas horarias. */
const enMinutos = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Devuelve la reserva que ocupa esa cancha en esa fecha y hora, o null.
 * Lo usan el calendario del cliente y el mostrador del empleado, para que
 * los dos vean exactamente la misma disponibilidad.
 */
export const reservaEnFranja = (empresaId, cancha, fecha, horaInicio, horaFin) => {
  const ini = enMinutos(horaInicio)
  const fin = enMinutos(horaFin || horaInicio) || ini + 60
  return RESERVAS_EMPRESA.find(r =>
    mismo(r.empresa_id, empresaId) &&
    r.cancha === cancha &&
    // Se compara por la fecha ISO ('2026-09-16'); 'fecha' es solo el texto
    (r.fechaISO ? r.fechaISO === fecha : r.fecha === fecha) &&
    ocupaLaCancha(r) &&
    ini < enMinutos(r.horaFin || r.horaInicio) &&
    fin > enMinutos(r.horaInicio)) || null
}

/**
 * Todas las reservas que chocan con una franja, sin importar de donde vengan.
 * Sirve para avisarle al organizador de un torneo que esas horas ya estan
 * tomadas, antes de que mande la solicitud.
 */
export const choquesEnFranja = (empresaId, cancha, fechas, horaInicio, horaFin) => {
  const ini = enMinutos(horaInicio)
  const fin = enMinutos(horaFin || horaInicio) || ini + 60
  return RESERVAS_EMPRESA.filter(r =>
    mismo(r.empresa_id, empresaId) &&
    r.cancha === cancha &&
    fechas.includes(r.fechaISO || r.fecha) &&
    ocupaLaCancha(r) &&
    ini < enMinutos(r.horaFin || r.horaInicio) &&
    fin > enMinutos(r.horaInicio))
}

/** Registra una reserva nueva y la devuelve. La ven el admin y el empleado. */
export const registrarReserva = (datos) => {
  const nueva = {
    id: Date.now(),
    nro: 'RSV-' + String(Date.now()).slice(-8),
    estado: 'pendiente', comprobante: false, asistencia: null,
    origen: 'app', atendidoPor: null,
    ...datos,
  }
  RESERVAS_EMPRESA.push(nueva)
  return nueva
}

// ── Quien esta usando cada rol (mientras no exista el login real) ──────────
export const SUPER_ADMIN = { nombre: 'Fernando Guzmán', email: 'admin@sportika.bo' }

export const identidadDeRol = (rol) => {
  if (rol === 'superadmin') return { nombre: SUPER_ADMIN.nombre, detalle: 'Sportika Cochabamba' }
  if (rol === 'admin') {
    const e = empresaPorId(1)
    return { nombre: e?.admin || 'Administrador', detalle: e?.nombre || '' }
  }
  if (rol === 'empleado') {
    return { nombre: EMPLEADO_ACTUAL.nombre, detalle: empresaPorId(EMPLEADO_ACTUAL.empresa_id)?.nombre || '' }
  }
  return { nombre: USUARIO_ACTUAL.nombre, detalle: pts(USUARIO_ACTUAL.puntos) }
}
