import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import { Plus, Eye, Pencil, Users, Search, Phone, Briefcase, Calendar, LayoutGrid, LayoutList } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '../../../components/ui/Skeleton'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

const AVATAR_COLORS = [
  'from-amber-400 to-orange-500',
  'from-green-400 to-emerald-600',
  'from-blue-400 to-indigo-600',
  'from-purple-400 to-violet-600',
  'from-pink-400 to-rose-600',
  'from-teal-400 to-cyan-600',
]

function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

/* ── Employee card (grid view) ── */
function EmpleadoCard({ e }) {
  return (
    <div className="card overflow-hidden group hover:shadow-md dark:hover:shadow-stone-900 transition-all duration-200">
      <div className={`h-1.5 w-full bg-gradient-to-r ${e.estado === 'activo' ? 'from-amber-400 to-primary-600' : 'from-stone-300 to-stone-400 dark:from-stone-600 dark:to-stone-700'}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColor(e.nombre_completo)} flex items-center justify-center shadow-md flex-shrink-0`}>
              <span className="text-white font-bold text-sm">{getInitials(e.nombre_completo)}</span>
            </div>
            <div>
              <p className="font-semibold text-stone-900 dark:text-stone-50 leading-tight">{e.nombre_completo}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{e.documento_identidad || '—'}</p>
            </div>
          </div>
          <StatusBadge status={e.estado} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-stone-400 dark:text-stone-500" />
            <span className="truncate">{e.cargo || 'Sin cargo asignado'}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-stone-400 dark:text-stone-500" />
            <span>{e.telefono || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-stone-400 dark:text-stone-500" />
            <span>Ingreso: {formatDate(e.fecha_ingreso)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
          <Link to={`/dashboard/empleados/${e.id}`} className="flex-1">
            <Button variant="secondary" size="sm" icon={Eye} className="w-full justify-center">Ver perfil</Button>
          </Link>
          <Link to={`/dashboard/empleados/${e.id}/editar`}>
            <Button variant="secondary" size="sm" icon={Pencil} />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Skeleton for card view ── */
function CardSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800" />
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="pt-2">
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EmpleadosList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [filterEstado, setFilterEstado] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')

  const { data, isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empleados').select('*').order('nombre_completo')
      if (error) throw error
      return data || []
    },
  })

  const filtered = useMemo(() => {
    return (data || []).filter(e => {
      const matchEstado = filterEstado ? e.estado === filterEstado : true
      const q = search.toLowerCase()
      const matchSearch = q
        ? e.nombre_completo?.toLowerCase().includes(q) ||
          e.cargo?.toLowerCase().includes(q) ||
          e.telefono?.includes(q)
        : true
      return matchEstado && matchSearch
    })
  }, [data, filterEstado, search])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const counts = useMemo(() => ({
    total: (data || []).length,
    activos: (data || []).filter(e => e.estado === 'activo').length,
    inactivos: (data || []).filter(e => e.estado === 'inactivo').length,
  }), [data])

  function handleSearch(val) { setSearch(val); setPage(1) }
  function handleFilter(val) { setFilterEstado(val); setPage(1) }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Empleados"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Empleados' }]}
        actions={
          <Link to="/dashboard/empleados/nuevo">
            <Button icon={Plus}>Nuevo empleado</Button>
          </Link>
        }
      />

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-stone-900 dark:text-stone-50' },
          { label: 'Activos', value: counts.activos, color: 'text-green-600 dark:text-green-400' },
          { label: 'Inactivos', value: counts.inactivos, color: 'text-stone-500 dark:text-stone-400' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-black tabular-nums ${s.color}`}>{isLoading ? '—' : s.value}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters bar ── */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, cargo o teléfono…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>

        {/* Estado filter */}
        <select
          className="input-base sm:w-40 bg-white dark:bg-stone-900"
          value={filterEstado}
          onChange={e => handleFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        {/* View toggle */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-50' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
            title="Vista en cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setView('list'); setPageSize(10) }}
            className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-50' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
            title="Vista en lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        view === 'grid' ? <CardSkeletons /> : <div className="card overflow-hidden"><TableSkeleton rows={5} cols={5} /></div>
      ) : paginated.length === 0 ? (
        <EmptyState icon={Users} title="No hay empleados" description={search || filterEstado ? 'Prueba ajustando los filtros de búsqueda.' : 'Crea el primer empleado para comenzar.'} />
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(e => <EmpleadoCard key={e.id} e={e} />)}
          </div>
          {filtered.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} pageSizeOptions={[12, 24, 48]} />
          )}
        </>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Empleado', 'Cargo', 'Teléfono', 'Ingreso', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {paginated.map(e => (
                  <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarColor(e.nombre_completo)} flex items-center justify-center shadow-sm flex-shrink-0`}>
                          <span className="text-white font-bold text-xs">{getInitials(e.nombre_completo)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-stone-800 dark:text-stone-100 leading-tight">{e.nombre_completo}</p>
                          <p className="text-xs text-stone-400 dark:text-stone-500">{e.documento_identidad || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{e.cargo || '—'}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{e.telefono || '—'}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{formatDate(e.fecha_ingreso)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.estado} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/dashboard/empleados/${e.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                        </Link>
                        <Link to={`/dashboard/empleados/${e.id}/editar`}>
                          <Button variant="secondary" size="sm" icon={Pencil}>Editar</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }} pageSizeOptions={[12, 24, 48]} />
          )}
        </div>
      )}
    </div>
  )
}
