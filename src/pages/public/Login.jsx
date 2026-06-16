import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Eye, EyeOff, Bird, ArrowLeft, Mail, Lock,
  CheckCircle2, BarChart3, Package, Egg, AlertCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useA11y } from '../../context/AccessibilityContext'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

const FEATURES = [
  { icon: BarChart3, text: 'Reportes en PDF y CSV con un clic' },
  { icon: Egg,       text: 'Control diario de producción de huevos' },
  { icon: Package,   text: 'Alertas automáticas de stock bajo' },
]

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const { noMotion } = useA11y()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  if (!loading && session) return <Navigate to="/dashboard" replace />

  async function onSubmit({ email, password }) {
    setError('')
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.message === 'Tu cuenta está inactiva. Contacta al administrador.') {
        setError('Tu cuenta se encuentra inactiva. Contacta al administrador del sistema.')
      } else {
        setError('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.')
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-farm-cream dark:bg-stone-950 transition-colors duration-300">

      {/* ── Left panel (desktop) ── */}
      <aside
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-900 to-stone-900 flex-col items-center justify-center p-14"
        aria-hidden="true"
      >
        {/* Blobs */}
        {!noMotion && (
          <>
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-blob" />
            <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-orange-600/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-400/10 rounded-full blur-2xl animate-blob animation-delay-4000" />
          </>
        )}

        {/* Dot grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-sm w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-1 ring-white/20">
              <Bird className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="font-bold text-white leading-none">Avícola MC</p>
              <p className="text-xs text-white/50 mt-0.5">Sistema de Gestión</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Gestión avícola<br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
              inteligente y simple
            </span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-10">
            Controla tu granja desde un solo lugar. Producción, mortalidad, insumos y reportes en tiempo real.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-amber-300" />
                </div>
                <span className="text-sm text-white/70">{text}</span>
              </li>
            ))}
          </ul>

          {/* Decorative card */}
          <div className="mt-14 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="fle x gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                ))}
              </div>
              <span className="text-xs text-white/40">Producción de hoy</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Huevos', value: '1,240' },
                { label: 'Postura', value: '94%' },
                { label: 'Galpones', value: '6' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right panel (form) ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-12 relative">

        {/* Back to home */}
        <div className="absolute top-5 left-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Inicio
          </Link>
        </div>

        <div className={`w-full max-w-md ${!noMotion ? 'animate-fade-in-up' : ''}`}>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/25">
              <Bird className="h-7 w-7 text-white" />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500">Sistema de Gestión Avícola MC</p>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
              Bienvenido de vuelta
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl shadow-stone-200/60 dark:shadow-stone-950/60 p-8">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  className={`flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 ${!noMotion ? 'animate-fade-in-up' : ''}`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800/60 border rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.email ? 'border-red-400 dark:border-red-700 focus:ring-red-400' : 'border-stone-200 dark:border-stone-700 focus:ring-primary-500'}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                    Contraseña
                  </label>
                  <Link
                    to="/recuperar-contrasena"
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    ¿Olvidaste la contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={`w-full pl-10 pr-12 py-3 bg-stone-50 dark:bg-stone-800/60 border rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.password ? 'border-red-400 dark:border-red-700 focus:ring-red-400' : 'border-stone-200 dark:border-stone-700 focus:ring-primary-500'}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors p-0.5 rounded"
                  >
                    {showPass
                      ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                      : <Eye className="h-4 w-4" aria-hidden="true" />
                    }
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-primary-400 disabled:to-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ingresando...
                  </>
                ) : (
                  <>
                    <Bird className="h-4 w-4" aria-hidden="true" />
                    Ingresar al sistema
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-6">
            &copy; {new Date().getFullYear()} Sistema de Gestión Avícola MC
          </p>
        </div>
      </main>
    </div>
  )
}
