import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/globals.css'

// ─────────────────────────────────────────────────────────────────────────
// Cada pantalla se pide cuando se entra, no al abrir la aplicacion.
//
// Antes Vite juntaba las 22 en un solo archivo de 1,1 MB: un cliente que
// solo queria reservar una cancha se descargaba tambien las pantallas del
// administrador, las del super administrador y la mesa tecnica. En un
// celular con datos moviles, que es donde se va a usar esto, se nota.
//
// La landing y el login quedan cargados de entrada: son lo primero que se
// ve y no conviene que parpadeen.
// ─────────────────────────────────────────────────────────────────────────
import { AuthProvider, RutaProtegida } from './lib/auth'
import SiAlgoFalla from './components/SiAlgoFalla'
import PaginaInexistente from './components/PaginaInexistente'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
const RecuperarClave = lazy(() => import('./pages/RecuperarClave'))
const Privacidad = lazy(() => import('./pages/Privacidad'))
const Terminos = lazy(() => import('./pages/Terminos'))
const RegistroEmpresa = lazy(() => import('./pages/RegistroEmpresa'))
const MiCuenta = lazy(() => import('./pages/MiCuenta'))
const DashboardUsuario = lazy(() => import('./pages/user/DashboardUsuario'))
const ListaEmpresas = lazy(() => import('./pages/user/ListaEmpresas'))
const EmpresaDetalle = lazy(() => import('./pages/user/EmpresaDetalle'))
const Partidos = lazy(() => import('./pages/user/Partidos'))
const Torneos = lazy(() => import('./pages/user/Torneos'))
const TorneoDetalle = lazy(() => import('./pages/user/TorneoDetalle'))
const TorneoEnVivo = lazy(() => import('./pages/user/TorneoEnVivo'))
const TorneoMesa = lazy(() => import('./pages/user/TorneoMesa'))
const InscribirEquipo = lazy(() => import('./pages/user/InscribirEquipo'))
const CrearTorneo = lazy(() => import('./pages/user/CrearTorneo'))
const MiPerfil = lazy(() => import('./pages/user/MiPerfil'))
const Recompensas = lazy(() => import('./pages/user/Recompensas'))
const Entrenamientos = lazy(() => import('./pages/user/Entrenamientos'))
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'))
const GestionCanchas = lazy(() => import('./pages/admin/GestionCanchas'))
const GestionReservas = lazy(() => import('./pages/admin/GestionReservas'))
const GestionEmpleados = lazy(() => import('./pages/admin/GestionEmpleados'))
const GestionEntrenadores = lazy(() => import('./pages/admin/GestionEntrenadores'))
const PanelEmpleado = lazy(() => import('./pages/empleado/PanelEmpleado'))
const GestionTorneos = lazy(() => import('./pages/admin/GestionTorneos'))
const GestionEntrenamientos = lazy(() => import('./pages/admin/GestionEntrenamientos'))
const GestionRecompensas = lazy(() => import('./pages/admin/GestionRecompensas'))
const GestionCalificaciones = lazy(() => import('./pages/admin/GestionCalificaciones'))
const DashboardSuperAdmin = lazy(() => import('./pages/superadmin/DashboardSuperAdmin'))
const GestionEmpresas = lazy(() => import('./pages/superadmin/GestionEmpresas'))
const GestionUsuarios = lazy(() => import('./pages/superadmin/GestionUsuarios'))

/** Lo que se ve el instante que tarda en llegar el archivo de la pantalla. */
const Cargando = () => (
  <div style={{
    minHeight: '100vh', background: '#0f0f0f', color: '#666',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem',
  }}>
    Cargando…
  </div>
)

