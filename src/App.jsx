import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/globals.css'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardUsuario from './pages/user/DashboardUsuario'
import ListaEmpresas from './pages/user/ListaEmpresas'
import EmpresaDetalle from './pages/user/EmpresaDetalle'
import ReservaCanchas from './pages/user/ReservaCanchas'
import Torneos from './pages/user/Torneos'
import TorneoDetalle from './pages/user/TorneoDetalle'
import TorneoEnVivo from './pages/user/TorneoEnVivo'
import TorneoMesa from './pages/user/TorneoMesa'
import InscribirEquipo from './pages/user/InscribirEquipo'
import CrearTorneo from './pages/user/CrearTorneo'
import MiPerfil from './pages/user/MiPerfil'
import Recompensas from './pages/user/Recompensas'
import Entrenamientos from './pages/user/Entrenamientos'
import DashboardAdmin from './pages/admin/DashboardAdmin'
import GestionCanchas from './pages/admin/GestionCanchas'
import GestionReservas from './pages/admin/GestionReservas'
import GestionEmpleados from './pages/admin/GestionEmpleados'
import GestionTorneos from './pages/admin/GestionTorneos'
import GestionEntrenamientos from './pages/admin/GestionEntrenamientos'
import GestionRecompensas from './pages/admin/GestionRecompensas'
import DashboardSuperAdmin from './pages/superadmin/DashboardSuperAdmin'
import GestionEmpresas from './pages/superadmin/GestionEmpresas'
import GestionUsuarios from './pages/superadmin/GestionUsuarios'

// Mock auth context - replace with real Supabase auth
const useAuth = () => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  return { user, role, loading }
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Usuario/Jugador */}
        <Route path="/app/inicio" element={<ListaEmpresas />} />
        <Route path="/app/empresa/:id" element={<EmpresaDetalle />} />
        <Route path="/app/empresa/:id/crear-torneo" element={<CrearTorneo />} />
        <Route path="/app/dashboard" element={<DashboardUsuario />} />
        <Route path="/app/reservas" element={<ReservaCanchas />} />
        <Route path="/app/torneos" element={<Torneos />} />
        <Route path="/app/torneos/:id" element={<TorneoDetalle />} />
        <Route path="/app/torneos/:id/inscribir" element={<InscribirEquipo />} />
        <Route path="/app/torneos/:id/en-vivo" element={<TorneoEnVivo />} />
        <Route path="/app/torneos/:id/mesa" element={<TorneoMesa />} />
        <Route path="/app/perfil" element={<MiPerfil />} />
        <Route path="/app/recompensas" element={<Recompensas />} />
        <Route path="/app/entrenamientos" element={<Entrenamientos />} />

        {/* Admin de empresa */}
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/canchas" element={<GestionCanchas />} />
        <Route path="/admin/reservas" element={<GestionReservas />} />
        <Route path="/admin/empleados" element={<GestionEmpleados />} />
        <Route path="/admin/torneos" element={<GestionTorneos />} />
        <Route path="/admin/entrenamientos" element={<GestionEntrenamientos />} />
        <Route path="/admin/recompensas" element={<GestionRecompensas />} />

        {/* Super Admin */}
        <Route path="/superadmin/dashboard" element={<DashboardSuperAdmin />} />
        <Route path="/superadmin/empresas" element={<GestionEmpresas />} />
        <Route path="/superadmin/usuarios" element={<GestionUsuarios />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
