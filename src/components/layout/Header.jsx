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
    <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-stone-500 hover:text-stone-700 p-1"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-stone-800">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                <Link
                  to="/dashboard/perfil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
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
