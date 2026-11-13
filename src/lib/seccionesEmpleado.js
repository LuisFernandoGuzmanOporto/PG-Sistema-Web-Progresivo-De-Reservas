import { PERMISOS_EMPLEADO, puede } from './datos'

// ─────────────────────────────────────────────────────────────────────────────
// Las pantallas del empleado.
//
// Cada permiso que el administrador le activa es una opción del menú lateral
// con su propia dirección (/empleado/reservas, /empleado/presencial...).
// Antes todo estaba junto en «Mi Panel», en pestañas que en el celular se
// partían en varias filas y no dejaban ver de un vistazo qué podía hacer.
// ─────────────────────────────────────────────────────────────────────────────

/** Dirección de cada permiso. */
const RUTA_DE_PERMISO = {
  reservas_confirmar: 'reservas',
  reservas_crear:     'presencial',
  asistencia:         'asistencia',
  recompensas:        'recompensas',
  canchas_estado:     'canchas',
  entrenamientos:     'entrenamientos',
  torneos_mesa:       'mesa',
}

/** Nombre corto para el menú: así entra la burbuja de pendientes al lado. */
const NOMBRE_EN_MENU = {
  reservas_confirmar: 'Reservas',
  reservas_crear:     'Reserva presencial',
  asistencia:         'Asistencia',
  recompensas:        'Recompensas',
  canchas_estado:     'Estado de canchas',
  entrenamientos:     'Entrenamientos',
  torneos_mesa:       'Mesa técnica',
}

/** Lo que registró en su turno: no depende de ningún permiso. */
export const SECCION_TURNO = {
  key: 'turno', slug: 'turno', icon: '📒', label: 'Mi turno', titulo: 'Mi turno',
  path: '/empleado/turno',
}

/**
 * Las opciones del menú del empleado: solo las funciones que el administrador
 * le activó, y al final «Mi turno». Una cuenta dada de baja no tiene ninguna.
 */
export function seccionesDelEmpleado(empleado) {
  const permitidas = PERMISOS_EMPLEADO
    .filter(p => RUTA_DE_PERMISO[p.key] && puede(empleado, p.key))
    .map(p => ({
      key: p.key, slug: RUTA_DE_PERMISO[p.key], icon: p.icon,
      label: NOMBRE_EN_MENU[p.key] || p.label, titulo: p.label,
      path: '/empleado/' + RUTA_DE_PERMISO[p.key],
    }))
  return [...permitidas, SECCION_TURNO]
}
