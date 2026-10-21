// ─────────────────────────────────────────────────────────────────────────────
// CABECERAS DE SEGURIDAD DEL SITIO
//
// Son instrucciones que el servidor le manda al navegador junto con cada
// pagina, diciendole que tiene permitido hacer y que no. No cambian nada de lo
// que se ve: cambian lo que un atacante puede hacer si logra meter algo.
//
// Estan aca, en un solo archivo, porque se usan en dos lugares distintos y
// tienen que ser exactamente las mismas en los dos:
//
//   - el servidor de desarrollo (vite.config.js), para poder probar que la
//     aplicacion sigue funcionando con estas reglas puestas ANTES de publicar
//   - vercel.json, que es lo que lee Vercel al servir el sitio publicado
//
// Si se agrega un servicio externo nuevo —otro mapa, otro proveedor de fuentes,
// una pasarela de pagos— hay que agregarlo aca o el navegador lo va a bloquear
// en silencio.
// ─────────────────────────────────────────────────────────────────────────────

// De donde tiene permitido bajar cosas la aplicacion.
//
// Todo lo que no este en esta lista, el navegador lo bloquea. Es la cabecera
// que de verdad protege: si alguien lograra inyectar un <script> en una
// pantalla, el navegador no lo ejecutaria porque no viene de nuestro sitio.
const CSP = [
  // Por defecto, nada de afuera
  "default-src 'self'",

  // Codigo: SOLO archivos servidos por nuestro propio sitio. Sin
  // 'unsafe-inline' y sin 'unsafe-eval', que son las dos puertas por las que
  // entra un ataque de inyeccion. El proyecto compila sin scripts sueltos
  // dentro del HTML, asi que no hacen falta.
  "script-src 'self'",

  // Estilos: los nuestros y los de Google Fonts, que es de donde salen las
  // tipografias Bebas Neue y Outfit
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",

  // Imagenes: las nuestras, las que suben los usuarios a Supabase (QR,
  // comprobantes, escudos, fotos de complejos y de perfil), los mosaicos del
  // mapa y la foto de la cuenta de Google de quien entra con Google.
  // 'data:' y 'blob:' son para las vistas previas antes de subir un archivo.
  "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://*.googleusercontent.com",

  // A donde puede hablar: solo a Supabase. 'wss' es la conexion viva que usa
  // para avisar de cambios.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",

  // El service worker de la PWA y el archivo de instalacion, del propio sitio
  "worker-src 'self'",
  "manifest-src 'self'",

  // Nadie puede meter Sportika dentro de un marco en otra pagina. Es lo que
  // evita que copien la pantalla de ingreso adentro de un sitio falso.
  "frame-ancestors 'none'",
  "frame-src 'none'",

  // Nada de Flash ni objetos incrustados, y que no se pueda cambiar la base
  // de las direcciones relativas ni el destino de los formularios
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",

  // Si algo quedara escrito con http, que se pida por https igual
  'upgrade-insecure-requests',
].join('; ')

export const CABECERAS_SEGURIDAD = {
  'Content-Security-Policy': CSP,

  // Que el navegador NUNCA vuelva a entrar por http, ni siquiera la primera
  // vez. Dos anios, subdominios incluidos. 'preload' es para pedir que venga
  // de fabrica en los navegadores.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Que respete el tipo de archivo que declaramos y no adivine. Sin esto, un
  // archivo subido como imagen podria terminar ejecutandose como codigo.
  'X-Content-Type-Options': 'nosniff',

  // Lo mismo que frame-ancestors, para los navegadores viejos que no entienden
  // la politica de contenido
  'X-Frame-Options': 'DENY',

  // Cuanto contamos de donde viene el visitante cuando sale a otro sitio: el
  // dominio y nada mas. Asi no se filtra en que pantalla estaba.
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Que funciones del telefono puede pedir la aplicacion.
  //
  //   geolocation  la usa el complejo para marcar su ubicacion en el mapa
  //   camera       la usa el empleado para fotografiar el comprobante
  //
  // Todo lo demas queda cerrado, incluso para nosotros mismos.
  'Permissions-Policy': [
    'geolocation=(self)', 'camera=(self)',
    'microphone=()', 'payment=()', 'usb=()', 'magnetometer=()',
    'gyroscope=()', 'accelerometer=()', 'midi=()', 'browsing-topics=()',
  ].join(', '),

  // Aisla la pestana de otras ventanas que pudiera abrir
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
}
