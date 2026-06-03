import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useConfig } from '../../../context/ConfigContext'
import { formatDate, formatNumber } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import AuditHistorial from '../../../components/ui/AuditHistorial'
import {
  Egg, TrendingUp, User, Clock, Pencil, FileText,
  Lock, ShieldCheck, Building2, BarChart2,
} from 'lucide-react'

/* ── Postura gauge bar ── */
function PosturaBar({ pct }) {
  const { config } = useConfig()
  const { postura_excelente: exc, postura_buena: bue } = config.produccion
  const n = parseFloat(pct) || 0
  const color    = n >= exc ? 'from-emerald-400 to-emerald-500' : n >= bue ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'
  const txtColor = n >= exc ? 'text-emerald-600 dark:text-emerald-400' : n >= bue ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  const label    = n >= exc ? 'Excelente' : n >= bue ? 'Buena' : 'Baja postura'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Tasa de postura</span>
        <span className={`text-xs font-bold ${txtColor}`}>{n.toFixed(1)}% · {label}</span>
      </div>
      <div className="relative h-4 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${n}%` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-black text-white mix-blend-luminosity">{n.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

/* ── Stat tile ── */
function StatTile({ label, value, icon: Icon, gradient, accent }) {
  return (
    <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{label}</p>
        <p className={`text-base font-black tabular-nums leading-tight ${accent || 'text-stone-800 dark:text-stone-100'}`}>{value}</p>
      </div>
    </div>
  )
}

/* ── Sidebar card ── */
function SideCard({ title, icon: Icon, gradient, children }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className={`w-6 h-6 bg-gradient-to-br ${gradient} rounded-md flex items-center justify-center`}>
          <Icon className="h-3 w-3 text-white" />
        </div>
        <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/* ── Info row for sidebar ── */
function InfoRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`mt-0.5 ${mono ? 'font-mono text-xs text-stone-400 dark:text-stone-500' : 'text-sm font-semibold text-stone-800 dark:text-stone-100'}`}>
        {value || '—'}
      </p>
    </div>
  )
}

/* ── Audit diff renderer ── */
function formatearCambios(ant, nue) {
  const etiquetas = {
    huevos_producidos:   'Huevos producidos',
    consumo_alimento_kg: 'Consumo alimento (kg)',
    porcentaje_postura:  '% Postura',
    observaciones:       'Observaciones',
  }
  return Object.keys(etiquetas).reduce((acc, campo) => {
    const a = ant?.[campo] ?? null
    const b = nue?.[campo] ?? null
    if (String(a) !== String(b)) acc.push({ campo: etiquetas[campo], anterior: a, nuevo: b })
    return acc
  }, [])
}

function withinEditWindow(ts) { return !!ts && Date.now() - new Date(ts).getTime() < 86_400_000 }
function timeRemaining(ts) {
  const ms = Math.max(0, 86_400_000 - (Date.now() - new Date(ts).getTime()))
  return { h: Math.floor(ms / 3_600_000), m: Math.floor((ms % 3_600_000) / 60_000) }
}

