import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { getLabelFromValue, CATEGORIAS_INSUMO } from '../../../lib/utils'
import { Plus, Eye, Pencil, Package, AlertTriangle } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'

export default function InsumosList() {
  const { isAdmin } = useAuth()
  const [filterCat, setFilterCat] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insumos').select('*').order('nombre')
      if (error) throw error
      return data || []
    },
  })

  const filtered = (data || []).filter(i => filterCat ? i.categoria === filterCat : true)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const stockBajos = (data || []).filter(i => i.stock_actual <= i.stock_minimo && i.estado === 'activo')

  return (
    <div>
      <PageHeader
        title="Insumos"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insumos' }]}
        actions={isAdmin && (
          <div className="flex gap-2">
            <Link to="/dashboard/insumos/movimiento/nuevo"><Button variant="secondary">Registrar movimiento</Button></Link>
            <Link to="/dashboard/insumos/nuevo"><Button icon={Plus}>Nuevo producto</Button></Link>
          </div>
        )}
      />

      {stockBajos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span><strong>{stockBajos.length} producto(s)</strong> con stock bajo: {stockBajos.map(i => i.nombre).join(', ')}</span>
        </div>
      )}

      <div className="card p-4 mb-4">
        <select className="input-base sm:w-48 bg-white" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS_INSUMO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={6} /> : paginated.length === 0 ? (
          <EmptyState icon={Package} title="No hay insumos registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Nombre', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(ins => {
                  const stockBajo = ins.stock_actual <= ins.stock_minimo
                  return (
                    <tr key={ins.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {ins.nombre}
                        {stockBajo && <AlertTriangle className="inline h-3.5 w-3.5 text-red-500 ml-1" />}
                      </td>
                      <td className="px-4 py-3">{getLabelFromValue(CATEGORIAS_INSUMO, ins.categoria)}</td>
                      <td className="px-4 py-3 text-stone-600">{ins.unidad_medida}</td>
                      <td className={`px-4 py-3 font-semibold ${stockBajo ? 'text-red-600' : 'text-stone-800'}`}>
                        {ins.stock_actual} {ins.unidad_medida}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{ins.stock_minimo} {ins.unidad_medida}</td>
                      <td className="px-4 py-3"><StatusBadge status={ins.estado} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Link to={`/dashboard/insumos/${ins.id}`}>
                            <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                          </Link>
                          {isAdmin && (
                            <Link to={`/dashboard/insumos/${ins.id}/editar`}>
                              <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
                            </Link>
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
    </div>
  )
}
