import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Skeleton } from '../../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import { Layers, Building2, Bird, AlertCircle, CheckCircle2, Info, Lock } from 'lucide-react'
import { formatDate, formatNumber } from '../../../lib/utils'

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const schemaCrear = z.object({
  nombre_numero:         z.string().min(1, 'Requerido'),
  galpon_id:             z.string().min(1, 'Selecciona un galpón'),
  raza_id:               z.string().optional(),
  cantidad_inicial_aves: z.coerce.number().int().positive('Debe ser positivo'),
  fecha_ingreso:         z.string().min(1, 'Requerido'),
  notas:                 z.string().optional(),
})

// En edición, los campos críticos pueden estar bloqueados y no estar en el form,
// por eso se declaran como opcionales y se validan a nivel de mutation.
const schemaEditar = z.object({
  nombre_numero:         z.string().min(1, 'Requerido'),
  galpon_id:             z.string().optional(),
  raza_id:               z.string().optional(),
  cantidad_inicial_aves: z.coerce.number().int().positive('Debe ser positivo').optional(),
  fecha_ingreso:         z.string().optional(),
  notas:                 z.string().optional(),
})

/* ── Helper components ────────────────────────────────────────────────────── */

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

function CapacityBar({ aves, capacidad }) {
  const pct   = capacidad > 0 ? Math.min((aves / capacidad) * 100, 100) : 0
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
        {over
          ? `${(aves - capacidad).toLocaleString('es-CO')} aves sobre el límite`
          : `${(100 - pct).toFixed(1)}% disponible`}
      </p>
    </div>
  )
}

