import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { useAutoRefreshAtMidnight } from '../../../hooks/useAutoRefreshAtMidnight'
import { formatDate, formatNumber, calcWeeksAge } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import AuditHistorial from '../../../components/ui/AuditHistorial'
import { Pencil, Plus, Egg, Building2, Users, Layers, Calendar, Activity } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'
import { Skeleton } from '../../../components/ui/Skeleton'

const ESTADO_LABELS = {
  disponible:       'Disponible',
  en_produccion:    'En producción',
  en_mantenimiento: 'En mantenimiento',
  activo:           'Activo',
  inactivo:         'Inactivo',
}

function formatearCambios(ant, nue) {
  if (!ant || !nue) return []
  const campos = [
    { key: 'nombre',           label: 'Nombre' },
    { key: 'estado',           label: 'Estado' },
    { key: 'capacidad_maxima', label: 'Capacidad máxima' },
    { key: 'descripcion',      label: 'Descripción' },
    { key: 'encargado_id',     label: 'Encargado' },
  ]
  return campos.reduce((acc, c) => {
    const a = ant[c.key]
    const n = nue[c.key]
    if (String(a ?? '') !== String(n ?? '')) {
      let va = a ?? '—'
      let vn = n ?? '—'
      if (c.key === 'estado') { va = ESTADO_LABELS[a] || a || '—'; vn = ESTADO_LABELS[n] || n || '—' }
      if (c.key === 'encargado_id') { va = a ? 'Asignado' : 'Sin asignar'; vn = n ? 'Asignado' : 'Sin asignar' }
      if (c.key === 'capacidad_maxima') {
        va = a != null ? Number(a).toLocaleString('es-CO') : '—'
        vn = n != null ? Number(n).toLocaleString('es-CO') : '—'
      }
      acc.push({ campo: c.label, anterior: va, nuevo: vn })
    }
    return acc
  }, [])
}

/* ── Stat item ── */
function StatItem({ label, value, accent }) {
  return (
    <div className="space-y-1">
      <p className="detail-label">{label}</p>
      <p className={`detail-value ${accent || ''}`}>{value ?? '—'}</p>
    </div>
  )
}

/* ── Occupancy gauge ── */
function OccupancyGauge({ current, max }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const barColor = pct > 90 ? 'from-red-400 to-red-600'
    : pct > 70 ? 'from-amber-400 to-amber-600'
    : pct > 0  ? 'from-green-400 to-green-600'
    : 'from-stone-300 to-stone-400'
  const textColor = pct > 90 ? 'text-red-600 dark:text-red-400'
    : pct > 70 ? 'text-amber-600 dark:text-amber-400'
    : 'text-green-600 dark:text-green-400'

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Aves actuales</p>
          <p className={`text-2xl font-black tabular-nums ${textColor}`}>{formatNumber(current)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-500 dark:text-stone-400">Capacidad máxima</p>
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">{formatNumber(max)}</p>
        </div>
      </div>
      <div className="relative h-4 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[11px] font-bold mix-blend-luminosity ${pct > 40 ? 'text-white' : textColor}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center">
        {max - current > 0 ? `${formatNumber(max - current)} lugares disponibles` : 'Capacidad máxima alcanzada'}
      </p>
    </div>
  )
}

