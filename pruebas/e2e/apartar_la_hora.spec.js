import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'
import { entrarComo } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-19 y PE-20 · La hora se aparta mientras el cliente paga (migraciones/038)
//
// Juan elige una hora y pulsa «Apartar la hora y pagar»: la hora queda a su
// nombre por 10 minutos y recién ahí ve el QR. Marco, que mira la misma
// cancha, la ve apartada y no puede elegirla. Y si Marco tenía la agenda
// abierta desde antes y pulsa «Apartar» un instante después que Juan, el
// aviso le sale arriba del formulario y nunca ve el QR: no paga por una hora
// que no es suya. Al final se borran los apartados de prueba.
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const CANCHA = 'Cancha de Pádel'

// Un dia a cinco semanas y un dia, para no chocar con la prueba PE-02
const dia = new Date(); dia.setDate(dia.getDate() + 36)
const DIA_ISO = dia.getFullYear() + '-' + String(dia.getMonth() + 1).padStart(2, '0') + '-' +
                String(dia.getDate()).padStart(2, '0')
const mesesAdelante = (dia.getFullYear() - new Date().getFullYear()) * 12 + dia.getMonth() - new Date().getMonth()

async function abrirAgenda(page) {
  await page.goto('/app/empresa/' + SPORT_CENTER)
  await page.getByRole('button', { name: new RegExp(CANCHA) }).first().click()
  for (let i = 0; i < mesesAdelante; i++) await page.getByRole('button', { name: '▶' }).click()
  await page.getByRole('button', { name: new RegExp('^' + dia.getDate() + '$') }).first().click()
}

const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })
const franja = (page, hora) => page.getByRole('button', { name: new RegExp('^' + hora) })

test.describe.configure({ mode: 'serial' })
test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

test.afterAll(async () => {
  const { sb: admin } = await entrarComo('pedro@sportcenter.com')
  const { data: cancha } = await admin.from('canchas').select('id')
    .eq('empresa_id', SPORT_CENTER).eq('nombre', CANCHA).single()
  await admin.from('reservas').delete().eq('fecha', DIA_ISO).eq('cancha_id', cancha.id)
})

test('PE-19 · Mientras Juan paga, Marco ve esa hora apartada y no puede elegirla', async ({ browser }) => {
  // Arrange
  const juan = await ventanaDe(browser, 'juan')
  await abrirAgenda(juan.page)
  const libre = juan.page.getByRole('button', { name: /Libre/ }).first()
  const hora = (await libre.textContent()).slice(0, 5)

  // Act: Juan aparta la hora
  await libre.click()
  await juan.page.getByRole('button', { name: /^Reservar 1 hora · Bs\. 90/ }).click()
  await juan.page.getByRole('button', { name: 'Apartar la hora y pagar' }).click()

  // Assert: Juan ve el QR con su tiempo para pagar…
  await expect(juan.page.getByText('La hora está apartada a tu nombre')).toBeVisible()
  await expect(juan.page.getByText('Monto a pagar')).toBeVisible()
  // se espera a que cargue la imagen del QR antes de la captura
  await juan.page.getByAltText(/QR de pago/).evaluate(i => i.complete || new Promise(r => { i.onload = r; i.onerror = r }))
  await foto(juan.page, 'PE-19_juan_aparta_la_hora')

  // …y Marco, en su propia ventana, la ve apartada y no la puede elegir
  const marco = await ventanaDe(browser, 'marco')
  await abrirAgenda(marco.page)
  await expect(franja(marco.page, hora)).toContainText('Apartada')
  await expect(franja(marco.page, hora)).toBeDisabled()
  await franja(marco.page, hora).scrollIntoViewIfNeeded()
  await foto(marco.page, 'PE-19_marco_ve_la_hora_apartada')

  // Juan suelta la hora al cerrar el pago
  await juan.page.getByRole('button', { name: 'Soltar la hora' }).click()
  // (el botón de confirmar aparece arriba, en el aviso «¿Soltar la hora?»)
  await juan.page.getByRole('button', { name: 'Soltar la hora' }).first().click()
  await expect(juan.page.getByText('Pago y Comprobante')).toBeHidden()
  await juan.context.close()
  await marco.context.close()
})

test('PE-20 · Si Marco pulsa «Apartar» un instante después que Juan, recibe el aviso y no ve el QR', async ({ browser }) => {
  // Arrange: Marco tiene la agenda abierta y la hora todavía figura libre
  const marco = await ventanaDe(browser, 'marco')
  await abrirAgenda(marco.page)
  const libre = marco.page.getByRole('button', { name: /Libre/ }).first()
  const hora = (await libre.textContent()).slice(0, 5)
  await libre.click()
  await marco.page.getByRole('button', { name: /^Reservar 1 hora · Bs\. 90/ }).click()
  await expect(marco.page.getByRole('button', { name: 'Apartar la hora y pagar' })).toBeVisible()

  //          …y en ese momento Juan aparta la misma hora desde su teléfono
  const { sb: juan, usuario } = await entrarComo('juan.garcia@sportika.bo')
  const { data: cancha } = await juan.from('canchas').select('id')
    .eq('empresa_id', SPORT_CENTER).eq('nombre', CANCHA).single()
  const { error } = await juan.from('reservas').insert({
    cliente_id: usuario.id, empresa_id: SPORT_CENTER, cancha_id: cancha.id, fecha: DIA_ISO,
    hora_inicio: hora, hora_fin: String(parseInt(hora, 10) + 1).padStart(2, '0') + ':00',
    monto_total: 0, estado: 'apartada', origen: 'app',
  })
  expect(error).toBeNull()

  // Act: Marco pulsa «Apartar» un instante después
  await marco.page.getByRole('button', { name: 'Apartar la hora y pagar' }).click()

  // Assert: el aviso sale arriba del formulario y el QR nunca aparece
  await expect(marco.page.getByText(/ya no está disponible/)).toBeVisible()
  await expect(marco.page.getByText('Monto a pagar')).toHaveCount(0)
  await expect(marco.page.getByText('Pago y Comprobante')).toHaveCount(0)
  await expect(marco.page.getByRole('button', { name: 'Elegir otra hora' })).toBeVisible()
  await foto(marco.page, 'PE-20_marco_recibe_el_aviso')
  await marco.context.close()
})
