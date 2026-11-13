import { describe, it, expect } from 'vitest'
import { seccionesDelEmpleado } from '../../src/lib/seccionesEmpleado.js'

// El menú lateral del empleado se arma con los permisos que el administrador
// le activó. Cada función tiene su dirección y «Mi turno» siempre está.

const rosa = { activo: true, permisos: ['reservas_confirmar', 'reservas_crear', 'asistencia', 'recompensas'] }

describe('Menú lateral del empleado', () => {
  it('PU-56 · muestra solo las funciones activadas, en el orden del administrador, y «Mi turno» al final', () => {
    // Act
    const s = seccionesDelEmpleado(rosa)

    // Assert
    expect(s.map(x => x.path)).toEqual([
      '/empleado/reservas', '/empleado/presencial', '/empleado/asistencia',
      '/empleado/recompensas', '/empleado/turno',
    ])
  })

  it('PU-57 · no ofrece lo que no tiene activado', () => {
    // Act
    const s = seccionesDelEmpleado({ activo: true, permisos: ['reservas_confirmar'] })

    // Assert
    expect(s.map(x => x.slug)).toEqual(['reservas', 'turno'])
  })

  it('PU-58 · un empleado dado de baja solo tiene «Mi turno», tenga los permisos que tenga', () => {
    // Act
    const s = seccionesDelEmpleado({ ...rosa, activo: false })

    // Assert
    expect(s.map(x => x.slug)).toEqual(['turno'])
  })

  it('PU-59 · cada función tiene una dirección distinta', () => {
    // Arrange
    const todos = { activo: true, permisos: ['reservas_confirmar', 'reservas_crear', 'asistencia',
      'recompensas', 'canchas_estado', 'entrenamientos', 'torneos_mesa'] }

    // Act
    const rutas = seccionesDelEmpleado(todos).map(x => x.path)

    // Assert
    expect(new Set(rutas).size).toBe(rutas.length)
    expect(rutas).toHaveLength(8)
  })
})
