import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { calcPostura } from '../../../lib/utils'
import { useConfig } from '../../../context/ConfigContext'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  Egg, AlertCircle, CheckCircle2, Info, Layers,
  Clock, AlertTriangle, Building2, CalendarDays,
  Wheat, FileText, TrendingUp,
} from 'lucide-react'

const schema = z.object({
  fecha:               z.string().min(1, 'Requerido'),
  galpon_id:           z.string().min(1, 'Selecciona un galpón'),
  huevos_producidos:   z.coerce.number().int().nonnegative('Debe ser 0 o más'),
  consumo_alimento_kg: z.coerce.number().nonnegative('Debe ser 0 o más'),
  observaciones:       z.string().optional(),
})

function msDesdeCreacion(created_at) {
  if (!created_at) return 0
  return Date.now() - new Date(created_at).getTime()
}

function InfoBox({ type = 'info', icon: Icon, children }) {
  const styles = {
    info:    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300',
    error:   'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-300',
  }
  const IconMap = { info: Info, success: CheckCircle2, error: AlertCircle, warning: AlertCircle }
  const I = Icon || IconMap[type]
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      <I className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

function FormSection({ icon: Icon, title, gradient, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h2>
      </div>
      {children}
    </div>
  )
}

/* ── Gauge de postura ── */
function PosturaGauge({ value }) {
  const { config } = useConfig()
  if (value === null) return null
  const { postura_excelente: exc, postura_buena: bue } = config.produccion
  const color = value >= exc ? 'text-emerald-500' : value >= bue ? 'text-amber-500' : 'text-red-500'
  const bar   = value >= exc ? 'bg-emerald-500' : value >= bue ? 'bg-amber-500' : 'bg-red-500'
  const label = value >= exc ? 'Excelente' : value >= bue ? 'Buena' : 'Baja'
  const pct   = Math.min(value, 100)

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <p className="text-xs text-stone-500 dark:text-stone-400">% de postura</p>
        <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}%</p>
      </div>
      <div className="h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className={`font-semibold ${color}`}>{label}</span>
        <span className="text-stone-400 dark:text-stone-500">meta: {exc}%</span>
      </div>
    </div>
  )
}

