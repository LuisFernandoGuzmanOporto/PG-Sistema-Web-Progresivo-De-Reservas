import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hayBase, entrarComo, clienteAnonimo, CUENTAS, SPORT_CENTER } from './conexion.js'

// ─────────────────────────────────────────────────────────────────────────────
// PI-30 a PI-32 · Lo que la base guardaba y nadie veía (migraciones/040)
//
// El teléfono de los empleados, la fecha y hora real de los partidos
// espontáneos, y quién entregó un premio y cuándo. Los partidos de prueba se
// borran al final y el canje que se entrega vuelve a quedar por entregar.
// ─────────────────────────────────────────────────────────────────────────────

const MINUTOS = 60 * 1000
const HORAS = 60 * MINUTOS

describe.skipIf(!hayBase)('Lo que la base guardaba y nadie veía', () => {
  let juan, marco, pedro, rosa
  const partidos = []

  beforeAll(async () => {
    juan  = await entrarComo(CUENTAS.cliente)
    marco = await entrarComo(CUENTAS.otroCliente)
    pedro = await entrarComo(CUENTAS.admin)
    rosa  = await entrarComo(CUENTAS.empleado)
  })

  afterAll(async () => {
    if (juan && partidos.length) await juan.sb.from('partidos_espontaneos').delete().in('id', partidos)
  })

  it('PI-30 · el administrador ve el teléfono de sus empleados, y a nadie más se le entrega', async () => {
    // Arrange: los empleados de los complejos de Pedro y el teléfono que Rosa tiene en su perfil
    const { data: complejos } = await pedro.sb.from('empresas').select('id').eq('admin_id', pedro.usuario.id)
    const { data: suyos } = await pedro.sb.from('empleados').select('id')
      .in('empresa_id', complejos.map(c => c.id))
    const { data: perfilRosa } = await rosa.sb.from('profiles').select('telefono')
      .eq('id', rosa.usuario.id).single()

    // Act
    const paraPedro  = await pedro.sb.rpc('telefonos_de_mis_empleados')
    const paraJuan   = await juan.sb.rpc('telefonos_de_mis_empleados')
    const paraRosa   = await rosa.sb.rpc('telefonos_de_mis_empleados')
    const paraNadie  = await clienteAnonimo().rpc('telefonos_de_mis_empleados')

    // Assert: Pedro recibe a todos sus empleados, solo con el teléfono
    expect(paraPedro.error).toBeNull()
    expect(paraPedro.data.map(e => e.id).sort()).toEqual(suyos.map(e => e.id).sort())
    expect(paraPedro.data.find(e => e.id === rosa.usuario.id).telefono).toBe(perfilRosa.telefono)
    expect(Object.keys(paraPedro.data[0]).sort()).toEqual(['id', 'telefono'])
    //         un cliente y una empleada no reciben nada; sin cuenta, ni siquiera se puede pedir
    expect(paraJuan.data).toEqual([])
    expect(paraRosa.data).toEqual([])
    expect(paraNadie.error).toBeTruthy()
  })

  it('PI-31 · un partido guarda su fecha y hora real: no se crea para una hora que ya pasó, y nadie se suma cuando ya se jugó', async () => {
    // Arrange
    const partido = { empresa_id: SPORT_CENTER, creador_id: juan.usuario.id, deporte: 'Pádel',
                      max_jugadores: 4, apuesta: 'Prueba de integración' }

    // Act: uno para hace tres horas, y uno «ahora mismo» (la hora la pone la base)
    const pasado = await juan.sb.from('partidos_espontaneos')
      .insert({ ...partido, fecha_hora: new Date(Date.now() - 3 * HORAS).toISOString() }).select().single()
    const ahora = await juan.sb.from('partidos_espontaneos').insert(partido).select().single()
    for (const r of [pasado, ahora]) if (r.data) partidos.push(r.data.id)
    //      el segundo empezó hace dos horas, y Marco intenta sumarse
    await juan.sb.from('partidos_espontaneos')
      .update({ fecha_hora: new Date(Date.now() - 2 * HORAS).toISOString() }).eq('id', ahora.data.id)
    const tarde = await marco.sb.from('partido_jugadores')
      .insert({ partido_id: ahora.data.id, jugador_id: marco.usuario.id, nombre: 'Marco' })

    // Assert
    expect(pasado.error?.message).toMatch(/Esa hora ya pasó/)
    expect(ahora.error).toBeNull()
    expect(Math.abs(new Date(ahora.data.fecha_hora).getTime() - Date.now())).toBeLessThan(5 * MINUTOS)
    expect(tarde.error?.message).toMatch(/ya se jugó/)
  })

  it('PI-32 · al entregar un premio, la base anota quién lo entregó y a qué hora, aunque el pedido diga otra cosa', async () => {
    // Arrange: un canje por entregar del complejo de Rosa
    const { data: [canje] } = await rosa.sb.from('canjes').select('id')
      .eq('empresa_id', SPORT_CENTER).eq('estado', 'disponible').limit(1)
    expect(canje).toBeTruthy()

    try {
      // Act: Rosa lo entrega, pero el pedido dice que fue Pedro, en el 2020
      const { data, error } = await rosa.sb.from('canjes')
        .update({ estado: 'entregado', entregado_por: pedro.usuario.id, entregado_at: '2020-01-01T00:00:00Z' })
        .eq('id', canje.id).select('entregado_por, entregado_at').single()

      // Assert: queda Rosa, con la hora del servidor
      expect(error).toBeNull()
      expect(data.entregado_por).toBe(rosa.usuario.id)
      expect(Math.abs(new Date(data.entregado_at).getTime() - Date.now())).toBeLessThan(5 * MINUTOS)
    } finally {
      // El canje vuelve a quedar por entregar, como estaba
      await rosa.sb.from('canjes')
        .update({ estado: 'disponible', entregado_por: null, entregado_at: null }).eq('id', canje.id)
    }
  })
})
