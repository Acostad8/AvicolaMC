import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import Modal from '../../../components/ui/Modal'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  Clock, AlertTriangle, Skull, Building2, Layers,
  CheckCircle2, AlertCircle, TrendingDown, Bird,
} from 'lucide-react'

const schema = z.object({
  fecha:          z.string().min(1, 'Requerido'),
  galpon_id:      z.string().min(1, 'Selecciona un galpón'),
  cantidad_bajas: z.coerce.number().int().positive('Debe ser mayor a 0'),
  causa:          z.string().min(1, 'Selecciona una causa'),
  causa_otra:     z.string().optional(),
  observaciones:  z.string().optional(),
})

function msDesdeCreacion(created_at) {
  if (!created_at) return Infinity
  return Date.now() - new Date(created_at).getTime()
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

function PreviewCard({
  fecha, galponNombre, loteNombre, avesActuales, topeDisponible,
  cantidadBajas, causaLabel, isEdit, hasLote, superaBajas,
}) {
  const bajas    = Number(cantidadBajas) || 0
  const avesPost = Math.max(0, topeDisponible - bajas)
  const pctSup   = topeDisponible > 0 ? (bajas / topeDisponible) * 100 : 0
  const barColor = pctSup > 20 ? 'bg-red-500' : pctSup > 10 ? 'bg-amber-500' : 'bg-emerald-500'

  const checks = isEdit ? [
    { ok: !!fecha,          text: 'Fecha definida' },
    { ok: bajas > 0,        text: 'Cantidad de bajas ingresada' },
    { ok: !!causaLabel,     text: 'Causa seleccionada' },
    { ok: !superaBajas,     text: 'Cantidad dentro del límite' },
  ] : [
    { ok: !!fecha,          text: 'Fecha seleccionada' },
    { ok: !!galponNombre,   text: 'Galpón seleccionado' },
    { ok: hasLote,          text: 'Lote activo disponible' },
    { ok: bajas > 0,        text: 'Cantidad de bajas ingresada' },
    { ok: !!causaLabel,     text: 'Causa seleccionada' },
    { ok: !superaBajas,     text: 'Cantidad dentro del límite' },
  ]

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Tarjeta del registro */}
        <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Skull className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight truncate">
                {galponNombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Galpón sin seleccionar</span>}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {loteNombre ? loteNombre : <span className="italic">Sin lote activo</span>}
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
              <p className="text-xs text-stone-400 dark:text-stone-500">Causa</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5 truncate">
                {causaLabel || <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
          </div>

          {/* Impacto en aves */}
          {topeDisponible > 0 && (
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Impacto en el lote</span>
                <span className={`font-bold tabular-nums ${superaBajas ? 'text-red-500' : 'text-stone-700 dark:text-stone-300'}`}>
                  -{bajas > 0 ? bajas.toLocaleString('es-CO') : 0} aves
                </span>
              </div>
              <div className="h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(pctSup, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>{topeDisponible.toLocaleString('es-CO')} disponibles</span>
                <span className={bajas > 0 ? 'font-semibold text-stone-700 dark:text-stone-200' : ''}>
                  → {avesPost.toLocaleString('es-CO')} restantes
                </span>
              </div>
            </div>
          )}
        </div>

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
                <span className={`text-xs ${ok ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-600'}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MortalidadForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const galponId      = watch('galpon_id')
  const causa         = watch('causa')
  const cantidadBajas = watch('cantidad_bajas')
  const fecha         = watch('fecha')
  const observaciones = watch('observaciones')

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

  /* ── Registro existente (solo edición) ── */
  const { data: registro } = useQuery({
    queryKey: ['mortalidad-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mortalidad')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales)')
        .eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (!registro) return
    reset({
      fecha:          registro.fecha,
      galpon_id:      registro.galpon_id,
      cantidad_bajas: registro.cantidad_bajas,
      causa:          registro.causa,
      causa_otra:     registro.causa_otra || '',
      observaciones:  registro.observaciones || '',
    })
  }, [registro, reset])

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

  /* ── Lote activo (solo creación) ── */
  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase.from('lotes')
        .select('id, nombre_numero, cantidad_aves_actuales')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId && !isEdit,
  })

  const topeDisponible = isEdit
    ? (registro?.lote?.cantidad_aves_actuales ?? 0) + (registro?.cantidad_bajas ?? 0)
    : (loteActivo?.cantidad_aves_actuales ?? 0)

  const superaBajas = Number(cantidadBajas) > topeDisponible && topeDisponible > 0

  /* ── Preview data ── */
  const previewGalponNombre = isEdit ? registro?.galpon?.nombre : (galpones || []).find(g => g.id === galponId)?.nombre
  const previewLoteNombre   = isEdit ? registro?.lote?.nombre_numero : loteActivo?.nombre_numero
  const causaLabel          = CAUSAS_MORTALIDAD.find(c => c.value === causa)?.label

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        if (fueraDePlazo) throw new Error('El período de edición de 24 horas ha vencido')

        const old_bajas = registro.cantidad_bajas
        const new_bajas = Number(values.cantidad_bajas)
        const delta     = new_bajas - old_bajas

        const datosAnteriores = {
          fecha: registro.fecha, cantidad_bajas: old_bajas,
          causa: registro.causa, causa_otra: registro.causa_otra ?? null,
          observaciones: registro.observaciones ?? null,
        }
        const datosNuevos = {
          fecha: values.fecha, cantidad_bajas: new_bajas,
          causa: values.causa, causa_otra: values.causa === 'otra' ? (values.causa_otra || null) : null,
          observaciones: values.observaciones || null,
        }

        const { error: errUpd } = await supabase.from('mortalidad').update({
          fecha: values.fecha, cantidad_bajas: new_bajas,
          causa: values.causa, causa_otra: values.causa === 'otra' ? (values.causa_otra || null) : null,
          observaciones: values.observaciones || null,
        }).eq('id', id)
        if (errUpd) throw errUpd

        if (delta !== 0) {
          const nuevaCantidad = Math.max(0, registro.lote.cantidad_aves_actuales - delta)
          const { error: errLote } = await supabase.from('lotes')
            .update({ cantidad_aves_actuales: nuevaCantidad }).eq('id', registro.lote_id)
          if (errLote) throw errLote
        }

        const { error: errAud } = await supabase.from('auditoria_mortalidad').insert({
          mortalidad_id: id, editado_por: perfil.id,
          datos_anteriores: datosAnteriores, datos_nuevos: datosNuevos,
        })
        if (errAud) throw errAud

      } else {
        if (!loteActivo) throw new Error('No hay lote activo en este galpón')
        if (values.cantidad_bajas > loteActivo.cantidad_aves_actuales) {
          throw new Error(`Las bajas (${values.cantidad_bajas}) no pueden superar las aves activas (${loteActivo.cantidad_aves_actuales})`)
        }
        const { error } = await supabase.from('mortalidad').insert({
          ...values,
          lote_id:        loteActivo.id,
          causa_otra:     values.causa === 'otra' ? values.causa_otra : null,
          registrado_por: perfil.id,
        })
        if (error) throw error

        const nuevaCantidad = Math.max(0, loteActivo.cantidad_aves_actuales - values.cantidad_bajas)
        await supabase.from('lotes').update({ cantidad_aves_actuales: nuevaCantidad }).eq('id', loteActivo.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['mortalidad'])
      qc.invalidateQueries(['mortalidad-detalle', id])
      qc.invalidateQueries(['lotes'])
      toast.success(isEdit ? 'Registro actualizado correctamente' : 'Mortalidad registrada correctamente')
      navigate(isEdit ? `/dashboard/mortalidad/${id}` : '/dashboard/mortalidad')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar mortalidad' : 'Registrar mortalidad'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mortalidad', href: '/dashboard/mortalidad' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      {isEdit && !isAdmin && !fueraDePlazo && registro && (horasRestantes > 0 || minutosRestantes > 0) && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Ventana de edición</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {horasRestantes}h {minutosRestantes}min restantes
            </p>
          </div>
        </div>
      )}

      {isEdit && fueraDePlazo && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>El período de edición de 24 horas ha vencido. Este registro ya no puede modificarse.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 card p-6 space-y-7">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="w-11 h-11 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
              <Skull className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar registro de mortalidad' : 'Nuevo registro de mortalidad'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {isEdit ? 'Modifica los campos necesarios' : 'Registra las bajas del día'}
              </p>
            </div>
          </div>

          {/* ── Fecha y galpón ── */}
          <FormSection icon={Building2} title="Fecha y galpón" gradient="from-blue-400 to-blue-600">
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
                  <div>
                    <p className="text-xs text-stone-400 dark:text-stone-500">Aves disponibles para corrección</p>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5 tabular-nums">{topeDisponible.toLocaleString('es-CO')}</p>
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
                        <span className="tabular-nums font-medium">{loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')}</span> aves disponibles
                      </p>
                    </div>
                  </div>
                )}
                {galponId && !loteActivo && (
                  <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Este galpón no tiene lote activo.</span>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* ── Bajas ── */}
          <FormSection icon={TrendingDown} title="Bajas del día" gradient="from-red-400 to-red-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Cantidad de aves muertas"
                  type="number"
                  min="1"
                  placeholder="0"
                  error={errors.cantidad_bajas?.message}
                  disabled={fueraDePlazo}
                  {...register('cantidad_bajas')}
                />
                {superaBajas && !fueraDePlazo && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                    No puede superar {topeDisponible.toLocaleString('es-CO')} aves disponibles
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Select
                  label="Causa de la mortalidad"
                  options={CAUSAS_MORTALIDAD}
                  placeholder="Seleccionar causa"
                  error={errors.causa?.message}
                  disabled={fueraDePlazo}
                  {...register('causa')}
                />
              </div>
            </div>
            {causa === 'otra' && !fueraDePlazo && (
              <Input
                label="Especifica la causa"
                placeholder="Describe la causa de mortalidad…"
                error={errors.causa_otra?.message}
                {...register('causa_otra')}
              />
            )}
          </FormSection>

          {/* ── Observaciones ── */}
          <FormSection icon={Bird} title="Observaciones" gradient="from-stone-400 to-stone-600">
            <Textarea
              label="Observaciones (opcional)"
              placeholder="Síntomas observados, condiciones del galpón, acciones tomadas…"
              rows={3}
              disabled={fueraDePlazo}
              {...register('observaciones')}
            />
          </FormSection>

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            {!fueraDePlazo && (
              <Button
                type="submit"
                loading={mutation.isPending || isSubmitting}
                disabled={isEdit ? superaBajas : (!loteActivo || superaBajas)}
              >
                {isEdit ? 'Guardar cambios' : 'Guardar registro'}
              </Button>
            )}
            <Button type="button" variant="secondary"
              onClick={() => navigate(isEdit ? `/dashboard/mortalidad/${id}` : '/dashboard/mortalidad')}>
              {fueraDePlazo ? 'Volver' : 'Cancelar'}
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          fecha={fecha}
          galponNombre={previewGalponNombre}
          loteNombre={previewLoteNombre}
          topeDisponible={topeDisponible}
          cantidadBajas={cantidadBajas}
          causaLabel={causaLabel}
          isEdit={isEdit}
          hasLote={isEdit ? true : !!loteActivo}
          superaBajas={superaBajas}
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
                label: 'Cantidad de bajas',
                oldVal: registro?.cantidad_bajas,
                newVal: pendingValues ? Number(pendingValues.cantidad_bajas) : null,
                format: v => v != null ? Number(v).toLocaleString('es-CO') : '—',
              },
              {
                label: 'Causa',
                oldVal: registro?.causa,
                newVal: pendingValues?.causa,
                format: v => CAUSAS_MORTALIDAD.find(c => c.value === v)?.label || v || '—',
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
