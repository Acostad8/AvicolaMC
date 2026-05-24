import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Pencil, Mail, Shield, Clock, User, Building2, Layers } from 'lucide-react'

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{label}</p>
      <div className="font-medium text-stone-800 dark:text-stone-100 text-sm">{children}</div>
    </div>
  )
}

export default function UsuarioDetalle() {
  const { id } = useParams()
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

  /* Actividad: conteo de registros del usuario */
  const { data: actividad } = useQuery({
    queryKey: ['usuario-actividad', id],
    queryFn: async () => {
      const [prod, mort, trat] = await Promise.all([
        supabase.from('produccion').select('id', { count: 'exact', head: true }).eq('registrado_por', id),
        supabase.from('mortalidad').select('id', { count: 'exact', head: true }).eq('registrado_por', id),
        supabase.from('tratamientos').select('id', { count: 'exact', head: true }).eq('registrado_por', id),
      ])
      return {
        produccion:  prod.count  ?? 0,
        mortalidad:  mort.count  ?? 0,
        tratamientos: trat.count ?? 0,
      }
    },
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="max-w-2xl space-y-4">
      <Skeleton className="h-10 w-64 mb-2" />
      <div className="card p-6 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
      </div>
    </div>
  )

  if (!u) return null

  const esEncargado = u.rol === 'encargado'

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title={u.nombre_completo}
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

      {/* ── Info principal ── */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xl font-bold">
              {u.nombre_completo.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">{u.nombre_completo}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">{u.email || '—'}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1.5">
            <Badge variant={u.rol === 'administrador' ? 'amber' : 'blue'} className="capitalize">
              {u.rol}
            </Badge>
            <StatusBadge status={u.estado} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm border-t border-stone-100 dark:border-stone-800 pt-5">
          <Field label="Correo electrónico">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-stone-400" />
              {u.email || '—'}
            </span>
          </Field>

          <Field label="Rol">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-stone-400" />
              <Badge variant={u.rol === 'administrador' ? 'amber' : 'blue'} className="capitalize">
                {u.rol}
              </Badge>
            </span>
          </Field>

          <Field label="Estado">
            <StatusBadge status={u.estado} />
          </Field>

          <Field label="Último acceso">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              {u.ultimo_acceso ? formatDate(u.ultimo_acceso) : 'Nunca'}
            </span>
          </Field>

          <Field label="Registrado">
            {formatDate(u.created_at)}
          </Field>

          <Field label="Empleado vinculado">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-stone-400" />
              {u.empleado?.nombre_completo
                ? <span>{u.empleado.nombre_completo}{u.empleado.cargo ? <span className="text-stone-400 dark:text-stone-500 font-normal"> · {u.empleado.cargo}</span> : null}</span>
                : <span className="text-stone-400 dark:text-stone-500 font-normal">Sin vincular</span>
              }
            </span>
          </Field>
        </div>
      </div>

      {/* ── Galpones asignados (solo encargados) ── */}
      {esEncargado && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Galpones asignados</h3>
            {galpones?.length > 0 && (
              <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">{galpones.length} galpón{galpones.length !== 1 ? 'es' : ''}</span>
            )}
          </div>

          {!galpones || galpones.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-500">Sin galpones asignados</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {galpones.map(g => (
                <Link key={g.id} to={`/dashboard/galpones/${g.id}`}>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:shadow-sm ${
                    g.estado === 'activo'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                  }`}>
                    <Building2 className="h-3 w-3" />
                    {g.nombre}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Actividad registrada ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-gradient-to-br from-stone-400 to-stone-600 rounded-lg flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Registros ingresados</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Producción',    value: actividad?.produccion,    color: 'text-amber-600 dark:text-amber-400',  href: '/dashboard/produccion' },
            { label: 'Mortalidad',    value: actividad?.mortalidad,    color: 'text-red-600 dark:text-red-400',     href: '/dashboard/mortalidad' },
            { label: 'Tratamientos',  value: actividad?.tratamientos,  color: 'text-blue-600 dark:text-blue-400',   href: '/dashboard/tratamientos' },
          ].map(item => (
            <div key={item.label} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold tabular-nums ${item.color}`}>
                {actividad ? item.value : '—'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
