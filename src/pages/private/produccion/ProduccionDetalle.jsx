import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, formatNumber, formatPercent, calcPostura } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import toast from 'react-hot-toast'
import { differenceInHours, parseISO } from 'date-fns'

export default function ProduccionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  // const { isAdmin } = useAuth()
  const qc = useQueryClient()

  const { data: reg, isLoading } = useQuery({
    queryKey: ['produccion-detalle', id],
    queryFn: async () => {
      const { data } = await supabase.from('produccion').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales), registrado:perfiles(nombre_completo)`).eq('id', id).single()
      return data
    },
  })

  const canEdit = isAdmin || (reg && differenceInHours(new Date(), parseISO(reg.created_at)) < 24)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm()

  const mutation = useMutation({
    mutationFn: async (values) => {
      const postura = calcPostura(values.huevos_producidos, reg.lote?.cantidad_aves_actuales)
      const { error } = await supabase.from('produccion').update({ ...values, porcentaje_postura: postura }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['produccion']); toast.success('Registro actualizado'); navigate('/dashboard/produccion') },
    onError: e => toast.error(e.message),
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!reg) return null

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader
        title="Detalle producción"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Producción', href: '/dashboard/produccion' }, { label: 'Detalle' }]}
      />
      <div className="card p-5 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-stone-500">Fecha</p><p className="font-semibold">{formatDate(reg.fecha)}</p></div>
        <div><p className="text-xs text-stone-500">Galpón</p><p className="font-semibold">{reg.galpon?.nombre}</p></div>
        <div><p className="text-xs text-stone-500">Lote</p><p className="font-semibold">{reg.lote?.nombre_numero}</p></div>
        <div><p className="text-xs text-stone-500">Cantidad de aves</p><p className="font-semibold">{reg.lote?.cantidad_aves_actuales}</p></div>
        <div><p className="text-xs text-stone-500">% Postura</p><p className="font-semibold text-green-700">{formatPercent(reg.porcentaje_postura)}</p></div>
        <div><p className="text-xs text-stone-500">Registrado por</p><p className="font-semibold">{reg.registrado?.nombre_completo || '—'}</p></div>
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-5 space-y-4">
          <h3 className="section-title">Editar registro</h3>
          <Input label="Huevos producidos" type="number" defaultValue={reg.huevos_producidos} {...register('huevos_producidos', { valueAsNumber: true })} />
          <Input label="Consumo alimento (kg)" type="number" step="0.01" defaultValue={reg.consumo_alimento_kg} {...register('consumo_alimento_kg', { valueAsNumber: true })} />
          <Textarea label="Observaciones" defaultValue={reg.observaciones || ''} {...register('observaciones')} />
          <div className="flex gap-3">
            <Button type="submit" loading={mutation.isPending || isSubmitting}>Guardar</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/produccion')}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  )
}
