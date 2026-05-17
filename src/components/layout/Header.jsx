import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Bell, ChevronDown, User, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Header({ title, onMenuToggle }) {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
    toast.success('Sesión cerrada correctamente')
    navigate('/login')
  }

  const initials = perfil?.nombre_completo
    ? perfil.nombre_completo.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="h-14 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 transition-colors duration-300">

      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold text-stone-800 dark:text-stone-100">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button
          className="p-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white select-none">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-stone-700 dark:text-stone-300 max-w-[120px] truncate">
              {perfil?.nombre_completo?.split(' ')[0] || '—'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-20 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
                    {perfil?.nombre_completo || '—'}
                  </p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 capitalize mt-0.5">
                    {perfil?.rol || '—'}
                  </p>
                </div>
                <Link
                  to="/dashboard/perfil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <User className="h-4 w-4 text-stone-400" aria-hidden="true" />
                  Mi perfil
                </Link>
                <div className="mx-3 my-1 border-t border-stone-100 dark:border-stone-800" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
