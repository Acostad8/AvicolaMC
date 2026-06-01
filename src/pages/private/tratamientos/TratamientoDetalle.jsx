import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, getLabelFromValue, TIPOS_TRATAMIENTO } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Pencil, Download, Syringe, Pill, FlaskConical, Shield,
  Bug, Activity, Warehouse, Hash, Calendar, CalendarCheck,
  User, ClipboardList, Package, Beaker, CheckCircle2, Clock3,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ── Mapa visual por tipo de tratamiento ── */
const TIPO_META = {
  vacunacion:      { Icon: Syringe,      color: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-500',   light: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800'   },
  medicacion:      { Icon: Pill,         color: 'from-violet-500 to-purple-700', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800'},
  antibiotico:     { Icon: Shield,       color: 'from-red-500 to-rose-700',      bg: 'bg-red-500',    light: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-600 dark:text-red-400',       border: 'border-red-200 dark:border-red-800'     },
  vitaminas:       { Icon: FlaskConical, color: 'from-amber-500 to-orange-600',  bg: 'bg-amber-500',  light: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-800' },
  desparasitacion: { Icon: Bug,          color: 'from-teal-500 to-emerald-700',  bg: 'bg-teal-500',   light: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-600 dark:text-teal-400',     border: 'border-teal-200 dark:border-teal-800'   },
  otro:            { Icon: Activity,     color: 'from-stone-500 to-stone-700',   bg: 'bg-stone-500',  light: 'bg-stone-50 dark:bg-stone-800',       text: 'text-stone-600 dark:text-stone-400',   border: 'border-stone-200 dark:border-stone-700' },
}

function getMeta(tipo) {
  return TIPO_META[tipo] || TIPO_META.otro
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
    <div className="max-w-2xl space-y-4">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
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
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero)')
        .eq('id', id)
        .single()
      return data
    },
  })

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Sistema de Gestión Avícola MC', 14, 20)
    doc.setFontSize(12)
    doc.text('Registro de Tratamiento Veterinario', 14, 30)
    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Valor']],
      body: [
        ['Galpón',         t.galpon?.nombre || ''],
        ['Lote',           t.lote?.nombre_numero || ''],
        ['Fecha inicio',   formatDate(t.fecha_inicio)],
        ['Fecha fin',      formatDate(t.fecha_fin)],
        ['Tipo',           getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)],
        ['Producto',       t.nombre_producto || ''],
        ['Cantidad usada', t.cantidad_usada != null ? String(t.cantidad_usada) : '—'],
        ['Dosis/Aplicación', t.dosis_aplicacion || ''],
        ['Responsable',    t.responsable || ''],
        ['Estado',         t.estado || ''],
        ['Observaciones',  t.observaciones || ''],
      ],
    })
    doc.save(`tratamiento-${id}.pdf`)
  }

  if (isLoading) return <LoadingSkeleton />
  if (!t) return null

  const meta       = getMeta(t.tipo)
  const { Icon }   = meta
  const tipoLabel  = getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)
  const isActivo   = t.estado === 'activo'
  const hasFechaFin = !!t.fecha_fin

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="Detalle del tratamiento"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tratamientos', href: '/dashboard/tratamientos' },
          { label: tipoLabel },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={downloadPDF}>
              PDF
            </Button>
            {isAdmin && (
              <Link to={`/dashboard/tratamientos/${id}/editar`}>
                <Button variant="secondary" icon={Pencil}>Editar</Button>
              </Link>
            )}
          </div>
        }
      />

      {/* ── Hero card ── */}
      <div className="card overflow-hidden">
        <div className={`relative h-28 bg-gradient-to-br ${meta.color} overflow-hidden`}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-black/10" />
          <div className="absolute inset-0 flex items-center px-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Tipo de tratamiento</p>
              <h2 className="text-white text-2xl font-bold">{tipoLabel}</h2>
            </div>
          </div>
        </div>

        {/* Status + quick dates strip */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-b border-stone-100 dark:border-stone-800">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isActivo
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
          }`}>
            {isActivo
              ? <><Clock3 className="h-3 w-3" /> En curso</>
              : <><CheckCircle2 className="h-3 w-3" /> Finalizado</>
            }
          </span>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            Inicio: <strong className="text-stone-700 dark:text-stone-300">{formatDate(t.fecha_inicio)}</strong>
          </span>
          {hasFechaFin && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              Fin: <strong className="text-stone-700 dark:text-stone-300">{formatDate(t.fecha_fin)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ── Ubicación + Fechas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Ubicación" icon={Warehouse}>
          <Field icon={Warehouse} label="Galpón" value={t.galpon?.nombre}
            iconBg={meta.light} accent={meta.text} />
          <Field icon={Hash} label="Lote" value={t.lote?.nombre_numero}
            iconBg={meta.light} accent={meta.text} />
        </Section>

        <Section title="Fechas" icon={Calendar}>
          <Field icon={Calendar}      label="Inicio del tratamiento" value={formatDate(t.fecha_inicio)} />
          <Field icon={CalendarCheck} label="Fin del tratamiento"    value={hasFechaFin ? formatDate(t.fecha_fin) : 'Sin fecha de fin'} />
        </Section>
      </div>

      {/* ── Producto ── */}
      <Section title="Producto aplicado" icon={Package}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field icon={Package} label="Producto / insumo" value={t.nombre_producto}
            iconBg={meta.light} accent={meta.text} />
          <Field icon={Beaker} label="Cantidad usada" value={t.cantidad_usada != null ? String(t.cantidad_usada) : null} />
        </div>
        <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
          <Field icon={ClipboardList} label="Dosis y forma de aplicación" value={t.dosis_aplicacion} />
        </div>
      </Section>

      {/* ── Responsable ── */}
      <Section title="Responsable" icon={User}>
        <Field icon={User} label="Veterinario / encargado" value={t.responsable}
          iconBg={meta.light} accent={meta.text} />
      </Section>

      {/* ── Observaciones ── */}
      {t.observaciones && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Observaciones</h3>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">
            {t.observaciones}
          </p>
        </div>
      )}
    </div>
  )
}
