import { test, expect } from '@playwright/test'
import { hayBase, ventanaDe } from './sesion.js'
import { entrarComo } from '../integracion/conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PE-21 · Foto de perfil y deporte favorito (migraciones/039)
//
// Juan sube su foto desde Mi Perfil y elige el pádel como deporte favorito.
// La foto aparece arriba, junto a su nombre, y en su inicio la aplicación le
// muestra primero lo de pádel. Al final su perfil vuelve a quedar como estaba
// y se borra la foto de prueba.
// ─────────────────────────────────────────────────────────────────────────────

const foto = (page, nombre) => page.screenshot({ path: `pruebas/e2e/capturas/${nombre}.png` })

test.skip(!hayBase, 'Falta .env.pruebas.local con la clave de las cuentas de prueba')

test.afterAll(async () => {
  const { sb, usuario } = await entrarComo('juan.garcia@sportika.bo')
  await sb.from('profiles').update({ avatar_url: null, deporte_fav: null }).eq('id', usuario.id)
  const { data } = await sb.storage.from('publico').list('avatares/' + usuario.id)
  if (data?.length) await sb.storage.from('publico').remove(data.map(f => 'avatares/' + usuario.id + '/' + f.name))
})

test('PE-21 · Juan sube su foto y elige su deporte favorito: los ve en su perfil y su inicio le muestra primero el pádel', async ({ browser }) => {
  // Arrange
  const { page, context } = await ventanaDe(browser, 'juan')
  await page.goto('/app/perfil')

  // Act: la foto
  await page.getByLabel('Elegir una foto de perfil').setInputFiles('pruebas/e2e/recursos/foto_perfil.png')
  await expect(page.getByText('Listo, tu foto quedó guardada.')).toBeVisible()

  //      y el deporte favorito
  await page.getByRole('button', { name: 'Editar Perfil' }).click()
  await page.locator('select').filter({ hasText: 'Todavía no lo elijo' }).selectOption('Pádel')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()

  // Assert: la foto arriba y en el perfil, y el deporte en sus datos
  await expect(page.locator('nav').getByRole('img', { name: /Foto de/ })).toBeVisible()
  await expect(page.getByText('Tus datos quedaron actualizados.')).toBeVisible()
  await expect(page.getByText(/🏓 Pádel/)).toBeVisible()
  await foto(page, 'PE-21_juan_foto_y_deporte')

  //         y en su inicio, primero lo de pádel
  await page.goto('/app/dashboard')
  await expect(page.getByText('Te mostramos primero lo de Pádel, tu deporte favorito.')).toBeVisible()
  await foto(page, 'PE-21_inicio_con_su_deporte')
  await context.close()
})
