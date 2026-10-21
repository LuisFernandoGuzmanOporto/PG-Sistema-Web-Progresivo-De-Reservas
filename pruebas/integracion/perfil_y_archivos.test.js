import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hayBase, entrarComo, clienteAnonimo, CUENTAS } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-27 a PI-29 · Foto de perfil, deporte favorito y escudos (migraciones/039)
//
// La foto se guarda en el depósito público, en avatares/<id>/, y el perfil
// solo acepta una foto de la propia carpeta o una de Google. El escudo de un
// equipo lo sube quien lo inscribe, mientras el torneo recibe inscripciones.
// Todo lo que se sube se borra al final y el perfil vuelve a quedar como
// estaba.
// ─────────────────────────────────────────────────────────────────────────────

// Una imagen PNG de 1x1
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const subir = (sb, ruta) => sb.storage.from('publico').upload(ruta, PNG, { contentType: 'image/png', upsert: true })

describe.skipIf(!hayBase)('Foto de perfil, deporte favorito y escudos', () => {
  let juan, marco, torneoAbierto
  const subidos = []

  beforeAll(async () => {
    juan  = await entrarComo(CUENTAS.cliente)
    marco = await entrarComo(CUENTAS.otroCliente)
    // Un torneo del complejo: ni Juan ni Marco lo organizan (el organizador sí puede quitar escudos)
    const { data } = await juan.sb.from('torneos').select('id')
      .eq('estado', 'inscripciones').eq('creador_tipo', 'complejo').limit(1)
    torneoAbierto = data?.[0]?.id
  })

  afterAll(async () => {
    if (!juan) return
    for (const q of [juan, marco]) {
      await q.sb.from('profiles').update({ avatar_url: null, deporte_fav: null }).eq('id', q.usuario.id)
    }
    if (subidos.length) await juan.sb.storage.from('publico').remove(subidos)
  })

  it('PI-27 · el cliente guarda su deporte favorito y su foto, y los demás ven esa foto', async () => {
    // Arrange: Juan sube su foto a su propia carpeta
    const ruta = `avatares/${juan.usuario.id}/prueba-pi27.png`
    const subida = await subir(juan.sb, ruta)
    if (!subida.error) subidos.push(ruta)

    // Act
    const { data, error } = await juan.sb.from('profiles')
      .update({ avatar_url: ruta, deporte_fav: 'Pádel' }).eq('id', juan.usuario.id)
      .select('avatar_url, deporte_fav').single()

    // Assert: queda guardado, y un visitante sin cuenta ve la foto junto al nombre
    expect(subida.error).toBeNull()
    expect(error).toBeNull()
    expect(data).toEqual({ avatar_url: ruta, deporte_fav: 'Pádel' })
    const { data: publico } = await clienteAnonimo().from('perfiles_publicos')
      .select('avatar_url').eq('id', juan.usuario.id).single()
    expect(publico.avatar_url).toBe(ruta)
  })

  it('PI-28 · nadie puede usar la carpeta de fotos de otro, ni poner una foto de otro sitio o un deporte que no existe', async () => {
    // Arrange: Marco intenta lo que no debería poder hacer
    const ajena = `avatares/${juan.usuario.id}/de-marco.png`

    // Act
    const subirAjena = await subir(marco.sb, ajena)
    const fotoAjena  = await marco.sb.from('profiles').update({ avatar_url: `avatares/${juan.usuario.id}/prueba-pi27.png` })
      .eq('id', marco.usuario.id).select()
    const otroSitio  = await marco.sb.from('profiles').update({ avatar_url: 'https://sitio-falso.com/foto.png' })
      .eq('id', marco.usuario.id).select()
    const inventado  = await marco.sb.from('profiles').update({ deporte_fav: 'Ajedrez' })
      .eq('id', marco.usuario.id).select()
    const deGoogle   = await marco.sb.from('profiles')
      .update({ avatar_url: 'https://lh3.googleusercontent.com/a/foto-de-prueba' })
      .eq('id', marco.usuario.id).select('avatar_url').single()

    // Assert: todo rechazado, salvo una foto de Google, que sí se acepta
    if (!subirAjena.error) subidos.push(ajena)
    expect(subirAjena.error?.message).toMatch(/row-level security/)
    expect(fotoAjena.error?.message).toMatch(/perfil_foto_valida/)
    expect(otroSitio.error?.message).toMatch(/perfil_foto_valida/)
    expect(inventado.error?.message).toMatch(/perfil_deporte_valido/)
    expect(deGoogle.error).toBeNull()
  })

  it('PI-29 · el capitán sube el escudo de su equipo y otro cliente no puede borrarlo', async () => {
    // Arrange
    expect(torneoAbierto).toBeTruthy()
    const ruta = `equipos/${torneoAbierto}/escudo-prueba-pi29.png`

    // Act
    const subida = await subir(juan.sb, ruta)
    if (!subida.error) subidos.push(ruta)
    const { data: borrado } = await marco.sb.storage.from('publico').remove([ruta])
    const { data: sigue } = await juan.sb.storage.from('publico').list(`equipos/${torneoAbierto}`,
      { search: 'escudo-prueba-pi29' })

    // Assert: Juan pudo subirlo; el intento de Marco no borró nada
    expect(subida.error).toBeNull()
    expect(borrado ?? []).toHaveLength(0)
    expect(sigue.map(f => f.name)).toContain('escudo-prueba-pi29.png')
  })
})
