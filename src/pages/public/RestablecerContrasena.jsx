import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Bird } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

export default function RestablecerContrasena() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm({
    resolver: zodResolver(schema),
  })

  const password = watch('password', '')
  const confirm = watch('confirm', '')

  async function onSubmit({ password }) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Error al actualizar la contraseña. El enlace puede haber expirado.')
    } else {
      toast.success('Contraseña actualizada correctamente')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-farm-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bird className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Nueva contraseña</h1>
          <p className="text-stone-500 text-sm mt-1">Mínimo 8 caracteres</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
          <div>
            <label className="label">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className={`input-base pr-10 ${errors.password ? 'input-error' : ''}`}
                {...register('password')}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="error-msg">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirmar contraseña</label>
            <input
              type={showPass ? 'text' : 'password'}
              className={`input-base ${errors.confirm ? 'input-error' : ''}`}
              {...register('confirm')}
            />
            {errors.confirm && <p className="error-msg">{errors.confirm.message}</p>}
            {confirm && password === confirm && !errors.confirm && (
              <p className="text-green-600 text-xs mt-1">✓ Las contraseñas coinciden</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Guardar nueva contraseña
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-stone-500 hover:text-stone-700">← Volver al login</Link>
        </div>
      </div>
    </div>
  )
}
