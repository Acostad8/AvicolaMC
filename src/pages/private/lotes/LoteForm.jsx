import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  nombre_numero: z.string().min(1, 'Requerido'),
  galpon_id: z.string().min(1, 'Selecciona un galpón'),
  raza_id: z.string().optional(),
  cantidad_inicial_aves: z.coerce.number().int().positive('Debe ser positivo'),
  fecha_ingreso: z.string().min(1, 'Requerido'),
  notas: z.string().optional(),
})

export default function LoteForm() {
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_ingreso: new Date().toISOString().slice(0, 10) },
  })

  const galponId = watch('galpon_id')
  const cantidadAves = watch('cantidad_inicial_aves')

  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre, capacidad_maxima').eq('estado', 'activo').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  const { data: razas } = useQuery({
    queryKey: ['razas'],
    queryFn: async () => {
      const { data } = await supabase.from('razas').select('id, nombre').order('nombre')
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

  const galponSeleccionado = (galpones || []).find(g => g.id === galponId)
  const superaCapacidad = galponSeleccionado && Number(cantidadAves) > galponSeleccionado.capacidad_maxima
  const bloqueado = !!loteActivo || superaCapacidad

  const mutation = useMutation({
    mutationFn: async (values) => {
      const galpon = (galpones || []).find(g => g.id === values.galpon_id)
      if (loteActivo) throw new Error('Este galpón ya tiene un lote activo. Finalízalo primero antes de crear uno nuevo.')
      if (galpon && values.cantidad_inicial_aves > galpon.capacidad_maxima) {
        throw new Error(`La cantidad de aves (${values.cantidad_inicial_aves}) supera la capacidad máxima del galpón (${galpon.capacidad_maxima}).`)
      }
      const { error } = await supabase.from('lotes').insert({
        ...values,
        raza_id: values.raza_id || null,
        cantidad_aves_actuales: values.cantidad_inicial_aves,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['lotes'])
      toast.success('Lote creado correctamente')
      navigate('/dashboard/lotes')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Nuevo lote"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lotes', href: '/dashboard/lotes' }, { label: 'Nuevo' }]}
      />

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Número o nombre del lote" error={errors.nombre_numero?.message} {...register('nombre_numero')} />
        <Select
          label="Galpón"
          options={(galpones || []).map(g => ({ value: g.id, label: `${g.nombre} (cap. ${g.capacidad_maxima} aves)` }))}
          placeholder="Seleccionar galpón"
          error={errors.galpon_id?.message}
          {...register('galpon_id')}
        />

        {loteActivo && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg px-3 py-2">
            Este galpón ya tiene el lote <strong>"{loteActivo.nombre_numero}"</strong> activo. Debes finalizarlo antes de crear uno nuevo.
          </div>
        )}

        {galponSeleccionado && !loteActivo && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600">
            Capacidad máxima del galpón: <strong>{galponSeleccionado.capacidad_maxima} aves</strong>
          </div>
        )}

        <Select
          label="Raza (opcional)"
          options={(razas || []).map(r => ({ value: r.id, label: r.nombre }))}
          placeholder="Seleccionar raza"
          {...register('raza_id')}
        />
        <Input label="Cantidad inicial de aves" type="number" min="1" error={errors.cantidad_inicial_aves?.message} {...register('cantidad_inicial_aves')} />

        {superaCapacidad && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg px-3 py-2">
            La cantidad ingresada supera la capacidad máxima del galpón ({galponSeleccionado.capacidad_maxima} aves).
          </div>
        )}

        <Input label="Fecha de ingreso" type="date" error={errors.fecha_ingreso?.message} {...register('fecha_ingreso')} />
        <Textarea label="Notas (opcional)" {...register('notas')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={bloqueado}>Crear lote</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/lotes')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