function LockedField({ label, value }) {
  return (
    <div className="space-y-1.5">
      <div className="label flex items-center gap-1.5">
        <span>{label}</span>
        <Lock className="h-3 w-3 text-stone-400 dark:text-stone-500" aria-hidden="true" />
      </div>
      <div className="input-base bg-stone-50 dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 cursor-not-allowed pointer-events-none select-none">
        {value ?? '—'}
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function LoteForm() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = !!id
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(isEdit ? schemaEditar : schemaCrear),
    defaultValues: { fecha_ingreso: new Date().toISOString().slice(0, 10) },
  })

  const galponId     = watch('galpon_id')
  const cantidadAves = Number(watch('cantidad_inicial_aves')) || 0
  const nombreLote   = watch('nombre_numero')

  /* ── Cargar datos del lote (solo en edición) ── */
  const { data: lote, isLoading: loteLoading } = useQuery({
    queryKey: ['lote-form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lotes')
        .select('*, galpon:galpones(nombre, capacidad_maxima), raza:razas(nombre)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEdit,
  })

  /* ── Verificar si el lote tiene registros operativos ── */
  const { data: conteo, isLoading: conteoLoading } = useQuery({
    queryKey: ['lote-registros-count', id],
    queryFn: async () => {
      const [prod, mort, trat] = await Promise.all([
        supabase.from('produccion').select('id',   { count: 'exact', head: true }).eq('lote_id', id),
        supabase.from('mortalidad').select('id',   { count: 'exact', head: true }).eq('lote_id', id),
        supabase.from('tratamientos').select('id', { count: 'exact', head: true }).eq('lote_id', id),
      ])
      return {
        produccion:   prod.count   ?? 0,
        mortalidad:   mort.count   ?? 0,
        tratamientos: trat.count   ?? 0,
        total: (prod.count ?? 0) + (mort.count ?? 0) + (trat.count ?? 0),
      }
    },
    enabled: isEdit,
  })

  const hasRecords = isEdit && (conteo?.total ?? 0) > 0

  /* ── Rellenar formulario cuando carga el lote ── */
  useEffect(() => {
    if (lote && isEdit) {
      reset({
        nombre_numero:         lote.nombre_numero,
        galpon_id:             lote.galpon_id,
        raza_id:               lote.raza_id  ?? '',
        cantidad_inicial_aves: lote.cantidad_inicial_aves,
        fecha_ingreso:         lote.fecha_ingreso,
        notas:                 lote.notas    ?? '',
      })
    }
  }, [lote, isEdit, reset])

  /* ── Galpones disponibles ── */
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

  /* ── Razas disponibles ── */
  const { data: razas } = useQuery({
    queryKey: ['razas'],
    queryFn: async () => {
      const { data } = await supabase.from('razas').select('id, nombre').order('nombre')
      return data || []
    },
  })

  /* ── Verificar si el galpón seleccionado ya tiene un lote activo ──
     En edición se excluye el lote actual del check para no autoBlockear. ── */
  const { data: loteActivoEnGalpon } = useQuery({
    queryKey: ['lote-activo-check', galponId, id],
    queryFn: async () => {
      let q = supabase.from('lotes').select('id, nombre_numero')
        .eq('galpon_id', galponId).eq('estado', 'activo')
      if (id) q = q.neq('id', id)
      const { data } = await q.maybeSingle()
      return data
    },
    enabled: !!galponId && !hasRecords,
  })

  const galponSeleccionado = (galpones || []).find(g => g.id === galponId)
  const superaCapacidad    = !hasRecords && galponSeleccionado && cantidadAves > galponSeleccionado.capacidad_maxima
  const formularioBloqueado = (!!loteActivoEnGalpon || !!superaCapacidad) && !hasRecords

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        // Campos siempre editables
        const payload = {
          nombre_numero: values.nombre_numero,
          raza_id:       values.raza_id || null,
          notas:         values.notas   || null,
        }

        if (!hasRecords) {
          // Validaciones manuales para campos críticos que pueden estar libres
          if (!values.galpon_id)             throw new Error('Selecciona un galpón.')
          if (!values.fecha_ingreso)         throw new Error('La fecha de ingreso es requerida.')
          if (!values.cantidad_inicial_aves) throw new Error('La cantidad inicial de aves es requerida.')

          const galpon = (galpones || []).find(g => g.id === values.galpon_id)
          if (loteActivoEnGalpon) throw new Error('El galpón seleccionado ya tiene otro lote activo.')
          if (galpon && values.cantidad_inicial_aves > galpon.capacidad_maxima) {
            throw new Error(`La cantidad (${values.cantidad_inicial_aves}) supera la capacidad del galpón (${galpon.capacidad_maxima}).`)
          }

          Object.assign(payload, {
            galpon_id:              values.galpon_id,
            cantidad_inicial_aves:  values.cantidad_inicial_aves,
            cantidad_aves_actuales: values.cantidad_inicial_aves,
            fecha_ingreso:          values.fecha_ingreso,
          })
        }

        const { error } = await supabase.from('lotes').update(payload).eq('id', id)
        if (error) throw error
      } else {
        // Crear
        const galpon = (galpones || []).find(g => g.id === values.galpon_id)
        if (loteActivoEnGalpon) throw new Error('Este galpón ya tiene un lote activo. Finalízalo antes de crear uno nuevo.')
        if (galpon && values.cantidad_inicial_aves > galpon.capacidad_maxima) {
          throw new Error(`La cantidad (${values.cantidad_inicial_aves}) supera la capacidad del galpón (${galpon.capacidad_maxima}).`)
        }
        const { error } = await supabase.from('lotes').insert({
          nombre_numero:          values.nombre_numero,
          galpon_id:              values.galpon_id,
          raza_id:                values.raza_id || null,
          cantidad_inicial_aves:  values.cantidad_inicial_aves,
          cantidad_aves_actuales: values.cantidad_inicial_aves,
          fecha_ingreso:          values.fecha_ingreso,
          notas:                  values.notas || null,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['lotes'])
      if (isEdit) qc.invalidateQueries(['lote', id])
      toast.success(isEdit ? 'Lote actualizado correctamente' : 'Lote creado correctamente')
      navigate(isEdit ? `/dashboard/lotes/${id}` : '/dashboard/lotes')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  /* ── Skeleton mientras carga en edición ── */
  if (isEdit && (loteLoading || conteoLoading)) {
    return (
      <div className="max-w-xl space-y-5">
        <Skeleton className="h-8 w-56" />
        <div className="card p-6 space-y-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  /* ── Lote no encontrado ── */
  if (isEdit && !lote) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-400 dark:text-stone-500">Lote no encontrado.</p>
      </div>
    )
  }

  /* ── Resumen de registros bloqueantes ── */
  const resumenRegistros = isEdit && conteo && [
    conteo.produccion   > 0 && `${conteo.produccion} de producción`,
    conteo.mortalidad   > 0 && `${conteo.mortalidad} de mortalidad`,
    conteo.tratamientos > 0 && `${conteo.tratamientos} de tratamiento`,
  ].filter(Boolean).join(', ')

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? `Editar: ${lote?.nombre_numero}` : 'Nuevo lote'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lotes', href: '/dashboard/lotes' },
          ...(isEdit ? [{ label: lote?.nombre_numero, href: `/dashboard/lotes/${id}` }] : []),
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      {/* Banner de registros existentes */}
      {hasRecords && (
        <div className="mb-5">
          <InfoBox type="warning">
            <p className="font-semibold mb-1">Edición parcialmente bloqueada</p>
            <p>
              Este lote ya tiene registros operativos ({resumenRegistros}).
              Los campos críticos están bloqueados para preservar la integridad del historial.
              Solo puedes modificar el nombre, la raza y las notas.
            </p>
          </InfoBox>
        </div>
      )}

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-6">

        {/* Form header */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${isEdit ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-green-400 to-emerald-600'}`}>
            <Layers className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
              {isEdit ? 'Modificar datos del lote' : 'Registrar nuevo lote'}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              {nombreLote || 'Completa los campos para continuar'}
            </p>
          </div>
        </div>

        {/* ── Sección: Identificación ── */}
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
            {hasRecords ? (
              <LockedField label="Fecha de ingreso" value={formatDate(lote?.fecha_ingreso)} />
            ) : (
              <Input
                label="Fecha de ingreso"
                type="date"
                error={errors.fecha_ingreso?.message}
                {...register('fecha_ingreso')}
              />
            )}
          </div>
        </div>

        {/* ── Sección: Galpón y aves ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Galpón y aves
          </div>

          {hasRecords ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LockedField label="Galpón asignado" value={lote?.galpon?.nombre} />
              <LockedField
                label="Cantidad inicial de aves"
                value={lote?.cantidad_inicial_aves != null ? formatNumber(lote.cantidad_inicial_aves) : undefined}
              />
            </div>
          ) : (
            <>
              <Select
                label="Galpón de destino"
                options={(galpones || []).map(g => ({
                  value: g.id,
                  label: `${g.nombre} — cap. ${g.capacidad_maxima.toLocaleString('es-CO')} aves`,
                }))}
                placeholder="Seleccionar galpón"
                error={errors.galpon_id?.message}
                {...register('galpon_id')}
              />

              {loteActivoEnGalpon && (
                <InfoBox type="error">
                  El galpón ya tiene el lote <strong>"{loteActivoEnGalpon.nombre_numero}"</strong> activo.{' '}
                  {isEdit ? 'Selecciona otro galpón o cancela.' : 'Finalízalo antes de crear uno nuevo.'}
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

              {galponSeleccionado && cantidadAves > 0 && !loteActivoEnGalpon && (
                <CapacityBar aves={cantidadAves} capacidad={galponSeleccionado.capacidad_maxima} />
              )}

              {superaCapacidad && (
                <InfoBox type="error">
                  La cantidad ingresada supera la capacidad máxima del galpón ({galponSeleccionado.capacidad_maxima.toLocaleString('es-CO')} aves).
                </InfoBox>
              )}
            </>
          )}
        </div>

        {/* ── Sección: Raza ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <Bird className="h-3.5 w-3.5" aria-hidden="true" />
            Raza (opcional)
          </div>
          <div className="w-full">
            <label className="label">Raza de las aves</label>
            <select className="input-base" {...register('raza_id')}>
              <option value="">Sin raza definida</option>
              {(razas || []).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* ── Notas ── */}
        <Textarea
          label="Notas adicionales (opcional)"
          placeholder="Observaciones sobre el lote, procedencia, condiciones especiales…"
          rows={3}
          {...register('notas')}
        />

        {/* ── Acciones ── */}
        <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <Button
            type="submit"
            loading={mutation.isPending || isSubmitting}
            disabled={!hasRecords && formularioBloqueado}
          >
            {isEdit ? 'Guardar cambios' : 'Crear lote'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEdit ? `/dashboard/lotes/${id}` : '/dashboard/lotes')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
