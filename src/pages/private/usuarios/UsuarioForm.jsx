import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { registrarEvento } from '../../../lib/auditoria'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  User, Mail, Lock, Shield, Activity, Building2,
  UserCog, Check, CheckCircle2, AlertCircle, KeyRound,
} from 'lucide-react'

const createSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email:           z.string().email('Email inválido'),
  password:        z.string().min(8, 'Mínimo 8 caracteres'),
  rol:             z.enum(['administrador', 'encargado']),
  estado:          z.enum(['activo', 'inactivo']),
  empleado_id:     z.string().optional(),
})

const editSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email:           z.string().email('Email inválido'),
  rol:             z.enum(['administrador', 'encargado']),
  estado:          z.enum(['activo', 'inactivo']),
  empleado_id:     z.string().optional(),
})

function FormSection({ icon: Icon, title, gradient, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function AvatarInitials({ name, rol }) {
  const initials = (name || '')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('')
  const gradient = rol === 'administrador'
    ? 'from-violet-400 to-violet-600'
    : 'from-blue-400 to-blue-600'
  return (
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
      <span className="text-white font-black text-lg tracking-wide">{initials || <User className="h-7 w-7 text-white" />}</span>
    </div>
  )
}

function CheckList({ items, selected, onToggle, emptyText }) {
  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
      {items.length === 0 ? (
        <p className="text-stone-400 dark:text-stone-500 text-xs px-4 py-3">{emptyText}</p>
      ) : (
        <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/60 ${selected.includes(item.id) ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${selected.includes(item.id) ? 'bg-primary-500 border-primary-500' : 'border-stone-300 dark:border-stone-600'}`}>
                {selected.includes(item.id) && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className={`text-sm ${selected.includes(item.id) ? 'text-primary-700 dark:text-primary-300 font-medium' : 'text-stone-700 dark:text-stone-300'}`}>
                {item.nombre}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PreviewCard({ nombre, email, rol, estado, galponesSeleccionados, galpones, empleadoNombre, emailDuplicado, isEdit }) {
  const rolConfig = rol === 'administrador'
    ? { label: 'Administrador', bg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800', gradient: 'from-violet-400 to-violet-600' }
    : { label: 'Encargado',     bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',             gradient: 'from-blue-400 to-blue-600' }

  const estadoColor = estado === 'activo'
    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'

  const galponesNombres = (galpones || []).filter(g => galponesSeleccionados.includes(g.id)).map(g => g.nombre)

  const checks = [
    { ok: nombre?.length > 0,   text: 'Nombre completo' },
    { ok: !!email && !emailDuplicado, text: 'Correo único y válido' },
    { ok: !!rol,                text: 'Rol asignado' },
    ...(rol === 'encargado' ? [{ ok: galponesSeleccionados.length > 0, text: 'Galpones asignados' }] : []),
  ]

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className={`w-7 h-7 bg-gradient-to-br ${rolConfig.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <UserCog className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Tarjeta del usuario */}
        <div className={`rounded-xl border-2 p-4 space-y-3 ${rol === 'administrador' ? 'border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20' : 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'}`}>
          <div className="flex items-center gap-3">
            <AvatarInitials name={nombre} rol={rol} />
            <div className="min-w-0">
              <p className="font-bold text-stone-800 dark:text-stone-100 text-base leading-tight truncate">
                {nombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Nombre del usuario</span>}
              </p>
              {empleadoNombre && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{empleadoNombre}</p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {rol && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${rolConfig.bg}`}>
                <Shield className="h-3 w-3" />
                {rolConfig.label}
              </span>
            )}
            {estado && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColor}`}>
                <Activity className="h-3 w-3" />
                {estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            )}
          </div>

          {/* Email */}
          {email && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${emailDuplicado ? 'bg-red-50 dark:bg-red-950/30' : 'bg-white/60 dark:bg-stone-800/60'}`}>
              <Mail className={`h-3.5 w-3.5 flex-shrink-0 ${emailDuplicado ? 'text-red-400' : 'text-stone-400'}`} />
              <p className={`text-sm truncate ${emailDuplicado ? 'text-red-600 dark:text-red-400' : 'text-stone-700 dark:text-stone-200'}`}>{email}</p>
              {emailDuplicado && <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
            </div>
          )}

          {/* Galpones (encargado) */}
          {rol === 'encargado' && (
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Galpones asignados</p>
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-0.5">{galponesSeleccionados.length}</p>
              {galponesNombres.length > 0 && (
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {galponesNombres.slice(0, 3).join(', ')}{galponesNombres.length > 3 ? ` +${galponesNombres.length - 3}` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Completado</p>
          <div className="space-y-1.5">
            {checks.map(({ ok, text }) => (
              <div key={text} className="flex items-center gap-2">
                {ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  : <AlertCircle  className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                }
                <span className={`text-xs ${ok ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-600'}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UsuarioForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { perfil: currentUser } = useAuth()
  const qc = useQueryClient()

  const schema = isEdit ? editSchema : createSchema
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'encargado', estado: 'activo' },
  })

  const rolWatch    = watch('rol')
  const emailValue  = watch('email')
  const nombre      = watch('nombre_completo')
  const estado      = watch('estado')
  const empleadoId  = watch('empleado_id')

  const [selectedGalpones, setSelectedGalpones] = useState([])

  /* ── Empleados disponibles ── */
  const { data: empleados } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo')
      return data || []
    },
  })

  /* ── Emails existentes (validación duplicado) ── */
  const { data: emailsExistentes } = useQuery({
    queryKey: ['perfiles-emails'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('id, email')
      return data || []
    },
  })

  /* ── Perfiles con empleado vinculado ── */
  const { data: perfilesConEmpleado } = useQuery({
    queryKey: ['perfiles-empleados'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('id, empleado_id').not('empleado_id', 'is', null)
      return data || []
    },
  })

  const empleadosOcupados    = new Set((perfilesConEmpleado || []).filter(p => !isEdit || p.id !== id).map(p => p.empleado_id))
  const empleadosDisponibles = (empleados || []).filter(e => !empleadosOcupados.has(e.id))

  const emailDuplicado = useMemo(() => {
    const valor = (emailValue || '').trim().toLowerCase()
    if (!valor || !emailsExistentes?.length) return ''
    const existe = emailsExistentes.find(p => p.email?.toLowerCase() === valor && p.id !== id)
    return existe ? 'Este correo ya está registrado en el sistema' : ''
  }, [emailValue, emailsExistentes, id])

  /* ── Galpones ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-todos'],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  /* ── Usuario (edición) ── */
  const { data: usuario } = useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  const { data: galponesAsignados } = useQuery({
    queryKey: ['galpones-encargado', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id').eq('encargado_id', id)
      return (data || []).map(g => g.id)
    },
    enabled: isEdit,
  })

  useEffect(() => { if (galponesAsignados) setSelectedGalpones(galponesAsignados) }, [galponesAsignados])
  useEffect(() => {
    if (usuario) reset({
      nombre_completo: usuario.nombre_completo, email: usuario.email || '',
      rol: usuario.rol, estado: usuario.estado, empleado_id: usuario.empleado_id || '',
    })
  }, [usuario, reset])

  const empleadoNombre = empleadosDisponibles.find(e => e.id === empleadoId)?.nombre_completo
    || (isEdit && empleados?.find(e => e.id === (usuario?.empleado_id))?.nombre_completo)

  const mutation = useMutation({
    mutationFn: async (values) => {
      const emailNorm = values.email.trim().toLowerCase()
      const conflicto = (emailsExistentes || []).find(p => p.email?.toLowerCase() === emailNorm && p.id !== id)
      if (conflicto) throw new Error('Este correo ya está registrado en el sistema')

      if (isEdit) {
        if (id === currentUser?.id && values.estado === 'inactivo') throw new Error('No puedes desactivarte a ti mismo')
        if (id === currentUser?.id && values.rol !== 'administrador') throw new Error('No puedes quitarte el rol de administrador')

        const { error } = await supabase.from('perfiles').update({
          nombre_completo: values.nombre_completo, email: values.email,
          rol: values.rol, estado: values.estado, empleado_id: values.empleado_id || null,
        }).eq('id', id)
        if (error) throw error

        if (values.rol === 'encargado') {
          await supabase.from('galpones').update({ encargado_id: null }).eq('encargado_id', id)
          if (selectedGalpones.length > 0) {
            await supabase.from('galpones').update({ encargado_id: id }).in('id', selectedGalpones)
          }
        }
      } else {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('super-api', {
          body: { email: values.email, password: values.password },
        })
        if (fnError) throw fnError
        if (fnData?.error) throw new Error(fnData.error)

        const { error } = await supabase.from('perfiles').insert({
          id: fnData.user.id, nombre_completo: values.nombre_completo,
          email: values.email, rol: values.rol, estado: values.estado,
          empleado_id: values.empleado_id || null,
        })
        if (error) throw error

        if (values.rol === 'encargado' && selectedGalpones.length > 0) {
          await supabase.from('galpones').update({ encargado_id: fnData.user.id }).in('id', selectedGalpones)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['usuarios'])
      qc.invalidateQueries(['galpones'])
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
      navigate('/dashboard/usuarios')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  function toggleGalpon(galponId) {
    setSelectedGalpones(prev => prev.includes(galponId) ? prev.filter(x => x !== galponId) : [...prev, galponId])
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Usuarios', href: '/dashboard/usuarios' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="lg:col-span-2 card p-6 space-y-7">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <AvatarInitials name={nombre} rol={rolWatch} />
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar cuenta de usuario' : 'Crear nueva cuenta de usuario'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {nombre || 'Completa los datos de la cuenta'}
              </p>
            </div>
          </div>

          {/* ── Credenciales ── */}
          <FormSection icon={Mail} title="Credenciales" gradient="from-blue-400 to-blue-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre completo"
                  placeholder="Nombre y apellidos"
                  error={errors.nombre_completo?.message}
                  {...register('nombre_completo')}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  error={errors.email?.message || emailDuplicado}
                  {...register('email')}
                />
              </div>
              {!isEdit && (
                <div className="sm:col-span-2">
                  <Input
                    label="Contraseña temporal"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>
              )}
            </div>
          </FormSection>

          {/* ── Rol, estado y empleado ── */}
          <FormSection icon={Shield} title="Rol y acceso" gradient={rolWatch === 'administrador' ? 'from-violet-400 to-violet-600' : 'from-blue-400 to-blue-600'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Rol del sistema"
                options={[
                  { value: 'administrador', label: 'Administrador — acceso total' },
                  { value: 'encargado',     label: 'Encargado — acceso limitado' },
                ]}
                error={errors.rol?.message}
                {...register('rol')}
              />
              <Select
                label="Estado de la cuenta"
                options={[
                  { value: 'activo',   label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' },
                ]}
                error={errors.estado?.message}
                {...register('estado')}
              />
              <div className="sm:col-span-2">
                <Select
                  label="Empleado vinculado (opcional)"
                  options={[
                    { value: '', label: 'Sin vincular' },
                    ...empleadosDisponibles.map(e => ({ value: e.id, label: e.nombre_completo })),
                  ]}
                  {...register('empleado_id')}
                />
              </div>
            </div>
          </FormSection>

          {/* ── Galpones asignados (solo encargado) ── */}
          {rolWatch === 'encargado' && (
            <FormSection icon={Building2} title={`Galpones asignados (${selectedGalpones.length})`} gradient="from-emerald-400 to-emerald-600">
              <CheckList
                items={galpones || []}
                selected={selectedGalpones}
                onToggle={toggleGalpon}
                emptyText="No hay galpones activos registrados"
              />
            </FormSection>
          )}

          {/* ── Restablecer contraseña (solo edición) ── */}
          {isEdit && (
            <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-stone-400" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Seguridad</p>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Envía un enlace al correo del usuario para que restablezca su contraseña.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(usuario?.email)
                  if (!error) {
                    toast.success('Enlace de restablecimiento enviado al correo')
                    registrarEvento({
                      operacion: 'RESET_PASSWORD',
                      registro_id: id,
                      usuario_id: currentUser?.id,
                      usuario_nombre: currentUser?.nombre_completo,
                      descripcion: `Enlace de restablecimiento enviado a ${usuario?.email}`,
                      datos_nuevos: { email_destino: usuario?.email },
                    })
                  } else {
                    toast.error('Error al enviar enlace')
                  }
                }}
              >
                Enviar enlace de restablecimiento
              </Button>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="submit"
              loading={mutation.isPending || isSubmitting}
              disabled={!!emailDuplicado}
            >
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/usuarios')}>
              Cancelar
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          nombre={nombre}
          email={emailValue}
          rol={rolWatch}
          estado={estado}
          galponesSeleccionados={selectedGalpones}
          galpones={galpones}
          empleadoNombre={empleadoNombre}
          emailDuplicado={emailDuplicado}
          isEdit={isEdit}
        />
      </div>
    </div>
  )
}
