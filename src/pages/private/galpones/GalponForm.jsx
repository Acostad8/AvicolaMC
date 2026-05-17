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
import { Building2, Users, FileText, Settings2 } from 'lucide-react'
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

export default function GalponForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', encargado_id: '' },
  })

  const capacidad = watch('capacidad_maxima')
  const nombre    = watch('nombre')

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

  if (isEdit && loadingGalpon) return (
    <div className="max-w-xl space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="card p-6 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? `Editar: ${galpon?.nombre || '…'}` : 'Nuevo galpón'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Galpones', href: '/dashboard/galpones' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-7">

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
          <Input
            label="Nombre del galpón"
            placeholder="Ej: Galpón A, Galpón Norte…"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
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
                Capacidad: <span className="font-semibold text-stone-600 dark:text-stone-300">{Number(capacidad).toLocaleString('es-CO')} aves</span>
              </p>
            )}
          </div>
          <Textarea
            label="Descripción o notas (opcional)"
            placeholder="Ubicación, características especiales, observaciones…"
            rows={3}
            {...register('descripcion')}
          />
        </FormSection>

        {/* Config */}
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

        {/* Assignment */}
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
              No hay encargados activos registrados en el sistema.
            </p>
          )}
        </FormSection>

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
    </div>
  )
}
