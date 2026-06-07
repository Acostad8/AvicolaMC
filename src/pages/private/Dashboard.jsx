import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useA11y } from '../../context/AccessibilityContext'
import { useConfig } from '../../context/ConfigContext'
import { formatNumber, formatDate, calcWeeksAge } from '../../lib/utils'
import { useAutoRefreshAtMidnight } from '../../hooks/useAutoRefreshAtMidnight'
import {
  Building2, Egg, Skull, TrendingUp, AlertTriangle,
  Package, BarChart3, Activity, Bird, ChevronRight, Calendar,
  ArrowUp, ArrowDown, Minus, Shield, Layers, Star, Zap,
} from 'lucide-react'
import {
  ComposedChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { Skeleton } from '../../components/ui/Skeleton'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

/* ── Animated counter ── */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const n = typeof target === 'number' ? target : 0
    if (!n) { setVal(0); return }
    let start = null
    let id
    const raf = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.floor(p * n))
      if (p < 1) { id = requestAnimationFrame(raf) }
    }
    id = requestAnimationFrame(raf)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return val
}

/* ── Trend badge ── */
function TrendBadge({ current, previous, inverse = false }) {
  if (previous == null || previous === 0) return null
  const diff = current - previous
  if (diff === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-stone-400 dark:text-stone-500">
      <Minus className="h-3 w-3" /> igual
    </span>
  )
  const pct = Math.abs(Math.round((diff / previous) * 100))
  const isUp = diff > 0
  const isGood = inverse ? !isUp : isUp
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {pct}%
    </span>
  )
}

/* ── KPI card ── */
function KpiCard({ label, value, rawValue, icon: Icon, gradient, sub, trend, delay = 0, noMotion }) {
  const counted = useCountUp(typeof rawValue === 'number' ? rawValue : 0)
  const display  = typeof rawValue === 'number' ? formatNumber(counted) : value
  return (
    <div
      className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 hover:shadow-lg hover:border-stone-300 dark:hover:border-stone-700 transition-all hover:-translate-y-1"
      style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        {trend && <div className="text-right leading-none pt-1">{trend}</div>}
      </div>
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 leading-tight">{label}</p>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 tabular-nums">{display}</p>
      {sub && <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── Postura ring (SVG circular gauge) ── */
function PosturaRing({ value, isDark, size = 96 }) {
  const pct   = Math.min(Math.max(parseFloat(value) || 0, 0), 100)
  const r     = (size - 12) / 2
  const circ  = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  const color = pct >= 90 ? '#22c55e' : pct >= 75 ? '#f59e0b' : pct >= 50 ? '#eab308' : '#ef4444'
  const track = isDark ? '#292524' : '#f5f5f4'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${pct}% postura`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="8" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="15" fontWeight="bold" fill={color}>
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}

/* ── Lote health card ── */
function LoteCard({ lote, posturaConfig, delay = 0, noMotion }) {
  const { postura_excelente: exc, postura_buena: bue, postura_regular: reg } = posturaConfig
  const survPct   = lote.cantidad_inicial_aves > 0
    ? (lote.cantidad_aves_actuales / lote.cantidad_inicial_aves * 100)
    : 100
  const survColor = survPct >= 95 ? 'bg-green-500' : survPct >= 85 ? 'bg-amber-500' : 'bg-red-500'
  const p         = lote.posturaHoy
  const posturaColor = p == null
    ? 'text-stone-400 dark:text-stone-500'
    : p >= exc ? 'text-green-600 dark:text-green-400'
    : p >= bue ? 'text-amber-600 dark:text-amber-400'
    : p >= reg ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400'
  const semanas = calcWeeksAge(lote.fecha_ingreso)

  return (
    <Link
      to={`/dashboard/lotes/${lote.id}`}
      className="block bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 hover:border-stone-300 dark:hover:border-stone-700 transition-all group"
      style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {lote.nombre_numero}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{lote.galpon?.nombre}</p>
        </div>
        {lote.raza?.nombre && (
          <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
            {lote.raza.nombre}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl px-2 py-1.5 text-center">
          <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Aves</p>
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums">{formatNumber(lote.cantidad_aves_actuales)}</p>
        </div>
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl px-2 py-1.5 text-center">
          <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Semanas</p>
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums">{semanas ?? '—'}</p>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-[10px]">
          <span className="text-stone-400 dark:text-stone-500">Supervivencia</span>
          <span className="font-semibold text-stone-600 dark:text-stone-400">{survPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${survColor}`} style={{ width: `${Math.min(survPct, 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-stone-800">
        <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Postura hoy</span>
        <span className={`text-sm font-bold tabular-nums ${posturaColor}`}>
          {p != null ? `${p.toFixed(1)}%` : 'Sin registro'}
        </span>
      </div>
    </Link>
  )
}

/* ── Activity item ── */
function ActivityItem({ record, posturaConfig, delay = 0, noMotion }) {
  const { postura_excelente: exc, postura_buena: bue, postura_regular: reg } = posturaConfig
  const pct = parseFloat(record.porcentaje_postura) || 0
  const badgeCls = pct >= exc
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : pct >= bue
    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    : pct >= reg
    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  return (
    <div
      className="flex items-start gap-3 py-2.5 border-b border-stone-100 dark:border-stone-800 last:border-0"
      style={noMotion ? undefined : { animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${delay}ms` }}
    >
      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
        <Egg className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">{record.galpon?.nombre}</p>
          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${badgeCls}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
          {formatNumber(record.huevos_producidos)} huevos · {record.lote?.nombre_numero || '—'}
        </p>
        <p className="text-[10px] text-stone-300 dark:text-stone-600 mt-0.5">{formatDate(record.fecha)}</p>
      </div>
    </div>
  )
}

/* ── Quick action link ── */
function ActionLink({ to, gradient, icon: Icon, label, desc, delay = 0, noMotion }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3.5 py-3 hover:border-primary-300 dark:hover:border-primary-700/60 hover:shadow-md hover:-translate-y-0.5 transition-all"
      style={noMotion ? undefined : { animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${delay}ms` }}
    >
      <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-tight">{label}</p>
        <p className="text-[11px] text-stone-400 dark:text-stone-500">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  )
}

/* ── Alert banner (collapsible) ── */
function AlertBanner({ alertas, noMotion }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? alertas : alertas.slice(0, 2)
  return (
    <div
      className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4"
      style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out both', animationDelay: '150ms' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-white" />
        </div>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} activa{alertas.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-2">
        {visible.map((a, i) => (
          <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-xl ${
            a.type === 'stock'
              ? 'bg-red-100/70 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : 'bg-amber-100/70 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
          }`}>
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{a.msg}</span>
          </div>
        ))}
      </div>
      {alertas.length > 2 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium hover:underline"
        >
          {expanded ? 'Ver menos' : `+${alertas.length - 2} alertas más`}
        </button>
      )}
    </div>
  )
}

