import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../lib/utils'
import { registrarEvento } from '../../lib/auditoria'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  Eye, EyeOff, User, Lock, Info, CheckCircle2, AlertCircle,
  Mail, Calendar, Shield, Activity, Clock,
} from 'lucide-react'

const infoSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email: z.string().email('Correo electrónico inválido'),
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

function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2.5">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  )
}

function translateAuthError(msg) {
  const m = (msg || '').toLowerCase()
  if (
    m.includes('already registered') ||
    m.includes('already in use') ||
    m.includes('already been registered') ||
    m.includes('email address')
  ) return 'Este correo ya está registrado en el sistema'
  return msg
}

export default function Perfil() {
  const { perfil, session, signOut, refreshPerfil } = useAuth()
  const navigate = useNavigate()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const initials = perfil?.nombre_completo
    ?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const rolConfig = perfil?.rol === 'administrador'
    ? {
        label: 'Administrador',
        gradient: 'from-violet-500 to-violet-700',
        badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
      }
    : {
        label: 'Encargado',
        gradient: 'from-primary-500 to-primary-700',
        badge: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800',
      }

  /* ── Emails existentes para validación en tiempo real ── */
  const { data: emailsExistentes } = useQuery({
    queryKey: ['perfiles-emails'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('id, email')
      return data || []
    },
  })

  const infoForm = useForm({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      nombre_completo: perfil?.nombre_completo || '',
      email: perfil?.email || '',
    },
  })

  const emailValue = infoForm.watch('email')

  const emailDuplicado = useMemo(() => {
    const valor = (emailValue || '').trim().toLowerCase()
    if (!valor || !emailsExistentes?.length) return ''
    const existe = emailsExistentes.find(
      p => p.email?.toLowerCase() === valor && p.id !== session?.user?.id
    )
    return existe ? 'Este correo ya está registrado en el sistema' : ''
  }, [emailValue, emailsExistentes, session?.user?.id])

  const passForm = useForm({ resolver: zodResolver(passSchema) })

  const infoMutation = useMutation({
    mutationFn: async (values) => {
      const emailNorm = values.email.trim().toLowerCase()
      const conflicto = (emailsExistentes || []).find(
        p => p.email?.toLowerCase() === emailNorm && p.id !== session?.user?.id
      )
      if (conflicto) throw new Error('Este correo ya está registrado en el sistema')

      const { error: authError } = await supabase.auth.updateUser({ email: values.email })
      if (authError) throw new Error(translateAuthError(authError.message))

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
    onSuccess: () => {
      registrarEvento({
        operacion: 'PASSWORD_CHANGE',
        usuario_id: session?.user?.id,
        usuario_nombre: perfil?.nombre_completo,
        descripcion: 'Cambio de contraseña desde perfil propio',
      })
      passForm.reset()
      toast.success('Contraseña actualizada correctamente')
      setTimeout(async () => {
        await signOut()
        navigate('/login', { replace: true })
      }, 1000)
    },
    onError: e => toast.error(e.message),
  })

  const passNueva = passForm.watch('password_nueva', '')
  const passConfirm = passForm.watch('password_confirm', '')

  const requisitos = [
    { label: 'Mínimo 8 caracteres',    ok: passNueva.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(passNueva) },
    { label: 'Al menos una minúscula', ok: /[a-z]/.test(passNueva) },
    { label: 'Al menos un número',     ok: /[0-9]/.test(passNueva) },
  ]
  const cumplidos = requisitos.filter(r => r.ok).length
  const fortaleza = cumplidos <= 1
    ? { label: 'Débil',   color: 'bg-red-400',     text: 'text-red-500 dark:text-red-400' }
    : cumplidos === 2
    ? { label: 'Regular', color: 'bg-orange-400',  text: 'text-orange-500 dark:text-orange-400' }
    : cumplidos === 3
    ? { label: 'Buena',   color: 'bg-yellow-400',  text: 'text-yellow-600 dark:text-yellow-400' }
    : { label: 'Fuerte',  color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Mi perfil"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mi perfil' },
        ]}
      />

      {/* Tarjeta de perfil */}
      <div className="card overflow-hidden">
        {/* Banner de color según rol */}
        <div className={`h-28 bg-gradient-to-br ${rolConfig.gradient} relative`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        </div>
        {/* Contenido solapado con el banner */}
        <div className="px-6 pb-6 relative">
          <div className="flex items-end gap-4 -mt-11 mb-4">
            <div className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-white dark:bg-stone-900 p-1 shadow-lg ring-4 ring-white dark:ring-stone-900 flex-shrink-0">
              <div className={`w-full h-full rounded-xl bg-gradient-to-br ${rolConfig.gradient} flex items-center justify-center`}>
                <span className="text-white font-black text-2xl select-none">{initials}</span>
              </div>
            </div>
            <div className="pb-1 min-w-0">
              <h3 className="font-bold text-stone-900 dark:text-stone-50 text-xl leading-tight truncate">
                {perfil?.nombre_completo || '—'}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                {perfil?.email || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${rolConfig.badge}`}>
              <Shield className="h-3 w-3" />
              {rolConfig.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
              perfil?.estado === 'activo'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
            }`}>
              <Activity className="h-3 w-3" />
              {perfil?.estado === 'activo' ? 'Activo' : 'Inactivo'}
            </span>
            {perfil?.created_at && (
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                <Calendar className="h-3 w-3" />
                Miembro desde {formatDate(perfil.created_at)}
              </span>
            )}
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
            error={infoForm.formState.errors.email?.message || emailDuplicado}
            {...infoForm.register('email')}
          />
          {infoMutation.isError && <ErrorBanner message={infoMutation.error?.message} />}
          <div className="pt-1">
            <Button type="submit" loading={infoMutation.isPending} disabled={!!emailDuplicado}>
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
                aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passForm.formState.errors.password_nueva && (
              <p className="error-msg">{passForm.formState.errors.password_nueva.message}</p>
            )}
            {passNueva.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {/* Barra de fortaleza */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < cumplidos ? fortaleza.color : 'bg-stone-200 dark:bg-stone-700'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold w-14 text-right ${fortaleza.text}`}>
                    {fortaleza.label}
                  </span>
                </div>
                {/* Requisitos */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {requisitos.map(({ label, ok }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      {ok
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        : <div className="h-3 w-3 rounded-full border-2 border-stone-300 dark:border-stone-600 flex-shrink-0" />
                      }
                      <span className={`text-xs ${ok ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="pass-confirm" className="label">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                id="pass-confirm"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                className={`input-base pr-10 ${passForm.formState.errors.password_confirm ? 'input-error' : ''}`}
                {...passForm.register('password_confirm')}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passForm.formState.errors.password_confirm && (
              <p className="error-msg">{passForm.formState.errors.password_confirm.message}</p>
            )}
            {passConfirm && !passForm.formState.errors.password_confirm && (
              <p className={`text-xs flex items-center gap-1.5 ${passNueva === passConfirm ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {passNueva === passConfirm
                  ? <><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Las contraseñas coinciden</>
                  : <><AlertCircle  className="h-3.5 w-3.5 flex-shrink-0" /> Las contraseñas no coinciden</>
                }
              </p>
            )}
          </div>

          {passMutation.isError && <ErrorBanner message={passMutation.error?.message} />}

          <div className="pt-1">
            <Button type="submit" loading={passMutation.isPending}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Información de la cuenta */}
      <SectionCard icon={Info} title="Información de la cuenta" gradient="from-stone-400 to-stone-600">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Calendar, label: 'Fecha de creación', value: formatDate(perfil?.created_at) },
            { icon: Clock,    label: 'Último acceso',     value: formatDate(perfil?.ultimo_acceso) },
            { icon: Shield,   label: 'Rol',               value: <span className="capitalize">{perfil?.rol}</span> },
            { icon: Activity, label: 'Estado',            value: <span className="capitalize">{perfil?.estado}</span> },
          ].map(({ icon: RowIcon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
              <div className="w-7 h-7 rounded-lg bg-stone-200 dark:bg-stone-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RowIcon className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-400 dark:text-stone-500">{label}</p>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
