import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { CATEGORIAS_INSUMO, UNIDADES_MEDIDA } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  Package, Tag, Ruler, AlertCircle, CheckCircle2,
  Activity, BarChart3, ShieldAlert,
} from 'lucide-react'

const schema = z.object({
  nombre:        z.string().min(1, 'Requerido'),
  categoria:     z.string().min(1, 'Requerido'),
  unidad_medida: z.string().min(1, 'Requerido'),
  stock_minimo:  z.coerce.number().int('Debe ser un número entero').nonnegative('Debe ser 0 o más'),
  estado:        z.enum(['activo', 'inactivo']),
})

const CATEGORIA_COLORS = {
  alimento:      'from-amber-400 to-amber-600',
  medicamento:   'from-violet-400 to-violet-600',
  vacuna:        'from-blue-400 to-blue-600',
  desinfectante: 'from-cyan-400 to-cyan-600',
  equipamiento:  'from-stone-400 to-stone-600',
  otro:          'from-stone-400 to-stone-500',
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

function PreviewCard({ nombre, categoria, unidadMedida, stockMinimo, estado, isEdit }) {
  const categoriaLabel = CATEGORIAS_INSUMO.find(c => c.value === categoria)?.label || categoria
  const unidadLabel    = UNIDADES_MEDIDA.find(u => u.value === unidadMedida)?.label || unidadMedida
  const gradient       = CATEGORIA_COLORS[categoria] || 'from-stone-400 to-stone-600'

  const estadoColor = estado === 'activo'
    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'

  const checks = [
    { ok: nombre?.length > 0,      text: 'Nombre del producto' },
    { ok: !!categoria,             text: 'Categoría definida' },
    { ok: !!unidadMedida,          text: 'Unidad de medida' },
    { ok: stockMinimo >= 0,        text: 'Stock mínimo configurado' },
  ]

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Package className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Tarjeta del insumo */}
        <div className={`rounded-xl border-2 p-4 space-y-3 ${categoria ? `border-stone-200 dark:border-stone-700` : 'border-stone-200 dark:border-stone-700'} bg-stone-50/40 dark:bg-stone-800/20`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br ${gradient}`}>
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-base leading-tight truncate">
                {nombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Nombre del producto</span>}
              </p>
              {categoriaLabel && categoria && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{categoriaLabel}</p>
              )}
            </div>
          </div>

          {estado && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColor}`}>
              <Activity className="h-3 w-3" />
              {estado === 'activo' ? 'Activo' : 'Inactivo'}
            </span>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Unidad</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5">
                {unidadLabel || <span className="font-normal italic text-stone-400">—</span>}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Stock mínimo</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldAlert className={`h-3.5 w-3.5 flex-shrink-0 ${Number(stockMinimo) > 0 ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'}`} />
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums">
                  {stockMinimo >= 0 ? Number(stockMinimo).toLocaleString('es-CO') : '—'}
                </p>
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Stock inicial</p>
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-0.5">0 <span className="text-sm font-normal text-stone-400">{unidadLabel}</span></p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">El stock se gestiona con movimientos de inventario</p>
            </div>
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
                <span className={`text-xs ${ok ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-600'}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InsumoForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { perfil } = useAuth()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', stock_minimo: 0 },
  })

  const nombre       = watch('nombre')
  const categoria    = watch('categoria')
  const unidadMedida = watch('unidad_medida')
  const stockMinimo  = watch('stock_minimo')
  const estado       = watch('estado')

  const { data: insumo } = useQuery({
    queryKey: ['insumo', id],
    queryFn: async () => {
      const { data } = await supabase.from('insumos').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (insumo) reset({
      nombre: insumo.nombre, categoria: insumo.categoria,
      unidad_medida: insumo.unidad_medida, stock_minimo: insumo.stock_minimo,
      estado: insumo.estado,
    })
  }, [insumo, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        const datosAnteriores = {
          nombre: insumo.nombre, categoria: insumo.categoria,
          unidad_medida: insumo.unidad_medida, stock_minimo: insumo.stock_minimo,
          estado: insumo.estado,
        }
        const datosNuevos = {
          nombre: values.nombre, categoria: values.categoria,
          unidad_medida: values.unidad_medida, stock_minimo: values.stock_minimo,
          estado: values.estado,
        }
        const { error } = await supabase.from('insumos').update(values).eq('id', id)
        if (error) throw error
        await supabase.from('auditoria_insumos').insert({
          insumo_id: id, editado_por: perfil.id,
          datos_anteriores: datosAnteriores, datos_nuevos: datosNuevos,
        })
      } else {
        const { error } = await supabase.from('insumos').insert({ ...values, stock_actual: 0 })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      qc.invalidateQueries({ queryKey: ['insumo', id] })
      toast.success(isEdit ? 'Insumo actualizado' : 'Insumo creado')
      navigate(isEdit ? `/dashboard/insumos/${id}` : '/dashboard/insumos')
    },
    onError: e => toast.error(e.message),
  })

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar insumo' : 'Nuevo insumo'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Insumos', href: '/dashboard/insumos' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="lg:col-span-2 card p-6 space-y-7">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${CATEGORIA_COLORS[categoria] || 'from-stone-400 to-stone-600'}`}>
              <Package className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar producto de inventario' : 'Nuevo producto de inventario'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {nombre || 'Completa los campos del producto'}
              </p>
            </div>
          </div>

          {/* ── Identificación ── */}
          <FormSection icon={Tag} title="Identificación" gradient="from-amber-400 to-amber-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre del producto"
                  placeholder="Ej: Antibiótico Enrofloxacino, Alimento iniciador…"
                  error={errors.nombre?.message}
                  {...register('nombre')}
                />
              </div>
              <Select
                label="Categoría"
                options={CATEGORIAS_INSUMO}
                placeholder="Seleccionar categoría"
                error={errors.categoria?.message}
                {...register('categoria')}
              />
              <Select
                label="Unidad de medida"
                options={UNIDADES_MEDIDA}
                placeholder="Seleccionar unidad"
                error={errors.unidad_medida?.message}
                {...register('unidad_medida')}
              />
            </div>
          </FormSection>

          {/* ── Stock y estado ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={ShieldAlert} title="Alerta de stock" gradient="from-amber-400 to-orange-500">
              <Input
                label="Stock mínimo de alerta"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                error={errors.stock_minimo?.message}
                {...register('stock_minimo')}
              />
              <p className="text-xs text-stone-400 dark:text-stone-500 -mt-2">
                Recibirás una alerta cuando el stock caiga por debajo de este valor.
              </p>
            </FormSection>

            <FormSection icon={Activity} title="Estado" gradient="from-green-400 to-green-600">
              <Select
                label="Estado del producto"
                options={[
                  { value: 'activo',   label: 'Activo — disponible en inventario' },
                  { value: 'inactivo', label: 'Inactivo — fuera de uso' },
                ]}
                error={errors.estado?.message}
                {...register('estado')}
              />
            </FormSection>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button type="submit" loading={mutation.isPending || isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear insumo'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/insumos')}>
              Cancelar
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          nombre={nombre}
          categoria={categoria}
          unidadMedida={unidadMedida}
          stockMinimo={stockMinimo}
          estado={estado}
          isEdit={isEdit}
        />
      </div>
    </div>
  )
}
