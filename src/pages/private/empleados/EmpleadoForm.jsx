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
  nombre_completo: z.string().min(1, 'Requerido'),
  documento_identidad: z.string().optional(),
  cargo: z.string().optional(),
  telefono: z.string().optional(),
  fecha_ingreso: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']),
  notas: z.string().optional(),
})

export default function EmpleadoForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo' },
  })

  const { data: empleado } = useQuery({
    queryKey: ['empleado', id],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (empleado) reset({
      nombre_completo: empleado.nombre_completo,
      documento_identidad: empleado.documento_identidad || '',
      cargo: empleado.cargo || '',
      telefono: empleado.telefono || '',
      fecha_ingreso: empleado.fecha_ingreso || '',
      estado: empleado.estado,
      notas: empleado.notas || '',
    })
  }, [empleado, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = { ...values, fecha_ingreso: values.fecha_ingreso || null }
      if (isEdit) {
        const { error } = await supabase.from('empleados').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('empleados').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['empleados'])
      toast.success(isEdit ? 'Empleado actualizado' : 'Empleado creado')
      navigate('/dashboard/empleados')
    },
    onError: e => toast.error(e.message),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar empleado' : 'Nuevo empleado'}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Empleados', href: '/dashboard/empleados' }, { label: isEdit ? 'Editar' : 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Nombre completo" error={errors.nombre_completo?.message} {...register('nombre_completo')} />
        <Input label="Documento de identidad (opcional)" {...register('documento_identidad')} />
        <Input label="Cargo (opcional)" placeholder="Ej: Operario, Veterinario" {...register('cargo')} />
        <Input label="Teléfono (opcional)" {...register('telefono')} />
        <Input label="Fecha de ingreso (opcional)" type="date" {...register('fecha_ingreso')} />
        <Select label="Estado" options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} {...register('estado')} />
        <Textarea label="Notas (opcional)" {...register('notas')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear empleado'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/empleados')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
