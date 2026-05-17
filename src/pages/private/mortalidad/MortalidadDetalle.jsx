import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate, formatNumber, getLabelFromValue, CAUSAS_MORTALIDAD } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'

export default function MortalidadDetalle() {
  const { id } = useParams()
  const { data: reg, isLoading } = useQuery({
    queryKey: ['mortalidad-detalle', id],
    queryFn: async () => {
      const { data } = await supabase.from('mortalidad').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero), registrado:perfiles(nombre_completo)`).eq('id', id).single()
      return data
    },
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!reg) return null

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Detalle mortalidad"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mortalidad', href: '/dashboard/mortalidad' }, { label: 'Detalle' }]}
      />
      <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-stone-500">Fecha</p><p className="font-semibold">{formatDate(reg.fecha)}</p></div>
        <div><p className="text-xs text-stone-500">Galpón</p><p className="font-semibold">{reg.galpon?.nombre}</p></div>
        <div><p className="text-xs text-stone-500">Lote</p><p className="font-semibold">{reg.lote?.nombre_numero}</p></div>
        <div><p className="text-xs text-stone-500">Cantidad de bajas</p><p className="font-semibold text-red-700">{formatNumber(reg.cantidad_bajas)}</p></div>
        <div><p className="text-xs text-stone-500">Causa</p><p className="font-semibold">{getLabelFromValue(CAUSAS_MORTALIDAD, reg.causa)}</p></div>
        {reg.causa_otra && <div><p className="text-xs text-stone-500">Causa específica</p><p className="font-semibold">{reg.causa_otra}</p></div>}
        <div><p className="text-xs text-stone-500">Registrado por</p><p className="font-semibold">{reg.registrado?.nombre_completo || '—'}</p></div>
        {reg.observaciones && <div className="col-span-2"><p className="text-xs text-stone-500">Observaciones</p><p>{reg.observaciones}</p></div>}
      </div>
    </div>
  )
}