export default function App() {
  return (
    // Envuelve todo: si una pantalla revienta al dibujarse, React desmonta
    // el arbol entero y la ventana queda en blanco. Asi al menos se explica
    // que paso y hay por donde salir.
    <SiAlgoFalla>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro-empresa" element={<RegistroEmpresa />} />
          {/* Se llega desde el enlace del correo: es publica a proposito */}
          <Route path="/recuperar" element={<RecuperarClave />} />
          {/* El login enlaza a las dos, y Google pide la de privacidad */}
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/terminos" element={<Terminos />} />

          {/* Usuario/Jugador */}
          <Route path="/app/inicio" element={<RutaProtegida roles={['cliente']}><ListaEmpresas /></RutaProtegida>} />
          <Route path="/app/empresa/:id" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><EmpresaDetalle /></RutaProtegida>} />
          <Route path="/app/empresa/:id/crear-torneo" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><CrearTorneo /></RutaProtegida>} />
          <Route path="/app/dashboard" element={<RutaProtegida roles={['cliente']}><DashboardUsuario /></RutaProtegida>} />
          <Route path="/app/partidos" element={<RutaProtegida roles={['cliente']}><Partidos /></RutaProtegida>} />
          {/* La reserva se hace en el calendario de cada complejo */}
          <Route path="/app/reservas" element={<Navigate to="/app/inicio" replace />} />
          <Route path="/app/torneos" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><Torneos /></RutaProtegida>} />
          <Route path="/app/torneos/:id" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><TorneoDetalle /></RutaProtegida>} />
          <Route path="/app/torneos/:id/inscribir" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><InscribirEquipo /></RutaProtegida>} />
          <Route path="/app/torneos/:id/en-vivo" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><TorneoEnVivo /></RutaProtegida>} />
          <Route path="/app/torneos/:id/mesa" element={<RutaProtegida roles={['cliente', 'admin_empresa', 'empleado']}><TorneoMesa /></RutaProtegida>} />
          <Route path="/app/perfil" element={<RutaProtegida roles={['cliente']}><MiPerfil /></RutaProtegida>} />
          <Route path="/app/recompensas" element={<RutaProtegida roles={['cliente']}><Recompensas /></RutaProtegida>} />
          <Route path="/app/entrenamientos" element={<RutaProtegida roles={['cliente']}><Entrenamientos /></RutaProtegida>} />

          {/* Admin de empresa */}
          {/* La cuenta propia: el cliente ya tiene la suya en /app/perfil */}
          <Route path="/mi-cuenta" element={<RutaProtegida roles={['admin_empresa', 'empleado', 'superadmin']}><MiCuenta /></RutaProtegida>} />

          <Route path="/admin/dashboard" element={<RutaProtegida roles={['admin_empresa']}><DashboardAdmin /></RutaProtegida>} />
          <Route path="/admin/canchas" element={<RutaProtegida roles={['admin_empresa']}><GestionCanchas /></RutaProtegida>} />
          <Route path="/admin/reservas" element={<RutaProtegida roles={['admin_empresa']}><GestionReservas /></RutaProtegida>} />
          <Route path="/admin/empleados" element={<RutaProtegida roles={['admin_empresa']}><GestionEmpleados /></RutaProtegida>} />
          <Route path="/admin/entrenadores" element={<RutaProtegida roles={['admin_empresa']}><GestionEntrenadores /></RutaProtegida>} />
          <Route path="/admin/torneos" element={<RutaProtegida roles={['admin_empresa']}><GestionTorneos /></RutaProtegida>} />
          <Route path="/admin/entrenamientos" element={<RutaProtegida roles={['admin_empresa']}><GestionEntrenamientos /></RutaProtegida>} />
          <Route path="/admin/recompensas" element={<RutaProtegida roles={['admin_empresa']}><GestionRecompensas /></RutaProtegida>} />
          <Route path="/admin/calificaciones" element={<RutaProtegida roles={['admin_empresa']}><GestionCalificaciones /></RutaProtegida>} />

          {/* Empleado del complejo */}
          <Route path="/empleado/panel" element={<RutaProtegida roles={['empleado']}><PanelEmpleado /></RutaProtegida>} />

          {/* Super Admin */}
          <Route path="/superadmin/dashboard" element={<RutaProtegida roles={['superadmin']}><DashboardSuperAdmin /></RutaProtegida>} />
          <Route path="/superadmin/empresas" element={<RutaProtegida roles={['superadmin']}><GestionEmpresas /></RutaProtegida>} />
          <Route path="/superadmin/usuarios" element={<RutaProtegida roles={['superadmin']}><GestionUsuarios /></RutaProtegida>} />

          {/* Una direccion que no existe se explica; antes te mandaba en
              silencio a la pagina de bienvenida */}
          <Route path="*" element={<PaginaInexistente />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </SiAlgoFalla>
  )
}
