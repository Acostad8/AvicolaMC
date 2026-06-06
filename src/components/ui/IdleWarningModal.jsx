import { LogOut } from 'lucide-react'
import Button from './Button'

export function IdleWarningModal({ open, countdown, warningSeconds, onStay, onLogout }) {
  if (!open) return null

  const radius  = 54
  const circ    = 2 * Math.PI * radius
  const ratio   = Math.max(0, countdown) / (warningSeconds || 120)
  const offset  = circ * (1 - ratio)
  const urgent  = countdown <= 30
  const mins    = Math.floor(countdown / 60)
  const secs    = String(countdown % 60).padStart(2, '0')
  const display = `${mins}:${secs}`

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="idle-title"
      aria-describedby="idle-desc"
    >
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-sm w-full p-8 space-y-6 text-center border border-stone-200 dark:border-stone-700">

        {/* Anillo de cuenta regresiva */}
        <div className="flex justify-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              {/* Track */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none" strokeWidth="8"
                className="text-stone-100 dark:text-stone-800"
                stroke="currentColor"
              />
              {/* Progress */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className={`transition-all duration-1000 ${urgent ? 'stroke-red-500' : 'stroke-amber-500'}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
              <span className={`text-4xl font-black tabular-nums leading-none ${
                urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {display}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 font-medium tracking-wide uppercase">
                min
              </span>
            </div>
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h2 id="idle-title" className="text-xl font-black text-stone-900 dark:text-stone-50">
            ¿Sigues ahí?
          </h2>
          <p id="idle-desc" className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            Tu sesión se cerrará automáticamente por inactividad.
            Haz clic en <span className="font-semibold text-stone-700 dark:text-stone-200">Continuar</span> para seguir trabajando.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Button onClick={onStay} className="w-full justify-center">
            Continuar sesión
          </Button>
          <Button
            variant="secondary"
            icon={LogOut}
            onClick={onLogout}
            className="w-full justify-center"
          >
            Cerrar sesión ahora
          </Button>
        </div>
      </div>
    </div>
  )
}
