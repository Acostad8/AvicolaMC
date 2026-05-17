import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useA11y } from '../../../context/AccessibilityContext'
import { formatDate, formatNumber, calcWeeksAge } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ui/Modal'
import { Skeleton } from '../../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import {
  CheckCircle, PauseCircle, Layers, Bird, Building2,
  Calendar, TrendingDown, Activity, Clock, AlertTriangle,
  CheckCircle2, Info,
} from 'lucide-react'

/* ── Scroll animation hook ── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

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
function SurvivalGauge({ actual, inicial, visible }) {
  const pct = inicial > 0 ? Math.min((actual / inicial) * 100, 100) : 0
  const bajas = inicial - actual
  const color = pct >= 95 ? 'from-green-400 to-emerald-500'
    : pct >= 85 ? 'from-amber-400 to-amber-500'
    : 'from-red-400 to-red-500'
  const textColor = pct >= 95 ? 'text-green-600 dark:text-green-400'
    : pct >= 85 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'
  const count = useCountUp(Math.round(pct * 10) / 10, visible)

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Aves actuales</p>
          <p className="text-2xl font-black text-stone-900 dark:text-stone-50 tabular-nums">{formatNumber(actual)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-500 dark:text-stone-400">Bajas acumuladas</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{formatNumber(bajas)}</p>
        </div>
      </div>
      <div className="relative h-5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
          style={{ width: visible ? `${pct}%` : '0%' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-black mix-blend-luminosity ${pct > 40 ? 'text-white' : textColor}`}>
            {visible ? count : 0}%
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
function TimelineStep({ icon: Icon, label, date, active, done, color }) {
  return (
    <div className={`flex items-center gap-3 ${active || done ? '' : 'opacity-40'}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-2 transition-all ${done ? `bg-gradient-to-br ${color} ring-transparent shadow-sm` : active ? `bg-white dark:bg-stone-900 ring-current ${color.includes('green') ? 'text-green-500 ring-green-400' : 'text-stone-400 ring-stone-300 dark:ring-stone-600'}` : 'bg-stone-100 dark:bg-stone-800 ring-stone-200 dark:ring-stone-700'}`}>
        <Icon className={`h-4 w-4 ${done ? 'text-white' : ''}`} aria-hidden="true" />
      </div>
      <div>
        <p className={`text-sm font-semibold ${active ? 'text-stone-900 dark:text-stone-50' : done ? 'text-stone-700 dark:text-stone-200' : 'text-stone-400 dark:text-stone-600'}`}>{label}</p>
        {date && <p className="text-xs text-stone-400 dark:text-stone-500">{date}</p>}
      </div>
    </div>
  )
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
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const { noMotion } = useA11y()
  const qc = useQueryClient()
  const [confirmAction, setConfirmAction] = useState(null)

  const [heroRef, heroVisible]   = useReveal(0.1)
  const [statsRef, statsVisible] = useReveal(0.1)
  const [tlRef, tlVisible]       = useReveal(0.1)

  const { data: lote, isLoading } = useQuery({
    queryKey: ['lote', id],
    queryFn: async () => {
      const { data } = await supabase.from('lotes')
        .select(`*, galpon:galpones(nombre, capacidad_maxima), raza:razas(nombre, tipo)`)
        .eq('id', id).single()
      return data
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
      toast.success(nuevoEstado === 'finalizado' ? 'Lote finalizado correctamente' : 'Lote suspendido')
      setConfirmAction(null)
    },
    onError: e => toast.error(e.message || 'Error al actualizar'),
  })

  if (isLoading) return (
    <div className="max-w-2xl space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="card p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-5 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      </div>
    </div>
  )

  if (!lote) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Lote no encontrado.</p>
    </div>
  )

  const esActivo    = lote.estado === 'activo'
  const esSuspendido = lote.estado === 'suspendido'
  const esFinalizado = lote.estado === 'finalizado'
  const semanas      = esActivo ? calcWeeksAge(lote.fecha_ingreso) : null

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title={`Lote ${lote.nombre_numero}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lotes', href: '/dashboard/lotes' },
          { label: lote.nombre_numero },
        ]}
        actions={isAdmin && (esActivo || esSuspendido) && (
          <div className="flex gap-2">
            {esActivo && (
              <Button variant="secondary" size="sm" icon={PauseCircle} onClick={() => setConfirmAction('suspendido')}>
                Suspender
              </Button>
            )}
            <Button variant="danger" size="sm" icon={CheckCircle} onClick={() => setConfirmAction('finalizado')}>
              Finalizar lote
            </Button>
          </div>
        )}
      />

      {/* Status banner */}
      {(esSuspendido || esFinalizado) && (
        <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 border text-sm ${esSuspendido ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-300' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'}`}>
          {esSuspendido ? <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />}
          <p>
            {esSuspendido
              ? 'Este lote está suspendido. No se pueden registrar producción, mortalidad ni tratamientos.'
              : 'Este lote ha finalizado su ciclo productivo. El historial completo se mantiene disponible.'}
          </p>
        </div>
      )}

      {/* Hero card */}
      <div
        ref={heroRef}
        className={`card overflow-hidden ${!noMotion ? `transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` : ''}`}
      >
        <div className={`h-1.5 w-full ${esActivo ? 'bg-gradient-to-r from-green-400 to-emerald-500' : esSuspendido ? 'bg-gradient-to-r from-yellow-400 to-amber-400' : 'bg-stone-200 dark:bg-stone-700'}`} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${esActivo ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/25' : 'bg-stone-100 dark:bg-stone-800'}`}>
                <Layers className={`h-7 w-7 ${esActivo ? 'text-white' : 'text-stone-400 dark:text-stone-500'}`} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">{lote.nombre_numero}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <StatusBadge status={lote.estado} />
                  {lote.raza?.nombre && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                      <Bird className="h-3 w-3" aria-hidden="true" />{lote.raza.nombre}
                    </span>
                  )}
                  {esActivo && semanas && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      <Clock className="h-3 w-3" aria-hidden="true" />{semanas} semanas
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 flex-shrink-0">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {lote.galpon?.nombre}
            </div>
          </div>

          {/* Survival gauge */}
          <SurvivalGauge
            actual={lote.cantidad_aves_actuales}
            inicial={lote.cantidad_inicial_aves}
            visible={heroVisible || noMotion}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div
        ref={statsRef}
        className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${!noMotion ? `transition-all duration-700 delay-100 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` : ''}`}
      >
        {[
          { label: 'Aves iniciales',  value: formatNumber(lote.cantidad_inicial_aves),   icon: Bird,         color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Aves actuales',   value: formatNumber(lote.cantidad_aves_actuales),   icon: Activity,     color: 'text-green-600 dark:text-green-400' },
          { label: 'Bajas totales',   value: formatNumber((lote.cantidad_inicial_aves || 0) - (lote.cantidad_aves_actuales || 0)), icon: TrendingDown, color: 'text-red-600 dark:text-red-400' },
          { label: 'Cap. del galpón', value: formatNumber(lote.galpon?.capacidad_maxima), icon: Building2,    color: '' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <div
            key={label}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-center"
            style={!noMotion ? { animation: statsVisible ? `fadeInUp 0.4s ease-out ${i * 70}ms both` : 'none' } : {}}
          >
            <Icon className={`h-5 w-5 mx-auto mb-2 ${color || 'text-stone-400 dark:text-stone-500'}`} aria-hidden="true" />
            <p className={`text-xl font-black tabular-nums ${color || 'text-stone-900 dark:text-stone-50'}`}>{value}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Dates & info */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Información del lote</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Fecha de ingreso" value={formatDate(lote.fecha_ingreso)} />
          <Detail label="Fecha de salida"  value={lote.fecha_salida ? formatDate(lote.fecha_salida) : '—'} />
          <Detail label="Semanas de vida"  value={esActivo ? `${semanas} sem.` : '—'} accent="text-green-600 dark:text-green-400" />
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

      {/* Timeline */}
      <div
        ref={tlRef}
        className={`card p-5 ${!noMotion ? `transition-all duration-700 delay-200 ${tlVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` : ''}`}
      >
        <h2 className="section-title mb-5">Ciclo del lote</h2>
        <div className="relative">
          <div className="absolute left-[17px] top-0 bottom-0 w-px bg-stone-200 dark:bg-stone-700" aria-hidden="true" />
          <div className="space-y-5 pl-2">
            <TimelineStep icon={CheckCircle2} label="Ingreso al galpón"  date={formatDate(lote.fecha_ingreso)} done color="from-green-400 to-green-600" active={false} />
            {esSuspendido && <TimelineStep icon={PauseCircle} label="Lote suspendido" date="En curso" active color="from-yellow-400 to-amber-500" done={false} />}
            {esFinalizado
              ? <TimelineStep icon={CheckCircle} label="Lote finalizado" date={formatDate(lote.fecha_salida)} done color="from-blue-400 to-blue-600" active={false} />
              : <TimelineStep icon={CheckCircle} label="Finalización" date="Pendiente" done={false} active={false} color="from-blue-400 to-blue-600" />
            }
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
    </div>
  )
}
