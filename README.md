# 🏟️ SPORTIKA
**Sistema de Gestión de Reservas de Canchas Deportivas y Organización de Eventos Deportivos**
*Cochabamba, Bolivia — Proyecto de Grado*

---

## 🚀 Cómo arrancar el proyecto

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
1. Ve a https://supabase.com y crea un proyecto nuevo
2. En el SQL Editor de Supabase, ejecuta todo el código SQL que está en:
   `src/lib/supabase.js` (está en los comentarios al final del archivo)
3. En Authentication > Providers, activa Google y configura las credenciales
4. Copia tu URL y Anon Key

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` y pon tu URL y Anon Key de Supabase.

### 4. Arrancar en desarrollo
```bash
npm run dev
```

### 5. Build para producción
```bash
npm run build
```

---

## 🗂️ Estructura del proyecto

```
src/
├── components/
│   └── layout/
│       └── Layout.jsx          # Navbar + Sidebar compartido
├── pages/
│   ├── LandingPage.jsx         # Página principal pública
│   ├── LoginPage.jsx           # Login + Google Auth
│   ├── user/
│   │   ├── DashboardUsuario.jsx
│   │   ├── ReservaCanchas.jsx
│   │   ├── Partidos.jsx
│   │   ├── Torneos.jsx
│   │   └── MiPerfil.jsx
│   ├── admin/
│   │   ├── DashboardAdmin.jsx
│   │   ├── GestionCanchas.jsx
│   │   ├── GestionReservas.jsx
│   │   ├── GestionEmpleados.jsx
│   │   └── GestionTorneos.jsx
│   └── superadmin/
│       ├── DashboardSuperAdmin.jsx
│       ├── GestionEmpresas.jsx
│       └── GestionUsuarios.jsx
├── lib/
│   └── supabase.js             # Cliente Supabase + Schema SQL
└── styles/
    └── globals.css             # Design system completo
```

---

## 👥 Roles del sistema

| Rol | Acceso |
|-----|--------|
| **Super Admin** | `/superadmin/*` — Aprueba empresas, ve estadísticas globales |
| **Admin Empresa** | `/admin/*` — Gestiona sus canchas, reservas, empleados, torneos |
| **Empleado** | `/admin/reservas` — Ve y valida reservas del día, confirma comprobantes, consulta inscritos a entrenamientos |
| **Cliente** | `/app/*` — Reserva canchas, partidos, torneos, puntos |

---

## 🗄️ Base de datos (Supabase)

Tablas principales:
- `profiles` — Perfiles de usuarios con rol
- `empresas` — Complejos deportivos
- `canchas` — Canchas por empresa
- `reservas` — Reservas con estado y comprobante
- `partidos` — Partidos espontáneos
- `partido_jugadores` — Jugadores por partido
- `torneos` — Torneos con QR de pago
- `torneo_equipos` — Equipos inscritos
- `transacciones` — Historial de pagos
- `puntos_historial` — Puntos ganados
- `empleados` — Empleados por empresa (creados por el admin, no se registran solos)
- `entrenadores` — Entrenadores registrados por empresa
- `torneo_equipos` — Equipos inscritos en torneos
- `inscripciones` — Inscripciones a entrenamientos
- `calificaciones` — Calificaciones de empresas (1-5 estrellas)
- `puntos_historial` — Historial de puntos ganados y canjeados

---

## 🎨 Design System

Colores principales:
- Primario: `#8B0000` (vino/granate)
- Acento: `#00BCD4` (cyan)
- Fondo: `#0f0f0f` (negro)
- Tipografía: Bebas Neue (títulos) + Outfit (cuerpo)

---

## 📱 PWA

El proyecto está configurado como Progressive Web App:
- Instalable en Android/iOS
- Funciona parcialmente sin internet
- Iconos y splash screen configurados

---

## ⚙️ Tecnologías

- **Frontend:** React 18 + Vite
- **PWA:** vite-plugin-pwa
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Google OAuth)
- **Routing:** React Router v6
- **Deploy:** Vercel / Netlify

---

## 🔧 Pendiente de implementar

### 1. Registro de Empresas (Opción A — flujo separado)
- Landing page: botón "¿Tenés una empresa deportiva? Regístrala"
- Formulario de registro empresa: nombre, dirección, teléfono, tipo de deporte, descripción
- La empresa queda en estado `pendiente_aprobacion` en Supabase
- Super Admin ve la solicitud en su panel → aprueba o rechaza
- Si aprueba → usuario creado con rol `admin_empresa` + email de confirmación
- La empresa entra directo al panel admin con sus credenciales

### 2. Mi Perfil completo (MiPerfil.jsx)
- Agregar tab **Mis Reservas**: empresa, cancha, fecha, hora, estado
- Agregar tab **Mis Entrenamientos**: entrenamientos inscritos con estado de pago
- Ya existen: Perfil, Mis Torneos, Puntos
- Nota: el rol del usuario se llama **Cliente** (no Jugador)

### 3. Calificaciones y comentarios (EmpresaDetalle.jsx)
- Sección de estrellas (1-5) por empresa
- Comentario opcional
- Promedio visible para todos los usuarios

### 4. Mapa en perfil de empresa (EmpresaDetalle.jsx)
- Instalar: `npm install leaflet react-leaflet`
- Agregar coordenadas en el mock data de empresas
- Mostrar mapa Leaflet con pin de ubicación

### 5. Gestión de Empleados (flujo completo)
- El Admin de Empresa crea la cuenta del empleado desde su panel (`GestionEmpleados.jsx`)
- Formulario: nombre, correo, contraseña temporal
- El sistema llama a `supabase.auth.admin.createUser()` desde una **Edge Function** de Supabase (no desde el frontend por seguridad)
- Se crea el perfil en la tabla `profiles` con rol `empleado` y el `empresa_id` del admin que lo creó
- El admin entrega las credenciales al empleado (correo + contraseña temporal)
- El empleado entra con esas credenciales y accede solo a: ver reservas del día, confirmar/rechazar comprobantes de pago y consultar inscritos a entrenamientos
- El admin puede desactivar al empleado desde su panel sin borrar su historial de acciones
- Tabla `empleados`: `id` (FK profiles.id), `empresa_id` (FK empresas.id), `activo` (Boolean)

falta esto :
Buena observación. Te explico cómo funcionaría el flujo completo:
Para un descuento en reserva:

Cliente canjea → sistema genera un código único ej: SPORT-DESC20-X7K2
El cliente ve ese código en "Mis canjes" con un botón "Copiar código"
Cuando hace una reserva, ingresa ese código → se aplica el descuento automáticamente
El código cambia a estado "Utilizado" y ya no funciona más

Para inscripción gratis en torneo:

Cliente canjea → genera código ej: SPORT-TORNEO-FREE-9A3B
Cuando inscribe su equipo en un torneo, ingresa el código en vez de subir comprobante QR
El sistema valida el código → inscripción aprobada automáticamente
Código pasa a "Utilizado"

Del lado del Admin:

Ve en su panel una sección "Canjes de recompensas" con: cliente, recompensa, código generado, estado (Disponible/Utilizado) y fecha
Cuando el código se usa en una reserva o torneo, el admin lo ve actualizado automáticamente

Ahora implemento todo esto — el código generado en el canje del cliente + la sección del admin: