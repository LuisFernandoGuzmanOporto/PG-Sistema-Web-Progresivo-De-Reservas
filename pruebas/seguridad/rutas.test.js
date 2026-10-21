import { describe, it, expect } from 'vitest'
import { rutaInterna } from '../../src/lib/rutas.js'

describe('Direcciones a las que la aplicación acepta navegar', () => {
  it('SEG-08 · solo acepta direcciones propias: rechaza otro sitio escrito con // o /\\', () => {
    // Arrange
    const destinos = ['/app/torneos/5/en-vivo', '//sitio-falso.com', '/\\sitio-falso.com',
                      'https://sitio-falso.com', '/app\tx', null]

    // Act
    const aceptados = destinos.map(rutaInterna)

    // Assert
    expect(aceptados).toEqual(['/app/torneos/5/en-vivo', null, null, null, null, null])
  })
})
