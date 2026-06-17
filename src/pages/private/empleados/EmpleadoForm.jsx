import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  User, IdCard, Briefcase, Phone, CalendarDays,
  Activity, FileText, CheckCircle2, AlertCircle,
} from 'lucide-react'

const schema = z.object({
  nombre_completo:     z.string().min(1, 'Requerido'),
  documento_identidad: z.string().optional(),
  cargo:               z.string().optional(),
  telefono:            z.string().min(1, 'El teléfono es requerido'),
  fecha_ingreso:       z.string().optional(),
  estado:              z.enum(['activo', 'inactivo']),
  notas:               z.string().optional(),
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

function AvatarInitials({ name }) {
  const initials = (name || '')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('')
  return (
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25 flex-shrink-0">
      <span className="text-white font-black text-lg tracking-wide">{initials || <User className="h-7 w-7 text-white" />}</span>
    </div>
  )
}

function PreviewCard({ nombre, documento, cargo, telefono, fechaIngreso, estado, notas, isEdit, telefonoDuplicado, documentoDuplicado }) {
  const estadoColor = estado === 'activo'
    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'

  const checks = [
    { ok: nombre?.length > 0,                          text: 'Nombre completo' },
    { ok: !!documento && !documentoDuplicado,           text: 'Documento de identidad' },
    { ok: !!cargo,                                     text: 'Cargo definido' },
    { ok: !!telefono && !telefonoDuplicado,             text: 'Teléfono registrado' },
    { ok: !!fechaIngreso,                              text: 'Fecha de ingreso' },
  ]

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Tarjeta del empleado */}
        <div className="rounded-xl border-2 border-primary-200 dark:border-primary-800  dark:bg-primary-950/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <AvatarInitials name={nombre} />
            <div className="min-w-0">
              <p className="font-bold text-stone-800 dark:text-stone-100 text-base leading-tight truncate">
                {nombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Nombre del empleado</span>}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                {cargo || <span className="italic text-xs">Sin cargo definido</span>}
              </p>
            </div>
          </div>

          {estado && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColor}`}>
              <Activity className="h-3 w-3" />
              {estado === 'activo' ? 'Activo' : 'Inactivo'}
            </span>
          )}

          <div className="space-y-1.5">
            {documento && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
                <IdCard className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate tabular-nums">{documento}</p>
              </div>
            )}
            {telefono && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
                <Phone className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{telefono}</p>
              </div>
            )}
            {fechaIngreso && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-700 dark:text-stone-200">
                  Ingreso: {new Date(fechaIngreso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {notas && (
            <p className="text-xs text-stone-500 dark:text-stone-400 italic line-clamp-2 border-t border-stone-100 dark:border-stone-700 pt-2">{notas}</p>
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

export default function EmpleadoForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo' },
  })

  const nombre    = watch('nombre_completo')
  const documento = watch('documento_identidad')
  const cargo     = watch('cargo')
  const telefono  = watch('telefono')
  const fechaIngreso = watch('fecha_ingreso')
  const estado    = watch('estado')
  const notas     = watch('notas')

  const { data: empleado } = useQuery({
    queryKey: ['empleado', id],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  const { data: telefonoDuplicado } = useQuery({
    queryKey: ['empleado-telefono', telefono, id],
    queryFn: async () => {
      let q = supabase.from('empleados').select('id').eq('telefono', telefono.trim())
      if (isEdit) q = q.neq('id', id)
      const { data } = await q.maybeSingle()
      return !!data
    },
    enabled: !!telefono?.trim(),
    staleTime: 30_000,
  })

  const { data: documentoDuplicado } = useQuery({
    queryKey: ['empleado-documento', documento, id],
    queryFn: async () => {
      let q = supabase.from('empleados').select('id').eq('documento_identidad', documento.trim())
      if (isEdit) q = q.neq('id', id)
      const { data } = await q.maybeSingle()
      return !!data
    },
    enabled: !!documento?.trim(),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (empleado) reset({
      nombre_completo:     empleado.nombre_completo,
      documento_identidad: empleado.documento_identidad || '',
      cargo:               empleado.cargo || '',
      telefono:            empleado.telefono || '',
      fecha_ingreso:       empleado.fecha_ingreso || '',
      estado:              empleado.estado,
      notas:               empleado.notas || '',
    })
  }, [empleado, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = { ...values, fecha_ingreso: values.fecha_ingreso || null }
      if (isEdit) {
        const { data, error } = await supabase.from('empleados').update(payload).eq('id', id)
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('empleados').insert(payload).select()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empleados'] })
      toast.success(isEdit ? 'Empleado actualizado' : 'Empleado creado')
      navigate('/dashboard/empleados')
    },
    onError: e => {
      const code = e?.code ?? e?.status ?? ''
      const msg  = [e?.message, e?.details, e?.hint].filter(Boolean).join(' ')
      if (String(code) === '23505' || msg.includes('unique') || msg.includes('idx_empleados_telefono'))
        toast.error('Este número de teléfono ya está registrado en otro empleado')
      else
        toast.error(msg || 'Error al guardar el empleado')
    },
  })

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar empleado' : 'Nuevo empleado'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Empleados', href: '/dashboard/empleados' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="lg:col-span-2 card p-6 space-y-7">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <AvatarInitials name={nombre} />
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar datos del empleado' : 'Registrar nuevo empleado'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {nombre || 'Completa los datos del empleado'}
              </p>
            </div>
          </div>

          {/* ── Identificación ── */}
          <FormSection icon={User} title="Identificación" gradient="from-primary-400 to-primary-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre completo"
                  placeholder="Nombre y apellidos del empleado"
                  error={errors.nombre_completo?.message}
                  {...register('nombre_completo')}
                />
              </div>
              <Input
                label="Documento de identidad (opcional)"
                placeholder="Cédula, NIT…"
                error={documentoDuplicado ? 'Este documento ya está registrado en otro empleado' : undefined}
                {...register('documento_identidad')}
              />
              <Input
                label="Cargo (opcional)"
                placeholder="Ej: Operario, Veterinario…"
                {...register('cargo')}
              />
            </div>
          </FormSection>

          {/* ── Contacto y vinculación ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={Phone} title="Contacto" gradient="from-green-400 to-green-600">
              <Input
                label="Teléfono"
                placeholder="+57 300 000 0000"
                error={telefonoDuplicado ? 'Este número ya está registrado en otro empleado' : errors.telefono?.message}
                {...register('telefono')}
              />
            </FormSection>

            <FormSection icon={CalendarDays} title="Vinculación" gradient="from-blue-400 to-blue-600">
              <Input
                label="Fecha de ingreso (opcional)"
                type="date"
                {...register('fecha_ingreso')}
              />
              <Select
                label="Estado"
                options={[
                  { value: 'activo',   label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' },
                ]}
                {...register('estado')}
              />
            </FormSection>
          </div>

          {/* ── Notas ── */}
          <FormSection icon={FileText} title="Notas" gradient="from-stone-400 to-stone-600">
            <Textarea
              label="Notas adicionales (opcional)"
              placeholder="Observaciones, habilidades, condiciones laborales…"
              rows={3}
              {...register('notas')}
            />
          </FormSection>

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={!!telefonoDuplicado || !!documentoDuplicado}>
              {isEdit ? 'Guardar cambios' : 'Crear empleado'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/empleados')}>
              Cancelar
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          nombre={nombre}
          documento={documento}
          cargo={cargo}
          telefono={telefono}
          fechaIngreso={fechaIngreso}
          estado={estado}
          notas={notas}
          isEdit={isEdit}
          telefonoDuplicado={telefonoDuplicado}
          documentoDuplicado={documentoDuplicado}
        />
      </div>
    </div>
  )
}
