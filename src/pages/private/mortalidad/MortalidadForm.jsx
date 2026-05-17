import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { CAUSAS_MORTALIDAD } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  fecha: z.string().min(1, 'Requerido'),
  galpon_id: z.string().min(1, 'Selecciona un galpón'),
  cantidad_bajas: z.coerce.number().int().positive('Debe ser mayor a 0'),
  causa: z.string().min(1, 'Selecciona una causa'),
  causa_otra: z.string().optional(),
  observaciones: z.string().optional(),
})

export default function MortalidadForm() {
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const galponId = watch('galpon_id')
  const causa = watch('causa')
  const cantidadBajas = watch('cantidad_bajas')

  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase.from('lotes').select('id, nombre_numero, cantidad_aves_actuales').eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId,
  })

  const superaBajas = loteActivo && Number(cantidadBajas) > loteActivo.cantidad_aves_actuales

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (!loteActivo) throw new Error('No hay lote activo en este galpón')
      if (values.cantidad_bajas > loteActivo.cantidad_aves_actuales) {
        throw new Error(`Las bajas (${values.cantidad_bajas}) no pueden superar las aves activas (${loteActivo.cantidad_aves_actuales})`)
      }
      const { error } = await supabase.from('mortalidad').insert({
        ...values,
        lote_id: loteActivo.id,
        causa_otra: values.causa === 'otra' ? values.causa_otra : null,
        registrado_por: perfil.id,
      })
      if (error) throw error

      const nuevaCantidad = Math.max(0, loteActivo.cantidad_aves_actuales - values.cantidad_bajas)
      await supabase.from('lotes').update({ cantidad_aves_actuales: nuevaCantidad }).eq('id', loteActivo.id)
    },
    onSuccess: () => {
      qc.invalidateQueries(['mortalidad'])
      qc.invalidateQueries(['lotes'])
      toast.success('Mortalidad registrada correctamente')
      navigate('/dashboard/mortalidad')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Registrar mortalidad"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mortalidad', href: '/dashboard/mortalidad' }, { label: 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Fecha" type="date" error={errors.fecha?.message} {...register('fecha')} />
        <Select
          label="Galpón"
          options={(galpones || []).map(g => ({ value: g.id, label: g.nombre }))}
          placeholder="Seleccionar galpón"
          error={errors.galpon_id?.message}
          {...register('galpon_id')}
        />
        {galponId && loteActivo && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            Lote: <strong>{loteActivo.nombre_numero}</strong> — {loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')} aves vivas
          </div>
        )}
        {galponId && !loteActivo && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            Este galpón no tiene lote activo.
          </div>
        )}
        <Input label="Cantidad de aves muertas" type="number" min="1" error={errors.cantidad_bajas?.message} {...register('cantidad_bajas')} />
        {superaBajas && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            Las bajas no pueden superar las aves activas ({loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')}).
          </div>
        )}
        <Select
          label="Causa"
          options={CAUSAS_MORTALIDAD}
          placeholder="Seleccionar causa"
          error={errors.causa?.message}
          {...register('causa')}
        />
        {causa === 'otra' && (
          <Input label="Especifica la causa" error={errors.causa_otra?.message} {...register('causa_otra')} />
        )}
        <Textarea label="Observaciones (opcional)" {...register('observaciones')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={!loteActivo || superaBajas}>
            Guardar registro
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/mortalidad')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
