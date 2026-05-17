import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Building2, Layers, Egg, Skull, Syringe,
  Package, Users, UserCog, BarChart3, Settings, LogOut, Bird, X, Truck
} from 'lucide-react'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/dashboard/galpones', icon: Building2, label: 'Galpones' },
  { to: '/dashboard/lotes', icon: Layers, label: 'Lotes y Razas' },
  { to: '/dashboard/produccion', icon: Egg, label: 'Producción' },
  { to: '/dashboard/mortalidad', icon: Skull, label: 'Mortalidad' },
  { to: '/dashboard/tratamientos', icon: Syringe, label: 'Tratamientos' },
  { to: '/dashboard/insumos', icon: Package, label: 'Insumos' },
  { to: '/dashboard/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/dashboard/empleados', icon: Users, label: 'Empleados' },
  { to: '/dashboard/usuarios', icon: UserCog, label: 'Usuarios' },
  { to: '/dashboard/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/dashboard/configuracion', icon: Settings, label: 'Configuración' },
]

const encargadoLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/dashboard/galpones', icon: Building2, label: 'Mis Galpones' },
  { to: '/dashboard/lotes', icon: Layers, label: 'Lotes' },
  { to: '/dashboard/produccion', icon: Egg, label: 'Producción' },
  { to: '/dashboard/mortalidad', icon: Skull, label: 'Mortalidad' },
  { to: '/dashboard/tratamientos', icon: Syringe, label: 'Tratamientos' },
  { to: '/dashboard/insumos', icon: Package, label: 'Insumos' },
  { to: '/dashboard/reportes', icon: BarChart3, label: 'Reportes' },
]

export default function Sidebar({ open, onClose }) {
  const { perfil, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const links = isAdmin ? adminLinks : encargadoLinks

  async function handleSignOut() {
    await signOut()
    toast.success('Sesión cerrada correctamente')
    navigate('/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-stone-200 z-30
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Bird className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary-800 leading-none">Avícola MC</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Sistema de gestión</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-stone-100 bg-amber-50">
          <p className="text-sm font-semibold text-stone-800 truncate">{perfil?.nombre_completo || '—'}</p>
          <p className="text-xs text-primary-700 capitalize">{perfil?.rol || '—'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {links.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => { if (window.innerWidth < 1024) onClose() }}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-stone-200">
          <button
            onClick={handleSignOut}
            className="sidebar-link sidebar-link-inactive w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
