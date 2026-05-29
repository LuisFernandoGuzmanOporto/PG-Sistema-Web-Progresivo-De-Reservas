# 🏟️ SPORTIKA
**Sistema de Gestión de Reservas de Canchas Deportivas, Organización de Partidos y Torneos**
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
| **Empleado** | `/admin/reservas` — Solo ve y valida reservas del día |
| **Jugador** | `/app/*` — Reserva canchas, partidos, torneos, puntos |

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
- `empleados` — Empleados por empresa

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
