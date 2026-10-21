import { describe, it, expect } from 'vitest'
import { hayBase, entrarComo, CUENTAS } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-26 · La carga en una sola petición trae exactamente lo mismo
//
// La funcion datos_iniciales() (migraciones/035) reemplaza las 24 consultas
// con las que se abre la aplicacion. Tiene que devolver los MISMOS datos que
// esas 24 consultas, para cada rol: si trajera de mas, un cliente veria lo de
// otro; si trajera de menos, faltaria algo en pantalla.
// ─────────────────────────────────────────────────────────────────────────────

const CONSULTAS = {
  perfiles: ['perfiles_publicos', 'id, nombre'], empresas: ['empresas'], empresa_deportes: ['empresa_deportes'],
  canchas: ['canchas'], empleados: ['empleados'], entrenadores: ['entrenadores'], entrenamientos: ['entrenamientos'],
  recompensas: ['recompensas'], calificaciones: ['calificaciones'], reservas: ['reservas'], canjes: ['canjes'],
  torneos: ['torneos'], solicitudes_cancha: ['solicitudes_cancha'], equipos: ['equipos'],
  equipo_jugadores: ['equipo_jugadores', 'id, equipo_id, jugador_id, nombre, dorsal, posicion, habilitado'], partidos_torneo: ['partidos_torneo'], eventos_partido: ['eventos_partido'],
  partidos_espontaneos: ['partidos_espontaneos'], partido_jugadores: ['partido_jugadores'], bitacora: ['bitacora'],
  puntos_historial: ['puntos_historial'], profiles: ['profiles'], comentarios: ['comentarios'],
  horarios_ocupados: ['horarios_ocupados'],
}
const ids = (filas) => (filas || []).map(f => f.id).sort()

describe.skipIf(!hayBase)('Carga inicial en una sola petición', () => {
  it('PI-26 · para el cliente y el administrador, la carga en una sola consulta trae las mismas filas que las 24 consultas', async () => {
    for (const correo of [CUENTAS.cliente, CUENTAS.admin]) {
      // Arrange
      const { sb } = await entrarComo(correo)

      // Act
      const { data: junto, error } = await sb.rpc('datos_iniciales')
      const separado = {}
      for (const [clave, [tabla, columnas]] of Object.entries(CONSULTAS)) {
        separado[clave] = (await sb.from(tabla).select(columnas || '*')).data
      }

      // Assert
      expect(error).toBeNull()
      for (const clave of Object.keys(CONSULTAS)) expect(ids(junto[clave]), clave).toEqual(ids(separado[clave]))
    }
  })
})
