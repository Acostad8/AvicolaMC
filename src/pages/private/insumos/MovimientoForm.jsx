import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { ArrowDownCircle, ArrowUpCircle, Info, PackageCheck } from 'lucide-react'
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

export default function MovimientoForm() {
  const navigate   = useNavigate()
  const { perfil } = useAuth()
  const qc         = useQueryClient()
  const isAdmin    = perfil?.rol === 'administrador'

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      tipo:  isAdmin ? 'entrada' : 'salida',
    },
  })

  const tipo    = watch('tipo')
  const insumoId = watch('insumo_id')
  const cantidad = watch('cantidad')

  /* ── Insumos activos ── */
  const { data: insumos } = useQuery({
    queryKey: ['insumos-activos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('insumos')
        .select('id, nombre, categoria, unidad_medida, stock_actual')
        .eq('estado', 'activo')
        .order('nombre')
      return data || []
    },
  })

  /* ── Proveedores (solo necesario para admin) ── */
  const { data: proveedores } = useQuery({
    queryKey: ['proveedores-activos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre')
      return data || []
    },
    enabled: isAdmin,
  })

  /* ── Proveedores vinculados al insumo seleccionado ── */
  const { data: proveedoresDelInsumo } = useQuery({
    queryKey: ['proveedor-insumos-ids', insumoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores_insumos')
        .select('proveedor_id')
        .eq('insumo_id', insumoId)
      return new Set((data || []).map(r => r.proveedor_id))
    },
    enabled: !!insumoId && isAdmin && tipo === 'entrada',
  })

  /* Proveedores vinculados primero (★), luego el resto */
  const opcionesProveedores = (() => {
    if (!proveedores) return []
    const vinculados = proveedores.filter(p => proveedoresDelInsumo?.has(p.id))
    const otros      = proveedores.filter(p => !proveedoresDelInsumo?.has(p.id))
    return [
      ...vinculados.map(p => ({ value: p.nombre, label: `★ ${p.nombre}` })),
      ...otros.map(p => ({ value: p.nombre, label: p.nombre })),
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
        ...values,
        registrado_por: perfil.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['insumos'])
      qc.invalidateQueries(['movimientos-insumo'])
      toast.success('Movimiento registrado correctamente')
      navigate('/dashboard/insumos')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Registrar movimiento de inventario"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Insumos', href: '/dashboard/insumos' },
          { label: 'Nuevo movimiento' },
        ]}
      />

      <div className="space-y-4">

        {/* ── Selector de tipo ── */}
        {isAdmin ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: 'entrada', Icon: ArrowDownCircle, label: 'Entrada', desc: 'Compra o recepción',   active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
              { val: 'salida',  Icon: ArrowUpCircle,   label: 'Salida',  desc: 'Consumo o uso interno', active: 'border-red-400 bg-red-50 dark:bg-red-900/20',            icon: 'text-red-500',    text: 'text-red-700 dark:text-red-300' },
            ].map(({ val, Icon, label, desc, active, icon, text }) => (
              <label
                key={val}
                className={`relative cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all ${
                  tipo === val
                    ? active
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                }`}
              >
                <input type="radio" value={val} className="sr-only" {...register('tipo')} />
                <Icon className={`h-8 w-8 flex-shrink-0 ${tipo === val ? icon : 'text-stone-400 dark:text-stone-500'}`} />
                <div>
                  <p className={`text-sm font-semibold ${tipo === val ? text : 'text-stone-700 dark:text-stone-300'}`}>{label}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Como encargado, puedes registrar <strong>salidas</strong> de inventario (uso de insumos). El administrador gestiona las compras.
            </p>
          </div>
        )}

        {/* ── Formulario ── */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
          {/* Non-admin: tipo siempre es 'salida' (el radio de admin lo registra) */}
          {!isAdmin && <input type="hidden" value="salida" {...register('tipo')} />}

          <Input
            label="Fecha"
            type="date"
            error={errors.fecha?.message}
            {...register('fecha')}
          />

          {/* Producto */}
          <div>
            <Select
              label="Producto"
              options={(insumos || []).map(i => ({
                value: i.id,
                label: `${i.nombre} — ${i.stock_actual} ${i.unidad_medida} disponibles`,
              }))}
              placeholder="Seleccionar producto"
              error={errors.insumo_id?.message}
              {...register('insumo_id')}
            />
            {insumoSeleccionado && (
              <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${
                sinStock
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}>
                <span>Stock: <strong>{insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}</strong>{sinStock && ' — Sin existencias'}</span>
                <span className="capitalize px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400">{insumoSeleccionado.categoria}</span>
              </div>
            )}
          </div>

          {/* Cantidad */}
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

          {/* Proveedor (entrada) / Destino (salida) */}
          {tipo === 'entrada' ? (
            <div>
              <Select
                label="Proveedor"
                options={opcionesProveedores}
                placeholder="Seleccionar proveedor"
                {...register('destino_proveedor')}
              />
              {insumoId && proveedoresDelInsumo && proveedoresDelInsumo.size > 0 && (
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  Los marcados con ★ están vinculados a este producto.
                </p>
              )}
            </div>
          ) : (
            <Input
              label="Destino o uso"
              placeholder="Ej: Galpón 1, tratamiento sanitario…"
              {...register('destino_proveedor')}
            />
          )}

          <Textarea
            label="Observaciones (opcional)"
            placeholder="Notas adicionales sobre este movimiento"
            {...register('observaciones')}
          />

          <div className="flex gap-3 pt-2">
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
    </div>
  )
}