/* ── Preview card ── */
function PreviewCard({
  fecha, galponNombre, loteNombre, avesRef, razaNombre,
  huevos, consumo, posturaCalc, fueraDePlazo,
  horasRestantes, minutosRestantes, isEdit, hasLote, duplicado, superaAves,
}) {
  const checks = isEdit ? [
    { ok: !!fecha,            text: 'Fecha definida' },
    { ok: Number(huevos) >= 0 && huevos !== '', text: 'Huevos ingresados' },
    { ok: Number(consumo) >= 0 && consumo !== '', text: 'Consumo de alimento' },
  ] : [
    { ok: !!fecha,      text: 'Fecha seleccionada' },
    { ok: !!galponNombre, text: 'Galpón seleccionado' },
    { ok: hasLote,      text: 'Lote activo disponible' },
    { ok: Number(huevos) >= 0 && huevos !== '', text: 'Huevos ingresados' },
    { ok: !duplicado,   text: 'Sin registro duplicado' },
    { ok: !superaAves,  text: 'Cantidad válida' },
  ]

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Mini tarjeta del registro */}
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Egg className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {galponNombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Galpón sin seleccionar</span>}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {loteNombre
                  ? <>{loteNombre}{razaNombre && ` · ${razaNombre}`}</>
                  : <span className="italic">Sin lote activo</span>
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Fecha</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5">
                {fecha
                  ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : <span className="font-normal italic text-stone-400">—</span>
                }
              </p>
            </div>
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Aves activas</p>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mt-0.5 tabular-nums">
                {avesRef ? avesRef.toLocaleString('es-CO') : <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Huevos</p>
              <p className={`text-lg font-bold tabular-nums leading-none mt-0.5 ${superaAves ? 'text-red-500' : 'text-stone-800 dark:text-stone-100'}`}>
                {huevos !== '' && huevos !== undefined ? Number(huevos).toLocaleString('es-CO') : '—'}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Alimento</p>
              <p className="text-lg font-bold tabular-nums leading-none mt-0.5 text-stone-800 dark:text-stone-100">
                {consumo !== '' && consumo !== undefined ? `${Number(consumo).toLocaleString('es-CO')} kg` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Gauge de postura */}
        {posturaCalc !== null && !superaAves && (
          <div className="border border-stone-100 dark:border-stone-800 rounded-xl p-3">
            <PosturaGauge value={posturaCalc} />
          </div>
        )}

        {/* Tiempo restante */}
        {isEdit && !fueraDePlazo && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
            <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Ventana de edición</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 tabular-nums">
                {horasRestantes}h {minutosRestantes}min restantes
              </p>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Estado</p>
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
    </div>
  )
}

/* ── Main component ── */
export default function ProduccionForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()
  const [posturaCalc, setPosturaCalc]     = useState(null)
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

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const galponId = watch('galpon_id')
  const huevos   = watch('huevos_producidos')
  const consumo  = watch('consumo_alimento_kg')
  const fecha    = watch('fecha')
  const observaciones = watch('observaciones')

  /* ── Registro existente (solo edición) ── */
  const { data: registro } = useQuery({
    queryKey: ['produccion-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('produccion')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales, raza:razas(nombre))')
        .eq('id', id)
        .single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (!registro) return
    reset({
      fecha:               registro.fecha,
      galpon_id:           registro.galpon_id,
      huevos_producidos:   registro.huevos_producidos,
      consumo_alimento_kg: registro.consumo_alimento_kg ?? 0,
      observaciones:       registro.observaciones || '',
    })
  }, [registro, reset])

  /* ── Ventana de edición ── */
  const msTranscurridos  = msDesdeCreacion(registro?.created_at)
  const fueraDePlazo     = isEdit && !isAdmin && msTranscurridos > 24 * 3600 * 1000
  const msRestantes      = Math.max(0, 24 * 3600 * 1000 - msTranscurridos)
  const horasRestantes   = Math.floor(msRestantes / 3600000)
  const minutosRestantes = Math.floor((msRestantes % 3600000) / 60000)

  /* ── Galpones (solo creación) ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'en_produccion').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil && !isEdit,
  })

  /* ── Lote activo del galpón (solo creación) ── */
  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase.from('lotes')
        .select('id, nombre_numero, cantidad_aves_actuales, raza:razas(nombre)')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId && !isEdit,
  })

  /* ── Fechas registradas del galpón (validación local de duplicado) ── */
  const { data: fechasRegistradas } = useQuery({
    queryKey: ['produccion-fechas', galponId],
    queryFn: async () => {
      const { data } = await supabase
        .from('produccion')
        .select('id, fecha')
        .eq('galpon_id', galponId)
      return new Set((data || []).filter(r => r.id !== id).map(r => r.fecha))
    },
    enabled: !!galponId,
    staleTime: 30_000,
  })

  const duplicado = fechasRegistradas?.has(fecha) ? true : null

  const avesRef    = isEdit ? registro?.lote?.cantidad_aves_actuales : loteActivo?.cantidad_aves_actuales
  const superaAves = avesRef && Number(huevos) > avesRef

  useEffect(() => {
    if (avesRef && Number(huevos) >= 0) {
      setPosturaCalc(calcPostura(Number(huevos), avesRef))
    } else {
      setPosturaCalc(null)
    }
  }, [huevos, avesRef])

  /* ── Redirect si fuera de plazo ── */
  const redirectedRef = useRef(false)
  useEffect(() => {
    if (isEdit && !isAdmin && registro && fueraDePlazo && !redirectedRef.current) {
      redirectedRef.current = true
      toast.error('El período de edición de 24 horas ha vencido.')
      navigate(`/dashboard/produccion/${id}`, { replace: true })
    }
  }, [isEdit, isAdmin, registro, fueraDePlazo, navigate, id])

  const isDisabled = fueraDePlazo || !!duplicado || (!isEdit && (!loteActivo || !!superaAves))

  /* ── Preview data ── */
  const previewGalponNombre = isEdit ? registro?.galpon?.nombre : (galpones || []).find(g => g.id === galponId)?.nombre
  const previewLoteNombre   = isEdit ? registro?.lote?.nombre_numero : loteActivo?.nombre_numero
  const previewRazaNombre   = isEdit ? registro?.lote?.raza?.nombre  : loteActivo?.raza?.nombre

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        if (fueraDePlazo) throw new Error('El período de edición de 24 horas ha vencido')
        if (duplicado)    throw new Error('Ya existe un registro de producción para este galpón en esa fecha')

        const postura = calcPostura(values.huevos_producidos, registro.lote?.cantidad_aves_actuales)

        const datosAnteriores = {
          huevos_producidos:   registro.huevos_producidos,
          consumo_alimento_kg: registro.consumo_alimento_kg ?? null,
          porcentaje_postura:  registro.porcentaje_postura  ?? null,
          observaciones:       registro.observaciones       ?? null,
        }
        const datosNuevos = {
          huevos_producidos:   values.huevos_producidos,
          consumo_alimento_kg: values.consumo_alimento_kg ?? null,
          porcentaje_postura:  postura,
          observaciones:       values.observaciones || null,
        }

        const { error: errUpd } = await supabase
          .from('produccion')
          .update({
            huevos_producidos:   values.huevos_producidos,
            consumo_alimento_kg: values.consumo_alimento_kg,
            observaciones:       values.observaciones || null,
            porcentaje_postura:  postura,
          })
          .eq('id', id)
        if (errUpd) throw errUpd

        const { error: errAud } = await supabase
          .from('auditoria_produccion')
          .insert({
            produccion_id:    id,
            editado_por:      perfil.id,
            datos_anteriores: datosAnteriores,
            datos_nuevos:     datosNuevos,
          })
        if (errAud) throw errAud

      } else {
        if (!loteActivo) throw new Error('No hay lote activo en este galpón')
        if (superaAves)  throw new Error(`Los huevos (${values.huevos_producidos}) no pueden superar las aves activas (${loteActivo.cantidad_aves_actuales})`)

        const { data: dupCheck } = await supabase
          .from('produccion')
          .select('id')
          .eq('galpon_id', values.galpon_id)
          .eq('fecha', values.fecha)
          .maybeSingle()
        if (dupCheck) throw new Error('Ya existe un registro de producción para este galpón en esta fecha')

        const postura = calcPostura(values.huevos_producidos, loteActivo.cantidad_aves_actuales)
        const { error } = await supabase.from('produccion').insert({
          ...values,
          lote_id:            loteActivo.id,
          porcentaje_postura: postura,
          registrado_por:     perfil.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produccion'] })
      qc.invalidateQueries({ queryKey: ['produccion-detalle', id] })
      qc.invalidateQueries({ queryKey: ['auditoria-produccion', id] })
      toast.success(isEdit ? 'Registro actualizado correctamente' : 'Producción registrada correctamente')
      navigate(isEdit ? `/dashboard/produccion/${id}` : '/dashboard/produccion')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar producción' : 'Registrar producción'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Producción', href: '/dashboard/produccion' },
          { label: isEdit ? 'Editar' : 'Nuevo registro' },
        ]}
      />

      {/* Banner: fuera de plazo */}
      {isEdit && fueraDePlazo && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>El período de edición de 24 horas ha vencido. Este registro ya no puede modificarse.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario principal (2/3) ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-2 card p-6 space-y-7"
        >
          {/* Form header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <Egg className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar registro de producción' : 'Nuevo registro de producción'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {isEdit ? 'Modifica los campos que necesites corregir' : 'Completa todos los campos requeridos'}
              </p>
            </div>
          </div>

          {/* ── Sección: Fecha y galpón ── */}
          <FormSection icon={CalendarDays} title="Fecha y galpón" gradient="from-blue-400 to-blue-600">
            {isEdit ? (
              <div className="space-y-4">
                <Input
                  label="Fecha"
                  type="date"
                  error={errors.fecha?.message}
                  disabled={fueraDePlazo}
                  {...register('fecha')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-stone-400 dark:text-stone-500">Galpón</p>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 mt-0.5">{registro?.galpon?.nombre || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 dark:text-stone-500">Lote</p>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 mt-0.5">{registro?.lote?.nombre_numero || '—'}</p>
                  </div>
                  {registro?.lote?.raza?.nombre && (
                    <div>
                      <p className="text-xs text-stone-400 dark:text-stone-500">Raza</p>
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 mt-0.5">{registro.lote.raza.nombre}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-stone-400 dark:text-stone-500">Aves activas</p>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5 tabular-nums">
                      {avesRef?.toLocaleString('es-CO') ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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

                {galponId && loteActivo && (
                  <div className="flex items-start gap-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Layers className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Lote activo: {loteActivo.nombre_numero}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')} aves activas
                        {loteActivo.raza?.nombre && <> · Raza: <strong>{loteActivo.raza.nombre}</strong></>}
                      </p>
                    </div>
                  </div>
                )}
                {galponId && !loteActivo && (
                  <InfoBox type="error">
                    Este galpón no tiene un lote activo. Crea un lote antes de registrar producción.
                  </InfoBox>
                )}
              </div>
            )}

            {duplicado && (
              <InfoBox type="error">
                Ya existe un registro de producción para este galpón en la fecha seleccionada.
              </InfoBox>
            )}
          </FormSection>

          {/* ── Sección: Producción del día ── */}
          <FormSection icon={Egg} title="Producción del día" gradient="from-amber-400 to-amber-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Huevos producidos"
                  type="number"
                  min="0"
                  placeholder="0"
                  error={errors.huevos_producidos?.message}
                  disabled={fueraDePlazo}
                  {...register('huevos_producidos')}
                />
                {superaAves && !fueraDePlazo && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                    No puede superar las {avesRef?.toLocaleString('es-CO')} aves activas
                  </p>
                )}
              </div>
              <Input
                label="Consumo de alimento (kg)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                error={errors.consumo_alimento_kg?.message}
                disabled={fueraDePlazo}
                {...register('consumo_alimento_kg')}
              />
            </div>

            {posturaCalc !== null && !superaAves && !fueraDePlazo && (
              <div className="border border-stone-100 dark:border-stone-800 rounded-xl p-4">
                <PosturaGauge value={posturaCalc} />
              </div>
            )}
          </FormSection>

          {/* ── Sección: Observaciones ── */}
          <FormSection icon={FileText} title="Observaciones" gradient="from-stone-400 to-stone-600">
            <Textarea
              label="Observaciones (opcional)"
              placeholder="Anota cualquier novedad relevante del día…"
              rows={3}
              disabled={fueraDePlazo}
              {...register('observaciones')}
            />
          </FormSection>

          {/* ── Acciones ── */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            {!fueraDePlazo && (
              <Button
                type="submit"
                loading={mutation.isPending || isSubmitting}
                disabled={isDisabled}
              >
                {isEdit ? 'Guardar cambios' : 'Guardar registro'}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? `/dashboard/produccion/${id}` : '/dashboard/produccion')}
            >
              {fueraDePlazo ? 'Volver' : 'Cancelar'}
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          fecha={fecha}
          galponNombre={previewGalponNombre}
          loteNombre={previewLoteNombre}
          avesRef={avesRef}
          razaNombre={previewRazaNombre}
          huevos={huevos}
          consumo={consumo}
          posturaCalc={posturaCalc}
          fueraDePlazo={fueraDePlazo}
          horasRestantes={horasRestantes}
          minutosRestantes={minutosRestantes}
          isEdit={isEdit}
          hasLote={!!loteActivo}
          duplicado={!!duplicado}
          superaAves={!!superaAves}
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
              {
                label: 'Fecha',
                oldVal: registro?.fecha,
                newVal: pendingValues?.fecha,
                format: v => v
                  ? new Date(v + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—',
              },
              {
                label: 'Huevos producidos',
                oldVal: registro?.huevos_producidos,
                newVal: pendingValues ? Number(pendingValues.huevos_producidos) : null,
                format: v => v != null ? Number(v).toLocaleString('es-CO') : '—',
              },
              {
                label: 'Consumo de alimento (kg)',
                oldVal: registro?.consumo_alimento_kg ?? 0,
                newVal: pendingValues ? Number(pendingValues.consumo_alimento_kg) : null,
                format: v => v != null ? `${Number(v).toLocaleString('es-CO')} kg` : '—',
              },
              {
                label: 'Observaciones',
                oldVal: registro?.observaciones || '',
                newVal: pendingValues?.observaciones || '',
                format: v => v || '—',
              },
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
