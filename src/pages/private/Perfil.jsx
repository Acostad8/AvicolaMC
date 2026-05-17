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
import { Eye, EyeOff, User, Lock, Info, CheckCircle2, AlertCircle } from 'lucide-react'

const infoSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
})

const passSchema = z.object({
  password_actual: z.string().min(1, 'Requerido'),
  password_nueva: z.string().min(8, 'Mínimo 8 caracteres'),
  password_confirm: z.string(),
}).refine(d => d.password_nueva === d.password_confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['password_confirm'],
})

function SectionCard({ icon: Icon, title, children, gradient }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100 dark:border-stone-800">
        <div className={`w-8 h-8 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function Perfil() {
  const { perfil, session, refreshPerfil } = useAuth()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const initials = perfil?.nombre_completo
    ?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const infoForm = useForm({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      nombre_completo: perfil?.nombre_completo || '',
      email: perfil?.email || '',
    },
  })

  const passForm = useForm({ resolver: zodResolver(passSchema) })

  const infoMutation = useMutation({
    mutationFn: async (values) => {
      const { error: authError } = await supabase.auth.updateUser({ email: values.email })
      if (authError) throw authError
      const { error } = await supabase.from('perfiles')
        .update({ nombre_completo: values.nombre_completo, email: values.email })
        .eq('id', session.user.id)
      if (error) throw error
    },
    onSuccess: () => { refreshPerfil(); toast.success('Perfil actualizado correctamente') },
    onError: e => toast.error(e.message),
  })

  const passMutation = useMutation({
    mutationFn: async (values) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: perfil?.email || session?.user?.email,
        password: values.password_actual,
      })
      if (signInError) throw new Error('La contraseña actual es incorrecta')
      const { error } = await supabase.auth.updateUser({ password: values.password_nueva })
      if (error) throw error
    },
    onSuccess: () => { passForm.reset(); toast.success('Contraseña actualizada correctamente') },
    onError: e => toast.error(e.message),
  })

  const passNueva = passForm.watch('password_nueva', '')
  const passConfirm = passForm.watch('password_confirm', '')

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Mi perfil"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mi perfil' },
        ]}
      />

      {/* Avatar card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25 flex-shrink-0">
            <span className="text-white font-black text-xl select-none">{initials}</span>
          </div>
          <div>
            <p className="font-bold text-stone-900 dark:text-stone-50 text-lg leading-tight">
              {perfil?.nombre_completo || '—'}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {perfil?.email || '—'}
            </p>
            <div className="mt-2">
              <Badge variant={perfil?.rol === 'administrador' ? 'amber' : 'blue'} className="capitalize">
                {perfil?.rol || '—'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Información personal */}
      <SectionCard icon={User} title="Información personal" gradient="from-blue-400 to-blue-600">
        <form onSubmit={infoForm.handleSubmit(v => infoMutation.mutate(v))} className="space-y-4">
          <Input
            label="Nombre completo"
            placeholder="Tu nombre completo"
            error={infoForm.formState.errors.nombre_completo?.message}
            {...infoForm.register('nombre_completo')}
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="correo@ejemplo.com"
            error={infoForm.formState.errors.email?.message}
            {...infoForm.register('email')}
          />
          {infoMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {infoMutation.error?.message}
            </div>
          )}
          <div className="pt-1">
            <Button type="submit" loading={infoMutation.isPending}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Cambiar contraseña */}
      <SectionCard icon={Lock} title="Cambiar contraseña" gradient="from-primary-500 to-primary-700">
        <form onSubmit={passForm.handleSubmit(v => passMutation.mutate(v))} className="space-y-4">
          {/* Contraseña actual */}
          <div className="space-y-1.5">
            <label htmlFor="pass-actual" className="label">Contraseña actual</label>
            <div className="relative">
              <input
                id="pass-actual"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                className={`input-base pr-10 ${passForm.formState.errors.password_actual ? 'input-error' : ''}`}
                {...passForm.register('password_actual')}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                aria-label={showCurrent ? 'Ocultar' : 'Mostrar'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passForm.formState.errors.password_actual && (
              <p className="error-msg">{passForm.formState.errors.password_actual.message}</p>
            )}
          </div>

          {/* Nueva contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="pass-nueva" className="label">Nueva contraseña</label>
            <div className="relative">
              <input
                id="pass-nueva"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={`input-base pr-10 ${passForm.formState.errors.password_nueva ? 'input-error' : ''}`}
                {...passForm.register('password_nueva')}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                aria-label={showNew ? 'Ocultar' : 'Mostrar'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passForm.formState.errors.password_nueva && (
              <p className="error-msg">{passForm.formState.errors.password_nueva.message}</p>
            )}
          </div>

          <Input
            label="Confirmar nueva contraseña"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repite la nueva contraseña"
            error={passForm.formState.errors.password_confirm?.message}
            {...passForm.register('password_confirm')}
          />

          {passConfirm && passNueva === passConfirm && !passForm.formState.errors.password_confirm && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Las contraseñas coinciden
            </p>
          )}

          {passMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {passMutation.error?.message}
            </div>
          )}

          <div className="pt-1">
            <Button type="submit" loading={passMutation.isPending}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Info de cuenta */}
      <SectionCard icon={Info} title="Información de la cuenta" gradient="from-stone-400 to-stone-600">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {[
            { label: 'Fecha de creación', value: formatDate(perfil?.created_at) },
            { label: 'Último acceso',     value: formatDate(perfil?.ultimo_acceso) },
            { label: 'Rol',               value: <span className="capitalize">{perfil?.rol}</span> },
            { label: 'Estado',            value: <span className="capitalize">{perfil?.estado}</span> },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="detail-label">{label}</dt>
              <dd className="detail-value">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  )
}
