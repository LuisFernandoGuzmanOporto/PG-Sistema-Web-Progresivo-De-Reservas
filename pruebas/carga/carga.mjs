// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DE CARGA Y RENDIMIENTO (PC-01 a PC-09)
//
// Miden como responde el sistema con muchas personas a la vez, contra la base
// real de Supabase y sobre la version compilada de la aplicacion.
//
//   PC-01..04  capacidad: 10, 50, 100 y 200 usuarios abriendo la aplicacion sin pausa
//   PC-05      1000 personas usando la aplicacion como se usa de verdad
//   PC-06      escritura: 45 reservas guardandose en el mismo instante
//   PC-07      contencion: 100 intentos simultaneos por la MISMA hora
//   PC-08      primera carga de la aplicacion en una red 4G simulada
//   PC-09      apertura con 24 consultas contra una sola peticion (035)
//
// La carga tiene un tope a proposito: el plan gratuito de Supabase limita el
// uso y una prueba sin tope podria pausar el proyecto. Todo lo que se crea se
// borra al final.
//
// Se corre con:  npm run test:carga   (necesita .env.pruebas.local)
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws'
globalThis.WebSocket ??= WebSocket
import fs from 'node:fs'
import { Agent, fetch as fetchPool } from 'undici'
import { entrarComo, hayBase } from '../integracion/conexion.js'

// Todos los usuarios virtuales salen de UNA computadora y por UNA conexion a
// internet. Si cada uno abriera sus propias conexiones cifradas, el cuello de
// botella seria esa computadora (miles de saludos TLS a la vez) y no el
// servidor. Por eso las lecturas reutilizan un grupo de 64 conexiones, como un
// navegador que mantiene sus conexiones abiertas. Asi se mide al servidor.
const POOL = new Agent({ connections: 64, keepAliveTimeout: 60_000, keepAliveMaxTimeout: 120_000 })


if (!hayBase) { console.log('Falta .env.pruebas.local: no se corren las pruebas de carga'); process.exit(0) }

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*(\w+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]))
const URL_API = env.VITE_SUPABASE_URL + '/rest/v1/'
const CABECERAS = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.VITE_SUPABASE_ANON_KEY }
const pedir = (ruta) => fetchPool(URL_API + ruta, { headers: CABECERAS, dispatcher: POOL })
const SPORT_CENTER = 'b0000000-0000-4000-8000-000000000001'
const DIA = '2031-09-01'
const resultados = []

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] }
const ms = (x) => Math.round(x)

// EXACTAMENTE lo que pide la aplicacion al abrirse (src/lib/carga.js,
// cargarDatos): 24 consultas en paralelo. Se hacen con la sesion de un cliente
// real, asi la base aplica sus politicas de seguridad igual que en su celular.
const APERTURA = [
  'perfiles_publicos?select=id,nombre', 'empresas?select=*&order=nombre', 'empresa_deportes?select=*',
  'canchas?select=*&order=nombre', 'empleados?select=*', 'entrenadores?select=*&order=nombre',
  'entrenamientos?select=*&order=hora_inicio', 'recompensas?select=*&order=puntos',
  'calificaciones?select=*&order=created_at.desc', 'reservas?select=*&order=hora_inicio',
  'canjes?select=*&order=created_at.desc', 'torneos?select=*&order=fecha_inicio', 'solicitudes_cancha?select=*',
  'equipos?select=*', 'equipo_jugadores?select=id,equipo_id,jugador_id,nombre,dorsal,posicion,habilitado&order=dorsal', 'partidos_torneo?select=*&order=fecha_hora',
  'eventos_partido?select=*&order=minuto', 'partidos_espontaneos?select=*', 'partido_jugadores?select=*',
  'bitacora?select=*&order=created_at.desc', 'puntos_historial?select=*&order=created_at.desc',
  'profiles?select=*&order=created_at', 'comentarios?select=*&order=created_at', 'horarios_ocupados?select=*',
]

/** Abrir la aplicacion: 24 consultas (antes) o una sola peticion (migraciones/035). */
let MODO = 'consultas'
const abrirApp = (modo = MODO) => modo === 'rpc'
  ? [fetchPool(URL_API + 'rpc/datos_iniciales', { method: 'POST', dispatcher: POOL,
      headers: { ...CABECERAS, 'Content-Type': 'application/json' }, body: '{}' })]
  : APERTURA.map(p => pedir(p))

