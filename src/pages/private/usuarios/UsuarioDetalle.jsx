import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import AuditHistorial from '../../../components/ui/AuditHistorial'
import {
  Pencil, Mail, Shield, Clock, User, Building2,
  Crown, CheckCircle2, XCircle, Egg, Activity,
  Skull, Syringe, CalendarDays, ArrowRight, UserPlus,
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
    ring:   'ring-amber-300 dark:ring-amber-700',
  },
  encargado: {
    label:  'Encargado',
    Icon:   Shield,
    band:   'from-blue-500 via-indigo-500 to-blue-600',
    grad:   'from-blue-400 to-indigo-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    text:   'text-blue-700 dark:text-blue-400',
    badge:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    ring:   'ring-blue-300 dark:ring-blue-700',
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
function Section({ title, icon: Icon, badge, children, className = '' }) {
  return (
    <div className={`card p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
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
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="h-44 bg-stone-200 dark:bg-stone-700 animate-pulse" />
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}

function formatearCambios(ant, nue) {
  if (!ant || !nue) return []
  const ESTADO_LABELS = { activo: 'Activo', inactivo: 'Inactivo' }
  const ROL_LABELS    = { administrador: 'Administrador', encargado: 'Encargado' }
  const campos = [
    { key: 'nombre_completo', label: 'Nombre' },
    { key: 'rol',             label: 'Rol' },
    { key: 'estado',          label: 'Estado' },
    { key: 'email',           label: 'Correo' },
    { key: 'empleado_id',     label: 'Empleado vinculado' },
  ]
  return campos.reduce((acc, c) => {
    const a = ant[c.key]; const n = nue[c.key]
    if (String(a ?? '') !== String(n ?? '')) {
      let va = a ?? '—'; let vn = n ?? '—'
      if (c.key === 'estado')      { va = ESTADO_LABELS[a] || a || '—'; vn = ESTADO_LABELS[n] || n || '—' }
      if (c.key === 'rol')         { va = ROL_LABELS[a]    || a || '—'; vn = ROL_LABELS[n]    || n || '—' }
      if (c.key === 'empleado_id') { va = a ? 'Asignado' : '—';         vn = n ? 'Asignado' : '—' }
      acc.push({ campo: c.label, anterior: va, nuevo: vn })
    }
    return acc
  }, [])
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

  const { data: creacion } = useQuery({
    queryKey: ['usuario-creacion', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria')
        .select('usuario_id, usuario_nombre, created_at')
        .eq('tabla', 'perfiles')
        .eq('operacion', 'INSERT')
        .eq('registro_id', id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!id,
  })

  const { data: historial, isLoading: historialLoading } = useQuery({
    queryKey: ['usuario-historial', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria')
        .select('id, usuario_nombre, datos_anteriores, datos_nuevos, created_at')
        .eq('tabla', 'perfiles')
        .eq('registro_id', id)
        .eq('operacion', 'UPDATE')
        .order('created_at', { ascending: false })
        .limit(30)
      return (data || [])
        .map(e => ({
          ...e,
          editado:    { nombre_completo: e.usuario_nombre },
          editado_at: e.created_at,
        }))
        .filter(e => formatearCambios(e.datos_anteriores, e.datos_nuevos).length > 0)
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

  const actItems = [
    { label: 'Producción',   value: actividad?.produccion,   Icon: Egg,     grad: 'from-amber-400 to-orange-500', light: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',  href: '/dashboard/produccion'   },
    { label: 'Mortalidad',   value: actividad?.mortalidad,   Icon: Skull,   grad: 'from-red-500 to-rose-600',     light: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-600 dark:text-red-400',      href: '/dashboard/mortalidad'   },
    { label: 'Tratamientos', value: actividad?.tratamientos, Icon: Syringe, grad: 'from-blue-500 to-indigo-600',  light: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',    href: '/dashboard/tratamientos' },
  ]

  return (
    <div className="space-y-5">
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
        <div className={`relative bg-gradient-to-br ${meta.band} px-8 py-8 overflow-hidden`}>
          {/* Decorativos */}
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 w-48 h-48 rounded-full bg-black/10 pointer-events-none" />
          <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
          <Icon className="absolute bottom-3 right-8 h-32 w-32 text-white/10 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className={`w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-2xl ring-4 ring-white/30`}>
              <span className="text-white font-black text-3xl select-none drop-shadow-sm">
                {getInitials(u.nombre_completo)}
              </span>
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white drop-shadow-sm leading-tight">
                {u.nombre_completo}
              </h2>
              <p className="text-sm text-white/70 mt-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                {u.email || '—'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${
                  isActivo ? 'bg-emerald-400/30 text-white' : 'bg-black/25 text-white/70'
                }`}>
                  {isActivo ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {isActivo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            {/* Mini stats a la derecha */}
            <div className="hidden lg:flex gap-6 text-right">
              <div>
                <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Registros totales</p>
                <p className="text-white font-black text-3xl tabular-nums drop-shadow-sm">
                  {totalAct ?? <span className="opacity-50">—</span>}
                </p>
              </div>
              {galpones && galpones.length > 0 && (
                <div>
                  <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Galpones</p>
                  <p className="text-white font-black text-3xl tabular-nums drop-shadow-sm">
                    {galpones.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra inferior de fechas */}
        <div className="px-8 py-4 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <Clock className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">Último acceso:</span>
            <span className="font-semibold text-stone-700 dark:text-stone-200">
              {u.ultimo_acceso ? formatDate(u.ultimo_acceso) : 'Nunca'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <CalendarDays className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">Miembro desde:</span>
            <span className="font-semibold text-stone-700 dark:text-stone-200">{formatDate(u.created_at)}</span>
          </div>
        </div>
      </div>

      {/* ── Cuerpo en dos columnas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Columna izquierda (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Información de cuenta */}
          <Section title="Información de cuenta" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field icon={Mail}         label="Correo electrónico" value={u.email}    iconBg={meta.iconBg} accent={meta.text} />
              <Field icon={Icon}         label="Rol de acceso"      value={meta.label} iconBg={meta.iconBg} accent={meta.text} />
              <Field icon={Clock}        label="Último acceso"      value={u.ultimo_acceso ? formatDate(u.ultimo_acceso) : 'Nunca'} />
              <Field icon={CalendarDays} label="Miembro desde"      value={formatDate(u.created_at)} />
              <Field
                icon={UserPlus}
                label="Creado por"
                iconBg="bg-violet-100 dark:bg-violet-900/40"
                accent="text-violet-600 dark:text-violet-400"
              >
                {creacion ? (
                  <div>
                    <Link
                      to={`/dashboard/usuarios/${creacion.usuario_id}`}
                      className="text-sm font-semibold text-stone-800 dark:text-stone-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {creacion.usuario_nombre}
                    </Link>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{formatDate(creacion.created_at)}</p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-stone-400 dark:text-stone-500 italic">Sin registro disponible</p>
                )}
              </Field>
            </div>
          </Section>

          {/* Empleado vinculado */}
          <Section title="Empleado vinculado" icon={User}>
            {u.empleado ? (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                  <User className={`h-5 w-5 ${meta.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">{u.empleado.nombre_completo}</p>
                  {u.empleado.cargo && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{u.empleado.cargo}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <User className="h-6 w-6 text-stone-300 dark:text-stone-600" />
                </div>
                <p className="text-sm text-stone-400 dark:text-stone-500">Sin empleado vinculado</p>
              </div>
            )}
          </Section>

          {/* Galpones (solo encargados) */}
          {esEncargado && (
            <Section
              title="Galpones asignados"
              icon={Building2}
              badge={
                galpones && galpones.length > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                    {galpones.length}
                  </span>
                )
              }
            >
              {!galpones ? (
                <div className="flex gap-2 flex-wrap">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-xl" />)}
                </div>
              ) : galpones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-stone-300 dark:text-stone-600" />
                  </div>
                  <p className="text-sm text-stone-400 dark:text-stone-500">Sin galpones asignados</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galpones.map(g => (
                    <Link key={g.id} to={`/dashboard/galpones/${g.id}`}>
                      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-0.5 ${
                        g.estado === 'activo'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                      }`}>
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-semibold truncate">{g.nombre}</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-auto flex-shrink-0 opacity-50" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Historial de cambios */}
          <div className="card p-5">
            <AuditHistorial
              entries={historial}
              loading={historialLoading}
              formatCambios={formatearCambios}
              emptyMessage="Este usuario no ha sido editado desde su creación."
            />
          </div>
        </div>

        {/* Columna derecha (1/3) — Actividad */}
        <div className="space-y-4">
          {/* Encabezado actividad */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              </div>
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 flex-1">Actividad registrada</h3>
              {totalAct !== null && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {totalAct} total
                </span>
              )}
            </div>

            <div className="space-y-3">
              {actItems.map(item => (
                <Link key={item.label} to={item.href} className="block group">
                  <div className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 ${item.light}`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.grad} flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                      <item.Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-3xl font-black tabular-nums leading-none ${item.text}`}>
                        {actividad != null
                          ? item.value
                          : <span className="text-stone-300 dark:text-stone-600 animate-pulse">—</span>}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">{item.label}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Estado rápido */}
          <div className="card p-5 space-y-3">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold">Estado de la cuenta</p>
            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              isActivo
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isActivo ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-stone-200 dark:bg-stone-700'
              }`}>
                {isActivo
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  : <XCircle     className="h-5 w-5 text-stone-500 dark:text-stone-400" />
                }
              </div>
              <div>
                <p className={`text-sm font-bold ${isActivo ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-400'}`}>
                  {isActivo ? 'Cuenta activa' : 'Cuenta inactiva'}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {isActivo ? 'El usuario puede iniciar sesión' : 'El usuario no puede acceder'}
                </p>
              </div>
            </div>
          </div>

          {/* Trazabilidad de creación */}
          <div className="card p-5 space-y-3">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold">Trazabilidad</p>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-violet-500 dark:text-violet-400 font-semibold uppercase tracking-wide mb-1">Creado por</p>
                {creacion ? (
                  <>
                    <Link
                      to={`/dashboard/usuarios/${creacion.usuario_id}`}
                      className="text-sm font-bold text-stone-800 dark:text-stone-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors leading-tight block truncate"
                    >
                      {creacion.usuario_nombre}
                    </Link>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 flex-shrink-0" />
                      {formatDate(creacion.created_at)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-stone-400 dark:text-stone-500 italic">Sin registro disponible</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
