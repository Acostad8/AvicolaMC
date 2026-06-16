import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { getLabelFromValue, CATEGORIAS_INSUMO } from '../../../lib/utils'
import { Plus, Eye, Pencil, Package, AlertTriangle, Layers, BarChart2, Archive } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '../../../components/ui/Skeleton'

/* ── KPI Card ── */
function KpiCard({ icon: Icon, gradient, label, value, sub, loading }) {
  if (loading) return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
      <Skeleton className="h-10 w-10 rounded-xl mb-3" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-6 w-16" />
    </div>
  )
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-tight">{label}</p>
        <p className="text-lg font-bold text-stone-900 dark:text-stone-50 tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Stock Bar ── */
function StockBar({ actual, minimo }) {
  const reference = Math.max(minimo * 3, actual, 1)
  const pct = Math.min((actual / reference) * 100, 100)
  const color =
    actual <= minimo
      ? 'bg-red-500 dark:bg-red-400'
      : actual <= minimo * 1.5
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-green-500 dark:bg-green-400'
  return (
    <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function InsumosList() {
  const { isAdmin } = useAuth()
  useA11y()

  const [filterCat, setFilterCat]       = useState('')
  const [filterNombre, setFilterNombre] = useState('')
  const [filterEstado, setFilterEstado] = useState('activo')
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insumos').select('*').order('nombre')
      if (error) throw error
      return data || []
    },
  })

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const list = data || []
    if (!list.length) return null
    const activos     = list.filter(i => i.estado === 'activo').length
    const stockBajoCount = list.filter(i => i.stock_actual <= i.stock_minimo && i.estado === 'activo').length
    const categorias  = new Set(list.map(i => i.categoria).filter(Boolean)).size
    const totalUnidades = list.reduce((s, i) => s + (i.stock_actual || 0), 0)
    return { activos, stockBajoCount, categorias, totalUnidades }
  }, [data])

  const stockBajos = useMemo(
    () => (data || []).filter(i => i.stock_actual <= i.stock_minimo && i.estado === 'activo'),
    [data]
  )

  const filtered = useMemo(() => {
    return (data || []).filter(i => {
      if (filterEstado && i.estado !== filterEstado) return false
      if (filterCat && i.categoria !== filterCat) return false
      if (filterNombre && !i.nombre?.toLowerCase().includes(filterNombre.toLowerCase())) return false
      return true
    })
  }, [data, filterEstado, filterCat, filterNombre])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Insumos"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insumos' }]}
        actions={isAdmin && (
          <div className="flex gap-2">
            <Link to="/dashboard/insumos/movimiento/nuevo">
              <Button variant="secondary">Registrar movimiento</Button>
            </Link>
            <Link to="/dashboard/insumos/nuevo">
              <Button icon={Plus}>Nuevo producto</Button>
            </Link>
          </div>
        )}
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          loading={isLoading}
          icon={Package}
          gradient="from-green-400 to-green-600"
          label="Total activos"
          value={kpis ? kpis.activos : '—'}
          sub="productos activos"
        />
        <KpiCard
          loading={isLoading}
          icon={AlertTriangle}
          gradient="from-red-400 to-red-600"
          label="Stock bajo"
          value={kpis ? kpis.stockBajoCount : '—'}
          sub="requieren reposición"
        />
        <KpiCard
          loading={isLoading}
          icon={Layers}
          gradient="from-blue-400 to-blue-600"
          label="Categorías"
          value={kpis ? kpis.categorias : '—'}
          sub="distintas"
        />
        <KpiCard
          loading={isLoading}
          icon={BarChart2}
          gradient="from-amber-400 to-amber-600"
          label="Total en stock"
          value={kpis ? kpis.totalUnidades.toLocaleString('es-CO') : '—'}
          sub="unidades totales"
        />
      </div>

      {/* ── Low stock alert ── */}
      {!isLoading && stockBajos.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {stockBajos.length} producto{stockBajos.length > 1 ? 's' : ''} con stock bajo
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 truncate">
              {stockBajos.map(i => i.nombre).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Estado</label>
            <select
              className="input-base"
              value={filterEstado}
              onChange={e => { setFilterEstado(e.target.value); setPage(1) }}
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Categoría</label>
            <select
              className="input-base"
              value={filterCat}
              onChange={e => { setFilterCat(e.target.value); setPage(1) }}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS_INSUMO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Buscar por nombre</label>
            <input
              type="text"
              className="input-base"
              placeholder="Nombre del producto..."
              value={filterNombre}
              onChange={e => { setFilterNombre(e.target.value); setPage(1) }}
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : paginated.length === 0 ? (
          <EmptyState icon={Package} title="No hay insumos registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Nombre', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {paginated.map(ins => {
                  const stockBajo = ins.stock_actual <= ins.stock_minimo
                  return (
                    <tr key={ins.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {ins.nombre}
                          {stockBajo && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                        {getLabelFromValue(CATEGORIAS_INSUMO, ins.categoria)}
                      </td>
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-500 whitespace-nowrap text-xs">
                        {ins.unidad_medida}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-semibold tabular-nums ${stockBajo ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'}`}>
                          {ins.stock_actual} {ins.unidad_medida}
                        </span>
                        <StockBar actual={ins.stock_actual} minimo={ins.stock_minimo} />
                      </td>
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-500 whitespace-nowrap tabular-nums">
                        {ins.stock_minimo} {ins.unidad_medida}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={ins.estado} />
                      </td>
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
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={n => { setPageSize(n); setPage(1) }}
          />
        )}
      </div>
    </div>
  )
}
