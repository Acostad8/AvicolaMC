import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, formatNumber, formatPercent, downloadCSV } from '../../../lib/utils'
import { Plus, Download, Eye, Egg } from 'lucide-react'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'

export default function ProduccionList() {
  const { isAdmin, perfil } = useAuth()
  const [filterGalpon, setFilterGalpon] = useState('')
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
    queryKey: ['produccion', isAdmin, perfil?.id, filterGalpon, filterDesde, filterHasta],
    queryFn: async () => {
      let q = supabase.from('produccion').select(`
      *,
      galpon:galpones(nombre),
      lote:lotes(
        nombre_numero,
        raza:razas(nombre)
      ),
      registrado:perfiles(nombre_completo)
    `).order('fecha', { ascending: false })
      if (!isAdmin && galpones) {
        const ids = galpones.map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      if (filterGalpon) q = q.eq('galpon_id', filterGalpon)
      if (filterDesde) q = q.gte('fecha', filterDesde)
      if (filterHasta) q = q.lte('fecha', filterHasta)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!perfil && (!(!isAdmin) || (galpones !== undefined)),
  })

  const totalPages = Math.ceil((data?.length || 0) / pageSize)
  const paginated = (data || []).slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    if (!data?.length) return
    downloadCSV(data.map(r => ({
      Fecha: r.fecha,
      Galpón: r.galpon?.nombre,
      Lote: r.lote?.nombre_numero,
      'Huevos producidos': r.huevos_producidos,
      '% Postura': r.porcentaje_postura,
      'Consumo alimento (kg)': r.consumo_alimento_kg,
      Observaciones: r.observaciones || '',
      'Registrado por': r.registrado?.nombre_completo || '',
    })), 'produccion')
  }

  return (
    <div>
      <PageHeader
        title="Producción"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Producción' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExport}>Exportar CSV</Button>
            <Link to="/dashboard/produccion/nuevo"><Button icon={Plus}>Registrar</Button></Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="input-base sm:w-48 bg-white" value={filterGalpon} onChange={e => { setFilterGalpon(e.target.value); setPage(1) }}>
          <option value="">Todos los galpones</option>
          {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <input type="date" className="input-base sm:w-40" value={filterDesde} onChange={e => { setFilterDesde(e.target.value); setPage(1) }} />
        <input type="date" className="input-base sm:w-40" value={filterHasta} onChange={e => { setFilterHasta(e.target.value); setPage(1) }} />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={6} /> : paginated.length === 0 ? (
          <EmptyState icon={Egg} title="No hay registros de producción" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Fecha', 'Galpón', 'Lote', 'Huevos', '% Postura','Tipo de Raza', 'Alimento (kg)', 'Registrado por', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    
                    <td className="px-4 py-3">{formatDate(r.fecha)}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">{r.galpon?.nombre}</td>
                    <td className="px-4 py-3 text-stone-600">{r.lote?.nombre_numero}</td>
                    <td className="px-4 py-3 font-semibold text-amber-700">{formatNumber(r.huevos_producidos)}</td>
                    <td className="px-4 py-3">{formatPercent(r.porcentaje_postura)}</td>
                    <td className="px-4 py-3">{r.lote?.raza?.nombre || '—'}</td> 
                    <td className="px-4 py-3">{r.consumo_alimento_kg}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{r.registrado?.nombre_completo || '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/produccion/${r.id}`}>
                        <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                      </Link>
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
