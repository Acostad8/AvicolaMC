import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { TIPOS_PROVEEDOR } from '../../../lib/utils'
import {
  Plus, Eye, Pencil, Truck, Package, Bird, Layers,
  MoreHorizontal, Search, Phone, Mail, CheckCircle2,
  XCircle, Filter, Users,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import Pagination from '../../../components/ui/Pagination'
import EmptyState from '../../../components/ui/EmptyState'
import { Skeleton } from '../../../components/ui/Skeleton'

/* ── Mapa visual por tipo ── */
const TIPO_META = {
  insumos: { label: 'Insumos',       Icon: Package,       grad: 'from-teal-400 to-emerald-500',  bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-400',   badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'   },
  razas:   { label: 'Aves / Razas',  Icon: Bird,          grad: 'from-amber-400 to-orange-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  ambos:   { label: 'Insumos & Aves',Icon: Layers,        grad: 'from-blue-400 to-violet-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-400',   badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'   },
  otro:    { label: 'Otro',          Icon: MoreHorizontal, grad: 'from-stone-400 to-stone-600',  bg: 'bg-stone-50 dark:bg-stone-800',     text: 'text-stone-600 dark:text-stone-400', badge: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'   },
}

function getMeta(tipo) { return TIPO_META[tipo] || TIPO_META.otro }

function getInitials(nombre = '') {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
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

/* ── Skeleton de tarjeta ── */
function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  )
}

/* ── Tarjeta de proveedor ── */
function ProveedorCard({ p }) {
  const meta     = getMeta(p.tipo_proveedor)
  const { Icon } = meta
  const isActivo = p.estado === 'activo'

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200 group">
      {/* Top gradient band */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${meta.grad}`} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Header: avatar + nombre + tipo */}
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <span className="text-white font-black text-base select-none">{getInitials(p.nombre)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 leading-tight line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {p.nombre}
              </h3>
              {/* Estado dot */}
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isActivo ? 'bg-emerald-500' : 'bg-stone-400'}`} title={isActivo ? 'Activo' : 'Inactivo'} />
            </div>
            <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.badge}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* Contacto */}
        <div className="space-y-2 flex-1">
          {p.telefono && (
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
              <Phone className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
              <span className="truncate">{p.telefono}</span>
            </div>
          )}
          {p.correo && (
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
              <Mail className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
              <span className="truncate">{p.correo}</span>
            </div>
          )}
          {!p.telefono && !p.correo && (
            <p className="text-xs text-stone-400 dark:text-stone-500 italic">Sin datos de contacto</p>
          )}
        </div>

        {/* Estado badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit ${
          isActivo
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
        }`}>
          {isActivo
            ? <CheckCircle2 className="h-3 w-3" />
            : <XCircle className="h-3 w-3" />
          }
          {isActivo ? 'Activo' : 'Inactivo'}
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <Link to={`/dashboard/proveedores/${p.id}`} className="flex-1">
            <Button variant="secondary" size="sm" icon={Eye} className="w-full justify-center">
              Ver
            </Button>
          </Link>
          <Link to={`/dashboard/proveedores/${p.id}/editar`} className="flex-1">
            <Button variant="ghost" size="sm" icon={Pencil} className="w-full justify-center">
              Editar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ProveedoresList() {
  const [search,      setSearch]      = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTipo,   setFilterTipo]   = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(12)

  const { data, isLoading } = useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
      if (error) throw error
      return data || []
    },
  })

  const todos = data || []

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return todos.filter(p =>
      (!q || p.nombre.toLowerCase().includes(q) || p.telefono?.includes(q) || p.correo?.toLowerCase().includes(q)) &&
      (!filterEstado || p.estado === filterEstado) &&
      (!filterTipo   || p.tipo_proveedor === filterTipo)
    )
  }, [todos, search, filterEstado, filterTipo])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  /* Stats */
  const activos   = todos.filter(p => p.estado === 'activo').length
  const inactivos = todos.filter(p => p.estado === 'inactivo').length
  const deInsumos = todos.filter(p => p.tipo_proveedor === 'insumos' || p.tipo_proveedor === 'ambos').length
  const deRazas   = todos.filter(p => p.tipo_proveedor === 'razas'   || p.tipo_proveedor === 'ambos').length

  function handleFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Proveedores"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Proveedores' }]}
        actions={
          <Link to="/dashboard/proveedores/nuevo">
            <Button icon={Plus}>Nuevo proveedor</Button>
          </Link>
        }
      />

      {/* ── Stats ── */}
      {!isLoading && todos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total"    value={todos.length} icon={Truck}   />
          <StatCard label="Activos"  value={activos}  icon={CheckCircle2} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/20" />
          <StatCard label="Insumos"  value={deInsumos} icon={Package}    colorClass="text-teal-600 dark:text-teal-400"    bgClass="bg-teal-50 dark:bg-teal-900/20"    />
          <StatCard label="Aves"     value={deRazas}   icon={Bird}       colorClass="text-amber-600 dark:text-amber-400"  bgClass="bg-amber-50 dark:bg-amber-900/20"  />
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre, teléfono o correo…"
            className="input-base pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-stone-400 flex-shrink-0" />
          <select className="input-base sm:w-40" value={filterEstado} onChange={handleFilter(setFilterEstado)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select className="input-base sm:w-48" value={filterTipo} onChange={handleFilter(setFilterTipo)}>
            <option value="">Todos los tipos</option>
            {TIPOS_PROVEEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Grid de tarjetas ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filtered.length === 0 && todos.length > 0 ? 'Sin resultados' : 'No hay proveedores'}
          description={filtered.length === 0 && todos.length > 0
            ? 'Intenta ajustar los filtros de búsqueda.'
            : 'Registra el primer proveedor usando el botón superior.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(p => <ProveedorCard key={p.id} p={p} />)}
          </div>

          {/* Contador + paginación */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Mostrando <strong className="text-stone-600 dark:text-stone-300">{paginated.length}</strong> de <strong className="text-stone-600 dark:text-stone-300">{filtered.length}</strong> proveedores
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
      )}
    </div>
  )
}
