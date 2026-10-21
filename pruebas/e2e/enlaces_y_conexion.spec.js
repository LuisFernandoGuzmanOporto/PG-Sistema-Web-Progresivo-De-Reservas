import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-14 a PE-17 · Enlaces compartidos, página inexistente, sin conexión y
// validación de formularios
//
// La sesión vive en el almacenamiento de CADA navegador. Pasarle un enlace a
// otra persona no le pasa la sesión ni cierra la propia: el que lo recibe entra
// con la suya, o inicia sesión y vuelve directo a ese enlace.
// ─────────────────────────────────────────────────────────────────────────────

const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })

test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

test('PE-14 · Juan comparte el enlace de un torneo: Marco lo abre con su sesión, un visitante va al login y Juan sigue conectado', async ({ browser }) => {
  // Arrange
  const juan = await ventanaDe(browser, 'juan')
  const { data: torneo } = await juan.sb.from('torneos').select('id, nombre').limit(1).single()
  const enlace = `/app/torneos/${torneo.id}/en-vivo`
  await juan.page.goto(enlace)
  await expect(juan.page.getByText(torneo.nombre).first()).toBeVisible()

  // Act: Marco abre el mismo enlace en su navegador
  const marco = await ventanaDe(browser, 'marco')
  await marco.page.goto(enlace)
  // …y alguien sin sesión también
  const visitante = await browser.newContext()
  const pv = await visitante.newPage()
  await pv.goto(enlace)

  // Assert
  await expect(marco.page.getByText(torneo.nombre).first()).toBeVisible()
  await expect(marco.page).toHaveURL(new RegExp(enlace + '$'))
  await expect(pv).toHaveURL(/\/login$/)
  expect(await pv.evaluate(() => window.history.state?.usr?.volverA)).toBe(enlace)
  await juan.page.reload()
  await expect(juan.page).toHaveURL(new RegExp(enlace + '$'))
  await expect(juan.page.getByText(torneo.nombre).first()).toBeVisible()
  await foto(marco.page, 'PE-14_enlace_compartido')
  await Promise.all([juan.context.close(), marco.context.close(), visitante.close()])
})

test('PE-15 · Una dirección que no existe muestra «Página no encontrada» sin la URL y sin cerrar la sesión', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'juan')

  // Act
  await page.goto('/esta-pagina-no-existe')

  // Assert
  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible()
  await expect(page.getByText('Tu sesión sigue activa.')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('esta-pagina-no-existe')
  await foto(page, 'PE-15_pagina_no_encontrada')
  await page.getByRole('button', { name: 'Ir a mi inicio' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
  await context.close()
})

test('PE-16 · Sin internet no se cierra la sesión: se avisa y, al volver la conexión, se recupera', async ({ browser }) => {
  // Arrange: el servidor no responde, como sin conexión
  const { page, context } = await ventanaDe(browser, 'juan')
  await context.route(/supabase\.co\/rest\//, r => r.abort('internetdisconnected'))

  // Act
  await page.goto('/app/dashboard')

  // Assert
  await expect(page.getByRole('heading', { name: 'Sin conexión a internet' })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
  await foto(page, 'PE-16_sin_conexion')
  await context.unroute(/supabase\.co\/rest\//)
  await page.getByRole('button', { name: 'Reintentar ahora' }).click()
  await expect(page.getByRole('heading', { name: 'Sin conexión a internet' })).toHaveCount(0)
  await expect(page).toHaveURL(/\/app\/dashboard$/)
  await context.close()
})

test('PE-17 · Un formulario incompleto marca el campo con error, dice qué corregir y lleva el cursor ahí', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'admin')
  await page.goto('/mi-cuenta')
  const nombre = page.locator('#campo-nombre')
  const telefono = page.locator('#campo-telefono')
  await expect(nombre).toBeVisible()

  // Act
  await nombre.fill('')
  await telefono.fill('123')
  await page.getByRole('button', { name: 'Guardar mis datos' }).click()

  // Assert
  await expect(nombre).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#error-nombre')).toContainText('Escribe tu nombre completo.')
  await expect(telefono).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#error-telefono')).toContainText('El teléfono debe tener 7 u 8 dígitos (tiene 3).')
  await expect(page.getByText('Revisa 2 datos antes de continuar:')).toBeVisible()
  await expect(nombre).toBeFocused()
  await foto(page, 'PE-17_validacion_campos')
  await context.close()
})