export default function ProduccionDetalle() {
  const { id }      = useParams()
  const { isAdmin } = useAuth()

  const { data: reg, isLoading } = useQuery({
    queryKey: ['produccion-detalle', id],
    queryFn: async () => {
      const { data } = await supabase.from('produccion').select(`
        *,
        galpon:galpones(nombre),
        lote:lotes(nombre_numero, cantidad_aves_actuales, raza:razas(nombre)),
        registrado:perfiles(nombre_completo)
      `).eq('id', id).single()
      return data
    },
  })

  const { data: auditoria, isLoading: loadingAudit } = useQuery({
    queryKey: ['auditoria-produccion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_produccion')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('produccion_id', id)
        .order('editado_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
    retry: 1,
  })

  const dentroDeVentana = withinEditWindow(reg?.created_at)
  const canEdit         = isAdmin || dentroDeVentana
  const { h: horasRest, m: minsRest } = reg?.created_at ? timeRemaining(reg.created_at) : { h: 0, m: 0 }

  if (isLoading) return (
    <div className="w-full space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    </div>
  )

  if (!reg) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Registro no encontrado.</p>
    </div>
  )

  const eficiencia = reg.consumo_alimento_kg > 0 && reg.huevos_producidos > 0
    ? (reg.huevos_producidos / reg.consumo_alimento_kg).toFixed(2) : null

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Detalle de producción"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Producción', href: '/dashboard/produccion' },
          { label: formatDate(reg.fecha) },
        ]}
        actions={canEdit && (
          <Link to={`/dashboard/produccion/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar</Button>
          </Link>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Hero card */}
          <div className="card overflow-hidden">
            <div className="relative h-36 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-black/10" />
              <div className="absolute inset-0 flex items-center px-6 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Egg className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Huevos producidos</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-5xl font-black tabular-nums leading-none">{formatNumber(reg.huevos_producidos)}</span>
                    <span className="text-white/70 text-sm">huevos</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white/70 text-xs mb-1">Aves en lote</p>
                  <p className="text-white text-2xl font-black tabular-nums">{formatNumber(reg.lote?.cantidad_aves_actuales)}</p>
                </div>
              </div>
            </div>

            {/* Postura bar */}
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <PosturaBar pct={reg.porcentaje_postura} />
            </div>

            {/* Quick info row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-stone-100 dark:divide-stone-800">
              {[
                { label: 'Fecha',  value: formatDate(reg.fecha) },
                { label: 'Galpón', value: reg.galpon?.nombre },
                { label: 'Lote',   value: reg.lote?.nombre_numero },
                { label: 'Raza',   value: reg.lote?.raza?.nombre || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">{label}</p>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile label="Huevos producidos"   value={formatNumber(reg.huevos_producidos)}                             icon={Egg}       gradient="from-amber-400 to-amber-600"   accent="text-amber-600 dark:text-amber-400" />
            <StatTile label="Alimento consumido"  value={reg.consumo_alimento_kg != null ? `${reg.consumo_alimento_kg} kg` : '—'} icon={TrendingUp} gradient="from-green-400 to-green-600" />
            <StatTile
              label={eficiencia ? 'Eficiencia alimentaria' : '% Postura'}
              value={eficiencia ? `${eficiencia} h/kg` : `${reg.porcentaje_postura ?? 0}%`}
              icon={BarChart2} gradient="from-blue-400 to-blue-600" accent="text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Observaciones */}
          {reg.observaciones && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="w-7 h-7 bg-gradient-to-br from-stone-400 to-stone-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Observaciones</h3>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">{reg.observaciones}</p>
            </div>
          )}

          {/* Historial de auditoría */}
          <AuditHistorial
            entries={auditoria}
            loading={loadingAudit}
            formatCambios={formatearCambios}
            emptyMessage={
              dentroDeVentana || isAdmin
                ? 'Cualquier edición que realices aparecerá aquí.'
                : 'Este registro no fue editado dentro de su ventana de 24 h.'
            }
          />
        </div>

        {/* ── Columna derecha (1/3) ── */}
        <div className="space-y-4">

          {/* Ventana de edición */}
          {isAdmin ? (
            <div className="card p-4 flex items-start gap-3 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Acceso administrador</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Puedes editar este registro en cualquier momento.</p>
              </div>
            </div>
          ) : dentroDeVentana ? (
            <div className="card p-4 flex items-start gap-3 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Ventana de edición activa</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Tiempo restante: <strong>{horasRest}h {minsRest}min</strong></p>
              </div>
            </div>
          ) : (
            <div className="card p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Registro bloqueado</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">La ventana de 24 h ha finalizado.</p>
              </div>
            </div>
          )}

          {/* Ubicación */}
          <SideCard title="Ubicación" icon={Building2} gradient="from-amber-400 to-amber-600">
            <div className="space-y-3">
              <InfoRow label="Galpón" value={reg.galpon?.nombre} />
              <InfoRow label="Lote"   value={reg.lote?.nombre_numero} />
              {reg.lote?.raza?.nombre && <InfoRow label="Raza" value={reg.lote.raza.nombre} />}
            </div>
          </SideCard>

          {/* Registro */}
          <SideCard title="Registro" icon={User} gradient="from-blue-400 to-blue-600">
            <div className="space-y-3">
              <InfoRow label="Registrado por" value={reg.registrado?.nombre_completo} />
              <InfoRow
                label="Fecha de registro"
                value={new Date(reg.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              />
              <InfoRow label="ID del registro" value={`${reg.id?.slice(0, 8)}…`} mono />
            </div>
          </SideCard>

          {/* Postura badge */}
          <div className="card p-4 space-y-2">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">% Postura del día</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black tabular-nums text-stone-900 dark:text-stone-50 leading-none">
                {parseFloat(reg.porcentaje_postura || 0).toFixed(1)}%
              </span>
            </div>
            <PosturaBar pct={reg.porcentaje_postura} />
          </div>
        </div>

      </div>
    </div>
  )
}
