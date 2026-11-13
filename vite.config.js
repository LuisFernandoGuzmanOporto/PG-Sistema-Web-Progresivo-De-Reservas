import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { CABECERAS_SEGURIDAD } from './src/lib/cabeceras.js'

export default defineConfig({
  // Las mismas cabeceras de seguridad que va a mandar el sitio publicado.
  //
  // En 'preview' van tal cual, porque ahi se sirve el build de verdad: es la
  // forma de comprobar que la aplicacion funciona con estas reglas ANTES de
  // publicarla. Se prueba con:  npm run build && npm run preview
  //
  // En 'dev' hay que aflojar dos: el servidor de desarrollo mete un script y
  // estilos sueltos dentro del HTML para recargar en caliente, y el navegador
  // los bloquearia. Ese codigo no existe en el build, asi que la version
  // estricta es la que llega al sitio publicado.
  server: {
    headers: {
      ...CABECERAS_SEGURIDAD,
      'Content-Security-Policy': CABECERAS_SEGURIDAD['Content-Security-Policy']
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
        .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
        .replace("connect-src 'self'", "connect-src 'self' ws://localhost:*"),
    },
  },
  preview: { headers: CABECERAS_SEGURIDAD },

  build: {
    rollupOptions: {
      output: {
        // Las librerias grandes van en su propio archivo, aparte del codigo
        // de la aplicacion. Dos motivos:
        //
        //   Leaflet (el mapa) lo usan 2 pantallas de 22. Metido en el paquete
        //   general lo descargaba todo el mundo, incluso quien nunca abre un
        //   mapa.
        //
        //   Y como cambian muy poco, el navegador las guarda en su cache: al
        //   publicar una version nueva de Sportika solo se vuelve a bajar el
        //   codigo propio, no las librerias.
        manualChunks: {
          mapa: ['leaflet', 'react-leaflet'],
          supabase: ['@supabase/supabase-js'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sportika',
        short_name: 'Sportika',
        description: 'Gestión de canchas deportivas, partidos y torneos en Cochabamba',
        theme_color: '#8B0000',
        background_color: '#0a0a0a',
        display: 'standalone',
        lang: 'es',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // con margen de seguridad: Android lo recorta en circulo o gota
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Las imágenes del mapa se guardan en el teléfono: la segunda vez que
        // se abre un mapa de la misma zona sale al instante, y por detrás se
        // pide la versión nueva (así lo pide la política de OpenStreetMap).
        //
        // Ojo: el service worker se queda con la regla de seguridad (CSP) con
        // la que se instaló, y el navegador solo lo cambia cuando sw.js cambia.
        // Si se toca la CSP sin tocar la aplicación, sw.js sale idéntico y los
        // teléfonos siguen con la regla vieja (así quedó el mapa gris el
        // 12/11/2026). Por eso el nombre lleva versión: al cambiar la CSP,
        // subirla aquí obliga a todos a instalar el service worker nuevo.
        runtimeCaching: [{
          urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'mapa-v2',
            expiration: { maxEntries: 600, maxAgeSeconds: 7 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      }
    })
  ]
})
