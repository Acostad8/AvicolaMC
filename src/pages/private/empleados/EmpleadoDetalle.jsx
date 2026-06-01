import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Pencil, Phone, Briefcase, Calendar, FileText,
  CreditCard, UserCheck, Clock, CheckCircle2, XCircle,
} from 'lucide-react'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

const PALETTES = [
  'from-amber-500  via-orange-500  to-rose-500',
  'from-emerald-500 via-teal-500   to-cyan-600',
  'from-blue-500   via-indigo-500  to-violet-600',
  'from-purple-500 via-violet-500  to-fuchsia-600',
  'from-pink-500   via-rose-500    to-red-500',
  'from-teal-500   via-cyan-500    to-sky-600',
]

const AVATAR_GRAD = [
  'from-amber-400  to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-blue-400   to-indigo-600',
  'from-purple-400 to-violet-600',
  'from-pink-400   to-rose-600',
  'from-teal-400   to-cyan-600',
]

function getPaletteIdx(name = '') {
  return name.charCodeAt(0) % PALETTES.length
}

function InfoItem({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-stone-500 dark:text-stone-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold mb-0.5">
          {label}
        </p>
        <p className={`text-sm font-semibold break-words ${accent || 'text-stone-800 dark:text-stone-100'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="card overflow-hidden">
        <div className="h-40 bg-stone-200 dark:bg-stone-700 animate-pulse" />
        <div className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmpleadoDetalle() {
  const { id } = useParams()
  const { data: e, isLoading } = useQuery({
    queryKey: ['empleado', id],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('*').eq('id', id).single()
      return data
    },
  })

  if (isLoading) return <DetailSkeleton />
  if (!e) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Empleado no encontrado.</p>
    </div>
  )

  const isActivo = e.estado === 'activo'
  const idx      = getPaletteIdx(e.nombre_completo)
  const band     = isActivo ? PALETTES[idx] : 'from-stone-400 via-stone-500 to-stone-600'
  const avatarGrad = AVATAR_GRAD[idx]

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Perfil del empleado"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Empleados', href: '/dashboard/empleados' },
          { label: e.nombre_completo },
        ]}
        actions={
          <Link to={`/dashboard/empleados/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar</Button>
          </Link>
        }
      />

      <div className="card overflow-hidden">

        {/* ── Hero: gradiente con avatar y nombre dentro ── */}
        <div className={`relative bg-gradient-to-br ${band} px-6 pt-6 pb-10 overflow-hidden`}>
          {/* Blobs decorativos contenidos en el hero */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-black/10 pointer-events-none" />
          <div className="absolute top-3 right-28 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

          <div className="relative flex items-center gap-5">
            {/* Avatar */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center flex-shrink-0 shadow-xl ring-2 ring-white/30`}>
              <span className="text-white font-black text-2xl select-none">{getInitials(e.nombre_completo)}</span>
            </div>

            {/* Nombre + cargo + estado */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate drop-shadow-sm">
                {e.nombre_completo}
              </h2>
              <p className="text-sm text-white/75 mt-0.5 truncate">
                {e.cargo || 'Sin cargo asignado'}
              </p>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isActivo
                    ? 'bg-white/20 text-white'
                    : 'bg-black/20 text-white/70'
                }`}>
                  {isActivo
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <XCircle className="h-3 w-3" />
                  }
                  {isActivo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <InfoItem icon={CreditCard} label="Documento de identidad" value={e.documento_identidad} />
            <InfoItem icon={Phone}      label="Teléfono"               value={e.telefono} />
            <InfoItem icon={Briefcase}  label="Cargo"                  value={e.cargo} />
            <InfoItem icon={Calendar}   label="Fecha de ingreso"       value={formatDate(e.fecha_ingreso)} />
            <InfoItem
              icon={UserCheck}
              label="Estado"
              value={isActivo ? 'Activo' : 'Inactivo'}
              accent={isActivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'}
            />
            <InfoItem icon={Clock} label="Registrado el" value={formatDate(e.created_at)} />
          </div>
        </div>
      </div>

      {/* ── Notas ── */}
      {e.notas && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Notas</h3>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">
            {e.notas}
          </p>
        </div>
      )}
    </div>
  )
}
