import { hoyBolivia } from './fecha.js'
import {
  CANCHAS_POR_EMPRESA, ENTRENAMIENTOS_POR_EMPRESA, RESERVAS_EMPRESA,
  empresaPorId, mismo, ocupaLaCancha,
} from './datos'

// ─────────────────────────────────────────────────────────────────────────────
// QUÉ PASA EN CADA HORA DE UNA CANCHA
//
// Lo usan dos pantallas: el cliente cuando reserva desde la ficha del complejo,
// y el empleado cuando toma una reserva en el mostrador. Vive aquí y no en cada
// una porque tienen que ver exactamente lo mismo: si estuviera duplicado,
// tarde o temprano una diría "libre" y la otra "ocupado" para la misma hora.
// ─────────────────────────────────────────────────────────────────────────────

const DIA_INDICE = { Dom: 0, Lun: 1, Mar: 2, Mie: 3, Jue: 4, Vie: 5, Sab: 6 }

/** '07:00' → '08:00'. Las franjas son de una hora. */
export const finDeFranja = (slot) =>
  String(parseInt(slot, 10) + 1).padStart(2, '0') + ':00'

/** Las horas que el complejo atiende, a partir de su horario. */
export function franjasDelComplejo(empresaId) {
  const horario = empresaPorId(empresaId)?.horario || ''
  const [desde, hasta] = horario.replace(/\s/g, '').split('-').map(h => parseInt(h, 10))

  // Un complejo puede no haber cargado su horario todavia. En ese caso se usa
  // uno amplio en vez de dejar la agenda en blanco, que se leeria como si no
  // hubiera ninguna hora libre.
  const inicio = Number.isInteger(desde) ? desde : 6
  const fin    = Number.isInteger(hasta) ? hasta : 22

  const franjas = []
  for (let h = inicio; h < fin; h++) franjas.push(String(h).padStart(2, '0') + ':00')
  return franjas
}

/** Los entrenamientos que tocan ese día de la semana. */
function entrenamientosDeFecha(empresaId, fechaISO) {
  if (!fechaISO) return []
  const [a, m, d] = fechaISO.split('-').map(Number)
  const dia = new Date(a, m - 1, d).getDay()
  return (ENTRENAMIENTOS_POR_EMPRESA[empresaId] || [])
    .filter(e => (e.dias || []).some(x => DIA_INDICE[x] === dia))
}

/**
 * Qué ocupa una cancha a una hora dada, y por qué.
 *
 * Devuelve el motivo además del estado: a quien mira la agenda no le sirve
 * saber que está ocupado, le sirve saber quién lo ocupa. Una hora tomada por
 * un entrenamiento fijo se lee distinto que una que alguien acaba de reservar.
 */
export function franjaDeCancha(empresaId, canchaId, fechaISO, slot) {
  const cancha = (CANCHAS_POR_EMPRESA[empresaId] || []).find(c => mismo(c.id, canchaId))
  if (!cancha) return { estado: 'libre' }

  // Un entrenamiento se repite todas las semanas en los días que le tocan
  const ent = entrenamientosDeFecha(empresaId, fechaISO).find(e =>
    mismo(e.cancha_id, canchaId) && e.horaInicio <= slot && slot < e.horaFin)
  if (ent) {
    return {
      estado: 'entrenamiento',
      titulo: ent.nombre,
      detalle: ent.entrenador && ent.entrenador !== '—' ? 'con ' + ent.entrenador : ent.nivel,
    }
  }

  const r = RESERVAS_EMPRESA.find(x =>
    mismo(x.empresa_id, empresaId) &&
    x.cancha === cancha.nombre &&
    (x.fechaISO || x.fecha) === fechaISO &&
    ocupaLaCancha(x) &&
    x.horaInicio <= slot && slot < (x.horaFin || finDeFranja(x.horaInicio)))
  if (!r) return { estado: 'libre' }

  if (r.origen === 'torneo') {
    return {
      estado: r.estado === 'pendiente' ? 'torneo_pendiente' : 'torneo',
      titulo: r.torneo || 'Torneo',
      detalle: r.estado === 'pendiente'
        ? 'Cancha pedida para un torneo, aún sin aprobar'
        : 'La cancha está tomada por el torneo',
    }
  }

  // El nombre y el teléfono solo llegan a quien puede leer esa reserva: el
  // personal del complejo. Al cliente la base le entrega la hora ocupada sin datos.
  const tel = r.telefono ? ' · ' + r.telefono : ''

  // Alguien la eligió y está pagando: se libera sola si no termina a tiempo
  if (r.estado === 'apartada') {
    return { estado: 'apartada', titulo: 'Apartada', nro: r.nro,
             detalle: r.cliente ? r.cliente + ' está pagando' + tel : 'Alguien está pagando esta hora' }
  }

  return r.estado === 'pendiente'
    ? { estado: 'pendiente', titulo: 'Reserva por confirmar', nro: r.nro,
        detalle: r.cliente ? 'La pidió ' + r.cliente + tel : 'Esperando que la revisen' }
    : { estado: 'ocupada', titulo: 'Reservado', nro: r.nro,
        detalle: r.cliente ? 'A nombre de ' + r.cliente + tel : 'Esta hora ya está tomada' }
}

/** La agenda completa de una cancha en un día: una entrada por hora. */
export function agendaDelDia(empresaId, canchaId, fechaISO) {
  return franjasDelComplejo(empresaId).map(slot => ({
    slot,
    fin: finDeFranja(slot),
    ...franjaDeCancha(empresaId, canchaId, fechaISO, slot),
  }))
}

/** Las horas sueltas que quedan libres, para ofrecérselas a quien pregunta. */
export function horasLibres(empresaId, canchaId, fechaISO) {
  return agendaDelDia(empresaId, canchaId, fechaISO)
    .filter(f => f.estado === 'libre')
    .map(f => f.slot)
}

/** Fecha de hoy como 'YYYY-MM-DD', la de Bolivia (src/lib/fecha.js). */
export const hoyISO = hoyBolivia

/** 'YYYY-MM-DD' → '16 de septiembre', para mostrar. */
export function fechaLegible(fechaISO) {
  if (!fechaISO) return ''
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const [a, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(a, m - 1, d)
  return DIAS[fecha.getDay()] + ' ' + d + ' de ' + MESES[m - 1]
}
