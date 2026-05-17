import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import { Plus, Eye, Pencil, Users } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'

export default function EmpleadosList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterEstado, setFilterEstado] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empleados').select('*').order('nombre_completo')
      if (error) throw error
      return data || []
    },
  })

  const filtered = (data || []).filter(e => filterEstado ? e.estado === filterEstado : true)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        title="Empleados"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Empleados' }]}
        actions={
          <Link to="/dashboard/empleados/nuevo">
            <Button icon={Plus}>Nuevo empleado</Button>
          </Link>
        }
      />
      <div className="card p-4 mb-4">
        <select className="input-base sm:w-40 bg-white" value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}>
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={5} /> : paginated.length === 0 ? (
          <EmptyState icon={Users} title="No hay empleados registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Nombre', 'Cargo', 'Teléfono', 'Ingreso', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(e => (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{e.nombre_completo}</td>
                    <td className="px-4 py-3 text-stone-600">{e.cargo || '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{e.telefono || '—'}</td>
                    <td className="px-4 py-3">{formatDate(e.fecha_ingreso)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.estado} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/dashboard/empleados/${e.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        <Link to={`/dashboard/empleados/${e.id}/editar`}>
                          <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} />
        )}
      </div>
    </div>
  )
}