/** N usuarios virtuales abren la aplicacion una y otra vez durante `segundos`. */
async function lectura(id, usuarios, segundos, { pausa = null, tipo = 'carga', modo = MODO, guardar = true } = {}) {
  const tiempos = []; let errores = 0; let pedidos = 0
  const fin = Date.now() + segundos * 1000
  const dormir = (x) => new Promise(r => setTimeout(r, x))
  const usuario = async () => {
    // Con pausa, cada usuario empieza en un momento distinto, como en la realidad
    if (pausa) await dormir(Math.random() * pausa[1] * 1000)
    while (Date.now() < fin) {
      const t0 = performance.now()
      const r = await Promise.all(abrirApp(modo).map(p => p
        // La respuesta se lee entera, como la aplicacion: si se descartara, la
        // conexion se cerraria y cada peticion pagaria un saludo TLS nuevo
        .then(async x => { await x.arrayBuffer(); return x.ok }).catch(() => false)))
      tiempos.push(performance.now() - t0)
      pedidos += r.length; errores += r.filter(ok => !ok).length
      // Lo que tarda una persona en mirar la pantalla antes de tocar otra cosa
      if (pausa) await dormir((pausa[0] + Math.random() * (pausa[1] - pausa[0])) * 1000)
    }
  }
  const t0 = performance.now()
  await Promise.all(Array.from({ length: usuarios }, usuario))
  const dur = (performance.now() - t0) / 1000
  const fila = {
    id, prueba: pausa ? `${usuarios} usuarios conectados, navegando con pausas de ${pausa[0]} a ${pausa[1]} s`
                      : tipo === 'estres' ? `Capacidad: ${usuarios} usuarios pidiendo sin pausa`
                      : `Carga: ${usuarios} usuarios pidiendo sin pausa`, usuarios,
    aperturas: tiempos.length, aperturasPorSegundo: +(tiempos.length / dur).toFixed(1), peticiones: pedidos,
    modo: modo === 'rpc' ? '1 petición (datos_iniciales)' : '24 consultas',
    porSegundo: Math.round(pedidos / dur),
    p50: ms(pct(tiempos, 50)), p95: ms(pct(tiempos, 95)), p99: ms(pct(tiempos, 99)),
    errores: +(errores / Math.max(1, pedidos) * 100).toFixed(2),
  }
  if (tipo === 'estres') {
    // En el estres se busca el limite: lo que importa es que no se pierda
    // nada y que el sistema se recupere al bajar la carga
    const despues = []
    for (let i = 0; i < 10; i++) {
      const a = performance.now()
      await Promise.all(abrirApp(modo).map(p => p.then(x => x.arrayBuffer())))
      despues.push(performance.now() - a)
    }
    fila.recuperacionP95 = ms(pct(despues, 95))
    fila.ok = fila.errores < 1 && fila.recuperacionP95 < 2000
    fila.criterio = 'sin errores y, al bajar la carga, vuelve a responder en menos de 2000 ms'
  } else {
    fila.ok = fila.p95 < 2000 && fila.errores < 1
    fila.criterio = 'p95 < 2000 ms y errores < 1 %'
  }
  if (guardar) resultados.push(fila)
  console.log(fila)
  return fila
}

/**
 * PC-05 · Mil personas usando la aplicacion como se usa de verdad.
 *
 * La aplicacion trae todos los datos UNA vez, al entrar (cargarDatos), y
 * despues se navega con lo que ya tiene en memoria. Solo vuelve a pedir datos
 * en dos casos: las notificaciones, cada 60 s (Notificaciones.jsx), y la
 * pantalla En Vivo de un torneo, cada 15 s (TorneoEnVivo.jsx). Asi se simula:
 * cada persona entra en algun momento del primer minuto, un 30 % se queda
 * mirando un torneo en vivo y todas revisan sus notificaciones.
 */
