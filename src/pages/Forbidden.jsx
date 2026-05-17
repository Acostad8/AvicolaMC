import { Link } from 'react-router-dom'
import { ShieldOff, ArrowLeft, Home } from 'lucide-react'
import { useA11y } from '../context/AccessibilityContext'

export default function Forbidden() {
  const { noMotion } = useA11y()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-amber-50 via-farm-cream to-orange-50/60 dark:from-stone-950 dark:via-stone-900 dark:to-red-950/10 transition-colors duration-300 relative overflow-hidden">

      {/* Blobs */}
      {!noMotion && (
        <>
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-200/30 dark:bg-red-900/10 rounded-full blur-3xl animate-blob pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-amber-200/30 dark:bg-amber-900/10 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
        </>
      )}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" aria-hidden="true" />

      <main className={`relative text-center max-w-md w-full ${!noMotion ? 'animate-fade-in-up' : ''}`}>

        {/* 403 number */}
        <p className="text-[8rem] md:text-[10rem] font-black leading-none bg-gradient-to-br from-red-300 to-red-500 dark:from-red-700 dark:to-red-900 bg-clip-text text-transparent select-none" aria-hidden="true">
          403
        </p>

        {/* Icon */}
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/50 border-2 border-red-200 dark:border-red-900/60 rounded-3xl flex items-center justify-center mx-auto -mt-4 mb-6 shadow-lg">
          <ShieldOff className="h-10 w-10 text-red-500 dark:text-red-400" aria-hidden="true" />
        </div>

        {/* Text */}
        <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-50 mb-3">
          Acceso denegado
        </h1>
        <p className="text-stone-500 dark:text-stone-400 leading-relaxed mb-8 max-w-sm mx-auto">
          No tienes los permisos necesarios para acceder a esta sección del sistema. Contacta al administrador si crees que esto es un error.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ir al Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-7 py-3 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold hover:bg-stone-50 dark:hover:bg-stone-700 transition-all hover:-translate-y-0.5 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver atrás
          </button>
        </div>
      </main>
    </div>
  )
}
