import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Pencil, Phone, Briefcase, Calendar, FileText,
  CreditCard, UserCheck, Clock,
} from 'lucide-react'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

const AVATAR_COLORS = [
  'from-amber-400 to-orange-500',
  'from-green-400 to-emerald-600',
  'from-blue-400 to-indigo-600',
  'from-purple-400 to-violet-600',
  'from-pink-400 to-rose-600',
  'from-teal-400 to-cyan-600',
]

function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

/* ── Info row inside profile card ── */
function InfoRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-stone-500 dark:text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wide font-medium mb-0.5">{label}</p>
        <p className={`text-sm font-semibold truncate ${accent || 'text-stone-800 dark:text-stone-100'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

/* ── Loading skeleton ── */
function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48"><Skeleton className="h-full w-full" /></div>
      <div className="card overflow-hidden">
        <div className="h-28 bg-stone-100 dark:bg-stone-800" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-5">
            <Skeleton className="w-20 h-20 rounded-3xl flex-shrink-0" />
            <div className="flex-1 space-y-2 pb-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
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

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Perfil de empleado"
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

      {/* ── Profile hero card ── */}
      <div className="card overflow-hidden">
        {/* Top color band */}
        <div className={`h-24 w-full bg-gradient-to-r ${isActivo ? 'from-amber-400 via-orange-400 to-primary-600' : 'from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-600'}`} />

        <div className="px-6 pb-6">
          {/* Avatar + name row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-5">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${avatarColor(e.nombre_completo)} flex items-center justify-center shadow-xl shadow-black/20 flex-shrink-0 border-4 border-white dark:border-stone-900`}>
              <span className="text-white font-black text-2xl">{getInitials(e.nombre_completo)}</span>
            </div>
            <div className="flex-1 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">{e.nombre_completo}</h2>
                <StatusBadge status={e.estado} />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{e.cargo || 'Sin cargo asignado'}</p>
            </div>
          </div>

          {/* Info rows */}
          <div>
            <InfoRow icon={CreditCard}  label="Documento de identidad" value={e.documento_identidad} />
            <InfoRow icon={Briefcase}   label="Cargo"                  value={e.cargo} />
            <InfoRow icon={Phone}       label="Teléfono"               value={e.telefono} />
            <InfoRow icon={Calendar}    label="Fecha de ingreso"       value={formatDate(e.fecha_ingreso)} />
            <InfoRow
              icon={UserCheck}
              label="Estado"
              value={isActivo ? 'Empleado activo' : 'Empleado inactivo'}
              accent={isActivo ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}
            />
            <InfoRow icon={Clock} label="Registrado el" value={formatDate(e.created_at)} />
          </div>
        </div>
      </div>

      {/* ── Notes card (conditional) ── */}
      {e.notas && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-gradient-to-br from-stone-400 to-stone-600 dark:from-stone-600 dark:to-stone-800 rounded-lg flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="section-title">Notas</h3>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">{e.notas}</p>
        </div>
      )}
    </div>
  )
}
