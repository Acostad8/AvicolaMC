import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, formatNumber, getLabelFromValue, CAUSAS_MORTALIDAD } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import AuditHistorial from '../../../components/ui/AuditHistorial'
import {
  Pencil, Clock, Lock, ShieldCheck,
  Building2, Calendar, AlertTriangle,
  FileText, Skull, TrendingDown,
} from 'lucide-react'

function msDesdeCreacion(created_at) {
  return created_at ? Date.now() - new Date(created_at).getTime() : Infinity
}

function formatearCambios(ant, nue) {
  const etiquetas = {
    fecha:          'Fecha',
    cantidad_bajas: 'Cantidad de bajas',
    causa:          'Causa',
    causa_otra:     'Causa específica',
    observaciones:  'Observaciones',
  }
  return Object.keys(etiquetas).reduce((acc, campo) => {
    const valAnt = campo === 'causa' ? getLabelFromValue(CAUSAS_MORTALIDAD, ant[campo]) : (ant[campo] ?? '—')
    const valNue = campo === 'causa' ? getLabelFromValue(CAUSAS_MORTALIDAD, nue[campo]) : (nue[campo] ?? '—')
    if (String(valAnt) !== String(valNue)) acc.push({ campo: etiquetas[campo], anterior: valAnt, nuevo: valNue })
    return acc
  }, [])
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

function InfoRow({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${accent || 'text-stone-800 dark:text-stone-100'}`}>{value || '—'}</p>
    </div>
  )
}

export default function MortalidadDetalle() {
  const { id } = useParams()
  const { isAdmin } = useAuth()

  const { data: reg, isLoading } = useQuery({
    queryKey: ['mortalidad-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mortalidad')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales), registrado:perfiles(nombre_completo)')
        .eq('id', id)
        .single()
      return data
    },
  })

  const { data: auditoria, isLoading: loadingAudit } = useQuery({
    queryKey: ['auditoria-mortalidad', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_mortalidad')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('mortalidad_id', id)
        .order('editado_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
    retry: 1,
  })

  if (isLoading) return (
    <div className="w-full space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    </div>
  )
  if (!reg) return null

  const msTranscurridos  = msDesdeCreacion(reg.created_at)
  const dentroDeVentana  = msTranscurridos <= 86_400_000
  const canEdit          = isAdmin || dentroDeVentana
  const msRestantes      = Math.max(0, 86_400_000 - msTranscurridos)
  const horasRestantes   = Math.floor(msRestantes / 3_600_000)
  const minsRestantes    = Math.floor((msRestantes % 3_600_000) / 60_000)
  const causaLabel       = getLabelFromValue(CAUSAS_MORTALIDAD, reg.causa)

  const avesActuales     = reg.lote?.cantidad_aves_actuales || 0
  const pctImpacto       = avesActuales > 0 ? Math.min(100, (reg.cantidad_bajas / (avesActuales + reg.cantidad_bajas)) * 100) : 0

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Detalle de mortalidad"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mortalidad', href: '/dashboard/mortalidad' },
          { label: 'Detalle' },
        ]}
        actions={canEdit && (
          <Link to={`/dashboard/mortalidad/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar</Button>
          </Link>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Hero card */}
          <div className="card overflow-hidden">
            <div className="relative h-36 bg-gradient-to-br from-red-600 via-rose-600 to-red-800 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-black/10" />
              <div className="absolute inset-0 flex items-center px-6 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Skull className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Bajas registradas</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-5xl font-black tabular-nums leading-none">{formatNumber(reg.cantidad_bajas)}</span>
                    <span className="text-white/70 text-sm">aves</span>
                  </div>
                </div>
                {avesActuales > 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/70 text-xs mb-1">Impacto en lote</p>
                    <p className="text-white text-2xl font-black tabular-nums">{pctImpacto.toFixed(1)}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fecha + causa strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-stone-100 dark:divide-stone-800">
              <div className="px-4 py-3">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">Fecha del evento</p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mt-0.5">{formatDate(reg.fecha)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">Causa principal</p>
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />{causaLabel}
                </span>
              </div>
              <div className="px-4 py-3 hidden sm:block">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">Galpón</p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mt-0.5">{reg.galpon?.nombre || '—'}</p>
              </div>
            </div>
          </div>


          {/* Causa */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Causa de mortalidad</h3>
            </div>

            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border border-red-100 dark:border-red-900/40">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-red-400 dark:text-red-500 uppercase tracking-wide font-semibold mb-0.5">Causa</p>
                <p className="text-base font-bold text-red-700 dark:text-red-300">{causaLabel}</p>
              </div>
            </div>

            {reg.causa_otra && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold mb-0.5">Descripción específica</p>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{reg.causa_otra}</p>
                </div>
              </div>
            )}
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

          {/* Impacto visual */}
          <div className="card p-4 space-y-3 bg-red-50/40 dark:bg-red-950/10 border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2 pb-3 border-b border-red-100 dark:border-red-900/30">
              <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 rounded-md flex items-center justify-center">
                <TrendingDown className="h-3 w-3 text-white" />
              </div>
              <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Impacto</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tabular-nums text-red-600 dark:text-red-400 leading-none">{formatNumber(reg.cantidad_bajas)}</span>
              <span className="text-sm text-red-400 dark:text-red-500 mb-1">bajas</span>
            </div>
            {avesActuales > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-400 dark:text-stone-500">
                  <span>Del total del lote</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{pctImpacto.toFixed(2)}%</span>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-700"
                    style={{ width: `${pctImpacto}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Estado de edición */}
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
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Tiempo restante: <strong>{horasRestantes}h {minsRestantes}min</strong></p>
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
          <SideCard title="Ubicación" icon={Building2} gradient="from-red-400 to-red-600">
            <div className="space-y-3">
              <InfoRow label="Galpón" value={reg.galpon?.nombre} />
              <InfoRow label="Lote"   value={reg.lote?.nombre_numero} />
            </div>
          </SideCard>

          {/* Registro */}
          <SideCard title="Registro" icon={Calendar} gradient="from-blue-400 to-blue-600">
            <div className="space-y-3">
              <InfoRow label="Fecha del evento"  value={formatDate(reg.fecha)} />
              <InfoRow label="Registrado por"    value={reg.registrado?.nombre_completo} />
              <InfoRow label="Fecha de creación" value={reg.created_at ? new Date(reg.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
            </div>
          </SideCard>

          {/* Causa resumen */}
          <div className="card p-4">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold mb-2">Causa registrada</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-3 w-3" />{causaLabel}
            </span>
            {reg.causa_otra && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 italic">{reg.causa_otra}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
