import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import { Plus, Pencil, Eye, UserCog } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'

export default function UsuariosList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').order('nombre_completo')
      if (error) throw error
      return data || []
    },
  })

  const totalPages = Math.ceil((data?.length || 0) / pageSize)
  const paginated = (data || []).slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        title="Usuarios"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Usuarios' }]}
        actions={
          <Link to="/dashboard/usuarios/nuevo">
            <Button icon={Plus}>Nuevo usuario</Button>
          </Link>
        }
      />
      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={5} /> : paginated.length === 0 ? (
          <EmptyState icon={UserCog} title="No hay usuarios registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Nombre', 'Correo', 'Rol', 'Estado', 'Último acceso', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(u => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{u.nombre_completo}</td>
                    <td className="px-4 py-3 text-stone-600">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.rol === 'administrador' ? 'amber' : 'blue'} className="capitalize">{u.rol}</Badge>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.estado} /></td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{u.ultimo_acceso ? formatDate(u.ultimo_acceso) : 'Nunca'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/dashboard/usuarios/${u.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        <Link to={`/dashboard/usuarios/${u.id}/editar`}>
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
        {(data?.length || 0) > 0 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} />
        )}
      </div>
    </div>
  )
}
