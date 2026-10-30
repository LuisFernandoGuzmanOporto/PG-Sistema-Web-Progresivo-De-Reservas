// ─────────────────────────────────────────────────────────────────────────────
// TRADUCIR LO QUE DICE LA BASE
//
// Postgres y PostgREST contestan en inglés y hablando de sí mismos:
//
//   «new row violates row-level security policy for table "reservas"»
//
// El que reserva una cancha no tiene por qué entender eso. Aquí cada error se
// convierte en una frase que dice qué pasó y qué puede hacer la persona.
//
// Los mensajes que la propia base lanza a propósito (RAISE EXCEPTION) también
// pasan por aquí, para que todos tengan el mismo tono y ortografía.
// ─────────────────────────────────────────────────────────────────────────────

// Mensajes de la base → texto para el usuario. El orden importa: gana el primero.
const MENSAJES_DE_LA_BASE = [
  [/no te alcanzan los puntos: (?:tenes|tienes) (\d+) y necesitas (\d+)/,
    (_, t, n) => `No tienes puntos suficientes: tienes ${t} y esta recompensa cuesta ${n}.`],
  [/(?:tenes|tienes) que iniciar sesi[oó]n para canjear/, () => 'Inicia sesión para canjear tus puntos.'],
  [/esa recompensa ya no est[aá] disponible/, () => 'Esta recompensa fue desactivada por el complejo.'],
  [/esa recompensa se agot[oó]/, () => 'Esta recompensa se agotó: ya no quedan para canjear.'],
  [/esa recompensa ya no existe/, () => 'Esta recompensa ya no existe. Actualiza la página para ver las disponibles.'],
  [/esa recompensa no tiene el descuento configurado/, () => 'Esta recompensa no tiene configurado el valor del descuento. Avisa al complejo.'],
  [/ese codigo de canje no existe/, () => 'El código de canje no existe. Revisa que esté bien escrito.'],
  [/ese codigo de canje ya se uso/, () => 'Ese código de canje ya fue utilizado.'],
  [/ese codigo de canje no es tuyo/, () => 'Ese código de canje pertenece a otra cuenta.'],
  [/ese codigo de canje es de otro complejo/, () => 'Ese código de canje es de otro complejo y no se puede usar aquí.'],
  [/ese canje no sirve para descontar una reserva/, () => 'Ese canje no es un descuento de reserva.'],
  [/ese canje no sirve para inscribir un equipo/, () => 'Ese canje no sirve para pagar una inscripción.'],
  [/este torneo lo organiza un cliente/, () => 'Este torneo lo organiza un cliente: la inscripción se paga directamente al organizador.'],
  [/este torneo permite hasta (\d+) jugadores/, (_, n) => `Este torneo permite como máximo ${n} jugadores por equipo.`],
  [/el torneo ya tiene sus (\d+) equipos aprobados/, (_, n) => `El torneo ya completó sus ${n} equipos. No quedan cupos.`],
  [/este torneo todav[ií]a no recibe inscripciones/, () => 'Este torneo aún no recibe inscripciones: el complejo todavía no aprobó la cancha.'],
  [/este torneo ya no recibe inscripciones/, () => 'Las inscripciones de este torneo ya cerraron.'],
  [/el partido ya est[aá] completo \((\d+) jugadores\)/, (_, n) => `El partido ya está completo (${n} jugadores).`],
  [/ese partido ya no est[aá] abierto/, () => 'Este partido ya no acepta jugadores.'],
  [/ese partido ya se jug[oó]/, () => 'Ese partido ya se jugó. Busca otro o crea el tuyo.'],
  [/esa hora ya pas[oó]\. elige una hora/, () => 'Esa hora ya pasó. Elige una hora que todavía no llegó.'],
  [/ese horario ya pas[oó]/, () => 'Ese horario ya pasó. Elige una hora a partir de ahora.'],
  [/el complejo atiende de ([\d:]+) a ([\d:]+)/, (_, a, c) => `El complejo atiende de ${a.slice(0, 5)} a ${c.slice(0, 5)}. Elige un horario dentro de ese rango.`],
  [/las reservas son por horas completas/, () => 'Las reservas son por horas completas (por ejemplo, de 18:00 a 19:00).'],
  [/la hora de fin tiene que ser posterior/, () => 'La hora de fin debe ser posterior a la de inicio.'],
  [/el horario de la reserva no es valido/, () => 'El horario de la reserva no es válido. Revisa la hora de inicio y de fin.'],
  [/esa cancha no pertenece a este complejo/, () => 'Esa cancha no pertenece a este complejo.'],
  [/esa cancha (ya )?no est[aá] disponible/, () => 'Esta cancha no está disponible en este momento. Elige otra.'],
  [/este complejo no est[aá] recibiendo reservas/, () => 'Este complejo no está recibiendo reservas por ahora.'],
  [/una reserva solo la puede modificar el complejo/, () => 'Solo el complejo puede modificar una reserva ya hecha.'],
  [/tu cuenta est[aá] suspendida/, () => 'Tu cuenta está suspendida. Comunícate con Sportika para más información.'],
  // Apartar la hora mientras se paga (migraciones/038)
  [/ya tienes una hora apartada/, () => 'Ya tienes una hora apartada. Termina ese pago o suéltala antes de apartar otra.'],
  [/falta el comprobante de pago/, () => 'Falta el comprobante de pago. Súbelo para continuar.'],
  [/ese comprobante no corresponde a esta reserva/, () => 'Ese comprobante no corresponde a esta reserva. Vuelve a subirlo.'],
  [/esta reserva ya tiene su comprobante/, () => 'Esta reserva ya tiene su comprobante. El complejo la está revisando.'],
  [/esta reserva ya no se puede modificar/, () => 'Esta reserva ya no se puede modificar.'],
  [/esa reserva no es tuya/, () => 'Esa reserva pertenece a otra cuenta.'],
  [/inicia sesi[oó]n para continuar/, () => 'Inicia sesión para continuar.'],
]

