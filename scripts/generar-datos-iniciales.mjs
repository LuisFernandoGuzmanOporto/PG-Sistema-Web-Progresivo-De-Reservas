/**
 * Genera sportika_datos_iniciales.sql a partir de src/lib/datos.js
 *
 * Se lee la MISMA fuente que usa la aplicacion, asi los datos de la base
 * quedan identicos a los que hoy se ven en pantalla. Si manana cambias algo
 * en datos.js, vuelves a correr esto y el SQL queda al dia:
 *
 *     node scripts/generar-datos-iniciales.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import * as D from '../src/lib/datos.js'

// ── Utilidades ─────────────────────────────────────────────────────────────

/** UUID estable a partir de un prefijo y un numero: permite volver a correr el SQL. */
// Un UUID valido es 8-4-4-4-12. El prefijo ocupa el primer caracter y el resto
// se rellena con ceros, asi cada tabla tiene su propio rango y se reconoce a simple vista.
const uid = (prefijo, n) =>
  `${prefijo}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const txt = (v) =>
  v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`

const num = (v) => (v === null || v === undefined || v === '' ? 'NULL' : Number(v))
const bool = (v) => (v ? 'TRUE' : 'FALSE')
const lista = (arr) =>
  !arr || arr.length === 0 ? `'{}'` : `ARRAY[${arr.map(txt).join(', ')}]`

const partes = []
const escribir = (s) => partes.push(s)
const titulo = (t) => escribir(`\n-- ${'─'.repeat(66)}\n-- ${t}\n-- ${'─'.repeat(66)}\n`)

// ── Personas: quien necesita cuenta ───────────────────────────────────────
// Una persona necesita cuenta solo si INICIA SESION. Los jugadores de un
// equipo y los capitanes van por nombre, porque en la vida real el capitan
// anota a su gente y esa gente no se registra en la app.

// La contraseña de las cuentas de prueba NO se escribe en el código: sale de
// .env.pruebas.local (SPORTIKA_CLAVE_PRUEBA), que no se sube al repositorio.
// El .sql que genera este script la lleva adentro, y por eso también está en
// .gitignore.
const CLAVE = (() => {
  const archivo = '.env.pruebas.local'
  const linea = existsSync(archivo) && readFileSync(archivo, 'utf8').split(/\r?\n/)
    .find(l => l.trim().startsWith('SPORTIKA_CLAVE_PRUEBA='))
  const valor = process.env.SPORTIKA_CLAVE_PRUEBA || (linea && linea.split('=').slice(1).join('=').trim())
  if (!valor) { console.error('Falta SPORTIKA_CLAVE_PRUEBA en .env.pruebas.local'); process.exit(1) }
  return valor
})()
let nUsuario = 0
const usuarios = []   // { uuid, email, nombre, rol, telefono, puntos }

const nuevoUsuario = (email, nombre, rol, extra = {}) => {
  const u = { uuid: uid('a', ++nUsuario), email, nombre, rol, telefono: null, puntos: 0, ...extra }
  usuarios.push(u)
  return u
}

const superAdmin = nuevoUsuario(D.SUPER_ADMIN.email, D.SUPER_ADMIN.nombre, 'superadmin')

// Clientes (los unicos que acumulan puntos)
const porCliente = new Map()
for (const c of D.CLIENTES) {
  porCliente.set(c.id, nuevoUsuario(c.email, c.nombre, 'cliente', {
    telefono: c.id === D.USUARIO_ACTUAL.id ? D.USUARIO_ACTUAL.telefono : null,
    puntos: c.puntos,
    estado: c.estado,
  }))
}

// Un administrador por empresa
const porAdminEmpresa = new Map()
for (const e of D.EMPRESAS) {
  porAdminEmpresa.set(e.id, nuevoUsuario(e.adminEmail, e.admin, 'admin_empresa'))
}

// Empleados
const porEmpleado = new Map()
for (const em of D.EMPLEADOS) {
  porEmpleado.set(em.id, nuevoUsuario(`${em.usuario}@sportika.bo`, em.nombre, 'empleado', {
    telefono: em.telefono,
  }))
}

