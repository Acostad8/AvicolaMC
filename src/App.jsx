import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { AccessibilityProvider } from './context/AccessibilityContext'
import { ConfigProvider } from './context/ConfigContext'
import { NotificationsProvider } from './context/NotificationsContext'
import AccessibilityPanel from './components/ui/AccessibilityPanel'
import ProtectedRoute, { AdminRoute } from './components/auth/ProtectedRoute'
import PrivateLayout from './components/layout/PrivateLayout'

// Public
import LandingPage from './pages/public/LandingPage'
import Login from './pages/public/Login'
import RecuperarContrasena from './pages/public/RecuperarContrasena'
import RestablecerContrasena from './pages/public/RestablecerContrasena'

// Private
import Dashboard from './pages/private/Dashboard'
import Perfil from './pages/private/Perfil'
import Forbidden from './pages/Forbidden'

// Galpones
import GalponesList from './pages/private/galpones/GalponesList'
import GalponForm from './pages/private/galpones/GalponForm'
import GalponDetalle from './pages/private/galpones/GalponDetalle'

// Lotes y Razas
import LotesList from './pages/private/lotes/LotesList'
import LoteForm from './pages/private/lotes/LoteForm'
import LoteDetalle from './pages/private/lotes/LoteDetalle'
import RazasList from './pages/private/razas/RazasList'

// Producción
import ProduccionList from './pages/private/produccion/ProduccionList'
import ProduccionForm from './pages/private/produccion/ProduccionForm'
import ProduccionDetalle from './pages/private/produccion/ProduccionDetalle'

// Mortalidad
import MortalidadList from './pages/private/mortalidad/MortalidadList'
import MortalidadForm from './pages/private/mortalidad/MortalidadForm'
import MortalidadDetalle from './pages/private/mortalidad/MortalidadDetalle'

// Tratamientos
import TratamientosList from './pages/private/tratamientos/TratamientosList'
import TratamientoForm from './pages/private/tratamientos/TratamientoForm'
import TratamientoDetalle from './pages/private/tratamientos/TratamientoDetalle'

// Insumos
import InsumosList from './pages/private/insumos/InsumosList'
import InsumoForm from './pages/private/insumos/InsumoForm'
import InsumoDetalle from './pages/private/insumos/InsumoDetalle'
import MovimientoForm from './pages/private/insumos/MovimientoForm'

// Empleados
import EmpleadosList from './pages/private/empleados/EmpleadosList'
import EmpleadoForm from './pages/private/empleados/EmpleadoForm'
import EmpleadoDetalle from './pages/private/empleados/EmpleadoDetalle'

// Usuarios
import UsuariosList from './pages/private/usuarios/UsuariosList'
import UsuarioForm from './pages/private/usuarios/UsuarioForm'
import UsuarioDetalle from './pages/private/usuarios/UsuarioDetalle'

// Proveedores
import ProveedoresList from './pages/private/proveedores/ProveedoresList'
import ProveedorForm from './pages/private/proveedores/ProveedorForm'
import ProveedorDetalle from './pages/private/proveedores/ProveedorDetalle'

// Reportes
import Reportes from './pages/private/Reportes'

// Configuración
import Configuracion from './pages/private/configuracion/Configuracion'