async function sesionesReales(id, usuarios, segundos) {
  const { data: torneos } = await (await fetchPool(URL_API + 'torneos?select=id&estado=eq.en_curso&limit=1',
    { headers: CABECERAS, dispatcher: POOL })).json()
  const torneo = torneos?.[0]?.id
  const entradas = [], acciones = []
  let errores = 0, pedidos = 0
  const fin = Date.now() + segundos * 1000
  const dormir = (x) => new Promise(r => setTimeout(r, x))
  const medir = async (lista, promesas) => {
    const t0 = performance.now()
    const r = await Promise.all(promesas.map(p => p.then(async x => { await x.arrayBuffer(); return x.ok })
      .catch(() => false)))
    lista.push(performance.now() - t0)
    pedidos += r.length; errores += r.filter(ok => !ok).length
  }
  const persona = async () => {
    await dormir(Math.random() * 60_000)                       // entra en algun momento del primer minuto
    await medir(entradas, abrirApp())
    const enVivo = torneo && Math.random() < 0.3
    let proximaNotif = Date.now() + 60_000
    while (Date.now() < fin) {
      await dormir(enVivo ? 15_000 : 5_000)
      if (Date.now() >= fin) break
      if (enVivo) {
        await medir(acciones, [pedir('partidos_torneo?select=*&torneo_id=eq.' + torneo),
          pedir('eventos_partido?select=*,partidos_torneo!inner(torneo_id)&partidos_torneo.torneo_id=eq.' + torneo)])
      }
      if (Date.now() >= proximaNotif) {
        proximaNotif += 60_000
        await medir(acciones, [pedir('notificaciones?select=id,tipo,titulo,detalle,enlace,leida,created_at&order=created_at.desc&limit=30')])
      }
    }
  }
  const t0 = performance.now()
  await Promise.all(Array.from({ length: usuarios }, persona))
  const dur = (performance.now() - t0) / 1000
  const fila = {
    id, prueba: `${usuarios} personas usando la aplicación como se usa de verdad`, usuarios,
    aperturas: entradas.length, acciones: acciones.length, peticiones: pedidos,
    porSegundo: Math.round(pedidos / dur),
    p50: ms(pct(entradas, 50)), p95: ms(pct(entradas, 95)), p99: ms(pct(entradas, 99)),
    accionesP50: ms(pct(acciones, 50)), accionesP95: ms(pct(acciones, 95)),
    errores: +(errores / Math.max(1, pedidos) * 100).toFixed(2),
  }
  fila.ok = fila.p95 < 3000 && fila.accionesP95 < 2000 && fila.errores < 1
  fila.criterio = 'entrar: p95 < 3000 ms; después: p95 < 2000 ms; errores < 1 %'
  resultados.push(fila); console.log(fila)
}

const CUENTAS = ['juan.garcia@sportika.bo', 'marco@email.com', 'luisa@email.com', 'ana.lopez@email.com',
  'juanr@email.com', 'diego@email.com', 'sandra.v@email.com', 'juant@email.com', 'carlosm@email.com']
const CANCHAS = ['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000007']

async function escrituras(sesiones) {
  // 9 clientes × 5 horas = 45 reservas, cada una en una hora o cancha distinta
  const pedidos = []
  sesiones.forEach((s, i) => {
    for (let h = 0; h < 5; h++) {
      const n = i * 5 + h                               // 0..44
      const cancha = CANCHAS[n % 3], hora = 6 + Math.floor(n / 3)     // 06:00 a 21:00
      pedidos.push({ s, cancha, desde: String(hora).padStart(2, '0') + ':00', hasta: String(hora + 1).padStart(2, '0') + ':00' })
    }
  })
  const tiempos = []
  const t0 = performance.now()
  const r = await Promise.all(pedidos.map(async p => {
    const a = performance.now()
    const x = await p.s.sb.from('reservas').insert({ cliente_id: p.s.usuario.id, empresa_id: SPORT_CENTER,
      cancha_id: p.cancha, fecha: DIA, hora_inicio: p.desde, hora_fin: p.hasta, monto_total: 0,
      estado: 'pendiente', origen: 'app',
      comprobante_url: 'prueba/comprobante.png' }).select('id').single()
    tiempos.push(performance.now() - a)
    return x
  }))
  const guardadas = r.filter(x => !x.error).length
  const fila = { id: 'PC-06', prueba: '45 reservas guardándose en el mismo instante', usuarios: 9,
    peticiones: 45, guardadas, total: ms(performance.now() - t0),
    p50: ms(pct(tiempos, 50)), p95: ms(pct(tiempos, 95)), p99: ms(pct(tiempos, 99)),
    errores: +((45 - guardadas) / 45 * 100).toFixed(2) }
  fila.ok = guardadas === 45 && fila.p95 < 3000
  fila.criterio = 'las 45 se guardan y p95 < 3000 ms'
  resultados.push(fila); console.log(fila)
}

