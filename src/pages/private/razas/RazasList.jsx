import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { Plus, Pencil, Trash2, Bird, Search, X, Egg, AlertTriangle, Layers } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import Modal, { ConfirmModal } from '../../../components/ui/Modal'
import PageHeader from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const schema = z.object({
  nombre:      z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
})

/* ── Raza card ── */
function RazaCard({ raza, isAdmin, onEdit, onDelete, checking, index, noMotion }) {
  return (
    <article
      className="card flex flex-col gap-0 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
      style={!noMotion ? { animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${index * 60}ms` } : {}}
    >
      {/* Color accent strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-yellow-400" />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Icon + name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/25">
              <Egg className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 dark:text-stone-50 text-base">{raza.nombre}</h3>
              <Badge variant="amber" className="mt-1">Ponedoras</Badge>
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
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
          <Bird className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          Raza de alta postura
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
              loading={checking}
              disabled={checking}
              className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label={`Eliminar ${raza.nombre}`}
            />
          </div>
        )}
      </div>
    </article>
  )
}

export default function RazasList({ embedded = false }) {
  const { isAdmin } = useAuth()
  const { noMotion } = useA11y()
  const qc = useQueryClient()
  const [modal, setModal]           = useState(null)
  const [deleteRaza, setDeleteRaza] = useState(null)
  const [blockedRaza, setBlockedRaza] = useState(null)
  const [checkingId, setCheckingId]   = useState(null)
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
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = { ...values, tipo: 'ponedoras' }
      if (modal?.id) {
        const { error } = await supabase.from('razas').update(payload).eq('id', modal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('razas').insert(payload)
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
    reset({ nombre: raza.nombre, descripcion: raza.descripcion || '' })
    setModal(raza)
  }

  function openNew() {
    reset({ nombre: '', descripcion: '' })
    setModal({})
  }

  async function handleDeleteClick(raza) {
    setCheckingId(raza.id)
    try {
      const { count } = await supabase
        .from('lotes')
        .select('id', { count: 'exact', head: true })
        .eq('raza_id', raza.id)
      if (count > 0) {
        setBlockedRaza({ ...raza, lotesCount: count })
      } else {
        setDeleteRaza(raza)
      }
    } finally {
      setCheckingId(null)
    }
  }

  /* Filter */
  const filtered = (data || []).filter(r => {
    const q = search.toLowerCase()
    return (!q || r.nombre.toLowerCase().includes(q) || (r.descripcion || '').toLowerCase().includes(q))
      && (!filterTipo || r.tipo === filterTipo)
  })

  const ponedoras = (data || []).length

  return (
    <div className="space-y-5">
      {!embedded && (
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
      )}
      {embedded && isAdmin && (
        <div className="flex justify-end">
          <Button icon={Plus} size="sm" onClick={openNew}>Nueva raza</Button>
        </div>
      )}

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
              onDelete={handleDeleteClick}
              checking={checkingId === r.id}
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
            placeholder="Ej: Hy-Line Brown, ISA Brown…"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Textarea
            label="Descripción (opcional)"
            placeholder="Características, rendimiento, observaciones…"
            rows={3}
            {...register('descripcion')}
          />
        </form>
      </Modal>

      {/* Modal bloqueante: raza con lotes asociados */}
      <Modal
        open={!!blockedRaza}
        onClose={() => setBlockedRaza(null)}
        title="No se puede eliminar"
        footer={<Button onClick={() => setBlockedRaza(null)}>Entendido</Button>}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                La raza "{blockedRaza?.nombre}" tiene {blockedRaza?.lotesCount} lote{blockedRaza?.lotesCount !== 1 ? 's' : ''} asociado{blockedRaza?.lotesCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                No es posible eliminar una raza vinculada a lotes existentes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl">
            <Layers className="h-4 w-4 text-stone-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Para eliminar esta raza primero debes cambiar la raza asignada en los lotes que la utilizan, o eliminar esos lotes.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
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
