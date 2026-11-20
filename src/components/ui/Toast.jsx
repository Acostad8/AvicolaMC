import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Componente de toast custom con franja de color, icono gradient, título opcional
 * y botón cerrar. Compatible con dark mode.
 */

const CONFIG = {
  success: {
    Icon:   CheckCircle2,
    strip:  'bg-gradient-to-b from-emerald-400 to-emerald-600',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/40',
    accent: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/70 dark:border-emerald-800/50',
    glow:   'shadow-emerald-500/20',
  },
  error: {
    Icon:   XCircle,
    strip:  'bg-gradient-to-b from-red-400 to-red-600',
    iconBg: 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/40',
    accent: 'text-red-700 dark:text-red-300',
    border: 'border-red-200/70 dark:border-red-800/50',
    glow:   'shadow-red-500/20',
  },
  warning: {
    Icon:   AlertTriangle,
    strip:  'bg-gradient-to-b from-amber-400 to-amber-600',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/40',
    accent: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    glow:   'shadow-amber-500/20',
  },
  info: {
    Icon:   Info,
    strip:  'bg-gradient-to-b from-blue-400 to-blue-600',
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/40',
    accent: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/70 dark:border-blue-800/50',
    glow:   'shadow-blue-500/20',
  },
}

export function ToastCard({ t, tipo = 'info', titulo, mensaje }) {
  const cfg = CONFIG[tipo] || CONFIG.info
  const { Icon } = cfg

  return (
    <div
      className={`pointer-events-auto relative flex w-full max-w-sm min-w-[18rem] overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border ${cfg.border} shadow-xl ${cfg.glow} backdrop-blur-sm ${
        t.visible ? 'animate-toast-in' : 'animate-toast-out'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className={`w-1 flex-shrink-0 ${cfg.strip}`} />

      <div className="flex-1 flex items-start gap-3 px-4 py-3.5 pr-9">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${cfg.iconBg}`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {titulo && (
            <p className={`text-sm font-bold leading-tight ${cfg.accent} mb-0.5 break-words`}>
              {titulo}
            </p>
          )}
          <p className="text-sm text-stone-700 dark:text-stone-200 leading-snug break-words">
            {mensaje}
          </p>
        </div>
      </div>

      <button
        onClick={() => toast.dismiss(t.id)}
        className="absolute top-2 right-2 p-1 rounded-lg text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/**
 * Lanza un toast custom.
 * @param {{tipo?: 'success'|'error'|'warning'|'info', titulo?: string, mensaje: string, duration?: number}} opts
 */
export function showToast({ tipo = 'info', titulo, mensaje, duration }) {
  const dur = duration ?? (tipo === 'error' ? 5000 : 3500)
  return toast.custom(
    (t) => <ToastCard t={t} tipo={tipo} titulo={titulo} mensaje={mensaje} />,
    { duration: dur, position: 'top-right' },
  )
}

/**
 * Render function para <Toaster>{renderToast}</Toaster>.
 * Mapea toast.success/error/loading a nuestro ToastCard.
 */
export function renderToast(t) {
  // toast.custom ya devuelve JSX propio
  if (t.type === 'custom') return t.message

  const tipo = t.type === 'success' ? 'success'
             : t.type === 'error'   ? 'error'
             : t.type === 'loading' ? 'info'
             :                        'info'

  const content = typeof t.message === 'string'
    ? t.message
    : (t.message?.props?.children ?? '')

  // Si el mensaje es "Título: texto", separa
  let titulo, mensaje = content
  const idx = typeof content === 'string' ? content.indexOf(': ') : -1
  if (idx > 0 && idx < 40) {
    titulo  = content.slice(0, idx)
    mensaje = content.slice(idx + 2)
  }

  return <ToastCard t={t} tipo={tipo} titulo={titulo} mensaje={mensaje || content} />
}