/** El perfil de quien creo un torneo: un cliente, o el admin del complejo. */
const perfilCreador = (t) =>
  t.creador_tipo === 'complejo'
    ? porAdminEmpresa.get(t.empresa_id).uuid
    : (porCliente.get(t.creador_id)?.uuid ?? porCliente.get(D.USUARIO_ACTUAL.id).uuid)

// ── Cabecera ──────────────────────────────────────────────────────────────

escribir(`-- ============================================================
-- SPORTIKA — DATOS INICIALES
--
-- Generado por scripts/generar-datos-iniciales.mjs desde src/lib/datos.js
-- Fecha: ${new Date().toISOString().slice(0, 10)}
--
-- Ejecutar DESPUES de sportika_schema.sql.
-- Se puede volver a ejecutar: primero borra lo que inserto antes.
--
-- CUENTAS DE PRUEBA (todas con la contrasena: ${CLAVE})
${usuarios.map(u => `--   ${u.email.padEnd(30)} ${u.rol.padEnd(14)} ${u.nombre}`).join('\n')}
-- ============================================================

-- pgcrypto: necesario para encriptar las contrasenas de prueba
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Limpieza: deja la base como recien creada (respeta el orden de las claves)
TRUNCATE bitacora, eventos_partido, partidos_torneo, equipo_jugadores, equipos,
         solicitudes_cancha, torneos, partido_jugadores, partidos_espontaneos,
         canjes, puntos_historial, recompensas, calificaciones, reservas,
         entrenamientos, entrenadores, canchas, empleados, empresa_deportes,
         empresas RESTART IDENTITY CASCADE;

DELETE FROM auth.users WHERE email LIKE '%@sportika.bo'
                          OR email IN (${D.EMPRESAS.map(e => txt(e.adminEmail)).join(', ')})
                          OR email LIKE '%@email.com';
`)

// ── Cuentas ───────────────────────────────────────────────────────────────

titulo('1. CUENTAS DE ACCESO (auth.users) Y PERFILES')
escribir(`-- El trigger trg_new_user crea solo el perfil en profiles a partir de estos
-- datos. Por eso aqui no se inserta en profiles: se actualiza despues.
`)

for (const u of usuarios) {
  escribir(`INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000000', '${u.uuid}', 'authenticated', 'authenticated',
   ${txt(u.email)}, extensions.crypt(${txt(CLAVE)}, extensions.gen_salt('bf')), NOW(),
   NOW(), NOW(), '{"provider":"email","providers":["email"]}',
   ${txt(JSON.stringify({ nombre: u.nombre, rol: u.rol }))});`)
}

escribir(`
-- Los campos de texto de auth.users NO pueden quedar en NULL: el servicio de
-- login de Supabase los lee como texto y falla con "Database error querying
-- schema". Al insertar a mano hay que dejarlos en cadena vacia.
DO $$
DECLARE col text;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users'
      AND data_type IN ('character varying', 'text')
      AND column_name IN ('confirmation_token','recovery_token','email_change',
                          'email_change_token_new','email_change_token_current',
                          'phone_change','phone_change_token','reauthentication_token')
  LOOP
    EXECUTE format('UPDATE auth.users SET %I = COALESCE(%I, '''''''') WHERE %I IS NULL', col, col, col);
  END LOOP;
END $$;

-- Identidad de correo: sin esto el inicio de sesion con email no funciona
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT uuid_generate_v4(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.id IN (${usuarios.map(u => `'${u.uuid}'`).join(', ')});
`)

escribir(`\n-- Datos que el trigger no conoce: telefono, puntos y estado`)
for (const u of usuarios) {
  escribir(`UPDATE profiles SET telefono = ${txt(u.telefono)}, puntos = ${u.puntos}, ` +
    `activo = ${bool(u.estado !== 'suspendido')} WHERE id = '${u.uuid}';`)
}

// ── Empresas ──────────────────────────────────────────────────────────────

titulo('2. COMPLEJOS DEPORTIVOS')
escribir('-- Solo los ACTIVOS se muestran a los clientes.\n')

