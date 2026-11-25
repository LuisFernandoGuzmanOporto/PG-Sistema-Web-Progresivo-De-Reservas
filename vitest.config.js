import { defineConfig } from 'vitest/config'

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DEL SISTEMA (Capitulo IV)
//
// Todas las pruebas siguen el patron AAA:
//
//   Arrange  preparar los datos y el estado inicial
//   Act      ejecutar la unica accion que se quiere probar
//   Assert   comprobar el resultado esperado
//
//   pruebas/unitarias     funciones puras de src/lib, sin red ni base de datos
//   pruebas/integracion   varios modulos juntos, y la base real de Supabase
//                         (solo lecturas e intentos que DEBEN ser rechazados:
//                         no dejan datos nuevos)
//   pruebas/sistema       escenarios completos por rol: varios clientes, el
//                         administrador, los empleados y el superadministrador
//                         usando las mismas funciones que las pantallas, contra
//                         la base real. Todo lo que crean lo borran al final.
//
// Los archivos corren uno detras de otro (fileParallelism: false): los
// escenarios comparten cuentas y puntos, y en paralelo uno contaria los
// puntos que esta sumando el otro.
//
// Se corren con:  npm test
//
// Cobertura de las pruebas de caja blanca (Capitulo IV, 4.2.1):
//   npm run test:cobertura
// Mide que parte de la logica de src/lib (sin las pantallas, que se prueban
// de extremo a extremo con Playwright) recorren las pruebas unitarias y de
// integracion. El resumen queda en cobertura/coverage-summary.json.
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  test: {
    include: ['pruebas/**/*.test.js'],
    environment: 'node',
    setupFiles: ['pruebas/preparar.js'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{js,jsx}'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'cobertura',
    },
  },
})
