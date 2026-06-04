import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { TIPOS_TRATAMIENTO } from '../../../lib/utils'
import {
  FlaskConical, Info, Building2, Layers, CheckCircle2,
  AlertCircle, AlertTriangle, Package, User, CalendarDays, Activity,
} from 'lucide-react'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const CATEGORIAS_TRATAMIENTO = ['medicamento', 'vacuna', 'desinfectante', 'otro']

const CATEGORIAS_SUGERIDAS = {
  vacunacion:      ['vacuna', 'medicamento'],
  medicacion:      ['medicamento'],
  antibiotico:     ['medicamento'],
  vitaminas:       ['medicamento'],
  desparasitacion: ['medicamento', 'desinfectante'],
  otro:            CATEGORIAS_TRATAMIENTO,
}

const CATEGORIA_LABELS = {
  medicamento:   'Medicamento',
  vacuna:        'Vacuna',
  desinfectante: 'Desinfectante',
  otro:          'Otro',
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

function StockBar({ actual, cantidad }) {
  const q = Number(cantidad) || 0
  if (actual <= 0) return null
  const pct = Math.min((q / actual) * 100, 100)
  const over = q > actual
  const color = over ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-[10px] tabular-nums ${over ? 'text-red-500 font-semibold' : 'text-stone-400'}`}>
        {over ? 'Cantidad supera el stock' : `${pct.toFixed(0)}% del stock disponible`}
      </p>
    </div>
  )
}

function PreviewCard({ galponNombre, loteNombre, tipoLabel, insumoNombre, insumoCategoria, stockActual, unidad, cantidadUsada, responsable, estado, fechaInicio, fechaFin, isEdit, nombreProducto, cantidadRegistrada, sinStock, stockInsuficiente, hasLote }) {
  const checks = isEdit ? [
    { ok: !!fechaInicio,    text: 'Fecha de inicio definida' },
    { ok: !!galponNombre,   text: 'Galpón seleccionado' },
    { ok: !!tipoLabel,      text: 'Tipo de tratamiento' },
    { ok: !!responsable,    text: 'Responsable indicado' },
  ] : [
    { ok: !!fechaInicio,    text: 'Fecha de inicio definida' },
    { ok: !!galponNombre,   text: 'Galpón seleccionado' },
    { ok: hasLote,          text: 'Lote activo disponible' },
    { ok: !!tipoLabel,      text: 'Tipo de tratamiento' },
    { ok: !!insumoNombre,   text: 'Producto seleccionado' },
    { ok: !sinStock,        text: 'Stock disponible' },
    { ok: !stockInsuficiente, text: 'Cantidad dentro del stock' },
    { ok: !!responsable,    text: 'Responsable indicado' },
  ]

  const estadoColor = estado === 'activo'
    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FlaskConical className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {tipoLabel || <span className="italic font-normal text-stone-400 dark:text-stone-600">Tipo sin definir</span>}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {galponNombre || <span className="italic">Sin galpón</span>}
                {loteNombre && <> · {loteNombre}</>}
              </p>
            </div>
          </div>

          {estado && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColor}`}>
              <Activity className="h-3 w-3" />
              {estado === 'activo' ? 'En curso' : 'Finalizado'}
            </span>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Inicio</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5">
                {fechaInicio
                  ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                  : <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Fin</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5">
                {fechaFin
                  ? new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                  : <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
          </div>

          {/* Producto */}
          {(isEdit ? nombreProducto : insumoNombre) && (
            <div className={`rounded-lg px-3 py-2.5 border ${sinStock ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-white/60 dark:bg-stone-800/60 border-transparent'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                  {isEdit ? nombreProducto : insumoNombre}
                </p>
                {insumoCategoria && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400 flex-shrink-0 capitalize">
                    {CATEGORIA_LABELS[insumoCategoria] || insumoCategoria}
                  </span>
                )}
              </div>
              {!isEdit && stockActual !== undefined && (
                <div className="mt-1.5">
                  <p className="text-xs text-stone-400 dark:text-stone-500 tabular-nums mb-1">
                    Stock: <span className={`font-semibold ${sinStock ? 'text-red-500' : 'text-stone-700 dark:text-stone-200'}`}>{stockActual} {unidad}</span>
                  </p>
                  <StockBar actual={stockActual} cantidad={cantidadUsada} />
                </div>
              )}
              {isEdit && cantidadRegistrada != null && (
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  Cantidad usada: <span className="font-semibold">{cantidadRegistrada} {unidad}</span>
                </p>
              )}
            </div>
          )}

          {responsable && (
            <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <User className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
              <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{responsable}</p>
            </div>
          )}
        </div>

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

export default function TratamientoForm() {
  const { id }              = useParams()
  const isEdit              = !!id
  const navigate            = useNavigate()
  const qc                  = useQueryClient()
  const { perfil, isAdmin } = useAuth()

  const schema = useMemo(() => z.object({
    fecha_inicio:     z.string().min(1, 'Requerido'),
    fecha_fin:        z.string().optional(),
    galpon_id:        z.string().min(1, 'Requerido'),
    tipo:             z.string().min(1, 'Requerido'),
    insumo_id:        isEdit ? z.string() : z.string().min(1, 'Selecciona un producto del inventario'),
    cantidad_usada:   isEdit ? z.any() : z.coerce.number().positive('Debe ser mayor a 0'),
    dosis_aplicacion: z.string().min(1, 'Requerido'),
    responsable:      z.string().min(1, 'Requerido'),
    estado:           z.enum(['activo', 'finalizado']),
    observaciones:    z.string().optional(),
  }), [isEdit])

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_inicio: new Date().toISOString().slice(0, 10),
      estado: 'activo', insumo_id: '', cantidad_usada: '',
    },
  })

  const galponId      = watch('galpon_id')
  const tipoTrat      = watch('tipo')
  const insumoId      = watch('insumo_id')
  const cantidadUsada = watch('cantidad_usada')
  const responsable   = watch('responsable')
  const estado        = watch('estado')
  const fechaInicio   = watch('fecha_inicio')
  const fechaFin      = watch('fecha_fin')

  /* ── Galpones ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-todos'],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  /* ── Lote activo ── */
  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase.from('lotes').select('id, nombre_numero')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId,
  })

  /* ── Insumos ── */
  const { data: insumos } = useQuery({
    queryKey: ['insumos-tratamientos'],
    queryFn: async () => {
      const { data } = await supabase.from('insumos')
        .select('id, nombre, categoria, unidad_medida, stock_actual')
        .eq('estado', 'activo').in('categoria', CATEGORIAS_TRATAMIENTO)
        .order('categoria').order('nombre')
      return data || []
    },
  })

  /* ── Tratamiento (edición) ── */
  const { data: tratamiento } = useQuery({
    queryKey: ['tratamiento', id],
    queryFn: async () => {
      const { data } = await supabase.from('tratamientos').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (tratamiento) reset({
      fecha_inicio: tratamiento.fecha_inicio, fecha_fin: tratamiento.fecha_fin || '',
      galpon_id: tratamiento.galpon_id, tipo: tratamiento.tipo,
      insumo_id: tratamiento.insumo_id || '', cantidad_usada: tratamiento.cantidad_usada ?? '',
      dosis_aplicacion: tratamiento.dosis_aplicacion, responsable: tratamiento.responsable,
      estado: tratamiento.estado, observaciones: tratamiento.observaciones || '',
    })
  }, [tratamiento, reset])

  const msTranscurridos = tratamiento?.created_at
    ? Date.now() - new Date(tratamiento.created_at).getTime()
    : 0
  const fueraDePlazo    = isEdit && !isAdmin && msTranscurridos > 24 * 3600 * 1000

  const insumosFiltrados = useMemo(() => {
    if (!insumos) return []
    if (!tipoTrat) return insumos
    const sugeridas = CATEGORIAS_SUGERIDAS[tipoTrat] || CATEGORIAS_TRATAMIENTO
    return [...insumos.filter(i => sugeridas.includes(i.categoria)), ...insumos.filter(i => !sugeridas.includes(i.categoria))]
  }, [insumos, tipoTrat])

  const insumoSeleccionado = insumosFiltrados.find(i => i.id === insumoId)
  const sinStock           = !isEdit && insumoSeleccionado && insumoSeleccionado.stock_actual === 0
  const stockInsuficiente  = !isEdit && insumoSeleccionado && Number(cantidadUsada) > insumoSeleccionado.stock_actual

  const sugeridas = CATEGORIAS_SUGERIDAS[tipoTrat] || []
  const opcionesInsumos = useMemo(() => {
    return insumosFiltrados.map(i => {
      const esSugerido = sugeridas.includes(i.categoria)
      const cat = CATEGORIA_LABELS[i.categoria] || i.categoria
      return {
        value: i.id,
        label: `${esSugerido ? '★ ' : ''}${i.nombre} [${cat}] — ${i.stock_actual} ${i.unidad_medida}`,
      }
    })
  }, [insumosFiltrados, sugeridas])

  const tipoLabel      = TIPOS_TRATAMIENTO.find(t => t.value === tipoTrat)?.label
  const galponNombre   = (galpones || []).find(g => g.id === galponId)?.nombre
  const loteNombre     = loteActivo?.nombre_numero

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        const payload = {
          fecha_inicio: values.fecha_inicio, fecha_fin: values.fecha_fin || null,
          galpon_id: values.galpon_id, lote_id: tratamiento?.lote_id,
          tipo: values.tipo, nombre_producto: tratamiento?.nombre_producto,
          dosis_aplicacion: values.dosis_aplicacion, responsable: values.responsable,
          estado: values.estado, observaciones: values.observaciones || null,
        }
        const { error } = await supabase.from('tratamientos').update(payload).eq('id', id)
        if (error) throw error
      } else {
        if (!loteActivo) throw new Error('No hay lote activo en el galpón seleccionado')
        const insumo = insumosFiltrados.find(i => i.id === values.insumo_id)
        if (!insumo) throw new Error('Producto no encontrado en el inventario')
        if (Number(values.cantidad_usada) > insumo.stock_actual) {
          throw new Error(`Stock insuficiente. Disponible: ${insumo.stock_actual} ${insumo.unidad_medida}`)
        }
        const { error: errTrat } = await supabase.from('tratamientos').insert({
          fecha_inicio: values.fecha_inicio, fecha_fin: values.fecha_fin || null,
          galpon_id: values.galpon_id, lote_id: loteActivo.id, tipo: values.tipo,
          nombre_producto: insumo.nombre, insumo_id: values.insumo_id,
          cantidad_usada: values.cantidad_usada, dosis_aplicacion: values.dosis_aplicacion,
          responsable: values.responsable, estado: values.estado,
          observaciones: values.observaciones || null,
        })
        if (errTrat) throw errTrat

        const tipoLbl = TIPOS_TRATAMIENTO.find(t => t.value === values.tipo)?.label || values.tipo
        const { error: errMov } = await supabase.from('movimientos_insumos').insert({
          fecha: values.fecha_inicio, tipo: 'salida', insumo_id: values.insumo_id,
          cantidad: values.cantidad_usada,
          destino_proveedor: `Tratamiento: ${tipoLbl} — Lote ${loteActivo.nombre_numero}`,
          observaciones: 'Registrado automáticamente desde módulo de tratamientos',
          registrado_por: perfil?.id,
        })
        if (errMov) throw errMov
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['tratamientos'])
      qc.invalidateQueries(['insumos'])
      qc.invalidateQueries(['insumos-activos'])
      qc.invalidateQueries(['insumos-tratamientos'])
      toast.success(isEdit ? 'Tratamiento actualizado' : 'Tratamiento registrado')
      navigate('/dashboard/tratamientos')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar tratamiento' : 'Nuevo tratamiento'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tratamientos', href: '/dashboard/tratamientos' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      {isEdit && fueraDePlazo && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>El período de edición de 24 horas ha vencido. Este registro ya no puede modificarse.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="lg:col-span-2 card p-6 space-y-7">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
              <FlaskConical className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar tratamiento' : 'Registrar tratamiento'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {isEdit ? 'Modifica los datos del tratamiento' : 'Completa los campos del protocolo'}
              </p>
            </div>
          </div>

          {/* ── Fechas y galpón ── */}
          <FormSection icon={CalendarDays} title="Fechas y galpón" gradient="from-blue-400 to-blue-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Fecha de inicio" type="date" error={errors.fecha_inicio?.message} disabled={fueraDePlazo} {...register('fecha_inicio')} />
              <Input label="Fecha de fin (opcional)" type="date" disabled={fueraDePlazo} {...register('fecha_fin')} />
              <div className="sm:col-span-2">
                <Select
                  label="Galpón"
                  options={(galpones || []).map(g => ({ value: g.id, label: g.nombre }))}
                  placeholder="Seleccionar galpón"
                  error={errors.galpon_id?.message}
                  disabled={fueraDePlazo}
                  {...register('galpon_id')}
                />
              </div>
            </div>
            {galponId && loteActivo && (
              <div className="flex items-start gap-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Layers className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Lote activo: {loteActivo.nombre_numero}</p>
                </div>
              </div>
            )}
            {galponId && !loteActivo && !isEdit && (
              <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Sin lote activo en este galpón.</span>
              </div>
            )}
          </FormSection>

          {/* ── Tipo y producto ── */}
          <FormSection icon={FlaskConical} title="Protocolo" gradient="from-violet-400 to-violet-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Select
                  label="Tipo de tratamiento"
                  options={TIPOS_TRATAMIENTO}
                  placeholder="Seleccionar tipo"
                  error={errors.tipo?.message}
                  disabled={fueraDePlazo}
                  {...register('tipo')}
                />
              </div>

              {!isEdit ? (
                <>
                  <div className="sm:col-span-2 space-y-2">
                    <Select
                      label="Producto del inventario"
                      options={opcionesInsumos}
                      placeholder="Seleccionar producto"
                      error={errors.insumo_id?.message}
                      {...register('insumo_id')}
                    />
                    {tipoTrat && sugeridas.length > 0 && (
                      <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400">
                        <FlaskConical className="h-3.5 w-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                        <span>Para <strong>{tipoLabel}</strong> se sugieren: {sugeridas.map(c => CATEGORIA_LABELS[c]).join(', ')}. Los marcados con ★ son de esas categorías.</span>
                      </div>
                    )}
                    {insumoSeleccionado && (
                      <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${sinStock ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'}`}>
                        <span>Stock: <strong>{insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}</strong>{sinStock && ' — Sin existencias'}</span>
                        <span className="capitalize px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                          {CATEGORIA_LABELS[insumoSeleccionado.categoria] || insumoSeleccionado.categoria}
                        </span>
                      </div>
                    )}
                    {insumos && insumos.length === 0 && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                        <Info className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>No hay medicamentos, vacunas ni desinfectantes en inventario.</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      label={`Cantidad usada${insumoSeleccionado ? ` (${insumoSeleccionado.unidad_medida})` : ''}`}
                      type="number" step="0.01" min="0.01" placeholder="0"
                      error={errors.cantidad_usada?.message}
                      {...register('cantidad_usada')}
                    />
                    {stockInsuficiente && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Supera el stock ({insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}).
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                  <p className="text-xs text-stone-400 dark:text-stone-500 mb-0.5">Producto registrado</p>
                  <p className="font-semibold text-stone-800 dark:text-stone-200">{tratamiento?.nombre_producto || '—'}</p>
                  {tratamiento?.cantidad_usada != null && (
                    <p className="text-xs mt-1">Cantidad usada: <strong>{tratamiento.cantidad_usada}</strong></p>
                  )}
                </div>
              )}
            </div>
          </FormSection>

          {/* ── Responsable y estado ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={User} title="Responsable" gradient="from-green-400 to-green-600">
              <Input
                label="Veterinario / encargado"
                placeholder="Nombre del responsable"
                error={errors.responsable?.message}
                disabled={fueraDePlazo}
                {...register('responsable')}
              />
              <Input
                label="Dosis y forma de aplicación"
                placeholder="Ej: 1 mL por litro de agua, vía oral"
                error={errors.dosis_aplicacion?.message}
                disabled={fueraDePlazo}
                {...register('dosis_aplicacion')}
              />
            </FormSection>

            <FormSection icon={Activity} title="Estado" gradient="from-amber-400 to-amber-600">
              <Select
                label="Estado del tratamiento"
                options={[
                  { value: 'activo',     label: 'Activo — En curso' },
                  { value: 'finalizado', label: 'Finalizado' },
                ]}
                error={errors.estado?.message}
                disabled={fueraDePlazo}
                {...register('estado')}
              />
              <Textarea
                label="Observaciones (opcional)"
                placeholder="Notas, reacciones observadas, indicaciones…"
                rows={3}
                disabled={fueraDePlazo}
                {...register('observaciones')}
              />
            </FormSection>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            {!fueraDePlazo && (
              <Button
                type="submit"
                loading={mutation.isPending || isSubmitting}
                disabled={stockInsuficiente || sinStock}
              >
                {isEdit ? 'Guardar cambios' : 'Registrar tratamiento'}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => navigate(isEdit ? `/dashboard/tratamientos/${id}` : '/dashboard/tratamientos')}>
              {fueraDePlazo ? 'Volver' : 'Cancelar'}
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          galponNombre={galponNombre}
          loteNombre={loteNombre}
          tipoLabel={tipoLabel}
          insumoNombre={insumoSeleccionado?.nombre}
          insumoCategoria={insumoSeleccionado?.categoria}
          stockActual={insumoSeleccionado?.stock_actual}
          unidad={insumoSeleccionado?.unidad_medida}
          cantidadUsada={cantidadUsada}
          responsable={responsable}
          estado={estado}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          isEdit={isEdit}
          nombreProducto={tratamiento?.nombre_producto}
          cantidadRegistrada={tratamiento?.cantidad_usada}
          sinStock={sinStock}
          stockInsuficiente={stockInsuficiente}
          hasLote={!!loteActivo}
        />
      </div>
    </div>
  )
}
