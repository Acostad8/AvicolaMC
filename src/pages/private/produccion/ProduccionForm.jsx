import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { calcPostura } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  fecha: z.string().min(1, 'Requerido'),
  galpon_id: z.string().min(1, 'Selecciona un galpón'),
  huevos_producidos: z.coerce.number().int().nonnegative('Debe ser 0 o más'),
  consumo_alimento_kg: z.coerce.number().nonnegative('Debe ser 0 o más'),
  observaciones: z.string().optional(),
})

export default function ProduccionForm() {
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()
  const [posturaCalc, setPosturaCalc] = useState(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const galponId = watch('galpon_id')
  const huevos = watch('huevos_producidos')
  const fecha = watch('fecha')

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

  const { data: duplicado } = useQuery({
    queryKey: ['produccion-duplicado', galponId, fecha],
    queryFn: async () => {
      const { data } = await supabase.from('produccion').select('id').eq('galpon_id', galponId).eq('fecha', fecha).maybeSingle()
      return data
    },
    enabled: !!galponId && !!fecha,
  })

  useEffect(() => {
    if (loteActivo?.cantidad_aves_actuales && huevos >= 0) {
      setPosturaCalc(calcPostura(Number(huevos), loteActivo.cantidad_aves_actuales))
    }
  }, [huevos, loteActivo])

  const superaAves = loteActivo && Number(huevos) > loteActivo.cantidad_aves_actuales

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (!loteActivo) throw new Error('No hay lote activo en este galpón')
      if (duplicado) throw new Error('Ya existe un registro de producción para este galpón en esta fecha')
      if (values.huevos_producidos > loteActivo.cantidad_aves_actuales) {
        throw new Error(`Los huevos producidos (${values.huevos_producidos}) no pueden ser mayores a las aves activas (${loteActivo.cantidad_aves_actuales})`)
      }
      const postura = calcPostura(values.huevos_producidos, loteActivo.cantidad_aves_actuales)
      const { error } = await supabase.from('produccion').insert({
        ...values,
        lote_id: loteActivo.id,
        porcentaje_postura: postura,
        registrado_por: perfil.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['produccion'])
      toast.success('Producción registrada correctamente')
      navigate('/dashboard/produccion')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Registrar producción"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Producción', href: '/dashboard/produccion' }, { label: 'Nuevo' }]}
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
            Lote activo: <strong>{loteActivo.nombre_numero}</strong> — {loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')} aves activas
          </div>
        )}
        {galponId && !loteActivo && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            Este galpón no tiene lote activo.
          </div>
        )}
        {duplicado && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            Ya existe un registro para este galpón en esta fecha.
          </div>
        )}

        <Input label="Huevos producidos" type="number" min="0" error={errors.huevos_producidos?.message} {...register('huevos_producidos')} />

        {superaAves && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            Los huevos producidos no pueden superar las aves activas ({loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')}).
          </div>
        )}

        <Input label="Consumo de alimento (kg)" type="number" step="0.01" min="0" error={errors.consumo_alimento_kg?.message} {...register('consumo_alimento_kg')} />

        {posturaCalc !== null && !superaAves && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
            % de postura calculado: <strong>{posturaCalc}%</strong>
          </div>
        )}

        <Textarea label="Observaciones (opcional)" {...register('observaciones')} />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={!!duplicado || !loteActivo || superaAves}>
            Guardar registro
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/produccion')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
