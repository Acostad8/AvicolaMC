import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  Building2, Users, FileText, Settings2,
  CheckCircle2, AlertCircle, AlertTriangle, Activity, Wrench, Lock,
} from 'lucide-react'
import { Skeleton } from '../../../components/ui/Skeleton'

const schema = z.object({
  nombre:           z.string().min(1, 'El nombre es requerido'),
  capacidad_maxima: z.coerce.number().int().positive('Debe ser un número positivo'),
  descripcion:      z.string().optional(),
  estado:           z.enum(['disponible', 'en_produccion', 'en_mantenimiento']),
  encargado_id:     z.string().optional(),
})

const ESTADO_CONFIG = {
  disponible:       { icon: CheckCircle2,  label: 'Disponible',        color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' },
  en_produccion:    { icon: Activity,      label: 'En producción',     color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'   },
  en_mantenimiento: { icon: Wrench,        label: 'En mantenimiento',  color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50'       },
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

function PreviewCard({ nombre, capacidad, descripcion, estado, encargadoNombre, isEdit }) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.disponible
  const EstadoIcon = cfg.icon

  return (
    <div className="card p-5 space-y-5 h-fit">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="h-3.5 w-3.5 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
      </div>

      <div className={`rounded-xl border-2 p-4 space-y-3 transition-all duration-300 ${isEdit ? 'border-primary-300 dark:border-primary-700 dark:bg-primary-950/20' : 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${isEdit ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color} flex items-center gap-1`}>
            <EstadoIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>

        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-base leading-tight">
            {nombre || <span className="text-stone-400 dark:text-stone-600 italic font-normal">Nombre del galpón</span>}
          </p>
          {descripcion
            ? <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">{descripcion}</p>
            : <p className="text-xs text-stone-400 dark:text-stone-600 mt-1 italic">Sin descripción</p>
          }
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 dark:text-stone-500">Capacidad</p>
            <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mt-0.5">
              {capacidad > 0 ? Number(capacidad).toLocaleString('es-CO') : '—'}
            </p>
            {capacidad > 0 && <p className="text-xs text-stone-400 dark:text-stone-500">aves</p>}
          </div>
          <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 dark:text-stone-500">Encargado</p>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5 truncate">
              {encargadoNombre || <span className="font-normal text-stone-400 italic">Sin asignar</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Sugerencias</p>
        <div className="space-y-2">
          {[
            { ok: nombre?.length > 0,     text: 'Nombre del galpón ingresado' },
            { ok: capacidad > 0,           text: 'Capacidad máxima definida' },
            { ok: !!encargadoNombre,       text: 'Encargado asignado' },
            { ok: descripcion?.length > 0, text: 'Descripción agregada' },
          ].map(({ ok, text }) => (
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
  )
}

export default function GalponForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'disponible', encargado_id: '' },
  })

  const capacidad   = watch('capacidad_maxima')
  const nombre      = watch('nombre')
  const descripcion = watch('descripcion')
  const estado      = watch('estado')
  const encargadoId = watch('encargado_id')

  const [nombreDebounced, setNombreDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setNombreDebounced(nombre?.trim() || ''), 400)
    return () => clearTimeout(t)
  }, [nombre])

  const { data: nombreDuplicado } = useQuery({
    queryKey: ['galpon-nombre-check', nombreDebounced, id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id', { count: 'exact', head: true })
        .ilike('nombre', nombreDebounced)
      if (id) q = q.neq('id', id)
      const { count } = await q
      return (count || 0) > 0
    },
    enabled: nombreDebounced.length > 0,
  })

  const { data: encargados } = useQuery({
    queryKey: ['encargados-list'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles')
        .select('id, nombre_completo').eq('rol', 'encargado').eq('estado', 'activo').order('nombre_completo')
      return data || []
    },
  })

  const { data: galpon, isLoading: loadingGalpon } = useQuery({
    queryKey: ['galpon', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  const { data: loteActivoInfo } = useQuery({
    queryKey: ['galpon-lote-activo', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lotes')
        .select('id, cantidad_aves_actuales')
        .eq('galpon_id', id)
        .eq('estado', 'activo')
        .maybeSingle()
      return data
    },
    enabled: isEdit,
  })

  const tieneLoteActivo      = !!loteActivoInfo
  const avesActivas          = loteActivoInfo?.cantidad_aves_actuales ?? 0
  const capacidadInsuficiente = tieneLoteActivo && Number(capacidad) < avesActivas

  useEffect(() => {
    if (galpon) reset({
      nombre:           galpon.nombre,
      capacidad_maxima: galpon.capacidad_maxima,
      descripcion:      galpon.descripcion || '',
      estado:           galpon.estado,
      encargado_id:     galpon.encargado_id || '',
    })
  }, [galpon, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (tieneLoteActivo && Number(values.capacidad_maxima) < avesActivas)
        throw new Error(`La capacidad no puede ser menor a las ${avesActivas.toLocaleString('es-CO')} aves activas en el lote actual`)

      const payload = { ...values, encargado_id: values.encargado_id || null }
      // El estado en_produccion lo gestiona el trigger; no se actualiza manualmente
      if (tieneLoteActivo) delete payload.estado
      if (isEdit) {
        const { error } = await supabase.from('galpones').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('galpones').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['galpones'] })
      qc.invalidateQueries({ queryKey: ['galpon', id] })
      toast.success(isEdit ? 'Galpón actualizado correctamente' : 'Galpón creado correctamente')
      navigate(isEdit ? `/dashboard/galpones/${id}` : '/dashboard/galpones')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [pendingValues, setPendingValues] = useState(null)

  const encargadoNombre = encargados?.find(e => e.id === encargadoId)?.nombre_completo || ''

  if (isEdit && loadingGalpon) return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="card p-6 space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={isEdit ? `Editar: ${galpon?.nombre || '…'}` : 'Nuevo galpón'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Galpones', href: '/dashboard/galpones' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        <form
          onSubmit={handleSubmit(v => {
            if (isEdit) { setPendingValues(v); setConfirmOpen(true) }
            else mutation.mutate(v)
          })}
          className="lg:col-span-2 card p-6 space-y-7"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${isEdit ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
              <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar galpón' : 'Crear nuevo galpón'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {nombre || 'Completa los campos para continuar'}
              </p>
            </div>
          </div>

          {/* Información básica */}
          <FormSection icon={FileText} title="Información básica" gradient="from-amber-400 to-amber-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre del galpón"
                  placeholder="Ej: Galpón A, Galpón Norte…"
                  error={errors.nombre?.message || (nombreDuplicado ? 'Ya existe un galpón con este nombre' : undefined)}
                  {...register('nombre')}
                />
              </div>
              <div>
                <Input
                  label="Capacidad máxima de aves"
                  type="number"
                  min="1"
                  placeholder="Ej: 5000"
                  error={errors.capacidad_maxima?.message || (capacidadInsuficiente ? `Mínimo ${avesActivas.toLocaleString('es-CO')} (aves activas en el lote)` : undefined)}
                  {...register('capacidad_maxima')}
                />
                {capacidad > 0 && !capacidadInsuficiente && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5">
                    Total: <span className="font-semibold text-stone-600 dark:text-stone-300">{Number(capacidad).toLocaleString('es-CO')} aves</span>
                  </p>
                )}
                {tieneLoteActivo && !capacidadInsuficiente && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                    <Lock className="h-3 w-3 flex-shrink-0" />
                    Mínimo permitido: <span className="font-semibold">{avesActivas.toLocaleString('es-CO')} aves</span> (lote activo)
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Descripción o notas (opcional)"
                  placeholder="Ubicación, características especiales, observaciones…"
                  rows={3}
                  {...register('descripcion')}
                />
              </div>
            </div>
          </FormSection>

          {/* Configuración + Encargado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={Settings2} title="Configuración" gradient="from-blue-400 to-blue-600">
              {tieneLoteActivo ? (
                /* Estado bloqueado: gestionado por el sistema mientras hay lote activo */
                <div className="space-y-2">
                  <label className="label flex items-center gap-1.5">
                    Estado del galpón
                    <Lock className="h-3 w-3 text-stone-400 dark:text-stone-500" aria-hidden="true" />
                  </label>
                  <div className="input-base bg-stone-50 dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 cursor-not-allowed pointer-events-none select-none flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    En producción
                  </div>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Cambia automáticamente al finalizar el lote activo.
                  </p>
                </div>
              ) : (
                <Select
                  label="Estado del galpón"
                  options={[
                    { value: 'disponible',       label: 'Disponible — listo para un lote' },
                    { value: 'en_mantenimiento', label: 'En mantenimiento — limpieza o reparación' },
                  ]}
                  error={errors.estado?.message}
                  {...register('estado')}
                />
              )}
            </FormSection>

            <FormSection icon={Users} title="Encargado" gradient="from-green-400 to-green-600">
              <Select
                label="Encargado asignado"
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...(encargados || []).map(e => ({ value: e.id, label: e.nombre_completo })),
                ]}
                error={errors.encargado_id?.message}
                {...register('encargado_id')}
              />
              {encargados?.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-2">
                  No hay encargados activos registrados.
                </p>
              )}
            </FormSection>
          </div>

          {/* Nota informativa cuando está en mantenimiento */}
          {!tieneLoteActivo && estado === 'en_mantenimiento' && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Los galpones en mantenimiento no aparecen disponibles para asignar nuevos lotes.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={!!nombreDuplicado || !!capacidadInsuficiente}>
              {isEdit ? 'Guardar cambios' : 'Crear galpón'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/galpones')}>
              Cancelar
            </Button>
          </div>
        </form>

        <PreviewCard
          nombre={nombre}
          capacidad={capacidad}
          descripcion={descripcion}
          estado={estado}
          encargadoNombre={encargadoNombre}
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
              {
                label:  'Nombre',
                oldVal: galpon?.nombre || '',
                newVal: pendingValues?.nombre || '',
                format: v => v || '—',
              },
              {
                label:  'Capacidad máxima',
                oldVal: galpon?.capacidad_maxima,
                newVal: pendingValues ? Number(pendingValues.capacidad_maxima) : null,
                format: v => v != null ? `${Number(v).toLocaleString('es-CO')} aves` : '—',
              },
              {
                label:  'Descripción',
                oldVal: galpon?.descripcion || '',
                newVal: pendingValues?.descripcion || '',
                format: v => v || '—',
              },
              ...(!tieneLoteActivo ? [{
                label:  'Estado',
                oldVal: galpon?.estado || '',
                newVal: pendingValues?.estado || '',
                format: v => ESTADO_CONFIG[v]?.label || v || '—',
              }] : []),
              {
                label:  'Encargado',
                oldVal: galpon?.encargado_id || '',
                newVal: pendingValues?.encargado_id || '',
                format: v => encargados?.find(e => e.id === v)?.nombre_completo || (!v ? 'Sin asignar' : v),
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
