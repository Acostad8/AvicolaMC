import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Building2, Layers, Egg, Skull, Syringe,
  Package, Users, UserCog, BarChart3, Settings, LogOut, Bird, X, Truck, ShieldCheck, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { prefetchGalponesList, prefetchGalponesSelect, prefetchInsumosList, prefetchLotesList } from '../../lib/prefetch'

const adminGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/dashboard/galpones',     icon: Building2, label: 'Galpones' },
      { to: '/dashboard/lotes',        icon: Layers,    label: 'Lotes y Razas' },
      { to: '/dashboard/produccion',   icon: Egg,       label: 'Producción' },
      { to: '/dashboard/mortalidad',   icon: Skull,     label: 'Mortalidad' },
      { to: '/dashboard/tratamientos', icon: Syringe,   label: 'Tratamientos' },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { to: '/dashboard/insumos',     icon: Package, label: 'Insumos' },
      { to: '/dashboard/proveedores', icon: Truck,   label: 'Proveedores' },
    ],
  },
  {
    label: 'Personal',
    items: [
      { to: '/dashboard/empleados', icon: Users,   label: 'Empleados' },
      { to: '/dashboard/usuarios',  icon: UserCog, label: 'Usuarios' },
    ],
  },
  {
    label: 'Analítica',
    items: [
      { to: '/dashboard/predicciones', icon: TrendingUp, label: 'Predicción' },
      { to: '/dashboard/reportes',     icon: BarChart3,  label: 'Reportes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/dashboard/auditoria',     icon: ShieldCheck, label: 'Auditoría' },
      { to: '/dashboard/configuracion', icon: Settings,    label: 'Configuración' },
    ],
  },
]

const encargadoGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/dashboard/galpones',     icon: Building2, label: 'Mis Galpones' },
      { to: '/dashboard/lotes',        icon: Layers,    label: 'Lotes' },
      { to: '/dashboard/produccion',   icon: Egg,       label: 'Producción' },
      { to: '/dashboard/mortalidad',   icon: Skull,     label: 'Mortalidad' },
      { to: '/dashboard/tratamientos', icon: Syringe,   label: 'Tratamientos' },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { to: '/dashboard/insumos', icon: Package, label: 'Insumos' },
    ],
  },
  {
    label: 'Analítica',
    items: [
      { to: '/dashboard/predicciones', icon: TrendingUp, label: 'Predicción' },
      { to: '/dashboard/reportes',     icon: BarChart3,  label: 'Reportes' },
    ],
  },
]

const PREFETCH_ROUTES = {
  '/dashboard/galpones': {
    chunk: () => import('../../pages/private/galpones/GalponesList'),
    data:  (a, id) => prefetchGalponesList(a, id),
  },
  '/dashboard/lotes': {
    chunk: () => import('../../pages/private/lotes/LotesList'),
    data:  (a, id) => prefetchLotesList(a, id),
  },
  '/dashboard/produccion': {
    chunk: () => import('../../pages/private/produccion/ProduccionList'),
    data:  (a, id) => prefetchGalponesSelect(a, id),
  },
  '/dashboard/mortalidad': {
    chunk: () => import('../../pages/private/mortalidad/MortalidadList'),
    data:  (a, id) => prefetchGalponesSelect(a, id),
  },
  '/dashboard/tratamientos': {
    chunk: () => import('../../pages/private/tratamientos/TratamientosList'),
    data:  (a, id) => prefetchGalponesSelect(a, id),
  },
  '/dashboard/insumos': {
    chunk: () => import('../../pages/private/insumos/InsumosList'),
    data:  () => prefetchInsumosList(),
  },
  '/dashboard/predicciones': {
    chunk: () => import('../../pages/private/predicciones/Predicciones'),
    data:  (a, id) => prefetchGalponesSelect(a, id),
  },
  '/dashboard/proveedores': {
    chunk: () => import('../../pages/private/proveedores/ProveedoresList'),
  },
  '/dashboard/empleados': {
    chunk: () => import('../../pages/private/empleados/EmpleadosList'),
  },
  '/dashboard/usuarios': {
    chunk: () => import('../../pages/private/usuarios/UsuariosList'),
  },
  '/dashboard/reportes': {
    chunk: () => import('../../pages/private/Reportes'),
  },
  '/dashboard/auditoria': {
    chunk: () => import('../../pages/private/auditoria/Auditoria'),
  },
}

export default function Sidebar({ open, onClose }) {
  const { perfil, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const groups = isAdmin ? adminGroups : encargadoGroups

  async function handleSignOut() {
    await signOut()
    toast.success('Sesión cerrada correctamente')
    navigate('/login')
  }

  const initials = perfil?.nombre_completo
    ? perfil.nombre_completo.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

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
        <div className="flex items-center justify-between px-4 h-16 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/20">
              <Bird className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 leading-none tracking-tight">Avícola MC</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 uppercase tracking-wider">Sistema de gestión</p>
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
        <div className="mx-3 my-3 px-3 py-2.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70 rounded-xl flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white select-none">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
              {perfil?.nombre_completo || '—'}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 capitalize mt-0.5 truncate">
              {perfil?.rol || '—'}
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
          {groups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {group.label}
              </p>
              {group.items.map(({ to, icon: Icon, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onMouseEnter={() => {
                    const route = PREFETCH_ROUTES[to]
                    if (route) {
                      route.chunk?.()
                      route.data?.(isAdmin, perfil?.id)
                    }
                  }}
                  onClick={() => { if (window.innerWidth < 1024) onClose() }}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary-500 dark:bg-primary-400" />
                      )}
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300'}`} aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
