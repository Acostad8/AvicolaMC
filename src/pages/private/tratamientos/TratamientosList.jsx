import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, downloadCSV, getLabelFromValue, TIPOS_TRATAMIENTO } from '../../../lib/utils'
import { Plus, Download, Eye, Pencil, Syringe } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'

export default function TratamientosList() {
  const { isAdmin, perfil } = useAuth()
  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['tratamientos', isAdmin, perfil?.id, filterGalpon, filterEstado, filterDesde, filterHasta],
    queryFn: async () => {
      let q = supabase.from('tratamientos').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero)`).order('fecha_inicio', { ascending: false })
      if (!isAdmin && galpones) {
        const ids = galpones.map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      if (filterGalpon) q = q.eq('galpon_id', filterGalpon)
      if (filterEstado) q = q.eq('estado', filterEstado)
      if (filterDesde) q = q.gte('fecha_inicio', filterDesde)
      if (filterHasta) q = q.lte('fecha_inicio', filterHasta)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!perfil,
  })

  const totalPages = Math.ceil((data?.length || 0) / pageSize)
  const paginated = (data || []).slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    downloadCSV((data || []).map(r => ({
      'Fecha inicio': r.fecha_inicio, 'Fecha fin': r.fecha_fin || '', Galpón: r.galpon?.nombre,
      Lote: r.lote?.nombre_numero, Tipo: getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo),
      Producto: r.nombre_producto, Dosis: r.dosis_aplicacion, Responsable: r.responsable,
      Estado: r.estado, Observaciones: r.observaciones || '',
    })), 'tratamientos')
  }

  return (
    <div>
      <PageHeader
        title="Tratamientos Veterinarios"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tratamientos' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExport}>Exportar CSV</Button>
            {isAdmin && <Link to="/dashboard/tratamientos/nuevo"><Button icon={Plus}>Nuevo</Button></Link>}
          </div>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="input-base sm:w-48 bg-white" value={filterGalpon} onChange={e => { setFilterGalpon(e.target.value); setPage(1) }}>
          <option value="">Todos los galpones</option>
          {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select className="input-base sm:w-40 bg-white" value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="finalizado">Finalizado</option>
        </select>
        <input type="date" className="input-base sm:w-40" value={filterDesde} onChange={e => { setFilterDesde(e.target.value); setPage(1) }} />
        <input type="date" className="input-base sm:w-40" value={filterHasta} onChange={e => { setFilterHasta(e.target.value); setPage(1) }} />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={6} /> : paginated.length === 0 ? (
          <EmptyState icon={Syringe} title="No hay tratamientos registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Inicio', 'Galpón', 'Tipo', 'Producto', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">{formatDate(r.fecha_inicio)}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">{r.galpon?.nombre}</td>
                    <td className="px-4 py-3">{getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo)}</td>
                    <td className="px-4 py-3 text-stone-600">{r.nombre_producto}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.estado} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/dashboard/tratamientos/${r.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        {isAdmin && (
                          <Link to={`/dashboard/tratamientos/${r.id}/editar`}>
                            <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
                          </Link>
                        )}
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
