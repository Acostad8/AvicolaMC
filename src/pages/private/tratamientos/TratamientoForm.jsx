import { useEffect, useMemo, useState } from 'react'
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
  AlertCircle, AlertTriangle, Package, User, CalendarDays, Activity, Clock,
} from 'lucide-react'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
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
    cantidad_usada:   z.coerce.number().positive('Debe ser mayor a 0').int('Solo se permiten valores enteros'),
    dosis_aplicacion: z.string().min(1, 'Requerido'),
    empleado_id:      isAdmin ? z.string().min(1, 'Selecciona el empleado responsable') : z.string().optional(),
    estado:           z.enum(['activo', 'finalizado']),
    observaciones:    z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.estado === 'finalizado' && !data.fecha_fin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresa la fecha de fin del tratamiento',
        path: ['fecha_fin'],
      })
    }
  }), [isEdit, isAdmin])

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
  const empleadoId    = watch('empleado_id')
  const estado        = watch('estado')
  const fechaInicio   = watch('fecha_inicio')
  const fechaFin      = watch('fecha_fin')

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

  /* ── Galpones ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-todos', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'en_produccion').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  /* ── Empleados activos ── */
  const { data: empleados } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('id, nombre_completo, cargo').eq('estado', 'activo').order('nombre_completo')
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

  /* ── Insumo del tratamiento (solo edición, para ajuste de stock) ── */
  const { data: insumoTratamiento } = useQuery({
    queryKey: ['insumo-detalle', tratamiento?.insumo_id],
    queryFn: async () => {
      const { data } = await supabase.from('insumos')
        .select('id, nombre, unidad_medida, stock_actual')
        .eq('id', tratamiento.insumo_id).single()
      return data
    },
    enabled: isEdit && !!tratamiento?.insumo_id,
  })

  useEffect(() => {
    if (tratamiento) reset({
      fecha_inicio: tratamiento.fecha_inicio, fecha_fin: tratamiento.fecha_fin || '',
      galpon_id: tratamiento.galpon_id, tipo: tratamiento.tipo,
      insumo_id: tratamiento.insumo_id || '', cantidad_usada: tratamiento.cantidad_usada ?? '',
      dosis_aplicacion: tratamiento.dosis_aplicacion, empleado_id: tratamiento.empleado_id || '',
      estado: tratamiento.estado, observaciones: tratamiento.observaciones || '',
    })
  }, [tratamiento, reset])

  const msTranscurridos = tratamiento?.created_at
    ? Date.now() - new Date(tratamiento.created_at).getTime()
    : 0
  const fueraDePlazo    = isEdit && !isAdmin && msTranscurridos > 24 * 3600 * 1000

  const [tiempoRestante, setTiempoRestante] = useState(null)
  useEffect(() => {
    if (!isEdit || isAdmin || !tratamiento?.created_at) return
    const calcular = () => {
      const ms = 24 * 3600 * 1000 - (Date.now() - new Date(tratamiento.created_at).getTime())
      if (ms <= 0) { setTiempoRestante(null); return }
      const totalMin = Math.floor(ms / 60000)
      setTiempoRestante({ horas: Math.floor(totalMin / 60), minutos: totalMin % 60 })
    }
    calcular()
    const id = setInterval(calcular, 60000)
    return () => clearInterval(id)
  }, [isEdit, isAdmin, tratamiento?.created_at])

  const insumosFiltrados = useMemo(() => {
    if (!insumos) return []
    if (!tipoTrat) return insumos
    const sugeridas = CATEGORIAS_SUGERIDAS[tipoTrat] || CATEGORIAS_TRATAMIENTO
    return [...insumos.filter(i => sugeridas.includes(i.categoria)), ...insumos.filter(i => !sugeridas.includes(i.categoria))]
  }, [insumos, tipoTrat])

  const insumoSeleccionado      = insumosFiltrados.find(i => i.id === insumoId)
  const sinStock                = !isEdit && insumoSeleccionado && insumoSeleccionado.stock_actual === 0
  const stockInsuficiente       = !isEdit && insumoSeleccionado && Number(cantidadUsada) > insumoSeleccionado.stock_actual
  const stockDisponibleEdicion  = isEdit ? (insumoTratamiento?.stock_actual ?? 0) + (tratamiento?.cantidad_usada ?? 0) : 0
  const stockInsuficienteEdicion = isEdit && !!insumoTratamiento && Number(cantidadUsada) > stockDisponibleEdicion

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

  const tipoLabel         = TIPOS_TRATAMIENTO.find(t => t.value === tipoTrat)?.label
  const galponNombre      = (galpones || []).find(g => g.id === galponId)?.nombre
  const loteNombre        = loteActivo?.nombre_numero
  const empleadoSeleccionado = (empleados || []).find(e => e.id === empleadoId)
  const opcionesEmpleados = (empleados || []).map(e => ({
    value: e.id,
    label: e.cargo ? `${e.nombre_completo} — ${e.cargo}` : e.nombre_completo,
  }))

  const mutation = useMutation({
    mutationFn: async (values) => {
      const empleado = isAdmin ? (empleados || []).find(e => e.id === values.empleado_id) : null
      const nombreEmpleado = isAdmin ? (empleado?.nombre_completo || '') : (perfil?.nombre_completo || '')

      if (isEdit) {
        const old_cantidad = tratamiento?.cantidad_usada ?? 0
        const new_cantidad = Number(values.cantidad_usada)
        const delta        = new_cantidad - old_cantidad

        if (delta !== 0 && tratamiento?.insumo_id && insumoTratamiento) {
          if (delta > 0 && insumoTratamiento.stock_actual < delta) {
            throw new Error(`Stock insuficiente. Solo hay ${insumoTratamiento.stock_actual} ${insumoTratamiento.unidad_medida} disponible`)
          }
          const tipoMov   = delta > 0 ? 'salida' : 'entrada'
          const cantMov   = Math.abs(delta)
          const tipoLbl   = TIPOS_TRATAMIENTO.find(t => t.value === values.tipo)?.label || values.tipo
          const loteNombre = loteActivo?.nombre_numero ?? tratamiento?.lote_id
          const { error: errStock } = await supabase.from('movimientos_insumos').insert({
            fecha:             values.fecha_inicio,
            tipo:              tipoMov,
            insumo_id:         tratamiento.insumo_id,
            cantidad:          cantMov,
            destino_proveedor: `Corrección tratamiento: ${tipoLbl} — Lote ${loteNombre}`,
            observaciones:     `Ajuste por edición (cantidad anterior: ${old_cantidad}, nueva: ${new_cantidad})`,
            registrado_por:    perfil?.id,
          })
          if (errStock) throw errStock
        }

        const datosAnteriores = {
          fecha_inicio: tratamiento.fecha_inicio, fecha_fin: tratamiento.fecha_fin || null,
          tipo: tratamiento.tipo, cantidad_usada: tratamiento.cantidad_usada,
          dosis_aplicacion: tratamiento.dosis_aplicacion, responsable: tratamiento.responsable,
          estado: tratamiento.estado, observaciones: tratamiento.observaciones || null,
        }
        const datosNuevos = {
          fecha_inicio: values.fecha_inicio, fecha_fin: values.fecha_fin || null,
          tipo: values.tipo, cantidad_usada: new_cantidad,
          dosis_aplicacion: values.dosis_aplicacion, responsable: nombreEmpleado,
          estado: values.estado, observaciones: values.observaciones || null,
        }

        const payload = {
          fecha_inicio: values.fecha_inicio, fecha_fin: values.fecha_fin || null,
          galpon_id: values.galpon_id, lote_id: tratamiento?.lote_id,
          tipo: values.tipo, nombre_producto: tratamiento?.nombre_producto,
          cantidad_usada: new_cantidad,
          dosis_aplicacion: values.dosis_aplicacion,
          empleado_id: isAdmin ? (values.empleado_id || null) : tratamiento?.empleado_id || null,
          responsable: nombreEmpleado,
          estado: values.estado, observaciones: values.observaciones || null,
        }
        const { error } = await supabase.from('tratamientos').update(payload).eq('id', id)
        if (error) throw error

        await supabase.from('auditoria_tratamientos').insert({
          tratamiento_id: id, editado_por: perfil.id,
          datos_anteriores: datosAnteriores, datos_nuevos: datosNuevos,
        })
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
          empleado_id: isAdmin ? (values.empleado_id || null) : null,
          responsable: nombreEmpleado,
          estado: values.estado,
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
      qc.invalidateQueries({ queryKey: ['tratamientos'] })
      qc.invalidateQueries({ queryKey: ['tratamiento', id] })
      qc.invalidateQueries({ queryKey: ['auditoria-tratamiento', id] })
      qc.invalidateQueries({ queryKey: ['insumos'] })
      qc.invalidateQueries({ queryKey: ['insumos-activos'] })
      qc.invalidateQueries({ queryKey: ['insumos-tratamientos'] })
      if (tratamiento?.insumo_id) {
        qc.invalidateQueries({ queryKey: ['movimientos-insumo', tratamiento.insumo_id] })
      }
      qc.invalidateQueries({ queryKey: ['dashboard-v2'] })
      toast.success(isEdit ? 'Tratamiento actualizado' : 'Tratamiento registrado')
      navigate(isEdit ? `/dashboard/tratamientos/${id}` : '/dashboard/tratamientos')
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

      {isEdit && tiempoRestante && !fueraDePlazo && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Ventana de edición</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {tiempoRestante.horas}h {tiempoRestante.minutos}min restantes
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
              <Input
                label={estado === 'finalizado' ? 'Fecha de fin *' : 'Fecha de fin (opcional)'}
                type="date"
                error={errors.fecha_fin?.message}
                disabled={fueraDePlazo}
                {...register('fecha_fin')}
              />
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
                      type="number" step="1" min="1" placeholder="0"
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
                <div className="sm:col-span-2 space-y-3">
                  <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm">
                    <p className="text-xs text-stone-400 dark:text-stone-500 mb-0.5">Producto registrado</p>
                    <p className="font-semibold text-stone-800 dark:text-stone-200">{tratamiento?.nombre_producto || '—'}</p>
                  </div>
                  <div>
                    <Input
                      label={`Cantidad usada${insumoTratamiento ? ` (${insumoTratamiento.unidad_medida})` : ''}`}
                      type="number" step="1" min="1" placeholder="0"
                      error={errors.cantidad_usada?.message}
                      disabled={fueraDePlazo}
                      {...register('cantidad_usada')}
                    />
                    {insumoTratamiento && !fueraDePlazo && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                        Stock disponible para corrección: <strong className="text-stone-600 dark:text-stone-300">{stockDisponibleEdicion} {insumoTratamiento.unidad_medida}</strong>
                      </p>
                    )}
                    {stockInsuficienteEdicion && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Supera el stock disponible ({stockDisponibleEdicion} {insumoTratamiento?.unidad_medida}).
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* ── Responsable y estado ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={User} title="Responsable" gradient="from-green-400 to-green-600">
              {isAdmin ? (
                <>
                  <Select
                    label="Empleado responsable"
                    options={opcionesEmpleados}
                    placeholder="Seleccionar empleado"
                    error={errors.empleado_id?.message}
                    disabled={fueraDePlazo}
                    {...register('empleado_id')}
                  />
                  {empleadoSeleccionado && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
                      <User className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium">{empleadoSeleccionado.nombre_completo}</span>
                      {empleadoSeleccionado.cargo && <span className="text-emerald-500 dark:text-emerald-500">— {empleadoSeleccionado.cargo}</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{perfil?.nombre_completo}</p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-0.5">Registrado como responsable</p>
                  </div>
                </div>
              )}
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
              {estado === 'finalizado' && !fechaFin && !fueraDePlazo && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>Completa la <strong>Fecha de fin</strong> en la sección de fechas para poder guardar.</span>
                </div>
              )}
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
                disabled={stockInsuficiente || sinStock || stockInsuficienteEdicion}
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
          responsable={isAdmin ? (empleadoSeleccionado?.nombre_completo || (isEdit ? tratamiento?.responsable : '')) : (perfil?.nombre_completo || '')}
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
                label: 'Fecha de inicio',
                oldVal: tratamiento?.fecha_inicio,
                newVal: pendingValues?.fecha_inicio,
                format: v => v ? new Date(v + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              },
              {
                label: 'Fecha de fin',
                oldVal: tratamiento?.fecha_fin || '',
                newVal: pendingValues?.fecha_fin || '',
                format: v => v ? new Date(v + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              },
              {
                label: 'Tipo de tratamiento',
                oldVal: tratamiento?.tipo,
                newVal: pendingValues?.tipo,
                format: v => TIPOS_TRATAMIENTO.find(t => t.value === v)?.label || v || '—',
              },
              {
                label: `Cantidad usada${insumoTratamiento ? ` (${insumoTratamiento.unidad_medida})` : ''}`,
                oldVal: tratamiento?.cantidad_usada,
                newVal: pendingValues ? Number(pendingValues.cantidad_usada) : null,
                format: v => v != null ? Number(v).toLocaleString('es-CO') : '—',
              },
              {
                label: 'Dosis y forma de aplicación',
                oldVal: tratamiento?.dosis_aplicacion || '',
                newVal: pendingValues?.dosis_aplicacion || '',
                format: v => v || '—',
              },
              {
                label: 'Responsable',
                oldVal: tratamiento?.empleado_id,
                newVal: pendingValues?.empleado_id,
                format: v => (empleados || []).find(e => e.id === v)?.nombre_completo || tratamiento?.responsable || '—',
              },
              {
                label: 'Estado',
                oldVal: tratamiento?.estado,
                newVal: pendingValues?.estado,
                format: v => v === 'activo' ? 'Activo — En curso' : v === 'finalizado' ? 'Finalizado' : v || '—',
              },
              {
                label: 'Observaciones',
                oldVal: tratamiento?.observaciones || '',
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
