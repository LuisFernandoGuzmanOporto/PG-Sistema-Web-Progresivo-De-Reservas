# 🏟️ SPORTIKA

**Sistema web progresivo para la gestión de reservas de canchas deportivas y la organización de eventos deportivos en la ciudad de Cochabamba**

Proyecto de grado · Ingeniería de Sistemas Informáticos · Universidad Privada del Valle · 2026
Postulante: Luis Fernando Guzmán Oporto

---

## Qué es

SPORTIKA es una Aplicación Web Progresiva (PWA) que reúne en un solo lugar a jugadores, complejos deportivos y organizadores de torneos. Se usa desde el navegador de una computadora o de un teléfono, y se instala como una aplicación.

- **Reservas y pagos:** el cliente ve las horas libres de cada cancha, las reserva y paga con el código QR del complejo. La hora queda apartada a su nombre por 10 minutos mientras paga, y la base de datos impide que dos personas reserven la misma hora.
- **Partidos espontáneos:** un cliente abre un partido en su reserva y otros jugadores se suman hasta completar el cupo.
- **Torneos:** liga, eliminación directa o grupos con eliminación, con inscripción de equipos, fixture, Mesa Técnica y vista En Vivo con posiciones y cuadro de cruces.
- **Gestión del complejo:** canchas, horarios, precios, empleados, entrenadores, entrenamientos, recompensas por puntos, calificaciones y un panel de estadísticas.

## Roles

| Rol | Rutas | Qué hace |
|---|---|---|
| Super Administrador | `/superadmin/*` | Aprueba los complejos y administra a los usuarios de la plataforma |
| Administrador de Empresa | `/admin/*` | Maneja todo lo de su complejo |
| Empleado | `/empleado/panel` | Atiende las reservas del día, registra reservas en el mostrador y valida comprobantes |
| Cliente | `/app/*` | Reserva canchas, se une a partidos, inscribe equipos y canjea puntos |

## Tecnologías

- **Aplicación:** React 18, Vite 5 y React Router 6
- **PWA:** vite-plugin-pwa (Workbox)
- **Mapas:** Leaflet con OpenStreetMap
- **Backend:** Supabase (PostgreSQL con seguridad a nivel de fila, autenticación con correo o Google, almacenamiento de archivos y una Edge Function)
- **Pruebas:** Vitest y Playwright
- **Publicación:** Vercel

## Estructura

```
src/
├── components/     Piezas compartidas: menú, notificaciones, visor de comprobantes, mapa…
├── lib/            Conexión con Supabase, lectura y guardado de datos, reglas de torneos, validaciones
├── pages/
│   ├── user/       Pantallas del cliente
│   ├── admin/      Pantallas del administrador de empresa
│   ├── empleado/   Panel y agenda del empleado
│   └── superadmin/ Pantallas del super administrador
└── styles/         Estilos globales
migraciones/        Historial de cambios de la base, del 003 al 043
pruebas/            Pruebas unitarias, de integración, de sistema, de seguridad, E2E y de carga
scripts/            Generador de los datos de demostración
supabase/functions/ Edge Function que crea las cuentas de los empleados
sportika_schema.sql Base de datos completa en un solo archivo
```

---

## Cómo levantar el proyecto

### 1. Instalar las dependencias

```bash
npm install
```

### 2. Crear la base de datos

1. En [supabase.com](https://supabase.com) crea un proyecto nuevo.
2. En el **SQL Editor**, pega y ejecuta **`sportika_schema.sql`** completo.

Ese archivo deja todo listo de una vez: las 23 tablas, las políticas de seguridad (RLS), los disparadores que otorgan los puntos y mandan las notificaciones, y los depósitos de archivos (`publico` para los QR y las fotos, `comprobantes` para las pruebas de pago).

> No hace falta correr la carpeta `migraciones/`. Es el historial de cómo se fue armando la base, y `sportika_schema.sql` ya incluye todas las migraciones. Sirven para entender por qué algo quedó como quedó y para actualizar una base que ya está en uso.

### 3. Conectar la aplicación con la base

```bash
cp .env.example .env
```

En Supabase, entra a **Project Settings → API** y copia en el `.env` la URL del proyecto y la `anon key`:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

La `anon key` es pública a propósito, porque viaja al navegador con la aplicación: lo que protege los datos son las políticas RLS. La clave que **nunca** va en el `.env` ni en GitHub es la `service_role`.

### 4. Cargar los datos de demostración (opcional)

```bash
node scripts/generar-datos-iniciales.mjs
```

Genera `sportika_datos_iniciales.sql` con complejos, canchas, torneos y cuentas de ejemplo, que luego se ejecuta en el SQL Editor. La contraseña de las cuentas de ejemplo se lee de `SPORTIKA_CLAVE_PRUEBA` en `.env.pruebas.local`. Ni ese archivo ni el SQL generado se suben al repositorio.

### 5. Arrancar

```bash
npm run dev
```

---

## Configuración en el panel de Supabase

- **Correo para recuperar la contraseña:** en *Authentication → Emails* configura un SMTP propio (por ejemplo, Brevo). En la plantilla *Reset Password* usa `{{ .Token }}` y no el enlace, porque la aplicación pide un código.
- **Cuentas de empleados:** las crea la Edge Function de `supabase/functions/empleados`. Se publica con `supabase functions deploy empleados`. Es lo único que usa la `service_role`, y por eso corre en el servidor.
- **Entrar con Google:** en *Authentication → Sign In / Providers → Google*, con el Client ID y el Client Secret de Google Cloud Console.
- **Direcciones permitidas:** en *Authentication → URL Configuration*:
  - En **Site URL** va la dirección publicada.
  - En **Redirect URLs** va esa dirección seguida de `/**`.

## Publicar en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa este repositorio.
2. Preajuste **Vite**, comando de compilación `npm run build` y directorio de salida `dist`.
3. En **Environment Variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Despliega.

`vercel.json` ya trae las cabeceras de seguridad del sitio y la regla que devuelve `index.html` en cualquier ruta, para que las direcciones de la aplicación funcionen al recargar la página.

## Pruebas

| Comando | Qué ejecuta |
|---|---|
| `npm run test:caja-blanca` | Pruebas unitarias y de integración |
| `npm run test:sistema` | Pruebas de sistema por rol |
| `npm run test:seguridad` | Pruebas de seguridad |
| `npm run test:e2e` | Pruebas de extremo a extremo con Playwright |
| `npm run test:carga` | Pruebas de carga y rendimiento |

Las pruebas que usan la base necesitan `.env.pruebas.local` con `SPORTIKA_CLAVE_PRUEBA`, la contraseña de las cuentas de demostración.
