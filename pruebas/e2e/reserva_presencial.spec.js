import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-18 · Reserva presencial en el mostrador
//
// La empleada Rosa atiende a un cliente que llega sin la app: elige la cancha
// (con su precio), el día en el calendario del mes, dos horas libres, cobra en
// efectivo con vuelto y muestra la constancia. El alta de la reserva y la
// bitácora se responden dentro de esta ventana: la prueba no crea datos.
// ─────────────────────────────────────────────────────────────────────────────

test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

test('PE-18 · La empleada elige cancha y día en el calendario, cobra en efectivo con vuelto y muestra la constancia', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'rosa')
  const escrituras = []
  await context.route(/rest\/v1\/(reservas|bitacora)/, async (r) => {
    if (r.request().method() === 'GET') return r.continue()
    escrituras.push(r.request().url().split('/rest/v1/')[1].split('?')[0])
    return r.fulfill({ status: 201, contentType: 'application/json',
      body: JSON.stringify({ id: '00000000-0000-4000-8000-00000000f00d', nro: 'RES-PRUEBA',
        ...JSON.parse(r.request().postData() || '{}') }) })
  })
  const dia = new Date(); dia.setDate(dia.getDate() + 7)

  // Act
  await page.goto('/empleado/panel')
  await page.getByRole('button', { name: /Reserva presencial/ }).click()
  await page.getByRole('button', { name: /Cancha de Fútbol Principal/ }).click()
  if (dia.getMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await page.locator('button[title*="horas libres"]', { hasText: new RegExp('^' + dia.getDate()) }).first().click()
  const libres = page.getByRole('button', { name: /^\d\d:00\s*Libre/ })
  await libres.nth(10).click()
  await libres.nth(10).click()
  await page.getByPlaceholder('Ej: Carlos Mamani').fill('Cliente de Prueba')
  await page.getByPlaceholder('Ej: 70012345').fill('70012345')
  await page.locator('#campo-recibido').fill('300')
  const vuelto = await page.getByText(/Vuelto a entregar/).textContent()
  await page.getByRole('button', { name: 'Registrar y cobrar Bs. 240' }).click()

  // Assert
  expect(vuelto).toContain('Bs. 60')
  const constancia = page.getByRole('status')
  await expect(constancia).toContainText('Reserva registrada · Nº RES-PRUEBA')
  await expect(constancia).toContainText('Bs. 240 · efectivo')
  await expect(constancia).toContainText('Bs. 300 / Bs. 60')
  await expect(page.getByText('A nombre de Cliente de Prueba · 70012345').first()).toBeVisible()
  expect(escrituras).toEqual(['reservas', 'bitacora'])
  await page.screenshot({ path: 'pruebas/e2e/capturas/PE-18_reserva_presencial.png', fullPage: true })
  await context.close()
})
