import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import {
  ArrowDownCircle, ArrowUpCircle, Info, PackageCheck,
  Package, Tag, CalendarDays, FileText,
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
} from 'lucide-react'
import { useAlertasUmbrales } from '../../../hooks/useAlertasUmbrales'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  fecha:             z.string().min(1, 'Requerido'),
  tipo:              z.enum(['entrada', 'salida']),
  insumo_id:         z.string().min(1, 'Selecciona un producto'),
  cantidad:          z.coerce.number().positive('Debe ser mayor a 0'),
  destino_proveedor: z.string().optional(),
  observaciones:     z.string().optional(),
})

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

function PreviewCard({ tipo, insumo, cantidad, destino, fecha, isAdmin, sinStock, stockInsuficiente }) {
  const q          = Number(cantidad) || 0
  const stockActual = insumo?.stock_actual ?? 0
  const stockPost  = tipo === 'entrada' ? stockActual + q : Math.max(0, stockActual - q)
  const pctActual  = insumo ? Math.min((stockActual / Math.max(stockActual, stockPost, 1)) * 100, 100) : 0
  const pctPost    = insumo ? Math.min((stockPost   / Math.max(stockActual, stockPost, 1)) * 100, 100) : 0

  const isEntrada   = tipo === 'entrada'
  const barColor    = isEntrada ? 'bg-emerald-500' : stockInsuficiente ? 'bg-red-500' : 'bg-amber-500'
  const tipoConfig  = isEntrada
    ? { label: 'Entrada', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', Icon: TrendingUp }
    : { label: 'Salida',  color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',                 Icon: TrendingDown }

  const checks = [
    { ok: !!fecha,   text: 'Fecha definida' },
    { ok: !!insumo,  text: 'Producto seleccionado' },
    { ok: q > 0,     text: 'Cantidad ingresada' },
    { ok: !sinStock, text: 'Stock disponible' },
    { ok: !stockInsuficiente, text: 'Cantidad dentro del stock' },
  ]

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className={`w-7 h-7 bg-gradient-to-br ${isEntrada ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {isEntrada ? <TrendingUp className="h-3.5 w-3.5 text-white" /> : <TrendingDown className="h-3.5 w-3.5 text-white" />}
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Tarjeta del movimiento */}
        <div className={`rounded-xl border-2 p-4 space-y-3 ${isEntrada ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${isEntrada ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`}>
                <Package className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight truncate">
                  {insumo?.nombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Producto sin seleccionar</span>}
                </p>
                {insumo?.categoria && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 capitalize mt-0.5">{insumo.categoria}</p>
                )}
              </div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border flex items-center gap-1 flex-shrink-0 ${tipoConfig.bg} ${tipoConfig.color}`}>
              <tipoConfig.Icon className="h-3 w-3" />
              {tipoConfig.label}
            </span>
          </div>

          {/* Fecha */}
          {fecha && (
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
              <p className="text-xs text-stone-400 dark:text-stone-500">Fecha</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                {new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}  

          {/* Stock antes → después */}
          {insumo && (
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Stock actual</span>
                <span className="font-bold text-stone-700 dark:text-stone-200 tabular-nums">{stockActual.toLocaleString('es-CO')} {insumo.unidad_medida}</span>
              </div>

              {q > 0 && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-semibold tabular-nums ${isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isEntrada ? '+' : '−'}{q.toLocaleString('es-CO')} {insumo.unidad_medida}
                    </span>
                    <span className="text-stone-300 dark:text-stone-600">→</span>
                    <span className={`font-bold tabular-nums ${stockInsuficiente ? 'text-red-500' : 'text-stone-700 dark:text-stone-200'}`}>
                      {stockPost.toLocaleString('es-CO')} {insumo.unidad_medida}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div className="h-full bg-stone-300 dark:bg-stone-600 rounded-full" style={{ width: `${pctActual}%` }} />
                    </div>
                    <div className={`h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden`}>
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pctPost}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-400 dark:text-stone-500">
                      <span>Antes</span>
                      <span className={stockInsuficiente ? 'text-red-500 font-semibold' : ''}>Después</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {destino && (
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
              <p className="text-xs text-stone-400 dark:text-stone-500">{isEntrada ? 'Proveedor' : 'Destino'}</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">{destino}</p>
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

export default function MovimientoForm() {
  const navigate            = useNavigate()
  const { perfil, isAdmin } = useAuth()
  const qc                  = useQueryClient()
  const { checkStockMinimo } = useAlertasUmbrales()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      tipo:  isAdmin ? 'entrada' : 'salida',
    },
  })

  const tipo              = watch('tipo')
  const insumoId          = watch('insumo_id')
  const cantidad          = watch('cantidad')
  const destino_proveedor = watch('destino_proveedor')
  const fecha             = watch('fecha')

  /* ── Insumos activos ── */
  const { data: insumos } = useQuery({
    queryKey: ['insumos-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('insumos')
        .select('id, nombre, categoria, unidad_medida, stock_actual, stock_minimo')
        .eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  /* ── Proveedores ── */
  const { data: proveedores } = useQuery({
    queryKey: ['proveedores-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
    enabled: isAdmin,
  })

  /* ── Proveedores vinculados al insumo ── */
  const { data: proveedoresDelInsumo } = useQuery({
    queryKey: ['proveedor-insumos-ids', insumoId],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores_insumos').select('proveedor_id').eq('insumo_id', insumoId)
      return new Set((data || []).map(r => r.proveedor_id))
    },
    enabled: !!insumoId && isAdmin && tipo === 'entrada',
  })

  const opcionesProveedores = (() => {
    if (!proveedores) return []
    const vinculados = proveedores.filter(p => proveedoresDelInsumo?.has(p.id))
    const otros      = proveedores.filter(p => !proveedoresDelInsumo?.has(p.id))
    return [
      ...vinculados.map(p => ({ value: p.nombre, label: `★ ${p.nombre}` })),
      ...otros.map(p =>      ({ value: p.nombre, label: p.nombre })),
    ]
  })()

  const insumoSeleccionado = (insumos || []).find(i => i.id === insumoId)
  const sinStock           = tipo === 'salida' && insumoSeleccionado?.stock_actual === 0
  const stockInsuficiente  = tipo === 'salida' && insumoSeleccionado && Number(cantidad) > insumoSeleccionado.stock_actual

  const mutation = useMutation({
    mutationFn: async (values) => {
      const insumo = (insumos || []).find(i => i.id === values.insumo_id)
      if (values.tipo === 'salida' && insumo && values.cantidad > insumo.stock_actual) {
        throw new Error(`Stock insuficiente. Disponible: ${insumo.stock_actual} ${insumo.unidad_medida}`)
      }
      const { error } = await supabase.from('movimientos_insumos').insert({
        ...values, registrado_por: perfil.id,
      })
      if (error) throw error
    },
    onSuccess: (_, values) => {
      if (values.tipo === 'salida' && insumoSeleccionado) {
        checkStockMinimo({
          insumoNombre: insumoSeleccionado.nombre,
          stockPost:    Math.max(0, insumoSeleccionado.stock_actual - Number(values.cantidad)),
          stockMinimo:  insumoSeleccionado.stock_minimo ?? 0,
          unidad:       insumoSeleccionado.unidad_medida,
        })
          }
          qc.invalidateQueries({ queryKey: ['insumos'] })
          qc.invalidateQueries({ queryKey: ['insumos-activos'] })
          qc.invalidateQueries({ queryKey: ['insumo', values.insumo_id] })
          qc.invalidateQueries({ queryKey: ['movimientos-insumo', values.insumo_id] })
          toast.success('Movimiento registrado correctamente')
          navigate('/dashboard/insumos')
        },
        onError: e => toast.error(e.message || 'Error al guardar'),
      })

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Registrar movimiento de inventario"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Insumos', href: '/dashboard/insumos' },
          { label: 'Nuevo movimiento' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Selector de tipo */}
          {isAdmin ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'entrada', Icon: ArrowDownCircle, label: 'Entrada',  desc: 'Compra o recepción de stock',    active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
                { val: 'salida',  Icon: ArrowUpCircle,   label: 'Salida',   desc: 'Consumo o uso interno',          active: 'border-red-400 bg-red-50 dark:bg-red-900/20',            icon: 'text-red-500',    text: 'text-red-700 dark:text-red-300' },
              ].map(({ val, Icon, label, desc, active, icon, text }) => (
                <label
                  key={val}
                  className={`relative cursor-pointer rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                    tipo === val
                      ? active
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                  }`}
                >
                  <input type="radio" value={val} className="sr-only" {...register('tipo')} />
                  <Icon className={`h-9 w-9 flex-shrink-0 transition-colors ${tipo === val ? icon : 'text-stone-300 dark:text-stone-600'}`} />
                  <div>
                    <p className={`text-sm font-bold ${tipo === val ? text : 'text-stone-700 dark:text-stone-300'}`}>{label}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{desc}</p>
                  </div>
                  {tipo === val && (
                    <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center ${val === 'entrada' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                Como encargado, puedes registrar <strong>salidas</strong> de inventario (uso de insumos). El administrador gestiona las compras.
              </p>
            </div>
          )}

          {/* Formulario principal */}
          <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-7">
            {!isAdmin && <input type="hidden" value="salida" {...register('tipo')} />}

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${tipo === 'entrada' ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`}>
                {tipo === 'entrada'
                  ? <ArrowDownCircle className="h-5 w-5 text-white" />
                  : <ArrowUpCircle   className="h-5 w-5 text-white" />
                }
              </div>
              <div>
                <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                  {tipo === 'entrada' ? 'Registrar entrada de stock' : 'Registrar salida de stock'}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  {tipo === 'entrada' ? 'Compra, donación o recepción de inventario' : 'Consumo, uso o despacho de inventario'}
                </p>
              </div>
            </div>

            {/* ── Fecha ── */}
            <FormSection icon={CalendarDays} title="Fecha del movimiento" gradient="from-blue-400 to-blue-600">
              <Input
                label="Fecha"
                type="date"
                error={errors.fecha?.message}
                {...register('fecha')}
              />
            </FormSection>

            {/* ── Producto y cantidad ── */}
            <FormSection icon={Package} title="Producto y cantidad" gradient={tipo === 'entrada' ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}>
              <div className="space-y-4">
                <Select
                  label="Producto del inventario"
                  options={(insumos || []).map(i => ({
                    value: i.id,
                    label: `${i.nombre} — ${i.stock_actual} ${i.unidad_medida} disponibles`,
                  }))}
                  placeholder="Seleccionar producto"
                  error={errors.insumo_id?.message}
                  {...register('insumo_id')}
                />

                {insumoSeleccionado && (
                  <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${
                    sinStock
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                  }`}>
                    <span>Stock actual: <strong className="tabular-nums">{insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}</strong>{sinStock && ' — Sin existencias'}</span>
                    <span className="capitalize px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400">{insumoSeleccionado.categoria}</span>
                  </div>
                )}

                <div>
                  <Input
                    label={`Cantidad${insumoSeleccionado ? ` (${insumoSeleccionado.unidad_medida})` : ''}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0"
                    error={errors.cantidad?.message}
                    {...register('cantidad')}
                  />
                  {stockInsuficiente && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      La cantidad supera el stock disponible ({insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}).
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* ── Proveedor / destino y notas ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
              <FormSection icon={Tag} title={tipo === 'entrada' ? 'Proveedor' : 'Destino'} gradient="from-amber-400 to-amber-600">
                {tipo === 'entrada' ? (
                  <div className="space-y-2">
                    <Select
                      label="Proveedor (opcional)"
                      options={opcionesProveedores}
                      placeholder="Seleccionar proveedor"
                      {...register('destino_proveedor')}
                    />
                    {insumoId && proveedoresDelInsumo && proveedoresDelInsumo.size > 0 && (
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        Los marcados con ★ están vinculados a este producto.
                      </p>
                    )}
                  </div>
                ) : (
                  <Input
                    label="Destino o uso (opcional)"
                    placeholder="Ej: Galpón 1, tratamiento sanitario…"
                    {...register('destino_proveedor')}
                  />
                )}
              </FormSection>

              <FormSection icon={FileText} title="Observaciones" gradient="from-stone-400 to-stone-600">
                <Textarea
                  label="Notas (opcional)"
                  placeholder="Notas adicionales sobre este movimiento…"
                  rows={3}
                  {...register('observaciones')}
                />
              </FormSection>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button
                type="submit"
                loading={mutation.isPending || isSubmitting}
                disabled={stockInsuficiente || sinStock}
                icon={PackageCheck}
              >
                Registrar movimiento
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/insumos')}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          tipo={tipo}
          insumo={insumoSeleccionado}
          cantidad={cantidad}
          destino={destino_proveedor}
          fecha={fecha}
          isAdmin={isAdmin}
          sinStock={sinStock}
          stockInsuficiente={stockInsuficiente}
        />
      </div>
    </div>
  )
}
