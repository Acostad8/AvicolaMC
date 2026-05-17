import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { CATEGORIAS_INSUMO, UNIDADES_MEDIDA } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  categoria: z.string().min(1, 'Requerido'),
  unidad_medida: z.string().min(1, 'Requerido'),
  stock_minimo: z.coerce.number().int('Debe ser un número entero').nonnegative('Debe ser 0 o más'),
  estado: z.enum(['activo', 'inactivo']),
})

export default function InsumoForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', stock_minimo: 0 },
  })

  const { data: insumo } = useQuery({
    queryKey: ['insumo', id],
    queryFn: async () => {
      const { data } = await supabase.from('insumos').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (insumo) reset({ nombre: insumo.nombre, categoria: insumo.categoria, unidad_medida: insumo.unidad_medida, stock_minimo: insumo.stock_minimo, estado: insumo.estado })
  }, [insumo, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        const { error } = await supabase.from('insumos').update(values).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('insumos').insert({ ...values, stock_actual: 0 })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['insumos'])
      toast.success(isEdit ? 'Insumo actualizado' : 'Insumo creado')
      navigate('/dashboard/insumos')
    },
    onError: e => toast.error(e.message),
  })

  return (
    <div className="max-w-md">
      <PageHeader
        title={isEdit ? 'Editar insumo' : 'Nuevo insumo'}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insumos', href: '/dashboard/insumos' }, { label: isEdit ? 'Editar' : 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Nombre del producto" error={errors.nombre?.message} {...register('nombre')} />
        <Select label="Categoría" options={CATEGORIAS_INSUMO} placeholder="Seleccionar" error={errors.categoria?.message} {...register('categoria')} />
        <Select label="Unidad de medida" options={UNIDADES_MEDIDA} placeholder="Seleccionar unidad" error={errors.unidad_medida?.message} {...register('unidad_medida')} />
        <Input label="Stock mínimo de alerta (entero)" type="text" step="1" min="0" error={errors.stock_minimo?.message} {...register('stock_minimo')} />
        <Select label="Estado" options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} error={errors.estado?.message} {...register('estado')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear insumo'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/insumos')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
