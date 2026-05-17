import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bird, ArrowLeft, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useA11y } from '../../context/AccessibilityContext'

const schema = z.object({
  email: z.string().email('Correo inválido'),
})

export default function RecuperarContrasena() {
  const { noMotion } = useA11y()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  async function onSubmit({ email }) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    })
    setSent(true)
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
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
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
            Recuperar contraseña
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Avícola MC · Sistema de Gestión
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl shadow-stone-200/60 dark:shadow-stone-950/60 overflow-hidden">

          {sent ? (
            /* ── Success state ── */
            <div className={`p-8 text-center space-y-4 ${!noMotion ? 'animate-fade-in-up' : ''}`}>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-green-100 dark:ring-green-900/20">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-bold text-stone-900 dark:text-stone-100 text-lg mb-2">
                  Revisa tu correo
                </h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
                  Si <span className="font-semibold text-stone-700 dark:text-stone-300">{getValues('email')}</span> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 text-left">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <span className="font-semibold">Consejo:</span> Revisa también la carpeta de spam o correo no deseado si no lo ves en tu bandeja principal.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-semibold transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Volver al login
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <div className="p-8">
              <div className="mb-6">
                <h2 className="font-bold text-stone-800 dark:text-stone-100 mb-1">
                  Ingresa tu correo electrónico
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Te enviaremos un enlace seguro para que puedas crear una nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Enviar enlace de recuperación
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-6">
          &copy; {new Date().getFullYear()} Sistema de Gestión Avícola MC
        </p>
      </main>
    </div>
  )
}
