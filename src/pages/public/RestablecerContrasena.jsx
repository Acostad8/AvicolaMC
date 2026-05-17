import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Bird, Lock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useA11y } from '../../context/AccessibilityContext'

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

function getStrength(pwd) {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(score, 4)
}

const STRENGTH_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
const STRENGTH_TEXT   = ['', 'text-red-600 dark:text-red-400', 'text-orange-500 dark:text-orange-400', 'text-yellow-600 dark:text-yellow-400', 'text-green-600 dark:text-green-400']

export default function RestablecerContrasena() {
  const { noMotion } = useA11y()
  const navigate = useNavigate()
  const [showPass, setShowPass]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const password = watch('password', '')
  const confirm  = watch('confirm', '')
  const strength = getStrength(password)
  const passwordsMatch = confirm && password === confirm && !errors.confirm

  async function onSubmit({ password }) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Error al actualizar. El enlace puede haber expirado.')
    } else {
      toast.success('¡Contraseña actualizada correctamente!')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-amber-50 via-farm-cream to-orange-50/60 dark:from-stone-950 dark:via-stone-900 dark:to-amber-950/20 transition-colors duration-300 relative overflow-hidden">

      {/* Blobs */}
      {!noMotion && (
        <>
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/40 dark:bg-amber-900/15 rounded-full blur-3xl animate-blob pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-orange-200/30 dark:bg-orange-900/10 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
        </>
      )}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" aria-hidden="true" />

      {/* Back link */}
      <div className="absolute top-5 left-5">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors group"
        >
          <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al login
        </Link>
      </div>

      <main className={`relative w-full max-w-md ${!noMotion ? 'animate-fade-in-up' : ''}`}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/25">
            <Bird className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
            Nueva contraseña
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Avícola MC · Sistema de Gestión
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl shadow-stone-200/60 dark:shadow-stone-950/60 p-8">

          <div className="mb-6">
            <h2 className="font-bold text-stone-800 dark:text-stone-100 mb-1">
              Crea tu nueva contraseña
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Usa al menos 8 caracteres. Combina letras, números y símbolos para mayor seguridad.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby="password-strength password-error"
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

              {/* Strength bar */}
              {password.length > 0 && (
                <div id="password-strength" aria-live="polite">
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-stone-200 dark:bg-stone-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${STRENGTH_TEXT[strength] || 'text-stone-400'}`}>
                    {strength > 0 ? `Seguridad: ${STRENGTH_LABELS[strength]}` : ''}
                  </p>
                </div>
              )}

              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="confirm" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                  className={`w-full pl-10 pr-12 py-3 bg-stone-50 dark:bg-stone-800/60 border rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.confirm ? 'border-red-400 dark:border-red-700 focus:ring-red-400' : passwordsMatch ? 'border-green-400 dark:border-green-700 focus:ring-green-400' : 'border-stone-200 dark:border-stone-700 focus:ring-primary-500'}`}
                  {...register('confirm')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors p-0.5 rounded"
                >
                  {showConfirm
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />
                  }
                </button>
              </div>

              {errors.confirm && (
                <p id="confirm-error" role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  {errors.confirm.message}
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1" aria-live="polite">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  Las contraseñas coinciden
                </p>
              )}
            </div>

            {/* Requisitos */}
            <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-700/50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">La contraseña debe tener:</p>
              <ul className="space-y-1" aria-label="Requisitos de contraseña">
                {[
                  { ok: password.length >= 8,       text: 'Al menos 8 caracteres' },
                  { ok: /[A-Z]/.test(password),     text: 'Una letra mayúscula' },
                  { ok: /[0-9]/.test(password),     text: 'Un número' },
                  { ok: /[^A-Za-z0-9]/.test(password), text: 'Un carácter especial (!@#$...)' },
                ].map(({ ok, text }) => (
                  <li key={text} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'}`}>
                    <CheckCircle2 className={`w-3 h-3 flex-shrink-0 transition-colors ${ok ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'}`} aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-primary-400 disabled:to-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Guardar nueva contraseña
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-6">
          &copy; {new Date().getFullYear()} Sistema de Gestión Avícola MC
        </p>
      </main>
    </div>
  )
}
