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
import { Layers, Building2, Bird, AlertCircle, CheckCircle2, Info } from 'lucide-react'

const schema = z.object({
  nombre_numero:          z.string().min(1, 'Requerido'),
  galpon_id:              z.string().min(1, 'Selecciona un galpón'),
  raza_id:                z.string().optional(),
  cantidad_inicial_aves:  z.coerce.number().int().positive('Debe ser positivo'),
  fecha_ingreso:          z.string().min(1, 'Requerido'),
  notas:                  z.string().optional(),
})

function InfoBox({ type = 'info', children }) {
  const styles = {
    info:    'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300',
    error:   'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300',
  }
  const icons = { info: Info, success: CheckCircle2, error: AlertCircle, warning: AlertCircle }
  const Icon = icons[type]
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

/* Capacity bar */
function CapacityBar({ aves, capacidad }) {
  const pct = capacidad > 0 ? Math.min((aves / capacidad) * 100, 100) : 0
  const over  = aves > capacidad
  const color = over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-stone-500 dark:text-stone-400">Uso de capacidad</span>
        <span className={`font-bold tabular-nums ${over ? 'text-red-600 dark:text-red-400' : 'text-stone-700 dark:text-stone-300'}`}>
          {aves.toLocaleString('es-CO')} / {capacidad.toLocaleString('es-CO')}
        </span>
      </div>
      <div className="h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-right text-[11px] tabular-nums ${over ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-stone-400 dark:text-stone-500'}`}>
        {over ? `${(aves - capacidad).toLocaleString('es-CO')} aves sobre el límite` : `${(100 - pct).toFixed(1)}% disponible`}
      </p>
    </div>
  )
}

export default function LoteForm() {
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_ingreso: new Date().toISOString().slice(0, 10) },
  })

  const galponId    = watch('galpon_id')
  const cantidadAves = Number(watch('cantidad_inicial_aves')) || 0
  const nombreLote  = watch('nombre_numero')

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
      const { data } = await supabase.from('razas').select('id, nombre, tipo').order('nombre')
      return data || []
    },
  })

  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase.from('lotes').select('id, nombre_numero')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId,
  })

  const galponSeleccionado = (galpones || []).find(g => g.id === galponId)
  const superaCapacidad    = galponSeleccionado && cantidadAves > galponSeleccionado.capacidad_maxima
  const bloqueado          = !!loteActivo || !!superaCapacidad

  const mutation = useMutation({
    mutationFn: async (values) => {
      const galpon = (galpones || []).find(g => g.id === values.galpon_id)
      if (loteActivo) throw new Error('Este galpón ya tiene un lote activo. Finalízalo antes de crear uno nuevo.')
      if (galpon && values.cantidad_inicial_aves > galpon.capacidad_maxima) {
        throw new Error(`La cantidad (${values.cantidad_inicial_aves}) supera la capacidad del galpón (${galpon.capacidad_maxima}).`)
      }
      const { error } = await supabase.from('lotes').insert({
        ...values,
        raza_id:                values.raza_id || null,
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

  /* Group razas by tipo for the select */
  const ponedoras = (razas || []).filter(r => r.tipo === 'ponedoras')
  const engorde   = (razas || []).filter(r => r.tipo === 'engorde')

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Nuevo lote"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lotes', href: '/dashboard/lotes' },
          { label: 'Nuevo' },
        ]}
      />

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-6">

        {/* Form header */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <Layers className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">Registrar nuevo lote</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{nombreLote || 'Completa los campos para continuar'}</p>
          </div>
        </div>

        {/* Identificación */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Identificación
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Número / Nombre del lote"
              placeholder="Ej: L-2024-01, Lote Primavera…"
              error={errors.nombre_numero?.message}
              {...register('nombre_numero')}
            />
            <Input
              label="Fecha de ingreso"
              type="date"
              error={errors.fecha_ingreso?.message}
              {...register('fecha_ingreso')}
            />
          </div>
        </div>

        {/* Galpón */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Galpón y aves
          </div>
          <Select
            label="Galpón de destino"
            options={(galpones || []).map(g => ({ value: g.id, label: `${g.nombre} — cap. ${g.capacidad_maxima.toLocaleString('es-CO')} aves` }))}
            placeholder="Seleccionar galpón"
            error={errors.galpon_id?.message}
            {...register('galpon_id')}
          />

          {loteActivo && (
            <InfoBox type="error">
              El galpón ya tiene el lote <strong>"{loteActivo.nombre_numero}"</strong> activo. Finalízalo antes de crear uno nuevo.
            </InfoBox>
          )}

          <Input
            label="Cantidad inicial de aves"
            type="number"
            min="1"
            placeholder="Ej: 5000"
            error={errors.cantidad_inicial_aves?.message}
            {...register('cantidad_inicial_aves')}
          />

          {galponSeleccionado && cantidadAves > 0 && !loteActivo && (
            <CapacityBar aves={cantidadAves} capacidad={galponSeleccionado.capacidad_maxima} />
          )}

          {superaCapacidad && (
            <InfoBox type="error">
              La cantidad ingresada supera la capacidad máxima del galpón ({galponSeleccionado.capacidad_maxima.toLocaleString('es-CO')} aves).
            </InfoBox>
          )}
        </div>

        {/* Raza */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <Bird className="h-3.5 w-3.5" aria-hidden="true" />
            Raza (opcional)
          </div>
          <div className="w-full">
            <label className="label">Raza de las aves</label>
            <select className="input-base" {...register('raza_id')}>
              <option value="">Sin raza definida</option>
              {ponedoras.length > 0 && (
                <optgroup label="🥚 Ponedoras">
                  {ponedoras.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </optgroup>
              )}
              {engorde.length > 0 && (
                <optgroup label="🍗 Engorde">
                  {engorde.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Notas */}
        <Textarea
          label="Notas adicionales (opcional)"
          placeholder="Observaciones sobre el lote, procedencia, condiciones especiales…"
          rows={3}
          {...register('notas')}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={bloqueado}>
            Crear lote
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/lotes')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
