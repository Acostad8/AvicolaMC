import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import {
  formatNumber, formatDate, calcWeeksAge,
  TIPOS_TRATAMIENTO, getLabelFromValue,
} from '../../../lib/utils'
import { calcularHealthScore, BUCKET_META } from '../../../lib/healthScore'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import {
  Building2, Activity, AlertTriangle, CheckCircle2, Egg, Skull, Syringe,
  X, Eye, Radio, Wrench, Zap, TrendingUp, TrendingDown,
  Clock, Search, MapPin, Bird, CalendarDays, Percent, ShieldCheck, Users,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AreaChart, Area, BarChart, Bar, Tooltip, XAxis,
  ResponsiveContainer,
} from 'recharts'

/* ─────────────────── Helpers ─────────────────── */

const todayStr = () => format(new Date(), 'yyyy-MM-dd')

/* ─────────────────── Pulse animation registry ───────────────────
 * Guardamos qué galpones deben "pulsar" temporalmente tras un evento
 * realtime. La clave es galpon_id → timestamp.
 */
function usePulseRegistry() {
  const [pulses, setPulses] = useState({})
  const trigger = (galponId, kind = 'default') => {
    setPulses(p => ({ ...p, [galponId]: { kind, at: Date.now() } }))
    setTimeout(() => {
      setPulses(p => {
        const n = { ...p }
        delete n[galponId]
        return n
      })
    }, 2500)
  }
  return { pulses, trigger }
}

/* ─────────────────── KPI Chip ─────────────────── */
const KpiChip = memo(function KpiChip({ icon: Icon, label, value, sub, gradient, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
        <Skeleton className="h-9 w-9 rounded-xl mb-2" />
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-6 w-16" />
      </div>
    )
  }
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">{label}</p>
        <p className="text-lg font-bold text-stone-900 dark:text-stone-50 tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
})

/* ─────────────────── Score Badge ─────────────────── */
function ScoreBadge({ score, bucket }) {
  const meta = BUCKET_META[bucket]
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
      {score != null ? `${score}` : '—'}
    </div>
  )
}

