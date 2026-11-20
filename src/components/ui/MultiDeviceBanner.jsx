import { useEffect, useState } from 'react'
import { Smartphone, AlertTriangle, X } from 'lucide-react'
import { fetchOtrosDevicesConPendientes } from '../../lib/devices'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useAuth } from '../../context/AuthContext'

const DISMISS_KEY = 'avicola-mc-multidevice-dismissed'

function plataformaLabel(p) {
  return { android: 'Android', ios: 'iOS', desktop: 'Escritorio' }[p] || 'Otro'
}

function hace(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

export default function MultiDeviceBanner() {
  const { session } = useAuth()
  const online = useOnlineStatus()
  const [devices, setDevices] = useState([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!session || !online) return
    let cancel = false
    fetchOtrosDevicesConPendientes().then((rows) => {
      if (cancel) return
      setDevices(rows)
      const key = `${DISMISS_KEY}:${session.user?.id}`
      try {
        const stored = sessionStorage.getItem(key)
        if (stored) setDismissed(true)
      } catch {
        // noop
      }
    })
    return () => { cancel = true }
  }, [session, online])

  function handleDismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(`${DISMISS_KEY}:${session.user?.id}`, '1')
    } catch {
      // noop
    }
  }

  if (!devices.length || dismissed) return null

  const total = devices.reduce((s, d) => s + (d.pending_count || 0), 0)

  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl px-4 py-3 mb-4">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Otros dispositivos tienen cambios sin sincronizar
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          {total} cambio{total === 1 ? '' : 's'} en {devices.length} dispositivo{devices.length === 1 ? '' : 's'}.
          Abre la aplicación en el dispositivo original y conecta a internet para sincronizar.
        </p>
        <ul className="mt-2 space-y-1">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <Smartphone className="h-3.5 w-3.5" />
              <span className="font-medium">{d.nombre || plataformaLabel(d.plataforma)}</span>
              <span className="text-amber-600 dark:text-amber-400">·</span>
              <span>{d.pending_count} pendiente{d.pending_count === 1 ? '' : 's'}</span>
              <span className="text-amber-600 dark:text-amber-400">·</span>
              <span>última vez {hace(d.last_seen)}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-200"
        title="Ocultar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
