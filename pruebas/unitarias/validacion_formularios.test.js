import { describe, it, expect } from 'vitest'
import { esCorreo, esUsuario, esUsuarioNuevo, esTelefono, errorEnTelefono, digitosDe, tieneNombreYApellido,
         errorEnNombre, errorEnNombreDeAlgo, esClave, errorEnClave, esMonto,
         esDorsal, esEntero, esPorcentaje, esCodigoCanje } from '../../src/lib/validaciones.js'

// ─────────────────────────────────────────────────────────────────────────────
// PV-01 a PV-10 · Validación de los formularios con expresiones regulares
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
    const invalidos = ['juan.garcia', 'juan@', '@sportika.bo', 'juan@sportika', 'juan @sportika.bo', '',
                       'juan,@sportika.bo', 'juan@sportika.c0m', 'juan..garcia@sportika.bo', 'juan@-sportika.bo']

    // Act
    const aceptados = validos.map(esCorreo)
    const rechazados = invalidos.map(esCorreo)

    // Assert
    expect(aceptados).toEqual([true, true, true])
    expect(rechazados.every(x => x === false)).toBe(true)
  })

  it('PV-02 · el usuario nuevo de un empleado empieza con letra y lleva letras, números y un signo entre ellos', () => {
    // Arrange
    const validos = ['rosa.v', 'willy_a', 'nelson-c', 'emp01']
    const invalidos = ['ro', 'rosa villarroel', 'rosá', 'rosa@v', 'r'.repeat(31), '12345', 'rosa..v', 'rosa.', '_rosa']

    // Act
    const aceptados = validos.map(esUsuarioNuevo)
    const rechazados = invalidos.map(esUsuarioNuevo)

    // Assert
    expect(aceptados.every(x => x === true)).toBe(true)
    expect(rechazados.every(x => x === false)).toBe(true)
    // Para entrar se sigue aceptando el formato de siempre, así nadie queda afuera
    expect(esUsuario('rosa.v')).toBe(true)
  })

  it('PV-03 · el teléfono es un celular de 8 dígitos que empieza con 6 o 7, o un fijo de 7 que empieza con 2, 3 o 4', () => {
    // Arrange
    const validos = ['70012345', '4123456', '700-12 345', '4 12 34 56', '62345678', '2123456', '3345678']
    const invalidos = ['700123', '700123456', '7001234a', '', '12345678', '80012345', '5123456', '1234567']

    // Act
    const aceptados = validos.map(esTelefono)
    const rechazados = invalidos.map(esTelefono)

    // Assert
    expect(aceptados.every(x => x === true)).toBe(true)
    expect(rechazados.every(x => x === false)).toBe(true)
    expect(digitosDe('700-12 345')).toBe('70012345')
    expect(errorEnTelefono('12345678')).toMatch(/empieza con 6 o 7/)
  })

  it('PV-04 · el nombre de una persona lleva solo letras, y nombre y apellido cuando se pide completo', () => {
    // Arrange: los dos últimos son los que antes se colaban, con un espacio y números
    const entradas = ['Juan García', '  Rosa  Villarroel  ', 'Juan', '   ', 'María José Paz',
                      "O'Brien Pérez-Gómez", 'Juan P.', 'Juan 12345', '123 456']

    // Act
    const resultado = entradas.map(tieneNombreYApellido)

    // Assert
    expect(resultado).toEqual([true, true, false, false, true, true, true, false, false])
    expect(errorEnNombre('Juan 12345')).toMatch(/no puede llevar números/)
    expect(errorEnNombre('Juan @@')).toMatch(/solo puede llevar letras/)
    expect(errorEnNombre('Juan')).toMatch(/Falta el apellido/)
    // Un jugador puede anotarse con una sola palabra, pero tampoco con números
    expect(errorEnNombre('Pelé', { completo: false })).toBeNull()
    expect(errorEnNombre('Juan2', { completo: false })).toMatch(/números/)
  })

  it('PV-05 · la contraseña pide 6 caracteres al cliente y 8 al complejo, sin contar espacios sueltos', () => {
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
    expect(esClave('      ')).toBe(false)
    expect(errorEnClave('      ')).toMatch(/solo espacios/)
    expect(esClave('a'.repeat(73))).toBe(false)
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

  it('PV-09 · el nombre de una cancha, un torneo o un equipo puede llevar números, pero no solo números o signos', () => {
    // Arrange
    const validos = ['Cancha 1', 'Copa 2026', 'Los 11 Amigos', 'Sport Center']
    const invalidos = ['123', '!!!', '#1 9', 'Ab']

    // Act
    const aceptados = validos.map(v => errorEnNombreDeAlgo(v))
    const rechazados = invalidos.map(v => errorEnNombreDeAlgo(v))

    // Assert
    expect(aceptados.every(x => x === null)).toBe(true)
    expect(rechazados.every(x => typeof x === 'string')).toBe(true)
  })

  it('PV-10 · un monto en bolivianos es un número desde 0 con dos decimales como máximo', () => {
    // Arrange
    const validos = ['80', '80.50', '80,5', '0']
    const invalidos = ['-5', '80.555', '1e3', 'abc', '']

    // Act
    const aceptados = validos.map(v => esMonto(v))
    const rechazados = invalidos.map(v => esMonto(v))

    // Assert
    expect(aceptados.every(x => x === true)).toBe(true)
    expect(rechazados.every(x => x === false)).toBe(true)
  })
})
