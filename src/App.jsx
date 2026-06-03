import { lazy, Suspense } from 'react'
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
const LandingPage          = lazy(() => import('./pages/public/LandingPage'))
const Login                = lazy(() => import('./pages/public/Login'))
const RecuperarContrasena  = lazy(() => import('./pages/public/RecuperarContrasena'))
const RestablecerContrasena= lazy(() => import('./pages/public/RestablecerContrasena'))

// Private — core
const Dashboard  = lazy(() => import('./pages/private/Dashboard'))
const Perfil     = lazy(() => import('./pages/private/Perfil'))
const Forbidden  = lazy(() => import('./pages/Forbidden'))

// Galpones
const GalponesList  = lazy(() => import('./pages/private/galpones/GalponesList'))
const GalponForm    = lazy(() => import('./pages/private/galpones/GalponForm'))
const GalponDetalle = lazy(() => import('./pages/private/galpones/GalponDetalle'))

// Lotes y Razas
const LotesList   = lazy(() => import('./pages/private/lotes/LotesList'))
const LoteForm    = lazy(() => import('./pages/private/lotes/LoteForm'))
const LoteDetalle = lazy(() => import('./pages/private/lotes/LoteDetalle'))
const RazasList   = lazy(() => import('./pages/private/razas/RazasList'))

// Producción
const ProduccionList    = lazy(() => import('./pages/private/produccion/ProduccionList'))
const ProduccionForm    = lazy(() => import('./pages/private/produccion/ProduccionForm'))
const ProduccionDetalle = lazy(() => import('./pages/private/produccion/ProduccionDetalle'))

// Mortalidad
const MortalidadList    = lazy(() => import('./pages/private/mortalidad/MortalidadList'))
const MortalidadForm    = lazy(() => import('./pages/private/mortalidad/MortalidadForm'))
const MortalidadDetalle = lazy(() => import('./pages/private/mortalidad/MortalidadDetalle'))

// Tratamientos
const TratamientosList    = lazy(() => import('./pages/private/tratamientos/TratamientosList'))
const TratamientoForm     = lazy(() => import('./pages/private/tratamientos/TratamientoForm'))
const TratamientoDetalle  = lazy(() => import('./pages/private/tratamientos/TratamientoDetalle'))

// Insumos
const InsumosList    = lazy(() => import('./pages/private/insumos/InsumosList'))
const InsumoForm     = lazy(() => import('./pages/private/insumos/InsumoForm'))
const InsumoDetalle  = lazy(() => import('./pages/private/insumos/InsumoDetalle'))
const MovimientoForm = lazy(() => import('./pages/private/insumos/MovimientoForm'))

// Empleados
const EmpleadosList   = lazy(() => import('./pages/private/empleados/EmpleadosList'))
const EmpleadoForm    = lazy(() => import('./pages/private/empleados/EmpleadoForm'))
const EmpleadoDetalle = lazy(() => import('./pages/private/empleados/EmpleadoDetalle'))

// Usuarios
const UsuariosList   = lazy(() => import('./pages/private/usuarios/UsuariosList'))
const UsuarioForm    = lazy(() => import('./pages/private/usuarios/UsuarioForm'))
const UsuarioDetalle = lazy(() => import('./pages/private/usuarios/UsuarioDetalle'))

// Proveedores
const ProveedoresList   = lazy(() => import('./pages/private/proveedores/ProveedoresList'))
const ProveedorForm     = lazy(() => import('./pages/private/proveedores/ProveedorForm'))
const ProveedorDetalle  = lazy(() => import('./pages/private/proveedores/ProveedorDetalle'))

// Reportes, Configuración y Auditoría
const Reportes      = lazy(() => import('./pages/private/Reportes'))
const Configuracion = lazy(() => import('./pages/private/configuracion/Configuracion'))
const Auditoria     = lazy(() => import('./pages/private/auditoria/Auditoria'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-stone-400 dark:text-stone-500">Cargando...</span>
      </div>
    </div>
  )
}

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
            <Suspense fallback={<PageLoader />}>
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
                    <Route path="/dashboard/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
                    <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
      </NotificationsProvider>
      </ConfigProvider>
    </AccessibilityProvider>
  )
}
