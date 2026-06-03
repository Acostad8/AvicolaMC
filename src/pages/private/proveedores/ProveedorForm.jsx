import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { TIPOS_PROVEEDOR } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'
import {
  Truck, User, Phone, Mail, MapPin, Tag,
  Package, Bird, FileText, Activity,
  CheckCircle2, AlertCircle, Check,
} from 'lucide-react'

const schema = z.object({
  nombre:         z.string().min(1, 'Requerido'),
  telefono:       z.string().optional(),
  correo:         z.string().email('Correo inválido').optional().or(z.literal('')),
  direccion:      z.string().optional(),
  tipo_proveedor: z.string().min(1, 'Requerido'),
  estado:         z.enum(['activo', 'inactivo']),
  notas:          z.string().optional(),
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

function CheckList({ items, selected, onToggle, emptyText }) {
  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
      {items.length === 0 ? (
        <p className="text-stone-400 dark:text-stone-500 text-xs px-4 py-3">{emptyText}</p>
      ) : (
        <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/60 ${selected.includes(item.id) ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${selected.includes(item.id) ? 'bg-primary-500 border-primary-500' : 'border-stone-300 dark:border-stone-600'}`}>
                {selected.includes(item.id) && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className={`text-sm ${selected.includes(item.id) ? 'text-primary-700 dark:text-primary-300 font-medium' : 'text-stone-700 dark:text-stone-300'}`}>
                {item.nombre}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PreviewCard({ nombre, tipoLabel, telefono, correo, direccion, estado, selectedInsumos, selectedRazas, insumos, razas, isEdit }) {
  const estadoColor = estado === 'activo'
    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'

  const checks = [
    { ok: nombre?.length > 0,         text: 'Nombre del proveedor' },
    { ok: !!tipoLabel,                 text: 'Tipo de proveedor' },
    { ok: !!telefono || !!correo,      text: 'Contacto (teléfono o correo)' },
    { ok: selectedInsumos.length > 0,  text: 'Insumos asignados' },
  ]

  const insumosNombres = (insumos || []).filter(i => selectedInsumos.includes(i.id)).map(i => i.nombre)
  const razasNombres   = (razas   || []).filter(r => selectedRazas.includes(r.id)).map(r => r.nombre)

  return (
    <div className="space-y-4 h-fit">
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Vista previa</h2>
        </div>

        {/* Tarjeta proveedor */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-base leading-tight truncate">
                {nombre || <span className="italic font-normal text-stone-400 dark:text-stone-600">Nombre del proveedor</span>}
              </p>
              {tipoLabel && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{tipoLabel}</p>}
            </div>
          </div>

          {estado && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColor}`}>
              <Activity className="h-3 w-3" />
              {estado === 'activo' ? 'Activo' : 'Inactivo'}
            </span>
          )}

          {/* Contacto */}
          <div className="space-y-1.5">
            {telefono && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
                <Phone className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{telefono}</p>
              </div>
            )}
            {correo && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
                <Mail className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{correo}</p>
              </div>
            )}
            {direccion && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{direccion}</p>
              </div>
            )}
          </div>

          {/* Insumos / razas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Insumos</p>
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-0.5">{selectedInsumos.length}</p>
              {insumosNombres.length > 0 && (
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {insumosNombres.slice(0, 3).join(', ')}{insumosNombres.length > 3 ? ` +${insumosNombres.length - 3}` : ''}
                </p>
              )}
            </div>
            <div className="bg-white/60 dark:bg-stone-800/60 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-400 dark:text-stone-500">Razas</p>
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-0.5">{selectedRazas.length}</p>
              {razasNombres.length > 0 && (
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {razasNombres.join(', ')}
                </p>
              )}
            </div>
          </div>
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

export default function ProveedorForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [selectedInsumos, setSelectedInsumos] = useState([])
  const [selectedRazas,   setSelectedRazas]   = useState([])

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', tipo_proveedor: 'insumos' },
  })

  const nombre        = watch('nombre')
  const tipoProveedor = watch('tipo_proveedor')
  const telefono      = watch('telefono')
  const correo        = watch('correo')
  const direccion     = watch('direccion')
  const estado        = watch('estado')
  const notas         = watch('notas')

  const tipoLabel = TIPOS_PROVEEDOR.find(t => t.value === tipoProveedor)?.label

  const { data: proveedor } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  const { data: insumos } = useQuery({
    queryKey: ['insumos-activos'],
    queryFn: async () => {
      const { data } = await supabase.from('insumos').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  const { data: razas } = useQuery({
    queryKey: ['razas'],
    queryFn: async () => {
      const { data } = await supabase.from('razas').select('id, nombre').order('nombre')
      return data || []
    },
  })

  const { data: insumosAsignados } = useQuery({
    queryKey: ['proveedor-insumos', id],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores_insumos').select('insumo_id').eq('proveedor_id', id)
      return (data || []).map(r => r.insumo_id)
    },
    enabled: isEdit,
  })

  const { data: razasAsignadas } = useQuery({
    queryKey: ['proveedor-razas', id],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores_razas').select('raza_id').eq('proveedor_id', id)
      return (data || []).map(r => r.raza_id)
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (proveedor) reset({
      nombre: proveedor.nombre, telefono: proveedor.telefono || '',
      correo: proveedor.correo || '', direccion: proveedor.direccion || '',
      tipo_proveedor: proveedor.tipo_proveedor, estado: proveedor.estado,
      notas: proveedor.notas || '',
    })
  }, [proveedor, reset])

  useEffect(() => { if (insumosAsignados) setSelectedInsumos(insumosAsignados) }, [insumosAsignados])
  useEffect(() => { if (razasAsignadas)   setSelectedRazas(razasAsignadas) }, [razasAsignadas])

  const mutation = useMutation({
    mutationFn: async (values) => {
      let proveedorId = id
      if (isEdit) {
        const { error } = await supabase.from('proveedores').update(values).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('proveedores').insert(values).select('id').single()
        if (error) throw error
        proveedorId = data.id
      }
      await supabase.from('proveedores_insumos').delete().eq('proveedor_id', proveedorId)
      if (selectedInsumos.length > 0) {
        await supabase.from('proveedores_insumos').insert(selectedInsumos.map(iid => ({ proveedor_id: proveedorId, insumo_id: iid })))
      }
      await supabase.from('proveedores_razas').delete().eq('proveedor_id', proveedorId)
      if (selectedRazas.length > 0) {
        await supabase.from('proveedores_razas').insert(selectedRazas.map(rid => ({ proveedor_id: proveedorId, raza_id: rid })))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['proveedores'])
      toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor registrado')
      navigate('/dashboard/proveedores')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  function toggleInsumo(iid) {
    setSelectedInsumos(prev => prev.includes(iid) ? prev.filter(x => x !== iid) : [...prev, iid])
  }
  function toggleRaza(rid) {
    setSelectedRazas(prev => prev.includes(rid) ? prev.filter(x => x !== rid) : [...prev, rid])
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Proveedores', href: '/dashboard/proveedores' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Formulario (2/3) ── */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="lg:col-span-2 card p-6 space-y-7">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Truck className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-tight">
                {isEdit ? 'Editar proveedor' : 'Registrar nuevo proveedor'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {nombre || 'Completa los datos del proveedor'}
              </p>
            </div>
          </div>

          {/* ── Identificación ── */}
          <FormSection icon={Tag} title="Identificación" gradient="from-blue-400 to-blue-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre del proveedor"
                  placeholder="Ej: Distribuidora Avícola Norte…"
                  error={errors.nombre?.message}
                  {...register('nombre')}
                />
              </div>
              <Select
                label="Tipo de proveedor"
                options={TIPOS_PROVEEDOR}
                placeholder="Seleccionar tipo"
                error={errors.tipo_proveedor?.message}
                {...register('tipo_proveedor')}
              />
              <Select
                label="Estado"
                options={[
                  { value: 'activo',   label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' },
                ]}
                error={errors.estado?.message}
                {...register('estado')}
              />
            </div>
          </FormSection>

          {/* ── Contacto ── */}
          <FormSection icon={Phone} title="Contacto" gradient="from-green-400 to-green-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Teléfono (opcional)"
                placeholder="+57 300 000 0000"
                {...register('telefono')}
              />
              <Input
                label="Correo electrónico (opcional)"
                type="email"
                placeholder="contacto@proveedor.com"
                error={errors.correo?.message}
                {...register('correo')}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Dirección (opcional)"
                  placeholder="Ciudad, departamento, dirección…"
                  {...register('direccion')}
                />
              </div>
            </div>
          </FormSection>

          {/* ── Insumos y razas ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <FormSection icon={Package} title={`Insumos que suministra (${selectedInsumos.length})`} gradient="from-amber-400 to-amber-600">
              <CheckList
                items={insumos || []}
                selected={selectedInsumos}
                onToggle={toggleInsumo}
                emptyText="No hay insumos registrados"
              />
            </FormSection>

            <FormSection icon={Bird} title={`Razas que provee (${selectedRazas.length})`} gradient="from-violet-400 to-violet-600">
              <CheckList
                items={razas || []}
                selected={selectedRazas}
                onToggle={toggleRaza}
                emptyText="No hay razas registradas"
              />
            </FormSection>
          </div>

          {/* ── Notas ── */}
          <FormSection icon={FileText} title="Notas" gradient="from-stone-400 to-stone-600">
            <Textarea
              label="Notas adicionales (opcional)"
              placeholder="Condiciones de pago, tiempos de entrega, observaciones…"
              rows={3}
              {...register('notas')}
            />
          </FormSection>

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button type="submit" loading={mutation.isPending || isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Registrar proveedor'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/proveedores')}>
              Cancelar
            </Button>
          </div>
        </form>

        {/* ── Vista previa (1/3) ── */}
        <PreviewCard
          nombre={nombre}
          tipoLabel={tipoLabel}
          telefono={telefono}
          correo={correo}
          direccion={direccion}
          estado={estado}
          selectedInsumos={selectedInsumos}
          selectedRazas={selectedRazas}
          insumos={insumos}
          razas={razas}
          isEdit={isEdit}
        />
      </div>
    </div>
  )
}
