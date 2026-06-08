import { useState, useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { useGalponesPrediccion, usePrediccionData } from '../../../hooks/usePrediccion'
import PageHeader from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { formatNumber } from '../../../lib/utils'
import { format } from 'date-fns'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useConfig } from '../../../context/ConfigContext'
import {
  Egg, Package, TrendingUp, Target, AlertTriangle,
  Info, Building2, BarChart3,
} from 'lucide-react'

/* ── Stat card ── */
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

/* ── Precision indicator ── */
function PrecisionBadge({ r2 }) {
  const color = r2 >= 70 ? 'bg-green-500' : r2 >= 40 ? 'bg-amber-500' : 'bg-red-400'
  const label = r2 >= 70 ? 'Alta' : r2 >= 40 ? 'Media' : 'Baja'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-stone-500 dark:text-stone-400">
        Precisión {label} ({r2}%)
      </span>
    </div>
  )
}

/* ── Días de stock de alimento ── */
function StockAlimentoCard({ insumos, consumoPromDiario, pesoSacoKg }) {
  if (!insumos?.length || consumoPromDiario <= 0) return null

  const kgMap = {
    kg: 1, kilogramo: 1, tonelada: 1000,
    saco: pesoSacoKg, bulto: pesoSacoKg, costal: pesoSacoKg,
  }

  const insumosConvertidos = insumos.map(i => ({
    ...i,
    totalKg: kgMap[i.unidad_medida] != null
      ? (i.stock_actual || 0) * kgMap[i.unidad_medida]
      : null,
  }))

  const totalKg      = insumosConvertidos.reduce((s, i) => s + (i.totalKg ?? 0), 0)
  const hayNoConvert = insumosConvertidos.some(i => i.totalKg === null)

  if (totalKg <= 0 && !hayNoConvert) return null

  const diasRestantes  = totalKg > 0 ? Math.floor(totalKg / consumoPromDiario) : 0
  const fechaAgotamiento = totalKg > 0
    ? new Date(Date.now() + diasRestantes * 86400000).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    : null

  const color = diasRestantes >= 14 ? 'text-green-600 dark:text-green-400'
    : diasRestantes >= 7  ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'
  const dot = diasRestantes >= 14 ? 'bg-green-500' : diasRestantes >= 7 ? 'bg-amber-500' : 'bg-red-500'
  const usaSacos = insumosConvertidos.some(
    i => ['saco', 'bulto', 'costal'].includes(i.unidad_medida) && i.totalKg != null
  )

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
          <Package className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Stock de alimento</h2>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">Estimado de días disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Stock total</p>
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-1">{formatNumber(Math.round(totalKg))} kg</p>
        </div>
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Consumo/día</p>
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100 tabular-nums mt-1">{consumoPromDiario} kg</p>
        </div>
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide">Alcanza</p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <p className={`text-sm font-bold tabular-nums ${color}`}>
              {totalKg > 0 ? `~${diasRestantes}d` : '—'}
            </p>
          </div>
          {fechaAgotamiento && (
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">hasta ~{fechaAgotamiento}</p>
          )}
        </div>
      </div>

      {/* Notas de conversión */}
      {(usaSacos || hayNoConvert) && (
        <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
          {usaSacos && (
            <p className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
              <Package className="h-3 w-3 flex-shrink-0" />
              Sacos/bultos/costales convertidos a <span className="font-semibold text-stone-600 dark:text-stone-300">{pesoSacoKg} kg/unidad</span>
              <span className="text-stone-300 dark:text-stone-600">· ajustable en Configuración → Producción</span>
            </p>
          )}
          {hayNoConvert && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              Algunos insumos tienen unidades no convertibles a kg y fueron excluidos del cálculo
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Empty state ── */
function SinDatos({ galpones }) {
  return (
    <div className="card p-8 text-center space-y-3">
      <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto">
        <BarChart3 className="h-6 w-6 text-stone-400 dark:text-stone-600" />
      </div>
      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Datos insuficientes</p>
      <p className="text-xs text-stone-400 dark:text-stone-500 max-w-xs mx-auto">
        {!galpones?.length
          ? 'No hay galpones en producción disponibles.'
          : 'Se necesitan al menos 5 días de registros de producción para generar una predicción.'}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════ */
export default function Predicciones() {
  const { isAdmin, perfil } = useAuth()
  const { dark }            = useA11y()
  const { config }          = useConfig()

  const [galponId,  setGalponId]  = useState('todos')
  const [horizonte, setHorizonte] = useState(14)

  const { data: galpones, isLoading: loadingGalpones } = useGalponesPrediccion(isAdmin, perfil?.id)

  const galponIds = useMemo(() => {
    if (galponId === 'todos') return (galpones || []).map(g => g.id)
    return [galponId]
  }, [galponId, galpones])

  const { data, isLoading } = usePrediccionData({ galponIds, diasFuturos: horizonte })

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

  const hoyLabel = format(new Date(), 'yyyy-MM-dd').slice(5)
  const hayConsumo = (data?.consumoPromDiario ?? 0) > 0

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Predicción"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Predicción' },
        ]}
      />

      {/* ── Controles ── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Selector galpón */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 text-stone-400 dark:text-stone-500 flex-shrink-0" />
            <select
              value={galponId}
              onChange={e => setGalponId(e.target.value)}
              disabled={loadingGalpones}
              className="input-base text-sm flex-1 min-w-0"
            >
              <option value="todos">Todos los galpones</option>
              {(galpones || []).map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>

          {/* Horizonte */}
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4 text-stone-400 dark:text-stone-500 mr-1 flex-shrink-0" />
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setHorizonte(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  horizonte === d
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sin datos ── */}
      {!isLoading && (!data?.suficientesDatos) && (
        <SinDatos galpones={galpones} />
      )}

      {/* ── KPI cards ── */}
      {(isLoading || data?.suficientesDatos) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            loading={isLoading}
            icon={Egg}
            gradient="from-amber-400 to-amber-600"
            label={`Producción est. (${horizonte}d)`}
            value={isLoading ? '—' : formatNumber(data?.totales.huevosEstimados)}
            sub="huevos estimados"
          />
          <StatCard
            loading={isLoading}
            icon={TrendingUp}
            gradient="from-violet-400 to-violet-600"
            label="Postura media est."
            value={isLoading ? '—' : `${data?.totales.posturaMedia ?? 0}%`}
            sub="promedio del período"
          />
          <StatCard
            loading={isLoading}
            icon={Package}
            gradient="from-teal-400 to-teal-600"
            label={`Consumo alimento est.`}
            value={isLoading ? '—' : hayConsumo ? `${formatNumber(data?.totales.consumoEstimado)} kg` : 'Sin datos'}
            sub={hayConsumo ? `~${data?.consumoPromDiario} kg/día promedio` : 'Registra consumo en producción'}
          />
          <StatCard
            loading={isLoading}
            icon={BarChart3}
            gradient={!isLoading && data?.r2 >= 70 ? 'from-green-400 to-green-600' : !isLoading && data?.r2 >= 40 ? 'from-amber-400 to-amber-600' : 'from-stone-400 to-stone-600'}
            label="Precisión del modelo"
            value={isLoading ? '—' : `${data?.r2 ?? 0}%`}
            sub={!isLoading ? (data?.r2 >= 70 ? 'Alta — proyección confiable' : data?.r2 >= 40 ? 'Media — referencial' : 'Baja — pocos datos') : undefined}
          />
        </div>
      )}

      {/* ── Gráfica producción ── */}
      {(isLoading || data?.suficientesDatos) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                <Egg className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="section-title leading-none">Producción de huevos</h2>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                  30 días histórico + {horizonte} días predicción
                </p>
              </div>
            </div>
            {!isLoading && data && <PrecisionBadge r2={data.r2} />}
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data?.allData || []} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradHistProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPredProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="fechaLabel"
                  tick={{ fontSize: 9, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor((30 + horizonte) / 8)}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => {
                  if (name === 'Huevos (hist.)' || name === 'Huevos (pred.)') return [formatNumber(v), name]
                  return [`${Number(v).toFixed(1)}%`, name]
                }} />
                <ReferenceLine yAxisId="left" x={hoyLabel} stroke={axisColor} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: 'Hoy', position: 'insideTopRight', fontSize: 9, fill: axisColor }} />

                {/* Área histórica */}
                <Area
                  yAxisId="left"
                  dataKey="huevos"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fill="url(#gradHistProd)"
                  dot={false}
                  connectNulls={false}
                  name="Huevos (hist.)"
                  activeDot={{ r: 4, fill: '#d97706' }}
                />
                {/* Línea histórica postura */}
                <Line
                  yAxisId="right"
                  dataKey="postura"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                  name="Postura % (hist.)"
                  activeDot={{ r: 3, fill: '#22c55e' }}
                />
                {/* Línea predicción huevos */}
                <Area
                  yAxisId="left"
                  dataKey="huevosPred"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="7 4"
                  fill="url(#gradPredProd)"
                  dot={false}
                  connectNulls={false}
                  name="Huevos (pred.)"
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
                {/* Línea predicción postura */}
                <Line
                  yAxisId="right"
                  dataKey="posturaPred"
                  stroke="#4ade80"
                  strokeWidth={1.5}
                  strokeDasharray="7 4"
                  dot={false}
                  connectNulls={false}
                  name="Postura % (pred.)"
                  activeDot={{ r: 3, fill: '#4ade80' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Leyenda manual */}
          {!isLoading && (
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-0.5 bg-amber-500 rounded" />
                <span className="text-[10px] text-stone-500 dark:text-stone-400">Producción histórica</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3" /></svg>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">Predicción</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-0.5 bg-green-500 rounded" />
                <span className="text-[10px] text-stone-500 dark:text-stone-400">% Postura histórica</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#4ade80" strokeWidth="2" strokeDasharray="5,3" /></svg>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">% Postura predicha</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Gráfica consumo ── */}
      {(isLoading || (data?.suficientesDatos && hayConsumo)) && (
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="section-title leading-none">Consumo de alimento</h2>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                30 días histórico + {horizonte} días predicción · kg/día
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data?.allData || []} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradHistCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPredCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2dd4bf" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="fechaLabel"
                  tick={{ fontSize: 9, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor((30 + horizonte) / 8)}
                />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${Number(v).toFixed(1)} kg`, name]} />
                <ReferenceLine x={hoyLabel} stroke={axisColor} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: 'Hoy', position: 'insideTopRight', fontSize: 9, fill: axisColor }} />
                <Area
                  dataKey="consumo"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fill="url(#gradHistCons)"
                  dot={false}
                  connectNulls={false}
                  name="Consumo (hist.)"
                  activeDot={{ r: 4, fill: '#14b8a6' }}
                />
                <Area
                  dataKey="consumoPred"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  strokeDasharray="7 4"
                  fill="url(#gradPredCons)"
                  dot={false}
                  connectNulls={false}
                  name="Consumo (pred.)"
                  activeDot={{ r: 4, fill: '#2dd4bf' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Stock de alimento ── */}
      {!isLoading && data?.suficientesDatos && (
        <StockAlimentoCard
          insumos={data.stockAlimento}
          consumoPromDiario={data.consumoPromDiario}
          pesoSacoKg={config.produccion?.peso_saco_kg ?? 40}
        />
      )}

      {/* ── Nota informativa ── */}
      {!isLoading && data?.suficientesDatos && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/50 rounded-xl">
          <Info className="h-4 w-4 text-stone-400 dark:text-stone-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            Las predicciones se basan en regresión lineal de los últimos 60 días de registros.
            La precisión aumenta con más datos históricos y puede verse afectada por eventos
            externos (enfermedades, cambios de temperatura, cambio de lote).{' '}
            {data.r2 < 40 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Precisión baja: considera registrar producción diaria de forma constante.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Alerta si consumo no registrado */}
      {!isLoading && data?.suficientesDatos && !hayConsumo && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            No se encontraron datos de consumo de alimento. Para activar la predicción de consumo,
            registra el campo <strong>Consumo de alimento (kg)</strong> en cada registro de producción diaria.
          </p>
        </div>
      )}
    </div>
  )
}
