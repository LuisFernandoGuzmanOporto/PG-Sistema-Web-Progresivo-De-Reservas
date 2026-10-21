import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'
import { entrarComo } from '../integracion/conexion.js'
import { sortearGrupos, generarFixture, calcularTabla, generarCuadro } from '../../src/lib/torneo.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-07 a PE-09 · Otro cliente sigue un torneo desde su celular
//
// El complejo arma un torneo de cuatro equipos y la mesa tecnica lo va
// jugando. Marco, que no participa, lo sigue en la pantalla «En Vivo»: ve el
// partido que se esta jugando con su marcador, la tabla de posiciones y, al
// terminar, al campeon. Al final se borra el torneo.
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const NOMBRE = 'Copa En Vivo (prueba del sistema)'
const CAPITANES = ['juan.garcia@sportika.bo', 'luisa@email.com', 'ana.lopez@email.com', 'diego@email.com']
const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })

test.describe.configure({ mode: 'serial' })
test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

let admin, rosa, torneo, equipos = [], enJuego, inicio

test.beforeAll(async () => {
  // Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
  // del de Supabase, y un aviso creado al empezar quedaba sin borrar
  inicio = new Date(Date.now() - 60_000).toISOString()
  admin = await entrarComo('pedro@sportcenter.com')
  rosa = await entrarComo('rosa.v@sportika.bo')
  const { data: t } = await admin.sb.from('torneos').insert({ empresa_id: SPORT_CENTER, creador_id: admin.usuario.id,
    creador_tipo: 'complejo', nombre: NOMBRE, emoji: '⚽', deporte: 'Fútbol', formato: 'Grupos + Eliminacion',
    max_equipos: 4, estado: 'inscripciones' }).select().single()
  torneo = t
  for (const [i, correo] of CAPITANES.entries()) {
    const c = await entrarComo(correo)
    const { data: e } = await c.sb.from('equipos').insert({ torneo_id: torneo.id, nombre: ['Los Halcones', 'Deportivo Norte',
      'Atlético Sur', 'Real Cercado'][i], capitan_id: c.usuario.id, capitan_nombre: 'Capitán ' + (i + 1) }).select().single()
    equipos.push(e)
  }
  for (const e of equipos) await admin.sb.from('equipos').update({ estado: 'aprobado' }).eq('id', e.id)
  const grupos = sortearGrupos(equipos, 1)
  for (const e of grupos.A) await admin.sb.from('equipos').update({ grupo: 'A' }).eq('id', e.id)
  await admin.sb.from('partidos_torneo').insert(generarFixture(grupos).map(p => ({ torneo_id: torneo.id,
    equipo_a_id: p.equipo1_id, equipo_b_id: p.equipo2_id, fase: 'grupos', grupo: 'A', estado: 'programado' })))
  await admin.sb.from('torneos').update({ estado: 'en_curso' }).eq('id', torneo.id)
})

test.afterAll(async () => {
  if (torneo) await admin.sb.from('torneos').delete().eq('id', torneo.id)
  // Los puntos de inscripcion se descuentan solos al borrar los equipos (033).
  // Las notificaciones que genero el torneo, en la cuenta de cada uno:
  for (const correo of [...CAPITANES, 'pedro@sportcenter.com', 'rosa.v@sportika.bo', 'willy.a@sportika.bo']) {
    const { sb, usuario } = await entrarComo(correo)
    await sb.from('notificaciones').delete().eq('usuario_id', usuario.id).gte('created_at', inicio)
  }
})

/** Resultado fijo: gana siempre el equipo inscrito antes. */
const orden = (id) => equipos.findIndex(e => e.id === id)

