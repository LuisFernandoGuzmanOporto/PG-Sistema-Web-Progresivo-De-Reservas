import { describe, it, expect } from 'vitest'
import { calcularReporte, fechasDePeriodo, diasEntre } from '../../src/lib/reporteComplejo.js'

// El reporte de un complejo que saca el Super Admin: cuánto ingresó, cuál es
// su mejor cancha y quién reservó, en un período y para una o todas las canchas.

const empresa = { id: 1, nombre: 'Sport Center', admin: 'Ana Admin', apertura: '08:00', cierre: '22:00' }
const canchas = [
  { id: 1, nombre: 'Fútbol 1', deporte: 'Fútbol', precio: 120, disponible: true },
  { id: 2, nombre: 'Wally 1',  deporte: 'Wally',  precio: 60,  disponible: true },
]
const reserva = (x) => ({ origen: 'app', asistencia: null, horaFin: null, ...x })
const reservas = [
  reserva({ id: 1, nro: 'R1', cancha: 'Fútbol 1', fechaISO: '2026-11-02', horaInicio: '18:00', horaFin: '20:00',
    monto: 240, estado: 'confirmada', cliente_id: 'u1', cliente: 'Juan García', telefono: '700-1', asistencia: 'presente',
    atendidoPor: 'Rosa' }),
  reserva({ id: 2, nro: 'R2', cancha: 'Wally 1', fechaISO: '2026-11-03', horaInicio: '10:00', horaFin: '11:00',
    monto: 60, estado: 'confirmada', cliente_id: 'u1', cliente: 'Juan García', asistencia: 'ausente' }),
  reserva({ id: 3, nro: 'R3', cancha: 'Fútbol 1', fechaISO: '2026-11-03', horaInicio: '19:00', horaFin: '20:00',
    monto: 120, estado: 'confirmada', cliente_id: null, cliente: 'Pedro Rojas', telefono: '708-4', origen: 'presencial',
    atendidoPor: 'Rosa' }),
  reserva({ id: 4, nro: 'R4', cancha: 'Wally 1', fechaISO: '2026-11-04', horaInicio: '09:00', horaFin: '10:00',
    monto: 60, estado: 'pendiente', cliente: 'Luis', cliente_id: 'u2' }),
  reserva({ id: 5, nro: 'R5', cancha: 'Wally 1', fechaISO: '2026-11-04', horaInicio: '11:00', horaFin: '12:00',
    monto: 60, estado: 'vencida', comprobante: 'ruta.jpg', cliente: 'Luis', cliente_id: 'u2' }),
  // Fuera del período
  reserva({ id: 6, cancha: 'Wally 1', fechaISO: '2026-10-30', horaInicio: '09:00', horaFin: '10:00',
    monto: 999, estado: 'confirmada', cliente: 'Viejo', cliente_id: 'u3' }),
  // Una hora tomada que ve un cliente (sin datos) y una jornada de torneo: no son ingreso
  reserva({ id: 7, cancha: 'Fútbol 1', fechaISO: '2026-11-05', horaInicio: '09:00', horaFin: '10:00',
    estado: 'confirmada', ajena: true }),
  reserva({ id: 8, cancha: 'Fútbol 1', fechaISO: '2026-11-06', horaInicio: '09:00', horaFin: '11:00',
    estado: 'confirmada', origen: 'torneo', monto: 0, torneo: 'Copa' }),
]
const usuarios = [{ id: 'u1', nombre: 'Juan García', email: 'juan@correo.com', telefono: '700-1' }]
const datos = { empresa, canchas, reservas, usuarios,
  empleados: [{ id: 'e1', nombre: 'Rosa', usuario: 'rosa', turno: 'Mañana', activo: true, permisos: [] }],
  bitacora: [
    { empleado_id: 'e1', empleado: 'Rosa', accion: 'Confirmó una reserva', fechaISO: '2026-11-02', hora: '17:00' },
    { empleado_id: 'e1', empleado: 'Rosa', accion: 'Vieja', fechaISO: '2026-10-01', hora: '10:00' },
  ],
}
const periodo = { desde: '2026-11-01', hasta: '2026-11-30' }

describe('Reporte de un complejo (Super Admin)', () => {
  it('PU-63 · suma solo lo confirmado del período y elige como mejor cancha la que más ingresó', () => {
    // Act
    const rep = calcularReporte(datos, periodo)

    // Assert
    expect(rep.resumen.ingresos).toBe(420)
    expect(rep.resumen.confirmadas).toBe(3)
    expect(rep.resumen.reservas).toBe(5)
    expect(rep.mejorCancha.nombre).toBe('Fútbol 1')
    expect(rep.porCancha.map(c => [c.nombre, c.ingreso])).toEqual([['Fútbol 1', 360], ['Wally 1', 60]])
  })

  it('PU-64 · lo pendiente va «por cobrar», lo que pagó fuera de tiempo va «a devolver» y el torneo no es ingreso', () => {
    // Act
    const rep = calcularReporte(datos, periodo)

    // Assert
    expect(rep.resumen.porCobrar).toBe(60)
    expect(rep.resumen.aDevolver).toBe(60)
    expect(rep.resumen.horasDeTorneo).toBe(2)
    expect(rep.reservas.some(r => r.ajena || r.origen === 'torneo')).toBe(false)
  })

  it('PU-65 · dice quién reservó: junta las reservas de cada cliente con su teléfono y correo', () => {
    // Act
    const rep = calcularReporte(datos, periodo)
    const juan = rep.clientes.find(c => c.nombre === 'Juan García')
    const pedro = rep.clientes.find(c => c.nombre === 'Pedro Rojas')

    // Assert
    expect(juan).toMatchObject({ reservas: 2, confirmadas: 2, pagado: 300, noShow: 1, correo: 'juan@correo.com', tipo: 'Con cuenta' })
    expect(pedro).toMatchObject({ telefono: '708-4', tipo: 'Presencial', pagado: 120 })
    expect(rep.clientes[0].nombre).toBe('Juan García')
  })

  it('PU-66 · con una sola cancha, todo el reporte es de esa cancha y cuenta las horas reales', () => {
    // Act
    const rep = calcularReporte(datos, { ...periodo, cancha: 'Fútbol 1' })

    // Assert
    expect(rep.porCancha).toHaveLength(1)
    expect(rep.resumen.ingresos).toBe(360)
    expect(rep.resumen.horasVendidas).toBe(3)
    // 3 horas de 14 por día durante 30 días
    expect(rep.resumen.ocupacion).toBe(Math.round(3 / (14 * 30) * 1000) / 10)
  })

  it('PU-67 · el personal muestra cuántas reservas atendió y sus acciones del período', () => {
    // Act
    const rep = calcularReporte(datos, periodo)

    // Assert
    expect(rep.personal[0]).toMatchObject({ nombre: 'Rosa', atendidas: 2, acciones: 1 })
    expect(rep.bitacora).toHaveLength(1)
  })

  it('PU-68 · los períodos rápidos dan las fechas correctas', () => {
    // Act
    const pasado = fechasDePeriodo('mesPasado', { hoy: '2026-03-15' })
    const semana = fechasDePeriodo('7', { hoy: '2026-03-03' })
    const todo = fechasDePeriodo('todo', { hoy: '2026-11-16', reservas })

    // Assert
    expect(pasado).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(semana).toEqual({ desde: '2026-02-25', hasta: '2026-03-03' })
    expect(todo).toEqual({ desde: '2026-10-30', hasta: '2026-11-16' })
    expect(diasEntre('2026-02-25', '2026-03-03')).toBe(7)
  })
})