export default function GalponDetalle() {
  useAutoRefreshAtMidnight()
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const { dark } = useA11y()

  const gridColor    = dark ? '#292524' : '#f5f5f4'
  const axisColor    = dark ? '#78716c' : '#a8a29e'
  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#ffffff',
    border: `1px solid ${dark ? '#292524' : '#e7e5e4'}`,
    borderRadius: '12px',
    fontSize: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
  }

  const { data: galpon, isLoading } = useQuery({
    queryKey: ['galpon', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select(`
        *, encargado:perfiles(nombre_completo),
        lotes(*, raza:razas(nombre))
      `).eq('id', id).single()
      return data
    },
  })

  const { data: chart7 } = useQuery({
    queryKey: ['galpon-chart', id],
    queryFn: async () => {
      const desde = format(subDays(new Date(), 13), 'yyyy-MM-dd')
      const [{ data: prod }, { data: mort }] = await Promise.all([
        supabase.from('produccion').select('fecha, huevos_producidos').eq('galpon_id', id).gte('fecha', desde),
        supabase.from('mortalidad').select('fecha, cantidad_bajas').eq('galpon_id', id).gte('fecha', desde),
      ])
      return Array.from({ length: 14 }, (_, i) => {
        const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
        return {
          fecha:  date.slice(5),
          huevos: (prod || []).filter(p => p.fecha === date).reduce((s, p) => s + p.huevos_producidos, 0),
          bajas:  (mort || []).filter(m => m.fecha === date).reduce((s, m) => s + m.cantidad_bajas, 0),
        }
      })
    },
    enabled: !!id,
  })

  const { data: historial, isLoading: historialLoading } = useQuery({
    queryKey: ['galpon-historial', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria')
        .select('id, usuario_nombre, datos_anteriores, datos_nuevos, created_at')
        .eq('tabla', 'galpones')
        .eq('registro_id', id)
        .eq('operacion', 'UPDATE')
        .order('created_at', { ascending: false })
        .limit(30)
      // Adapta al formato que espera AuditHistorial
      return (data || []).map(e => ({
        ...e,
        editado:    { nombre_completo: e.usuario_nombre },
        editado_at: e.created_at,
      }))
    },
    enabled: !!id,
  })

  /* Loading skeleton */
  if (isLoading) return (
    <div className="space-y-5">
      <div className="h-8 w-48"><Skeleton className="h-full w-full" /></div>
      <div className="card p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      </div>
    </div>
  )

  if (!galpon) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Galpón no encontrado.</p>
    </div>
  )

  const loteActivo      = galpon.lotes?.find(l => l.estado === 'activo')
  const lotesAnteriores = galpon.lotes?.filter(l => l.estado !== 'activo') || []
  const avesActuales    = loteActivo?.cantidad_aves_actuales || 0

  const STRIP = {
    en_produccion:    'bg-gradient-to-r from-amber-400 to-primary-600',
    disponible:       'bg-gradient-to-r from-emerald-400 to-emerald-600',
    en_mantenimiento: 'bg-gradient-to-r from-blue-400 to-blue-600',
  }
  const ICON_BG = {
    en_produccion:    'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25',
    disponible:       'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25',
    en_mantenimiento: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/25',
  }
  const stripClass  = STRIP[galpon.estado]   || 'bg-stone-200 dark:bg-stone-700'
  const iconBgClass = ICON_BG[galpon.estado] || 'bg-stone-100 dark:bg-stone-800'

  return (
    <div className="space-y-5">
      <PageHeader
        title={galpon.nombre}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Galpones', href: '/dashboard/galpones' },
          { label: galpon.nombre },
        ]}
        actions={isAdmin && (
          <Link to={`/dashboard/galpones/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar galpón</Button>
          </Link>
        )}
      />

      {/* ── Hero card ── */}
      <div className="card overflow-hidden">
        <div className={`h-1.5 w-full ${stripClass}`} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Left: icon + name + metadata */}
            <div className="flex items-start gap-4 flex-1">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                <Building2 className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">{galpon.nombre}</h2>
                  <StatusBadge status={galpon.estado} />
                </div>
                {galpon.descripcion && (
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md leading-relaxed">{galpon.descripcion}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {galpon.encargado?.nombre_completo || 'Sin encargado asignado'}
                  </div>
                  {loteActivo?.raza?.nombre && (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                        {loteActivo.raza.nombre}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Creado el {formatDate(galpon.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: quick stats */}
            <div className="grid grid-cols-3 gap-4 sm:text-right sm:flex-shrink-0">
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Capacidad</p>
                <p className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">{formatNumber(galpon.capacidad_maxima)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Aves activas</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">{formatNumber(avesActuales)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Lotes</p>
                <p className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">{galpon.lotes?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Occupancy gauge */}
          <div className="mt-5 pt-5 border-t border-stone-100 dark:border-stone-800">
            <OccupancyGauge current={avesActuales} max={galpon.capacidad_maxima} />
          </div>
        </div>
      </div>

      {/* ── Lote activo ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Lote activo</h2>
          </div>
          {!loteActivo && (
            <Link to={`/dashboard/lotes/nuevo?galpon=${id}`}>
              <Button size="sm" icon={Plus} variant="secondary">Nuevo lote</Button>
            </Link>
          )}
        </div>

        {loteActivo ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatItem label="Número de lote"   value={loteActivo.nombre_numero} />
            <StatItem label="Raza"             value={loteActivo.raza?.nombre} />
            <StatItem label="Aves actuales"    value={formatNumber(loteActivo.cantidad_aves_actuales)} accent="text-green-600 dark:text-green-400" />
            <StatItem label="Aves iniciales"   value={formatNumber(loteActivo.cantidad_inicial_aves)} />
            <StatItem label="Semanas de vida"  value={`${calcWeeksAge(loteActivo.fecha_ingreso)} sem.`} />
            <StatItem label="Fecha de ingreso" value={formatDate(loteActivo.fecha_ingreso)} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Layers className="h-6 w-6 text-stone-400 dark:text-stone-500" aria-hidden="true" />
              </div>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">No hay lote activo</p>
              <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">Crea un nuevo lote para comenzar a registrar producción</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <Egg className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Producción — 14 días</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chart7 || []}>
              <defs>
                <linearGradient id="galponHuevos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="huevos" stroke="#d97706" strokeWidth={2} fill="url(#galponHuevos)" dot={{ r: 2.5, fill: '#d97706' }} activeDot={{ r: 5 }} name="Huevos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Mortalidad — 14 días</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart7 || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="bajas" fill="#ef4444" radius={[6, 6, 0, 0]} name="Bajas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard/produccion/nuevo">
          <Button icon={Egg}>Registrar producción hoy</Button>
        </Link>
        <Link to={`/dashboard/produccion?galpon=${id}`}>
          <Button variant="secondary">Ver historial de producción</Button>
        </Link>
        <Link to={`/dashboard/mortalidad/nuevo`}>
          <Button variant="secondary">Registrar mortalidad</Button>
        </Link>
      </div>

      {/* ── Historial de cambios ── */}
      <AuditHistorial
        entries={historial}
        loading={historialLoading}
        formatCambios={formatearCambios}
        emptyMessage="Este galpón no ha sido editado desde su creación."
      />

      {/* ── Lotes anteriores ── */}
      {lotesAnteriores.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-stone-400 to-stone-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title">Lotes anteriores</h2>
            <Badge variant="gray" className="ml-auto">{lotesAnteriores.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                <tr>
                  {['Lote', 'Raza', 'Ingreso', 'Salida', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {lotesAnteriores.map(l => (
                  <tr key={l.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">{l.nombre_numero}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{l.raza?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{formatDate(l.fecha_ingreso)}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{formatDate(l.fecha_salida) || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
