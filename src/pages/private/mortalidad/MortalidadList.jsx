import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { formatDate, formatNumber, downloadCSV, getLabelFromValue, CAUSAS_MORTALIDAD } from '../../../lib/utils'
import { Plus, Download, Eye, Pencil, Skull, TrendingDown, CalendarDays, AlertTriangle, BarChart2, X, Filter } from 'lucide-react'
import Button from '../../../components/ui/Button'
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

/* ── Causa Badge ── */
function CausaBadge({ causa }) {
  const label = getLabelFromValue(CAUSAS_MORTALIDAD, causa)
  const cls =
    causa === 'enfermedad' || causa === 'virus'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      : causa === 'trauma' || causa === 'predador'
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      : causa === 'manejo'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label || causa || '—'}
    </span>
  )
}

export default function MortalidadList() {
  const { isAdmin, perfil } = useAuth()
  useA11y() // ensure context is available; dark not needed here but keeps pattern consistent

  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterLote, setFilterLote]     = useState('')
  const [filterCausa, setFilterCausa]   = useState('')
  const [filterDesde, setFilterDesde]   = useState('')
  const [filterHasta, setFilterHasta]   = useState('')
  const [page, setPage]       = useState(1)
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

  const { data: lotes } = useQuery({
    queryKey: ['lotes-select-mort', filterGalpon, isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('lotes').select('id, nombre_numero, galpon_id').order('nombre_numero')
      if (filterGalpon) {
        q = q.eq('galpon_id', filterGalpon)
      } else if (!isAdmin && galpones) {
        const ids = galpones.map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['mortalidad', isAdmin, perfil?.id, filterGalpon, filterLote, filterDesde, filterHasta, filterCausa],
    queryFn: async () => {
      let q = supabase
        .from('mortalidad')
        .select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero), registrado:perfiles(nombre_completo)`)
        .order('fecha', { ascending: false })
      if (!isAdmin && galpones) {
        const ids = galpones.map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      if (filterGalpon) q = q.eq('galpon_id', filterGalpon)
      if (filterLote)   q = q.eq('lote_id', filterLote)
      if (filterDesde)  q = q.gte('fecha', filterDesde)
      if (filterHasta)  q = q.lte('fecha', filterHasta)
      if (filterCausa)  q = q.eq('causa', filterCausa)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!perfil,
  })

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const list = data || []
    if (!list.length) return null
    const totalBajas = list.reduce((s, r) => s + (r.cantidad_bajas || 0), 0)
    const promDiario  = totalBajas / list.length
    const causaCounts = {}
    list.forEach(r => { if (r.causa) causaCounts[r.causa] = (causaCounts[r.causa] || 0) + 1 })
    const causaFrecuente = Object.entries(causaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    return { totalBajas, promDiario, registros: list.length, causaFrecuente }
  }, [data])

  const activeFilters = [
    filterGalpon && { label: `Galpón: ${galpones?.find(g => g.id === filterGalpon)?.nombre}`, clear: () => { setFilterGalpon(''); setFilterLote(''); setPage(1) } },
    filterLote   && { label: `Lote: ${lotes?.find(l => l.id === filterLote)?.nombre_numero}`,  clear: () => { setFilterLote('');   setPage(1) } },
    filterCausa  && { label: `Causa: ${getLabelFromValue(CAUSAS_MORTALIDAD, filterCausa)}`,    clear: () => { setFilterCausa('');  setPage(1) } },
    filterDesde  && { label: `Desde: ${filterDesde}`, clear: () => { setFilterDesde('');  setPage(1) } },
    filterHasta  && { label: `Hasta: ${filterHasta}`, clear: () => { setFilterHasta('');  setPage(1) } },
  ].filter(Boolean)

  function clearAllFilters() {
    setFilterGalpon(''); setFilterLote(''); setFilterCausa(''); setFilterDesde(''); setFilterHasta(''); setPage(1)
  }

  const totalPages = Math.ceil((data?.length || 0) / pageSize)
  const paginated  = (data || []).slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    downloadCSV((data || []).map(r => ({
      Fecha: r.fecha,
      Galpón: r.galpon?.nombre,
      Lote: r.lote?.nombre_numero,
      'Cantidad de bajas': r.cantidad_bajas,
      Causa: getLabelFromValue(CAUSAS_MORTALIDAD, r.causa),
      'Causa específica': r.causa_otra || '',
      Observaciones: r.observaciones || '',
    })), 'mortalidad')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mortalidad"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mortalidad' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExport}>Exportar CSV</Button>
            <Link to="/dashboard/mortalidad/nuevo"><Button icon={Plus}>Registrar</Button></Link>
          </div>
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          loading={isLoading}
          icon={TrendingDown}
          gradient="from-red-400 to-red-600"
          label="Total bajas"
          value={kpis ? formatNumber(kpis.totalBajas) : '—'}
          sub={kpis ? `${kpis.registros} registros` : undefined}
        />
        <KpiCard
          loading={isLoading}
          icon={BarChart2}
          gradient="from-orange-400 to-orange-600"
          label="Promedio diario"
          value={kpis ? kpis.promDiario.toFixed(1) : '—'}
          sub="bajas/día"
        />
        <KpiCard
          loading={isLoading}
          icon={CalendarDays}
          gradient="from-amber-400 to-amber-600"
          label="Registros totales"
          value={kpis ? formatNumber(kpis.registros) : '—'}
          sub="en el período"
        />
        <KpiCard
          loading={isLoading}
          icon={Skull}
          gradient="from-stone-400 to-stone-600"
          label="Causa más frecuente"
          value={kpis?.causaFrecuente ? getLabelFromValue(CAUSAS_MORTALIDAD, kpis.causaFrecuente) : '—'}
          sub="top causa"
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="h-4 w-4 text-stone-400 dark:text-stone-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Filtros</span>
          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters} className="ml-auto text-xs text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              Limpiar todo
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="label text-xs">Galpón</label>
            <select
              className="input-base"
              value={filterGalpon}
              onChange={e => { setFilterGalpon(e.target.value); setFilterLote(''); setPage(1) }}
            >
              <option value="">Todos</option>
              {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Lote</label>
            <select
              className="input-base"
              value={filterLote}
              onChange={e => { setFilterLote(e.target.value); setPage(1) }}
              disabled={!lotes?.length}
            >
              <option value="">Todos los lotes</option>
              {(lotes || []).map(l => <option key={l.id} value={l.id}>{l.nombre_numero}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Causa</label>
            <select
              className="input-base"
              value={filterCausa}
              onChange={e => { setFilterCausa(e.target.value); setPage(1) }}
            >
              <option value="">Todas las causas</option>
              {CAUSAS_MORTALIDAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Desde</label>
            <input
              type="date"
              className="input-base"
              value={filterDesde}
              onChange={e => { setFilterDesde(e.target.value); setPage(1) }}
            />
          </div>
          <div>
            <label className="label text-xs">Hasta</label>
            <input
              type="date"
              className="input-base"
              value={filterHasta}
              onChange={e => { setFilterHasta(e.target.value); setPage(1) }}
            />
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-full text-xs font-medium">
                {f.label}
                <button onClick={f.clear} className="hover:text-primary-900 dark:hover:text-primary-200 ml-0.5" aria-label="Quitar filtro">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : paginated.length === 0 ? (
          <EmptyState icon={Skull} title="No hay registros de mortalidad" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Fecha', 'Galpón', 'Lote', 'Bajas', 'Causa', 'Registrado por', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {paginated.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-stone-600 dark:text-stone-400 text-xs">
                      {formatDate(r.fecha)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                      {r.galpon?.nombre}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap text-xs">
                      {r.lote?.nombre_numero || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {formatNumber(r.cantidad_bajas)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CausaBadge causa={r.causa} />
                    </td>
                    <td className="px-4 py-3 text-stone-400 dark:text-stone-500 text-xs whitespace-nowrap">
                      {r.registrado?.nombre_completo || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/dashboard/mortalidad/${r.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        {r.created_at && (Date.now() - new Date(r.created_at).getTime()) <= 24 * 3600 * 1000 && (
                          <Link to={`/dashboard/mortalidad/${r.id}/editar`}>
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
