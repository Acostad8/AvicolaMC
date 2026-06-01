import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu, Bell, ChevronDown, User, LogOut,
  CheckCheck, Trash2, CheckCircle2, AlertCircle,
  AlertTriangle, Info, BellOff,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationsContext'
import { useConfig } from '../../context/ConfigContext'
import toast from 'react-hot-toast'

/* ── Ícono por tipo de notificación ── */
function NotifIcon({ tipo }) {
  const map = {
    success: <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />,
    error:   <AlertCircle  className="h-4 w-4 text-red-500   dark:text-red-400   flex-shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />,
    info:    <Info          className="h-4 w-4 text-blue-500  dark:text-blue-400  flex-shrink-0" />,
  }
  return map[tipo] || map.info
}

/* ── Tiempo relativo ── */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora mismo'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

const CATEGORIA_LABELS = {
  sistema:       'Sistema',
  produccion:    'Producción',
  mortalidad:    'Mortalidad',
  recordatorio:  'Recordatorio',
}

/* ── Panel de notificaciones ── */
function NotificationPanel({ onClose }) {
  const { notifications, markRead, markAllRead, clearAll, unreadCount } = useNotifications()
  const { config } = useConfig()
  const notifHabilitadas = config.notificaciones?.habilitadas !== false

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 z-30 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-stone-600 dark:text-stone-400" />
          <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-500 text-white text-[11px] font-bold tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Eliminar todas las notificaciones"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Aviso si notificaciones desactivadas */}
      {!notifHabilitadas && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
          <BellOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Las notificaciones están desactivadas. <Link to="/dashboard/configuracion" onClick={onClose} className="underline">Configurar</Link></span>
        </div>
      )}

      {/* Lista */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="h-6 w-6 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Sin notificaciones</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Las alertas y confirmaciones aparecerán aquí.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {notifications.map(n => (
              <li
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  n.leida
                    ? 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    : 'bg-primary-50/40 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
              >
                <div className="mt-0.5">
                  <NotifIcon tipo={n.tipo} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {n.titulo && (
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 truncate">{n.titulo}</p>
                      )}
                      <p className={`text-xs leading-snug ${n.titulo ? 'text-stone-500 dark:text-stone-400' : 'text-stone-700 dark:text-stone-200 font-medium'}`}>
                        {n.mensaje}
                      </p>
                    </div>
                    {!n.leida && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500">{timeAgo(n.timestamp)}</span>
                    {n.categoria && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-full">
                        {CATEGORIA_LABELS[n.categoria] || n.categoria}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-stone-100 dark:border-stone-800 px-4 py-2.5">
        <Link
          to="/dashboard/configuracion"
          onClick={onClose}
          className="text-xs text-stone-400 dark:text-stone-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          Configurar notificaciones →
        </Link>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   HEADER PRINCIPAL
═══════════════════════════════════════════════ */
export default function Header({ title, onMenuToggle }) {
  const { perfil, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [userOpen, setUserOpen]   = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  /* Click fuera cierra el panel de notificaciones */
  useEffect(() => {
    if (!notifOpen) return
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  async function handleSignOut() {
    setUserOpen(false)
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

        {/* ── Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(v => !v); setUserOpen(false) }}
            className="relative p-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Notificaciones"
            aria-expanded={notifOpen}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* ── User menu ── */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false) }}
            aria-expanded={userOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white select-none">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-stone-700 dark:text-stone-300 max-w-[120px] truncate">
              {perfil?.nombre_completo?.split(' ')[0] || '—'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {userOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-20 overflow-hidden">
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
                  onClick={() => setUserOpen(false)}
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
