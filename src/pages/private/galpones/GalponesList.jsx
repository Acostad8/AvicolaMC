import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatNumber } from '../../../lib/utils'
import {
  Plus, Eye, Pencil, Search, Building2, Users,
  LayoutGrid, List, X, TrendingUp, Activity,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '../../../components/ui/Skeleton'
import { ConfirmModal } from '../../../components/ui/Modal'
import toast from 'react-hot-toast'

/* ── Occupancy bar ── */
function OccupancyBar({ current, max, showLabel = false }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const barColor = pct > 90 ? 'bg-red-500'
    : pct > 70 ? 'bg-amber-500'
    : pct > 0  ? 'bg-green-500'
    : 'bg-stone-300 dark:bg-stone-600'
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-stone-500 dark:text-stone-400">Ocupación</span>
          <span className="font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
            {formatNumber(current)} / {formatNumber(max)}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <p className="text-right text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
          {pct.toFixed(1)}% de capacidad
        </p>
      )}
    </div>
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

/* ── Galpon card (grid view) ── */
function GalponCard({ galpon, isAdmin, onToggle }) {
  const loteActivo  = galpon.lotes?.find(l => l.estado === 'activo')
  const avesActuales = loteActivo?.cantidad_aves_actuales || 0
  const isActivo    = galpon.estado === 'activo'

  return (
    <article className="card flex flex-col gap-0 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Color strip */}
      <div className={`h-1.5 w-full ${isActivo ? 'bg-gradient-to-r from-amber-400 to-primary-500' : 'bg-stone-200 dark:bg-stone-700'}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActivo ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/30' : 'bg-stone-100 dark:bg-stone-800'}`}>
              <Building2 className={`h-5 w-5 ${isActivo ? 'text-white' : 'text-stone-400 dark:text-stone-500'}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 dark:text-stone-50 truncate">{galpon.nombre}</h3>
              {galpon.descripcion && (
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">{galpon.descripcion}</p>
              )}
            </div>
          </div>
          <StatusBadge status={galpon.estado} />
        </div>

        {/* Occupancy */}
        <OccupancyBar current={avesActuales} max={galpon.capacidad_maxima} showLabel />

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="detail-label">Lote activo</p>
            <p className="detail-value text-sm">
              {loteActivo?.nombre_numero
                ? <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {loteActivo.nombre_numero}
                  </span>
                : <span className="text-stone-400 dark:text-stone-600 font-normal text-xs">Sin lote activo</span>
              }
            </p>
          </div>
          <div>
            <p className="detail-label">Raza</p>
            <p className="detail-value text-sm">
              {loteActivo?.raza?.nombre
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">{loteActivo.raza.nombre}</span>
                : <span className="text-stone-400 dark:text-stone-600 font-normal text-xs">—</span>
              }
            </p>
          </div>
          <div className="col-span-2">
            <p className="detail-label">Encargado</p>
            <p className="detail-value text-sm flex items-center gap-1.5">
              {galpon.encargado?.nombre_completo
                ? <><div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0"><span className="text-white text-[9px] font-bold">{galpon.encargado.nombre_completo[0]}</span></div>{galpon.encargado.nombre_completo}</>
                : <span className="text-stone-400 dark:text-stone-600 font-normal text-xs">Sin asignar</span>
              }
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-stone-100 dark:border-stone-800 mt-auto">
          <Link to={`/dashboard/galpones/${galpon.id}`} className="flex-1">
            <Button variant="" size="sm" icon={Eye} className="w-full justify-center text-xs border border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/25 active:bg-primary-100 dark:active:bg-primary-900/30">
              Ver detalle
            </Button>
          </Link>
          {isAdmin && (
            <>
              <Link to={`/dashboard/galpones/${galpon.id}/editar`}>
                <Button
                  variant="" size="sm" icon={Pencil} aria-label="Editar"
                  className="border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25"
                />
              </Link>
              <Button
                variant="" size="sm"
                onClick={() => onToggle(galpon)}
                className={isActivo
                  ? 'border border-red-400 dark:border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/25'
                  : 'border border-green-500 dark:border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/25'
                }
              >
                {isActivo ? 'Desactivar' : 'Activar'}
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Main ── */
export default function GalponesList() {
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [view, setView]               = useState('cards')
  const [page, setPage]               = useState(1)
  const [pageSize, setPageSize]       = useState(12)
  const [confirm, setConfirm]         = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['galpones', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select(`
        id, nombre, capacidad_maxima, estado, descripcion,
        encargado:perfiles(id, nombre_completo),
        lotes(id, estado, cantidad_aves_actuales, raza:razas(nombre))
      `).order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!perfil,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, estado }) => {
      const { error } = await supabase.from('galpones').update({ estado }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['galpones']); toast.success('Estado actualizado'); setConfirm(null) },
    onError: () => toast.error('Error al actualizar'),
  })

  /* KPIs */
  const kpis = useMemo(() => {
    if (!data?.length) return null
    const activos = data.filter(g => g.estado === 'activo')
    const totalAves = activos.reduce((s, g) => {
      const l = g.lotes?.find(l => l.estado === 'activo')
      return s + (l?.cantidad_aves_actuales || 0)
    }, 0)
    const totalCap = data.reduce((s, g) => s + (g.capacidad_maxima || 0), 0)
    return {
      total: data.length,
      activos: activos.length,
      inactivos: data.length - activos.length,
      totalAves,
      totalCap,
      ocupacion: totalCap > 0 ? ((totalAves / totalCap) * 100).toFixed(1) : 0,
    }
  }, [data])

  /* Filter */
  const filtered = useMemo(() => (data || []).filter(g => {
    const q = search.toLowerCase()
    const matchSearch = !q || g.nombre.toLowerCase().includes(q)
      || (g.encargado?.nombre_completo || '').toLowerCase().includes(q)
      || (g.descripcion || '').toLowerCase().includes(q)
    const matchEstado = !filterEstado || g.estado === filterEstado
    return matchSearch && matchEstado
  }), [data, search, filterEstado])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  function clearSearch() { setSearch(''); setPage(1) }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Galpones"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Galpones' }]}
        actions={isAdmin && (
          <Link to="/dashboard/galpones/nuevo">
            <Button icon={Plus}>Nuevo galpón</Button>
          </Link>
        )}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard loading={isLoading} icon={Building2}   gradient="from-amber-400 to-amber-600"   label="Total galpones"   value={kpis?.total     ?? '—'} />
        <KpiCard loading={isLoading} icon={Activity}    gradient="from-green-400 to-green-600"   label="Activos"          value={kpis?.activos   ?? '—'} sub={kpis ? `${kpis.inactivos} inactivos` : undefined} />
        <KpiCard loading={isLoading} icon={Users}        gradient="from-blue-400 to-blue-600"     label="Aves en prod."    value={kpis ? formatNumber(kpis.totalAves) : '—'} sub="total activas" />
        <KpiCard loading={isLoading} icon={TrendingUp}   gradient="from-violet-400 to-violet-600" label="Ocupación prom."  value={kpis ? `${kpis.ocupacion}%` : '—'} sub={kpis ? `de ${formatNumber(kpis.totalCap)} cap.` : undefined} />
      </div>

      {/* Filters + view toggle */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden="true" />
          <input
            className="input-base pl-9 pr-9"
            placeholder="Buscar por nombre, encargado…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            aria-label="Buscar galpones"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors" aria-label="Limpiar búsqueda">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Estado filter */}
        <select
          className="input-base sm:w-44"
          value={filterEstado}
          onChange={e => { setFilterEstado(e.target.value); setPage(1) }}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 self-center">
          <button
            onClick={() => setView('cards')}
            aria-label="Vista en tarjetas"
            className={`p-1.5 rounded-lg transition-all ${view === 'cards' ? 'bg-white dark:bg-stone-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('table')}
            aria-label="Vista en tabla"
            className={`p-1.5 rounded-lg transition-all ${view === 'table' ? 'bg-white dark:bg-stone-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results label */}
      {!isLoading && (
        <p className="text-xs text-stone-400 dark:text-stone-500 px-1">
          {filtered.length} galpón{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          {(search || filterEstado) && ' · Filtros activos'}
        </p>
      )}

      {/* ── CARDS VIEW ── */}
      {view === 'cards' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-5 space-y-4">
                  <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-xl" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="grid grid-cols-2 gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Building2}
                title="No hay galpones"
                description={search || filterEstado ? 'Prueba con otros filtros.' : 'Crea el primer galpón para comenzar.'}
                action={isAdmin && !search && !filterEstado && (
                  <Link to="/dashboard/galpones/nuevo"><Button icon={Plus} size="sm">Crear galpón</Button></Link>
                )}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map(g => (
                <GalponCard key={g.id} galpon={g} isAdmin={isAdmin} onToggle={setConfirm} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="card overflow-hidden">
          {isLoading ? <TableSkeleton rows={5} cols={6} /> : paginated.length === 0 ? (
            <EmptyState icon={Building2} title="No hay galpones" description="Prueba con otros filtros." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    {['Galpón', 'Capacidad', 'Ocupación', 'Estado', 'Lote activo', 'Encargado', 'Acciones'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {paginated.map(g => {
                    const loteActivo  = g.lotes?.find(l => l.estado === 'activo')
                    const avesActuales = loteActivo?.cantidad_aves_actuales || 0
                    return (
                      <tr key={g.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${g.estado === 'activo' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-stone-100 dark:bg-stone-800'}`}>
                              <Building2 className={`h-3.5 w-3.5 ${g.estado === 'activo' ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'}`} />
                            </div>
                            <span className="font-semibold text-stone-800 dark:text-stone-100">{g.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-600 dark:text-stone-400 tabular-nums">{formatNumber(g.capacidad_maxima)}</td>
                        <td className="px-4 py-3 w-36">
                          <OccupancyBar current={avesActuales} max={g.capacidad_maxima} showLabel />
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={g.estado} /></td>
                        <td className="px-4 py-3">
                          {loteActivo
                            ? <Badge variant="green">{formatNumber(avesActuales)} aves</Badge>
                            : <span className="text-stone-400 dark:text-stone-600 text-xs">Sin lote</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                          {g.encargado?.nombre_completo || <span className="text-stone-400 dark:text-stone-600 text-xs">Sin asignar</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link to={`/dashboard/galpones/${g.id}`}>
                              <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                            </Link>
                            {isAdmin && (
                              <>
                                <Link to={`/dashboard/galpones/${g.id}/editar`}>
                                  <Button
                                    variant="" size="sm" icon={Pencil}
                                    className="border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25"
                                  >
                                    Editar
                                  </Button>
                                </Link>
                                <Button
                                  variant="" size="sm"
                                  className={g.estado === 'activo'
                                    ? 'border border-red-400 dark:border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/25'
                                    : 'border border-green-500 dark:border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/25'
                                  }
                                  onClick={() => setConfirm(g)}
                                >
                                  {g.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                </Button>
                              </>
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
      )}

      {/* Pagination for cards view */}
      {view === 'cards' && filtered.length > pageSize && (
        <div className="card overflow-hidden">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} />
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleMutation.mutate({ id: confirm.id, estado: confirm.estado === 'activo' ? 'inactivo' : 'activo' })}
        loading={toggleMutation.isPending}
        title={confirm?.estado === 'activo' ? 'Desactivar galpón' : 'Activar galpón'}
        message={`¿Estás seguro de ${confirm?.estado === 'activo' ? 'desactivar' : 'activar'} el galpón "${confirm?.nombre}"?`}
        confirmLabel={confirm?.estado === 'activo' ? 'Desactivar' : 'Activar'}
      />
    </div>
  )
}
