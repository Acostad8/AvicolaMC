import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useA11y } from '../../context/AccessibilityContext'
import { formatNumber } from '../../lib/utils'
import {
  Building2, Egg, Skull, TrendingUp, Plus, AlertTriangle,
  Package, BarChart3, Activity, Bird,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { format, subDays } from 'date-fns'

/* ── KPI Card ── */
function KpiCard({ label, value, icon: Icon, gradient, sub }) {
  return (
    <div className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 hover:shadow-lg hover:border-stone-300 dark:hover:border-stone-700 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
      </div>
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{sub}</p>}
    </div>
  )
}

/* ── Quick action card ── */
function ActionCard({ to, gradient, icon: Icon, label, desc }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3.5 hover:border-primary-300 dark:hover:border-primary-700/60 hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-4 w-4 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-tight">{label}</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{desc}</p>
      </div>
    </Link>
  )
}

/* ── Alert item ── */
function AlertItem({ type, msg }) {
  const isStock = type === 'stock'
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${isStock ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'}`}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>{msg}</span>
    </div>
  )
}

/* ── Main component ── */
export default function Dashboard() {
  const { isAdmin, perfil } = useAuth()
  const { dark } = useA11y()
  const today = format(new Date(), 'yyyy-MM-dd')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = perfil?.nombre_completo?.split(' ')[0] || ''

  /* Chart colors */
  const gridColor    = dark ? '#292524' : '#f5f5f4'
  const axisColor    = dark ? '#78716c' : '#a8a29e'
  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#ffffff',
    border: `1px solid ${dark ? '#292524' : '#e7e5e4'}`,
    borderRadius: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  }

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['dashboard-kpis', isAdmin, perfil?.id],
    queryFn: async () => {
      let galponesQ = supabase.from('galpones').select('id, nombre, estado, encargado_id')
      if (!isAdmin) galponesQ = galponesQ.eq('encargado_id', perfil.id)
      const { data: galpones } = await galponesQ.eq('estado', 'activo')
      const galponIds = (galpones || []).map(g => g.id)

      if (galponIds.length === 0) return { galpones: 0, aves: 0, huevosHoy: 0, mortalidadHoy: 0, postura: 0 }

      const { data: lotes } = await supabase.from('lotes').select('galpon_id, cantidad_aves_actuales')
        .in('galpon_id', galponIds).eq('estado', 'activo')
      const aves = (lotes || []).reduce((s, l) => s + (l.cantidad_aves_actuales || 0), 0)

      const { data: prodHoy } = await supabase.from('produccion').select('huevos_producidos')
        .in('galpon_id', galponIds).eq('fecha', today)
      const huevosHoy = (prodHoy || []).reduce((s, p) => s + (p.huevos_producidos || 0), 0)

      const { data: mortHoy } = await supabase.from('mortalidad').select('cantidad_bajas')
        .in('galpon_id', galponIds).eq('fecha', today)
      const mortalidadHoy = (mortHoy || []).reduce((s, m) => s + (m.cantidad_bajas || 0), 0)

      const postura = aves > 0 ? ((huevosHoy / aves) * 100).toFixed(1) : 0

      return { galpones: galponIds.length, aves, huevosHoy, mortalidadHoy, postura }
    },
    enabled: !!perfil,
  })

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-chart', isAdmin, perfil?.id],
    queryFn: async () => {
      let galponesQ = supabase.from('galpones').select('id')
      if (!isAdmin) galponesQ = galponesQ.eq('encargado_id', perfil.id)
      const { data: galpones } = await galponesQ.eq('estado', 'activo')
      const galponIds = (galpones || []).map(g => g.id)
      if (galponIds.length === 0) return []

      const desde = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const [{ data: prod }, { data: mort }] = await Promise.all([
        supabase.from('produccion').select('fecha, huevos_producidos')
          .in('galpon_id', galponIds).gte('fecha', desde),
        supabase.from('mortalidad').select('fecha, cantidad_bajas')
          .in('galpon_id', galponIds).gte('fecha', desde),
      ])

      const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'))
      return days.map(date => ({
        fecha: date.slice(5),
        huevos: (prod || []).filter(p => p.fecha === date).reduce((s, p) => s + p.huevos_producidos, 0),
        bajas: (mort || []).filter(m => m.fecha === date).reduce((s, m) => s + m.cantidad_bajas, 0),
      }))
    },
    enabled: !!perfil,
  })

  const { data: alertas } = useQuery({
    queryKey: ['dashboard-alertas', isAdmin, perfil?.id],
    queryFn: async () => {
      const alerts = []
      let galponesQ = supabase.from('galpones').select('id, nombre')
      if (!isAdmin) galponesQ = galponesQ.eq('encargado_id', perfil.id)
      const { data: galpones } = await galponesQ.eq('estado', 'activo')
      const galponIds = (galpones || []).map(g => g.id)

      const ayer = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const { data: recentes } = await supabase.from('produccion').select('galpon_id')
        .in('galpon_id', galponIds).gte('fecha', ayer)
      const conRegistro = new Set((recentes || []).map(p => p.galpon_id))
      for (const g of (galpones || [])) {
        if (!conRegistro.has(g.id)) {
          alerts.push({ type: 'warning', msg: `El galpón "${g.nombre}" lleva más de 1 día sin registro de producción` })
        }
      }

      if (isAdmin) {
        const { data: insumos } = await supabase.from('insumos')
          .select('nombre, stock_actual, stock_minimo').eq('estado', 'activo')
        for (const ins of (insumos || [])) {
          if (ins.stock_actual <= ins.stock_minimo) {
            alerts.push({ type: 'stock', msg: `Stock bajo: "${ins.nombre}" (${ins.stock_actual} disponibles)` })
          }
        }
      }

      return alerts
    },
    enabled: !!perfil,
  })

  if (loadingKpis) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-stone-900 rounded-2xl p-5 flex items-center justify-between gap-4 overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-64 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-primary-200 text-sm font-medium mb-0.5">{greeting},</p>
          <h1 className="text-xl font-bold text-white">{firstName || 'Usuario'} 👋</h1>
          <p className="text-primary-300 text-xs mt-1">
            {format(new Date(), 'dd/MM/yyyy')} · {isAdmin ? 'Administrador' : 'Encargado'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0 relative">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-1 ring-white/20">
            <Bird className="h-6 w-6 text-amber-300" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Galpones activos"    value={formatNumber(kpis?.galpones)}       icon={Building2}   gradient="from-blue-400 to-blue-600"   />
        <KpiCard label="Aves en producción"  value={formatNumber(kpis?.aves)}            icon={Activity}    gradient="from-green-400 to-green-600"  />
        <KpiCard label="Huevos hoy"          value={formatNumber(kpis?.huevosHoy)}       icon={Egg}         gradient="from-amber-400 to-amber-600"  />
        <KpiCard label="Mortalidad hoy"      value={formatNumber(kpis?.mortalidadHoy)}   icon={Skull}       gradient="from-red-400 to-red-600"      />
        <KpiCard label="% Postura hoy"       value={`${kpis?.postura ?? 0}%`}            icon={TrendingUp}  gradient="from-violet-400 to-violet-600" sub="Promedio del día" />
      </div>

      {/* ── Alertas ── */}
      {alertas?.length > 0 && (
        <section aria-label="Alertas del sistema">
          <h2 className="section-title flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Alertas
            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
              {alertas.length}
            </span>
          </h2>
          <div className="space-y-2">
            {alertas.map((a, i) => <AlertItem key={i} {...a} />)}
          </div>
        </section>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <Egg className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Producción — últimos 7 días</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="huevos" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3, fill: '#d97706' }} activeDot={{ r: 5 }} name="Huevos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
              <Skull className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Mortalidad — últimos 7 días</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="bajas" fill="#ef4444" radius={[6, 6, 0, 0]} name="Bajas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Quick access ── */}
      <section aria-label="Acceso rápido">
        <h2 className="section-title mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard to="/dashboard/produccion/nuevo" gradient="from-amber-400 to-amber-600" icon={Plus}      label="Registrar producción"  desc="Ingresa datos del día" />
          <ActionCard to="/dashboard/mortalidad/nuevo"  gradient="from-red-400 to-red-600"    icon={Skull}    label="Registrar mortalidad"   desc="Registra bajas del día" />
          <ActionCard to="/dashboard/galpones"          gradient="from-blue-400 to-blue-600"  icon={Building2} label="Ver galpones"          desc="Estado y encargados" />
          {isAdmin && (
            <ActionCard to="/dashboard/reportes"        gradient="from-violet-400 to-violet-600" icon={BarChart3} label="Ver reportes"        desc="PDF y CSV disponibles" />
          )}
          {isAdmin && (
            <ActionCard to="/dashboard/insumos"         gradient="from-green-400 to-green-600" icon={Package}  label="Ver insumos"           desc="Inventario y stock" />
          )}
        </div>
      </section>
    </div>
  )
}
