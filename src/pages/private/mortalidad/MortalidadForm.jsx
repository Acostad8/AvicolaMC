import { useEffect } from 'react'
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
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import { Clock, AlertTriangle } from 'lucide-react'

const schema = z.object({
  fecha:          z.string().min(1, 'Requerido'),
  galpon_id:      z.string().min(1, 'Selecciona un galpón'),
  cantidad_bajas: z.coerce.number().int().positive('Debe ser mayor a 0'),
  causa:          z.string().min(1, 'Selecciona una causa'),
  causa_otra:     z.string().optional(),
  observaciones:  z.string().optional(),
})

/* Milisegundos transcurridos desde la creación del registro */
function msDesdeCreacion(created_at) {
  if (!created_at) return Infinity
  return Date.now() - new Date(created_at).getTime()
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

  /* ── Registro existente (solo edición) ── */
  const { data: registro } = useQuery({
    queryKey: ['mortalidad-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mortalidad')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales)')
        .eq('id', id)
        .single()
      return data
    },
    enabled: isEdit,
  })

  /* Pre-cargar valores en edición */
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

  /* Cálculo de ventana de edición */
  const msTranscurridos   = msDesdeCreacion(registro?.created_at)
  const fueraDePlazo      = isEdit && msTranscurridos > 24 * 3600 * 1000
  const msRestantes       = Math.max(0, 24 * 3600 * 1000 - msTranscurridos)
  const horasRestantes    = Math.floor(msRestantes / 3600000)
  const minutosRestantes  = Math.floor((msRestantes % 3600000) / 60000)

  /* ── Galpones (solo creación) ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
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
      const { data } = await supabase
        .from('lotes')
        .select('id, nombre_numero, cantidad_aves_actuales')
        .eq('galpon_id', galponId).eq('estado', 'activo').maybeSingle()
      return data
    },
    enabled: !!galponId && !isEdit,
  })

  /*
   * En edición el tope real es: aves_actuales_del_lote + old_bajas
   * (porque old_bajas ya estaban descontadas del lote).
   * En creación el tope es aves_actuales del lote activo.
   */
  const topeDisponible = isEdit
    ? (registro?.lote?.cantidad_aves_actuales ?? 0) + (registro?.cantidad_bajas ?? 0)
    : (loteActivo?.cantidad_aves_actuales ?? 0)

  const superaBajas = Number(cantidadBajas) > topeDisponible && topeDisponible > 0

  /* ── Mutación ── */
  const mutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) {
        if (fueraDePlazo) throw new Error('El período de edición de 24 horas ha vencido')

        const old_bajas = registro.cantidad_bajas
        const new_bajas = Number(values.cantidad_bajas)
        const delta     = new_bajas - old_bajas   // positivo = más bajas, negativo = corrección a la baja

        const datosAnteriores = {
          fecha:          registro.fecha,
          cantidad_bajas: old_bajas,
          causa:          registro.causa,
          causa_otra:     registro.causa_otra ?? null,
          observaciones:  registro.observaciones ?? null,
        }
        const datosNuevos = {
          fecha:          values.fecha,
          cantidad_bajas: new_bajas,
          causa:          values.causa,
          causa_otra:     values.causa === 'otra' ? (values.causa_otra || null) : null,
          observaciones:  values.observaciones || null,
        }

        /* 1. Actualizar el registro */
        const { error: errUpd } = await supabase
          .from('mortalidad')
          .update({
            fecha:          values.fecha,
            cantidad_bajas: new_bajas,
            causa:          values.causa,
            causa_otra:     values.causa === 'otra' ? (values.causa_otra || null) : null,
            observaciones:  values.observaciones || null,
          })
          .eq('id', id)
        if (errUpd) throw errUpd

        /* 2. Ajustar aves del lote si cambió la cantidad */
        if (delta !== 0) {
          const nuevaCantidad = Math.max(0, registro.lote.cantidad_aves_actuales - delta)
          const { error: errLote } = await supabase
            .from('lotes')
            .update({ cantidad_aves_actuales: nuevaCantidad })
            .eq('id', registro.lote_id)
          if (errLote) throw errLote
        }

        /* 3. Insertar registro de auditoría */
        const { error: errAud } = await supabase
          .from('auditoria_mortalidad')
          .insert({
            mortalidad_id:     id,
            editado_por:       perfil.id,
            datos_anteriores:  datosAnteriores,
            datos_nuevos:      datosNuevos,
          })
        if (errAud) throw errAud

      } else {
        /* Creación normal */
        if (!loteActivo) throw new Error('No hay lote activo en este galpón')
        if (values.cantidad_bajas > loteActivo.cantidad_aves_actuales) {
          throw new Error(
            `Las bajas (${values.cantidad_bajas}) no pueden superar las aves activas (${loteActivo.cantidad_aves_actuales})`
          )
        }
        const { error } = await supabase.from('mortalidad').insert({
          ...values,
          lote_id:       loteActivo.id,
          causa_otra:    values.causa === 'otra' ? values.causa_otra : null,
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
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar mortalidad' : 'Registrar mortalidad'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mortalidad', href: '/dashboard/mortalidad' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      {/* ── Banner: fuera de plazo ── */}
      {isEdit && fueraDePlazo && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>El período de edición de 24 horas ha vencido. Este registro ya no puede modificarse.</span>
        </div>
      )}

      {/* ── Banner: tiempo restante ── */}
      {isEdit && !fueraDePlazo && registro && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>
            Tiempo restante para editar:{' '}
            <strong>{horasRestantes}h {minutosRestantes}min</strong>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input
          label="Fecha"
          type="date"
          error={errors.fecha?.message}
          disabled={fueraDePlazo}
          {...register('fecha')}
        />

        {/* En edición: galpón y lote son informativos, no editables */}
        {isEdit ? (
          <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-600 dark:text-stone-400 space-y-0.5">
            <p>Galpón: <strong className="text-stone-800 dark:text-stone-200">{registro?.galpon?.nombre || '—'}</strong></p>
            <p>Lote: <strong className="text-stone-800 dark:text-stone-200">{registro?.lote?.nombre_numero || '—'}</strong>
              {' · '}Aves disponibles para corrección: <strong className="text-stone-800 dark:text-stone-200">{topeDisponible.toLocaleString('es-CO')}</strong>
            </p>
          </div>
        ) : (
          <>
            <Select
              label="Galpón"
              options={(galpones || []).map(g => ({ value: g.id, label: g.nombre }))}
              placeholder="Seleccionar galpón"
              error={errors.galpon_id?.message}
              {...register('galpon_id')}
            />
            {galponId && loteActivo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                Lote: <strong>{loteActivo.nombre_numero}</strong> — {loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')} aves vivas
              </div>
            )}
            {galponId && !loteActivo && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                Este galpón no tiene lote activo.
              </div>
            )}
          </>
        )}

        <Input
          label="Cantidad de aves muertas"
          type="number"
          min="1"
          error={errors.cantidad_bajas?.message}
          disabled={fueraDePlazo}
          {...register('cantidad_bajas')}
        />
        {superaBajas && !fueraDePlazo && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-400">
            Las bajas no pueden superar las aves disponibles ({topeDisponible.toLocaleString('es-CO')}).
          </div>
        )}

        <Select
          label="Causa"
          options={CAUSAS_MORTALIDAD}
          placeholder="Seleccionar causa"
          error={errors.causa?.message}
          disabled={fueraDePlazo}
          {...register('causa')}
        />
        {causa === 'otra' && !fueraDePlazo && (
          <Input
            label="Especifica la causa"
            error={errors.causa_otra?.message}
            {...register('causa_otra')}
          />
        )}

        <Textarea
          label="Observaciones (opcional)"
          disabled={fueraDePlazo}
          {...register('observaciones')}
        />

        <div className="flex gap-3 pt-2">
          {!fueraDePlazo && (
            <Button
              type="submit"
              loading={mutation.isPending || isSubmitting}
              disabled={isEdit ? superaBajas : (!loteActivo || superaBajas)}
            >
              {isEdit ? 'Guardar cambios' : 'Guardar registro'}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEdit ? `/dashboard/mortalidad/${id}` : '/dashboard/mortalidad')}
          >
            {fueraDePlazo ? 'Volver' : 'Cancelar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
