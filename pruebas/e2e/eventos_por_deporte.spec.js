import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'
import { entrarComo } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-12 y PE-13 · Quién anotó y quién vio tarjeta, en cada deporte
//
// La mesa tecnica registra cada anotacion y cada tarjeta con el jugador que la
// hizo. Marco, que solo mira, abre el partido en vivo: en futbol tiene que ver
// los goles con su minuto y las tarjetas; en basquet, los puntos de cada
// jugador, sin minuto ni tarjetas (no existen en ese deporte).
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })

test.describe.configure({ mode: 'serial' })
test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

let admin, inicio
const torneos = {}

/** Un torneo con dos equipos de dos jugadores y un partido en juego. */
async function armar(deporte, eventos) {
  const { data: t } = await admin.sb.from('torneos').insert({ empresa_id: SPORT_CENTER, creador_id: admin.usuario.id,
    creador_tipo: 'complejo', nombre: `${deporte} en vivo (prueba del sistema)`, deporte,
    formato: 'Grupos + Eliminacion', max_equipos: 4, estado: 'inscripciones' }).select().single()
  const equipos = []
  for (const [i, correo] of ['juan.garcia@sportika.bo', 'luisa@email.com'].entries()) {
    const c = await entrarComo(correo)
    const { data: e } = await c.sb.from('equipos').insert({ torneo_id: t.id, nombre: ['Los Halcones', 'Deportivo Norte'][i],
      capitan_id: c.usuario.id, capitan_nombre: 'Capitán ' + (i + 1) }).select().single()
    const { data: js } = await c.sb.from('equipo_jugadores').insert([
      { equipo_id: e.id, nombre: ['Diego Vargas', 'Pablo Rojas'][i], dorsal: 10 },
      { equipo_id: e.id, nombre: ['Iván Soria', 'Mario Paz'][i], dorsal: 7 }]).select('id, nombre, dorsal')
    await admin.sb.from('equipos').update({ estado: 'aprobado', grupo: 'A' }).eq('id', e.id)
    equipos.push({ ...e, jugadores: js })
  }
  await admin.sb.from('torneos').update({ estado: 'en_curso' }).eq('id', t.id)
  const { data: p } = await admin.sb.from('partidos_torneo').insert({ torneo_id: t.id, equipo_a_id: equipos[0].id,
    equipo_b_id: equipos[1].id, fase: 'grupos', grupo: 'A', estado: 'en_vivo', minuto: 35,
    goles_a: eventos.filter(e => e[0] === 0 && e[2] === 'gol').length,
    goles_b: eventos.filter(e => e[0] === 1 && e[2] === 'gol').length }).select().single()
  for (const [eq, jug, tipo, minuto] of eventos) {
    await admin.sb.from('eventos_partido').insert({ partido_id: p.id, equipo_id: equipos[eq].id,
      jugador_equipo_id: equipos[eq].jugadores[jug].id, tipo, minuto })
  }
  torneos[deporte] = t
}

test.beforeAll(async () => {
  // Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
  // del de Supabase, y un aviso creado al empezar quedaba sin borrar
  inicio = new Date(Date.now() - 60_000).toISOString()
  admin = await entrarComo('pedro@sportcenter.com')
  // [equipo, jugador, tipo, minuto]
  await armar('Fútbol', [[0, 0, 'gol', 12], [1, 0, 'amarilla', 20], [0, 1, 'gol', 31], [1, 1, 'roja', 33]])
  await armar('Básquetbol', [[0, 0, 'gol', null], [0, 0, 'gol', null], [1, 0, 'gol', null], [0, 1, 'gol', null]])
})

test.afterAll(async () => {
  for (const t of Object.values(torneos)) await admin.sb.from('torneos').delete().eq('id', t.id)
  for (const correo of ['juan.garcia@sportika.bo', 'luisa@email.com', 'pedro@sportcenter.com',
                        'rosa.v@sportika.bo', 'willy.a@sportika.bo']) {
    const { sb, usuario } = await entrarComo(correo)
    await sb.from('notificaciones').delete().eq('usuario_id', usuario.id).gte('created_at', inicio)
  }
})

test('PE-12 · En fútbol, Marco ve quién hizo cada gol con su minuto y quién vio amarilla o roja', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'marco')

  // Act
  await page.goto(`/app/torneos/${torneos['Fútbol'].id}/en-vivo`)

  // Assert
  const tarjeta = page.locator('div').filter({ hasText: '🔴 EN VIVO' }).filter({ hasText: 'Compartir por WhatsApp' }).last()
  await expect(tarjeta).toContainText("Diego Vargas (10) 12' ⚽")
  await expect(tarjeta).toContainText("Iván Soria (7) 31' ⚽")
  await expect(tarjeta).toContainText("🟨 Pablo Rojas (10) 20'")
  await expect(tarjeta).toContainText("🟥 Mario Paz (7) 33'")
  await page.getByRole('button', { name: /Goleadores/ }).click()
  await expect(page.locator('thead')).toContainText('🟨')
  await tarjeta.scrollIntoViewIfNeeded().catch(() => {})
  await page.getByRole('button', { name: /En Vivo/ }).first().click()
  await foto(page, '9_goles_y_tarjetas_en_futbol')
  await context.close()
})

test('PE-13 · En básquetbol, Marco ve los puntos de cada jugador, sin minuto ni tarjetas', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'marco')

  // Act
  await page.goto(`/app/torneos/${torneos['Básquetbol'].id}/en-vivo`)

  // Assert
  const tarjeta = page.locator('div').filter({ hasText: '🔴 EN VIVO' }).filter({ hasText: 'Compartir por WhatsApp' }).last()
  await expect(tarjeta.getByText('Diego Vargas (10) 🏀')).toHaveCount(2)
  await expect(tarjeta).toContainText('🏀 Pablo Rojas (10)')
  await expect(tarjeta).not.toContainText("'")
  await foto(page, '10_puntos_en_basquet')
  await page.getByRole('button', { name: /Anotadores/ }).click()
  await expect(page.locator('thead')).not.toContainText('🟨')
  await expect(page.locator('tbody tr').first()).toContainText('Diego Vargas')
  await context.close()
})
