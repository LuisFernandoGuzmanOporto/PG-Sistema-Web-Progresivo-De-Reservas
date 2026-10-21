import { supabase } from './supabase'
import * as D from './datos'

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICACIONES
//
// Las filas las crean disparadores en la base (migracion 021), no estas
// funciones: asi el aviso sale siempre, sin importar desde que pantalla se
// aprobo la reserva, y nadie puede escribirle en la campana a otro.
//
// Aca solo se leen y se marcan como leidas.
// ─────────────────────────────────────────────────────────────────────────────

/** Las ultimas notificaciones de quien inicio sesion. */
export async function traerNotificaciones(limite = 30) {
  if (!D.SESION.usuarioId) return { lista: [] }

  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, tipo, titulo, detalle, enlace, leida, created_at')
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) return { error: error.message, lista: [] }
  return { lista: (data || []).map(n => ({ ...n, cuando: hace(n.created_at) })) }
}

export async function marcarLeida(id) {
  const { error } = await supabase.from('notificaciones')
    .update({ leida: true }).eq('id', id)
  return error ? { error: error.message } : { ok: true }
}

export async function marcarTodasLeidas() {
  const { error } = await supabase.from('notificaciones')
    .update({ leida: true }).eq('leida', false)
  return error ? { error: error.message } : { ok: true }
}

/** '2026-09-05T14:03:00Z' → 'hace 5 min'. */
export function hace(iso) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1)    return 'recién'
  if (minutos < 60)   return 'hace ' + minutos + ' min'

  const horas = Math.floor(minutos / 60)
  if (horas < 24)     return 'hace ' + horas + (horas === 1 ? ' hora' : ' horas')

  const dias = Math.floor(horas / 24)
  if (dias === 1)     return 'ayer'
  if (dias < 7)       return 'hace ' + dias + ' días'

  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
}

export const ICONO_NOTIFICACION = {
  reserva: '📅',
  torneo:  '🏆',
  equipo:  '👥',
  empresa: '🏢',
  comentario: '💬',
}
