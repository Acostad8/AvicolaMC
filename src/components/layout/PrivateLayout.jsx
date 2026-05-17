import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

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
  const location = useLocation()
  const title = getTitle(location.pathname)

  return (
    <div className="flex h-screen bg-farm-cream overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onMenuToggle={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
