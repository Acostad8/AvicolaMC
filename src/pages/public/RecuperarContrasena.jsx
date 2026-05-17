import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bird, ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email('Correo inválido'),
})

export default function RecuperarContrasena() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  async function onSubmit({ email }) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    })
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-farm-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Bird className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Recuperar contraseña</h1>
          <p className="text-stone-500 text-sm mt-1">Te enviaremos un enlace de recuperación</p>
        </div>

        {sent ? (
          <div className="card p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-stone-700 text-sm">
              Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
            <Input
              label="Correo electrónico registrado"
              type="email"
              placeholder="correo@ejemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Enviar enlace de recuperación
            </Button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  )
}
