import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hayBase, entrarComo, CUENTAS, SPORT_CENTER } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-33 · La fecha límite de inscripción se respeta (migraciones/043)
//
// El administrador crea un torneo cuyas inscripciones cerraron ayer. Un
// cliente ya no puede inscribir su equipo; el organizador sí puede anotar uno
// tarde. El torneo de prueba se borra al final, con sus equipos.
// ─────────────────────────────────────────────────────────────────────────────

const dia = (desplazamiento) => {
  const d = new Date(Date.now() + desplazamiento * 24 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

describe.skipIf(!hayBase)('Fecha límite de inscripción', () => {
  let pedro, marco, torneo

  beforeAll(async () => {
    pedro = await entrarComo(CUENTAS.admin)
    marco = await entrarComo(CUENTAS.otroCliente)
    const { data } = await pedro.sb.from('torneos').insert({
      empresa_id: SPORT_CENTER, creador_id: pedro.usuario.id, creador_tipo: 'complejo',
      nombre: 'Torneo de prueba PI-33', deporte: 'Fútbol', max_equipos: 4,
      fecha_inicio: dia(10), fecha_fin: dia(20), inscripcion_hasta: dia(-2), estado: 'inscripciones',
    }).select().single()
    torneo = data
  })

  afterAll(async () => {
    if (torneo) await pedro.sb.from('torneos').delete().eq('id', torneo.id)
  })

  it('PI-33 · pasada la fecha límite, un cliente ya no inscribe su equipo; el organizador sí puede anotar uno', async () => {
    // Arrange
    expect(torneo).toBeTruthy()
    const equipo = { torneo_id: torneo.id, nombre: 'Equipo tarde', capitan_nombre: 'Prueba' }

    // Act
    const delCliente = await marco.sb.from('equipos')
      .insert({ ...equipo, capitan_id: marco.usuario.id }).select().single()
    const delOrganizador = await pedro.sb.from('equipos').insert(equipo).select().single()

    // Assert
    expect(delCliente.error?.message).toMatch(/ya no recibe inscripciones/)
    expect(delOrganizador.error).toBeNull()
  })
})
