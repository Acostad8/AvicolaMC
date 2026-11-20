import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { format, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Wheat, Egg, Package, TrendingDown, AlertTriangle, AlertCircle,
  Building2, CalendarDays, History, ArrowRight, CheckCircle2, Clock,
} from 'lucide-react'

function StatCard({ icon: Icon, gradient, label, value, sub, loading }) {
  if (loading) return <Skeleton className="h-24 rounded-2xl" />
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-xl font-bold text-stone-900 dark:text-stone-50 tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, gradient = 'from-amber-400 to-orange-600', right }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h2>
      </div>
      {right}
    </div>
  )
}

export default function Alimentacion() {
  const { isAdmin, perfil } = useAuth()
  const hoyStr   = format(new Date(), 'yyyy-MM-dd')
  const hace7    = format(subDays(new Date(), 6),  'yyyy-MM-dd')
  const hace30   = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  /* ── Galpones con alimento asignado ── */
  const { data: galpones, isLoading: loadingGalpones } = useQuery({
    queryKey: ['alim-galpones', isAdmin, perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      let q = supabase.from('galpones')
        .select(`
          id, nombre, estado, insumo_alimento_id,
          alimento:insumos!galpones_insumo_alimento_id_fkey(
            id, nombre, unidad_medida, kg_por_unidad, stock_actual, stock_minimo
          )
        `)
        .order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
  })

  /* ── Producción últimos 30 días ── */
  const { data: produccion, isLoading: loadingProd } = useQuery({
    queryKey: ['alim-produccion', hace30, isAdmin, perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      let q = supabase.from('produccion')
        .select('fecha, galpon_id, consumo_alimento_kg, huevos_producidos')
        .gte('fecha', hace30)
        .order('fecha')
      if (!isAdmin) {
        const { data: gs } = await supabase.from('galpones').select('id').eq('encargado_id', perfil.id)
        const ids = (gs || []).map(g => g.id)
        if (ids.length === 0) return []
        q = q.in('galpon_id', ids)
      }
      const { data } = await q
      return data || []
    },
  })

  /* ── Movimientos auto generados por trigger ── */
  const { data: movimientosAuto, isLoading: loadingMovs } = useQuery({
    queryKey: ['alim-movs-auto'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from('movimientos_insumos')
        .select(`
          id, fecha, cantidad, observaciones, destino_proveedor,
          insumo:insumos(nombre, unidad_medida)
        `)
        .eq('tipo', 'salida')
        .ilike('observaciones', 'Consumo automático%')
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
  })

  /* ── Agregados ── */
  const { kpis, porGalpon, serieChart, alertas } = useMemo(() => {
    const prod = produccion || []
    const gs   = galpones  || []

    const consumoHoy    = prod.filter(p => p.fecha === hoyStr).reduce((s, p) => s + Number(p.consumo_alimento_kg || 0), 0)
    const consumoSemana = prod.filter(p => p.fecha >= hace7).reduce((s, p) => s + Number(p.consumo_alimento_kg || 0), 0)

    const stockTotalKg = gs.reduce((s, g) => {
      if (!g.alimento) return s
      const kgPorU = Number(g.alimento.kg_por_unidad || 1)
      return s + Number(g.alimento.stock_actual || 0) * kgPorU
    }, 0)

    const promDiario = consumoSemana / 7
    const diasAutonomia = promDiario > 0 ? Math.floor(stockTotalKg / promDiario) : null

    /* Por galpón: consumo 7d, huevos 7d, FCR */
    const porGalponMap = {}
    for (const p of prod.filter(x => x.fecha >= hace7)) {
      if (!porGalponMap[p.galpon_id]) porGalponMap[p.galpon_id] = { consumo: 0, huevos: 0 }
      porGalponMap[p.galpon_id].consumo += Number(p.consumo_alimento_kg || 0)
      porGalponMap[p.galpon_id].huevos  += Number(p.huevos_producidos  || 0)
    }

    const porGalpon = gs.map(g => {
      const m = porGalponMap[g.id] || { consumo: 0, huevos: 0 }
      const fcr = m.huevos > 0 ? m.consumo / m.huevos : null
      const kgPorU = Number(g.alimento?.kg_por_unidad || 1)
      const unidadesProy = g.alimento && promDiario > 0
        ? Math.floor((Number(g.alimento.stock_actual) * kgPorU) / (m.consumo / 7 || promDiario))
        : null
      return {
        id: g.id, nombre: g.nombre, estado: g.estado,
        alimento: g.alimento,
        consumoSemana: m.consumo,
        huevosSemana: m.huevos,
        fcr,
        diasProy: unidadesProy,
      }
    })

    /* Serie 30 días: consumo vs postura */
    const serieMap = {}
    for (const p of prod) {
      if (!serieMap[p.fecha]) serieMap[p.fecha] = { consumo: 0, huevos: 0 }
      serieMap[p.fecha].consumo += Number(p.consumo_alimento_kg || 0)
      serieMap[p.fecha].huevos  += Number(p.huevos_producidos  || 0)
    }
    const serieChart = Array.from({ length: 30 }, (_, i) => {
      const f = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd')
      const d = serieMap[f] || { consumo: 0, huevos: 0 }
      return {
        fecha: f,
        label: format(parseISO(f), 'd MMM', { locale: es }),
        consumo: Math.round(d.consumo * 10) / 10,
        huevos: d.huevos,
      }
    })

    /* Alertas */
    const alertas = []
    for (const g of gs) {
      if (g.estado === 'en_produccion' && !g.alimento) {
        alertas.push({
          tipo: 'warning', icon: AlertTriangle,
          msg: `${g.nombre} está en producción pero no tiene alimento asignado`,
          link: `/dashboard/galpones/${g.id}/editar`,
        })
      }
      if (g.alimento && g.alimento.stock_minimo > 0 && Number(g.alimento.stock_actual) < Number(g.alimento.stock_minimo)) {
        alertas.push({
          tipo: 'error', icon: AlertCircle,
          msg: `Stock de ${g.alimento.nombre} (${g.nombre}) por debajo del mínimo: ${g.alimento.stock_actual}/${g.alimento.stock_minimo} ${g.alimento.unidad_medida}`,
          link: `/dashboard/insumos/${g.alimento.id}`,
        })
      }
    }

    const kpis = {
      consumoHoy, consumoSemana, stockTotalKg,
      diasAutonomia,
      galponesActivos: gs.filter(g => g.estado === 'en_produccion').length,
      galponesConAlimento: gs.filter(g => g.insumo_alimento_id).length,
    }

    return { kpis, porGalpon, serieChart, alertas }
  }, [produccion, galpones, hoyStr, hace7])

  const loading = loadingGalpones || loadingProd

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Alimentación"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Alimentación' },
        ]}
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wheat} gradient="from-amber-400 to-orange-500"
          label="Consumo hoy"
          value={`${kpis?.consumoHoy?.toLocaleString('es-CO') || 0} kg`}
          sub="Total galpones"
          loading={loading}
        />
        <StatCard
          icon={CalendarDays} gradient="from-amber-500 to-orange-600"
          label="Consumo últimos 7 días"
          value={`${kpis?.consumoSemana?.toLocaleString('es-CO') || 0} kg`}
          sub={kpis?.consumoSemana > 0 ? `Promedio ${Math.round(kpis.consumoSemana / 7).toLocaleString('es-CO')} kg/día` : '—'}
          loading={loading}
        />
        <StatCard
          icon={Package} gradient="from-emerald-400 to-teal-600"
          label="Stock total alimento"
          value={`${Math.round(kpis?.stockTotalKg || 0).toLocaleString('es-CO')} kg`}
          sub={`${kpis?.galponesConAlimento || 0} galpones con alimento`}
          loading={loading}
        />
        <StatCard
          icon={Clock} gradient="from-blue-400 to-indigo-600"
          label="Autonomía estimada"
          value={kpis?.diasAutonomia != null ? `${kpis.diasAutonomia} días` : '—'}
          sub="A ritmo promedio semanal"
          loading={loading}
        />
      </div>

      {/* ── Alertas ── */}
      {alertas?.length > 0 && (
        <div className="card p-5 space-y-3">
          <SectionHeader icon={AlertTriangle} title={`Alertas (${alertas.length})`} gradient="from-amber-400 to-red-500" />
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <Link
                key={i} to={a.link}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                  a.tipo === 'error'
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                }`}
              >
                <a.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{a.msg}</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Gráfico 30 días ── */}
      <div className="card p-5 space-y-4">
        <SectionHeader icon={Egg} title="Consumo de alimento vs huevos producidos — últimos 30 días" gradient="from-amber-400 to-orange-600" />
        <div className="h-72">
          {loading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} interval="preserveStartEnd" />
                <YAxis yAxisId="kg" tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={v => `${v} kg`} />
                <YAxis yAxisId="huevos" orientation="right" tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e7e5e4' }}
                  formatter={(v, n) => n === 'consumo' ? [`${v} kg`, 'Consumo'] : [v.toLocaleString('es-CO'), 'Huevos']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="kg" dataKey="consumo" name="Consumo (kg)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Line yAxisId="huevos" type="monotone" dataKey="huevos" name="Huevos" stroke="#10b981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Tabla por galpón ── */}
      <div className="card p-5 space-y-4">
        <SectionHeader icon={Building2} title="Resumen por galpón (últimos 7 días)" gradient="from-stone-500 to-stone-700" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide border-b border-stone-100 dark:border-stone-800">
                <th className="px-5 py-3">Galpón</th>
                <th className="px-5 py-3">Alimento</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3 text-right">Consumo 7d</th>
                <th className="px-5 py-3 text-right">Huevos 7d</th>
                <th className="px-5 py-3 text-right">FCR (kg/huevo)</th>
                <th className="px-5 py-3 text-right">Días proy.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : porGalpon.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-stone-400">Sin galpones</td></tr>
              ) : porGalpon.map(g => (
                <tr key={g.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="px-5 py-3">
                    <Link to={`/dashboard/galpones/${g.id}`} className="font-medium text-stone-800 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400">
                      {g.nombre}
                    </Link>
                    {g.estado !== 'en_produccion' && (
                      <span className="ml-2 text-xs text-stone-400 capitalize">{g.estado.replace('_', ' ')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {g.alimento ? (
                      <Link to={`/dashboard/insumos/${g.alimento.id}`} className="text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400">
                        {g.alimento.nombre}
                      </Link>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {g.alimento ? `${Number(g.alimento.stock_actual).toLocaleString('es-CO')} ${g.alimento.unidad_medida}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                    {g.consumoSemana > 0 ? `${g.consumoSemana.toLocaleString('es-CO')} kg` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                    {g.huevosSemana > 0 ? g.huevosSemana.toLocaleString('es-CO') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {g.fcr != null ? (
                      <span className={g.fcr < 0.15 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : g.fcr < 0.25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>
                        {g.fcr.toFixed(3)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {g.diasProy != null && g.diasProy < 999 ? (
                      <span className={g.diasProy < 3 ? 'text-red-600 dark:text-red-400 font-semibold' : g.diasProy < 7 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}>
                        {g.diasProy} d
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Historial movimientos auto ── */}
      {isAdmin && (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={History} title="Últimos movimientos automáticos" gradient="from-indigo-400 to-indigo-600" />
          {loadingMovs ? (
            <Skeleton className="h-24 w-full" />
          ) : (movimientosAuto || []).length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-stone-400 py-4">
              <CheckCircle2 className="h-4 w-4" />
              Aún no se han generado movimientos automáticos de consumo.
            </div>
          ) : (
            <div className="space-y-2">
              {movimientosAuto.map(m => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-stone-100 dark:border-stone-800 px-4 py-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-800 dark:text-stone-100 truncate">
                      {m.insumo?.nombre || '—'}
                      <span className="ml-2 font-bold text-red-600 dark:text-red-400 tabular-nums">
                        −{Number(m.cantidad).toLocaleString('es-CO')} {m.insumo?.unidad_medida}
                      </span>
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                      {format(parseISO(m.fecha), 'd MMM yyyy', { locale: es })} · {m.observaciones}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
