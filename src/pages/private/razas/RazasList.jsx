import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { TIPOS_AVE, getLabelFromValue } from '../../../lib/utils'
import { Plus, Pencil, Trash2, Bird, Search, X, Egg, Beef } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Modal, { ConfirmModal } from '../../../components/ui/Modal'
import PageHeader from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const schema = z.object({
  nombre:      z.string().min(1, 'El nombre es requerido'),
  tipo:        z.enum(['ponedoras', 'engorde']),
  descripcion: z.string().optional(),
})

/* ── Raza card ── */
function RazaCard({ raza, isAdmin, onEdit, onDelete, index, noMotion }) {
  const isPonedora = raza.tipo === 'ponedoras'
  return (
    <article
      className="card flex flex-col gap-0 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
      style={!noMotion ? { animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${index * 60}ms` } : {}}
    >
      {/* Color accent strip */}
      <div className={`h-1.5 w-full ${isPonedora ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Icon + name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isPonedora ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/25' : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm shadow-blue-500/25'}`}>
              {isPonedora
                ? <Egg className="h-6 w-6 text-white" aria-hidden="true" />
                : <Beef className="h-6 w-6 text-white" aria-hidden="true" />
              }
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 dark:text-stone-50 text-base">{raza.nombre}</h3>
              <Badge variant={isPonedora ? 'amber' : 'blue'} className="mt-1">
                {getLabelFromValue(TIPOS_AVE, raza.tipo)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1">
          {raza.descripcion ? (
            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-3">
              {raza.descripcion}
            </p>
          ) : (
            <p className="text-xs text-stone-300 dark:text-stone-600 italic">Sin descripción registrada.</p>
          )}
        </div>

        {/* Type pill */}
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl ${isPonedora ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'}`}>
          <Bird className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {isPonedora ? 'Raza de alta postura' : 'Raza para engorde'}
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex gap-2 pt-3 border-t border-stone-100 dark:border-stone-800 mt-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={Pencil}
              onClick={() => onEdit(raza)}
              className="flex-1 justify-center text-xs"
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => onDelete(raza)}
              className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label={`Eliminar ${raza.nombre}`}
            />
          </div>
        )}
      </div>
    </article>
  )
}

export default function RazasList() {
  const { isAdmin } = useAuth()
  const { noMotion } = useA11y()
  const qc = useQueryClient()
  const [modal, setModal]           = useState(null)
  const [deleteRaza, setDeleteRaza] = useState(null)
  const [search, setSearch]         = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['razas'],
    queryFn: async () => {
      const { data } = await supabase.from('razas').select('*').order('nombre')
      return data || []
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
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
      toast.success(modal?.id ? 'Raza actualizada correctamente' : 'Raza creada correctamente')
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
    onSuccess: () => {
      qc.invalidateQueries(['razas'])
      toast.success('Raza eliminada')
      setDeleteRaza(null)
    },
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

  /* Filter */
  const filtered = (data || []).filter(r => {
    const q = search.toLowerCase()
    return (!q || r.nombre.toLowerCase().includes(q) || (r.descripcion || '').toLowerCase().includes(q))
      && (!filterTipo || r.tipo === filterTipo)
  })

  const ponedoras = (data || []).filter(r => r.tipo === 'ponedoras').length
  const engorde   = (data || []).filter(r => r.tipo === 'engorde').length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Razas"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lotes y Razas', href: '/dashboard/lotes' },
          { label: 'Razas' },
        ]}
        actions={isAdmin && (
          <Button icon={Plus} onClick={openNew}>Nueva raza</Button>
        )}
      />

      {/* Summary chips */}
      {!isLoading && data?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400">
            <Bird className="h-3.5 w-3.5" aria-hidden="true" />
            {data.length} razas registradas
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-400">
            <Egg className="h-3.5 w-3.5" aria-hidden="true" />
            {ponedoras} ponedoras
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs font-medium text-blue-700 dark:text-blue-400">
            <Beef className="h-3.5 w-3.5" aria-hidden="true" />
            {engorde} engorde
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
          <input
            className="input-base pl-9 pr-9"
            placeholder="Buscar por nombre o descripción…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select className="input-base sm:w-44" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="ponedoras">Ponedoras</option>
          <option value="engorde">Engorde</option>
        </select>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-4">
              <div className="flex gap-3"><Skeleton className="w-12 h-12 rounded-2xl" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-16 rounded-full" /></div></div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-7 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bird}
            title={search || filterTipo ? 'Sin resultados' : 'No hay razas registradas'}
            description={search || filterTipo ? 'Ajusta los filtros.' : 'Crea la primera raza para asignarla a los lotes.'}
            action={isAdmin && !search && !filterTipo && (
              <Button icon={Plus} size="sm" onClick={openNew}>Crear primera raza</Button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((r, i) => (
            <RazaCard
              key={r.id}
              raza={r}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={setDeleteRaza}
              index={i}
              noMotion={noMotion}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.id ? `Editar: ${modal.nombre}` : 'Nueva raza'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSubmit(v => saveMutation.mutate(v))} loading={saveMutation.isPending}>
              {modal?.id ? 'Guardar cambios' : 'Crear raza'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input
            label="Nombre de la raza"
            placeholder="Ej: Ross 308, Hy-Line Brown…"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Select
            label="Tipo de ave"
            options={TIPOS_AVE}
            error={errors.tipo?.message}
            {...register('tipo')}
          />
          <Textarea
            label="Descripción (opcional)"
            placeholder="Características, rendimiento, observaciones…"
            rows={3}
            {...register('descripcion')}
          />
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteRaza}
        onClose={() => setDeleteRaza(null)}
        onConfirm={() => deleteMutation.mutate(deleteRaza.id)}
        loading={deleteMutation.isPending}
        title="Eliminar raza"
        message={`¿Eliminar la raza "${deleteRaza?.nombre}"? Si tiene lotes asociados, esos lotes quedarán sin raza. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
