import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { Plus, Eye, Pencil, Search } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'
import { ConfirmModal } from '../../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Building2 } from 'lucide-react'

export default function GalponesList() {
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [confirm, setConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['galpones', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select(`
        id, nombre, capacidad_maxima, estado, descripcion,
        encargado:perfiles(id, nombre_completo),
        lotes(id, estado, cantidad_aves_actuales)
      `).order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    enabled: !!perfil,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, estado }) => {
      const { error } = await supabase.from('galpones').update({ estado }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['galpones'])
      toast.success('Estado actualizado')
      setConfirm(null)
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const filtered = (data || []).filter(g => {
    const matchSearch = g.nombre.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado ? g.estado === filterEstado : true
    return matchSearch && matchEstado
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        title="Galpones"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Galpones' }]}
        actions={isAdmin && (
          <Link to="/dashboard/galpones/nuevo">
            <Button icon={Plus}>Nuevo galpón</Button>
          </Link>
        )}
      />

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            className="input-base pl-9"
            placeholder="Buscar galpón..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="input-base sm:w-40 bg-white"
          value={filterEstado}
          onChange={e => { setFilterEstado(e.target.value); setPage(1) }}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : paginated.length === 0 ? (
          <EmptyState icon={Building2} title="No hay galpones" description="Crea el primer galpón para comenzar" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Nombre', 'Capacidad', 'Estado', 'Encargado', 'Lote activo', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(g => {
                  const loteActivo = g.lotes?.find(l => l.estado === 'activo')
                  return (
                    <tr key={g.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-800">{g.nombre}</td>
                      <td className="px-4 py-3 text-stone-600">{g.capacidad_maxima.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3"><StatusBadge status={g.estado} /></td>
                      <td className="px-4 py-3 text-stone-600">{g.encargado?.nombre_completo || <span className="text-stone-400">Sin asignar</span>}</td>
                      <td className="px-4 py-3">
                        {loteActivo
                          ? <Badge variant="green">{loteActivo.cantidad_aves_actuales?.toLocaleString('es-CO')} aves</Badge>
                          : <span className="text-stone-400 text-xs">Sin lote</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/dashboard/galpones/${g.id}`}>
                            <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                          </Link>
                          {isAdmin && (
                            <>
                              <Link to={`/dashboard/galpones/${g.id}/editar`}>
                                <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
                              </Link>
                              <Button
                                variant="ghost" size="sm"
                                className={g.estado === 'activo' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
                                onClick={() => setConfirm(g)}
                              >
                                {g.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} />
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleMutation.mutate({ id: confirm.id, estado: confirm.estado === 'activo' ? 'inactivo' : 'activo' })}
        loading={toggleMutation.isPending}
        title={confirm?.estado === 'activo' ? 'Desactivar galpón' : 'Activar galpón'}
        message={`¿Estás seguro de ${confirm?.estado === 'activo' ? 'desactivar' : 'activar'} el galpón "${confirm?.nombre}"?`}
        confirmLabel={confirm?.estado === 'activo' ? 'Desactivar' : 'Activar'}
      />
    </div>
  )
}