/* ── Mortalidad acumulada por lote ── */
function MortalidadLotePanel({ lotesConMort, noMotion }) {
  if (!lotesConMort?.length) return null
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
          <Skull className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div>
          <h2 className="section-title leading-none">Mortalidad acumulada por lote</h2>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Histórico del ciclo · bajas últimos 14 días</p>
        </div>
      </div>
      <div className="space-y-3">
        {lotesConMort.map((lote, i) => {
          const pct       = lote.pctAcumulado
          const barColor  = pct >= 10 ? 'bg-red-500' : pct >= 5 ? 'bg-amber-500' : 'bg-green-500'
          const textColor = pct >= 10
            ? 'text-red-600 dark:text-red-400'
            : pct >= 5 ? 'text-amber-600 dark:text-amber-400'
            : 'text-green-600 dark:text-green-400'
          const bgColor   = pct >= 10
            ? 'bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30'
            : pct >= 5 ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30'
            : 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30'
          const barWidth  = Math.min((pct / 20) * 100, 100)
          return (
            <div
              key={lote.id}
              className={`rounded-xl px-3 py-2.5 ${bgColor}`}
              style={noMotion ? undefined : { animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${60 + i * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">{lote.nombre_numero}</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{lote.galpon?.nombre}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold tabular-nums leading-none ${textColor}`}>{pct.toFixed(2)}%</p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 tabular-nums">
                    {lote.bajasAcumuladas.toLocaleString('es-CO')} bajas totales
                  </p>
                </div>
              </div>
              <div className="h-2 bg-white/60 dark:bg-stone-800/60 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${barWidth}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
                <span className="tabular-nums">{formatNumber(lote.cantidad_inicial_aves)} iniciales → {formatNumber(lote.cantidad_aves_actuales)} actuales</span>
                <span className={`font-semibold ${lote.bajas14d > 0 ? textColor : ''}`}>
                  {lote.bajas14d > 0 ? `${lote.bajas14d.toLocaleString('es-CO')} en 14d` : 'Sin bajas recientes'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Inventario semáforo ── */
function InsumosSemaforoPanel({ insumos, noMotion }) {
  if (!insumos?.length) return null
  const sorted   = [...insumos].sort((a, b) => {
    const nivel = i => i.stock_actual <= i.stock_minimo ? 0 : (i.stock_minimo > 0 && i.stock_actual <= i.stock_minimo * 1.5) ? 1 : 2
    return nivel(a) - nivel(b)
  })
  const criticos = sorted.filter(i => i.stock_actual <= i.stock_minimo).length
  const proximos = sorted.filter(i => i.stock_actual > i.stock_minimo && i.stock_minimo > 0 && i.stock_actual <= i.stock_minimo * 1.5).length

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <Package className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="section-title leading-none">Inventario</h2>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Semáforo de stock</p>
          </div>
        </div>
        <Link to="/dashboard/insumos" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1">
          Ver todo <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {(criticos > 0 || proximos > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {criticos > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-xs text-red-700 dark:text-red-400 font-semibold">{criticos} crítico{criticos !== 1 ? 's' : ''}</span>
            </div>
          )}
          {proximos > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{proximos} próximo{proximos !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {sorted.slice(0, 8).map((ins, i) => {
          const isCritico = ins.stock_actual <= ins.stock_minimo
          const isProximo = !isCritico && ins.stock_minimo > 0 && ins.stock_actual <= ins.stock_minimo * 1.5
          const dotColor  = isCritico ? 'bg-red-500' : isProximo ? 'bg-amber-500' : 'bg-green-500'
          const barColor  = isCritico ? 'bg-red-500 dark:bg-red-400' : isProximo ? 'bg-amber-500 dark:bg-amber-400' : 'bg-green-500 dark:bg-green-400'
          const ref       = Math.max(ins.stock_minimo > 0 ? ins.stock_minimo * 3 : 1, ins.stock_actual, 1)
          const pctBar    = Math.min((ins.stock_actual / ref) * 100, 100)
          return (
            <div
              key={ins.nombre}
              className="flex items-center gap-2.5 py-1.5 border-b border-stone-100 dark:border-stone-800 last:border-0"
              style={noMotion ? undefined : { animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${50 + i * 35}ms` }}
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate leading-tight">{ins.nombre}</p>
                <div className="h-1 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden mt-1">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pctBar}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0 min-w-[40px]">
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 tabular-nums leading-tight">{ins.stock_actual}</p>
                {ins.stock_minimo > 0 && (
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">mín {ins.stock_minimo}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Mini analytics bar ── */
function AnalyticsBar({ kpis, posturaConfig, noMotion }) {
  const umbralMort  = posturaConfig?.alerta_mortalidad ?? 5
  const mortOk      = parseFloat(kpis?.mortPct14d ?? 0) < umbralMort
  const pesoHuevoKg = (posturaConfig?.peso_promedio_huevo_g ?? 60) / 1000
  const fcr14d      = (kpis?.totalAlimento14d > 0 && kpis?.totalHuevos14d > 0)
    ? (kpis.totalAlimento14d / (kpis.totalHuevos14d * pesoHuevoKg)).toFixed(2)
    : null
  const fcrOk = fcr14d != null ? parseFloat(fcr14d) <= 2.5 : null
  const fcrWarn = fcr14d != null ? parseFloat(fcr14d) <= 3.0 : null

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      style={noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out both', animationDelay: '340ms' }}
    >
      {[
        {
          label: 'Bajas (14d)',
          value: formatNumber(kpis?.bajasTotal14d ?? 0),
          sub: 'acumuladas',
          dot: null,
          icon: Skull,
          gradient: 'from-red-400 to-red-600',
        },
        {
          label: 'Mort. (14d)',
          value: `${kpis?.mortPct14d ?? '0.00'}%`,
          sub: mortOk ? 'Dentro del umbral' : `Umbral: ${umbralMort}%`,
          dot: mortOk ? 'bg-green-500' : 'bg-red-500',
          icon: Activity,
          gradient: mortOk ? 'from-green-400 to-green-600' : 'from-red-400 to-red-600',
        },
        {
          label: 'Postura media 14d',
          value: `${kpis?.posturaMedia14d ?? '0.0'}%`,
          sub: `Obj: ${posturaConfig?.postura_excelente ?? 90}%`,
          dot: parseFloat(kpis?.posturaMedia14d ?? 0) >= (posturaConfig?.postura_excelente ?? 90)
            ? 'bg-green-500'
            : parseFloat(kpis?.posturaMedia14d ?? 0) >= (posturaConfig?.postura_buena ?? 75)
            ? 'bg-amber-500'
            : 'bg-red-500',
          icon: TrendingUp,
          gradient: 'from-violet-400 to-violet-600',
        },
        {
          label: 'Supervivencia',
          value: `${kpis?.supervivenciaMedia ?? '100.0'}%`,
          sub: 'promedio lotes activos',
          dot: parseFloat(kpis?.supervivenciaMedia ?? 100) >= 95 ? 'bg-green-500' : parseFloat(kpis?.supervivenciaMedia ?? 100) >= 85 ? 'bg-amber-500' : 'bg-red-500',
          icon: Bird,
          gradient: 'from-emerald-400 to-emerald-600',
        },
        {
          label: 'FCR (14d)',
          value: fcr14d ?? '—',
          sub: fcr14d ? (fcrOk ? 'Óptimo (≤ 2.5)' : fcrWarn ? 'Aceptable (≤ 3.0)' : 'Alto (> 3.0)') : 'Sin datos de alimento',
          dot: fcr14d ? (fcrOk ? 'bg-green-500' : fcrWarn ? 'bg-amber-500' : 'bg-red-500') : null,
          icon: Zap,
          gradient: fcrOk ? 'from-teal-400 to-teal-600' : fcrWarn ? 'from-amber-400 to-amber-600' : fcr14d ? 'from-red-400 to-red-600' : 'from-stone-400 to-stone-600',
        },
      ].map(({ label, value, sub, dot, icon: Icon, gradient }) => (
        <div key={label} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 flex items-center gap-3">
          <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide leading-tight">{label}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {dot && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 tabular-nums">{value}</p>
            </div>
            {sub && <p className="text-[10px] text-stone-400 dark:text-stone-500">{sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
══════════════════════════════════════════════════ */
export default function Dashboard() {
  useAutoRefreshAtMidnight()

  const { isAdmin, perfil }  = useAuth()
  const { dark, noMotion }   = useA11y()
  const { config }           = useConfig()
  const posturaConfig        = config.produccion
  const today                = format(new Date(), 'yyyy-MM-dd')

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = perfil?.nombre_completo?.split(' ')[0] || 'Usuario'

  const gridColor    = dark ? '#292524' : '#f5f5f4'
  const axisColor    = dark ? '#78716c' : '#a8a29e'
  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#fff',
    border: `1px solid ${dark ? '#292524' : '#e7e5e4'}`,
    borderRadius: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
    fontSize: '11px',
    boxShadow: '0 4px 24px -4px rgba(0,0,0,0.15)',
  }

  /* ── Data ── */
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-v2', isAdmin, perfil?.id, today],
    enabled:  !!perfil,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      /* 1. Galpones */
      let galQ = supabase.from('galpones').select('id, nombre').eq('estado', 'en_produccion')
      if (!isAdmin) galQ = galQ.eq('encargado_id', perfil.id)
      const { data: galpones } = await galQ
      const galponIds = (galpones || []).map(g => g.id)

      if (galponIds.length === 0) {
        return {
          kpis: { galpones: 0, lotes: 0, aves: 0, huevosHoy: 0, huevosAyer: 0, bajasHoy: 0, bajasAyer: 0, postura: '0.0', posturaAyer: '0.0', semanaHuevos: 0, bajasTotal14d: 0, mortPct14d: '0.00', posturaMedia14d: '0.0', supervivenciaMedia: '100.0' },
          chartData: [], loteHealth: [], recientes: [], alertas: [],
          mortalidadPorLote: [], insumos: [],
        }
      }

      const ayer   = format(subDays(new Date(), 1),  'yyyy-MM-dd')
      const desde14 = format(subDays(new Date(), 13), 'yyyy-MM-dd')
      const desde7  = format(subDays(new Date(), 6),  'yyyy-MM-dd')

      /* 2. Todas las consultas en paralelo */
      const [
        { data: lotes },
        { data: prodHoy },
        { data: prodAyer },
        { data: mortHoy },
        { data: mortAyer },
        { data: prod14d },
        { data: mort14d },
        { data: recientes },
        insumosRes,
      ] = await Promise.all([
        supabase.from('lotes')
          .select('id, nombre_numero, cantidad_inicial_aves, cantidad_aves_actuales, fecha_ingreso, galpon:galpones(nombre), raza:razas(nombre)')
          .in('galpon_id', galponIds).eq('estado', 'activo'),

        supabase.from('produccion')
          .select('galpon_id, lote_id, huevos_producidos, porcentaje_postura')
          .in('galpon_id', galponIds).eq('fecha', today),

        supabase.from('produccion')
          .select('galpon_id, huevos_producidos')
          .in('galpon_id', galponIds).eq('fecha', ayer),

        supabase.from('mortalidad')
          .select('galpon_id, cantidad_bajas')
          .in('galpon_id', galponIds).eq('fecha', today),

        supabase.from('mortalidad')
          .select('galpon_id, cantidad_bajas')
          .in('galpon_id', galponIds).eq('fecha', ayer),

        supabase.from('produccion')
          .select('fecha, huevos_producidos, porcentaje_postura, consumo_alimento_kg')
          .in('galpon_id', galponIds).gte('fecha', desde14).order('fecha'),

        supabase.from('mortalidad')
          .select('fecha, cantidad_bajas, lote_id')
          .in('galpon_id', galponIds).gte('fecha', desde14),

        supabase.from('produccion')
          .select('id, fecha, huevos_producidos, porcentaje_postura, galpon:galpones(nombre), lote:lotes(nombre_numero)')
          .in('galpon_id', galponIds).order('fecha', { ascending: false }).limit(8),

        isAdmin
          ? supabase.from('insumos').select('nombre, stock_actual, stock_minimo').eq('estado', 'activo')
          : Promise.resolve({ data: null }),
      ])

      /* 3. KPIs */
      const aves        = (lotes || []).reduce((s, l) => s + (l.cantidad_aves_actuales || 0), 0)
      const huevosHoy   = (prodHoy  || []).reduce((s, p) => s + (p.huevos_producidos  || 0), 0)
      const huevosAyer  = (prodAyer || []).reduce((s, p) => s + (p.huevos_producidos  || 0), 0)
      const bajasHoy    = (mortHoy  || []).reduce((s, m) => s + (m.cantidad_bajas     || 0), 0)
      const bajasAyer   = (mortAyer || []).reduce((s, m) => s + (m.cantidad_bajas     || 0), 0)
      const postura     = aves > 0 ? ((huevosHoy  / aves) * 100).toFixed(1) : '0.0'
      const posturaAyer = aves > 0 ? ((huevosAyer / aves) * 100).toFixed(1) : '0.0'
      const semanaHuevos = (prod14d || [])
        .filter(p => p.fecha >= desde7)
        .reduce((s, p) => s + (p.huevos_producidos || 0), 0)

      /* 4. Chart data — 14 días */
      const days14 = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'))
      const chartData = days14.map(date => {
        const dayProd = (prod14d || []).filter(p => p.fecha === date)
        const avg = dayProd.length
          ? (dayProd.reduce((s, p) => s + (parseFloat(p.porcentaje_postura) || 0), 0) / dayProd.length).toFixed(1)
          : 0
        return {
          fecha:   date.slice(5),
          huevos:  dayProd.reduce((s, p) => s + (p.huevos_producidos || 0), 0),
          postura: Number(avg),
          bajas:   (mort14d || []).filter(m => m.fecha === date).reduce((s, m) => s + (m.cantidad_bajas || 0), 0),
        }
      })

      /* 5. Lote health */
      const loteHealth = (lotes || []).map(lote => {
        const recs = (prodHoy || []).filter(p => p.lote_id === lote.id)
        const posturaHoy = recs.length
          ? recs.reduce((s, p) => s + (parseFloat(p.porcentaje_postura) || 0), 0) / recs.length
          : null
        return { ...lote, posturaHoy }
      })

      /* 6. Analítica avanzada */
      const mortalidadPorLote = (lotes || []).map(lote => {
        const bajas14d        = (mort14d || []).filter(m => m.lote_id === lote.id).reduce((s, m) => s + (m.cantidad_bajas || 0), 0)
        const bajasAcumuladas = Math.max(0, (lote.cantidad_inicial_aves || 0) - (lote.cantidad_aves_actuales || 0))
        const pctAcumulado    = (lote.cantidad_inicial_aves || 0) > 0
          ? (bajasAcumuladas / lote.cantidad_inicial_aves) * 100
          : 0
        return { ...lote, bajasAcumuladas, pctAcumulado, bajas14d }
      }).sort((a, b) => b.pctAcumulado - a.pctAcumulado)

      const bajasTotal14d = (mort14d || []).reduce((s, m) => s + (m.cantidad_bajas || 0), 0)
      const mortPct14d    = aves > 0 ? ((bajasTotal14d / aves) * 100).toFixed(2) : '0.00'

      const posturaMedia14d = (() => {
        const registros = (prod14d || []).filter(p => parseFloat(p.porcentaje_postura) > 0)
        if (!registros.length) return '0.0'
        return (registros.reduce((s, p) => s + parseFloat(p.porcentaje_postura), 0) / registros.length).toFixed(1)
      })()

      const supervivenciaMedia = (() => {
        const activos = (lotes || []).filter(l => (l.cantidad_inicial_aves || 0) > 0)
        if (!activos.length) return '100.0'
        const prom = activos.reduce((s, l) => s + (l.cantidad_aves_actuales / l.cantidad_inicial_aves) * 100, 0) / activos.length
        return prom.toFixed(1)
      })()

      /* 7. Alertas */
      const alertas = []
      const conProdHoy = new Set((prodHoy || []).map(p => p.galpon_id))
      for (const g of (galpones || [])) {
        if (!conProdHoy.has(g.id))
          alertas.push({ type: 'warning', msg: `"${g.nombre}" sin registro de producción hoy` })
      }
      for (const ins of (insumosRes.data || [])) {
        if (ins.stock_actual <= ins.stock_minimo)
          alertas.push({ type: 'stock', msg: `Stock bajo: "${ins.nombre}" (${ins.stock_actual} unidades)` })
      }

      const totalAlimento14d = (prod14d || []).reduce((s, p) => s + (p.consumo_alimento_kg || 0), 0)
      const totalHuevos14d   = (prod14d || []).reduce((s, p) => s + (p.huevos_producidos  || 0), 0)

      return {
        kpis: { galpones: galponIds.length, lotes: (lotes || []).length, aves, huevosHoy, huevosAyer, bajasHoy, bajasAyer, postura, posturaAyer, semanaHuevos, bajasTotal14d, mortPct14d, posturaMedia14d, supervivenciaMedia, totalAlimento14d, totalHuevos14d },
        chartData,
        loteHealth,
        recientes: recientes || [],
        alertas,
        mortalidadPorLote,
        insumos: insumosRes.data || [],
      }
    },
  })

  const { kpis, chartData, loteHealth, recientes, alertas, mortalidadPorLote, insumos } = data || {}

  /* ── Loading skeleton ── */
  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    </div>
  )

  const anim = delay => noMotion ? undefined : { animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${delay}ms` }

  return (
    <div className="space-y-5">

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-stone-900 p-6"
        style={anim(0)}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-primary-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-primary-300 text-sm font-medium mb-1">{greeting},</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{firstName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white/80 font-medium ring-1 ring-white/20">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ring-1 ${isAdmin ? 'bg-amber-500/25 ring-amber-400/40 text-amber-300' : 'bg-blue-500/25 ring-blue-400/40 text-blue-300'}`}>
                <Shield className="h-3 w-3" aria-hidden="true" />
                {isAdmin ? 'Administrador' : 'Encargado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {(kpis?.huevosHoy != null) && (
              <>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 ring-1 ring-white/20 text-center min-w-[88px]">
                  <p className="text-white/60 text-[10px] uppercase tracking-widest mb-0.5">Huevos hoy</p>
                  <p className="text-xl font-bold text-white tabular-nums">{formatNumber(kpis.huevosHoy)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 ring-1 ring-white/20 text-center min-w-[88px]">
                  <p className="text-white/60 text-[10px] uppercase tracking-widest mb-0.5">% Postura</p>
                  <p className="text-xl font-bold text-amber-300 tabular-nums">{kpis.postura}%</p>
                </div>
              </>
            )}
            <div className="hidden lg:flex w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl ring-1 ring-white/20 items-center justify-center">
              <Bird className="h-7 w-7 text-amber-300" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ══ KPIs ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard noMotion={noMotion} delay={60}  label="Galpones activos"  rawValue={kpis?.galpones}      value={formatNumber(kpis?.galpones)}     icon={Building2}  gradient="from-blue-400 to-blue-600"     sub={`${kpis?.lotes ?? 0} lotes activos`} />
        <KpiCard noMotion={noMotion} delay={110} label="Aves en producción" rawValue={kpis?.aves}           value={formatNumber(kpis?.aves)}          icon={Activity}   gradient="from-emerald-400 to-emerald-600" />
        <KpiCard noMotion={noMotion} delay={160} label="Huevos hoy"         rawValue={kpis?.huevosHoy}      value={formatNumber(kpis?.huevosHoy)}     icon={Egg}        gradient="from-amber-400 to-amber-600"   sub="vs ayer"
          trend={<TrendBadge current={kpis?.huevosHoy ?? 0}  previous={kpis?.huevosAyer ?? 0} />}
        />
        <KpiCard noMotion={noMotion} delay={210} label="Bajas hoy"          rawValue={kpis?.bajasHoy}       value={formatNumber(kpis?.bajasHoy)}      icon={Skull}      gradient="from-red-400 to-red-600"       sub="vs ayer"
          trend={<TrendBadge current={kpis?.bajasHoy ?? 0}   previous={kpis?.bajasAyer ?? 0}  inverse />}
        />
        <KpiCard noMotion={noMotion} delay={260} label="% Postura prom."    value={`${kpis?.postura ?? '0.0'}%`} icon={TrendingUp}  gradient="from-violet-400 to-violet-600" sub="promedio del día"
          trend={<TrendBadge current={parseFloat(kpis?.postura ?? 0)} previous={parseFloat(kpis?.posturaAyer ?? 0)} />}
        />
        <KpiCard noMotion={noMotion} delay={310} label="Huevos esta semana" rawValue={kpis?.semanaHuevos}   value={formatNumber(kpis?.semanaHuevos)}  icon={Star}       gradient="from-rose-400 to-rose-600"     sub="últimos 7 días" />
      </div>

      {/* ══ ANALYTICS BAR ══════════════════════════════════════ */}
      <AnalyticsBar kpis={kpis} posturaConfig={posturaConfig} noMotion={noMotion} />

      {/* ══ ALERTAS ══════════════════════════════════════════════ */}
      {alertas?.length > 0 && <AlertBanner alertas={alertas} noMotion={noMotion} />}

      {/* ══ CUERPO PRINCIPAL ════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Columna izquierda (2/3) ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Chart: Producción y postura 14 días */}
          <div className="card p-5" style={anim(360)}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                <Egg className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <h2 className="section-title leading-none">Producción y % postura</h2>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Últimos 14 días</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData || []} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradHuevos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d97706" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={48} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={v => <span style={{ color: axisColor }}>{v}</span>} />
                <Area yAxisId="left"  type="monotone" dataKey="huevos"  stroke="#d97706" strokeWidth={2.5} fill="url(#gradHuevos)" dot={false} activeDot={{ r: 5, fill: '#d97706' }} name="Huevos" />
                <Line yAxisId="right" type="monotone" dataKey="postura" stroke="#22c55e" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: '#22c55e' }} name="% Postura" strokeDasharray="4 2" />
                <ReferenceLine
                  yAxisId="right"
                  y={posturaConfig?.postura_excelente ?? 90}
                  stroke="#22c55e"
                  strokeDasharray="8 4"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  label={{ value: `Obj ${posturaConfig?.postura_excelente ?? 90}%`, position: 'insideTopRight', fontSize: 9, fill: '#22c55e', opacity: 0.8 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart: Mortalidad 14 días */}
          <div className="card p-5" style={anim(410)}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <Skull className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="section-title leading-none">Mortalidad</h2>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Últimos 14 días</p>
              </div>
              {kpis?.bajasHoy != null && kpis.bajasHoy > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/40">
                  <span className="text-[10px] text-red-500 dark:text-red-400">Hoy:</span>
                  <span className="text-xs font-bold text-red-700 dark:text-red-400 tabular-nums">{kpis.bajasHoy}</span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="bajas" fill="#ef4444" radius={[5, 5, 0, 0]} name="Bajas" maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lotes activos */}
          {loteHealth && loteHealth.length > 0 && (
            <div style={anim(460)}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title flex items-center gap-2">
                  <Layers className="h-4 w-4 text-stone-400 dark:text-stone-500" aria-hidden="true" />
                  Lotes activos
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] font-bold rounded-full">
                    {loteHealth.length}
                  </span>
                </h2>
                <Link to="/dashboard/lotes" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1">
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {loteHealth.slice(0, 6).map((lote, i) => (
                  <LoteCard
                    key={lote.id}
                    lote={lote}
                    posturaConfig={posturaConfig}
                    noMotion={noMotion}
                    delay={470 + i * 50}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mortalidad acumulada por lote */}
          {mortalidadPorLote && mortalidadPorLote.length > 0 && (
            <div style={anim(620)}>
              <MortalidadLotePanel lotesConMort={mortalidadPorLote} noMotion={noMotion} />
            </div>
          )}
        </div>

        {/* ── Columna derecha (1/3) ────────────────────────────── */}
        <div className="space-y-4">

          {/* Postura gauge */}
          <div className="card p-5 text-center" style={anim(360)}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
                <TrendingUp className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div className="text-left">
                <h2 className="section-title leading-none">Postura hoy</h2>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Promedio del día</p>
              </div>
            </div>
            <div className="flex justify-center mb-3">
              <PosturaRing value={kpis?.postura ?? 0} isDark={dark} size={100} />
            </div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <TrendBadge current={parseFloat(kpis?.postura ?? 0)} previous={parseFloat(kpis?.posturaAyer ?? 0)} />
              <span className="text-xs text-stone-400 dark:text-stone-500">vs ayer ({kpis?.posturaAyer ?? '0.0'}%)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
              <div className="text-center">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Aves</p>
                <p className="text-base font-bold text-stone-700 dark:text-stone-200 tabular-nums">{formatNumber(kpis?.aves ?? 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Huevos hoy</p>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatNumber(kpis?.huevosHoy ?? 0)}</p>
              </div>
            </div>
          </div>

          {/* Inventario semáforo (solo admin) */}
          {isAdmin && insumos && insumos.length > 0 && (
            <div style={anim(415)}>
              <InsumosSemaforoPanel insumos={insumos} noMotion={noMotion} />
            </div>
          )}

          {/* Actividad reciente */}
          <div className="card p-5" style={anim(410)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-stone-400 to-stone-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Activity className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
                <h2 className="section-title">Actividad reciente</h2>
              </div>
              <Link to="/dashboard/produccion" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1">
                Ver todo <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {recientes && recientes.length > 0 ? (
              <div>
                {recientes.map((r, i) => (
                  <ActivityItem
                    key={r.id}
                    record={r}
                    posturaConfig={posturaConfig}
                    noMotion={noMotion}
                    delay={420 + i * 35}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Sin registros recientes</p>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="card p-5" style={anim(460)}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <h2 className="section-title">Acciones rápidas</h2>
            </div>
            <div className="space-y-2">
              <ActionLink noMotion={noMotion} delay={470} to="/dashboard/produccion/nuevo" gradient="from-amber-400 to-amber-600" icon={Egg}       label="Registrar producción" desc="Datos diarios de huevos" />
              <ActionLink noMotion={noMotion} delay={490} to="/dashboard/mortalidad/nuevo"  gradient="from-red-400 to-red-600"    icon={Skull}     label="Registrar mortalidad"  desc="Bajas del día" />
              <ActionLink noMotion={noMotion} delay={510} to="/dashboard/galpones"          gradient="from-blue-400 to-blue-600"  icon={Building2} label="Galpones"              desc="Estado y encargados" />
              {isAdmin && <ActionLink noMotion={noMotion} delay={530} to="/dashboard/reportes" gradient="from-violet-400 to-violet-600" icon={BarChart3} label="Reportes"  desc="PDF y CSV" />}
              {isAdmin && <ActionLink noMotion={noMotion} delay={550} to="/dashboard/insumos"  gradient="from-green-400 to-green-600"  icon={Package}  label="Insumos"   desc="Inventario y stock" />}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