/* ─────────────────── Mini sparkline (sin ejes) ─────────────────── */
function MiniSpark({ data, color = '#f59e0b', height = 28 }) {
  if (!data?.length) return <div style={{ height }} className="w-full" />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─────────────────── Celda del gemelo ─────────────────── */
function TwinCell({ galpon, health, series7d, pulse, active, onSelect }) {
  const meta = BUCKET_META[health.bucket]
  const hasLote = galpon.loteActivo != null
  const aves = galpon.loteActivo?.cantidad_aves_actuales || 0
  const pctOcup = galpon.capacidad_maxima > 0
    ? Math.min((aves / galpon.capacidad_maxima) * 100, 100)
    : 0

  const pulseColor = pulse?.kind === 'mortalidad' ? 'ring-red-500/70'
    : pulse?.kind === 'produccion' ? 'ring-amber-500/70'
    : 'ring-primary-500/70'

  return (
    <button
      onClick={() => onSelect(galpon.id)}
      className={`relative group text-left rounded-2xl border bg-white dark:bg-stone-900 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500
        ${meta.border}
        ${active ? `ring-2 ${meta.ring} shadow-lg ${meta.glow}` : ''}
        ${pulse ? `ring-4 ${pulseColor} animate-twin-pulse` : ''}
      `}
      aria-label={`Galpón ${galpon.nombre}, estado ${meta.label}, score ${health.score}`}
    >
      <div className={`h-1 w-full ${meta.strip}`} />
      {pulse && (
        <div className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/70 text-white backdrop-blur-sm z-10 animate-fade-in`}>
          <Radio className="h-2.5 w-2.5" />
          {pulse.kind === 'mortalidad' ? 'Mortalidad' : pulse.kind === 'produccion' ? 'Producción' : 'Evento'}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} border ${meta.border}`}>
              <Building2 className={`h-4 w-4 ${meta.text}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-stone-900 dark:text-stone-50 truncate leading-tight">
                {galpon.nombre}
              </p>
              <p className={`text-[10px] font-medium ${meta.text} truncate`}>
                {meta.label}
              </p>
            </div>
          </div>
          <ScoreBadge score={health.score} bucket={health.bucket} />
        </div>

        {/* Stats */}
        {hasLote ? (
          <>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-stone-50 dark:bg-stone-800/60 rounded-md px-2 py-1">
                <p className="text-stone-400 dark:text-stone-500 leading-none">Aves</p>
                <p className="font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-0.5">
                  {formatNumber(aves)}
                </p>
              </div>
              <div className="bg-stone-50 dark:bg-stone-800/60 rounded-md px-2 py-1">
                <p className="text-stone-400 dark:text-stone-500 leading-none">Mort. 7d</p>
                <p className={`font-bold tabular-nums mt-0.5 ${health.breakdown?.bajas7d > 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'}`}>
                  {health.breakdown?.bajas7d ?? 0}
                </p>
              </div>
            </div>

            {/* Occupancy bar */}
            <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pctOcup > 95 ? 'bg-red-500' : pctOcup > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pctOcup}%` }}
              />
            </div>

            {/* Sparkline produccion 7d */}
            {series7d?.length > 0 && <MiniSpark data={series7d} color="#d97706" />}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-3 text-center">
            <div className="text-[10px] text-stone-400 dark:text-stone-500 italic">
              {galpon.estado === 'en_mantenimiento' ? 'En mantenimiento' : 'Sin lote activo'}
            </div>
            {galpon.estado === 'en_mantenimiento' && (
              <Wrench className="h-3.5 w-3.5 text-blue-400 mt-1" />
            )}
          </div>
        )}
      </div>
    </button>
  )
}

/* ─────────────────── Score ring ─────────────────── */
const BUCKET_STROKE = {
  saludable:     '#10b981',
  atencion:      '#f59e0b',
  critico:       '#ef4444',
  vacio:         '#a8a29e',
  mantenimiento: '#3b82f6',
}

const BUCKET_DESCRIPTION = {
  saludable:     'Todos los indicadores están en rango óptimo.',
  atencion:      'Algún indicador requiere seguimiento.',
  critico:       'Se recomienda intervención inmediata.',
  vacio:         'Sin lote activo en este galpón.',
  mantenimiento: 'Galpón fuera de producción temporalmente.',
}

function ScoreRing({ score, bucket }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  const R = 32
  const C = 2 * Math.PI * R
  return (
    <div className="relative w-24 h-24 flex-shrink-0" aria-label={`Score de salud: ${score ?? 'sin dato'} de 100`}>
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle
          cx="40" cy="40" r={R} fill="none" strokeWidth="7"
          className="stroke-stone-200/70 dark:stroke-stone-700/70"
        />
        <circle
          cx="40" cy="40" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke={BUCKET_STROKE[bucket] || '#a8a29e'}
          strokeDasharray={C}
          strokeDashoffset={C - (pct / 100) * C}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-stone-900 dark:text-stone-50 tabular-nums leading-none">
          {score ?? '—'}
        </span>
        <span className="text-[9px] font-semibold text-stone-400 dark:text-stone-500 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

/* ─────────────────── Section header ─────────────────── */
function SectionHeader({ icon: Icon, title, extra }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </h3>
      {extra}
    </div>
  )
}

/* ─────────────────── Mini stat ─────────────────── */
function MiniStat({ icon: Icon, label, value, valueClass = '', sub }) {
  return (
    <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3 min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums mt-1 leading-none ${valueClass || 'text-stone-900 dark:text-stone-50'}`}>
        {value}
      </p>
      {sub && <div className="mt-1.5">{sub}</div>}
    </div>
  )
}

/* ─────────────────── Panel lateral ─────────────────── */
function TwinPanel({ galpon, onClose, daily14 }) {
  const { isAdmin } = useAuth()
  const closeRef = useRef(null)
  const meta = BUCKET_META[galpon.health.bucket]
  const lote = galpon.loteActivo
  const b = galpon.health.breakdown

  const avesHoy = lote?.cantidad_aves_actuales || 0
  const capMax = galpon.capacidad_maxima || 0
  const pctOcup = capMax > 0 ? Math.min((avesHoy / capMax) * 100, 100) : 0

  const hoy = daily14?.[daily14.length - 1]
  const ayer = daily14?.[daily14.length - 2]
  const produccionHoy = hoy?.huevos || 0
  const mortalidadHoy = hoy?.bajas  || 0
  const deltaHoy = ayer ? produccionHoy - ayer.huevos : null
  const postura7d = b && avesHoy > 0 ? (b.huevos7d / (avesHoy * 7)) * 100 : null
  const edadSem = calcWeeksAge(lote?.fecha_ingreso)

  const totalHuevos14 = (daily14 || []).reduce((s, d) => s + d.huevos, 0)
  const totalBajas14  = (daily14 || []).reduce((s, d) => s + d.bajas, 0)
  const promHuevos14  = daily14?.length ? Math.round(totalHuevos14 / daily14.length) : 0

  const alertas = []
  if (galpon.health.bucket === 'critico') {
    alertas.push({
      severity: 'critico',
      icon: AlertTriangle,
      titulo: 'Health score crítico',
      texto: `El galpón requiere intervención inmediata (score ${galpon.health.score}/100).`,
    })
  }
  if (b && b.pctMortalidad > 1) {
    alertas.push({
      severity: 'alto',
      icon: Skull,
      titulo: 'Mortalidad elevada',
      texto: `${b.pctMortalidad.toFixed(2)}% del lote en los últimos 7 días (${b.bajas7d} aves).`,
    })
  }
  if (b && b.deltaProduccion != null && b.deltaProduccion <= -10) {
    alertas.push({
      severity: 'alto',
      icon: TrendingDown,
      titulo: 'Caída de producción',
      texto: `La producción bajó ${Math.abs(b.deltaProduccion).toFixed(1)}% vs semana previa.`,
    })
  }

  const breakdownItems = b ? [
    { label: 'Mortalidad',  value: b.mortalidad,  weight: 40 },
    { label: 'Producción',  value: b.produccion,  weight: 30 },
    { label: 'Ocupación',   value: b.ocupacion,   weight: 15 },
    { label: 'Tratamiento', value: b.tratamiento, weight: 15 },
  ] : []

  const sevStyle = {
    critico: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    alto:    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    info:    'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
  }
  const sevBar = {
    critico: 'bg-red-500',
    alto:    'bg-amber-500',
    info:    'bg-blue-500',
  }

  const prodDelta = b?.deltaProduccion
  const prodChip = prodDelta == null
    ? 'bg-stone-500/10 border-stone-500/20 text-stone-500 dark:text-stone-400'
    : prodDelta >= 0
      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
      : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'
  const mortChip = b && b.pctMortalidad > 1
    ? 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'
    : b && b.pctMortalidad > 0.5
      ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'

  /* Accesibilidad: foco inicial, cierre con Escape y bloqueo de scroll */
  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    const prevOverflow = document.body.style.overflow
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const tooltipStyle = {
    backgroundColor: '#1c1917',
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    color: '#fafaf9',
    padding: '6px 8px',
  }

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="twin-panel-title"
      className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl z-50 flex flex-col animate-slide-in-right"
    >
      {/* Franja de estado */}
      <div className={`h-1 flex-shrink-0 ${meta.strip}`} />

      {/* Header */}
      <header className="flex-shrink-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} border ${meta.border}`}>
            <Building2 className={`h-5 w-5 ${meta.text}`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="twin-panel-title" className="font-bold text-base text-stone-900 dark:text-stone-50 truncate leading-tight">
              {galpon.nombre}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot} ${lote ? 'animate-pulse' : ''}`} />
              <p className={`text-[11px] font-semibold ${meta.text}`}>{meta.label}</p>
              {lote?.nombre_numero && (
                <>
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">Lote {lote.nombre_numero}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Contenido desplazable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-5 space-y-5">

          {/* Estado general */}
          <div className={`rounded-2xl border p-4 ${meta.bg} ${meta.border}`}>
            <div className="flex items-center gap-4">
              {lote ? (
                <ScoreRing score={galpon.health.score} bucket={galpon.health.bucket} />
              ) : (
                <div className={`w-24 h-24 flex-shrink-0 rounded-2xl flex items-center justify-center border bg-white/60 dark:bg-stone-900/40 ${meta.border}`}>
                  {galpon.estado === 'en_mantenimiento'
                    ? <Wrench className={`h-8 w-8 ${meta.text}`} aria-hidden="true" />
                    : <Building2 className={`h-8 w-8 ${meta.text}`} aria-hidden="true" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                  Salud del galpón
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${meta.dot} ${lote ? 'animate-pulse' : ''}`} />
                  <p className={`text-base font-bold ${meta.text}`}>{meta.label}</p>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                  {BUCKET_DESCRIPTION[galpon.health.bucket]}
                </p>
              </div>
            </div>

            {b && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${prodChip}`}
                  title="Producción de los últimos 7 días frente a los 7 anteriores"
                >
                  {prodDelta == null
                    ? <Activity className="h-3 w-3" aria-hidden="true" />
                    : prodDelta >= 0
                      ? <TrendingUp className="h-3 w-3" aria-hidden="true" />
                      : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                  Prod. 7d {prodDelta == null ? '—' : `${prodDelta >= 0 ? '+' : ''}${prodDelta.toFixed(1)}%`}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${mortChip}`}
                  title="Porcentaje de bajas sobre las aves actuales en 7 días"
                >
                  <Skull className="h-3 w-3" aria-hidden="true" />
                  Mort. 7d {b.pctMortalidad.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Lote activo */}
          {lote ? (
            <section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                    Lote {lote.nombre_numero || '—'}
                  </span>
                  {lote.raza?.nombre && (
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                      {lote.raza.nombre}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  {formatDate(lote.fecha_ingreso)}
                  {edadSem != null && ` · ${edadSem} sem`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  icon={Bird}
                  label="Aves"
                  value={formatNumber(avesHoy)}
                  sub={
                    <>
                      <div className="h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            pctOcup > 95 ? 'bg-red-500' : pctOcup > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pctOcup}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 leading-tight">
                        {pctOcup.toFixed(0)}% de {formatNumber(capMax)}
                      </p>
                    </>
                  }
                />
                <MiniStat
                  icon={Egg}
                  label="Huevos hoy"
                  value={formatNumber(produccionHoy)}
                  valueClass="text-amber-600 dark:text-amber-400"
                  sub={
                    <p className={`text-[10px] leading-tight flex items-center gap-0.5 ${
                      deltaHoy == null ? 'text-stone-400 dark:text-stone-500'
                        : deltaHoy > 0 ? 'text-emerald-600 dark:text-emerald-400'
                        : deltaHoy < 0 ? 'text-red-600 dark:text-red-400'
                        : 'text-stone-400 dark:text-stone-500'
                    }`}>
                      {deltaHoy > 0 && <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
                      {deltaHoy < 0 && <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                      {deltaHoy == null
                        ? 'Sin referencia'
                        : deltaHoy === 0
                          ? 'Igual que ayer'
                          : `${deltaHoy > 0 ? '+' : ''}${formatNumber(deltaHoy)} vs ayer`}
                    </p>
                  }
                />
                <MiniStat
                  icon={Skull}
                  label="Bajas hoy"
                  value={mortalidadHoy}
                  valueClass={mortalidadHoy > 0 ? 'text-red-600 dark:text-red-400' : ''}
                  sub={
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-tight">
                      {b ? `${formatNumber(b.bajas7d)} en 7 días` : 'Sin lote activo'}
                    </p>
                  }
                />
                <MiniStat
                  icon={Percent}
                  label="Postura 7d"
                  value={postura7d != null ? `${postura7d.toFixed(1)}%` : '—'}
                  valueClass={
                    postura7d == null ? ''
                      : postura7d >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                      : postura7d >= 60 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                  sub={
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-tight">
                      promedio diario
                    </p>
                  }
                />
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/30 p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                {galpon.estado === 'en_mantenimiento'
                  ? <Wrench className="h-5 w-5 text-stone-400" aria-hidden="true" />
                  : <Building2 className="h-5 w-5 text-stone-400" aria-hidden="true" />}
              </div>
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300 mt-2">
                {galpon.estado === 'en_mantenimiento' ? 'Galpón en mantenimiento' : 'Sin lote activo'}
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 leading-relaxed">
                {galpon.estado === 'en_mantenimiento'
                  ? 'El galpón está fuera de producción mientras se realizan tareas de mantenimiento.'
                  : 'Asigna un lote para comenzar a monitorear producción y mortalidad.'}
              </p>
            </div>
          )}

          {/* Composición del score */}
          {b && (
            <section>
              <SectionHeader
                icon={Activity}
                title="Composición del score"
                extra={<span className="text-[10px] text-stone-400 dark:text-stone-500">0–100</span>}
              />
              <div className="bg-stone-50 dark:bg-stone-800/40 rounded-xl p-3 space-y-2.5">
                {breakdownItems.map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-stone-600 dark:text-stone-300 font-medium">
                        {item.label}
                        <span className="text-stone-400 dark:text-stone-500 font-normal"> · {item.weight}%</span>
                      </span>
                      <span className="tabular-nums font-bold text-stone-700 dark:text-stone-200">
                        {item.value}<span className="text-stone-400 dark:text-stone-500 font-normal">/100</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-stone-200/70 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.value >= 75 ? 'bg-emerald-500' :
                          item.value >= 50 ? 'bg-amber-500'   :
                                              'bg-red-500'
                        }`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actividad 14d */}
          {lote && daily14?.length > 0 && (
            <section>
              <SectionHeader icon={TrendingUp} title="Últimos 14 días" />

              <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">Producción (huevos)</p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
                    {formatNumber(totalHuevos14)} total
                  </p>
                </div>
                {totalHuevos14 > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={96}>
                      <AreaChart data={daily14} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                        <defs>
                          <linearGradient id="panelHuevos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"  stopColor="#d97706" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="fechaLabel"
                          tick={{ fontSize: 9, fill: '#a8a29e' }}
                          tickLine={false}
                          axisLine={false}
                          interval={4}
                          height={16}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          cursor={{ stroke: '#d97706', strokeWidth: 1, strokeDasharray: '3 3' }}
                          formatter={v => [formatNumber(v), 'Huevos']}
                        />
                        <Area
                          dataKey="huevos"
                          stroke="#d97706"
                          strokeWidth={2}
                          fill="url(#panelHuevos)"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                      Promedio {formatNumber(promHuevos14)}/día
                    </p>
                  </>
                ) : (
                  <div className="h-20 flex items-center justify-center text-[11px] text-stone-400 dark:text-stone-500">
                    Sin registros de producción
                  </div>
                )}
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">Mortalidad (aves)</p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
                    {formatNumber(totalBajas14)} total
                  </p>
                </div>
                {totalBajas14 > 0 ? (
                  <ResponsiveContainer width="100%" height={96}>
                    <BarChart data={daily14} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                      <XAxis
                        dataKey="fechaLabel"
                        tick={{ fontSize: 9, fill: '#a8a29e' }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                        height={16}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: 'rgba(239, 68, 68, 0.08)' }}
                        formatter={v => [formatNumber(v), 'Bajas']}
                      />
                      <Bar dataKey="bajas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-20 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Sin bajas en los últimos 14 días
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Alertas */}
          {(lote || alertas.length > 0) && (
            <section>
              <SectionHeader
                icon={AlertTriangle}
                title={`Alertas${alertas.length ? ` (${alertas.length})` : ''}`}
              />
              {alertas.length > 0 ? (
                <div className="space-y-2">
                  {alertas.map((a, i) => (
                    <div key={i} className={`relative flex items-start gap-2.5 p-3 pl-4 border rounded-xl overflow-hidden ${sevStyle[a.severity]}`}>
                      <span className={`absolute inset-y-0 left-0 w-1 ${sevBar[a.severity]}`} aria-hidden="true" />
                      <a.icon className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold">{a.titulo}</p>
                        <p className="text-[11px] opacity-90 mt-0.5 break-words">{a.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 border rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold">Sin alertas activas</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Los indicadores del galpón están dentro de los rangos esperados.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Tratamientos activos */}
          {galpon.tratamientosActivos?.length > 0 && (
            <section>
              <SectionHeader
                icon={Syringe}
                title={`Tratamientos activos (${galpon.tratamientosActivos.length})`}
              />
              <div className="space-y-2">
                {galpon.tratamientosActivos.map(t => {
                  const urgente = ['antibiotico', 'medicacion'].includes(t.tipo)
                  return (
                    <div
                      key={t.id}
                      className={`rounded-xl border p-3 ${
                        urgente
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-stone-800 dark:text-stone-100 min-w-0 truncate">
                          {t.nombre_producto}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                          urgente
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}>
                          {getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        Desde {formatDate(t.fecha_inicio)}
                        {t.dosis_aplicacion ? ` · ${t.dosis_aplicacion}` : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Encargado */}
          {galpon.encargado?.nombre_completo && (
            <section>
              <SectionHeader icon={Users} title="Responsable" />
              <div className="flex items-center gap-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {galpon.encargado.nombre_completo[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 truncate">
                    {galpon.encargado.nombre_completo}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500">Encargado del galpón</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Acciones fijas */}
      <footer className="flex-shrink-0 border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-4 py-3">
        <Link to={`/dashboard/galpones/${galpon.id}`}>
          <Button variant="primary" size="sm" icon={Eye} className="w-full justify-center">
            Ver detalle completo
          </Button>
        </Link>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Link to="/dashboard/produccion/nuevo">
            <Button variant="secondary" size="sm" icon={Egg} className="w-full justify-center">
              Producción
            </Button>
          </Link>
          <Link to="/dashboard/mortalidad/nuevo">
            <Button variant="secondary" size="sm" icon={Skull} className="w-full justify-center">
              Mortalidad
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/dashboard/tratamientos/nuevo" className="col-span-2">
              <Button variant="secondary" size="sm" icon={Syringe} className="w-full justify-center">
                Registrar tratamiento
              </Button>
            </Link>
          )}
        </div>
      </footer>
    </aside>
  )
}

/* ─────────────────── Página principal ─────────────────── */
export default function GemeloDigital() {
  const { isAdmin, perfil } = useAuth()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [filtro, setFiltro]         = useState('todos')
  const [search, setSearch]         = useState('')
  const [live, setLive]             = useState(true)
  const { pulses, trigger } = usePulseRegistry()
  const triggerRef = useRef(trigger)
  useEffect(() => { triggerRef.current = trigger }, [trigger])

  // Fechas clave
  const today    = useMemo(() => todayStr(), [])
  const from7    = useMemo(() => format(subDays(new Date(), 6),  'yyyy-MM-dd'), [])
  const from14b  = useMemo(() => format(subDays(new Date(), 13), 'yyyy-MM-dd'), [])

  /* 1. Galpones + lote activo + tratamientos activos */
  const { data: galpones, isLoading: galponesLoading } = useQuery({
    queryKey: ['gemelo-galpones', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select(`
        id, nombre, capacidad_maxima, estado, descripcion,
        encargado:perfiles(id, nombre_completo),
        lotes(id, estado, nombre_numero, cantidad_aves_actuales, cantidad_inicial_aves, fecha_ingreso, raza:razas(nombre)),
        tratamientos(id, tipo, nombre_producto, estado, fecha_inicio, dosis_aplicacion)
      `).order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data, error } = await q
      if (error) throw error
      return (data || []).map(g => ({
        ...g,
        loteActivo: g.lotes?.find(l => l.estado === 'activo') || null,
        tratamientosActivos: (g.tratamientos || []).filter(t => t.estado === 'activo'),
      }))
    },
    enabled: !!perfil,
    staleTime: 15_000,
    refetchInterval: live ? 20_000 : false,
  })

  /* 2. Eventos 14d (mortalidad + produccion) para calcular ventanas 7d */
  const { data: eventos, isLoading: eventosLoading } = useQuery({
    queryKey: ['gemelo-eventos-14d', isAdmin, perfil?.id],
    queryFn: async () => {
      const [{ data: prod, error: e1 }, { data: mort, error: e2 }] = await Promise.all([
        supabase.from('produccion').select('galpon_id, fecha, huevos_producidos').gte('fecha', from14b),
        supabase.from('mortalidad').select('galpon_id, fecha, cantidad_bajas').gte('fecha', from14b),
      ])
      if (e1) throw e1
      if (e2) throw e2
      return { prod: prod || [], mort: mort || [] }
    },
    enabled: !!perfil,
    staleTime: 10_000,
    refetchInterval: live ? 15_000 : false,
  })

  /* 3. Realtime subscriptions */
  useEffect(() => {
    if (!live) return
    const channel = supabase.channel('gemelo-digital-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mortalidad' }, (payload) => {
        const row = payload.new || payload.old
        if (row?.galpon_id) triggerRef.current(row.galpon_id, 'mortalidad')
        qc.invalidateQueries({ queryKey: ['gemelo-eventos-14d'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produccion' }, (payload) => {
        const row = payload.new || payload.old
        if (row?.galpon_id) triggerRef.current(row.galpon_id, 'produccion')
        qc.invalidateQueries({ queryKey: ['gemelo-eventos-14d'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes' }, () => {
        qc.invalidateQueries({ queryKey: ['gemelo-galpones'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tratamientos' }, () => {
        qc.invalidateQueries({ queryKey: ['gemelo-galpones'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'galpones' }, () => {
        qc.invalidateQueries({ queryKey: ['gemelo-galpones'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [live, qc])

  /* 4. Enriquecer galpones con health score */
  const enriched = useMemo(() => {
    if (!galpones) return []
    const prodByGalpon = new Map()
    const mortByGalpon = new Map()
    for (const p of (eventos?.prod || [])) {
      if (!prodByGalpon.has(p.galpon_id)) prodByGalpon.set(p.galpon_id, [])
      prodByGalpon.get(p.galpon_id).push(p)
    }
    for (const m of (eventos?.mort || [])) {
      if (!mortByGalpon.has(m.galpon_id)) mortByGalpon.set(m.galpon_id, [])
      mortByGalpon.get(m.galpon_id).push(m)
    }
    return galpones.map(g => {
      const prods = prodByGalpon.get(g.id) || []
      const morts = mortByGalpon.get(g.id) || []
      const huevos7d     = prods.filter(p => p.fecha >= from7).reduce((s, p) => s + (p.huevos_producidos || 0), 0)
      const huevos7dPrev = prods.filter(p => p.fecha <  from7).reduce((s, p) => s + (p.huevos_producidos || 0), 0)
      const bajas7d      = morts.filter(m => m.fecha >= from7).reduce((s, m) => s + (m.cantidad_bajas   || 0), 0)
      const health = calcularHealthScore({
        avesActuales:        g.loteActivo?.cantidad_aves_actuales || 0,
        capacidadMaxima:     g.capacidad_maxima,
        bajas7d,
        huevos7d,
        huevos7dPrev,
        tratamientosActivos: g.tratamientosActivos,
        estadoGalpon:        g.estado,
        tieneLoteActivo:     !!g.loteActivo,
      })
      // Serie últimos 7 días para sparkline
      const series7d = []
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const v = prods.filter(p => p.fecha === d).reduce((s, p) => s + (p.huevos_producidos || 0), 0)
        series7d.push({ d, v })
      }
      return { ...g, health, series7d, _bajas7d: bajas7d, _huevos7d: huevos7d }
    })
  }, [galpones, eventos, from7])

  /* 5. KPIs globales */
  const kpis = useMemo(() => {
    if (!enriched.length) return null
    const criticos  = enriched.filter(g => g.health.bucket === 'critico').length
    const atencion  = enriched.filter(g => g.health.bucket === 'atencion').length
    const saludables = enriched.filter(g => g.health.bucket === 'saludable').length
    const mantto    = enriched.filter(g => g.health.bucket === 'mantenimiento').length
    const totalAves = enriched.reduce((s, g) => s + (g.loteActivo?.cantidad_aves_actuales || 0), 0)
    const totalHoyHuevos = (eventos?.prod || []).filter(p => p.fecha === today).reduce((s, p) => s + (p.huevos_producidos || 0), 0)
    const totalHoyBajas  = (eventos?.mort || []).filter(m => m.fecha === today).reduce((s, m) => s + (m.cantidad_bajas || 0), 0)
    const avgScore  = Math.round(
      enriched.filter(g => g.loteActivo).reduce((s, g) => s + g.health.score, 0) /
      (enriched.filter(g => g.loteActivo).length || 1)
    )
    return { criticos, atencion, saludables, mantto, totalAves, totalHoyHuevos, totalHoyBajas, avgScore }
  }, [enriched, eventos, today])

  /* 6. Filtrado */
  const filtered = useMemo(() => {
    let r = enriched
    if (filtro !== 'todos') r = r.filter(g => g.health.bucket === filtro)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(g =>
        g.nombre.toLowerCase().includes(q) ||
        (g.loteActivo?.nombre_numero || '').toLowerCase().includes(q) ||
        (g.encargado?.nombre_completo || '').toLowerCase().includes(q)
      )
    }
    // Ordenar: críticos primero, luego atención, saludables, vacios/mantenimiento
    const order = { critico: 0, atencion: 1, saludable: 2, vacio: 3, mantenimiento: 4 }
    return [...r].sort((a, b) => (order[a.health.bucket] - order[b.health.bucket]) || a.nombre.localeCompare(b.nombre))
  }, [enriched, filtro, search])

  const selected = selectedId ? enriched.find(g => g.id === selectedId) : null
  const closePanel = useCallback(() => setSelectedId(null), [])

  /* Daily series 14d para el panel */
  const panelDaily14 = useMemo(() => {
    if (!selected || !eventos) return []
    const prods = (eventos.prod || []).filter(p => p.galpon_id === selected.id)
    const morts = (eventos.mort || []).filter(m => m.galpon_id === selected.id)
    return Array.from({ length: 14 }, (_, i) => {
      const dateObj = subDays(new Date(), 13 - i)
      const d = format(dateObj, 'yyyy-MM-dd')
      return {
        fecha:      d,
        fechaLabel: format(dateObj, "d MMM", { locale: es }),
        huevos: prods.filter(p => p.fecha === d).reduce((s, p) => s + (p.huevos_producidos || 0), 0),
        bajas:  morts.filter(m => m.fecha === d).reduce((s, m) => s + (m.cantidad_bajas  || 0), 0),
      }
    })
  }, [selected, eventos])

  const loading = galponesLoading || eventosLoading

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gemelo Digital"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Gemelo Digital' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive(!live)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                live
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700'
              }`}
              aria-label={live ? 'Desactivar tiempo real' : 'Activar tiempo real'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
              {live ? 'En vivo' : 'Pausado'}
            </button>
          </div>
        }
      />

      {/* Descripción breve */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-50 to-amber-50 dark:from-stone-800/80 dark:via-stone-800/60 dark:to-amber-900/30 border border-primary-200 dark:border-amber-700/40 rounded-2xl p-4 flex items-start gap-3">
        <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-primary-500/5 dark:to-amber-400/10 pointer-events-none" />
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-amber-500/20">
          <MapPin className="h-5 w-5 text-white" />
        </div>
        <div className="relative">
          <p className="text-sm font-bold text-stone-800 dark:text-amber-200">Vista panorámica en tiempo real</p>
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
            Cada celda es un galpón. Color y score indican salud compuesta (mortalidad, producción, ocupación, tratamientos).
            Los cambios registrados por los operarios aparecen aquí en segundos.
          </p>
        </div>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiChip loading={loading} icon={Building2}    gradient="from-stone-400 to-stone-600"       label="Galpones"       value={enriched.length} />
        <KpiChip loading={loading} icon={CheckCircle2} gradient="from-emerald-400 to-emerald-600"   label="Saludables"     value={kpis?.saludables ?? 0} />
        <KpiChip loading={loading} icon={AlertTriangle} gradient="from-amber-400 to-amber-600"      label="En atención"    value={kpis?.atencion ?? 0} />
        <KpiChip loading={loading} icon={Zap}          gradient="from-red-500 to-red-700"           label="Críticos"       value={kpis?.criticos ?? 0} />
        <KpiChip loading={loading} icon={Egg}          gradient="from-amber-400 to-primary-600"     label="Huevos hoy"     value={kpis ? formatNumber(kpis.totalHoyHuevos) : '—'} />
        <KpiChip loading={loading} icon={TrendingUp}   gradient="from-violet-400 to-violet-600"     label="Score promedio" value={kpis ? `${kpis.avgScore}/100` : '—'} sub={kpis ? `${formatNumber(kpis.totalAves)} aves` : undefined} />
      </div>

      {/* Filtros */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            className="input-base pl-9"
            placeholder="Buscar galpón, lote o encargado…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar en el gemelo digital"
          />
        </div>
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'todos',     l: 'Todos',     c: 'text-stone-600 dark:text-stone-300' },
            { v: 'critico',   l: 'Críticos',  c: 'text-red-600' },
            { v: 'atencion',  l: 'Atención',  c: 'text-amber-600' },
            { v: 'saludable', l: 'Saludables', c: 'text-emerald-600' },
            { v: 'vacio',     l: 'Vacíos',    c: 'text-stone-500' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setFiltro(opt.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filtro === opt.v
                  ? 'bg-white dark:bg-stone-700 shadow-sm ' + opt.c
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="card p-3 space-y-2">
              <Skeleton className="h-1 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Building2}
            title="No se encontraron galpones"
            description={search || filtro !== 'todos' ? 'Ajusta los filtros para ver más resultados.' : 'Crea el primer galpón para comenzar.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(g => (
            <TwinCell
              key={g.id}
              galpon={g}
              health={g.health}
              series7d={g.series7d}
              pulse={pulses[g.id]}
              active={selectedId === g.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}

      {/* Leyenda */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400 px-2">
          <span className="font-semibold">Leyenda:</span>
          {['saludable', 'atencion', 'critico', 'vacio', 'mantenimiento'].map(b => {
            const meta = BUCKET_META[b]
            return (
              <span key={b} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            )
          })}
          <span className="ml-auto text-[11px]">
            <Clock className="inline h-3 w-3 mr-1" />
            Actualizado {format(new Date(), "HH:mm", { locale: es })}
          </span>
        </div>
      )}

      {/* Panel lateral */}
      {selected && (
        <TwinPanel
          key={selected.id}
          galpon={selected}
          daily14={panelDaily14}
          onClose={closePanel}
        />
      )}
      {selected && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
