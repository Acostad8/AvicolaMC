import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { useConfig } from '../../../context/ConfigContext'
import { formatDate, formatNumber, downloadCSV } from '../../../lib/utils'
import { Plus, Download, Eye, Pencil, Egg, TrendingUp, Wheat, Calendar, BarChart2, X, Filter, Lock, Clock } from 'lucide-react'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '../../../components/ui/Skeleton'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

/* ── 24h edit window check ── */
function withinEditWindow(created_at) {
  if (!created_at) return false
  return Date.now() - new Date(created_at).getTime() < 24 * 3600 * 1000
}

/* ── Postura badge (umbrales desde Configuración) ── */
function PosturaBadge({ pct }) {
  const { config } = useConfig()
  const { postura_excelente: exc, postura_buena: bue, postura_regular: reg } = config.produccion
  const n = parseFloat(pct) || 0
  const cls = n >= exc ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    : n >= bue ? 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
    : n >= reg ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
    : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {n.toFixed(1)}%
    </span>
  )
}

/* ── KPI card ── */
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

/* ── Filter chip ── */
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-full text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary-900 dark:hover:text-primary-200 ml-0.5" aria-label="Quitar filtro">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export default function ProduccionList() {
  const { isAdmin, perfil } = useAuth()
  const { dark } = useA11y()

  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterRaza, setFilterRaza]     = useState('')   // stores raza UUID
  const [filterLote, setFilterLote]     = useState('')
  const [filterDesde, setFilterDesde]   = useState('')
  const [filterHasta, setFilterHasta]   = useState('')
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showChart, setShowChart] = useState(true)

  /* Chart colors */
  const gridColor    = dark ? '#292524' : '#f5f5f4'
  const axisColor    = dark ? '#78716c' : '#a8a29e'
  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#ffffff',
    border: `1px solid ${dark ? '#292524' : '#e7e5e4'}`,
    borderRadius: '12px',
    fontSize: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
  }

  /* Fetch galpones */
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

  /* Fetch razas for the filter select */
  const { data: razas } = useQuery({
    queryKey: ['razas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('razas').select('id, nombre').order('nombre')
      return data || []
    },
  })

  /* Fetch lotes filtered by selected galpón */
  const { data: lotes } = useQuery({
    queryKey: ['lotes-select-prod', filterGalpon, isAdmin, perfil?.id],
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

  /* Fetch produccion — all filters applied server-side */
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['produccion', isAdmin, perfil?.id, filterGalpon, filterLote, filterRaza, filterDesde, filterHasta],
    queryFn: async () => {
      let q = supabase.from('produccion').select(`
        id, fecha, huevos_producidos, porcentaje_postura, consumo_alimento_kg, observaciones, created_at,
        galpon:galpones(id, nombre),
        lote:lotes(nombre_numero, cantidad_aves_actuales, raza:razas(nombre)),
        registrado:perfiles(nombre_completo)
      `).order('fecha', { ascending: false })

      if (!isAdmin && galpones) {
        const ids = (galpones || []).map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      if (filterGalpon) q = q.eq('galpon_id', filterGalpon)
      if (filterLote)   q = q.eq('lote_id', filterLote)
      if (filterDesde)  q = q.gte('fecha', filterDesde)
      if (filterHasta)  q = q.lte('fecha', filterHasta)

      // Server-side raza filter: resolve lote_ids for the selected raza
      if (filterRaza) {
        let loteQ = supabase.from('lotes').select('id').eq('raza_id', filterRaza)
        if (filterGalpon) {
          loteQ = loteQ.eq('galpon_id', filterGalpon)
        } else if (!isAdmin && galpones) {
          const ids = (galpones || []).map(g => g.id)
          if (ids.length) loteQ = loteQ.in('galpon_id', ids)
        }
        const { data: razaLotes } = await loteQ
        const razaLoteIds = (razaLotes || []).map(l => l.id)
        if (razaLoteIds.length === 0) return []
        q = q.in('lote_id', razaLoteIds)
      }

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!perfil && (!(!isAdmin) || galpones !== undefined),
  })

  const filteredData = rawData || []

  /* KPI calculations */
  const kpis = useMemo(() => {
    if (!filteredData.length) return null
    const totalHuevos   = filteredData.reduce((s, r) => s + (r.huevos_producidos || 0), 0)
    const totalAlimento = filteredData.reduce((s, r) => s + (r.consumo_alimento_kg || 0), 0)
    const avgPostura    = filteredData.reduce((s, r) => s + (r.porcentaje_postura || 0), 0) / filteredData.length
    const avgDiario     = totalHuevos / filteredData.length
    const mejorDia      = filteredData.reduce((b, r) => r.huevos_producidos > (b?.huevos_producidos || 0) ? r : b, null)
    const eficiencia    = totalAlimento > 0 ? (totalHuevos / totalAlimento).toFixed(2) : '—'

    return { totalHuevos, totalAlimento, avgPostura, avgDiario, mejorDia, eficiencia, dias: filteredData.length }
  }, [filteredData])

  /* Chart data: sorted ascending, last 30 records */
  const chartData = useMemo(() =>
    [...filteredData]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30)
      .map(r => ({
        fecha:   r.fecha.slice(5),
        huevos:  r.huevos_producidos,
        postura: parseFloat(r.porcentaje_postura) || 0,
      }))
  , [filteredData])

  /* Paginated table */
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginated  = filteredData.slice((page - 1) * pageSize, page * pageSize)

  /* Active filters */
  const activeFilters = [
    filterGalpon && { label: `Galpón: ${galpones?.find(g => g.id === filterGalpon)?.nombre}`, clear: () => { setFilterGalpon(''); setFilterLote(''); setPage(1) } },
    filterLote   && { label: `Lote: ${lotes?.find(l => l.id === filterLote)?.nombre_numero}`,  clear: () => { setFilterLote('');   setPage(1) } },
    filterRaza   && { label: `Raza: ${razas?.find(r => r.id === filterRaza)?.nombre ?? filterRaza}`, clear: () => { setFilterRaza(''); setPage(1) } },
    filterDesde  && { label: `Desde: ${filterDesde}`, clear: () => { setFilterDesde('');  setPage(1) } },
    filterHasta  && { label: `Hasta: ${filterHasta}`, clear: () => { setFilterHasta('');  setPage(1) } },
  ].filter(Boolean)

  function clearAllFilters() {
    setFilterGalpon(''); setFilterRaza(''); setFilterLote(''); setFilterDesde(''); setFilterHasta(''); setPage(1)
  }

  function handleExport() {
    if (!filteredData.length) return
    downloadCSV(filteredData.map(r => ({
      Fecha:                    r.fecha,
      'Galpón':                 r.galpon?.nombre,
      Lote:                     r.lote?.nombre_numero,
      Raza:                     r.lote?.raza?.nombre || '',
      'Huevos producidos':      r.huevos_producidos,
      '% Postura':              r.porcentaje_postura,
      'Consumo alimento (kg)':  r.consumo_alimento_kg,
      Observaciones:            r.observaciones || '',
      'Registrado por':         r.registrado?.nombre_completo || '',
    })), 'produccion')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Producción"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Producción' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExport} disabled={!filteredData.length}>
              Exportar CSV
            </Button>
            <Link to="/dashboard/produccion/nuevo">
              <Button icon={Plus}>Registrar</Button>
            </Link>
          </div>
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard loading={isLoading} icon={Egg}        gradient="from-amber-400 to-amber-600"   label="Total huevos"      value={kpis ? formatNumber(kpis.totalHuevos)    : '—'} sub={kpis ? `${kpis.dias} registros` : undefined} />
        <KpiCard loading={isLoading} icon={TrendingUp}  gradient="from-green-400 to-green-600"   label="Promedio diario"   value={kpis ? formatNumber(Math.round(kpis.avgDiario)) : '—'} sub="huevos/día" />
        <KpiCard loading={isLoading} icon={BarChart2}   gradient="from-blue-400 to-blue-600"     label="% Postura prom."   value={kpis ? `${kpis.avgPostura.toFixed(1)}%`  : '—'} sub="del período" />
        <KpiCard loading={isLoading} icon={Wheat}       gradient="from-orange-400 to-orange-600" label="Alimento total"    value={kpis ? `${kpis.totalAlimento.toFixed(1)} kg` : '—'} sub="consumido" />
        <KpiCard loading={isLoading} icon={TrendingUp}  gradient="from-purple-400 to-purple-600" label="Eficiencia"        value={kpis?.eficiencia ?? '—'} sub="huevos/kg" />
        <KpiCard loading={isLoading} icon={Calendar}    gradient="from-rose-400 to-rose-600"     label="Mejor día"         value={kpis?.mejorDia ? formatNumber(kpis.mejorDia.huevos_producidos) : '—'} sub={kpis?.mejorDia ? formatDate(kpis.mejorDia.fecha) : undefined} />
      </div>

      {/* ── Filters ── */}
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
          {/* Galpón */}
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
          {/* Lote */}
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
          {/* Raza */}
          <div>
            <label className="label text-xs">Raza</label>
            <select
              className="input-base"
              value={filterRaza}
              onChange={e => { setFilterRaza(e.target.value); setPage(1) }}
              disabled={!razas?.length}
            >
              <option value="">Todas las razas</option>
              {(razas || []).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          {/* Desde */}
          <div>
            <label className="label text-xs">Desde</label>
            <input
              type="date"
              className="input-base"
              value={filterDesde}
              onChange={e => { setFilterDesde(e.target.value); setPage(1) }}
            />
          </div>
          {/* Hasta */}
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

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {activeFilters.map((f, i) => (
              <FilterChip key={i} label={f.label} onRemove={f.clear} />
            ))}
          </div>
        )}
      </div>

      {/* ── Trend chart ── */}
      {!isLoading && chartData.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <Egg className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <h2 className="section-title">Tendencia de producción</h2>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {chartData.length > 1 ? `Últimos ${chartData.length} registros` : ''}
              </span>
            </div>
            <button
              onClick={() => setShowChart(v => !v)}
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              {showChart ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showChart && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Huevos area chart */}
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Huevos producidos</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradHuevos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="huevos" stroke="#d97706" strokeWidth={2} fill="url(#gradHuevos)" dot={{ r: 2.5, fill: '#d97706' }} activeDot={{ r: 5 }} name="Huevos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* % Postura line chart */}
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">% Postura</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, '% Postura']} />
                    <Line type="monotone" dataKey="postura" stroke="#22c55e" strokeWidth={2} dot={{ r: 2.5, fill: '#22c55e' }} activeDot={{ r: 5 }} name="% Postura" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            icon={Egg}
            title="Sin registros de producción"
            description={activeFilters.length > 0 ? 'Prueba ajustando los filtros aplicados.' : 'Registra la producción diaria de tus galpones.'}
            action={
              activeFilters.length > 0
                ? <button onClick={clearAllFilters} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">Limpiar filtros</button>
                : <Link to="/dashboard/produccion/nuevo"><Button icon={Plus} size="sm">Registrar producción</Button></Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Fecha', 'Galpón', 'Lote', 'Raza', 'Huevos', '% Postura', 'Alimento (kg)', 'Registrado por', ' Acciones'].map(h => (
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
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {r.lote?.raza?.nombre
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">{r.lote.raza.nombre}</span>
                        : <span className="text-stone-400 dark:text-stone-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatNumber(r.huevos_producidos)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PosturaBadge pct={r.porcentaje_postura} />
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap tabular-nums">
                      {r.consumo_alimento_kg != null ? `${r.consumo_alimento_kg} kg` : '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 dark:text-stone-500 text-xs whitespace-nowrap">
                      {r.registrado?.nombre_completo?.split(' ')[0] || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/dashboard/produccion/${r.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        {isAdmin ? (
                          <Link to={`/dashboard/produccion/${r.id}/editar`}>
                            <Button variant="ghost" size="sm" icon={Pencil}
                              className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                              Editar
                            </Button>
                          </Link>
                        ) : withinEditWindow(r.created_at) ? (
                          <Link to={`/dashboard/produccion/${r.id}/editar`}>
                            <Button variant="ghost" size="sm" icon={Clock}
                              className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              title="Editar — ventana de 24 h activa"
                            >
                              Editar
                            </Button>
                          </Link>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 cursor-not-allowed select-none"
                            title="El período de edición de 24 horas ha finalizado"
                          >
                            <Lock className="h-3 w-3" />
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredData.length > 0 && (
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