test('PE-07 · Marco ve en vivo el partido que se está jugando, con su marcador', async ({ browser }) => {
  // Arrange: la mesa tecnica termina cinco partidos y deja uno en juego
  const { data: partidos } = await rosa.sb.from('partidos_torneo').select('*').eq('torneo_id', torneo.id)
  enJuego = partidos[partidos.length - 1]
  for (const p of partidos.slice(0, -1)) {
    const ganaA = orden(p.equipo_a_id) < orden(p.equipo_b_id)
    await rosa.sb.from('partidos_torneo').update({ goles_a: ganaA ? 2 : 0, goles_b: ganaA ? 0 : 2, estado: 'finalizado' }).eq('id', p.id)
  }
  await rosa.sb.from('partidos_torneo').update({ goles_a: 1, goles_b: 0, estado: 'en_vivo', minuto: 30 }).eq('id', enJuego.id)
  const { page, context } = await ventanaDe(browser, 'marco')

  // Act
  await page.goto(`/app/torneos/${torneo.id}/en-vivo`)

  // Assert
  const nombreA = equipos.find(e => e.id === enJuego.equipo_a_id).nombre
  const nombreB = equipos.find(e => e.id === enJuego.equipo_b_id).nombre
  await expect(page.getByText('🔴 EN VIVO').first()).toBeVisible()
  await expect(page.getByText(nombreA).first()).toBeVisible()
  await expect(page.getByText(nombreB).first()).toBeVisible()
  await foto(page, '5_marco_sigue_el_partido_en_vivo')
  await context.close()
})

test('PE-08 · Marco ve la tabla de posiciones actualizada con los resultados', async ({ browser }) => {
  // Arrange: termina el partido que estaba en juego
  const ganaA = orden(enJuego.equipo_a_id) < orden(enJuego.equipo_b_id)
  await rosa.sb.from('partidos_torneo').update({ goles_a: ganaA ? 2 : 0, goles_b: ganaA ? 0 : 2, estado: 'finalizado' }).eq('id', enJuego.id)
  const { page, context } = await ventanaDe(browser, 'marco')

  // Act
  await page.goto(`/app/torneos/${torneo.id}/en-vivo`)
  await page.getByRole('button', { name: /Posiciones/ }).first().click()

  // Assert: el lider tiene 9 puntos y el ultimo 0, en ese orden
  const filas = page.locator('tbody tr')
  await expect(filas).toHaveCount(4)
  for (const [i, e] of equipos.entries()) await expect(filas.nth(i)).toContainText(e.nombre)
  await expect(filas.nth(0)).toContainText('9')
  await foto(page, '6_marco_ve_las_posiciones')
  await context.close()
})

test('PE-09 · Al terminar la final, Marco ve al campeón del torneo', async ({ browser }) => {
  // Arrange: semifinales y final, como las carga la mesa tecnica
  const { data: jugados } = await rosa.sb.from('partidos_torneo').select('*').eq('torneo_id', torneo.id)
  const nombre = new Map(equipos.map(e => [e.id, e.nombre]))
  const aMesa = jugados.map(p => ({ ...p, equipo1: nombre.get(p.equipo_a_id), equipo2: nombre.get(p.equipo_b_id),
    g1: p.goles_a, g2: p.goles_b }))
  const tablas = { A: calcularTabla(equipos, aMesa, 'Fútbol') }
  const porNombre = new Map(equipos.map(e => [e.nombre, e.id]))
  const jugar = async (l) => {
    const ganaA = orden(porNombre.get(l.equipo1)) < orden(porNombre.get(l.equipo2))
    await rosa.sb.from('partidos_torneo').insert({ torneo_id: torneo.id, equipo_a_id: porNombre.get(l.equipo1),
      equipo_b_id: porNombre.get(l.equipo2), fase: 'eliminatoria', ronda: l.llave,
      goles_a: ganaA ? 3 : 1, goles_b: ganaA ? 1 : 3, estado: 'finalizado' })
    return { g1: ganaA ? 3 : 1, g2: ganaA ? 1 : 3, estado: 'finalizado' }
  }
  const res = {}
  for (const l of generarCuadro(tablas, 2)[0]) res[l.llave] = await jugar(l)
  await jugar(generarCuadro(tablas, 2, res)[1][0])
  await admin.sb.from('torneos').update({ estado: 'finalizado' }).eq('id', torneo.id)
  const { page, context } = await ventanaDe(browser, 'marco')

  // Act
  await page.goto(`/app/torneos/${torneo.id}/en-vivo`)

  // Assert
  await expect(page.getByText('Torneo finalizado').first()).toBeVisible()
  await expect(page.getByText('Campeón de ' + NOMBRE)).toBeVisible()
  await expect(page.getByText(equipos[0].nombre).first()).toBeVisible()
  await foto(page, '7_marco_ve_al_campeon')
  await context.close()
})