async function contencion(sesiones) {
  // 100 intentos (unos 11 por cliente) por las 21:00 de la cancha de futbol
  const t0 = performance.now()
  const r = await Promise.all(Array.from({ length: 100 }, (_, i) => sesiones[i % sesiones.length])
    .map(s => s.sb.from('reservas').insert({ cliente_id: s.usuario.id, empresa_id: SPORT_CENTER,
      cancha_id: CANCHAS[0], fecha: DIA, hora_inicio: '21:00', hora_fin: '22:00', monto_total: 0,
      estado: 'pendiente', origen: 'app',
      comprobante_url: 'prueba/comprobante.png' }).select('id').single()))
  const ganadas = r.filter(x => !x.error).length
  const rechazadas = r.filter(x => x.error && /reservas_sin_superponer|exclusion|conflicting/i.test(x.error.message)).length
  const fila = { id: 'PC-07', prueba: '100 intentos simultáneos por la misma hora', usuarios: 9,
    peticiones: 100, guardadas: ganadas, rechazadasPorChoque: rechazadas, total: ms(performance.now() - t0) }
  fila.ok = ganadas === 1 && rechazadas === 99
  fila.criterio = 'se guarda exactamente 1 y se rechazan 99'
  resultados.push(fila); console.log(fila)
}

async function primeraCarga() {
  const { chromium } = await import('@playwright/test')
  const navegador = await chromium.launch({ channel: 'msedge' })
  const medir = async (ruta) => {
    const ctx = await navegador.newContext({ viewport: { width: 412, height: 915 } })
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    // Red 4G tipica: 9 Mbps de bajada, 1.5 Mbps de subida, 170 ms de latencia
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 170,
      downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 })
    const t0 = Date.now()
    await page.goto('http://localhost:4173' + ruta, { waitUntil: 'load' })
    const carga = Date.now() - t0
    // El primer contenido visible y el elemento mas grande, como los mide Lighthouse
    const { fcp, lcp } = await page.evaluate(() => new Promise(listo => {
      const m = { fcp: 0, lcp: 0 }
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime })
        .observe({ type: 'paint', buffered: true })
      new PerformanceObserver(l => { for (const e of l.getEntries()) m.lcp = e.startTime })
        .observe({ type: 'largest-contentful-paint', buffered: true })
      setTimeout(() => listo(m), 2500)
    }))
    const bytes = await page.evaluate(() => performance.getEntriesByType('resource')
      .reduce((a, r) => a + (r.transferSize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0))
    await ctx.close()
    return { carga, fcp: ms(fcp), lcp: ms(lcp), kb: Math.round(bytes / 1024) }
  }
  const inicio = await medir('/')
  const login = await medir('/login')
  await navegador.close()
  const fila = { id: 'PC-08', prueba: 'Primera carga en red 4G simulada (teléfono)',
    inicioFCP: inicio.fcp, inicioLCP: inicio.lcp, inicioCarga: inicio.carga, inicioKB: inicio.kb,
    loginFCP: login.fcp, loginLCP: login.lcp, loginCarga: login.carga, loginKB: login.kb }
  fila.ok = inicio.fcp > 0 && inicio.fcp < 1800 && inicio.lcp < 2500 && login.fcp > 0 && login.lcp < 2500
  fila.criterio = 'FCP < 1,8 s y LCP < 2,5 s (umbrales «bueno» de Google)'
  resultados.push(fila); console.log(fila)
}

