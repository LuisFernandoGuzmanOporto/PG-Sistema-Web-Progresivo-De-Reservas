import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { hayBase, entrar, dejarComoEstaba, SPORT_CENTER, CANCHA_FUTBOL } from './apoyo.js'
import { entrarComo } from '../integracion/conexion.js'
import { traducirError } from '../../src/lib/errores.js'

// ─────────────────────────────────────────────────────────────────────────────
// PS-49 a PS-57 · ¿Qué pasa si…?
//
// Lo que nadie haria desde la pantalla, pero alguien podria intentar enviando
// datos directo a la API: reservas imposibles, textos maliciosos, sesiones
// falsas y curiosos que quieren ver datos ajenos. La base tiene que
// rechazarlo todo con un mensaje claro, o guardarlo sin que haga daño.
// ─────────────────────────────────────────────────────────────────────────────

// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const OTRA_CANCHA = 'c0000000-0000-4000-8000-000000000002'          // es de Gimnasio Central
const CANCHA_DE_BAJA = 'c0000000-0000-4000-8000-000000000003'       // Zona Deportiva Sur, desactivada
const ZONA_SUR = 'b0000000-0000-4000-8000-000000000003'
const comentarios = []

const reservar = (s, fila) => s.sb.from('reservas').insert({
  cliente_id: s.id, empresa_id: SPORT_CENTER, cancha_id: CANCHA_FUTBOL, fecha: '2031-10-06',
  hora_inicio: '10:00', hora_fin: '11:00', monto_total: 0, estado: 'pendiente', origen: 'app', ...fila,
}).select().single()

describe.skipIf(!hayBase)('¿Qué pasa si…?', () => {
  let juan

  beforeAll(async () => { juan = await entrar('juan'); await entrar('superadmin') })

  afterAll(async () => {
    const admin = await entrar('admin')
    const zonaSur = await entrarComo('sandra@zdsur.com')
    await dejarComoEstaba({ inicio, puntosAntes: {}, borrar: [
      // Por si alguna llego a guardarse
      async () => admin.sb.from('reservas').delete().eq('cliente_id', juan.id).in('fecha', ['2031-10-06', '2025-01-06']),
      async () => zonaSur.sb.from('reservas').delete().eq('cliente_id', juan.id).eq('fecha', '2031-10-06'),
      async () => comentarios.length && juan.sb.from('comentarios').delete().in('id', comentarios),
    ] })
    for (const c of [zonaSur, await entrarComo('rosa.v@sportika.bo'), await entrarComo('willy.a@sportika.bo')])
      await c.sb.from('notificaciones').delete().eq('usuario_id', c.usuario.id).gte('created_at', inicio)
  })

  it('PS-49 · ¿Y si un cliente reserva una fecha que ya pasó?', async () => {
    // Arrange / Act
    const r = await reservar(juan, { fecha: '2025-01-06' })

    // Assert
    expect(r.data).toBeNull()
    expect(traducirError(r.error)).toMatch(/ya pasó/)
  })

  it('PS-50 · ¿Y si reserva a las 3 de la mañana, con el complejo cerrado?', async () => {
    // Arrange / Act
    const r = await reservar(juan, { hora_inicio: '03:00', hora_fin: '04:00' })

    // Assert
    expect(r.data).toBeNull()
    expect(traducirError(r.error)).toBe('El complejo atiende de 06:00 a 22:00. Elige un horario dentro de ese rango.')
  })

  it('PS-51 · ¿Y si reserva una cancha que el complejo dio de baja?', async () => {
    // Arrange / Act
    const r = await reservar(juan, { empresa_id: ZONA_SUR, cancha_id: CANCHA_DE_BAJA })

    // Assert
    expect(r.data).toBeNull()
    expect(traducirError(r.error)).toMatch(/no está disponible/)
  })

  it('PS-52 · ¿Y si mezcla la cancha de otro complejo con el nombre de este?', async () => {
    // Arrange / Act
    const r = await reservar(juan, { cancha_id: OTRA_CANCHA })

    // Assert
    expect(r.data).toBeNull()
    expect(traducirError(r.error)).toBe('Esa cancha no pertenece a este complejo.')
  })

  it('PS-53 · ¿Y si reserva un solo minuto para pagar casi nada?', async () => {
    // Arrange / Act
    const r = await reservar(juan, { hora_inicio: '14:00', hora_fin: '14:01' })

    // Assert
    expect(r.data).toBeNull()
    expect(traducirError(r.error)).toBe('Las reservas son por horas completas (por ejemplo, de 18:00 a 19:00).')
  })

  it('PS-54 · ¿Y si escribe un comentario con código SQL para borrar las reservas?', async () => {
    // Arrange
    const texto = "Buen complejo'); DROP TABLE reservas; --"

    // Act
    const { data, error } = await juan.sb.from('comentarios')
      .insert({ empresa_id: SPORT_CENTER, autor_id: juan.id, texto }).select().single()
    if (data) comentarios.push(data.id)
    const tabla = await juan.sb.from('reservas').select('id').limit(1)

    // Assert: se guarda como texto comun y la tabla sigue ahi
    expect(error).toBeNull()
    expect(data.texto).toBe(texto)
    expect(tabla.error).toBeNull()
  })

  it('PS-55 · ¿Y si manda un comentario de 5000 caracteres saltándose la pantalla?', async () => {
    // Arrange / Act
    const { data, error } = await juan.sb.from('comentarios')
      .insert({ empresa_id: SPORT_CENTER, autor_id: juan.id, texto: 'a'.repeat(5000) }).select().single()
    if (data) comentarios.push(data.id)

    // Assert
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('PS-56 · ¿Y si alguien inventa una sesión (un token falso)?', async () => {
    // Arrange
    const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
      .map(l => l.match(/^\s*(\w+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]))
    const falso = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6NDEwMjQ0NDgwMH0.firmaInventada'
    const intruso = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + falso } } })

    // Act
    const { data, error } = await intruso.from('reservas').select('id').limit(1)

    // Assert: la firma no coincide, la base no le cree
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('PS-57 · ¿Y si un cliente intenta leer el correo, el teléfono y los puntos de otro?', async () => {
    // Arrange
    const marco = await entrar('marco')

    // Act
    const { data } = await juan.sb.from('profiles').select('correo, telefono, puntos').eq('id', marco.id)
    const publico = await juan.sb.from('perfiles_publicos').select('*').eq('id', marco.id).single()

    // Assert: no ve su perfil; del perfil publico solo el nombre y la foto
    // (la foto la eligio el mismo para mostrarla, migraciones/039)
    expect(data).toHaveLength(0)
    expect(Object.keys(publico.data).sort()).toEqual(['avatar_url', 'id', 'nombre'])
  })
})
