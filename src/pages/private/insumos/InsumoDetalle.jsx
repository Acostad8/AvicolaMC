import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate, getLabelFromValue, CATEGORIAS_INSUMO } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useAuth } from '../../../context/AuthContext'
import {
  Pencil, Plus, AlertTriangle, Package, Boxes,
  ArrowDownCircle, ArrowUpCircle,
  BarChart3, Calendar, User,
} from 'lucide-react'

/* ── Mapa visual por categoría ── */
const CATEGORIA_META = {
  alimento:     { color: 'from-amber-500 to-orange-600',  bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-400'     },
  medicamento:  { color: 'from-violet-500 to-purple-700', bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-700 dark:text-violet-400'   },
  vacuna:       { color: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-700 dark:text-blue-400'       },
  desinfectante:{ color: 'from-teal-500 to-emerald-600',  bg: 'bg-teal-100 dark:bg-teal-900/30',      text: 'text-teal-700 dark:text-teal-400'       },
  herramienta:  { color: 'from-stone-500 to-stone-700',   bg: 'bg-stone-100 dark:bg-stone-800',       text: 'text-stone-700 dark:text-stone-400'     },
  otro:         { color: 'from-pink-500 to-rose-600',     bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-700 dark:text-pink-400'       },
}

function getCatMeta(cat) {
  return CATEGORIA_META[cat] || CATEGORIA_META.otro
}

/* ── Stock level bar ── */
function StockBar({ actual, minimo }) {
  if (!minimo || minimo === 0) return null
  const pct     = Math.min((actual / (minimo * 3)) * 100, 100)
  const isBajo  = actual <= minimo
  const isCritic = actual === 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${isCritic ? 'text-red-600 dark:text-red-400' : isBajo ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {isCritic ? 'Sin stock' : isBajo ? 'Stock bajo' : 'Stock OK'}
        </span>
        <span className="text-stone-400 dark:text-stone-500">
          Mín: {minimo}
        </span>
      </div>
      <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isCritic ? 'bg-red-500' : isBajo ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.max(pct, actual > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  )
}

/* ── Stat card ── */
function StatCard({ label, value, sub, colorClass, bgClass }) {
  return (
    <div className={`rounded-xl p-4 ${bgClass || 'bg-stone-50 dark:bg-stone-800'}`}>
      <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${colorClass || 'text-stone-800 dark:text-stone-100'}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

export default function InsumoDetalle() {
  const { id }      = useParams()
  const { isAdmin } = useAuth()

  const { data: insumo, isLoading } = useQuery({
    queryKey: ['insumo', id],
    queryFn: async () => {
      const { data } = await supabase.from('insumos').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: movimientos } = useQuery({
    queryKey: ['movimientos-insumo', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('movimientos_insumos')
        .select('*, registrado:perfiles(nombre_completo)')
        .eq('insumo_id', id)
        .order('fecha', { ascending: false })
        .limit(50)
      return data || []
    },
  })

  if (isLoading) return <LoadingSkeleton />
  if (!insumo) return null

  const meta    = getCatMeta(insumo.categoria)
  const isBajo  = insumo.stock_actual <= insumo.stock_minimo
  const isCritic = insumo.stock_actual === 0
  const catLabel = getLabelFromValue(CATEGORIAS_INSUMO, insumo.categoria)

  const totalEntradas = (movimientos || []).filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.cantidad), 0)
  const totalSalidas  = (movimientos || []).filter(m => m.tipo === 'salida').reduce((s, m) => s + Number(m.cantidad), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={insumo.nombre}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Insumos', href: '/dashboard/insumos' },
          { label: insumo.nombre },
        ]}
        actions={isAdmin && (
          <div className="flex gap-2">
            <Link to="/dashboard/insumos/movimiento/nuevo">
              <Button size="sm" icon={Plus}>Movimiento</Button>
            </Link>
            <Link to={`/dashboard/insumos/${id}/editar`}>
              <Button variant="secondary" size="sm" icon={Pencil}>Editar</Button>
            </Link>
          </div>
        )}
      />

      {/* ── Hero card ── */}
      <div className="card overflow-hidden">
        <div className={`relative h-28 bg-gradient-to-br ${meta.color} overflow-hidden`}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-black/10" />
          <div className="absolute inset-0 flex items-center px-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">{catLabel}</p>
              <h2 className="text-white text-xl font-bold truncate">{insumo.nombre}</h2>
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={insumo.estado} />
            </div>
          </div>
        </div>

        {/* Stock bar strip */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tabular-nums ${isCritic ? 'text-red-600 dark:text-red-400' : isBajo ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-stone-50'}`}>
                {insumo.stock_actual}
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">{insumo.unidad_medida}</span>
            </div>
            {(isBajo || isCritic) && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isCritic
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}>
                <AlertTriangle className="h-3 w-3" />
                {isCritic ? 'Sin existencias' : `Bajo el mínimo (${insumo.stock_minimo})`}
              </div>
            )}
          </div>
          <StockBar actual={insumo.stock_actual} minimo={insumo.stock_minimo} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Stock actual"
          value={insumo.stock_actual}
          sub={insumo.unidad_medida}
          colorClass={isCritic ? 'text-red-600 dark:text-red-400' : isBajo ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-500'}
          bgClass={isBajo ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}
        />
        <StatCard
          label="Stock mínimo"
          value={insumo.stock_minimo}
          sub={insumo.unidad_medida}
        />
        <StatCard
          label="Total entradas"
          value={totalEntradas}
          sub={insumo.unidad_medida}
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label="Total salidas"
          value={totalSalidas}
          sub={insumo.unidad_medida}
          colorClass="text-red-500 dark:text-red-400"
          bgClass="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      {/* ── Historial ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-stone-500 dark:text-stone-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Historial de movimientos</h3>
            <p className="text-xs text-stone-400 dark:text-stone-500">{(movimientos || []).length} registros</p>
          </div>
        </div>

        {(movimientos || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-3">
              <Boxes className="h-7 w-7 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Sin movimientos registrados</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Las entradas y salidas de este insumo aparecerán aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/60">
                  {['Fecha', 'Tipo', 'Cantidad', 'Destino / Proveedor', 'Registrado por'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {movimientos.map(m => {
                  const isEntrada = m.tipo === 'entrada'
                  return (
                    <tr key={m.id} className={`group transition-colors ${
                      isEntrada
                        ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                        : 'hover:bg-red-50/50 dark:hover:bg-red-900/10'
                    }`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                          <span className="text-stone-700 dark:text-stone-300">{formatDate(m.fecha)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isEntrada
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {isEntrada
                            ? <ArrowDownCircle className="h-3 w-3" />
                            : <ArrowUpCircle   className="h-3 w-3" />
                          }
                          {isEntrada ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold tabular-nums ${isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isEntrada ? '+' : '-'}{m.cantidad}
                        </span>
                        <span className="text-stone-400 dark:text-stone-500 ml-1 text-xs">{insumo.unidad_medida}</span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400 max-w-[200px] truncate">
                        {m.destino_proveedor || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                          <User className="h-3 w-3 flex-shrink-0" />
                          {m.registrado?.nombre_completo || '—'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
