import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Smartphone, Laptop, Tablet, CheckCircle2, Power, AlertTriangle,
  Pencil, Check, X, CloudUpload,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import { TableSkeleton } from '../../../components/ui/Skeleton'
import { listDispositivos, toggleActivo, aceptarPerdida, renombrarDispositivo } from '../../../lib/devices'
import toast from 'react-hot-toast'

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function iconPlataforma(p) {
  if (p === 'android' || p === 'ios') return Smartphone
  if (p === 'desktop') return Laptop
  return Tablet
}

function PlataformaBadge({ p }) {
  const map = {
    android: { label: 'Android', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    ios:     { label: 'iOS',     cls: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
    desktop: { label: 'Escritorio', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  }
  const m = map[p] || { label: p || '—', cls: 'bg-stone-100 text-stone-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  )
}

function hace(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

function RowNombre({ row, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(row.nombre || '')
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          className="input-base text-sm py-1 px-2 w-44"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Nombre del dispositivo"
          autoFocus
        />
        <button onClick={() => { onSave(val); setEditing(false) }} className="p-1 text-green-600 hover:bg-green-50 rounded">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setVal(row.nombre || ''); setEditing(false) }} className="p-1 text-stone-400 hover:bg-stone-100 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 text-sm text-stone-700 dark:text-stone-200 hover:text-primary-600 group"
    >
      <span className="truncate max-w-[180px]">{row.nombre || <em className="text-stone-400">sin nombre</em>}</span>
      <Pencil className="h-3 w-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

export default function Dispositivos() {
  const qc = useQueryClient()
  const { data: rows, isLoading } = useQuery({
    queryKey: ['dispositivos'],
    queryFn: listDispositivos,
    refetchInterval: 30_000,
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }) => toggleActivo(id, activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispositivos'] }),
    onError: (e) => toast.error(e.message || 'Error'),
  })

  const perdidaMut = useMutation({
    mutationFn: aceptarPerdida,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispositivos'] })
      toast.success('Pérdida aceptada — pendientes descartados en servidor')
    },
    onError: (e) => toast.error(e.message || 'Error'),
  })

  const renameMut = useMutation({
    mutationFn: ({ id, nombre }) => renombrarDispositivo(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispositivos'] }),
    onError: (e) => toast.error(e.message || 'Error'),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dispositivos"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Dispositivos' }]}
      />

      <div className="card p-5">
        <div className="flex items-start gap-2 mb-4 text-xs text-stone-500 dark:text-stone-400">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          <p>
            Política: <strong>1 tablet por encargado</strong>. Si un dispositivo se pierde con cambios sin sincronizar, usa "Aceptar pérdida"
            para liberar al usuario y descartar esos cambios en servidor (irreversible).
          </p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : !rows?.length ? (
          <EmptyState title="Sin dispositivos registrados" description="Los dispositivos aparecen aquí cuando los usuarios inician sesión." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 dark:border-stone-800 text-left text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Usuario</th>
                  <th className="px-5 py-3 font-semibold">Dispositivo</th>
                  <th className="px-5 py-3 font-semibold">Plataforma</th>
                  <th className="px-5 py-3 font-semibold">Últ. visto</th>
                  <th className="px-5 py-3 font-semibold">Últ. sync</th>
                  <th className="px-5 py-3 font-semibold">Pendientes</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {rows.map((r) => {
                  const Icon = iconPlataforma(r.plataforma)
                  return (
                    <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-800 dark:text-stone-100">
                            {r.perfiles?.nombre_completo || '—'}
                          </span>
                          <span className="text-[11px] text-stone-400 capitalize">{r.perfiles?.rol}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-stone-400 flex-shrink-0" />
                          <RowNombre
                            row={r}
                            onSave={(nombre) => renameMut.mutate({ id: r.id, nombre: nombre || null })}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3"><PlataformaBadge p={r.plataforma} /></td>
                      <td className="px-5 py-3 text-xs text-stone-500">{hace(r.last_seen)}</td>
                      <td className="px-5 py-3 text-xs text-stone-500">
                        {r.last_sync ? formatDateTime(r.last_sync) : <span className="text-stone-400">nunca</span>}
                      </td>
                      <td className="px-5 py-3">
                        {r.pending_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <CloudUpload className="h-3 w-3" /> {r.pending_count}
                          </span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {r.activo ? (
                          <span className="text-[11px] text-green-700 dark:text-green-400 font-medium">Activo</span>
                        ) : (
                          <span className="text-[11px] text-stone-500">Desactivado</span>
                        )}
                        {r.perdida_aceptada && (
                          <span className="block text-[10px] text-red-500 mt-0.5">Pérdida aceptada</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {r.pending_count > 0 && !r.perdida_aceptada && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (confirm(`¿Aceptar pérdida de ${r.pending_count} cambio${r.pending_count === 1 ? '' : 's'} del dispositivo? Esta acción es irreversible.`)) {
                                  perdidaMut.mutate(r.id)
                                }
                              }}
                            >
                              Aceptar pérdida
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={r.activo ? 'secondary' : 'primary'}
                            icon={Power}
                            onClick={() => toggleMut.mutate({ id: r.id, activo: !r.activo })}
                          >
                            {r.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
