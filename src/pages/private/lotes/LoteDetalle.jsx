import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useAutoRefreshAtMidnight } from '../../../hooks/useAutoRefreshAtMidnight'
import { useA11y } from '../../../context/AccessibilityContext'
import { formatDate, formatNumber, calcWeeksAge } from '../../../lib/utils'
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
} from 'lucide-react'

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

export default function LoteDetalle() {
  useAutoRefreshAtMidnight()
  const { id }     = useParams()
  const { isAdmin } = useAuth()
  const { noMotion } = useA11y()
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
      qc.invalidateQueries(['lote', id])
      qc.invalidateQueries(['lotes'])
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
            <h2 className="section-title mb-5">Ciclo del lote</h2>
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
