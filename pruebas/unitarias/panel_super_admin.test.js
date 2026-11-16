import { describe, it, expect } from 'vitest'
import { calcularPanel, mesAnterior, variacion } from '../../src/lib/panelSuperAdmin.js'

// El panel del Super Admin: lo que espera su decisión, cómo va el mes frente
// al anterior, los mejores complejos y la tendencia. Hoy es el 16/11/2026.

const HOY = '2026-11-16'
const empresas = [
  { id: 1, nombre: 'Sport Center', estado: 'activo', zona: 'Zona Norte', qrPago: 'qr.png', lat: -17.3, lng: -66.1, apertura: '08:00', cierre: '22:00' },
  { id: 2, nombre: 'Cochalita', estado: 'activo', zona: 'Zona Sur' },
  { id: 3, nombre: 'Wally Zone', estado: 'pendiente', fechaSolicitudISO: '2026-08-30' },
]
const canchasPorEmpresa = {
  1: [{ nombre: 'Fútbol 1', deporte: 'Fútbol', disponible: true }, { nombre: 'Pádel', deporte: 'Pádel', disponible: true }],
}
const r = (x) => ({ origen: 'app', estado: 'confirmada', empresa_id: 1, cancha: 'Fútbol 1', horaInicio: '18:00', horaFin: '19:00', ...x })
const reservas = [
  r({ fechaISO: '2026-11-02', monto: 200 }),
  r({ fechaISO: '2026-11-10', monto: 100, cancha: 'Pádel', asistencia: 'ausente' }),
  r({ fechaISO: '2026-11-20', monto: 999 }),                       // todavía no llega
  r({ fechaISO: '2026-10-05', monto: 150 }),                       // mes pasado, antes del 16
  r({ fechaISO: '2026-10-25', monto: 500 }),                       // mes pasado, después del 16
  r({ fechaISO: '2026-11-05', monto: 80, estado: 'vencida', comprobante: 'x.jpg' }),
  r({ fechaISO: '2026-11-03', monto: 60, estado: 'pendiente' }),   // nadie la revisó
  r({ fechaISO: HOY, monto: 120 }),
  r({ fechaISO: '2026-11-06', monto: 0, origen: 'torneo' }),
]
const datos = {
  empresas, canchasPorEmpresa, reservas,
  usuarios: [
    { rol: 'cliente', altaISO: '2026-11-02' }, { rol: 'cliente', altaISO: '2026-10-03' },
    { rol: 'admin_empresa', altaISO: '2026-08-01' }, { rol: 'superadmin', altaISO: '2026-05-01', estado: 'activo' },
  ],
  calificacionesPorEmpresa: { 2: [{ estrellas: 2 }, { estrellas: 3 }] },
}

describe('Panel del Super Admin', () => {
  it('PU-69 · los ingresos del mes cuentan solo lo confirmado hasta hoy y se comparan con el mes pasado a la misma fecha', () => {
    // Act
    const P = calcularPanel(datos, HOY)

    // Assert
    expect(P.kpis.ingresosMes).toBe(420)
    expect(P.kpis.ingresosPasadoHastaHoy).toBe(150)
    expect(P.kpis.ingresosCambio).toBe(180)
    expect(P.kpis.ingresosMesPasado).toBe(650)
  })

  it('PU-70 · avisa lo que espera una decisión: empresas por aprobar, pagos a devolver, reservas sin revisar, mala calificación y datos faltantes', () => {
    // Act
    const P = calcularPanel(datos, HOY)
    const claves = P.alertas.map(a => a.clave)

    // Assert
    expect(claves).toEqual(['aprobar', 'devolver', 'sinRevisar', 'calificacion', 'incompletos'])
    expect(P.alertas.find(a => a.clave === 'devolver').texto).toContain('Bs. 80')
    expect(P.alertas.find(a => a.clave === 'incompletos').detalle[0]).toBe('Cochalita: falta canchas activas, QR de pago, ubicación en el mapa, horario')
  })

  it('PU-71 · el ranking pone primero al complejo que más ingresó en el mes', () => {
    // Act
    const P = calcularPanel(datos, HOY)

    // Assert
    expect(P.ranking.map(c => [c.nombre, c.ingresos])).toEqual([['Sport Center', 420], ['Cochalita', 0]])
    expect(P.ranking[1].calificacion).toBe(2.5)
  })

  it('PU-72 · la tendencia muestra 6 meses y el mes en curso termina hoy', () => {
    // Act
    const P = calcularPanel(datos, HOY)

    // Assert
    expect(P.tendencia.map(t => t.label)).toEqual(['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'])
    expect(P.tendencia[5]).toMatchObject({ ingresos: 420, reservas: 3, enCurso: true })
    expect(P.tendencia[4].ingresos).toBe(650)
  })

  it('PU-73 · cuenta los deportes, el no-show, lo de hoy y los usuarios nuevos del mes', () => {
    // Act
    const P = calcularPanel(datos, HOY)

    // Assert
    expect(P.deportes.map(d => [d.deporte, d.reservas])).toEqual([['Fútbol', 2], ['Pádel', 1]])
    expect(P.calidad.noShow).toBe(33.3)
    expect(P.hoyDia).toMatchObject({ reservas: 1, confirmadas: 1, ingresos: 120 })
    expect(P.kpis.nuevosMes).toBe(1)
    expect(P.usuarios.porRol).toMatchObject({ cliente: 2, admin_empresa: 1, superadmin: 1 })
    expect(mesAnterior('2026-01')).toBe('2025-12')
    expect(variacion(5, 0)).toBeNull()
  })
})