export default function App() {
  return (
    <AccessibilityProvider>
      <ConfigProvider>
      <NotificationsProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            <AccessibilityPanel />
            <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
            <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
            <Route path="/403" element={<Forbidden />} />

            {/* Private */}
            <Route element={<ProtectedRoute />}>
              <Route element={<PrivateLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/perfil" element={<Perfil />} />

                <Route path="/dashboard/galpones" element={<GalponesList />} />
                <Route path="/dashboard/galpones/nuevo" element={<AdminRoute><GalponForm /></AdminRoute>} />
                <Route path="/dashboard/galpones/:id" element={<GalponDetalle />} />
                <Route path="/dashboard/galpones/:id/editar" element={<AdminRoute><GalponForm /></AdminRoute>} />

                <Route path="/dashboard/lotes" element={<LotesList />} />
                <Route path="/dashboard/lotes/nuevo" element={<LoteForm />} />
                <Route path="/dashboard/lotes/:id" element={<LoteDetalle />} />
                <Route path="/dashboard/lotes/:id/editar" element={<AdminRoute><LoteForm /></AdminRoute>} />
                <Route path="/dashboard/razas" element={<RazasList />} />

                <Route path="/dashboard/produccion" element={<ProduccionList />} />
                <Route path="/dashboard/produccion/nuevo" element={<ProduccionForm />} />
                <Route path="/dashboard/produccion/:id" element={<ProduccionDetalle />} />
                <Route path="/dashboard/produccion/:id/editar" element={<ProduccionForm />} />

                <Route path="/dashboard/mortalidad" element={<MortalidadList />} />
                <Route path="/dashboard/mortalidad/nuevo" element={<MortalidadForm />} />
                <Route path="/dashboard/mortalidad/:id" element={<MortalidadDetalle />} />
                <Route path="/dashboard/mortalidad/:id/editar" element={<MortalidadForm />} />

                <Route path="/dashboard/tratamientos" element={<TratamientosList />} />
                <Route path="/dashboard/tratamientos/nuevo" element={<AdminRoute><TratamientoForm /></AdminRoute>} />
                <Route path="/dashboard/tratamientos/:id" element={<TratamientoDetalle />} />
                <Route path="/dashboard/tratamientos/:id/editar" element={<AdminRoute><TratamientoForm /></AdminRoute>} />

                <Route path="/dashboard/insumos" element={<InsumosList />} />
                <Route path="/dashboard/insumos/nuevo" element={<AdminRoute><InsumoForm /></AdminRoute>} />
                <Route path="/dashboard/insumos/movimiento/nuevo" element={<AdminRoute><MovimientoForm /></AdminRoute>} />
                <Route path="/dashboard/insumos/:id" element={<InsumoDetalle />} />
                <Route path="/dashboard/insumos/:id/editar" element={<AdminRoute><InsumoForm /></AdminRoute>} />

                <Route path="/dashboard/empleados" element={<AdminRoute><EmpleadosList /></AdminRoute>} />
                <Route path="/dashboard/empleados/nuevo" element={<AdminRoute><EmpleadoForm /></AdminRoute>} />
                <Route path="/dashboard/empleados/:id" element={<AdminRoute><EmpleadoDetalle /></AdminRoute>} />
                <Route path="/dashboard/empleados/:id/editar" element={<AdminRoute><EmpleadoForm /></AdminRoute>} />

                <Route path="/dashboard/usuarios" element={<AdminRoute><UsuariosList /></AdminRoute>} />
                <Route path="/dashboard/usuarios/nuevo" element={<AdminRoute><UsuarioForm /></AdminRoute>} />
                <Route path="/dashboard/usuarios/:id" element={<AdminRoute><UsuarioDetalle /></AdminRoute>} />
                <Route path="/dashboard/usuarios/:id/editar" element={<AdminRoute><UsuarioForm /></AdminRoute>} />

                <Route path="/dashboard/proveedores" element={<AdminRoute><ProveedoresList /></AdminRoute>} />
                <Route path="/dashboard/proveedores/nuevo" element={<AdminRoute><ProveedorForm /></AdminRoute>} />
                <Route path="/dashboard/proveedores/:id" element={<AdminRoute><ProveedorDetalle /></AdminRoute>} />
                <Route path="/dashboard/proveedores/:id/editar" element={<AdminRoute><ProveedorForm /></AdminRoute>} />

                <Route path="/dashboard/reportes" element={<Reportes />} />
                <Route path="/dashboard/configuracion" element={<AdminRoute><Configuracion /></AdminRoute>} />
                <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </NotificationsProvider>
    </ConfigProvider>
    </AccessibilityProvider>
  )
}
