import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Pencil, Mail, Shield, Clock, User, Building2,
  Crown, CheckCircle2, XCircle, Egg, Activity,
  Skull, Syringe,
} from 'lucide-react'

/* ── Paleta por rol ── */
const ROL_META = {
  administrador: {
    label:  'Administrador',
    Icon:   Crown,
    band:   'from-amber-500 via-orange-500 to-amber-600',
    grad:   'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    text:   'text-amber-700 dark:text-amber-400',
    badge:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    sectionBadge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  encargado: {
    label:  'Encargado',
    Icon:   Shield,
    band:   'from-blue-500 via-indigo-500 to-blue-600',
    grad:   'from-blue-400 to-indigo-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    text:   'text-blue-700 dark:text-blue-400',
    badge:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    sectionBadge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
}

function getRolMeta(rol) { return ROL_META[rol] || ROL_META.encargado }

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

/* ── Field ── */
function Field({ icon: Icon, label, iconBg, accent, children, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg || 'bg-stone-100 dark:bg-stone-800'}`}>
        <Icon className={`h-4 w-4 ${accent || 'text-stone-500 dark:text-stone-400'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
        {children ?? <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 break-words">{value || '—'}</p>}
      </div>
    </div>
  )
}

/* ── Section ── */
function Section({ title, icon: Icon, badge, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
        </div>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 flex-1">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="card overflow-hidden">
        <div className="h-40 bg-stone-200 dark:bg-stone-700 animate-pulse" />
        <div className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  )
}

export default function UsuarioDetalle() {
  const { id }      = useParams()
  const { isAdmin } = useAuth()

  const { data: u, isLoading } = useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('perfiles')
        .select('*, empleado:empleados(nombre_completo, cargo)')
        .eq('id', id)
        .single()
      return data
    },
  })

  const { data: galpones } = useQuery({
    queryKey: ['galpones-encargado-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('galpones')
        .select('id, nombre, estado')
        .eq('encargado_id', id)
        .order('nombre')
      return data || []
    },
    enabled: !!id,
  })

  const { data: actividad } = useQuery({
    queryKey: ['usuario-actividad', id],
    queryFn: async () => {
      const [prod, mort, trat] = await Promise.all([
        supabase.from('produccion').select('id',   { count: 'exact', head: true }).eq('registrado_por', id),
        supabase.from('mortalidad').select('id',   { count: 'exact', head: true }).eq('registrado_por', id),
        supabase.from('tratamientos').select('id', { count: 'exact', head: true }).eq('registrado_por', id),
      ])
      return {
        produccion:   prod.count  ?? 0,
        mortalidad:   mort.count  ?? 0,
        tratamientos: trat.count  ?? 0,
      }
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingSkeleton />
  if (!u) return null

  const meta        = getRolMeta(u.rol)
  const { Icon }    = meta
  const isActivo    = u.estado === 'activo'
  const esEncargado = u.rol === 'encargado'
  const totalAct    = actividad ? actividad.produccion + actividad.mortalidad + actividad.tratamientos : null

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Detalle del usuario"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Usuarios', href: '/dashboard/usuarios' },
          { label: u.nombre_completo },
        ]}
        actions={
          isAdmin && (
            <Link to={`/dashboard/usuarios/${id}/editar`}>
              <Button variant="secondary" icon={Pencil}>Editar</Button>
            </Link>
          )
        }
      />

      {/* ── Hero card ── */}
      <div className="card overflow-hidden">

        {/* Gradiente con avatar y nombre dentro (sin solapamiento) */}
        <div className={`relative bg-gradient-to-br ${meta.band} px-6 pt-6 pb-10 overflow-hidden`}>
          <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-black/10 pointer-events-none" />
          {/* Icono de rol como marca de agua */}
          <Icon className="absolute bottom-2 right-6 h-24 w-24 text-white/10 pointer-events-none" />

          <div className="relative flex items-center gap-5">
            {/* Avatar */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${meta.grad} flex items-center justify-center flex-shrink-0 shadow-xl ring-2 ring-white/30`}>
              <span className="text-white font-black text-2xl select-none">{getInitials(u.nombre_completo)}</span>
            </div>

            {/* Nombre + rol + estado */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate drop-shadow-sm">
                {u.nombre_completo}
              </h2>
              <p className="text-sm text-white/70 mt-0.5 truncate">{u.email || '—'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Rol badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </span>
                {/* Estado badge */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isActivo ? 'bg-emerald-400/30 text-white' : 'bg-black/20 text-white/70'
                }`}>
                  {isActivo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {isActivo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info campos en el cuerpo blanco */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field icon={Mail}  label="Correo electrónico" value={u.email}
              iconBg={meta.iconBg} accent={meta.text} />
            <Field icon={Icon}  label="Rol de acceso"      value={meta.label}
              iconBg={meta.iconBg} accent={meta.text} />
            <Field icon={Clock} label="Último acceso"      value={u.ultimo_acceso ? formatDate(u.ultimo_acceso) : 'Nunca'} />
            <Field icon={Clock} label="Registrado"         value={formatDate(u.created_at)} />
          </div>
        </div>
      </div>

      {/* ── Empleado vinculado ── */}
      <Section title="Empleado vinculado" icon={User}>
        {u.empleado ? (
          <Field icon={User} label="Nombre completo" iconBg={meta.iconBg} accent={meta.text}>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{u.empleado.nombre_completo}</p>
            {u.empleado.cargo && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{u.empleado.cargo}</p>
            )}
          </Field>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 text-center gap-2">
            <User className="h-8 w-8 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-400 dark:text-stone-500">Sin empleado vinculado</p>
          </div>
        )}
      </Section>

      {/* ── Galpones (solo encargados) ── */}
      {esEncargado && (
        <Section
          title="Galpones asignados"
          icon={Building2}
          badge={
            galpones && galpones.length > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.sectionBadge}`}>
                {galpones.length}
              </span>
            )
          }
        >
          {!galpones ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-lg" />)}
            </div>
          ) : galpones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 text-center gap-2">
              <Building2 className="h-8 w-8 text-stone-300 dark:text-stone-600" />
              <p className="text-sm text-stone-400 dark:text-stone-500">Sin galpones asignados</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {galpones.map(g => (
                <Link key={g.id} to={`/dashboard/galpones/${g.id}`}>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:shadow-sm hover:scale-105 ${
                    g.estado === 'activo'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                  }`}>
                    <Building2 className="h-3 w-3" />
                    {g.nombre}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Actividad ── */}
      <Section
        title="Actividad registrada"
        icon={Activity}
        badge={
          totalAct !== null && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {totalAct} total
            </span>
          )
        }
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Producción',   value: actividad?.produccion,   Icon: Egg,     grad: 'from-amber-400 to-orange-500', light: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  href: '/dashboard/produccion'   },
            { label: 'Mortalidad',   value: actividad?.mortalidad,   Icon: Skull,   grad: 'from-red-500 to-rose-600',     light: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-600 dark:text-red-400',      href: '/dashboard/mortalidad'   },
            { label: 'Tratamientos', value: actividad?.tratamientos, Icon: Syringe, grad: 'from-blue-500 to-indigo-600',  light: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    href: '/dashboard/tratamientos' },
          ].map(item => (
            <Link key={item.label} to={item.href}>
              <div className={`rounded-2xl p-4 text-center transition-all hover:scale-105 hover:shadow-md ${item.light} group`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:shadow-md transition-shadow`}>
                  <item.Icon className="h-5 w-5 text-white" />
                </div>
                <p className={`text-2xl font-black tabular-nums ${item.text}`}>
                  {actividad != null ? item.value : <span className="animate-pulse text-stone-300">—</span>}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-medium">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
