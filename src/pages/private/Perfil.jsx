import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../lib/utils'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const infoSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
})

const passSchema = z.object({
  password_actual: z.string().min(1, 'Requerido'),
  password_nueva: z.string().min(8, 'Mínimo 8 caracteres'),
  password_confirm: z.string(),
}).refine(d => d.password_nueva === d.password_confirm, { message: 'Las contraseñas no coinciden', path: ['password_confirm'] })

export default function Perfil() {
  const { perfil, session, refreshPerfil } = useAuth()
  const [showPass, setShowPass] = useState(false)

  const infoForm = useForm({ resolver: zodResolver(infoSchema), defaultValues: { nombre_completo: perfil?.nombre_completo || '', email: perfil?.email || '' } })
  const passForm = useForm({ resolver: zodResolver(passSchema) })

  const infoMutation = useMutation({
    mutationFn: async (values) => {
      const { error: authError } = await supabase.auth.updateUser({ email: values.email })
      if (authError) throw authError
      const { error } = await supabase.from('perfiles').update({ nombre_completo: values.nombre_completo, email: values.email }).eq('id', session.user.id)
      if (error) throw error
    },
    onSuccess: () => { refreshPerfil(); toast.success('Perfil actualizado') },
    onError: e => toast.error(e.message),
  })

  const passMutation = useMutation({
    mutationFn: async (values) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: perfil?.email || session?.user?.email, password: values.password_actual })
      if (signInError) throw new Error('La contraseña actual es incorrecta')
      const { error } = await supabase.auth.updateUser({ password: values.password_nueva })
      if (error) throw error
    },
    onSuccess: () => { passForm.reset(); toast.success('Contraseña actualizada correctamente') },
    onError: e => toast.error(e.message),
  })

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Mi perfil"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mi perfil' }]}
      />

      {/* Info personal */}
      <div className="card p-6 space-y-4">
        <h3 className="section-title">Información personal</h3>

        <div className="flex items-center gap-3 pb-2 border-b border-stone-100">
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {perfil?.nombre_completo?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-stone-800">{perfil?.nombre_completo}</p>
            <Badge variant={perfil?.rol === 'administrador' ? 'amber' : 'blue'} className="mt-0.5 capitalize">{perfil?.rol}</Badge>
          </div>
        </div>

        <form onSubmit={infoForm.handleSubmit(v => infoMutation.mutate(v))} className="space-y-4">
          <Input label="Nombre completo" error={infoForm.formState.errors.nombre_completo?.message} {...infoForm.register('nombre_completo')} />
          <Input label="Correo electrónico" type="email" error={infoForm.formState.errors.email?.message} {...infoForm.register('email')} />
          <Button type="submit" loading={infoMutation.isPending}>Guardar cambios</Button>
        </form>
      </div>

      {/* Cambio de contraseña */}
      <div className="card p-6 space-y-4">
        <h3 className="section-title">Cambiar contraseña</h3>
        <form onSubmit={passForm.handleSubmit(v => passMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="label">Contraseña actual</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} className={`input-base pr-10 ${passForm.formState.errors.password_actual ? 'input-error' : ''}`} {...passForm.register('password_actual')} />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passForm.formState.errors.password_actual && <p className="error-msg">{passForm.formState.errors.password_actual.message}</p>}
          </div>
          <Input label="Nueva contraseña (mínimo 8 caracteres)" type="password" error={passForm.formState.errors.password_nueva?.message} {...passForm.register('password_nueva')} />
          <Input label="Confirmar nueva contraseña" type="password" error={passForm.formState.errors.password_confirm?.message} {...passForm.register('password_confirm')} />
          <Button type="submit" loading={passMutation.isPending}>Cambiar contraseña</Button>
        </form>
      </div>

      {/* Info cuenta */}
      <div className="card p-6 space-y-3">
        <h3 className="section-title">Información de la cuenta</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-stone-500">Fecha de creación</p><p className="font-semibold">{formatDate(perfil?.created_at)}</p></div>
          <div><p className="text-xs text-stone-500">Último acceso</p><p className="font-semibold">{formatDate(perfil?.ultimo_acceso)}</p></div>
          <div><p className="text-xs text-stone-500">Rol</p><p className="font-semibold capitalize">{perfil?.rol}</p></div>
          <div><p className="text-xs text-stone-500">Estado</p><p className="font-semibold capitalize">{perfil?.estado}</p></div>
        </div>
      </div>
    </div>
  )
}
