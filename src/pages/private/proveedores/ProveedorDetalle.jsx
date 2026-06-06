import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Pencil, Package, Bird, Phone, Mail, MapPin,
  FileText, Truck, Layers, MoreHorizontal,
  CheckCircle2, XCircle, Tag, CalendarDays,
} from 'lucide-react'

const TIPO_META = {
  insumos: {
    label:   'Proveedor de insumos',
    Icon:    Package,
    color:   'from-teal-500 to-emerald-600',
    iconBg:  'bg-teal-100 dark:bg-teal-900/40',
    text:    'text-teal-700 dark:text-teal-400',
    tagBg:   'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    chipBg:  'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  },
  razas: {
    label:   'Proveedor de aves',
    Icon:    Bird,
    color:   'from-amber-500 to-orange-600',
    iconBg:  'bg-amber-100 dark:bg-amber-900/40',
    text:    'text-amber-700 dark:text-amber-400',
    tagBg:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    chipBg:  'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  ambos: {
    label:   'Insumos y aves',
    Icon:    Layers,
    color:   'from-blue-500 to-violet-600',
    iconBg:  'bg-blue-100 dark:bg-blue-900/40',
    text:    'text-blue-700 dark:text-blue-400',
    tagBg:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    chipBg:  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  otro: {
    label:   'Otro',
    Icon:    MoreHorizontal,
    color:   'from-stone-500 to-stone-700',
    iconBg:  'bg-stone-100 dark:bg-stone-800',
    text:    'text-stone-600 dark:text-stone-400',
    tagBg:   'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
    chipBg:  'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700',
  },
}

function getMeta(tipo) { return TIPO_META[tipo] || TIPO_META.otro }

/* ── Field: siempre visible, con estado vacío y soporte de enlace ── */
function Field({ icon: Icon, label, value, href, iconBg, accent }) {
  const hasValue = !!value
  const inner = (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${hasValue ? (iconBg || 'bg-stone-100 dark:bg-stone-800') : 'bg-stone-50 dark:bg-stone-800/50'}`}>
        <Icon className={`h-4 w-4 ${hasValue ? (accent || 'text-stone-500 dark:text-stone-400') : 'text-stone-300 dark:text-stone-600'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
        {hasValue
          ? <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 break-words">{value}</p>
          : <p className="text-sm italic text-stone-400 dark:text-stone-500">Sin información</p>
        }
      </div>
    </div>
  )
  if (href && hasValue) {
    return <a href={href} className="block hover:opacity-75 transition-opacity">{inner}</a>
  }
  return inner
}

/* ── Section ── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5 space-y-4">
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
    <div className="space-y-5">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function ProveedorDetalle() {
  const { id } = useParams()

  const { data: proveedor, isLoading } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: insumos } = useQuery({
    queryKey: ['proveedor-insumos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores_insumos')
        .select('insumo:insumos(id, nombre, unidad_medida, categoria)')
        .eq('proveedor_id', id)
      return (data || []).map(r => r.insumo).filter(Boolean)
    },
  })

  const { data: razas } = useQuery({
    queryKey: ['proveedor-razas', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores_razas')
        .select('raza:razas(id, nombre, tipo)')
        .eq('proveedor_id', id)
      return (data || []).map(r => r.raza).filter(Boolean)
    },
  })

  if (isLoading) return <LoadingSkeleton />
  if (!proveedor) return null

  const meta         = getMeta(proveedor.tipo_proveedor)
  const { Icon }     = meta
  const isActivo     = proveedor.estado === 'activo'
  const tieneInsumos = proveedor.tipo_proveedor === 'insumos' || proveedor.tipo_proveedor === 'ambos'
  const tieneRazas   = proveedor.tipo_proveedor === 'razas'   || proveedor.tipo_proveedor === 'ambos'

  const fechaRegistro = proveedor.created_at
    ? new Date(proveedor.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Detalle del proveedor"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Proveedores', href: '/dashboard/proveedores' },
          { label: proveedor.nombre },
        ]}
        actions={
          <Link to={`/dashboard/proveedores/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar</Button>
          </Link>
        }
      />

      {/* ── Hero ── */}
      <div className="card overflow-hidden">
        <div className={`relative h-28 bg-gradient-to-br ${meta.color} overflow-hidden`}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-black/10" />
          <div className="absolute inset-0 flex items-center px-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">{meta.label}</p>
              <h2 className="text-white text-xl font-bold truncate">{proveedor.nombre}</h2>
            </div>
            {/* Mini-stats */}
            <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
              <div className="text-center">
                <p className="text-white text-2xl font-bold tabular-nums leading-none">{insumos?.length ?? '—'}</p>
                <p className="text-white/70 text-xs mt-0.5">Insumos</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-white text-2xl font-bold tabular-nums leading-none">{razas?.length ?? '—'}</p>
                <p className="text-white/70 text-xs mt-0.5">Razas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status strip */}
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap border-b border-stone-100 dark:border-stone-800">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isActivo
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
          }`}>
            {isActivo
              ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
              : <><XCircle className="h-3 w-3" /> Inactivo</>
            }
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.tagBg}`}>
            <Tag className="h-3 w-3" />
            {meta.label}
          </span>
          {fechaRegistro && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 ml-auto">
              <CalendarDays className="h-3 w-3" />
              Registrado el {fechaRegistro}
            </span>
          )}
        </div>
      </div>

      {/* ── Layout dos columnas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Contacto — todos los campos siempre visibles */}
          <Section title="Información de contacto" icon={Phone}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                icon={Phone}
                label="Teléfono"
                value={proveedor.telefono}
                href={proveedor.telefono ? `tel:${proveedor.telefono}` : undefined}
                iconBg={meta.iconBg}
                accent={meta.text}
              />
              <Field
                icon={Mail}
                label="Correo electrónico"
                value={proveedor.correo}
                href={proveedor.correo ? `mailto:${proveedor.correo}` : undefined}
                iconBg={meta.iconBg}
                accent={meta.text}
              />
              <Field
                icon={MapPin}
                label="Dirección"
                value={proveedor.direccion}
                iconBg="bg-stone-100 dark:bg-stone-800"
                accent="text-stone-500 dark:text-stone-400"
              />
              <Field
                icon={Truck}
                label="Tipo de proveedor"
                value={meta.label}
                iconBg="bg-stone-100 dark:bg-stone-800"
                accent="text-stone-500 dark:text-stone-400"
              />
            </div>
          </Section>

          {/* Notas — siempre visible */}
          <Section title="Notas" icon={FileText}>
            {proveedor.notas ? (
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">
                {proveedor.notas}
              </p>
            ) : (
              <div className="flex items-center justify-center py-5 flex-col gap-2">
                <FileText className="h-7 w-7 text-stone-300 dark:text-stone-600" />
                <p className="text-sm italic text-stone-400 dark:text-stone-500">Sin notas registradas</p>
              </div>
            )}
          </Section>
        </div>

        {/* ── Derecha (1/3) ── */}
        <div className="space-y-5">

          {/* Insumos */}
          {(tieneInsumos || (insumos && insumos.length > 0)) && (
            <Section title={`Insumos suministrados${insumos ? ` (${insumos.length})` : ''}`} icon={Package}>
              {!insumos ? (
                <div className="flex gap-2 flex-wrap">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}
                </div>
              ) : insumos.length === 0 ? (
                <div className="flex items-center justify-center py-4 flex-col gap-2">
                  <Package className="h-7 w-7 text-stone-300 dark:text-stone-600" />
                  <p className="text-xs italic text-stone-400 dark:text-stone-500">Sin insumos asignados</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {insumos.map(i => (
                    <span
                      key={i.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.chipBg}`}
                    >
                      <Package className="h-2.5 w-2.5" />
                      {i.nombre}
                      {i.unidad_medida && (
                        <span className="opacity-60">· {i.unidad_medida}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Razas */}
          {(tieneRazas || (razas && razas.length > 0)) && (
            <Section title={`Razas / aves que provee${razas ? ` (${razas.length})` : ''}`} icon={Bird}>
              {!razas ? (
                <div className="flex gap-2 flex-wrap">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
                </div>
              ) : razas.length === 0 ? (
                <div className="flex items-center justify-center py-4 flex-col gap-2">
                  <Bird className="h-7 w-7 text-stone-300 dark:text-stone-600" />
                  <p className="text-xs italic text-stone-400 dark:text-stone-500">Sin razas asignadas</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {razas.map(r => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    >
                      <Bird className="h-2.5 w-2.5" />
                      {r.nombre}
                      {r.tipo && <span className="opacity-60">· {r.tipo}</span>}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
