import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatNumber, formatPercent, formatDate } from '../../lib/utils'
import { Building2, Egg, Skull, TrendingUp, Plus, AlertTriangle, Package } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { format, subDays } from 'date-fns'

function KpiCard({ label, value, icon: Icon, color = 'amber', sub }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-stone-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin, perfil } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

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

      // Galpones sin registro hoy
      const ayer = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const { data: recentes } = await supabase.from('produccion').select('galpon_id')
        .in('galpon_id', galponIds).gte('fecha', ayer)
      const conRegistro = new Set((recentes || []).map(p => p.galpon_id))
      for (const g of (galpones || [])) {
        if (!conRegistro.has(g.id)) {
          alerts.push({ type: 'warning', msg: `El galpón "${g.nombre}" lleva más de 1 día sin registro de producción` })
        }
      }

      // Insumos con stock bajo
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
        
    
    
    <div className="space-y-6">
      {/* KPIs */}
      
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Galpones activos" value={formatNumber(kpis?.galpones)} icon={Building2} color="blue" />
        <KpiCard label="Aves en producción" value={formatNumber(kpis?.aves)} icon={TrendingUp} color="green" />
        <KpiCard label="Huevos hoy" value={formatNumber(kpis?.huevosHoy)} icon={Egg} color="amber" />
        <KpiCard label="Mortalidad hoy" value={formatNumber(kpis?.mortalidadHoy)} icon={Skull} color="red" />
        <KpiCard label="% Postura hoy" value={`${kpis?.postura ?? 0}%`} icon={TrendingUp} color="green" sub="Promedio del día" />
      </div>

      {/* Alertas */}
      {alertas?.length > 0 && (
        <div className="space-y-2">
          <h3 className="section-title flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas
          </h3>
          {alertas.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${a.type === 'stock' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-4">Producción — últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="huevos" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="Huevos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Mortalidad — últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="bajas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Bajas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Acceso rápido */}
      <div>
        <h3 className="section-title mb-3">Acceso rápido</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/produccion/nuevo" className="btn-primary gap-2 flex items-center">
            <Plus className="h-4 w-4" /> Registrar producción
          </Link>
          <Link to="/dashboard/mortalidad/nuevo" className="btn-secondary gap-2 flex items-center">
            <Plus className="h-4 w-4" /> Registrar mortalidad
          </Link>
          <Link to="/dashboard/galpones" className="btn-secondary gap-2 flex items-center">
            <Building2 className="h-4 w-4" /> Ver galpones
          </Link>
          {isAdmin && (
            <Link to="/dashboard/insumos" className="btn-secondary gap-2 flex items-center">
              <Package className="h-4 w-4" /> Ver insumos
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
