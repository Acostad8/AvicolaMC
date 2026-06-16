import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useAutoRefreshAtMidnight } from '../../../hooks/useAutoRefreshAtMidnight'
import { useA11y } from '../../../context/AccessibilityContext'
import { useConfig } from '../../../context/ConfigContext'
import { formatDate, formatNumber, calcWeeksAge, TIPOS_TRATAMIENTO } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ui/Modal'
import { Skeleton } from '../../../components/ui/Skeleton'
import AuditHistorial from '../../../components/ui/AuditHistorial'
import toast from 'react-hot-toast'
import {
  CheckCircle, PauseCircle, Layers, Bird, Building2,
  Calendar, TrendingDown, Activity, Clock, AlertTriangle,
  CheckCircle2, Info, Pencil, PlayCircle, Hash,
  Egg, FlaskConical, Eye,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ── Animated counter ── */
function useCountUp(target, enabled) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!enabled || !target) return
    let v = 0
    const step = target / 40
    const id = setInterval(() => {
      v = Math.min(v + step, target)
      setValue(Math.floor(v))
      if (v >= target) clearInterval(id)
    }, 20)
    return () => clearInterval(id)
  }, [target, enabled])
  return value
}

/* ── Survival gauge ── */
function SurvivalGauge({ actual, inicial, noMotion }) {
  const pct   = inicial > 0 ? Math.min((actual / inicial) * 100, 100) : 0
  const bajas = inicial - actual
  const color = pct >= 95 ? 'from-emerald-400 to-emerald-500'
    : pct >= 85 ? 'from-amber-400 to-amber-500'
    : 'from-red-400 to-red-500'
  const textColor = pct >= 95 ? 'text-emerald-600 dark:text-emerald-400'
    : pct >= 85 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  const [animated, setAnimated] = useState(noMotion)
  useEffect(() => {
    if (noMotion) return
    const id = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(id)
  }, [noMotion])

  const count = useCountUp(Math.round(pct * 10) / 10, animated)

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Aves actuales</p>
          <p className="text-3xl font-black text-stone-900 dark:text-stone-50 tabular-nums leading-none">{formatNumber(actual)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-500 dark:text-stone-400">Bajas acumuladas</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 tabular-nums">{formatNumber(bajas)}</p>
        </div>
      </div>
      <div className="relative h-6 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
          style={{ width: animated ? `${pct}%` : '0%' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-black mix-blend-luminosity ${pct > 40 ? 'text-white' : textColor}`}>
            {animated ? count : 0}% supervivencia
          </span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-stone-400 dark:text-stone-500">
        <span>0 aves</span>
        <span className="font-medium text-stone-600 dark:text-stone-300">{formatNumber(inicial)} iniciales</span>
      </div>
    </div>
  )
}

/* ── Timeline step ── */
function TimelineStep({ icon: Icon, label, date, active, done, color, isLast, noMotion }) {
  const accentClass = color.includes('amber') || color.includes('yellow')
    ? 'ring-amber-400 text-amber-500'
    : color.includes('blue')
    ? 'ring-blue-400 text-blue-500'
    : 'ring-emerald-400 text-emerald-500'

  const pingBg = color.includes('amber') || color.includes('yellow') ? 'bg-amber-400'
    : color.includes('blue') ? 'bg-blue-400'
    : 'bg-emerald-400'

  return (
    <div className={`relative flex items-start gap-3 ${!isLast ? 'pb-7' : ''}`}>
      {/* Connector — starts below the circle, never overlaps it */}
      {!isLast && (
        <div
          className="absolute left-[17px] top-9 bottom-0 w-0.5 bg-stone-200 dark:bg-stone-700"
          aria-hidden="true"
        />
      )}
      {/* Circle — always above the connector */}
      <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-2 transition-all
        ${done
          ? `bg-gradient-to-br ${color} ring-white dark:ring-stone-900 shadow-md`
          : active
          ? `bg-white dark:bg-stone-900 ${accentClass}`
          : 'bg-stone-100 dark:bg-stone-800 ring-stone-200 dark:ring-stone-700 opacity-50'}`}>
        {active && !noMotion && (
          <span className={`absolute inset-0 rounded-full animate-ping opacity-25 ${pingBg}`} />
        )}
        <Icon className={`relative h-4 w-4 ${done ? 'text-white' : active ? '' : 'text-stone-400 dark:text-stone-600'}`} aria-hidden="true" />
      </div>
      {/* Text */}
      <div className={`pt-0.5 ${!active && !done ? 'opacity-40' : ''}`}>
        <p className={`text-sm font-semibold leading-tight ${
          active ? 'text-stone-900 dark:text-stone-50'
          : done  ? 'text-stone-700 dark:text-stone-200'
          : 'text-stone-400 dark:text-stone-600'}`}>
          {label}
        </p>
        {date && <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{date}</p>}
      </div>
    </div>
  )
}

/* ── Stat card ── */
function StatCard({ label, value, icon: Icon, color, gradient, delay, noMotion }) {
  return (
    <div
      className="card p-4 flex items-center gap-4"
      style={noMotion ? undefined : { animation: `fadeInUp 0.45s ease-out ${delay}ms both` }}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient}`}>
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{label}</p>
        <p className={`text-xl font-black tabular-nums leading-tight ${color}`}>{value}</p>
      </div>
    </div>
  )
}

/* ── Historial de cambios ── */
function formatearCambios(ant, nue) {
  if (!ant || !nue) return []
  const ESTADO_LABELS = { activo: 'Activo', finalizado: 'Finalizado', suspendido: 'Suspendido' }
  const campos = [
    { key: 'nombre_numero',         label: 'Nombre' },
    { key: 'estado',                label: 'Estado' },
    { key: 'fecha_ingreso',         label: 'Fecha de ingreso' },
    { key: 'fecha_salida',          label: 'Fecha de salida' },
    { key: 'cantidad_inicial_aves', label: 'Aves iniciales' },
    { key: 'raza_id',               label: 'Raza' },
    { key: 'galpon_id',             label: 'Galpón' },
    { key: 'notas',                 label: 'Notas' },
  ]
  return campos.reduce((acc, c) => {
    const a = ant[c.key]; const n = nue[c.key]
    if (String(a ?? '') !== String(n ?? '')) {
      let va = a ?? '—'; let vn = n ?? '—'
      if (c.key === 'estado') { va = ESTADO_LABELS[a] || a || '—'; vn = ESTADO_LABELS[n] || n || '—' }
      if (c.key === 'raza_id' || c.key === 'galpon_id') { va = a ? 'Asignado' : '—'; vn = n ? 'Asignado' : '—' }
      if (c.key === 'cantidad_inicial_aves') { va = a != null ? Number(a).toLocaleString('es-CO') : '—'; vn = n != null ? Number(n).toLocaleString('es-CO') : '—' }
      if (c.key === 'fecha_ingreso' || c.key === 'fecha_salida') { va = a ? formatDate(a) : '—'; vn = n ? formatDate(n) : '—' }
      acc.push({ campo: c.label, anterior: va, nuevo: vn })
    }
    return acc
  }, [])
}

/* ── Detail item ── */
function Detail({ label, value, accent }) {
  return (
    <div className="space-y-1">
      <p className="detail-label">{label}</p>
      <p className={`detail-value ${accent || ''}`}>{value ?? '—'}</p>
    </div>
  )
}

/* ── Badge de postura (usa umbrales del config) ── */
function PosturaBadgeLote({ pct, exc, bue, reg }) {
  const n   = parseFloat(pct) || 0
  const cls = n >= exc ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    : n >= bue ? 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
    : n >= reg ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
    : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{n.toFixed(1)}%</span>
}

/* ── Header de sección reutilizable ── */
function SeccionHeader({ icon: Icon, gradient, title, count }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
      <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <h2 className="section-title">{title}</h2>
      {count !== undefined && (
        <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">{count} registros</span>
      )}
    </div>
  )
}

/* ── Sección: Producción ── */
function SeccionProduccion({ registros, config, dark }) {
  const { postura_excelente: exc, postura_buena: bue, postura_regular: reg } = config.produccion
  const gridColor    = dark ? '#292524' : '#f5f5f4'
  const axisColor    = dark ? '#78716c' : '#a8a29e'
  const tooltipStyle = { backgroundColor: dark ? '#1c1917' : '#fff', border: `1px solid ${dark ? '#292524' : '#e7e5e4'}`, borderRadius: '12px', fontSize: '11px', color: dark ? '#f5f5f4' : '#1c1917' }

  const totalHuevos = registros.reduce((s, r) => s + (r.huevos_producidos || 0), 0)
  const avgDiario   = registros.length > 0 ? Math.round(totalHuevos / registros.length) : 0
  const mejorDia    = registros.reduce((b, r) => (r.huevos_producidos || 0) > (b?.huevos_producidos || 0) ? r : b, null)
  const chartData   = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-30)
    .map(r => ({ fecha: r.fecha.slice(5), huevos: r.huevos_producidos }))
  const ultimos = registros.slice(0, 10)

  return (
    <div className="card p-5 space-y-5">
      <SeccionHeader icon={Egg} gradient="from-amber-400 to-amber-600" title="Producción del lote" count={registros.length} />

      {registros.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-6">No hay registros de producción para este lote.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total huevos',  value: formatNumber(totalHuevos) },
              { label: 'Promedio/día',  value: formatNumber(avgDiario) },
              { label: 'Mejor día',     value: mejorDia ? formatNumber(mejorDia.huevos_producidos) : '—', sub: mejorDia ? formatDate(mejorDia.fecha) : undefined },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-1">{value}</p>
                {sub && <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          {chartData.length > 1 && (
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Tendencia — últimos {chartData.length} registros</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradProdLote" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="huevos" stroke="#d97706" strokeWidth={2} fill="url(#gradProdLote)" dot={false} activeDot={{ r: 4, fill: '#d97706' }} name="Huevos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800">
                <tr>
                  {['Fecha', 'Huevos', '% Postura', 'Alimento', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                {ultimos.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{formatDate(r.fecha)}</td>
                    <td className="px-3 py-2 font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatNumber(r.huevos_producidos)}</td>
                    <td className="px-3 py-2">
                      {r.porcentaje_postura != null
                        ? <PosturaBadgeLote pct={r.porcentaje_postura} exc={exc} bue={bue} reg={reg} />
                        : <span className="text-stone-400 dark:text-stone-600">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400 tabular-nums whitespace-nowrap">
                      {r.consumo_alimento_kg != null ? `${r.consumo_alimento_kg} kg` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Link to={`/dashboard/produccion/${r.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" />Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {registros.length > 10 && (
              <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-2 border-t border-stone-50 dark:border-stone-800">
                Mostrando los 10 más recientes de {registros.length} totales
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Sección: Tratamientos ── */
function SeccionTratamientos({ tratamientos }) {
  return (
    <div className="card p-5 space-y-4">
      <SeccionHeader icon={FlaskConical} gradient="from-violet-400 to-violet-600" title="Tratamientos del lote" count={tratamientos.length} />

      {tratamientos.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-6">No hay tratamientos registrados para este lote.</p>
      ) : (
        <div className="space-y-2">
          {tratamientos.map(t => {
            const tipoLabel = TIPOS_TRATAMIENTO.find(x => x.value === t.tipo)?.label || t.tipo
            const activo    = t.estado === 'activo'
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-colors ${
                  activo
                    ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/50'
                    : 'bg-stone-50 dark:bg-stone-800/40 border-stone-100 dark:border-stone-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-tight">{tipoLabel}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      activo
                        ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                    }`}>
                      {activo ? 'En curso' : 'Finalizado'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                    {t.nombre_producto}{t.responsable && ` · ${t.responsable}`}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    {formatDate(t.fecha_inicio)}{t.fecha_fin ? ` → ${formatDate(t.fecha_fin)}` : ' → En curso'}
                  </p>
                </div>
                <Link to={`/dashboard/tratamientos/${t.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 flex-shrink-0">
                  <Eye className="h-3 w-3" />Ver
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Sección: Mortalidad ── */
function SeccionMortalidad({ registros, config, loteInicial, dark }) {
  const umbralPct = config.produccion?.alerta_mortalidad ?? 5
  const umbralAbs = loteInicial > 0 ? Math.ceil(loteInicial * umbralPct / 100) : Infinity
  const gridColor    = dark ? '#292524' : '#f5f5f4'
  const axisColor    = dark ? '#78716c' : '#a8a29e'
  const tooltipStyle = { backgroundColor: dark ? '#1c1917' : '#fff', border: `1px solid ${dark ? '#292524' : '#e7e5e4'}`, borderRadius: '12px', fontSize: '11px', color: dark ? '#f5f5f4' : '#1c1917' }

  const chartData = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-30)
    .map(r => ({ fecha: r.fecha.slice(5), bajas: r.cantidad_bajas || 0, supera: (r.cantidad_bajas || 0) >= umbralAbs }))
  const ultimos = registros.slice(0, 10)

  return (
    <div className="card p-5 space-y-5">
      <SeccionHeader icon={TrendingDown} gradient="from-red-400 to-red-600" title="Mortalidad del lote" count={registros.length} />

      {registros.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-6">No hay registros de mortalidad para este lote.</p>
      ) : (
        <>
          {chartData.length > 1 && (
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                Bajas diarias — últimos {chartData.length} registros · umbral: {umbralAbs} aves/día ({umbralPct}%)
              </p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={chartData} barSize={Math.max(4, Math.floor(260 / chartData.length))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [v, 'Bajas']} />
                  <Bar dataKey="bajas" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.supera ? '#ef4444' : '#10b981'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1.5">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500 opacity-85" /><span className="text-[10px] text-stone-400 dark:text-stone-500">Normal</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-500 opacity-85" /><span className="text-[10px] text-stone-400 dark:text-stone-500">Supera umbral ({umbralPct}%)</span></div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800">
                <tr>
                  {['Fecha', 'Bajas', 'Causa', 'Observaciones'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                {ultimos.map(r => {
                  const supera = (r.cantidad_bajas || 0) >= umbralAbs
                  return (
                    <tr key={r.id} className={`transition-colors ${supera ? 'bg-red-50/60 dark:bg-red-950/10' : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'}`}>
                      <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{formatDate(r.fecha)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`font-bold tabular-nums ${supera ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'}`}>
                          {r.cantidad_bajas}
                        </span>
                        {supera && <span className="ml-1.5 text-[10px] font-semibold text-red-500">▲ umbral</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-stone-600 dark:text-stone-400">{r.causa || '—'}</td>
                      <td className="px-3 py-2 text-xs text-stone-400 dark:text-stone-500 max-w-[160px] truncate">{r.observaciones || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {registros.length > 10 && (
              <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-2 border-t border-stone-50 dark:border-stone-800">
                Mostrando los 10 más recientes de {registros.length} totales
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function LoteDetalle() {
  useAutoRefreshAtMidnight()
  const { id }     = useParams()
  const { isAdmin } = useAuth()
  const { noMotion, dark } = useA11y()
  const { config } = useConfig()
  const qc         = useQueryClient()
  const [confirmAction, setConfirmAction] = useState(null)

  const { data: lote, isLoading } = useQuery({
    queryKey: ['lote', id],
    queryFn: async () => {
      const { data } = await supabase.from('lotes')
        .select(`*, galpon:galpones(nombre, capacidad_maxima), raza:razas(nombre, tipo)`)
        .eq('id', id).single()
      return data
    },
  })

  const { data: produccionLote } = useQuery({
    queryKey: ['lote-produccion', id],
    queryFn: async () => {
      const { data } = await supabase.from('produccion')
        .select('id, fecha, huevos_producidos, porcentaje_postura, consumo_alimento_kg, observaciones')
        .eq('lote_id', id)
        .order('fecha', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  const { data: tratamientosLote } = useQuery({
    queryKey: ['lote-tratamientos', id],
    queryFn: async () => {
      const { data } = await supabase.from('tratamientos')
        .select('id, fecha_inicio, fecha_fin, tipo, nombre_producto, responsable, estado')
        .eq('lote_id', id)
        .order('fecha_inicio', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  const { data: mortalidadLote } = useQuery({
    queryKey: ['lote-mortalidad', id],
    queryFn: async () => {
      const { data } = await supabase.from('mortalidad')
        .select('id, fecha, cantidad_bajas, causa, observaciones')
        .eq('lote_id', id)
        .order('fecha', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  const fcrData = useMemo(() => {
    if (!produccionLote?.length) return null
    const totalHuevos   = produccionLote.reduce((s, r) => s + (r.huevos_producidos   || 0), 0)
    const totalAlimento = produccionLote.reduce((s, r) => s + (r.consumo_alimento_kg || 0), 0)
    if (totalAlimento === 0 || totalHuevos === 0) return null
    const pesoHuevoKg = (config.produccion?.peso_promedio_huevo_g ?? 60) / 1000
    const fcr = totalAlimento / (totalHuevos * pesoHuevoKg)
    return { fcr: fcr.toFixed(2), totalHuevos, totalAlimento: totalAlimento.toFixed(1) }
  }, [produccionLote, config.produccion?.peso_promedio_huevo_g])

  const { data: historial, isLoading: historialLoading } = useQuery({
    queryKey: ['lote-historial', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria')
        .select('id, usuario_nombre, datos_anteriores, datos_nuevos, created_at')
        .eq('tabla', 'lotes')
        .eq('registro_id', id)
        .eq('operacion', 'UPDATE')
        .order('created_at', { ascending: false })
        .limit(30)
      return (data || []).map(e => ({
        ...e,
        editado:    { nombre_completo: e.usuario_nombre },
        editado_at: e.created_at,
      }))
    },
  })

  const mutation = useMutation({
    mutationFn: async (nuevoEstado) => {
      const { error } = await supabase.from('lotes').update({
        estado: nuevoEstado,
        fecha_salida: nuevoEstado === 'finalizado' ? new Date().toISOString().slice(0, 10) : lote.fecha_salida,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, nuevoEstado) => {
      qc.invalidateQueries({ queryKey: ['lote', id] })
      qc.invalidateQueries({ queryKey: ['lotes'] })
      toast.success(
        nuevoEstado === 'finalizado' ? 'Lote finalizado correctamente'
        : nuevoEstado === 'activo'   ? 'Lote reactivado correctamente'
        : 'Lote suspendido'
      )
      setConfirmAction(null)
    },
    onError: e => toast.error(e.message || 'Error al actualizar'),
  })

  if (isLoading) return (
    <div className="w-full space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-6 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </div>
      </div>
    </div>
  )

  if (!lote) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Lote no encontrado.</p>
    </div>
  )

  const esActivo     = lote.estado === 'activo'
  const esSuspendido = lote.estado === 'suspendido'
  const esFinalizado = lote.estado === 'finalizado'
  const semanas      = esActivo ? calcWeeksAge(lote.fecha_ingreso) : null
  const bajas        = (lote.cantidad_inicial_aves || 0) - (lote.cantidad_aves_actuales || 0)

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={`Lote ${lote.nombre_numero}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lotes', href: '/dashboard/lotes' },
          { label: lote.nombre_numero },
        ]}
        actions={isAdmin && (esActivo || esSuspendido) && (
          <div className="flex gap-2 flex-wrap">
            <Link to={`/dashboard/lotes/${id}/editar`}>
              <Button variant="" size="sm" icon={Pencil}
                className="border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25"
              >Editar</Button>
            </Link>
            {esActivo && (
              <Button variant="" size="sm" icon={PauseCircle}
                className="border border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/25"
                onClick={() => setConfirmAction('suspendido')}
              >Suspender</Button>
            )}
            {esSuspendido && (
              <Button variant="" size="sm" icon={PlayCircle}
                className="border border-green-500 dark:border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/25"
                onClick={() => setConfirmAction('activo')}
              >Reactivar</Button>
            )}
            <Button variant="danger" size="sm" icon={CheckCircle} onClick={() => setConfirmAction('finalizado')}>
              Finalizar lote
            </Button>
          </div>
        )}
      />

      {/* Banner de estado */}
      {(esSuspendido || esFinalizado) && (
        <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 border text-sm
          ${esSuspendido
            ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-300'
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'}`}>
          {esSuspendido ? <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />}
          <p>
            {esSuspendido
              ? 'Este lote está suspendido. No se pueden registrar producción, mortalidad ni tratamientos.'
              : 'Este lote ha finalizado su ciclo productivo. El historial completo se mantiene disponible.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Hero card */}
          <div
            className="card overflow-hidden"
            style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out both' }}
          >
            <div className={`h-1.5 w-full ${esActivo ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : esSuspendido ? 'bg-gradient-to-r from-yellow-400 to-amber-400' : 'bg-stone-200 dark:bg-stone-700'}`} />
            <div className="p-6">
              {/* Identity */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                    ${esActivo ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25' : 'bg-stone-100 dark:bg-stone-800'}`}>
                    <Layers className={`h-7 w-7 ${esActivo ? 'text-white' : 'text-stone-400 dark:text-stone-500'}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-stone-900 dark:text-stone-50">{lote.nombre_numero}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge status={lote.estado} />
                      {lote.raza?.nombre && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                          <Bird className="h-3 w-3" aria-hidden="true" />{lote.raza.nombre}
                        </span>
                      )}
                      {esActivo && semanas && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                          <Clock className="h-3 w-3" aria-hidden="true" />{semanas} semanas
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 flex-shrink-0 bg-stone-50 dark:bg-stone-800 rounded-lg px-3 py-1.5">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {lote.galpon?.nombre}
                </div>
              </div>

              {/* Survival gauge */}
              <SurvivalGauge
                actual={lote.cantidad_aves_actuales}
                inicial={lote.cantidad_inicial_aves}
                noMotion={noMotion}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Aves iniciales"  value={formatNumber(lote.cantidad_inicial_aves)}  icon={Bird}         color="text-blue-600 dark:text-blue-400"   gradient="from-blue-400 to-blue-600"      delay={80}  noMotion={noMotion} />
            <StatCard label="Aves actuales"   value={formatNumber(lote.cantidad_aves_actuales)} icon={Activity}     color="text-emerald-600 dark:text-emerald-400" gradient="from-emerald-400 to-emerald-600" delay={150} noMotion={noMotion} />
            <StatCard label="Bajas totales"   value={formatNumber(bajas)}                        icon={TrendingDown} color="text-red-600 dark:text-red-400"     gradient="from-red-400 to-red-600"        delay={220} noMotion={noMotion} />
            <StatCard label="Cap. del galpón" value={formatNumber(lote.galpon?.capacidad_maxima)} icon={Building2}   color="text-stone-700 dark:text-stone-200"  gradient="from-stone-400 to-stone-600"    delay={290} noMotion={noMotion} />
          </div>

          {/* Info del lote */}
          <div
            className="card p-5"
            style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out 200ms both' }}
          >
            <h2 className="section-title mb-4">Información del lote</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Detail label="Fecha de ingreso" value={formatDate(lote.fecha_ingreso)} />
              <Detail label="Fecha de salida"  value={lote.fecha_salida ? formatDate(lote.fecha_salida) : '—'} />
              <Detail label="Semanas de vida"  value={esActivo ? `${semanas} sem.` : '—'} accent="text-emerald-600 dark:text-emerald-400" />
              <Detail label="Galpón"           value={lote.galpon?.nombre} />
              <Detail label="Raza"             value={lote.raza?.nombre || '—'} />
              <Detail label="Tipo"             value={lote.raza?.tipo === 'ponedoras' ? 'Ponedoras' : lote.raza?.tipo === 'engorde' ? 'Engorde' : '—'} />
            </div>
            {lote.notas && (
              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                <p className="detail-label mb-1.5">Notas</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">{lote.notas}</p>
              </div>
            )}
          </div>

          {/* Producción del lote */}
          <SeccionProduccion
            registros={produccionLote || []}
            config={config}
            dark={dark}
          />

          {/* Tratamientos del lote */}
          <SeccionTratamientos tratamientos={tratamientosLote || []} />

          {/* Mortalidad del lote */}
          <SeccionMortalidad
            registros={mortalidadLote || []}
            config={config}
            loteInicial={lote.cantidad_inicial_aves || 0}
            dark={dark}
          />

          {/* Historial de cambios */}
          <div
            className="card p-5"
            style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out 280ms both' }}
          >
            <AuditHistorial
              entries={historial}
              loading={historialLoading}
              formatCambios={formatearCambios}
              emptyMessage="Este lote no ha sido editado desde su creación."
            />
          </div>
        </div>

        {/* ── Columna derecha (1/3) ── */}
        <div className="space-y-5">

          {/* Ciclo / Timeline */}
          <div
            className="card p-5"
            style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out 320ms both' }}
          >
            <h2 className="section-title mb-5"> </h2>
            <div>
              <TimelineStep
                icon={CheckCircle2} label="Ingreso al galpón"
                date={formatDate(lote.fecha_ingreso)}
                done active={false} color="from-emerald-400 to-emerald-600"
                isLast={false} noMotion={noMotion}
              />
              {esSuspendido && (
                <TimelineStep
                  icon={PauseCircle} label="Lote suspendido"
                  date="En curso"
                  active done={false} color="from-yellow-400 to-amber-500"
                  isLast={false} noMotion={noMotion}
                />
              )}
              {esFinalizado
                ? <TimelineStep
                    icon={CheckCircle} label="Lote finalizado"
                    date={formatDate(lote.fecha_salida)}
                    done active={false} color="from-blue-400 to-blue-600"
                    isLast noMotion={noMotion}
                  />
                : <TimelineStep
                    icon={CheckCircle} label="Finalización"
                    date="Pendiente"
                    done={false} active={false} color="from-blue-400 to-blue-600"
                    isLast noMotion={noMotion}
                  />
              }
            </div>
          </div>

          {/* Resumen rápido */}
          <div
            className="card p-5 space-y-4"
            style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out 400ms both' }}
          >
            <h2 className="section-title">Resumen</h2>
            <div className="space-y-3">
              {[
                { label: 'Supervivencia', value: lote.cantidad_inicial_aves > 0 ? `${((lote.cantidad_aves_actuales / lote.cantidad_inicial_aves) * 100).toFixed(1)}%` : '—', color: lote.cantidad_aves_actuales / lote.cantidad_inicial_aves >= 0.95 ? 'text-emerald-600 dark:text-emerald-400' : lote.cantidad_aves_actuales / lote.cantidad_inicial_aves >= 0.85 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
                { label: 'Mortalidad',    value: lote.cantidad_inicial_aves > 0 ? `${((bajas / lote.cantidad_inicial_aves) * 100).toFixed(1)}%` : '—', color: 'text-red-600 dark:text-red-400' },
                { label: 'Días en granja', value: lote.fecha_ingreso ? `${Math.floor((Date.now() - new Date(lote.fecha_ingreso).getTime()) / 86400000)} días` : '—', color: '' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800/60 last:border-0">
                  <span className="text-xs text-stone-500 dark:text-stone-400">{label}</span>
                  <span className={`text-sm font-bold tabular-nums ${color || 'text-stone-800 dark:text-stone-100'}`}>{value}</span>
                </div>
              ))}
              {/* FCR */}
              <div className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800/60 last:border-0">
                <div>
                  <span className="text-xs text-stone-500 dark:text-stone-400">FCR del lote</span>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500">kg alimento / kg huevos</p>
                </div>
                {fcrData ? (
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${
                      parseFloat(fcrData.fcr) <= 2.5
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : parseFloat(fcrData.fcr) <= 3.0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>{fcrData.fcr}</span>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">{fcrData.totalAlimento} kg alimento</p>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-stone-400 dark:text-stone-500">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        open={confirmAction === 'finalizado'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => mutation.mutate('finalizado')}
        loading={mutation.isPending}
        title="Finalizar lote"
        message={`¿Finalizar el lote "${lote.nombre_numero}"? El galpón quedará disponible para un nuevo lote y no se podrán registrar más movimientos.`}
        confirmLabel="Sí, finalizar"
      />
      <ConfirmModal
        open={confirmAction === 'suspendido'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => mutation.mutate('suspendido')}
        loading={mutation.isPending}
        title="Suspender lote"
        message={`¿Suspender el lote "${lote.nombre_numero}"? No se podrán registrar producción ni mortalidad mientras esté suspendido.`}
        confirmLabel="Sí, suspender"
      />
      <ConfirmModal
        open={confirmAction === 'activo'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => mutation.mutate('activo')}
        loading={mutation.isPending}
        title="Reactivar lote"
        message={`¿Reactivar el lote "${lote.nombre_numero}"? Volverá a estado activo y se podrán registrar producción, mortalidad y tratamientos nuevamente.`}
        confirmLabel="Sí, reactivar"
      />
    </div>
  )
}