const uidEmpresa = (id) => uid('b', id)
for (const e of D.EMPRESAS) {
  const [ini, fin] = e.horario.split(' - ')
  escribir(`INSERT INTO empresas (id, nombre, descripcion, zona, direccion, telefono,
  horario_inicio, horario_fin, lat, lng, referencia, estado, admin_id)
VALUES ('${uidEmpresa(e.id)}', ${txt(e.nombre)}, ${txt(e.descripcion)}, ${txt(e.zona)},
  ${txt(e.direccion)}, ${txt(e.telefono)}, ${txt(ini)}, ${txt(fin)}, ${e.lat}, ${e.lng},
  ${txt(e.referencia)}, ${txt(e.estado)}, '${porAdminEmpresa.get(e.id).uuid}');`)
  for (const d of e.deportes) {
    escribir(`INSERT INTO empresa_deportes (empresa_id, deporte) VALUES ('${uidEmpresa(e.id)}', ${txt(d)});`)
  }
}

// ── Empleados ─────────────────────────────────────────────────────────────

titulo('3. EMPLEADOS Y SUS PERMISOS')
for (const em of D.EMPLEADOS) {
  escribir(`INSERT INTO empleados (id, empresa_id, usuario, turno, permisos, activo)
VALUES ('${porEmpleado.get(em.id).uuid}', '${uidEmpresa(em.empresa_id)}', ${txt(em.usuario)},
  ${txt(em.turno)}, ${lista(em.permisos)}, ${bool(em.activo)});`)
}

// ── Canchas ───────────────────────────────────────────────────────────────

titulo('4. CANCHAS')
const uidCancha = (id) => uid('c', id)
const canchaPorNombre = new Map()   // "empresa|nombre" -> uuid
for (const e of D.EMPRESAS) {
  for (const c of D.canchasDeEmpresa(e.id)) {
    canchaPorNombre.set(`${e.id}|${c.nombre}`, uidCancha(c.id))
    escribir(`INSERT INTO canchas (id, empresa_id, nombre, deporte, precio_hora, activa)
VALUES ('${uidCancha(c.id)}', '${uidEmpresa(e.id)}', ${txt(c.nombre)}, ${txt(c.deporte)},
  ${c.precio}, ${bool(c.disponible)});`)
  }
}

// ── Entrenadores y entrenamientos ────────────────────────────────────────

titulo('5. ENTRENADORES')
const uidEntrenador = (id) => uid('d', id)
const entrenadorPorNombre = new Map()
for (const en of D.ENTRENADORES) {
  entrenadorPorNombre.set(en.nombre, uidEntrenador(en.id))
  escribir(`INSERT INTO entrenadores (id, empresa_id, nombre, correo, telefono, deporte, especialidad, activo)
VALUES ('${uidEntrenador(en.id)}', '${uidEmpresa(en.empresa_id)}', ${txt(en.nombre)}, ${txt(en.email)},
  ${txt(en.telefono)}, ${txt(en.deporte)}, ${txt(en.especialidad)}, ${bool(en.activo)});`)
}

titulo('6. ENTRENAMIENTOS (horario informativo, sin inscripcion en linea)')
let nEnt = 0
for (const e of D.EMPRESAS) {
  for (const t of D.entrenamientosDeEmpresa(e.id)) {
    const ent = entrenadorPorNombre.get(t.entrenador)
    escribir(`INSERT INTO entrenamientos (id, empresa_id, entrenador_id, nombre, deporte, descripcion,
  nivel, dias, hora_inicio, hora_fin, precio, para_ninos, edad_min, edad_max, activo)
VALUES ('${uid('e', ++nEnt)}', '${uidEmpresa(e.id)}', ${ent ? `'${ent}'` : 'NULL'}, ${txt(t.nombre)},
  ${txt(t.deporte)}, ${txt(t.descripcion)}, ${txt(t.nivel)}, ${lista(t.dias)},
  ${txt(t.horaInicio)}, ${txt(t.horaFin)}, ${num(t.precio)}, ${bool(t.paraNinos)},
  ${num(t.edadMin)}, ${num(t.edadMax)}, TRUE);`)
  }
}

// ── Recompensas ───────────────────────────────────────────────────────────

