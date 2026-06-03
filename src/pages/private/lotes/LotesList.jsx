import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { formatDate, calcWeeksAge, formatNumber } from '../../../lib/utils'
import { useAutoRefreshAtMidnight } from '../../../hooks/useAutoRefreshAtMidnight'
import {
  Plus, Eye, Pencil, Layers, Search, X, LayoutGrid, List,
  Bird, Calendar, TrendingDown, Activity, CheckCircle2,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '../../../components/ui/Skeleton'

/* ── Survival bar ── */
function SurvivalBar({ actual, inicial, showLabel = false }) {
  const pct = inicial > 0 ? Math.min((actual / inicial) * 100, 100) : 0
  const color = pct >= 95 ? 'bg-green-500' : pct >= 85 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 95 ? 'text-green-600 dark:text-green-400' : pct >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-stone-500 dark:text-stone-400">Supervivencia</span>
          <span className={`font-bold tabular-nums ${textColor}`}>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <p className="text-right text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
          {formatNumber(actual)} / {formatNumber(inicial)} aves
        </p>
      )}
    </div>
  )
}

/* ── KPI card ── */
function KpiCard({ icon: Icon, gradient, label, value, sub, loading }) {
  if (loading) return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
      <Skeleton className="h-10 w-10 rounded-xl mb-3" /><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-6 w-16" />
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

/* ── Lote card ── */
function LoteCard({ lote, index, noMotion, isAdmin }) {
  const isActivo = lote.estado === 'activo'
  const semanas  = isActivo ? calcWeeksAge(lote.fecha_ingreso) : null
  const pctSurv  = lote.cantidad_inicial_aves > 0
    ? ((lote.cantidad_aves_actuales / lote.cantidad_inicial_aves) * 100).toFixed(1)
    : 0

  const stripColor = isActivo ? 'bg-gradient-to-r from-green-400 to-emerald-500'
    : lote.estado === 'suspendido' ? 'bg-gradient-to-r from-yellow-400 to-amber-400'
    : 'bg-stone-200 dark:bg-stone-700'

  return (
    <article
      className="card flex flex-col overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
      style={!noMotion ? { animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${index * 55}ms` } : {}}
    >
      {/* Color strip */}
      <div className={`h-1.5 w-full ${stripColor}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActivo ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-sm shadow-green-500/25' : 'bg-stone-100 dark:bg-stone-800'}`}>
              <Layers className={`h-5 w-5 ${isActivo ? 'text-white' : 'text-stone-400 dark:text-stone-500'}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 dark:text-stone-50 truncate">{lote.nombre_numero}</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{lote.galpon?.nombre}</p>
            </div>
          </div>
          <StatusBadge status={lote.estado} />
        </div>

        {/* Raza chip */}
        {lote.raza?.nombre && (
          <div className="flex items-center gap-1.5">
            <Bird className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" aria-hidden="true" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
              {lote.raza.nombre}
            </span>
          </div>
        )}

        {/* Survival bar */}
        <SurvivalBar actual={lote.cantidad_aves_actuales} inicial={lote.cantidad_inicial_aves} showLabel />

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="detail-label">Fecha ingreso</p>
            <p className="detail-value text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3 text-stone-400" aria-hidden="true" />
              {formatDate(lote.fecha_ingreso)}
            </p>
          </div>
          <div>
            <p className="detail-label">{isActivo ? 'Semanas de vida' : 'Fecha salida'}</p>
            <p className="detail-value text-sm">
              {isActivo
                ? <span className="text-green-600 dark:text-green-400">{semanas} sem.</span>
                : formatDate(lote.fecha_salida) || '—'
              }
            </p>
          </div>
        </div>

        {/* Survival pct badge */}
        {isActivo && (
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl ${Number(pctSurv) >= 95 ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : Number(pctSurv) >= 85 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>Supervivencia: <strong>{pctSurv}%</strong></span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 mt-auto flex gap-2">
          <Link to={`/dashboard/lotes/${lote.id}`} className={isAdmin && (isActivo || lote.estado === 'suspendido') ? 'flex-1' : 'block w-full'}>
            <Button variant="" size="sm" icon={Eye} className="w-full justify-center text-xs border border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/25 transition-all">
              Ver
            </Button>
          </Link>
          {isAdmin && (isActivo || lote.estado === 'suspendido') && (
            <Link to={`/dashboard/lotes/${lote.id}/editar`}>
              <Button variant="" size="sm" icon={Pencil} aria-label={`Editar ${lote.nombre_numero}`}
                className="border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25"
              />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Main ── */
export default function LotesList() {
  useAutoRefreshAtMidnight()
  const { isAdmin, perfil } = useAuth()
  const { noMotion } = useA11y()
  const [filterEstado, setFilterEstado] = useState('')
  const [search, setSearch]             = useState('')
  const [view, setView]                 = useState('cards')
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(12)

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
      return data || []
    },
    enabled: !!perfil,
  })

  /* KPIs */
  const kpis = useMemo(() => {
    if (!data?.length) return null
    const activos    = data.filter(l => l.estado === 'activo')
    const totalAves  = activos.reduce((s, l) => s + (l.cantidad_aves_actuales || 0), 0)
    const totalBajas = data.reduce((s, l) => s + ((l.cantidad_inicial_aves || 0) - (l.cantidad_aves_actuales || 0)), 0)
    return {
      total:     data.length,
      activos:   activos.length,
      totalAves,
      totalBajas,
    }
  }, [data])

  /* Filter */
  const filtered = useMemo(() => (data || []).filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || l.nombre_numero.toLowerCase().includes(q)
      || (l.galpon?.nombre || '').toLowerCase().includes(q)
      || (l.raza?.nombre || '').toLowerCase().includes(q)
    const matchEstado = !filterEstado || l.estado === filterEstado
    return matchSearch && matchEstado
  }), [data, search, filterEstado])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lotes"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lotes y Razas' }]}
        actions={
          <div className="flex gap-2">
            <Link to="/dashboard/razas">
              <Button variant="secondary" icon={Bird}>Razas</Button>
            </Link>
            {isAdmin && (
              <Link to="/dashboard/lotes/nuevo">
                <Button icon={Plus}>Nuevo lote</Button>
              </Link>
            )}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard loading={isLoading} icon={Layers}       gradient="from-green-400 to-green-600"   label="Total lotes"      value={kpis?.total    ?? '—'} />
        <KpiCard loading={isLoading} icon={Activity}     gradient="from-emerald-400 to-emerald-600" label="Activos"         value={kpis?.activos  ?? '—'} sub={kpis ? `${kpis.total - kpis.activos} finalizados` : undefined} />
        <KpiCard loading={isLoading} icon={Bird}         gradient="from-blue-400 to-blue-600"     label="Aves en prod."    value={kpis ? formatNumber(kpis.totalAves) : '—'} sub="activas" />
        <KpiCard loading={isLoading} icon={TrendingDown} gradient="from-red-400 to-red-600"       label="Total bajas hist." value={kpis ? formatNumber(kpis.totalBajas) : '—'} sub="acumulado" />
      </div>

      {/* Filters + toggle */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
          <input
            className="input-base pl-9 pr-9"
            placeholder="Buscar lote, galpón o raza…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select className="input-base sm:w-44" value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          <option value="activo">Solo activos</option>
          <option value="suspendido">Suspendidos</option>
          <option value="finalizado">Finalizados</option>
        </select>
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 self-center flex-shrink-0">
          <button onClick={() => setView('cards')} aria-label="Vista tarjetas" className={`p-1.5 rounded-lg transition-all ${view === 'cards' ? 'bg-white dark:bg-stone-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('table')} aria-label="Vista tabla" className={`p-1.5 rounded-lg transition-all ${view === 'table' ? 'bg-white dark:bg-stone-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isLoading && (
        <p className="text-xs text-stone-400 dark:text-stone-500 px-1">
          {filtered.length} lote{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Cards view */}
      {view === 'cards' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-5 space-y-4">
                  <div className="flex gap-3"><Skeleton className="w-10 h-10 rounded-xl" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <div className="grid grid-cols-2 gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="card"><EmptyState icon={Layers} title="No hay lotes" description={search || filterEstado ? 'Ajusta los filtros aplicados.' : 'Crea el primer lote para comenzar.'} action={isAdmin && !search && !filterEstado && <Link to="/dashboard/lotes/nuevo"><Button icon={Plus} size="sm">Crear lote</Button></Link>} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((l, i) => <LoteCard key={l.id} lote={l} index={i} noMotion={noMotion} isAdmin={isAdmin} />)}
            </div>
          )}
          {filtered.length > pageSize && (
            <div className="card overflow-hidden">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} />
            </div>
          )}
        </>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="card overflow-hidden">
          {isLoading ? <TableSkeleton rows={5} cols={7} /> : paginated.length === 0 ? (
            <EmptyState icon={Layers} title="No hay lotes" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    {['Lote', 'Galpón', 'Raza', 'Supervivencia', 'Ingreso', 'Semanas', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {paginated.map(l => (
                    <tr key={l.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">{l.nombre_numero}</td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{l.galpon?.nombre}</td>
                      <td className="px-4 py-3">
                        {l.raza?.nombre ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">{l.raza.nombre}</span> : <span className="text-stone-400 dark:text-stone-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 w-36">
                        <SurvivalBar actual={l.cantidad_aves_actuales} inicial={l.cantidad_inicial_aves} showLabel />
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap text-xs">{formatDate(l.fecha_ingreso)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{l.estado === 'activo' ? <span className="text-green-600 dark:text-green-400 font-semibold">{calcWeeksAge(l.fecha_ingreso)} sem.</span> : <span className="text-stone-400 dark:text-stone-600">—</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.estado} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/dashboard/lotes/${l.id}`}>
                            <Button variant="" size="sm" icon={Eye} className="border border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/25">Ver</Button>
                          </Link>
                          {isAdmin && (l.estado === 'activo' || l.estado === 'suspendido') && (
                            <Link to={`/dashboard/lotes/${l.id}/editar`}>
                              <Button variant="" size="sm" icon={Pencil} className="border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25">Editar</Button>
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
          {filtered.length > 0 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} />}
        </div>
      )}
    </div>
  )
}
