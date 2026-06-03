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
import { Building2, Users, FileText, Settings2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Skeleton } from '../../../components/ui/Skeleton'

const schema = z.object({
  nombre:           z.string().min(1, 'El nombre es requerido'),
  capacidad_maxima: z.coerce.number().int().positive('Debe ser un número positivo'),
  descripcion:      z.string().optional(),
  estado:           z.enum(['activo', 'inactivo']),
  encargado_id:     z.string().optional(),
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

function PreviewCard({ nombre, capacidad, descripcion, estado, encargadoNombre, isEdit }) {
  const estadoConfig = estado === 'activo'
    ? { icon: CheckCircle2, label: 'Activo', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' }
    : { icon: XCircle,      label: 'Inactivo', color: 'text-red-500 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' }

  const EstadoIcon = estadoConfig.icon

  return (
    <div className="card p-5 space-y-5 h-fit">
      {/* Preview header */}
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="h-3.5 w-3.5 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
      </div>

      {/* Galpon card preview */}
      <div className={`rounded-xl border-2 p-4 space-y-3 transition-all duration-300 ${isEdit ? 'border-primary-300 dark:border-primary-700  dark:bg-primary-950/20' : 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${isEdit ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${estadoConfig.bg} ${estadoConfig.color} flex items-center gap-1`}>
            <EstadoIcon className="h-3 w-3" />
            {estadoConfig.label}
          </span>
        </div>

        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-base leading-tight">
            {nombre || <span className="text-stone-400 dark:text-stone-600 italic font-normal">Nombre del galpón</span>}
          </p>
          {descripcion
            ? <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">{descripcion}</p>
            : <p className="text-xs text-stone-400 dark:text-stone-600 mt-1 italic">Sin descripción</p>
          }
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 dark:text-stone-500">Capacidad</p>
            <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mt-0.5">
              {capacidad > 0 ? Number(capacidad).toLocaleString('es-CO') : '—'}
            </p>
            {capacidad > 0 && <p className="text-xs text-stone-400 dark:text-stone-500">aves</p>}
          </div>
          <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 dark:text-stone-500">Encargado</p>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5 truncate">
              {encargadoNombre || <span className="font-normal text-stone-400 italic">Sin asignar</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Sugerencias</p>
        <div className="space-y-2">
          {[
            { ok: nombre?.length > 0,    text: 'Nombre del galpón ingresado' },
            { ok: capacidad > 0,          text: 'Capacidad máxima definida' },
            { ok: !!encargadoNombre,      text: 'Encargado asignado' },
            { ok: descripcion?.length > 0, text: 'Descripción agregada' },
          ].map(({ ok, text }) => (
            <div key={text} className="flex items-center gap-2">
              {ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                : <AlertCircle  className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
              }
              <span className={`text-xs ${ok ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-600'}`}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GalponForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', encargado_id: '' },
  })

  const capacidad     = watch('capacidad_maxima')
  const nombre        = watch('nombre')
  const descripcion   = watch('descripcion')
  const estado        = watch('estado')
  const encargadoId   = watch('encargado_id')

  const { data: encargados } = useQuery({
    queryKey: ['encargados-list'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles')
        .select('id, nombre_completo').eq('rol', 'encargado').eq('estado', 'activo').order('nombre_completo')
      return data || []
    },
  })

  const { data: galpon, isLoading: loadingGalpon } = useQuery({
    queryKey: ['galpon', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (galpon) reset({
      nombre:           galpon.nombre,
      capacidad_maxima: galpon.capacidad_maxima,
      descripcion:      galpon.descripcion || '',
      estado:           galpon.estado,
      encargado_id:     galpon.encargado_id || '',
    })
  }, [galpon, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = { ...values, encargado_id: values.encargado_id || null }
      if (isEdit) {
        const { error } = await supabase.from('galpones').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('galpones').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['galpones'])
      toast.success(isEdit ? 'Galpón actualizado correctamente' : 'Galpón creado correctamente')
      navigate('/dashboard/galpones')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  const encargadoNombre = encargados?.find(e => e.id === encargadoId)?.nombre_completo || ''

  if (isEdit && loadingGalpon) return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="card p-6 space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={isEdit ? `Editar: ${galpon?.nombre || '…'}` : 'Nuevo galpón'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Galpones', href: '/dashboard/galpones' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left / main form ── */}
        <form
          onSubmit={handleSubmit(v => mutation.mutate(v))}
          className="lg:col-span-2 card p-6 space-y-7"
        >
          {/* Form header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${isEdit ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
              <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar galpón' : 'Crear nuevo galpón'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {nombre || 'Completa los campos para continuar'}
              </p>
            </div>
          </div>

          {/* Basic info */}
          <FormSection icon={FileText} title="Información básica" gradient="from-amber-400 to-amber-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre del galpón"
                  placeholder="Ej: Galpón A, Galpón Norte…"
                  error={errors.nombre?.message}
                  {...register('nombre')}
                />
              </div>
              <div>
                <Input
                  label="Capacidad máxima de aves"
                  type="number"
                  min="1"
                  placeholder="Ej: 5000"
                  error={errors.capacidad_maxima?.message}
                  {...register('capacidad_maxima')}
                />
                {capacidad > 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5">
                    Total: <span className="font-semibold text-stone-600 dark:text-stone-300">{Number(capacidad).toLocaleString('es-CO')} aves</span>
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Descripción o notas (opcional)"
                  placeholder="Ubicación, características especiales, observaciones…"
                  rows={3}
                  {...register('descripcion')}
                />
              </div>
            </div>
          </FormSection>

          {/* Config + Assignment in a 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={Settings2} title="Configuración" gradient="from-blue-400 to-blue-600">
              <Select
                label="Estado del galpón"
                options={[
                  { value: 'activo',   label: 'Activo — disponible para producción' },
                  { value: 'inactivo', label: 'Inactivo — fuera de operación' },
                ]}
                error={errors.estado?.message}
                {...register('estado')}
              />
            </FormSection>

            <FormSection icon={Users} title="Encargado" gradient="from-green-400 to-green-600">
              <Select
                label="Encargado asignado"
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...(encargados || []).map(e => ({ value: e.id, label: e.nombre_completo })),
                ]}
                error={errors.encargado_id?.message}
                {...register('encargado_id')}
              />
              {encargados?.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-2">
                  No hay encargados activos registrados.
                </p>
              )}
            </FormSection>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button type="submit" loading={mutation.isPending || isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear galpón'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/galpones')}>
              Cancelar
            </Button>
          </div>
        </form>

        {/* ── Right / preview ── */}
        <PreviewCard
          nombre={nombre}
          capacidad={capacidad}
          descripcion={descripcion}
          estado={estado}
          encargadoNombre={encargadoNombre}
          isEdit={isEdit}
        />
      </div>
    </div>
  )
}