titulo('7. RECOMPENSAS')
const uidRecompensa = (id) => uid('f', id)
const recompensaPorNombre = new Map()
for (const e of D.EMPRESAS) {
  for (const r of D.recompensasDeEmpresa(e.id)) {
    recompensaPorNombre.set(`${e.id}|${r.nombre}`, uidRecompensa(r.id))
    escribir(`INSERT INTO recompensas (id, empresa_id, emoji, nombre, descripcion, tipo, puntos, stock, activa)
VALUES ('${uidRecompensa(r.id)}', '${uidEmpresa(e.id)}', ${txt(r.icono)}, ${txt(r.nombre)},
  ${txt(r.descripcion)}, ${txt(r.tipo)}, ${r.puntos}, ${r.stock}, ${bool(r.activa)});`)
  }
}

// ── Reservas ──────────────────────────────────────────────────────────────

titulo('8. RESERVAS')
escribir(`-- Las que dicen "Hoy" en la app se guardan con la fecha de hoy.\n`)
let nRes = 0
for (const r of D.RESERVAS_EMPRESA) {
  const cancha = canchaPorNombre.get(`${r.empresa_id}|${r.cancha}`)
  const cliente = porCliente.get(r.cliente_id)
  if (!cancha || !cliente) continue     // datos de relleno sin cuenta: se omiten
  const fecha = r.fecha === 'Hoy' ? 'CURRENT_DATE' : `DATE '2026-05-28'`
  escribir(`INSERT INTO reservas (id, nro, cliente_id, cancha_id, empresa_id, fecha,
  hora_inicio, hora_fin, monto_total, estado, comprobante_url, origen, asistencia)
VALUES ('${uid('1', ++nRes)}', ${txt(r.nro)}, '${cliente.uuid}', '${cancha}', '${uidEmpresa(r.empresa_id)}',
  ${fecha}, ${txt(r.horaInicio)}, ${txt(r.horaFin)}, ${r.monto}, ${txt(r.estado)},
  ${r.comprobante ? txt('comprobantes/' + r.nro + '.jpg') : 'NULL'}, ${txt(r.origen)}, ${txt(r.asistencia)});`)
}

// ── Torneos ───────────────────────────────────────────────────────────────

titulo('9. TORNEOS')
const uidTorneo = (id) => uid('2', id)
const uidEquipo = (id) => uid('3', id)
const uidJugador = (id) => uid('4', id)

const FECHAS = { '14 Feb': '2026-02-14', '28 Feb': '2026-02-28', '10 Feb': '2026-02-10',
  '24 Feb': '2026-02-24', '14 Mar': '2026-03-14', '19 Feb': '2026-02-19', '17 Feb': '2026-02-17',
  '8 Mar': '2026-03-08', '19 Mar': '2026-03-19', '4 Mar': '2026-03-04', '15 Mar': '2026-03-15',
  '20 Mar': '2026-03-20', '12 Mar': '2026-03-12', '31 Mar': '2026-03-31', '6 Abr': '2026-04-06',
  '27 Mar': '2026-03-27', '22 Ago': '2026-08-22', '6 Sep': '2026-09-06', '18 Ago': '2026-08-18' }
const fecha = (f) => (FECHAS[f] ? `DATE '${FECHAS[f]}'` : 'NULL')

