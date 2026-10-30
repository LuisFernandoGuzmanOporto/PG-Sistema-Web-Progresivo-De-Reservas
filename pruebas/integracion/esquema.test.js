import { describe, it, expect } from 'vitest'
import { hayBase, clienteAnonimo } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-17 · La base tiene todas las migraciones
//
// Varias reglas del sistema viven en la base (migraciones/). Si falta aplicar
// alguna, la aplicacion funciona igual pero sin esa proteccion. Esta prueba
// lo detecta antes que un usuario.
// ─────────────────────────────────────────────────────────────────────────────

const ULTIMA_MIGRACION = 45

describe.skipIf(!hayBase)('Versión del esquema', () => {
  it('PI-17 · la base de datos tiene su estructura al día, en la versión vigente', async () => {
    // Arrange
    const anon = clienteAnonimo()

    // Act
    const { data, error } = await anon.rpc('version_esquema')

    // Assert
    expect(error).toBeNull()
    expect(data).toBe(ULTIMA_MIGRACION)
  })
})
