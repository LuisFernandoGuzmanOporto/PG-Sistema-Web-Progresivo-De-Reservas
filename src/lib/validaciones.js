// ─────────────────────────────────────────────────────────────────────────────
// LAS REGLAS DE LOS FORMULARIOS, EN UN SOLO LUGAR
//
// Un correo, un teléfono o un usuario se escriben en varias pantallas: al
// entrar, al registrar un complejo, al dar de alta un empleado o un entrenador,
// al tomar una reserva en el mostrador. Antes cada pantalla llevaba su propia
// expresión regular, y bastaba con corregir una para que las otras siguieran
// aceptando lo que ya se había decidido rechazar.
//
// Aquí viven las expresiones regulares y las comprobaciones que usan todas.
// Cada una devuelve verdadero o falso; el mensaje que se le muestra al usuario
// lo arma la pantalla, porque depende de lo que esté haciendo.
// ─────────────────────────────────────────────────────────────────────────────

export const REGEX = {
  // Un correo: algo, arroba, dominio con al menos dos letras después del punto
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  // El usuario de un empleado: letras sin tilde, números, punto, guion o guion bajo
  usuario: /^[a-z0-9._-]{3,30}$/i,
  // Lo que se admite escribir en un teléfono antes de contar sus dígitos
  telefono: /^[0-9\s-]+$/,
  // Un nombre completo lleva al menos dos palabras
  nombreCompleto: /^\S+(\s+\S+)+$/,
  // Un código de canje, como SPK-4KD9QZ
  codigoCanje: /^SPK-[A-Z0-9]{6}$/,
}

/** Solo los números de lo que se escribió: '700-12 345' → '70012345'. */
export const digitosDe = (valor) => String(valor ?? '').replace(/\D/g, '')

export const esCorreo = (valor) => REGEX.correo.test(String(valor ?? '').trim())

export const esUsuario = (valor) => REGEX.usuario.test(String(valor ?? '').trim())

/** En Bolivia un teléfono tiene 7 dígitos (fijo) u 8 (celular). */
export const esTelefono = (valor) => {
  const v = String(valor ?? '').trim()
  if (!REGEX.telefono.test(v)) return false
  const n = digitosDe(v).length
  return n === 7 || n === 8
}

export const tieneNombreYApellido = (valor) => REGEX.nombreCompleto.test(String(valor ?? '').trim())

/** La contraseña de un cliente pide 6 caracteres; la del complejo, 8. */
export const esClave = (valor, minimo = 6) => String(valor ?? '').length >= minimo

/** El número de camiseta va del 1 al 99, sin decimales. */
export const esDorsal = (valor) => {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1 && n <= 99
}

/** Un entero, para puntos, cupos o stock. `desde` es el mínimo admitido. */
export const esEntero = (valor, desde = 0) => {
  const n = Number(valor)
  return String(valor ?? '').trim() !== '' && Number.isInteger(n) && n >= desde
}

/** Un descuento en porcentaje: de 1 a 100. */
export const esPorcentaje = (valor) => {
  const n = Number(valor)
  return Number.isFinite(n) && n >= 1 && n <= 100
}

export const esCodigoCanje = (valor) => REGEX.codigoCanje.test(String(valor ?? '').trim().toUpperCase())
