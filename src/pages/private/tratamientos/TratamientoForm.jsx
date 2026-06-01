import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { TIPOS_TRATAMIENTO } from '../../../lib/utils'
import { FlaskConical, Info } from 'lucide-react'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

/* Categorías de insumos válidas para tratamientos */
const CATEGORIAS_TRATAMIENTO = ['medicamento', 'vacuna', 'desinfectante', 'otro']

/* Mapa tipo-tratamiento → categorías de insumo sugeridas (se muestran primero) */
const CATEGORIAS_SUGERIDAS = {
  vacunacion:      ['vacuna', 'medicamento'],
  medicacion:      ['medicamento'],
  antibiotico:     ['medicamento'],
  vitaminas:       ['medicamento'],
  desparasitacion: ['medicamento', 'desinfectante'],
  otro:            CATEGORIAS_TRATAMIENTO,
}

const CATEGORIA_LABELS = {
  medicamento:  'Medicamento',
  vacuna:       'Vacuna',
  desinfectante: 'Desinfectante',
  otro:         'Otro',
}

export default function TratamientoForm() {
  const { id }     = useParams()
  const isEdit     = !!id
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const { perfil } = useAuth()

  const schema = useMemo(() => z.object({
    fecha_inicio:     z.string().min(1, 'Requerido'),
    fecha_fin:        z.string().optional(),
    galpon_id:        z.string().min(1, 'Requerido'),
    tipo:             z.string().min(1, 'Requerido'),
    insumo_id:        isEdit ? z.string() : z.string().min(1, 'Selecciona un producto del inventario'),
    cantidad_usada:   isEdit
      ? z.any()
      : z.coerce.number().positive('Debe ser mayor a 0'),
    dosis_aplicacion: z.string().min(1, 'Requerido'),
    responsable:      z.string().min(1, 'Requerido'),
    estado:           z.enum(['activo', 'finalizado']),
    observaciones:    z.string().optional(),
  }), [isEdit])

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_inicio:   new Date().toISOString().slice(0, 10),
      estado:         'activo',
      insumo_id:      '',
      cantidad_usada: '',
    },
  })

  const galponId      = watch('galpon_id')
  const tipoTrat      = watch('tipo')
  const insumoId      = watch('insumo_id')
  const cantidadUsada = watch('cantidad_usada')

  /* ── Galpones ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-todos'],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  /* ── Lote activo del galpón ── */
  const { data: loteActivo } = useQuery({
    queryKey: ['lote-activo', galponId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lotes').select('id, nombre_numero')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId,
  })

  /* ── Insumos aptos para tratamientos ── */
  const { data: insumos } = useQuery({
    queryKey: ['insumos-tratamientos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('insumos')
        .select('id, nombre, categoria, unidad_medida, stock_actual')
        .eq('estado', 'activo')
        .in('categoria', CATEGORIAS_TRATAMIENTO)
        .order('categoria')
        .order('nombre')
      return data || []
    },
  })

  /* ── Cargar datos en edición ── */
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
      fecha_inicio:     tratamiento.fecha_inicio,
      fecha_fin:        tratamiento.fecha_fin || '',
      galpon_id:        tratamiento.galpon_id,
      tipo:             tratamiento.tipo,
      insumo_id:        tratamiento.insumo_id || '',
      cantidad_usada:   tratamiento.cantidad_usada ?? '',
      dosis_aplicacion: tratamiento.dosis_aplicacion,
      responsable:      tratamiento.responsable,
      estado:           tratamiento.estado,
      observaciones:    tratamiento.observaciones || '',
    })
  }, [tratamiento, reset])

  /* ── Filtrar insumos según tipo de tratamiento ── */
  const insumosFiltrados = useMemo(() => {
    if (!insumos) return []
    if (!tipoTrat) return insumos

    const sugeridas = CATEGORIAS_SUGERIDAS[tipoTrat] || CATEGORIAS_TRATAMIENTO
    const principal = insumos.filter(i => sugeridas.includes(i.categoria))
    const resto     = insumos.filter(i => !sugeridas.includes(i.categoria))

    return [...principal, ...resto]
  }, [insumos, tipoTrat])

  const insumoSeleccionado = insumosFiltrados.find(i => i.id === insumoId)
  const sinStock           = !isEdit && insumoSeleccionado && insumoSeleccionado.stock_actual === 0
  const stockInsuficiente  = !isEdit && insumoSeleccionado && Number(cantidadUsada) > insumoSeleccionado.stock_actual

  /* Opciones del selector de insumos con badge de categoría */
  const opcionesInsumos = useMemo(() => {
    const sugeridas = CATEGORIAS_SUGERIDAS[tipoTrat] || []
    return insumosFiltrados.map(i => {
      const esSugerido = sugeridas.includes(i.categoria)
      const cat = CATEGORIA_LABELS[i.categoria] || i.categoria
      return {
        value: i.id,
        label: `${esSugerido ? '★ ' : ''}${i.nombre} [${cat}] — ${i.stock_actual} ${i.unidad_medida}`,
      }
    })
  }, [insumosFiltrados, tipoTrat])

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        const payload = {
          fecha_inicio:     values.fecha_inicio,
          fecha_fin:        values.fecha_fin || null,
          galpon_id:        values.galpon_id,
          lote_id:          tratamiento?.lote_id,
          tipo:             values.tipo,
          nombre_producto:  tratamiento?.nombre_producto,
          dosis_aplicacion: values.dosis_aplicacion,
          responsable:      values.responsable,
          estado:           values.estado,
          observaciones:    values.observaciones || null,
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

        /* 1. Registrar tratamiento */
        const { error: errTrat } = await supabase.from('tratamientos').insert({
          fecha_inicio:     values.fecha_inicio,
          fecha_fin:        values.fecha_fin || null,
          galpon_id:        values.galpon_id,
          lote_id:          loteActivo.id,
          tipo:             values.tipo,
          nombre_producto:  insumo.nombre,
          insumo_id:        values.insumo_id,
          cantidad_usada:   values.cantidad_usada,
          dosis_aplicacion: values.dosis_aplicacion,
          responsable:      values.responsable,
          estado:           values.estado,
          observaciones:    values.observaciones || null,
        })
        if (errTrat) throw errTrat

        /* 2. Descontar del inventario */
        const tipoLabel = TIPOS_TRATAMIENTO.find(t => t.value === values.tipo)?.label || values.tipo
        const { error: errMov } = await supabase.from('movimientos_insumos').insert({
          fecha:             values.fecha_inicio,
          tipo:              'salida',
          insumo_id:         values.insumo_id,
          cantidad:          values.cantidad_usada,
          destino_proveedor: `Tratamiento: ${tipoLabel} — Lote ${loteActivo.nombre_numero}`,
          observaciones:     'Registrado automáticamente desde módulo de tratamientos',
          registrado_por:    perfil?.id,
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

  /* Categorías sugeridas para el tipo seleccionado */
  const sugeridas = CATEGORIAS_SUGERIDAS[tipoTrat] || []

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar tratamiento' : 'Nuevo tratamiento'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tratamientos', href: '/dashboard/tratamientos' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha de inicio" type="date" error={errors.fecha_inicio?.message} {...register('fecha_inicio')} />
          <Input label="Fecha de fin (opcional)" type="date" {...register('fecha_fin')} />
        </div>

        <Select
          label="Galpón"
          options={(galpones || []).map(g => ({ value: g.id, label: g.nombre }))}
          placeholder="Seleccionar galpón"
          error={errors.galpon_id?.message}
          {...register('galpon_id')}
        />

        {galponId && loteActivo && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Lote activo: <strong>{loteActivo.nombre_numero}</strong>
          </div>
        )}
        {galponId && !loteActivo && !isEdit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-400">
            Sin lote activo en este galpón
          </div>
        )}

        <Select
          label="Tipo de tratamiento"
          options={TIPOS_TRATAMIENTO}
          placeholder="Seleccionar tipo"
          error={errors.tipo?.message}
          {...register('tipo')}
        />

        {/* ── Producto del inventario (solo al crear) ── */}
        {!isEdit ? (
          <div className="space-y-2">
            <div>
              <Select
                label="Producto del inventario"
                options={opcionesInsumos}
                placeholder="Seleccionar producto"
                error={errors.insumo_id?.message}
                {...register('insumo_id')}
              />

              {/* Aviso de categorías sugeridas para el tipo seleccionado */}
              {tipoTrat && sugeridas.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <FlaskConical className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" />
                  <span>
                    Para <strong>{TIPOS_TRATAMIENTO.find(t => t.value === tipoTrat)?.label}</strong>
                    {' '}se sugieren: {sugeridas.map(c => CATEGORIA_LABELS[c]).join(', ')}
                    {'. Los marcados con ★ pertenecen a estas categorías.'}
                  </span>
                </div>
              )}
            </div>

            {/* Stock badge */}
            {insumoSeleccionado && (
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${
                sinStock
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}>
                <span>
                  Stock: <strong>{insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}</strong>
                  {sinStock && ' — Sin existencias'}
                </span>
                <span className="capitalize px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                  {CATEGORIA_LABELS[insumoSeleccionado.categoria] || insumoSeleccionado.categoria}
                </span>
              </div>
            )}

            {/* Cantidad */}
            <div>
              <Input
                label={`Cantidad usada${insumoSeleccionado ? ` (${insumoSeleccionado.unidad_medida})` : ''}`}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0"
                error={errors.cantidad_usada?.message}
                {...register('cantidad_usada')}
              />
              {stockInsuficiente && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  La cantidad supera el stock disponible ({insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}).
                </p>
              )}
            </div>

            {/* Aviso si no hay insumos disponibles */}
            {insumos && insumos.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                <span>No hay medicamentos, vacunas ni desinfectantes en inventario. <a href="/dashboard/insumos/nuevo" className="underline font-medium">Agregar insumo</a></span>
              </div>
            )}
          </div>
        ) : (
          /* En edición solo se muestra info del insumo, no se modifica el stock */
          <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-600 dark:text-stone-400">
            Producto registrado: <strong>{tratamiento?.nombre_producto || '—'}</strong>
            {tratamiento?.cantidad_usada != null && (
              <> · Cantidad usada: <strong>{tratamiento.cantidad_usada}</strong></>
            )}
          </div>
        )}

        <Input
          label="Dosis y forma de aplicación"
          placeholder="Ej: 1 mL por litro de agua, vía oral"
          error={errors.dosis_aplicacion?.message}
          {...register('dosis_aplicacion')}
        />
        <Input
          label="Responsable (veterinario / encargado)"
          error={errors.responsable?.message}
          {...register('responsable')}
        />
        <Select
          label="Estado"
          options={[
            { value: 'activo',     label: 'Activo — En curso' },
            { value: 'finalizado', label: 'Finalizado' },
          ]}
          error={errors.estado?.message}
          {...register('estado')}
        />
        <Textarea
          label="Observaciones (opcional)"
          placeholder="Notas, reacciones observadas, indicaciones del veterinario…"
          {...register('observaciones')}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            loading={mutation.isPending || isSubmitting}
            disabled={stockInsuficiente || sinStock}
          >
            {isEdit ? 'Guardar cambios' : 'Registrar tratamiento'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/tratamientos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
