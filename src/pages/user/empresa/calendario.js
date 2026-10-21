// ─────────────────────────────────────────────────────────────────────────────
// EL CALENDARIO DE LA FICHA DE UN COMPLEJO
//
// Salen de EmpresaDetalle porque los usan dos partes que ahora viven en
// archivos distintos: la pestaña de canchas (el calendario general) y la de
// entrenamientos. Duplicarlos habría sido pedir que un día dijeran cosas
// distintas para el mismo día.
// ─────────────────────────────────────────────────────────────────────────────

export const DIAS_SEMANA = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom']
export const DIA_INDICE  = { Dom: 0, Lun: 1, Mar: 2, Mie: 3, Jue: 4, Vie: 5, Sab: 6 }
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                      'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const MES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                   'septiembre','octubre','noviembre','diciembre']

/** Date → 'YYYY-MM-DD', en hora local y no en UTC. */
export function formatFecha(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

/**
 * Grilla del mes marcando qué entrenamientos tocan cada día.
 * La semana empieza en lunes, como se lee un calendario aquí.
 */
export function generarMesEntrenamientos(anio, mes, entrenamientos) {
  const primero   = new Date(anio, mes, 1)
  const totalDias = new Date(anio, mes + 1, 0).getDate()
  const offset    = (primero.getDay() + 6) % 7
  const celdas    = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= totalDias; d++) {
    const diaSemana = new Date(anio, mes, d).getDay()
    celdas.push({
      dia: d,
      fecha: formatFecha(new Date(anio, mes, d)),
      entrenamientos: entrenamientos.filter(e => (e.dias || []).some(x => DIA_INDICE[x] === diaSemana)),
    })
  }
  return celdas
}

/** Los entrenamientos que se dictan en una fecha concreta. */
export function entrenamientosDeFecha(entrenamientos, fechaStr) {
  if (!fechaStr) return []
  const [y, m, d] = fechaStr.split('-').map(Number)
  const diaSemana = new Date(y, m - 1, d).getDay()
  return entrenamientos.filter(e => (e.dias || []).some(x => DIA_INDICE[x] === diaSemana))
}

/** 'Sábado 15 de marzo', para mostrar. */
export function fechaLegible(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const t = dias[new Date(y, m - 1, d).getDay()] + ' ' + d + ' de ' + MES_LARGO[m - 1]
  return t.charAt(0).toUpperCase() + t.slice(1)
}
