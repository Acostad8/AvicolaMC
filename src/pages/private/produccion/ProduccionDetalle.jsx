import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, formatNumber, calcPostura } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import toast from 'react-hot-toast'
import { differenceInHours, parseISO } from 'date-fns'
import { Egg, Building2, Layers, TrendingUp, User, Clock, Pencil, CheckCircle2, AlertCircle } from 'lucide-react'

/* Postura badge */
function PosturaBadge({ pct }) {
  const n = parseFloat(pct) || 0
  if (n >= 90) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-3.5 w-3.5" />{n.toFixed(1)}%</span>
  if (n >= 75) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30"><TrendingUp className="h-3.5 w-3.5" />{n.toFixed(1)}%</span>
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"><AlertCircle className="h-3.5 w-3.5" />{n.toFixed(1)}%</span>
}

/* Detail item */
function Detail({ label, value, accent }) {
  return (
    <div className="space-y-1">
      <p className="detail-label">{label}</p>
      <p className={`detail-value ${accent || ''}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function ProduccionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const qc = useQueryClient()

  const { data: reg, isLoading } = useQuery({
    queryKey: ['produccion-detalle', id],
    queryFn: async () => {
      const { data } = await supabase.from('produccion').select(`
        *,
        galpon:galpones(nombre),
        lote:lotes(nombre_numero, cantidad_aves_actuales, raza:razas(nombre)),
        registrado:perfiles(nombre_completo)
      `).eq('id', id).single()
      return data
    },
  })

  const canEdit = isAdmin || (reg && differenceInHours(new Date(), parseISO(reg.created_at)) < 24)

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm()
  const huevosWatch = watch('huevos_producidos')
  const posturaPreview = reg?.lote?.cantidad_aves_actuales && huevosWatch >= 0
    ? calcPostura(Number(huevosWatch), reg.lote.cantidad_aves_actuales)
    : null

  const mutation = useMutation({
    mutationFn: async (values) => {
      const postura = calcPostura(values.huevos_producidos, reg.lote?.cantidad_aves_actuales)
      const { error } = await supabase.from('produccion').update({ ...values, porcentaje_postura: postura }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['produccion'])
      toast.success('Registro actualizado')
      navigate('/dashboard/produccion')
    },
    onError: e => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <Egg className="h-6 w-6 text-amber-500" />
        </div>
        <p className="text-stone-400 dark:text-stone-500 text-sm">Cargando registro…</p>
      </div>
    </div>
  )

  if (!reg) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Registro no encontrado.</p>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Detalle de producción"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Producción', href: '/dashboard/produccion' },
          { label: formatDate(reg.fecha) },
        ]}
        actions={canEdit && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold">
            <Pencil className="h-3 w-3" />
            Editable
          </span>
        )}
      />

      {/* Hero card */}
      <div className="card p-6 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-stone-900 dark:to-amber-950/20 border-amber-200 dark:border-amber-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20">
              <Egg className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">Huevos producidos</p>
              <p className="text-3xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                {formatNumber(reg.huevos_producidos)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">% Postura</p>
            <PosturaBadge pct={reg.porcentaje_postura} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-amber-200/60 dark:border-amber-900/30">
          <Detail label="Fecha"         value={formatDate(reg.fecha)} />
          <Detail label="Galpón"        value={reg.galpon?.nombre} />
          <Detail label="Lote"          value={reg.lote?.nombre_numero} />
          <Detail label="Raza"          value={reg.lote?.raza?.nombre} />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Aves & producción */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title text-sm">Producción</h2>
          </div>
          <Detail label="Aves en lote"        value={formatNumber(reg.lote?.cantidad_aves_actuales)} />
          <Detail label="Huevos producidos"   value={formatNumber(reg.huevos_producidos)} accent="text-amber-600 dark:text-amber-400" />
          <Detail label="% Postura"           value={`${reg.porcentaje_postura ?? 0}%`} accent="text-green-600 dark:text-green-400" />
          <Detail label="Alimento consumido"  value={reg.consumo_alimento_kg != null ? `${reg.consumo_alimento_kg} kg` : '—'} />
          {reg.consumo_alimento_kg > 0 && reg.huevos_producidos > 0 && (
            <Detail
              label="Eficiencia alimentaria"
              value={`${(reg.huevos_producidos / reg.consumo_alimento_kg).toFixed(2)} huevos/kg`}
              accent="text-blue-600 dark:text-blue-400"
            />
          )}
        </div>

        {/* Registro */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title text-sm">Registro</h2>
          </div>
          <Detail label="Registrado por"   value={reg.registrado?.nombre_completo} />
          <Detail label="Creado el"        value={formatDate(reg.created_at)} />
          <Detail label="ID del registro"  value={<span className="font-mono text-xs text-stone-400 dark:text-stone-500">{reg.id?.slice(0, 8)}…</span>} />
          {!canEdit && (
            <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl px-3 py-2">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              Expiró el período de edición (24 h)
            </div>
          )}
        </div>
      </div>

      {/* Observaciones */}
      {reg.observaciones && (
        <div className="card p-5">
          <h2 className="section-title text-sm mb-3">Observaciones</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">
            {reg.observaciones}
          </p>
        </div>
      )}

      {/* Edit form */}
      {canEdit && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Pencil className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Editar registro</h2>
          </div>
          <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Huevos producidos"
                type="number"
                min="0"
                defaultValue={reg.huevos_producidos}
                {...register('huevos_producidos', { valueAsNumber: true })}
              />
              <Input
                label="Consumo alimento (kg)"
                type="number"
                step="0.01"
                min="0"
                defaultValue={reg.consumo_alimento_kg}
                {...register('consumo_alimento_kg', { valueAsNumber: true })}
              />
            </div>

            {posturaPreview !== null && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                % Postura calculado: <strong className="ml-1">{posturaPreview}%</strong>
              </div>
            )}

            <Textarea
              label="Observaciones"
              defaultValue={reg.observaciones || ''}
              rows={3}
              {...register('observaciones')}
            />

            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={mutation.isPending || isSubmitting}>
                Guardar cambios
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/produccion')}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
