import { useState } from 'react'
import { Accessibility, X, Sun, Moon, Eye, EyeOff } from 'lucide-react'
import { useA11y } from '../../context/AccessibilityContext'

const TEXT_SIZES = [
  { value: 'sm', label: 'A', cls: 'text-xs' },
  { value: 'md', label: 'A', cls: 'text-sm' },
  { value: 'lg', label: 'A', cls: 'text-base' },
  { value: 'xl', label: 'A', cls: 'text-xl' },
]

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false)
  const { dark, setDark, contrast, setContrast, textSize, setTextSize, noMotion, setNoMotion } = useA11y()

  const reset = () => { setDark(false); setContrast(false); setTextSize('md'); setNoMotion(false) }

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-2 right-2 z-50 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="Abrir panel de accesibilidad"
      >
        <Accessibility className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Opciones de accesibilidad"
        aria-modal="true"
        className={`fixed right-0 top-0 h-full w-80 z-50 bg-white dark:bg-stone-900 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-bold text-stone-800 dark:text-stone-100">Accesibilidad</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7">

          {/* Theme */}
          <section aria-labelledby="a11y-theme">
            <p id="a11y-theme" className="text-[11px] font-bold tracking-widest text-stone-400 dark:text-stone-500 uppercase mb-3">Tema de color</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => { setDark(false); setContrast(false) }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${!dark && !contrast ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'}`}
              >
                <Sun className="w-4 h-4" /> Claro
              </button>
              <button
                onClick={() => { setDark(true); setContrast(false) }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${dark && !contrast ? 'border-primary-500 bg-primary-900/20 text-primary-400' : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'}`}
              >
                <Moon className="w-4 h-4" /> Oscuro
              </button>
            </div>
            <button
              onClick={() => setContrast(!contrast)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${contrast ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'}`}
            >
              <Eye className="w-4 h-4" />
              Alto contraste {contrast ? <span className="ml-auto text-xs opacity-60">activo</span> : null}
            </button>
          </section>

          {/* Text size */}
          <section aria-labelledby="a11y-text">
            <p id="a11y-text" className="text-[11px] font-bold tracking-widest text-stone-400 dark:text-stone-500 uppercase mb-3">Tamaño de texto</p>
            <div className="flex gap-2">
              {TEXT_SIZES.map(({ value, label, cls }) => (
                <button
                  key={value}
                  onClick={() => setTextSize(value)}
                  aria-label={`Tamaño ${value}`}
                  aria-pressed={textSize === value}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-bold transition-all ${cls} ${textSize === value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-500 hover:border-stone-300 dark:hover:border-stone-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-stone-400 mt-1.5 px-1">
              <span>Pequeño</span><span>Extra grande</span>
            </div>
          </section>

          {/* Animations toggle */}
          <section aria-labelledby="a11y-motion">
            <p id="a11y-motion" className="text-[11px] font-bold tracking-widest text-stone-400 dark:text-stone-500 uppercase mb-3">Animaciones</p>
            <button
              onClick={() => setNoMotion(!noMotion)}
              role="switch"
              aria-checked={noMotion}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${noMotion ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'}`}
            >
              <span>{noMotion ? 'Desactivadas' : 'Activadas'}</span>
              <div className={`a11y-toggle-switch relative w-11 h-6 rounded-full overflow-hidden transition-colors duration-200 ${noMotion ? 'bg-primary-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${noMotion ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-700">
          <button
            onClick={reset}
            className="w-full py-2 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all"
          >
            Restablecer valores predeterminados
          </button>
        </div>
      </aside>
    </>
  )
}
