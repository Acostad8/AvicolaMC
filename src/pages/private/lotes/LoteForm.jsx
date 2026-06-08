import { useEffect, useState } from 'react'
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
import Modal from '../../../components/ui/Modal'
import PageHeader from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import {
  Layers, Building2, Bird, AlertCircle, CheckCircle2,
  Info, Lock, CalendarDays, Hash, FileText, Shuffle,
} from 'lucide-react'
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

const schemaEditar = z.object({
  nombre_numero:         z.string().min(1, 'Requerido'),
  estado:                z.enum(['activo', 'suspendido', 'finalizado']).optional(),
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
  const Icon  = icons[type]
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
  const color = over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
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

function FormSection({ icon: Icon, title, gradient, badge, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
  )
}

function PreviewCard({ nombreLote, fechaIngreso, galponNombre, galponCapacidad, cantidadAves, razaNombre, notas, hasRecords, isEdit }) {
  const pct   = galponCapacidad > 0 ? Math.min((cantidadAves / galponCapacidad) * 100, 100) : 0
  const over  = cantidadAves > galponCapacidad && galponCapacidad > 0
  const barColor = over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const gradient = isEdit ? 'from-amber-400 to-amber-600' : 'from-emerald-400 to-emerald-600'
  const border   = isEdit ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20' : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20'

  const checks = [
    { ok: nombreLote?.length > 0,  text: 'Nombre / número del lote' },
    { ok: !!galponNombre,           text: 'Galpón seleccionado' },
    { ok: cantidadAves > 0,         text: 'Cantidad de aves definida' },
    { ok: !!fechaIngreso,           text: 'Fecha de ingreso registrada' },
    { ok: !!razaNombre,             text: 'Raza especificada' },
    { ok: notas?.length > 0,        text: 'Notas agregadas' },
  ]

  return (
    <div className="space-y-4 h-fit">
      {/* Preview card */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        <div className={`rounded-xl border-2 p-4 space-y-3 transition-all duration-300 ${border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br ${gradient}`}>
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-base leading-tight truncate">
                {nombreLote || <span className="italic font-normal text-stone-400 dark:text-stone-600">Nombre del lote</span>}
              </p>
              {razaNombre
                ? <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{razaNombre}</p>
                : <p className="text-xs text-stone-400 dark:text-stone-600 mt-0.5 italic">Sin raza</p>
              }
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Galpón</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5 truncate">
                {galponNombre || <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Fecha ingreso</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5">
                {fechaIngreso ? formatDate(fechaIngreso) : <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Aves</p>
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums leading-none">
              {cantidadAves > 0 ? cantidadAves.toLocaleString('es-CO') : '—'}
            </p>
            {galponCapacidad > 0 && cantidadAves > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className={`text-[10px] mt-1 tabular-nums ${over ? 'text-red-500 font-semibold' : 'text-stone-400'}`}>
                  {over ? `${(cantidadAves - galponCapacidad).toLocaleString('es-CO')} sobre cap. máx.` : `${pct.toFixed(1)}% de capacidad`}
                </p>
              </div>
            )}
          </div>

          {notas && (
            <p className="text-xs text-stone-500 dark:text-stone-400 italic line-clamp-2 border-t border-stone-100 dark:border-stone-700 pt-2">{notas}</p>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Completado</p>
          <div className="space-y-1.5">
            {checks.map(({ ok, text }) => (
              <div key={text} className="flex items-center gap-2">
                {ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  : <AlertCircle  className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                }
                <span className={`text-xs ${ok ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-600'}`}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Locked notice */}
      {hasRecords && (
        <div className="card p-4">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 leading-tight">Edición parcial</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                Este lote tiene registros operativos. Los campos críticos están bloqueados para proteger el historial.
              </p>
            </div>
          </div>
        </div>
      )}
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
  const fechaIngreso = watch('fecha_ingreso')
  const razaId       = watch('raza_id')
  const notas        = watch('notas')
  const estadoActual = watch('estado')

  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [pendingValues, setPendingValues] = useState(null)

  const onSubmit = (values) => {
    if (isEdit) {
      setPendingValues(values)
      setConfirmOpen(true)
    } else {
      mutation.mutate(values)
    }
  }

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
        estado:                lote.estado,
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
      let q = supabase.from('galpones').select('id, nombre, capacidad_maxima').eq('estado', 'disponible').order('nombre')
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

  /* ── Verificar si el galpón seleccionado ya tiene un lote activo ── */
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

  const galponSeleccionado  = (galpones || []).find(g => g.id === galponId)
  const razaSeleccionada    = (razas     || []).find(r => r.id === razaId)
  const superaCapacidad     = !hasRecords && galponSeleccionado && cantidadAves > galponSeleccionado.capacidad_maxima
  const formularioBloqueado = (!!loteActivoEnGalpon || !!superaCapacidad) && !hasRecords

  /* ── Preview data ── */
  const previewGalponNombre   = hasRecords ? lote?.galpon?.nombre   : galponSeleccionado?.nombre
  const previewGalponCapacidad = hasRecords ? lote?.galpon?.capacidad_maxima ?? 0 : galponSeleccionado?.capacidad_maxima ?? 0
  const previewCantidadAves   = hasRecords ? lote?.cantidad_inicial_aves ?? 0 : cantidadAves
  const previewFechaIngreso   = hasRecords ? lote?.fecha_ingreso : fechaIngreso
  const previewRazaNombre     = hasRecords ? lote?.raza?.nombre : razaSeleccionada?.nombre

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        const payload = {
          nombre_numero: values.nombre_numero,
          raza_id:       values.raza_id || null,
          notas:         values.notas   || null,
        }

        if (isAdmin && values.estado && values.estado !== lote.estado) {
          payload.estado = values.estado
          if (values.estado === 'finalizado' && !lote.fecha_salida) {
            payload.fecha_salida = new Date().toISOString().slice(0, 10)
          }
          if (values.estado === 'activo' && lote.estado === 'finalizado') {
            payload.fecha_salida = null
          }
        }

        if (!hasRecords) {
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
      qc.invalidateQueries({ queryKey: ['lotes'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['lote', id] })
      toast.success(isEdit ? 'Lote actualizado correctamente' : 'Lote creado correctamente')
      navigate(isEdit ? `/dashboard/lotes/${id}` : '/dashboard/lotes')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  /* ── Skeleton ── */
  if (isEdit && (loteLoading || conteoLoading)) {
    return (
      <div className="w-full space-y-5">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6 space-y-5">
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
          <div className="card p-5 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
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

  const resumenRegistros = isEdit && conteo && [
    conteo.produccion   > 0 && `${conteo.produccion} de producción`,
    conteo.mortalidad   > 0 && `${conteo.mortalidad} de mortalidad`,
    conteo.tratamientos > 0 && `${conteo.tratamientos} de tratamiento`,
  ].filter(Boolean).join(', ')

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? `Editar: ${lote?.nombre_numero}` : 'Nuevo lote'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lotes', href: '/dashboard/lotes' },
          ...(isEdit ? [{ label: lote?.nombre_numero, href: `/dashboard/lotes/${id}` }] : []),
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      {hasRecords && (
        <InfoBox type="warning">
          <p className="font-semibold mb-1">Edición parcialmente bloqueada</p>
          <p>
            Este lote ya tiene registros operativos ({resumenRegistros}).
            Los campos críticos están bloqueados para preservar la integridad del historial.
            Solo puedes modificar el nombre, la raza y las notas.
          </p>
        </InfoBox>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario principal (2/3) ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-2 card p-6 space-y-7"
        >
          {/* Form header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${isEdit ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
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

          {/* ── Identificación ── */}
          <FormSection
            icon={Hash}
            title="Identificación"
            gradient="from-emerald-400 to-emerald-600"
          >
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
          </FormSection>

          {/* ── Estado (solo edición, solo admin) ── */}
          {isEdit && isAdmin && (
            <FormSection
              icon={Shuffle}
              title="Estado del lote"
              gradient="from-violet-400 to-violet-600"
            >
              <div className="space-y-3">
                <Select
                  label="Estado"
                  options={[
                    { value: 'activo',      label: 'Activo — en producción normal' },
                    { value: 'suspendido',  label: 'Suspendido — sin operaciones temporalmente' },
                    { value: 'finalizado',  label: 'Finalizado — ciclo productivo cerrado' },
                  ]}
                  error={errors.estado?.message}
                  {...register('estado')}
                />
                {estadoActual === 'finalizado' && lote?.estado !== 'finalizado' && (
                  <InfoBox type="warning">
                    Al finalizar el lote se registrará la fecha de salida de hoy y el galpón quedará disponible para un nuevo lote.
                  </InfoBox>
                )}
                {estadoActual === 'activo' && lote?.estado === 'finalizado' && (
                  <InfoBox type="warning">
                    Reactivar un lote finalizado borrará su fecha de salida. Úsalo solo si el cierre fue un error.
                  </InfoBox>
                )}
              </div>
            </FormSection>
          )}

          {/* ── Galpón y aves ── */}
          <FormSection
            icon={Building2}
            title="Galpón y aves"
            gradient="from-blue-400 to-blue-600"
            badge={
              hasRecords && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  Bloqueado
                </span>
              )
            }
          >
            {hasRecords ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LockedField label="Galpón asignado" value={lote?.galpon?.nombre} />
                <LockedField
                  label="Cantidad inicial de aves"
                  value={lote?.cantidad_inicial_aves != null ? formatNumber(lote.cantidad_inicial_aves) : undefined}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
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
                  </div>
                  <div>
                    <Input
                      label="Cantidad inicial de aves"
                      type="number"
                      min="1"
                      placeholder="Ej: 5000"
                      error={errors.cantidad_inicial_aves?.message}
                      {...register('cantidad_inicial_aves')}
                    />
                  </div>
                </div>

                {loteActivoEnGalpon && (
                  <InfoBox type="error">
                    El galpón ya tiene el lote <strong>"{loteActivoEnGalpon.nombre_numero}"</strong> activo.{' '}
                    {isEdit ? 'Selecciona otro galpón o cancela.' : 'Finalízalo antes de crear uno nuevo.'}
                  </InfoBox>
                )}

                {galponSeleccionado && cantidadAves > 0 && !loteActivoEnGalpon && (
                  <CapacityBar aves={cantidadAves} capacidad={galponSeleccionado.capacidad_maxima} />
                )}

                {superaCapacidad && (
                  <InfoBox type="error">
                    La cantidad ingresada supera la capacidad máxima del galpón ({galponSeleccionado.capacidad_maxima.toLocaleString('es-CO')} aves).
                  </InfoBox>
                )}
              </div>
            )}
          </FormSection>

          {/* ── Raza y notas ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={Bird} title="Raza (opcional)" gradient="from-violet-400 to-violet-600">
              <div className="space-y-1.5">
                <label className="label">Raza de las aves</label>
                <select className="input-base" {...register('raza_id')}>
                  <option value="">Sin raza definida</option>
                  {(razas || []).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
            </FormSection>

            <FormSection icon={FileText} title="Notas" gradient="from-stone-400 to-stone-600">
              <Textarea
                label="Notas adicionales (opcional)"
                placeholder="Observaciones, procedencia, condiciones especiales…"
                rows={3}
                {...register('notas')}
              />
            </FormSection>
          </div>

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

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          nombreLote={nombreLote}
          fechaIngreso={previewFechaIngreso}
          galponNombre={previewGalponNombre}
          galponCapacidad={previewGalponCapacidad}
          cantidadAves={previewCantidadAves}
          razaNombre={previewRazaNombre}
          notas={notas}
          hasRecords={hasRecords}
          isEdit={isEdit}
        />
      </div>

      {/* ── Modal de confirmación (solo edición) ── */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar cambios"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => { setConfirmOpen(false); mutation.mutate(pendingValues) }}
              loading={mutation.isPending}
            >
              Confirmar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">Revisa los cambios antes de guardar:</p>
          <div className="space-y-2">
            {[
              { label: 'Nombre / N° de lote', oldVal: lote?.nombre_numero || '', newVal: pendingValues?.nombre_numero || '', format: v => v || '—' },
              ...(isAdmin ? [{ label: 'Estado', oldVal: lote?.estado || '', newVal: pendingValues?.estado || '', format: v => ({ activo: 'Activo', suspendido: 'Suspendido', finalizado: 'Finalizado' })[v] || v || '—' }] : []),
              { label: 'Raza', oldVal: lote?.raza_id || '', newVal: pendingValues?.raza_id || '', format: v => (razas || []).find(r => r.id === v)?.nombre || (!v ? '—' : v) },
              { label: 'Notas', oldVal: lote?.notas || '', newVal: pendingValues?.notas || '', format: v => v || '—' },
              ...(!hasRecords ? [
                { label: 'Galpón', oldVal: lote?.galpon_id || '', newVal: pendingValues?.galpon_id || '', format: v => (galpones || []).find(g => g.id === v)?.nombre || (!v ? '—' : v) },
                { label: 'Cantidad inicial de aves', oldVal: lote?.cantidad_inicial_aves, newVal: pendingValues ? Number(pendingValues.cantidad_inicial_aves) : null, format: v => v != null ? Number(v).toLocaleString('es-CO') : '—' },
                { label: 'Fecha de ingreso', oldVal: lote?.fecha_ingreso || '', newVal: pendingValues?.fecha_ingreso || '', format: v => v ? formatDate(v) : '—' },
              ] : []),
            ].map(({ label, oldVal, newVal, format }) => {
              const changed = String(oldVal ?? '') !== String(newVal ?? '')
              return (
                <div
                  key={label}
                  className={`rounded-xl border px-4 py-3 ${
                    changed
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20'
                      : 'border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30'
                  }`}
                >
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{label}</p>
                  {changed ? (
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="line-through text-stone-400 dark:text-stone-500">{format(oldVal)}</span>
                      <span className="text-stone-400">→</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-100">{format(newVal)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-600 dark:text-stone-300">{format(oldVal)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}
