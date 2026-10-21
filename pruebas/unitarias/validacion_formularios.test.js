import { describe, it, expect } from 'vitest'
import { esCorreo, esUsuario, esTelefono, digitosDe, tieneNombreYApellido,
         esClave, esDorsal, esEntero, esPorcentaje, esCodigoCanje } from '../../src/lib/validaciones.js'

// ─────────────────────────────────────────────────────────────────────────────
// PV-01 a PV-08 · Validación de los formularios con expresiones regulares
//
// Son las reglas que deciden si lo que escribe una persona en un formulario se
// acepta o se rechaza. Se prueban por separado, con valores válidos y con los
// errores que se cometen de verdad: un correo sin punto, un teléfono con menos
// dígitos, un usuario con tildes o espacios, un número de camiseta fuera de
// rango. Las usan todas las pantallas que piden esos datos (src/lib/validaciones.js).
// ─────────────────────────────────────────────────────────────────────────────

describe('Validación de los formularios', () => {
  it('PV-01 · el correo se acepta solo con arroba y un dominio con punto', () => {
    // Arrange
    const validos = ['juan.garcia@sportika.bo', 'a@b.co', 'rosa_v@mi-complejo.com.bo']
    const invalidos = ['juan.garcia', 'juan@', '@sportika.bo', 'juan@sportika', 'juan @sportika.bo', '']

    // Act
    const aceptados = validos.map(esCorreo)
    const rechazados = invalidos.map(esCorreo)

    // Assert
    expect(aceptados).toEqual([true, true, true])
    expect(rechazados.every(x => x === false)).toBe(true)
  })

  it('PV-02 · el usuario del empleado admite letras, números, punto y guion, entre 3 y 30 caracteres', () => {
    // Arrange
    const validos = ['rosa.v', 'willy_a', 'nelson-c', 'emp01']
    const invalidos = ['ro', 'rosa villarroel', 'rosá', 'rosa@v', 'r'.repeat(31)]

    // Act
    const aceptados = validos.map(esUsuario)
    const rechazados = invalidos.map(esUsuario)

    // Assert
    expect(aceptados.every(x => x === true)).toBe(true)
    expect(rechazados.every(x => x === false)).toBe(true)
  })

  it('PV-03 · el teléfono se acepta con 7 u 8 dígitos, escrito con espacios o guiones', () => {
    // Arrange
    const validos = ['70012345', '4123456', '700-12 345', '4 12 34 56']
    const invalidos = ['700123', '700123456', '7001234a', '']

    // Act
    const aceptados = validos.map(esTelefono)
    const rechazados = invalidos.map(esTelefono)

    // Assert
    expect(aceptados.every(x => x === true)).toBe(true)
    expect(rechazados.every(x => x === false)).toBe(true)
    expect(digitosDe('700-12 345')).toBe('70012345')
  })

  it('PV-04 · el nombre completo exige al menos nombre y apellido', () => {
    // Arrange
    const entradas = ['Juan García', '  Rosa  Villarroel  ', 'Juan', '   ', 'María José Paz']

    // Act
    const resultado = entradas.map(tieneNombreYApellido)

    // Assert
    expect(resultado).toEqual([true, true, false, false, true])
  })

  it('PV-05 · la contraseña pide 6 caracteres al cliente y 8 al complejo', () => {
    // Arrange
    const clave = 'abc123'

    // Act
    const comoCliente = esClave(clave)
    const comoComplejo = esClave(clave, 8)
    const largaComoComplejo = esClave('abc12345', 8)

    // Assert
    expect(comoCliente).toBe(true)
    expect(comoComplejo).toBe(false)
    expect(largaComoComplejo).toBe(true)
  })

  it('PV-06 · el número de camiseta va del 1 al 99, sin decimales', () => {
    // Arrange
    const entradas = [1, 10, 99, 0, 100, 7.5, '', 'diez']

    // Act
    const resultado = entradas.map(esDorsal)

    // Assert
    expect(resultado).toEqual([true, true, true, false, false, false, false, false])
  })

  it('PV-07 · los puntos, el cupo y el stock solo aceptan números enteros', () => {
    // Arrange y Act
    const puntos = [esEntero(300, 1), esEntero(0, 1), esEntero(1.5, 1), esEntero('', 1)]
    const stock = [esEntero(0), esEntero(10), esEntero(-1)]

    // Assert
    expect(puntos).toEqual([true, false, false, false])
    expect(stock).toEqual([true, true, false])
  })

  it('PV-08 · el descuento en porcentaje va de 1 a 100 y el código de canje sigue el formato SPK-XXXXXX', () => {
    // Arrange y Act
    const porcentajes = [esPorcentaje(20), esPorcentaje(100), esPorcentaje(0), esPorcentaje(150)]
    const codigos = [esCodigoCanje('SPK-4KD9QZ'), esCodigoCanje('spk-4kd9qz'), esCodigoCanje('SPK-4KD9'), esCodigoCanje('4KD9QZ')]

    // Assert
    expect(porcentajes).toEqual([true, true, false, false])
    expect(codigos).toEqual([true, true, false, false])
  })
})
