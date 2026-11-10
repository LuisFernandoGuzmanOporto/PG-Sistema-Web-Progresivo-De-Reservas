import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-22 · Funcionamiento sin conexión de la Aplicación Web Progresiva
//
// Lo pidió el tutor: una prueba específica de lo que hace SPORTIKA como PWA
// cuando no hay internet. A diferencia de la PE-16, que solo hace fallar las
// llamadas a la base, aquí se corta la red COMPLETA del navegador (como poner
// el teléfono en modo avión) y se cierra y se vuelve a abrir la aplicación.
// Lo único que puede mostrarla entonces es el Service Worker, con la interfaz
// que guardó en la caché.
//
//   1. Abrir la aplicación con internet.
//   2. Desconectar la red.
//   3. Cerrar y volver a abrir la aplicación.
//   4. Comprobar que se carga la interfaz almacenada en caché.
//   5. Comprobar que las operaciones que requieren conexión muestran el
//      mensaje correspondiente.
//   6. Restablecer la conexión.
// ─────────────────────────────────────────────────────────────────────────────

const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })
const AVISO = 'Sin conexión a internet'
const SIN_RED = 'No hay conexión a internet. Revisa tu conexión e inténtalo de nuevo'

test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')
test.setTimeout(150_000)

test('PE-22 · Sin red, la aplicación se vuelve a abrir desde la caché, avisa en lo que necesita internet y se recupera sola', async ({ browser }) => {
  // ── 1. Abrir la aplicación con internet ──────────────────────────────────
  const { page, context } = await ventanaDe(browser, 'juan')
  await page.goto('/app/dashboard')
  await expect(page.getByText('Juan García').first()).toBeVisible()
  await expect(page.getByText(AVISO)).toHaveCount(0)
  // El Service Worker queda a cargo de la página cuando terminó de guardar la interfaz en la caché
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 30_000 })
  const enCache = await page.evaluate(async () => {
    let total = 0
    for (const n of await caches.keys()) total += (await (await caches.open(n)).keys()).length
    return total
  })
  expect(enCache).toBeGreaterThan(0)
  await foto(page, 'PE-22_1_con_internet')

  // ── 2. Desconectar la red ────────────────────────────────────────────────
  await context.setOffline(true)

  // ── 3. Cerrar y volver a abrir la aplicación ─────────────────────────────
  await page.close()
  const app = await context.newPage()
  const inicio = Date.now()
  await app.goto('/app/dashboard')

  // ── 4. La interfaz se carga desde la caché ───────────────────────────────
  // Sin red, la página solo pudo salir del Service Worker: es él quien la controla
  expect(await app.evaluate(() => navigator.onLine)).toBe(false)
  expect(await app.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true)
  await expect(app).toHaveTitle(/Sportika/i)
  // La barra de la aplicación aparece con los datos de la cuenta guardados en este navegador,
  // sin quedarse esperando a que el servidor conteste (antes tardaba 7 segundos en reintentos)
  await expect(app.getByText('Juan García').first()).toBeVisible({ timeout: 30_000 })
  expect(Date.now() - inicio).toBeLessThan(4_000)
  await expect(app).not.toHaveURL(/\/login/)
  // Y no muestra los datos de ejemplo del código como si fueran reales
  for (const ejemplo of ['Liga de Baloncesto Sportika', 'Championship Wally Cup', 'Fútbol 5']) {
    await expect(app.getByText(ejemplo)).toHaveCount(0)
  }

  // ── 5. Lo que necesita internet avisa que no hay conexión ────────────────
  await expect(app.getByText(AVISO)).toBeVisible()
  await expect(app.getByText('Tu sesión sigue abierta')).toBeVisible()
  await foto(app, 'PE-22_2_abierta_desde_la_cache')
  // Reintentar sin red no puede traer los datos: el aviso sigue
  await app.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(app.getByText(AVISO)).toBeVisible()
  // Guardar un cambio necesita la base: dice que no hay conexión y no pierde lo escrito
  await app.goto('/app/perfil')
  await app.getByRole('button', { name: 'Editar Perfil' }).click({ timeout: 30_000 })
  const telefono = app.getByPlaceholder('Ej: 70012345')
  const original = await telefono.inputValue()
  await telefono.fill('70099999')
  await app.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(app.getByText(SIN_RED)).toBeVisible()
  await foto(app, 'PE-22_3_guardar_sin_conexion')

  // ── 6. Restablecer la conexión ───────────────────────────────────────────
  // No hace falta tocar nada: al volver la red, la página se actualiza sola
  await context.setOffline(false)
  await expect(app.getByText(AVISO)).toHaveCount(0, { timeout: 30_000 })
  // Sigue en la misma pantalla, con la sesión abierta y con el formulario como estaba
  await expect(app).toHaveURL(/\/app\/perfil$/)
  await expect(app.getByRole('heading', { name: 'Editar perfil' })).toBeVisible()
  await expect(telefono).toHaveValue('70099999')
  await foto(app, 'PE-22_4_conexion_restablecida')
  // Con conexión, guardar ya funciona (se deja el teléfono que tenía la cuenta)
  await telefono.fill(original)
  await app.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(app.getByRole('heading', { name: 'Editar perfil' })).toHaveCount(0)
  await expect(app.getByText(SIN_RED)).toHaveCount(0)
  await context.close()
})
