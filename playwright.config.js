import { defineConfig } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DE EXTREMO A EXTREMO (E2E) · Capitulo IV
//
// Manejan la aplicacion de verdad, en un navegador, con la version compilada
// (npm run build + vite preview), igual que la recibe un usuario. Cada rol
// usa su propia ventana con su propia sesion.
//
// Se corren con:  npm run test:e2e
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  testDir: 'pruebas/e2e',
  testMatch: '**/*.spec.js',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'pruebas/e2e/resultados.json' }]],
  use: {
    baseURL: 'http://localhost:4173',
    // El Edge que ya trae Windows: no hace falta descargar navegadores
    channel: 'msedge',
    headless: true,
    viewport: { width: 1280, height: 860 },
    locale: 'es-BO',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
