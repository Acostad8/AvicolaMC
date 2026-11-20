import { useState } from 'react'
import { CloudUpload, AlertTriangle, RefreshCw, Trash2, X, CheckCircle2, Clock } from 'lucide-react'
import { usePendingCount, usePendingOps } from '../../hooks/usePendingOps'
import { drainQueue, retryOp, discardOp, OP_STATUS } from '../../lib/outbox'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import toast from 'react-hot-toast'

const TABLE_LABELS = {
  produccion: 'Producción',
  mortalidad: 'Mortalidad',
  tratamientos: 'Tratamientos',
  movimientos_insumos: 'Mov. insumos',
}

const OP_LABELS = {
  insert: 'Nuevo',
  update: 'Editar',
  delete: 'Borrar',
}

function StatusChip({ status }) {
  const map = {
    [OP_STATUS.pending]: { bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-700 dark:text-amber-400', icon: Clock, label: 'Pendiente' },
    [OP_STATUS.syncing]: { bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-700 dark:text-blue-400', icon: RefreshCw, label: 'Sincronizando' },
    [OP_STATUS.failed]: { bg: 'bg-red-100 dark:bg-red-900/30', fg: 'text-red-700 dark:text-red-400', icon: AlertTriangle, label: 'Falló' },
    [OP_STATUS.conflict]: { bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-700 dark:text-purple-400', icon: AlertTriangle, label: 'Conflicto' },
  }
  const m = map[status] || map[OP_STATUS.pending]
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.bg} ${m.fg}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  )
}

function OpsModal({ onClose }) {
  const ops = usePendingOps() || []
  const online = useOnlineStatus()
  const [busy, setBusy] = useState(false)

  async function handleSyncAll() {
    if (!online) {
      toast.error('Sin conexión')
      return
    }
    setBusy(true)
    const r = await drainQueue()
    setBusy(false)
    if (r.skipped) return
    toast.success(`Sincronizado: ${r.processed} ok · ${r.failed} fallidas`)
  }

  async function handleRetry(id) {
    setBusy(true)
    await retryOp(id)
    setBusy(false)
  }

  async function handleDiscard(id) {
    if (!confirm('¿Descartar este cambio? Se perderá el dato local.')) return
    await discardOp(id)
    toast.success('Cambio descartado')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Sincronización pendiente</h2>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-500 text-white text-[11px] font-bold">
              {ops.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-stone-100 dark:divide-stone-800">
          {ops.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Todo sincronizado</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">No hay cambios pendientes.</p>
            </div>
          ) : (
            ops.map((o) => (
              <div key={o.id} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                      {OP_LABELS[o.op] || o.op} · {TABLE_LABELS[o.table] || o.table}
                    </span>
                    <StatusChip status={o.status} />
                    {o.retries > 0 && (
                      <span className="text-[10px] text-stone-400">{o.retries} reintentos</span>
                    )}
                  </div>
                  {o.payload?.fecha && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Fecha: {o.payload.fecha}
                    </p>
                  )}
                  {o.error && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 break-words">
                      {o.error}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {(o.status === OP_STATUS.failed || o.status === OP_STATUS.conflict) && (
                    <button
                      onClick={() => handleRetry(o.id)}
                      disabled={busy || !online}
                      className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg disabled:opacity-40"
                      title="Reintentar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDiscard(o.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Descartar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-stone-500 dark:text-stone-400">
            {online ? 'En línea — puedes sincronizar' : 'Sin conexión — se sincronizará al reconectar'}
          </span>
          <button
            onClick={handleSyncAll}
            disabled={busy || !online || ops.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            Sincronizar ahora
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PendingOpsBadge() {
  const count = usePendingCount() || 0
  const [open, setOpen] = useState(false)

  if (count === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-semibold transition-colors"
        title={`${count} cambio${count === 1 ? '' : 's'} pendiente${count === 1 ? '' : 's'} de sincronización`}
      >
        <CloudUpload className="h-3 w-3" />
        <span>{count}</span>
      </button>
      {open && <OpsModal onClose={() => setOpen(false)} />}
    </>
  )
}
