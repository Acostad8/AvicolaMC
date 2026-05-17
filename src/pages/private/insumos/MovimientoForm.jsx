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

const schema = z.object({
  fecha: z.string().min(1, 'Requerido'),
  tipo: z.enum(['entrada', 'salida']),
  insumo_id: z.string().min(1, 'Selecciona un producto'),
  cantidad: z.coerce.number().int('Solo se permiten valores enteros').positive('Debe ser mayor a 0'),
  destino_proveedor: z.string().optional(),
  observaciones: z.string().optional(),
})

export default function MovimientoForm() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10), tipo: 'entrada' },
  })

  const tipo = watch('tipo')
  const insumoId = watch('insumo_id')
  const cantidad = watch('cantidad')

  const { data: insumos } = useQuery({
    queryKey: ['insumos-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('insumos').select('id, nombre, unidad_medida, stock_actual').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  const { data: proveedores } = useQuery({
    queryKey: ['proveedores-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  const { data: proveedoresDelInsumo } = useQuery({
    queryKey: ['proveedor-insumos-ids', insumoId],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores_insumos').select('proveedor_id').eq('insumo_id', insumoId)
      return new Set((data || []).map(r => r.proveedor_id))
    },
    enabled: !!insumoId,
  })

  // Proveedores vinculados al insumo primero (marcados con ★), luego el resto
  const opcionesProveedores = (() => {
    if (!proveedores) return []
    const vinculados = proveedores.filter(p => proveedoresDelInsumo?.has(p.id))
    const otros = proveedores.filter(p => !proveedoresDelInsumo?.has(p.id))
    return [
      ...vinculados.map(p => ({ value: p.nombre, label: `${p.nombre} ★` })),
      ...otros.map(p => ({ value: p.nombre, label: p.nombre })),
    ]
  })()

  const insumoSeleccionado = (insumos || []).find(i => i.id === insumoId)
  const stockInsuficiente = tipo === 'salida' && insumoSeleccionado && Number(cantidad) > insumoSeleccionado.stock_actual

  const mutation = useMutation({
    mutationFn: async (values) => {
      const insumo = (insumos || []).find(i => i.id === values.insumo_id)
      if (values.tipo === 'salida' && insumo && values.cantidad > insumo.stock_actual) {
        throw new Error(`Stock insuficiente. Disponible: ${insumo.stock_actual} ${insumo.unidad_medida}`)
      }
      const { error } = await supabase.from('movimientos_insumos').insert({ ...values, registrado_por: perfil.id })
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
    <div className="max-w-md">
      <PageHeader
        title="Registrar movimiento de insumo"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insumos', href: '/dashboard/insumos' }, { label: 'Movimiento' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Fecha" type="date" error={errors.fecha?.message} {...register('fecha')} />
        <Select
          label="Tipo"
          options={[{ value: 'entrada', label: 'Entrada (compra)' }, { value: 'salida', label: 'Salida (uso)' }]}
          error={errors.tipo?.message}
          {...register('tipo')}
        />
        <Select
          label="Producto"
          options={(insumos || []).map(i => ({ value: i.id, label: `${i.nombre} (${i.stock_actual} ${i.unidad_medida})` }))}
          placeholder="Seleccionar producto"
          error={errors.insumo_id?.message}
          {...register('insumo_id')}
        />

        {insumoSeleccionado && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600">
            Stock disponible: <strong>{insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}</strong>
          </div>
        )}

        <Input label="Cantidad (solo enteros)" type="number" step="1" min="1" error={errors.cantidad?.message} {...register('cantidad')} />

        {stockInsuficiente && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            La cantidad supera el stock disponible ({insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}).
          </div>
        )}

        {tipo === 'entrada' ? (
          <div>
            <Select
              label="Proveedor"
              options={opcionesProveedores}
              placeholder="Seleccionar proveedor"
              {...register('destino_proveedor')}
            />
            {insumoId && proveedoresDelInsumo && proveedoresDelInsumo.size > 0 && (
              <p className="text-xs text-stone-400 mt-1">Los marcados con ★ están vinculados a este insumo.</p>
            )}
          </div>
        ) : (
          <Input
            label="Destino o uso"
            placeholder="Galpón o uso específico"
            {...register('destino_proveedor')}
          />
        )}

        <Textarea label="Observaciones (opcional)" {...register('observaciones')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={stockInsuficiente}>
            Registrar movimiento
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/insumos')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