// ── Ejecucion ────────────────────────────────────────────────────────────
// Un minuto antes: el reloj de esta computadora puede ir un segundo adelante
// del de Supabase, y un aviso creado al empezar quedaba sin borrar
const inicio = new Date(Date.now() - 60_000).toISOString()
const sesiones = await Promise.all(CUENTAS.map(entrarComo))
{
  const { data } = await sesiones[0].sb.auth.getSession()
  CABECERAS.Authorization = 'Bearer ' + data.session.access_token
}
const admin = await entrarComo('pedro@sportcenter.com')
try {
  // Si la base ya tiene datos_iniciales() (035), la aplicacion abre con una sola peticion
  const prueba = await abrirApp('rpc')[0]
  MODO = prueba.ok ? 'rpc' : 'consultas'
  await prueba.arrayBuffer()
  console.log('La aplicacion abre con:', MODO === 'rpc' ? '1 peticion' : '24 consultas')
  // Calentamiento: la primera peticion de cada conexion no cuenta
  await Promise.all(abrirApp().map(p => p.then(x => x.arrayBuffer())))
  // PC-09: la misma carga, antes y despues de la optimizacion
  if (MODO === 'rpc') {
    const antes = await lectura('PC-09a', 50, 10, { modo: 'consultas', guardar: false })
    const despues = await lectura('PC-09b', 50, 10, { modo: 'rpc', guardar: false })
    const fila = { id: 'PC-09', prueba: 'Apertura de la app con 50 usuarios: 24 consultas contra 1 petición',
      antesAperturasPorSegundo: antes.aperturasPorSegundo, antesP95: antes.p95,
      despuesAperturasPorSegundo: despues.aperturasPorSegundo, despuesP95: despues.p95,
      mejora: +(despues.aperturasPorSegundo / Math.max(0.1, antes.aperturasPorSegundo)).toFixed(1) }
    // El p95 con 50 usuarios sin pausa depende mucho de la red de quien mide;
    // lo que la carga en una sola peticion busca es mas capacidad
    fila.ok = fila.mejora >= 1.5
    fila.criterio = 'con una sola petición se atienden al menos 1,5 veces más aperturas por segundo'
    resultados.push(fila); console.log(fila)
    await new Promise(r => setTimeout(r, 5000))
  }
  // Sin pausas la demanda no tiene tope: la espera crece como usuarios / capacidad
  // (ley de Little). Estas cuatro miden la CAPACIDAD del servidor; la experiencia
  // de las personas la mide PC-05, que usa la aplicacion como se usa de verdad.
  await lectura('PC-01', 10, 10, { tipo: 'estres' })
  await lectura('PC-02', 50, 10, { tipo: 'estres' })
  await lectura('PC-03', 100, 10, { tipo: 'estres' })
  await lectura('PC-04', 200, 10, { tipo: 'estres' })
  await new Promise(r => setTimeout(r, 10000))        // respiro despues del estres
  await sesionesReales('PC-05', 1000, 120)
  await escrituras(sesiones)
  await contencion(sesiones)
  try { await primeraCarga() } catch (e) {
    console.log('PC-08 sin servidor en :4173 (npm run build y npx vite preview):', e.message.split('\n')[0])
  }
} finally {
  await admin.sb.from('reservas').delete().eq('fecha', DIA)
  for (const s of [...sesiones, admin]) {
    await s.sb.from('notificaciones').delete().eq('usuario_id', s.usuario.id).gte('created_at', inicio)
  }
  for (const c of ['rosa.v@sportika.bo', 'willy.a@sportika.bo']) {
    const x = await entrarComo(c)
    await x.sb.from('notificaciones').delete().eq('usuario_id', x.usuario.id).gte('created_at', inicio)
  }
}

fs.mkdirSync('pruebas/carga', { recursive: true })
fs.writeFileSync('pruebas/carga/resultados.json', JSON.stringify(resultados, null, 2))
console.table(resultados.map(r => ({ id: r.id, prueba: r.prueba, p95: r.p95 ?? r.inicioFCP, ok: r.ok })))
console.log(resultados.every(r => r.ok) ? 'TODAS LAS PRUEBAS DE CARGA PASARON' : 'HAY PRUEBAS DE CARGA QUE NO PASARON')
process.exit(resultados.every(r => r.ok) ? 0 : 1)
