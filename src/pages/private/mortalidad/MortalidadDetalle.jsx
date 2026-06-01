import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate, formatNumber, getLabelFromValue, CAUSAS_MORTALIDAD } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Pencil, Clock, History, CheckCircle2, Lock,
  Warehouse, Hash, Calendar, User, AlertTriangle,
  FileText, Activity, Skull,
} from 'lucide-react'

function msDesdeCreacion(created_at) {
  if (!created_at) return Infinity
  return Date.now() - new Date(created_at).getTime()
}

function formatearCambios(ant, nue) {
  const etiquetas = {
    fecha:          'Fecha',
    cantidad_bajas: 'Cantidad de bajas',
    causa:          'Causa',
    causa_otra:     'Causa específica',
    observaciones:  'Observaciones',
  }
  const cambios = []
  for (const campo of Object.keys(etiquetas)) {
    const valAnt = campo === 'causa' ? getLabelFromValue(CAUSAS_MORTALIDAD, ant[campo]) : (ant[campo] ?? '—')
    const valNue = campo === 'causa' ? getLabelFromValue(CAUSAS_MORTALIDAD, nue[campo]) : (nue[campo] ?? '—')
    if (String(valAnt) !== String(valNue)) {
      cambios.push({ campo: etiquetas[campo], anterior: valAnt, nuevo: valNue })
    }
  }
  return cambios
}

/* ── Field component ── */
function Field({ icon: Icon, label, value, accent, iconBg }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg || 'bg-stone-100 dark:bg-stone-800'}`}>
        <Icon className={`h-4 w-4 ${accent || 'text-stone-500 dark:text-stone-400'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

/* ── Section wrapper ── */
function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`card p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
        </div>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-xl space-y-4">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  )
}

export default function MortalidadDetalle() {
  const { id } = useParams()

  const { data: reg, isLoading } = useQuery({
    queryKey: ['mortalidad-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mortalidad')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero), registrado:perfiles(nombre_completo)')
        .eq('id', id)
        .single()
      return data
    },
  })

  const { data: auditoria } = useQuery({
    queryKey: ['auditoria-mortalidad', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria_mortalidad')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('mortalidad_id', id)
        .order('editado_at', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingSkeleton />
  if (!reg) return null

  const msTranscurridos = msDesdeCreacion(reg.created_at)
  const dentroDeVentana = msTranscurridos <= 24 * 3600 * 1000
  const msRestantes     = Math.max(0, 24 * 3600 * 1000 - msTranscurridos)
  const horasRestantes  = Math.floor(msRestantes / 3600000)
  const minsRestantes   = Math.floor((msRestantes % 3600000) / 60000)
  const causaLabel      = getLabelFromValue(CAUSAS_MORTALIDAD, reg.causa)

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader
        title="Detalle de mortalidad"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mortalidad', href: '/dashboard/mortalidad' },
          { label: 'Detalle' },
        ]}
        actions={
          dentroDeVentana && (
            <Link to={`/dashboard/mortalidad/${id}/editar`}>
              <Button variant="secondary" icon={Pencil}>Editar</Button>
            </Link>
          )
        }
      />

      {/* ── Hero card ── */}
      <div className="card overflow-hidden">
        <div className="relative h-28 bg-gradient-to-br from-red-600 via-rose-600 to-red-800 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-black/10" />
          <div className="absolute inset-0 flex items-center px-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
              <Skull className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Bajas registradas</p>
              <div className="flex items-baseline gap-2">
                <span className="text-white text-4xl font-black tabular-nums">{formatNumber(reg.cantidad_bajas)}</span>
                <span className="text-white/70 text-sm">aves</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fecha + causa strip */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-b border-stone-100 dark:border-stone-800">
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
            <Calendar className="h-3.5 w-3.5 text-stone-400" />
            <strong className="text-stone-800 dark:text-stone-200">{formatDate(reg.fecha)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {causaLabel}
          </span>
        </div>
      </div>

      {/* ── Ventana de edición ── */}
      {dentroDeVentana ? (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Ventana de edición activa</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Puedes editar este registro por <strong>{horasRestantes}h {minsRestantes}min</strong> más
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lock className="h-4 w-4 text-stone-400 dark:text-stone-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Registro bloqueado</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">El período de edición de 24 horas ha finalizado</p>
          </div>
        </div>
      )}

      {/* ── Ubicación ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Ubicación" icon={Warehouse}>
          <Field icon={Warehouse} label="Galpón" value={reg.galpon?.nombre}
            iconBg="bg-red-50 dark:bg-red-900/20" accent="text-red-500 dark:text-red-400" />
          <Field icon={Hash} label="Lote" value={reg.lote?.nombre_numero}
            iconBg="bg-red-50 dark:bg-red-900/20" accent="text-red-500 dark:text-red-400" />
        </Section>

        <Section title="Registro" icon={Calendar}>
          <Field icon={Calendar} label="Fecha del evento" value={formatDate(reg.fecha)} />
          <Field icon={User} label="Registrado por" value={reg.registrado?.nombre_completo} />
        </Section>
      </div>

      {/* ── Causa ── */}
      <Section title="Causa de mortalidad" icon={Activity}>
        <Field
          icon={AlertTriangle}
          label="Causa"
          value={causaLabel}
          iconBg="bg-red-50 dark:bg-red-900/20"
          accent="text-red-500 dark:text-red-400"
        />
        {reg.causa_otra && (
          <Field icon={FileText} label="Descripción específica" value={reg.causa_otra} />
        )}
        {reg.observaciones && (
          <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
            <Field icon={FileText} label="Observaciones" value={reg.observaciones} />
          </div>
        )}
      </Section>

      {/* ── Historial de ediciones ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
            <History className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Historial de ediciones</h3>
          {auditoria && auditoria.length > 0 && (
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              {auditoria.length} edición{auditoria.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {!auditoria ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : auditoria.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Sin modificaciones</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Este registro no ha sido editado.</p>
          </div>
        ) : (
          <ol className="relative border-l-2 border-stone-100 dark:border-stone-800 space-y-5 ml-2">
            {auditoria.map(entrada => {
              const cambios = formatearCambios(entrada.datos_anteriores, entrada.datos_nuevos)
              return (
                <li key={entrada.id} className="ml-5">
                  <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-stone-900 bg-violet-500" />
                  <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                        {entrada.editado?.nombre_completo || 'Usuario desconocido'}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                        {entrada.editado_at
                          ? new Date(entrada.editado_at).toLocaleString('es-CO', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                    {cambios.length === 0 ? (
                      <p className="text-xs text-stone-400 dark:text-stone-500 italic">Sin cambios detectados</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {cambios.map(c => (
                          <li key={c.campo} className="text-xs">
                            <span className="font-semibold text-stone-600 dark:text-stone-400">{c.campo}:</span>{' '}
                            <span className="line-through text-stone-400 dark:text-stone-500">{c.anterior || '—'}</span>
                            <span className="text-stone-400 dark:text-stone-500"> → </span>
                            <span className="font-semibold text-stone-800 dark:text-stone-100">{c.nuevo || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