export function traducirError(error, porDefecto = 'No se pudo guardar. Inténtalo de nuevo.') {
  const crudo = typeof error === 'string' ? error : (error?.message || '')
  const m = crudo.toLowerCase()

  // Sin internet no hay nada que explicar de la base
  if (m.includes('failed to fetch') || m.includes('networkerror') ||
      m.includes('load failed') || m.includes('network request failed') ||
      (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return 'No hay conexión a internet. Revisa tu conexión e inténtalo de nuevo; no se perdió lo que escribiste.'
  }

  for (const [patron, texto] of MENSAJES_DE_LA_BASE) {
    const r = m.match(patron)
    if (r) return texto(...r)
  }

  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'No tienes permiso para realizar esta acción con tu cuenta.'
  }

  // Otra reserva ya tiene esa cancha a esa hora
  if (m.includes('reservas_sin_superponer') || m.includes('exclusion constraint')) {
    return 'Otra persona acaba de reservar ese horario. Elige otro horario disponible.'
  }

  // Dos canchas con el mismo nombre, dos jugadores con el mismo dorsal…
  if (m.includes('duplicate key') || m.includes('unique constraint')) {
    if (m.includes('dorsal')) return 'Hay dos jugadores con el mismo número de camiseta. Cambia uno de ellos.'
    if (m.includes('nombre')) return 'Ya existe un registro con ese nombre. Usa un nombre diferente.'
    return 'Ese registro ya existe. Revisa que no lo hayas guardado antes.'
  }

  if (m.includes('violates foreign key')) {
    return 'Uno de los datos elegidos ya no está disponible. Actualiza la página y vuelve a elegirlo.'
  }

  if (m.includes('violates not-null')) {
    return 'Falta completar un dato obligatorio del formulario.'
  }

  if (m.includes('value too long')) {
    return 'Uno de los textos es demasiado largo. Acórtalo e inténtalo de nuevo.'
  }

  if (m.includes('check constraint') || m.includes('invalid input syntax')) {
    return 'Uno de los datos no tiene un valor válido. Revisa las fechas y los números.'
  }

  // La sesión venció mientras la persona llenaba el formulario
  if (m.includes('jwt') || m.includes('token is expired') ||
      m.includes('not authenticated')) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.'
  }

  // El servidor caído o en mantenimiento
  if (m.includes('502') || m.includes('503') || m.includes('504') ||
      m.includes('upstream') || m.includes('timeout')) {
    return 'El servidor no responde en este momento. Inténtalo de nuevo en unos minutos.'
  }

  if (!crudo) return porDefecto

  // Un mensaje técnico en inglés nunca se muestra tal cual
  if (/^[\x00-\x7f]*$/.test(crudo) && /\b(the|is|of|for|not|error|invalid)\b/i.test(crudo)) return porDefecto

  return crudo
}
