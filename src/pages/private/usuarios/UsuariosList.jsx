import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import {
  Plus, Pencil, Eye, UserCog, Search, Shield,
  Users, UserCheck, Crown, Clock, Mail,
  CheckCircle2, XCircle, Filter, LayoutGrid, LayoutList,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { Skeleton, TableSkeleton } from '../../../components/ui/Skeleton'

/* ── Paleta visual por rol ── */
const ROL_META = {
  administrador: {
    label: 'Administrador',
    grad:  'from-amber-400 to-orange-500',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    icon:  Crown,
    band:  'from-amber-400 via-orange-400 to-amber-600',
  },
  encargado: {
    label: 'Encargado',
    grad:  'from-blue-400 to-indigo-500',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    icon:  Shield,
    band:  'from-blue-400 via-indigo-400 to-blue-600',
  },
}

function getRolMeta(rol) { return ROL_META[rol] || ROL_META.encargado }

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function timeAgoShort(iso) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'Ahora mismo'
  if (m < 60)  return `Hace ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30)  return `Hace ${d}d`
  return formatDate(iso)
}

/* ── Stat card ── */
function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${bgClass || 'bg-stone-50 dark:bg-stone-800'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass ? 'bg-white/40 dark:bg-black/20' : 'bg-stone-200 dark:bg-stone-700'}`}>
        <Icon className={`h-4 w-4 ${colorClass || 'text-stone-500'}`} />
      </div>
      <div>
        <p className={`text-xl font-black tabular-nums ${colorClass || 'text-stone-800 dark:text-stone-100'}`}>{value}</p>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">{label}</p>
      </div>
    </div>
  )
}

