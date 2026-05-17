import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { TIPOS_TRATAMIENTO } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  fecha_inicio: z.string().min(1, 'Requerido'),
  fecha_fin: z.string().optional(),
  galpon_id: z.string().min(1, 'Requerido'),
  tipo: z.string().min(1, 'Requerido'),
  nombre_producto: z.string().min(1, 'Requerido'),
  dosis_aplicacion: z.string().min(1, 'Requerido'),
  responsable: z.string().min(1, 'Requerido'),
  estado: z.enum(['activo', 'finalizado']),
  observaciones: z.string().optional(),
})

export default function TratamientoForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_inicio: new Date().toISOString().slice(0, 10), estado: 'activo' },
  })

  const galponId = watch('galpon_id')

  const { data: galpones } = useQuery({
    queryKey: ['galpones-todos'],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase.from('lotes').select('id, nombre_numero').eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId,
  })

  const { data: tratamiento } = useQuery({
    queryKey: ['tratamiento', id],
    queryFn: async () => {
      const { data } = await supabase.from('tratamientos').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (tratamiento) reset({
      fecha_inicio: tratamiento.fecha_inicio,
      fecha_fin: tratamiento.fecha_fin || '',
      galpon_id: tratamiento.galpon_id,
      tipo: tratamiento.tipo,
      nombre_producto: tratamiento.nombre_producto,
      dosis_aplicacion: tratamiento.dosis_aplicacion,
      responsable: tratamiento.responsable,
      estado: tratamiento.estado,
      observaciones: tratamiento.observaciones || '',
    })
  }, [tratamiento, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values,
        fecha_fin: values.fecha_fin || null,
        lote_id: loteActivo?.id || tratamiento?.lote_id,
      }
      if (isEdit) {
        const { error } = await supabase.from('tratamientos').update(payload).eq('id', id)
        if (error) throw error
      } else {
        if (!loteActivo) throw new Error('No hay lote activo en el galpón seleccionado')
        const { error } = await supabase.from('tratamientos').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['tratamientos'])
      toast.success(isEdit ? 'Tratamiento actualizado' : 'Tratamiento registrado')
      navigate('/dashboard/tratamientos')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar tratamiento' : 'Nuevo tratamiento'}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tratamientos', href: '/dashboard/tratamientos' }, { label: isEdit ? 'Editar' : 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha de inicio" type="date" error={errors.fecha_inicio?.message} {...register('fecha_inicio')} />
          <Input label="Fecha de fin (opcional)" type="date" {...register('fecha_fin')} />
        </div>
        <Select label="Galpón" options={(galpones || []).map(g => ({ value: g.id, label: g.nombre }))} placeholder="Seleccionar galpón" error={errors.galpon_id?.message} {...register('galpon_id')} />
        {galponId && loteActivo && <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">Lote activo: <strong>{loteActivo.nombre_numero}</strong></div>}
        {galponId && !loteActivo && !isEdit && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">Sin lote activo</div>}
        <Select label="Tipo de tratamiento" options={TIPOS_TRATAMIENTO} placeholder="Seleccionar tipo" error={errors.tipo?.message} {...register('tipo')} />
        <Input label="Nombre del producto/medicamento" error={errors.nombre_producto?.message} {...register('nombre_producto')} />
        <Input label="Dosis y forma de aplicación" error={errors.dosis_aplicacion?.message} {...register('dosis_aplicacion')} />
        <Input label="Responsable (veterinario/encargado)" error={errors.responsable?.message} {...register('responsable')} />
        <Select label="Estado" options={[{ value: 'activo', label: 'Activo' }, { value: 'finalizado', label: 'Finalizado' }]} error={errors.estado?.message} {...register('estado')} />
        <Textarea label="Observaciones (opcional)" {...register('observaciones')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting}>{isEdit ? 'Guardar cambios' : 'Registrar tratamiento'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/tratamientos')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
