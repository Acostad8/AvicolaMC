import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { TIPOS_AVE, getLabelFromValue } from '../../../lib/utils'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Modal, { ConfirmModal } from '../../../components/ui/Modal'
import Badge from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import { TableSkeleton } from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import { Bird } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  tipo: z.enum(['ponedoras', 'engorde']),
  descripcion: z.string().optional(),
})

export default function RazasList() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [deleteRaza, setDeleteRaza] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['razas'],
    queryFn: async () => {
      const { data } = await supabase.from('razas').select('*').order('nombre')
      return data || []
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'ponedoras' },
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (modal?.id) {
        const { error } = await supabase.from('razas').update(values).eq('id', modal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('razas').insert(values)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['razas'])
      toast.success(modal?.id ? 'Raza actualizada' : 'Raza creada')
      setModal(null)
      reset()
    },
    onError: e => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('razas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['razas']); toast.success('Raza eliminada'); setDeleteRaza(null) },
    onError: e => toast.error(e.message),
  })

  function openEdit(raza) {
    reset({ nombre: raza.nombre, tipo: raza.tipo, descripcion: raza.descripcion || '' })
    setModal(raza)
  }

  function openNew() {
    reset({ nombre: '', tipo: 'ponedoras', descripcion: '' })
    setModal({})
  }

  return (
    <div>
      <PageHeader
        title="Razas"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lotes y Razas', href: '/dashboard/lotes' }, { label: 'Razas' }]}
        actions={isAdmin && <Button icon={Plus} onClick={openNew}>Nueva raza</Button>}
      />

      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={4} cols={4} /> : data?.length === 0 ? (
          <EmptyState icon={Bird} title="No hay razas registradas" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {['Nombre', 'Tipo', 'Descripción', ...(isAdmin ? ['Acciones'] : [])].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data?.map(r => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{r.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.tipo === 'ponedoras' ? 'amber' : 'blue'}>{getLabelFromValue(TIPOS_AVE, r.tipo)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500 max-w-xs truncate">{r.descripcion || '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(r)}>Editar</Button>
                        <Button variant="ghost" size="sm" icon={Trash2} className="text-red-500 hover:bg-red-50" onClick={() => setDeleteRaza(r)}>Eliminar</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Editar raza' : 'Nueva raza'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSubmit(v => saveMutation.mutate(v))} loading={saveMutation.isPending}>Guardar</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Select label="Tipo" options={TIPOS_AVE} error={errors.tipo?.message} {...register('tipo')} />
          <Textarea label="Descripción (opcional)" {...register('descripcion')} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteRaza}
        onClose={() => setDeleteRaza(null)}
        onConfirm={() => deleteMutation.mutate(deleteRaza.id)}
        loading={deleteMutation.isPending}
        title="Eliminar raza"
        message={`¿Eliminar la raza "${deleteRaza?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