/* ── Skeleton tarjeta ── */
function CardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-700" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/* ── Tarjeta de usuario ── */
function UsuarioCard({ u }) {
  const meta     = getRolMeta(u.rol)
  const { icon: RolIcon } = meta
  const isActivo = u.estado === 'activo'

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200 group">
      {/* Banda superior de color por rol */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${meta.band}`} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Avatar + nombre + rol */}
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <span className="text-white font-black text-base select-none">{getInitials(u.nombre_completo)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 leading-tight line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {u.nombre_completo}
              </h3>
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isActivo ? 'bg-emerald-500' : 'bg-stone-400'}`} title={isActivo ? 'Activo' : 'Inactivo'} />
            </div>
            <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.badge}`}>
              <RolIcon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
        </div>

        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* Info de contacto y acceso */}
        <div className="space-y-2 flex-1">
          {u.email && (
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
              <Mail className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
              <span className="truncate">{u.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Clock className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
            <span>{timeAgoShort(u.ultimo_acceso)}</span>
          </div>
        </div>

        {/* Badge de estado */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit ${
          isActivo
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
        }`}>
          {isActivo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {isActivo ? 'Activo' : 'Inactivo'}
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <Link to={`/dashboard/usuarios/${u.id}`} className="flex-1">
            <Button variant="secondary" size="sm" icon={Eye} className="w-full justify-center">Ver</Button>
          </Link>
          <Link to={`/dashboard/usuarios/${u.id}/editar`} className="flex-1">
            <Button variant="secondary" size="sm" icon={Pencil} className="w-full justify-center">Editar</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function UsuariosList() {
  const [search,       setSearch]       = useState('')
  const [filterRol,    setFilterRol]    = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(12)
  const [view,         setView]         = useState('grid')

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').order('nombre_completo')
      if (error) throw error
      return data || []
    },
  })

  const todos = data || []

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return todos.filter(u =>
      (!q || u.nombre_completo?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) &&
      (!filterRol    || u.rol    === filterRol)    &&
      (!filterEstado || u.estado === filterEstado)
    )
  }, [todos, search, filterRol, filterEstado])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  /* Stats */
  const activos  = todos.filter(u => u.estado === 'activo').length
  const admins   = todos.filter(u => u.rol === 'administrador').length
  const encargados = todos.filter(u => u.rol === 'encargado').length

  function handleFilter(setter) {
    return e => { setter(e.target.value); setPage(1) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Usuarios' }]}
        actions={
          <Link to="/dashboard/usuarios/nuevo">
            <Button icon={Plus}>Nuevo usuario</Button>
          </Link>
        }
      />

      {/* ── Stats ── */}
      {!isLoading && todos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total"        value={todos.length} icon={Users}      />
          <StatCard label="Activos"      value={activos}      icon={UserCheck}
            colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/20" />
          <StatCard label="Administradores" value={admins}    icon={Crown}
            colorClass="text-amber-600 dark:text-amber-400"   bgClass="bg-amber-50 dark:bg-amber-900/20"   />
          <StatCard label="Encargados"   value={encargados}   icon={Shield}
            colorClass="text-blue-600 dark:text-blue-400"     bgClass="bg-blue-50 dark:bg-blue-900/20"     />
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre o correo…"
            className="input-base pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-stone-400 flex-shrink-0" />
          <select className="input-base sm:w-44" value={filterRol} onChange={handleFilter(setFilterRol)}>
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="encargado">Encargado</option>
          </select>
          <select className="input-base sm:w-40" value={filterEstado} onChange={handleFilter(setFilterEstado)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        {/* Toggle de vista */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1 ml-auto">
          <button
            onClick={() => { setView('grid'); setPageSize(12) }}
            className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-50' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
            title="Vista en cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setView('list'); setPageSize(10); setPage(1) }}
            className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-50' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
            title="Vista en lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      {isLoading ? (
        view === 'grid'
          ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )
          : <div className="card overflow-hidden"><TableSkeleton rows={6} cols={6} /></div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title={filtered.length === 0 && todos.length > 0 ? 'Sin resultados' : 'No hay usuarios'}
          description={filtered.length === 0 && todos.length > 0
            ? 'Ajusta los filtros de búsqueda.'
            : 'Crea el primer usuario con el botón superior.'
          }
        />
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(u => <UsuarioCard key={u.id} u={u} />)}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800">
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Mostrando <strong className="text-stone-600 dark:text-stone-300">{paginated.length}</strong> de <strong className="text-stone-600 dark:text-stone-300">{filtered.length}</strong> usuarios
              </p>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={n => { setPageSize(n); setPage(1) }}
              pageSizeOptions={[12, 24, 48]}
            />
          </div>
        </>
      ) : (
        /* ── Vista lista (tabla) ── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Usuario', 'Correo', 'Rol', 'Último acceso', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {paginated.map(u => {
                  const meta      = getRolMeta(u.rol)
                  const { icon: RolIcon } = meta
                  const isActivo  = u.estado === 'activo'
                  return (
                    <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                      {/* Usuario */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center shadow-sm flex-shrink-0`}>
                            <span className="text-white font-bold text-xs select-none">{getInitials(u.nombre_completo)}</span>
                          </div>
                          <p className="font-medium text-stone-800 dark:text-stone-100 leading-tight">{u.nombre_completo}</p>
                        </div>
                      </td>
                      {/* Correo */}
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{u.email || '—'}</span>
                        </div>
                      </td>
                      {/* Rol */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.badge}`}>
                          <RolIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                      {/* Último acceso */}
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                          {timeAgoShort(u.ultimo_acceso)}
                        </div>
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isActivo
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                        }`}>
                          {isActivo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Link to={`/dashboard/usuarios/${u.id}`}>
                            <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
                          </Link>
                          <Link to={`/dashboard/usuarios/${u.id}/editar`}>
                            <Button variant="secondary" size="sm" icon={Pencil}>Editar</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-stone-100 dark:border-stone-800">
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Mostrando <strong className="text-stone-600 dark:text-stone-300">{paginated.length}</strong> de <strong className="text-stone-600 dark:text-stone-300">{filtered.length}</strong> usuarios
            </p>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={n => { setPageSize(n); setPage(1) }}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      )}
    </div>
  )
}
