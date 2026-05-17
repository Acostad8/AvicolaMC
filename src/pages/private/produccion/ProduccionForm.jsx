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
import { Egg, AlertCircle, CheckCircle2, Info, Layers } from 'lucide-react'

const schema = z.object({
  fecha:               z.string().min(1, 'Requerido'),
  galpon_id:           z.string().min(1, 'Selecciona un galpón'),
  huevos_producidos:   z.coerce.number().int().nonnegative('Debe ser 0 o más'),
  consumo_alimento_kg: z.coerce.number().nonnegative('Debe ser 0 o más'),
  observaciones:       z.string().optional(),
})

/* Info box variants */
function InfoBox({ type = 'info', icon: Icon, children }) {
  const styles = {
    info:    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300',
    error:   'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-300',
  }
  const IconMap = { info: Info, success: CheckCircle2, error: AlertCircle, warning: AlertCircle }
  const DefaultIcon = IconMap[type]
  const I = Icon || DefaultIcon
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      <I className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

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
  const huevos   = watch('huevos_producidos')
  const fecha    = watch('fecha')

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
      const { data } = await supabase.from('lotes')
        .select('id, nombre_numero, cantidad_aves_actuales, raza:razas(nombre)')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId,
  })

  const { data: duplicado } = useQuery({
    queryKey: ['produccion-duplicado', galponId, fecha],
    queryFn: async () => {
      const { data } = await supabase.from('produccion')
        .select('id').eq('galpon_id', galponId).eq('fecha', fecha).maybeSingle()
      return data
    },
    enabled: !!galponId && !!fecha,
  })

  useEffect(() => {
    if (loteActivo?.cantidad_aves_actuales && Number(huevos) >= 0) {
      setPosturaCalc(calcPostura(Number(huevos), loteActivo.cantidad_aves_actuales))
    } else {
      setPosturaCalc(null)
    }
  }, [huevos, loteActivo])

  const superaAves = loteActivo && Number(huevos) > loteActivo.cantidad_aves_actuales

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (!loteActivo)   throw new Error('No hay lote activo en este galpón')
      if (duplicado)     throw new Error('Ya existe un registro de producción para este galpón en esta fecha')
      if (superaAves)    throw new Error(`Los huevos (${values.huevos_producidos}) no pueden superar las aves activas (${loteActivo.cantidad_aves_actuales})`)

      const postura = calcPostura(values.huevos_producidos, loteActivo.cantidad_aves_actuales)
      const { error } = await supabase.from('produccion').insert({
        ...values,
        lote_id:             loteActivo.id,
        porcentaje_postura:  postura,
        registrado_por:      perfil.id,
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

  const isDisabled = !!duplicado || !loteActivo || !!superaAves

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Registrar producción"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Producción', href: '/dashboard/produccion' },
          { label: 'Nuevo registro' },
        ]}
      />

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-5">

        {/* Header del formulario */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
            <Egg className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Nuevo registro de producción</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Completa todos los campos requeridos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha"
            type="date"
            error={errors.fecha?.message}
            {...register('fecha')}
          />
          <Select
            label="Galpón"
            options={(galpones || []).map(g => ({ value: g.id, label: g.nombre }))}
            placeholder="Seleccionar galpón"
            error={errors.galpon_id?.message}
            {...register('galpon_id')}
          />
        </div>

        {/* Lote info */}
        {galponId && loteActivo && (
          <InfoBox type="info" icon={Layers}>
            <p className="font-semibold">Lote activo: {loteActivo.nombre_numero}</p>
            <p className="text-xs mt-0.5">
              {loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')} aves activas
              {loteActivo.raza?.nombre && <> · Raza: <strong>{loteActivo.raza.nombre}</strong></>}
            </p>
          </InfoBox>
        )}
        {galponId && !loteActivo && (
          <InfoBox type="error">
            Este galpón no tiene un lote activo. Crea un lote antes de registrar producción.
          </InfoBox>
        )}
        {duplicado && (
          <InfoBox type="error">
            Ya existe un registro de producción para este galpón en la fecha seleccionada.
          </InfoBox>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Huevos producidos"
            type="number"
            min="0"
            placeholder="0"
            error={errors.huevos_producidos?.message}
            {...register('huevos_producidos')}
          />
          <Input
            label="Consumo de alimento (kg)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.consumo_alimento_kg?.message}
            {...register('consumo_alimento_kg')}
          />
        </div>

        {superaAves && (
          <InfoBox type="error">
            Los huevos producidos no pueden superar las aves activas ({loteActivo?.cantidad_aves_actuales?.toLocaleString('es-CO')}).
          </InfoBox>
        )}

        {posturaCalc !== null && !superaAves && (
          <InfoBox type="success">
            <span>% de postura calculado: </span>
            <strong className="text-base">{posturaCalc}%</strong>
            <span className="text-xs ml-2 opacity-70">
              {posturaCalc >= 90 ? '🟢 Excelente' : posturaCalc >= 75 ? '🟡 Buena' : '🔴 Baja'}
            </span>
          </InfoBox>
        )}

        <Textarea
          label="Observaciones (opcional)"
          placeholder="Anota cualquier novedad relevante del día…"
          rows={3}
          {...register('observaciones')}
        />

        <div className="flex gap-3 pt-1 border-t border-stone-100 dark:border-stone-800">
          <Button
            type="submit"
            loading={mutation.isPending || isSubmitting}
            disabled={isDisabled}
          >
            Guardar registro
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/produccion')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
