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

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  capacidad_maxima: z.coerce.number().int().positive('Debe ser un número positivo'),
  descripcion: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']),
  encargado_id: z.string().optional(),
})

export default function GalponForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', encargado_id: '' },
  })

  const { data: encargados } = useQuery({
    queryKey: ['encargados-list'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles')
        .select('id, nombre_completo').eq('rol', 'encargado').eq('estado', 'activo').order('nombre_completo')
      return data || []
    },
  })

  const { data: galpon } = useQuery({
    queryKey: ['galpon', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (galpon) reset({
      nombre: galpon.nombre,
      capacidad_maxima: galpon.capacidad_maxima,
      descripcion: galpon.descripcion || '',
      estado: galpon.estado,
      encargado_id: galpon.encargado_id || '',
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
      toast.success(isEdit ? 'Galpón actualizado' : 'Galpón creado correctamente')
      navigate('/dashboard/galpones')
    },
    onError: (e) => toast.error(e.message || 'Error al guardar'),
  })

  const encargadoOptions = [
    { value: '', label: 'Sin asignar' },
    ...(encargados || []).map(e => ({ value: e.id, label: e.nombre_completo })),
  ]

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar galpón' : 'Nuevo galpón'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Galpones', href: '/dashboard/galpones' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Nombre del galpón" error={errors.nombre?.message} {...register('nombre')} />
        <Input label="Capacidad máxima de aves" type="number" error={errors.capacidad_maxima?.message} {...register('capacidad_maxima')} />
        <Textarea label="Descripción o notas (opcional)" {...register('descripcion')} />
        <Select
          label="Estado"
          options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]}
          error={errors.estado?.message}
          {...register('estado')}
        />
        <Select
          label="Encargado asignado"
          options={encargadoOptions}
          error={errors.encargado_id?.message}
          {...register('encargado_id')}
        />
        <div className="flex gap-3 pt-2">
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