for (const t of D.TORNEOS) {
  escribir(`INSERT INTO torneos (id, empresa_id, creador_id, creador_tipo, nombre, emoji, deporte,
  descripcion, formato, max_equipos, clasifican_por_grupo, jugadores_por_equipo, suplentes,
  precio_inscripcion, premio_primero, premio_segundo, premio_tercero, reglas, horarios,
  fecha_inicio, fecha_fin, inscripcion_hasta, estado)
VALUES ('${uidTorneo(t.id)}', '${uidEmpresa(t.empresa_id)}', '${perfilCreador(t)}', ${txt(t.creador_tipo)},
  ${txt(t.nombre)}, ${txt(t.emoji)}, ${txt(t.deporte)}, ${txt(t.desc)}, ${txt(t.formato)},
  ${t.maxEquipos}, ${t.clasificanPorGrupo ?? 2}, ${t.jugadoresPorEquipo}, ${t.suplentes},
  ${t.precio}, ${txt(t.premios.primero)}, ${txt(t.premios.segundo)}, ${txt(t.premios.tercero)},
  ${lista(t.reglas)}, ${txt(t.horarios)}, ${fecha(t.fechaInicio)}, ${fecha(t.fechaFin)},
  ${fecha(t.inscripcionHasta)}, ${txt(t.estado)});`)

  // Pedido de cancha: solo los torneos de un cliente pasan por la aprobacion
  if (t.creador_tipo === 'cliente' && t.solicitud) {
    const cancha = canchaPorNombre.get(`${t.empresa_id}|${t.cancha}`)
    escribir(`INSERT INTO solicitudes_cancha (torneo_id, empresa_id, cancha_id, estado, motivo)
VALUES ('${uidTorneo(t.id)}', '${uidEmpresa(t.empresa_id)}', ${cancha ? `'${cancha}'` : 'NULL'},
  ${txt(t.solicitud.estado)}, ${txt(t.solicitud.motivo)});`)
  }

  // Equipos y sus jugadores
  const grupoDe = (equipoId) => {
    if (!t.grupos) return 'NULL'
    for (const [g, ids] of Object.entries(t.grupos)) if (ids.includes(equipoId)) return txt(g)
    return 'NULL'
  }
  for (const eq of (t.equipos || [])) {
    escribir(`INSERT INTO equipos (id, torneo_id, nombre, capitan_nombre, grupo, comprobante_url, estado)
VALUES ('${uidEquipo(eq.id)}', '${uidTorneo(t.id)}', ${txt(eq.nombre)}, ${txt(eq.capitan)},
  ${grupoDe(eq.id)}, ${txt(eq.comprobante)}, ${txt(eq.estado)});`)
    for (const j of (eq.jugadores || [])) {
      escribir(`INSERT INTO equipo_jugadores (id, equipo_id, nombre, dorsal, posicion, habilitado)
VALUES ('${uidJugador(j.id)}', '${uidEquipo(eq.id)}', ${txt(j.nombre)}, ${j.dorsal}, ${txt(j.posicion)}, ${bool(j.habilitado)});`)
    }
  }
}

// ── Partidos de torneo y sus eventos ─────────────────────────────────────

titulo('10. PARTIDOS DE TORNEO Y EVENTOS (goles y tarjetas)')
let nPar = 0, nEv = 0
for (const t of D.TORNEOS) {
  for (const p of (t.partidos || [])) {
    const idPartido = uid('5', ++nPar)
    const cancha = canchaPorNombre.get(`${t.empresa_id}|${p.cancha}`)
    escribir(`INSERT INTO partidos_torneo (id, torneo_id, equipo_a_id, equipo_b_id, goles_a, goles_b,
  amarillas_a, amarillas_b, rojas_a, rojas_b, fase, grupo, estado, minuto, cancha_id)
VALUES ('${idPartido}', '${uidTorneo(t.id)}', '${uidEquipo(p.equipo1_id)}', '${uidEquipo(p.equipo2_id)}',
  ${p.g1}, ${p.g2}, ${p.am1 ?? 0}, ${p.am2 ?? 0}, ${p.rj1 ?? 0}, ${p.rj2 ?? 0},
  ${txt(p.fase || 'grupos')}, ${txt(p.grupo)}, ${txt(p.estado)}, ${num(p.minuto)},
  ${cancha ? `'${cancha}'` : 'NULL'});`)

    for (const ev of (p.eventos || [])) {
      escribir(`INSERT INTO eventos_partido (id, partido_id, equipo_id, jugador_equipo_id, tipo, minuto)
VALUES ('${uid('6', ++nEv)}', '${idPartido}', '${uidEquipo(ev.equipo_id)}', '${uidJugador(ev.jugador_id)}',
  ${txt(ev.tipo)}, ${ev.minuto});`)
    }
  }
}

// ── Partidos espontaneos ─────────────────────────────────────────────────

