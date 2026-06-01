import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { getLabelFromValue, TIPOS_PROVEEDOR } from '../../../lib/utils'
import { Plus, Eye, Truck, Pencil} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'
// import { Plus, Eye, Pencil, Users } from 'lucide-react'



export default function ProveedoresList() {
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
      if (error) throw error
      return data || []
    },
  })

  const filtered = (data || []).filter(p =>
    (filterEstado ? p.estado === filterEstado : true) &&
    (filterTipo ? p.tipo_proveedor === filterTipo : true)
  )
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        title="Proveedores"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Proveedores' }]}
        actions={
          <Link to="/dashboard/proveedores/nuevo">
            <Button icon={Plus}>Nuevo proveedor</Button>
          </Link>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="input-base sm:w-48 bg-white" value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select className="input-base sm:w-56 bg-white" value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1) }}>
          <option value="">Todos los tipos</option>
          {TIPOS_PROVEEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={6} /> : paginated.length === 0 ? (
          <EmptyState icon={Truck} title="No hay proveedores" description="Registra el primer proveedor" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Nombre', 'Tipo', 'Teléfono', 'Correo', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-stone-600">{getLabelFromValue(TIPOS_PROVEEDOR, p.tipo_proveedor)}</td>
                    <td className="px-4 py-3 text-stone-600">{p.telefono || '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{p.correo || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.estado} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/proveedores/${p.id}`}>
                        <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                      </Link>
                      <Link to={`/dashboard/proveedores/${p.id}/editar`}>
                          <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
                        </Link>
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
