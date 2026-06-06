import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, getLabelFromValue, TIPOS_TRATAMIENTO } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import AuditHistorial from '../../../components/ui/AuditHistorial'
import {
  Pencil, Download, Syringe, Pill, FlaskConical, Shield,
  Bug, Activity, Building2, Calendar, CalendarCheck,
  User, ClipboardList, Package, Beaker, CheckCircle2, Clock3, Clock, Lock, ShieldCheck,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ── Mapa visual por tipo ── */
const TIPO_META = {
  vacunacion:      { Icon: Syringe,      color: 'from-blue-500 to-indigo-600',   light: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    ring: 'ring-blue-200 dark:ring-blue-800',    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'    },
  medicacion:      { Icon: Pill,         color: 'from-violet-500 to-purple-700', light: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800', badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
  antibiotico:     { Icon: Shield,       color: 'from-red-500 to-rose-700',      light: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-600 dark:text-red-400',       ring: 'ring-red-200 dark:ring-red-800',       badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'         },
  vitaminas:       { Icon: FlaskConical, color: 'from-amber-500 to-orange-600',  light: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-200 dark:ring-amber-800',   badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'  },
  desparasitacion: { Icon: Bug,          color: 'from-teal-500 to-emerald-700',  light: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-600 dark:text-teal-400',     ring: 'ring-teal-200 dark:ring-teal-800',     badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'     },
  otro:            { Icon: Activity,     color: 'from-stone-500 to-stone-700',   light: 'bg-stone-50 dark:bg-stone-800',      text: 'text-stone-600 dark:text-stone-400',   ring: 'ring-stone-200 dark:ring-stone-700',   badge: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'     },
}
const getMeta = tipo => TIPO_META[tipo] || TIPO_META.otro

/* ── Audit diff formatter ── */
function formatCambiosTratamiento(ant, nue) {
  const etiquetas = {
    fecha_inicio:     'Fecha de inicio',
    fecha_fin:        'Fecha de fin',
    tipo:             'Tipo de tratamiento',
    cantidad_usada:   'Cantidad usada',
    dosis_aplicacion: 'Dosis y aplicación',
    responsable:      'Responsable',
    estado:           'Estado',
    observaciones:    'Observaciones',
  }
  return Object.keys(etiquetas).reduce((acc, campo) => {
    const a = ant?.[campo] ?? null
    const b = nue?.[campo] ?? null
    if (String(a ?? '') !== String(b ?? ''))
      acc.push({ campo: etiquetas[campo], anterior: a ?? '—', nuevo: b ?? '—' })
    return acc
  }, [])
}

/* ── Duration progress bar ── */
function DurationBar({ fechaInicio, fechaFin, isActivo, meta }) {
  if (!fechaInicio) return null
  const inicio = new Date(fechaInicio + 'T00:00:00')
  const hoy    = new Date()

  if (!fechaFin) {
    const dias = Math.max(0, Math.floor((hoy - inicio) / 86_400_000))
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-stone-400 dark:text-stone-500">
          <span>Inicio: <strong className="text-stone-600 dark:text-stone-300">{formatDate(fechaInicio)}</strong></span>
          <span className={`font-semibold ${meta.text}`}>{dias} días en curso</span>
        </div>
        <div className="relative h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div className={`absolute inset-y-0 left-0 w-full bg-gradient-to-r ${meta.color} rounded-full opacity-60 animate-pulse`} />
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500">Sin fecha de fin definida</p>
      </div>
    )
  }

  const fin        = new Date(fechaFin + 'T00:00:00')
  const totalDias  = Math.max(1, Math.floor((fin - inicio) / 86_400_000))
  const diasElaps  = Math.min(totalDias, Math.max(0, Math.floor((hoy - inicio) / 86_400_000)))
  const pct        = Math.min(100, (diasElaps / totalDias) * 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-stone-400 dark:text-stone-500">
        <span className="font-medium text-stone-600 dark:text-stone-300">{formatDate(fechaInicio)}</span>
        <span className={`font-semibold ${meta.text}`}>{totalDias} días de duración</span>
        <span className="font-medium text-stone-600 dark:text-stone-300">{formatDate(fechaFin)}</span>
      </div>
      <div className="relative h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${meta.color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-stone-400 dark:text-stone-500">
        <span>Inicio</span>
        {!isActivo && <span className={`font-semibold ${meta.text}`}>Completado</span>}
        <span>Fin</span>
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

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mt-0.5">{value || '—'}</p>
    </div>
  )
}

/* ── Detail field ── */
function Field({ icon: Icon, label, value, iconBg, accent }) {
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

function LoadingSkeleton() {
  return (
    <div className="w-full space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      </div>
    </div>
  )
}

export default function TratamientoDetalle() {
  const { id }      = useParams()
  const { isAdmin } = useAuth()

  const { data: t, isLoading } = useQuery({
    queryKey: ['tratamiento', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tratamientos')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero), empleado:empleados(id, nombre_completo, cargo)')
        .eq('id', id)
        .single()
      return data
    },
  })

  const { data: auditoria, isLoading: loadingAudit } = useQuery({
    queryKey: ['auditoria-tratamiento', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_tratamientos')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('tratamiento_id', id)
        .order('editado_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id && isAdmin,
    retry: 1,
  })

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Sistema de Gestión Avícola MC', 14, 20)
    doc.setFontSize(12)
    doc.text('Registro de Tratamiento Veterinario', 14, 30)
    autoTable(doc, {
      startY: 40,
      head:   [['Campo', 'Valor']],
      body:   [
        ['Galpón',           t.galpon?.nombre || ''],
        ['Lote',             t.lote?.nombre_numero || ''],
        ['Fecha inicio',     formatDate(t.fecha_inicio)],
        ['Fecha fin',        formatDate(t.fecha_fin)],
        ['Tipo',             getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)],
        ['Producto',         t.nombre_producto || ''],
        ['Cantidad usada',   t.cantidad_usada != null ? String(t.cantidad_usada) : '—'],
        ['Dosis/Aplicación', t.dosis_aplicacion || ''],
        ['Responsable',      t.responsable || ''],
        ['Estado',           t.estado || ''],
        ['Observaciones',    t.observaciones || ''],
      ],
    })
    doc.save(`tratamiento-${id}.pdf`)
  }

  if (isLoading) return <LoadingSkeleton />
  if (!t) return null

  const meta        = getMeta(t.tipo)
  const { Icon }    = meta
  const tipoLabel   = getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)
  const isActivo    = t.estado === 'activo'
  const hasFechaFin = !!t.fecha_fin

  const msTranscurridos = t.created_at ? Date.now() - new Date(t.created_at).getTime() : Infinity
  const dentroDeVentana = msTranscurridos <= 86_400_000
  const canEdit         = isAdmin || dentroDeVentana
  const msRestantes     = Math.max(0, 86_400_000 - msTranscurridos)
  const horasRestantes  = Math.floor(msRestantes / 3_600_000)
  const minsRestantes   = Math.floor((msRestantes % 3_600_000) / 60_000)

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Detalle del tratamiento"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tratamientos', href: '/dashboard/tratamientos' },
          { label: tipoLabel },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={downloadPDF}>PDF</Button>
            {canEdit && (
              <Link to={`/dashboard/tratamientos/${id}/editar`}>
                <Button variant="secondary" icon={Pencil}>Editar</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Hero card */}
          <div className="card overflow-hidden">
            <div className={`relative h-36 bg-gradient-to-br ${meta.color} overflow-hidden`}>
              <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-black/10" />
              <div className="absolute inset-0 flex items-center px-6 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Tipo de tratamiento</p>
                  <h2 className="text-white text-3xl font-black leading-tight">{tipoLabel}</h2>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white`}>
                    {isActivo
                      ? <><Clock3 className="h-3.5 w-3.5" /> En curso</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" /> Finalizado</>
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Duration bar */}
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <DurationBar
                fechaInicio={t.fecha_inicio}
                fechaFin={t.fecha_fin}
                isActivo={isActivo}
                meta={meta}
              />
            </div>

            {/* Quick info row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-stone-100 dark:divide-stone-800">
              {[
                { label: 'Inicio',    value: formatDate(t.fecha_inicio) },
                { label: 'Fin',       value: hasFechaFin ? formatDate(t.fecha_fin) : 'Sin definir' },
                { label: 'Galpón',    value: t.galpon?.nombre },
                { label: 'Lote',      value: t.lote?.nombre_numero },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">{label}</p>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Producto aplicado */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className={`w-7 h-7 bg-gradient-to-br ${meta.color} rounded-lg flex items-center justify-center`}>
                <Package className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Producto aplicado</h3>
            </div>

            {/* Product highlight */}
            <div className={`flex items-center gap-3 ${meta.light} rounded-xl p-4 border ${meta.ring.replace('ring-', 'border-')}`}>
              <div className={`w-10 h-10 bg-gradient-to-br ${meta.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold mb-0.5">Producto / insumo</p>
                <p className={`text-base font-bold ${meta.text}`}>{t.nombre_producto || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={Beaker} label="Cantidad usada"
                value={t.cantidad_usada != null ? String(t.cantidad_usada) : null}
                iconBg={meta.light} accent={meta.text}
              />
              <Field icon={ClipboardList} label="Dosis y forma de aplicación"
                value={t.dosis_aplicacion}
                iconBg={meta.light} accent={meta.text}
              />
            </div>
          </div>

          {/* Responsable */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Empleado responsable</h3>
            </div>
            {t.empleado ? (
              <Link to={`/dashboard/empleados/${t.empleado.id}`} className="block group">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                      {t.empleado.nombre_completo}
                    </p>
                    {t.empleado.cargo && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{t.empleado.cargo}</p>
                    )}
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Ver perfil →</p>
                  </div>
                </div>
              </Link>
            ) : t.responsable ? (
              <Field
                icon={User}
                label="Responsable (registro histórico)"
                value={t.responsable}
                iconBg="bg-stone-100 dark:bg-stone-800"
                accent="text-stone-500 dark:text-stone-400"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <User className="h-6 w-6 text-stone-300 dark:text-stone-600" />
                </div>
                <p className="text-sm text-stone-400 dark:text-stone-500">Sin responsable asignado</p>
              </div>
            )}
          </div>

          {/* Observaciones */}
          {t.observaciones && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="w-7 h-7 bg-gradient-to-br from-stone-400 to-stone-600 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Observaciones</h3>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">{t.observaciones}</p>
            </div>
          )}

          {/* Historial de cambios (solo admin) */}
          {isAdmin && (
            <AuditHistorial
              entries={auditoria}
              loading={loadingAudit}
              formatCambios={formatCambiosTratamiento}
            />
          )}
        </div>

        {/* ── Columna derecha (1/3) ── */}
        <div className="space-y-4">

          {/* Estado */}
          <div className={`card p-4 space-y-3 ${meta.light} border ${meta.ring.replace('ring-', 'border-')}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">Estado del tratamiento</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.badge}`}>
                {isActivo
                  ? <><Clock3 className="h-3 w-3" /> En curso</>
                  : <><CheckCircle2 className="h-3 w-3" /> Finalizado</>
                }
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${meta.color} rounded-2xl flex items-center justify-center shadow-md flex-shrink-0`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className={`text-base font-black ${meta.text}`}>{tipoLabel}</p>
                {isActivo && <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Tratamiento activo</p>}
              </div>
            </div>
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


          {/* Fechas */}
          <SideCard title="Fechas" icon={Calendar} gradient="from-blue-400 to-blue-600">
            <div className="space-y-3">
              <InfoRow label="Fecha de inicio" value={formatDate(t.fecha_inicio)} />
              <InfoRow label="Fecha de fin"    value={hasFechaFin ? formatDate(t.fecha_fin) : 'Sin fecha de fin'} />
              {t.fecha_inicio && t.fecha_fin && (
                <div>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold">Duración total</p>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mt-0.5">
                    {Math.max(1, Math.floor((new Date(t.fecha_fin + 'T00:00:00') - new Date(t.fecha_inicio + 'T00:00:00')) / 86_400_000))} días
                  </p>
                </div>
              )}
            </div>
          </SideCard>

          {/* Ubicación */}
          <SideCard title="Ubicación" icon={Building2} gradient="from-stone-400 to-stone-600">
            <div className="space-y-3">
              <InfoRow label="Galpón" value={t.galpon?.nombre} />
              <InfoRow label="Lote"   value={t.lote?.nombre_numero} />
            </div>
          </SideCard>

          {/* Acciones */}
          <div className="card p-4 space-y-2">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-semibold mb-3">Acciones</p>
            <button
              onClick={downloadPDF}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700/80 transition-colors text-sm font-medium text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700"
            >
              <Download className="h-4 w-4 text-stone-400" />
              Descargar PDF
            </button>
            {canEdit && (
              <Link to={`/dashboard/tratamientos/${id}/editar`} className="block">
                <div className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700/80 transition-colors text-sm font-medium text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                  <Pencil className="h-4 w-4 text-stone-400" />
                  Editar tratamiento
                </div>
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
