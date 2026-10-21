import { describe, it, expect } from 'vitest'
import { descuentoDeCanje } from '../../src/lib/guardar.js'

// ─────────────────────────────────────────────────────────────────────────────
// PU-25 a PU-28 · Descuento del código de canje al reservar
// Lo que ve el cliente antes de pagar. La base vuelve a calcularlo al guardar,
// pero si esta cuenta fallara, la pantalla mostraría un total distinto.
// ─────────────────────────────────────────────────────────────────────────────

describe('Descuento de un código de canje', () => {
  it('PU-25 · un descuento del 20 % sobre 2 horas de Bs. 120 descuenta Bs. 48', () => {
    // Arrange
    const canje = { tipo: 'porcentaje', valor: 20 }
    const reserva = { horas: 2, precioHora: 120 }

    // Act
    const descuento = descuentoDeCanje(canje, reserva)

    // Assert
    expect(descuento).toBe(48)
  })

  it('PU-26 · una hora gratis descuenta el precio de una hora', () => {
    // Arrange
    const canje = { tipo: 'horas_gratis', valor: 1 }
    const reserva = { horas: 3, precioHora: 90 }

    // Act
    const descuento = descuentoDeCanje(canje, reserva)

    // Assert
    expect(descuento).toBe(90)
  })

  it('PU-27 · las horas gratis nunca superan las horas reservadas', () => {
    // Arrange
    const canje = { tipo: 'horas_gratis', valor: 5 }
    const reserva = { horas: 2, precioHora: 60 }

    // Act
    const descuento = descuentoDeCanje(canje, reserva)

    // Assert: descuenta 2 horas, no 5; el total no queda negativo
    expect(descuento).toBe(120)
  })

  it('PU-28 · reservar sin código no descuenta nada (el código es opcional)', () => {
    // Arrange
    const canje = null
    const reserva = { horas: 2, precioHora: 120 }

    // Act
    const descuento = descuentoDeCanje(canje, reserva)

    // Assert
    expect(descuento).toBe(0)
  })
})
