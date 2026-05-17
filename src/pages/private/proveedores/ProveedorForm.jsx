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

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  telefono: z.string().optional(),
  correo: z.string().email('Correo inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  tipo_proveedor: z.string().min(1, 'Requerido'),
  estado: z.enum(['activo', 'inactivo']),
  notas: z.string().optional(),
})

export default function ProveedorForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [selectedInsumos, setSelectedInsumos] = useState([])
  const [selectedRazas, setSelectedRazas] = useState([])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', tipo_proveedor: 'insumos' },
  })

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
    if (proveedor) {
      reset({ nombre: proveedor.nombre, telefono: proveedor.telefono || '', correo: proveedor.correo || '', direccion: proveedor.direccion || '', tipo_proveedor: proveedor.tipo_proveedor, estado: proveedor.estado, notas: proveedor.notas || '' })
    }
  }, [proveedor, reset])

  useEffect(() => { if (insumosAsignados) setSelectedInsumos(insumosAsignados) }, [insumosAsignados])
  useEffect(() => { if (razasAsignadas) setSelectedRazas(razasAsignadas) }, [razasAsignadas])

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

      // Sync insumos
      await supabase.from('proveedores_insumos').delete().eq('proveedor_id', proveedorId)
      if (selectedInsumos.length > 0) {
        await supabase.from('proveedores_insumos').insert(selectedInsumos.map(iid => ({ proveedor_id: proveedorId, insumo_id: iid })))
      }

      // Sync razas
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
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Proveedores', href: '/dashboard/proveedores' }, { label: isEdit ? 'Editar' : 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Nombre del proveedor" error={errors.nombre?.message} {...register('nombre')} />
        <Select label="Tipo de proveedor" options={TIPOS_PROVEEDOR} placeholder="Seleccionar tipo" error={errors.tipo_proveedor?.message} {...register('tipo_proveedor')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Teléfono (opcional)" {...register('telefono')} />
          <Input label="Correo (opcional)" type="email" error={errors.correo?.message} {...register('correo')} />
        </div>
        <Input label="Dirección (opcional)" {...register('direccion')} />
        <Select label="Estado" options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} error={errors.estado?.message} {...register('estado')} />

        {/* Insumos relacionados */}
        <div>
          <label className="label">Insumos que suministra</label>
          <div className="space-y-2 mt-1 max-h-40 overflow-y-auto border border-stone-200 rounded-lg p-3">
            {(insumos || []).map(i => (
              <label key={i.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={selectedInsumos.includes(i.id)} onChange={() => toggleInsumo(i.id)} className="rounded border-stone-300 text-primary-600 focus:ring-primary-500" />
                {i.nombre}
              </label>
            ))}
            {(insumos || []).length === 0 && <p className="text-stone-400 text-xs">No hay insumos registrados</p>}
          </div>
        </div>

        {/* Razas relacionadas */}
        <div>
          <label className="label">Razas que provee</label>
          <div className="space-y-2 mt-1 max-h-40 overflow-y-auto border border-stone-200 rounded-lg p-3">
            {(razas || []).map(r => (
              <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={selectedRazas.includes(r.id)} onChange={() => toggleRaza(r.id)} className="rounded border-stone-300 text-primary-600 focus:ring-primary-500" />
                {r.nombre}
              </label>
            ))}
            {(razas || []).length === 0 && <p className="text-stone-400 text-xs">No hay razas registradas</p>}
          </div>
        </div>

        <Textarea label="Notas (opcional)" {...register('notas')} />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting}>{isEdit ? 'Guardar cambios' : 'Registrar proveedor'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/proveedores')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
