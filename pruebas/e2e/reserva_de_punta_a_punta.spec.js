import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'
import { entrarComo } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-01 a PE-06 · La aplicacion de punta a punta, en el navegador
//
// Cada rol en su propia ventana. Juan reserva la cancha de padel desde la
// ficha del complejo y sube su comprobante; Marco abre el mismo dia y ve esa
// hora tomada; la empleada Rosa la confirma desde su panel y Juan la ve
// confirmada en su perfil. Al final se borra la reserva.
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const CANCHA = 'Cancha de Pádel'
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Un dia a cinco semanas, para no chocar con reservas reales de estos dias
const dia = new Date(); dia.setDate(dia.getDate() + 35)
const DIA_ISO = dia.getFullYear() + '-' + String(dia.getMonth() + 1).padStart(2, '0') + '-' +
                String(dia.getDate()).padStart(2, '0')
const mesesAdelante = (dia.getFullYear() - new Date().getFullYear()) * 12 + dia.getMonth() - new Date().getMonth()

// Un PNG de 1x1 como comprobante
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

/** Abre la ficha del complejo en la cancha y el dia de la prueba. */
async function abrirAgenda(page) {
  await page.goto('/app/empresa/' + SPORT_CENTER)
  await page.getByRole('button', { name: new RegExp(CANCHA) }).first().click()
  for (let i = 0; i < mesesAdelante; i++) await page.getByRole('button', { name: '▶' }).click()
  await page.getByRole('button', { name: new RegExp('^' + dia.getDate() + '$') }).first().click()
}

// Capturas de los momentos clave, para el documento (pruebas/e2e/capturas)
const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })

const franja = (page, hora) => page.getByRole('button', { name: new RegExp('^' + hora) })

test.describe.configure({ mode: 'serial' })
test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

let hora, reserva

test.afterAll(async () => {
  if (!reserva) return
  const { sb: admin } = await entrarComo('pedro@sportcenter.com')
  await admin.from('reservas').delete().eq('id', reserva.id)
  const { sb: superadmin } = await entrarComo('admin@sportika.bo')
  if (reserva.comprobante_url) await superadmin.storage.from('comprobantes').remove([reserva.comprobante_url])
  // Los avisos que genero la reserva, en la cuenta de cada uno
  for (const correo of ['juan.garcia@sportika.bo', 'pedro@sportcenter.com', 'rosa.v@sportika.bo', 'willy.a@sportika.bo']) {
    const { sb, usuario } = await entrarComo(correo)
    await sb.from('notificaciones').delete().eq('usuario_id', usuario.id).gte('created_at', reserva.created_at)
  }
})

test('PE-01 · Cada rol entra directo a su pantalla de inicio', async ({ browser }) => {
  // Arrange
  const inicio = { juan: /\/app\/dashboard$/, admin: /\/admin\/dashboard$/,
                   rosa: /\/empleado\/panel$/, superadmin: /\/superadmin\/dashboard$/ }

  for (const [quien, destino] of Object.entries(inicio)) {
    const { page, context } = await ventanaDe(browser, quien)

    // Act
    await page.goto('/login')

    // Assert
    await expect(page).toHaveURL(destino)
    await context.close()
  }
})

test('PE-02 · Juan reserva una hora libre y sube el comprobante desde la pantalla', async ({ browser }) => {
  // Arrange
  const { page, context, sb } = await ventanaDe(browser, 'juan')
  await abrirAgenda(page)
  const libre = page.getByRole('button', { name: /Libre/ }).first()
  hora = (await libre.textContent()).slice(0, 5)

  // Act
  await libre.click()
  await page.getByRole('button', { name: /^Reservar 1 hora · Bs\. 90/ }).click()
  await page.getByRole('button', { name: 'Apartar la hora y pagar' }).click()
  await expect(page.getByText('La hora está apartada a tu nombre')).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('✓ comprobante.png')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar Reserva' }).click()

  // Assert
  await expect(page.getByText('¡Reserva enviada!')).toBeVisible()
  await foto(page, '1_juan_reserva_enviada')
  const { data } = await sb.from('reservas').select('*')
    .eq('fecha', DIA_ISO).eq('hora_inicio', hora + ':00').eq('estado', 'pendiente')
  expect(data).toHaveLength(1)
  reserva = data[0]
  expect(Number(reserva.monto_total)).toBe(90)
  expect(reserva.comprobante_url).toBeTruthy()
  await context.close()
})

test('PE-03 · Marco abre el mismo día: esa hora ya no figura libre', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'marco')

  // Act
  await abrirAgenda(page)

  // Assert
  await expect(franja(page, hora)).toContainText('Reserva por confirmar')
  await expect(franja(page, hora)).toBeDisabled()
  await expect(franja(page, hora)).not.toContainText('Juan')
  await franja(page, hora).scrollIntoViewIfNeeded()
  await foto(page, '2_marco_ve_la_hora_tomada')
  await context.close()
})

test('PE-04 · La empleada Rosa ve el comprobante y confirma la reserva en su panel', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'rosa')
  await page.goto('/empleado/panel')
  const fila = page.getByRole('row').filter({ hasText: reserva.nro })
  await expect(fila).toContainText('Juan García')
  await expect(fila.getByRole('button', { name: '📎 Ver' })).toBeVisible()

  // Act
  await fila.getByRole('button', { name: 'Confirmar' }).click()

  // Assert
  await expect(fila).toContainText('Confirmada')
  await fila.scrollIntoViewIfNeeded()
  await foto(page, '3_rosa_confirma')
  await context.close()
})

test('PE-05 · Juan ve su reserva confirmada en «Mis Reservas»', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'juan')
  const fecha = `${dia.getDate()} ${MESES[dia.getMonth()]} ${dia.getFullYear()}`

  // Act
  await page.goto('/app/perfil')
  await page.getByRole('button', { name: /^Mis Reservas/ }).click()

  // Assert
  const tarjeta = page.locator('.card').filter({ hasText: fecha }).filter({ hasText: CANCHA })
    .filter({ hasText: hora }).last()
  await expect(tarjeta).toContainText('Confirmada')
  await tarjeta.scrollIntoViewIfNeeded()
  await foto(page, '4_juan_ve_su_reserva_confirmada')
  await context.close()
})

test('PE-06 · El administrador ve la reserva confirmada en Gestión de Reservas', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'admin')

  // Act
  await page.goto('/admin/reservas')

  // Assert
  await expect(page.getByText(reserva.nro).first()).toBeVisible()
  await context.close()
})
