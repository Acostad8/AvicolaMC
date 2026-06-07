import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../context/AuthContext'
import { useIdleTimeout } from '../../hooks/useIdleTimeout'
import { IdleWarningModal } from '../ui/IdleWarningModal'
import { useAlertasUmbrales } from '../../hooks/useAlertasUmbrales'
import ChatBot from '../ui/ChatBot'

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/dashboard/galpones': 'Galpones',
  '/dashboard/lotes': 'Lotes y Razas',
  '/dashboard/razas': 'Razas',
  '/dashboard/produccion': 'Producción',
  '/dashboard/mortalidad': 'Mortalidad',
  '/dashboard/tratamientos': 'Tratamientos',
  '/dashboard/insumos': 'Insumos',
  '/dashboard/empleados': 'Empleados',
  '/dashboard/usuarios': 'Usuarios',
  '/dashboard/reportes': 'Reportes',
  '/dashboard/configuracion': 'Configuración',
  '/dashboard/perfil': 'Mi Perfil',
}

function getTitle(pathname) {
  if (routeTitles[pathname]) return routeTitles[pathname]
  if (pathname.includes('/nuevo') || pathname.includes('/nueva')) return 'Nuevo registro'
  if (pathname.includes('/editar')) return 'Editar'
  const base = Object.keys(routeTitles).find(k => pathname.startsWith(k) && k !== '/dashboard')
  return base ? routeTitles[base] : 'Panel'
}

export default function PrivateLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location  = useLocation()
  const title     = getTitle(location.pathname)
  const { signOut } = useAuth()
  const { checkTratamientosLargos } = useAlertasUmbrales()

  useEffect(() => {
    checkTratamientosLargos()
  // Solo al montar — no repetir aunque cambie checkTratamientosLargos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { isWarning, countdown, warningSeconds, resetTimer } = useIdleTimeout({
    timeoutMs: 30 * 60 * 1000,
    warningMs:  2 * 60 * 1000,
    onTimeout:  signOut,
  })

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden transition-colors duration-300">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onMenuToggle={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <IdleWarningModal
        open={isWarning}
        countdown={countdown}
        warningSeconds={warningSeconds}
        onStay={resetTimer}
        onLogout={signOut}
      />

      <ChatBot />
    </div>
  )
}
