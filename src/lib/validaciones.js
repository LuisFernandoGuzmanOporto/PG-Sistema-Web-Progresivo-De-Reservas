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

// Una palabra de un nombre de persona: solo letras (con tildes, ñ o ü), que
// pueden ir unidas por un apóstrofo, un guion o un punto: O'Brien, Pérez-Gómez, P.
const PALABRA = String.raw`\p{L}+(?:[.'’-]\p{L}*)*`

export const REGEX = {
  // Un correo: usuario, arroba y un dominio que termina en letras (.com, .bo).
  // Antes bastaba con «algo@algo.algo»: pasaban «juan,@x.com» o «juan@x.c0m».
  correo: /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/,
  // El usuario con el que entra un empleado: letras sin tilde, números, punto, guion o guion bajo
  usuario: /^[a-z0-9._-]{3,30}$/i,
  // El usuario NUEVO de un empleado, además, empieza con una letra y no lleva
  // dos signos seguidos ni termina en uno: rosa.v sí; 12345, rosa..v o rosa. no
  usuarioNuevo: /^[a-z](?:[a-z0-9]|[._-](?=[a-z0-9])){2,29}$/i,
  // Lo que se admite escribir en un teléfono antes de contar sus dígitos
  telefono: /^[0-9\s-]+$/,
  // El nombre de una persona: solo letras, en una o más palabras
  nombrePersona: new RegExp(`^${PALABRA}(?:\\s+${PALABRA})*$`, 'u'),
  // Un nombre completo: lo mismo, pero con al menos dos palabras (nombre y apellido).
  // Antes eran dos palabras de cualquier cosa, y pasaban «Juan 12345» o «123 456».
  nombreCompleto: new RegExp(`^${PALABRA}(?:\\s+${PALABRA})+$`, 'u'),
  // Un código de canje, como SPK-4KD9QZ
  codigoCanje: /^SPK-[A-Z0-9]{6}$/,
}

export const LARGO_MAXIMO_NOMBRE = 60

/** Solo los números de lo que se escribió: '700-12 345' → '70012345'. */
export const digitosDe = (valor) => String(valor ?? '').replace(/\D/g, '')

export const esCorreo = (valor) => REGEX.correo.test(String(valor ?? '').trim())

export const esUsuario = (valor) => REGEX.usuario.test(String(valor ?? '').trim())

/** Para crear la cuenta de un empleado: empieza con letra y sin signos repetidos. */
export const esUsuarioNuevo = (valor) => REGEX.usuarioNuevo.test(String(valor ?? '').trim())

/**
 * En Bolivia un celular tiene 8 dígitos y empieza con 6 o 7; un teléfono fijo
 * tiene 7 y empieza con el código de su región: 2, 3 o 4. Antes se aceptaba
 * cualquier número de 7 u 8 dígitos, como 12345678.
 */
export const esTelefono = (valor) => errorEnTelefono(valor) === null

/** Qué tiene de malo un teléfono, en palabras; null si está bien (o si está vacío). */
export function errorEnTelefono(valor) {
  const v = String(valor ?? '').trim()
  if (!v) return 'Escribe un número de teléfono.'
  if (!REGEX.telefono.test(v)) return 'El teléfono solo puede tener números, espacios o guiones.'
  const d = digitosDe(v)
  if (d.length !== 7 && d.length !== 8) return `El teléfono debe tener 7 u 8 dígitos (tiene ${d.length}). Ejemplo: 4123456 o 70012345.`
  if (d.length === 8 && !/^[67]/.test(d)) return 'Revisa el número: un celular tiene 8 dígitos y empieza con 6 o 7.'
  if (d.length === 7 && !/^[234]/.test(d)) return 'Revisa el número: un teléfono fijo tiene 7 dígitos y empieza con 2, 3 o 4.'
  return null
}

export const tieneNombreYApellido = (valor) => {
  const v = String(valor ?? '').trim()
  return v.length <= LARGO_MAXIMO_NOMBRE && REGEX.nombreCompleto.test(v)
}

/**
 * Qué tiene de malo el nombre de una persona, en palabras; null si está bien.
 * completo: true pide nombre y apellido (cuentas, capitán, empleados,
 * entrenadores); false acepta una sola palabra (jugadores de un equipo).
 * Si está vacío devuelve null: cada pantalla dice qué nombre falta.
 */
export function errorEnNombre(valor, { completo = true } = {}) {
  const v = String(valor ?? '').trim()
  if (!v) return null
  if (/\d/.test(v)) return 'El nombre no puede llevar números: escribe solo letras.'
  if (!/^[\p{L}\s.'’-]+$/u.test(v)) return 'El nombre solo puede llevar letras, espacios, guiones o apóstrofos.'
  if (v.length > LARGO_MAXIMO_NOMBRE) return `El nombre es muy largo: usa como máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`
  if ((v.match(/\p{L}/gu) || []).length < 2) return 'El nombre es muy corto: escribe al menos dos letras.'
  if (!REGEX.nombrePersona.test(v)) return 'Revisa el nombre: cada palabra debe empezar con una letra.'
  if (completo && !REGEX.nombreCompleto.test(v)) return 'Falta el apellido: escribe nombre y apellido, por ejemplo Juan Pérez.'
  return null
}

/**
 * Qué tiene de malo el nombre de algo (un complejo, una cancha, un torneo, un
 * equipo, un entrenamiento, una recompensa); null si está bien o si está vacío.
 * Puede llevar números («Cancha 1», «Copa 2026»), pero no solo números o signos.
 */
export function errorEnNombreDeAlgo(valor, { minimo = 3, maximo = 60 } = {}) {
  const v = String(valor ?? '').trim()
  if (!v) return null
  if (v.length < minimo) return `El nombre es muy corto: usa al menos ${minimo} caracteres.`
  if (v.length > maximo) return `El nombre es muy largo: usa como máximo ${maximo} caracteres.`
  if ((v.match(/\p{L}/gu) || []).length < 2) return 'El nombre debe tener letras, no solo números o signos.'
  return null
}

/** Un texto largo (dirección, descripción) debe tener palabras, no solo números o signos. */
export const tieneLetras = (valor, cuantas = 3) => (String(valor ?? '').match(/\p{L}/gu) || []).length >= cuantas

/**
 * La contraseña de un cliente pide 6 caracteres; la del complejo, 8. No cuentan
 * los espacios del principio y del final: antes «      » servía de contraseña.
 * Supabase acepta como máximo 72.
 */
export const LARGO_MAXIMO_CLAVE = 72
export const esClave = (valor, minimo = 6) => {
  const v = String(valor ?? '')
  return v.trim().length >= minimo && v.length <= LARGO_MAXIMO_CLAVE
}

/** Qué tiene de malo una contraseña nueva; null si está bien. */
export function errorEnClave(valor, minimo = 6) {
  const v = String(valor ?? '')
  if (!v) return 'Crea una contraseña.'
  if (!v.trim()) return 'La contraseña no puede ser solo espacios.'
  if (v.trim().length < minimo) return `La contraseña debe tener al menos ${minimo} caracteres (tiene ${v.trim().length}).`
  if (v.length > LARGO_MAXIMO_CLAVE) return `La contraseña puede tener como máximo ${LARGO_MAXIMO_CLAVE} caracteres.`
  return null
}

/** Un monto en bolivianos: un número, desde `desde`, con dos decimales como máximo. */
export const esMonto = (valor, { desde = 0, hasta = 100000 } = {}) => {
  const t = String(valor ?? '').trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(t)) return false
  const n = Number(t.replace(',', '.'))
  return n >= desde && n <= hasta
}

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
