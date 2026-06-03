import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Building2, Layers, Egg, Skull, Syringe,
  Package, Users, UserCog, BarChart3, Settings, LogOut, Bird, X, Truck, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/dashboard',                icon: LayoutDashboard, label: 'Dashboard',    exact: true },
  { to: '/dashboard/galpones',       icon: Building2,       label: 'Galpones' },
  { to: '/dashboard/lotes',          icon: Layers,          label: 'Lotes y Razas' },
  { to: '/dashboard/produccion',     icon: Egg,             label: 'Producción' },
  { to: '/dashboard/mortalidad',     icon: Skull,           label: 'Mortalidad' },
  { to: '/dashboard/tratamientos',   icon: Syringe,         label: 'Tratamientos' },
  { to: '/dashboard/insumos',        icon: Package,         label: 'Insumos' },
  { to: '/dashboard/proveedores',    icon: Truck,           label: 'Proveedores' },
  { to: '/dashboard/empleados',      icon: Users,           label: 'Empleados' },
  { to: '/dashboard/usuarios',       icon: UserCog,         label: 'Usuarios' },
  { to: '/dashboard/reportes',       icon: BarChart3,       label: 'Reportes' },
  { to: '/dashboard/auditoria',      icon: ShieldCheck,     label: 'Auditoría' },
  { to: '/dashboard/configuracion',  icon: Settings,        label: 'Configuración' },
]

const encargadoLinks = [
  { to: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard',    exact: true },
  { to: '/dashboard/galpones',     icon: Building2,       label: 'Mis Galpones' },
  { to: '/dashboard/lotes',        icon: Layers,          label: 'Lotes' },
  { to: '/dashboard/produccion',   icon: Egg,             label: 'Producción' },
  { to: '/dashboard/mortalidad',   icon: Skull,           label: 'Mortalidad' },
  { to: '/dashboard/tratamientos', icon: Syringe,         label: 'Tratamientos' },
  { to: '/dashboard/insumos',      icon: Package,         label: 'Insumos' },
  { to: '/dashboard/reportes',     icon: BarChart3,       label: 'Reportes' },
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menú de navegación"
        className={`
          fixed top-0 left-0 h-full w-64
          bg-white dark:bg-stone-900
          border-r border-stone-200 dark:border-stone-800
          z-30 flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <Bird className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary-800 dark:text-primary-400 leading-none">Avícola MC</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">Sistema de gestión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* User chip */}
        <div className="mx-3 my-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
            {perfil?.nombre_completo || '—'}
          </p>
          <p className="text-xs text-primary-700 dark:text-primary-400 capitalize mt-0.5">
            {perfil?.rol || '—'}
          </p>
        </div>

        {/* Nav links */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
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
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleSignOut}
            className="sidebar-link sidebar-link-inactive w-full !text-red-500 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/30 hover:!text-red-600 dark:hover:!text-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