titulo('11. PARTIDOS ESPONTANEOS')
let nPe = 0
for (const p of D.PARTIDOS_ESPONTANEOS) {
  const idP = uid('7', ++nPe)
  const cancha = canchaPorNombre.get(`${p.empresa_id}|${p.cancha}`)
  const creador = porCliente.get(p.creadorId) || porCliente.get(D.USUARIO_ACTUAL.id)
  // La hora del partido cuenta desde que se cargan los datos, no desde que
  // se generó este archivo: así los partidos de demostración están vigentes
  const minutos = Math.max(0, Math.round((new Date(p.fechaHora) - Date.now()) / 60000))
  escribir(`INSERT INTO partidos_espontaneos (id, empresa_id, creador_id, deporte, cancha_id,
  fecha_hora, max_jugadores, apuesta, activo)
VALUES ('${idP}', '${uidEmpresa(p.empresa_id)}', '${creador.uuid}', ${txt(p.deporte)},
  ${cancha ? `'${cancha}'` : 'NULL'}, now() + interval '${minutos} minutes', ${p.maxJugadores}, ${txt(p.apuesta)}, TRUE);`)
  for (const nombre of p.jugadoresUnidos) {
    const perfil = [...porCliente.values()].find(u => u.nombre === nombre)
    escribir(`INSERT INTO partido_jugadores (partido_id, jugador_id, nombre)
VALUES ('${idP}', ${perfil ? `'${perfil.uuid}'` : 'NULL'}, ${txt(nombre)});`)
  }
}

// ── Canjes y calificaciones ──────────────────────────────────────────────

titulo('12. CANJES DE RECOMPENSA')
let nCanje = 0
for (const c of D.CANJES) {
  const cliente = porCliente.get(c.cliente_id)
  const recompensa = recompensaPorNombre.get(`${c.empresa_id}|${c.recompensa}`)
  if (!cliente || !recompensa) continue
  escribir(`INSERT INTO canjes (id, cliente_id, recompensa_id, empresa_id, puntos_gastados, codigo, estado)
VALUES ('${uid('8', ++nCanje)}', '${cliente.uuid}', '${recompensa}', '${uidEmpresa(c.empresa_id)}',
  ${c.puntos}, ${txt(c.codigo)}, ${txt(c.estado)});`)
}

titulo('13. CALIFICACIONES')
let nCal = 0
for (const e of D.EMPRESAS) {
  const clientes = [...porCliente.values()]
  for (const [i, cal] of D.calificacionesDeEmpresa(e.id).entries()) {
    const cliente = clientes[i % clientes.length]     // una calificacion por cliente
    escribir(`INSERT INTO calificaciones (id, empresa_id, cliente_id, estrellas, comentario, respuesta)
VALUES ('${uid('9', ++nCal)}', '${uidEmpresa(e.id)}', '${cliente.uuid}', ${cal.estrellas},
  ${txt(cal.comentario)}, ${txt(cal.respuesta)});`)
  }
}

// ── Bitacora ──────────────────────────────────────────────────────────────

titulo('14. BITACORA DE ACTIVIDAD')
let nBit = 0
for (const b of D.BITACORA) {
  const emp = porEmpleado.get(b.empleado_id)
  escribir(`INSERT INTO bitacora (id, empresa_id, actor_id, actor_nombre, tipo, accion, detalle)
VALUES ('${uid('0', ++nBit)}', '${uidEmpresa(b.empresa_id)}', ${emp ? `'${emp.uuid}'` : 'NULL'},
  ${txt(b.empleado)}, ${txt(b.tipo)}, ${txt(b.accion)}, ${txt(b.detalle)});`)
}

// ── Resumen ───────────────────────────────────────────────────────────────

escribir(`

-- ============================================================
-- RESUMEN DE LO INSERTADO
--   ${usuarios.length} cuentas · ${D.EMPRESAS.length} complejos · ${D.EMPLEADOS.length} empleados
--   ${canchaPorNombre.size} canchas · ${D.ENTRENADORES.length} entrenadores · ${nEnt} entrenamientos
--   ${D.TORNEOS.length} torneos · ${nPar} partidos · ${nEv} eventos
--   ${nRes} reservas · ${nCanje} canjes · ${nCal} calificaciones · ${nBit} lineas de bitacora
-- ============================================================
`)

writeFileSync('sportika_datos_iniciales.sql', partes.join('\n') + '\n', 'utf8')
console.log('Generado sportika_datos_iniciales.sql')
console.log(`  ${usuarios.length} cuentas, ${D.EMPRESAS.length} complejos, ${canchaPorNombre.size} canchas,`)
console.log(`  ${D.TORNEOS.length} torneos, ${nPar} partidos, ${nEv} eventos, ${nRes} reservas`)
