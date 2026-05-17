import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, calcWeeksAge, formatNumber } from '../../../lib/utils'
import { Plus, Eye, Layers } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'

export default function LotesList() {
  const { isAdmin, perfil } = useAuth()
  const [filterEstado, setFilterEstado] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['lotes', isAdmin, perfil?.id],
    queryFn: async () => {
      let galponesQ = supabase.from('galpones').select('id')
      if (!isAdmin) galponesQ = galponesQ.eq('encargado_id', perfil.id)
      const { data: galpones } = await galponesQ
      const galponIds = (galpones || []).map(g => g.id)

      const { data, error } = await supabase.from('lotes').select(`
        *, galpon:galpones(nombre), raza:razas(nombre)
      `).in('galpon_id', galponIds).order('fecha_ingreso', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!perfil,
  })

  const filtered = (data || []).filter(l => filterEstado ? l.estado === filterEstado : true)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        title="Lotes"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lotes y Razas' }]}
        actions={isAdmin && (
          <div className="flex gap-2">
            <Link to="/dashboard/razas"><Button variant="secondary">Ver razas</Button></Link>
            <Link to="/dashboard/lotes/nuevo"> <Button icon={Plus}>Nuevo lote</Button></Link>
          </div>
        )}
      />

      <div className="card p-4 mb-4">
        <select className="input-base sm:w-48 bg-white" value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={6} /> : paginated.length === 0 ? (
          <EmptyState icon={Layers} title="No hay lotes" description="Crea el primer lote" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Lote', 'Galpón', 'Raza', 'Aves', 'Ingreso', 'Semanas', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(l => (
                  <tr key={l.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{l.nombre_numero}</td>
                    <td className="px-4 py-3 text-stone-600">{l.galpon?.nombre}</td>
                    <td className="px-4 py-3 text-stone-600">{l.raza?.nombre || '—'}</td>
                    <td className="px-4 py-3">{formatNumber(l.cantidad_aves_actuales)}</td>
                    <td className="px-4 py-3">{formatDate(l.fecha_ingreso)}</td>
                    <td className="px-4 py-3">{l.estado === 'activo' ? `${calcWeeksAge(l.fecha_ingreso)} sem.` : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.estado} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/lotes/${l.id}`}>
                        <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
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
