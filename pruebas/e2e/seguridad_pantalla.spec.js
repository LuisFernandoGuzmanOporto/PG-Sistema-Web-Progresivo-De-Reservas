import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'
import { entrarComo } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-10 y PE-11 · Seguridad de lo que se muestra en pantalla
//
// PE-10: un cliente escribe un comentario con codigo que intenta ejecutarse en
// el navegador de quien lo lea (XSS). Otro cliente abre los comentarios: tiene
// que ver el texto tal cual, y el codigo no tiene que ejecutarse.
// PE-11: un cliente escribe a mano la direccion de una pantalla de otro rol.
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const ATAQUE = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>Hola'

test.describe.configure({ mode: 'serial' })
test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

let comentario, juan

test.beforeAll(async () => {
  juan = await entrarComo('juan.garcia@sportika.bo')
  const { data } = await juan.sb.from('comentarios')
    .insert({ empresa_id: SPORT_CENTER, autor_id: juan.usuario.id, texto: ATAQUE }).select().single()
  comentario = data
})

test.afterAll(async () => {
  if (comentario) await juan.sb.from('comentarios').delete().eq('id', comentario.id)
  for (const correo of ['pedro@sportcenter.com', 'rosa.v@sportika.bo', 'willy.a@sportika.bo', 'marco@email.com']) {
    const { sb, usuario } = await entrarComo(correo)
    // Por el contenido del ataque y no por la hora: la del servidor y la de esta
    // computadora no coinciden del todo, y los avisos quedaban sin borrar
    await sb.from('notificaciones').delete().eq('usuario_id', usuario.id).like('detalle', '%onerror=%')
  }
})

test('PE-10 · Un comentario con código malicioso se muestra como texto y no se ejecuta', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'marco')
  let alerta = false
  page.on('dialog', d => { alerta = true; d.dismiss() })

  // Act
  await page.goto('/app/empresa/' + SPORT_CENTER)
  await page.getByRole('button', { name: /★/ }).first().click()

  // Assert
  await expect(page.getByText(ATAQUE).first()).toBeVisible()
  expect(await page.evaluate(() => window.__xss)).toBeUndefined()
  expect(alerta).toBe(false)
  await page.getByText(ATAQUE).first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'pruebas/e2e/capturas/8_comentario_malicioso_como_texto.png' })
  await context.close()
})

test('PE-11 · Un cliente que escribe la dirección del panel de administración vuelve a su inicio', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'juan')

  // Act
  for (const ruta of ['/admin/dashboard', '/admin/reservas', '/empleado/panel', '/superadmin/usuarios']) {
    await page.goto(ruta)

    // Assert
    await expect(page).toHaveURL(/\/app\/dashboard$/)
  }
  await context.close()
})
