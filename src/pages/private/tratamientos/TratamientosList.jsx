import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { useConfig } from '../../../context/ConfigContext'
import { formatDate, downloadCSV, getLabelFromValue, TIPOS_TRATAMIENTO } from '../../../lib/utils'
import { Plus, Download, Eye, Pencil, Syringe, CheckCircle2, Activity, AlertTriangle, Lock, Clock, Search, User } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '../../../components/ui/Skeleton'

/* ── 24h edit window check ── */
function withinEditWindow(created_at) {
  if (!created_at) return false
  return Date.now() - new Date(created_at).getTime() < 24 * 3600 * 1000
}

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

/* ── Tipo Badge ── */
function TipoBadge({ tipo }) {
  const label = getLabelFromValue(TIPOS_TRATAMIENTO, tipo)
  const cls =
    tipo === 'vacunacion'
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      : tipo === 'medicacion'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      : tipo === 'desparasitacion'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : tipo === 'vitaminas'
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label || tipo || '—'}
    </span>
  )
}

function diasDesdeInicio(fecha_inicio) {
  if (!fecha_inicio) return 0
  return Math.floor((Date.now() - new Date(fecha_inicio).getTime()) / 86_400_000)
}

export default function TratamientosList() {
  const { isAdmin, perfil } = useAuth()
  const { config } = useConfig()
  const umbralDias = config.produccion?.umbral_dias_tratamiento ?? 7
  useA11y()

  const [search,       setSearch]       = useState('')
  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterDesde, setFilterDesde]   = useState('')
  const [filterHasta, setFilterHasta]   = useState('')
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').in('estado', ['en_produccion', 'disponible']).order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['tratamientos', isAdmin, perfil?.id, filterGalpon, filterEstado, filterDesde, filterHasta],
    queryFn: async () => {
      let q = supabase
        .from('tratamientos')
        .select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero)`)
        .order('fecha_inicio', { ascending: false })
      if (!isAdmin && galpones) {
        const ids = galpones.map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      if (filterGalpon) q = q.eq('galpon_id', filterGalpon)
      if (filterEstado) q = q.eq('estado', filterEstado)
      if (filterDesde)  q = q.gte('fecha_inicio', filterDesde)
      if (filterHasta)  q = q.lte('fecha_inicio', filterHasta)
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
    const total       = list.length
    const enCurso     = list.filter(r => r.estado === 'activo').length
    const finalizados = list.filter(r => r.estado === 'finalizado').length
    const prolongados = list.filter(r =>
      r.estado === 'activo' && diasDesdeInicio(r.fecha_inicio) > umbralDias
    ).length
    return { total, enCurso, finalizados, prolongados }
  }, [data, umbralDias])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return data || []
    return (data || []).filter(r =>
      r.responsable?.toLowerCase().includes(q) ||
      r.nombre_producto?.toLowerCase().includes(q) ||
      r.galpon?.nombre?.toLowerCase().includes(q) ||
      r.lote?.nombre_numero?.toLowerCase().includes(q) ||
      getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo)?.toLowerCase().includes(q)
    )
  }, [data, search])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    downloadCSV((data || []).map(r => ({
      'Fecha inicio': r.fecha_inicio,
      'Fecha fin': r.fecha_fin || '',
      Galpón: r.galpon?.nombre,
      Lote: r.lote?.nombre_numero,
      Tipo: getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo),
      Producto: r.nombre_producto,
      Dosis: r.dosis_aplicacion,
      Responsable: r.responsable,
      Estado: r.estado,
      Observaciones: r.observaciones || '',
    })), 'tratamientos')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tratamientos Veterinarios"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tratamientos' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExport}>Exportar CSV</Button>
            <Link to="/dashboard/tratamientos/nuevo"><Button icon={Plus}>Nuevo</Button></Link>
          </div>
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          loading={isLoading}
          icon={Syringe}
          gradient="from-blue-400 to-blue-600"
          label="Total tratamientos"
          value={kpis ? kpis.total : '—'}
          sub="registrados"
        />
        <KpiCard
          loading={isLoading}
          icon={Activity}
          gradient="from-green-400 to-green-600"
          label="En curso"
          value={kpis ? kpis.enCurso : '—'}
          sub="activos"
        />
        <KpiCard
          loading={isLoading}
          icon={CheckCircle2}
          gradient="from-stone-400 to-stone-600"
          label="Finalizados"
          value={kpis ? kpis.finalizados : '—'}
          sub="completados"
        />
        <KpiCard
          loading={isLoading}
          icon={AlertTriangle}
          gradient={kpis?.prolongados > 0 ? 'from-amber-400 to-orange-500' : 'from-stone-400 to-stone-500'}
          label="Prolongados"
          value={kpis ? kpis.prolongados : '—'}
          sub={`activos > ${umbralDias} días`}
        />
      </div>

      {/* ── Banner de alerta para prolongados ── */}
      {!isLoading && kpis?.prolongados > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{kpis.prolongados} tratamiento{kpis.prolongados !== 1 ? 's' : ''}</strong> lleva{kpis.prolongados !== 1 ? 'n' : ''} más de <strong>{umbralDias} días</strong> activo{kpis.prolongados !== 1 ? 's' : ''} sin finalizar.
            Revisa si requieren atención o cierre. El umbral se configura en <strong>Configuración → Producción</strong>.
          </p>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="card p-4 space-y-3">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por responsable, producto, galpón, lote o tipo…"
            className="input-base pl-9 w-full"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">Galpón</label>
            <select
              className="input-base"
              value={filterGalpon}
              onChange={e => { setFilterGalpon(e.target.value); setPage(1) }}
            >
              <option value="">Todos</option>
              {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Estado</label>
            <select
              className="input-base"
              value={filterEstado}
              onChange={e => { setFilterEstado(e.target.value); setPage(1) }}
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="finalizado">Finalizado</option>
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
        {/* Contador de resultados cuando hay búsqueda activa */}
        {search && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {filtered.length === 0
              ? 'Sin resultados para esta búsqueda'
              : <><strong className="text-stone-700 dark:text-stone-200">{filtered.length}</strong> resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</>
            }
          </p>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : paginated.length === 0 ? (
          <EmptyState
            icon={Syringe}
            title={search ? 'Sin resultados' : 'No hay tratamientos registrados'}
            description={search ? 'Intenta con otros términos de búsqueda.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Inicio', 'Galpón', 'Lote', 'Tipo', 'Producto', 'Responsable', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {paginated.map(r => (
                  <tr
                    key={r.id}
                    className={`hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors ${
                      r.estado === 'activo' ? 'border-l-2 border-l-blue-400 dark:border-l-blue-600' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-stone-600 dark:text-stone-400 text-xs">
                      {formatDate(r.fecha_inicio)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                      {r.galpon?.nombre}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap text-xs">
                      {r.lote?.nombre_numero || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TipoBadge tipo={r.tipo} />
                    </td>
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-300 whitespace-nowrap">
                      {r.nombre_producto}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.responsable ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                            <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-stone-700 dark:text-stone-300 font-medium">{r.responsable}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 dark:text-stone-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.estado} />
                        {r.estado === 'activo' && diasDesdeInicio(r.fecha_inicio) > umbralDias && (
                          <span
                            title={`Activo hace ${diasDesdeInicio(r.fecha_inicio)} días (umbral: ${umbralDias})`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {diasDesdeInicio(r.fecha_inicio)}d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/dashboard/tratamientos/${r.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        {isAdmin ? (
                          <Link to={`/dashboard/tratamientos/${r.id}/editar`}>
                            <Button variant="ghost" size="sm" icon={Pencil}
                              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              Editar
                            </Button>
                          </Link>
                        ) : withinEditWindow(r.created_at) ? (
                          <Link to={`/dashboard/tratamientos/${r.id}/editar`}>
                            <Button variant="ghost" size="sm" icon={Clock}
                              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
