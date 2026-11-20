import { useEffect, useState } from 'react'
import { WifiOff, Database } from 'lucide-react'
import { getSyncMeta } from '../../lib/db'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

function hace(iso) {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'hace instantes'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} día${d === 1 ? '' : 's'}`
}

export default function OfflineBanner({ table }) {
  const online = useOnlineStatus()
  const [lastRun, setLastRun] = useState(null)

  useEffect(() => {
    let cancel = false
    if (!table) return
    getSyncMeta(table).then((m) => {
      if (!cancel) setLastRun(m?.last_run ?? null)
    })
    return () => { cancel = true }
  }, [table, online])

  if (online) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs">
      <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-amber-700 dark:text-amber-300 font-medium">Sin conexión</span>
      <span className="text-amber-600 dark:text-amber-400">·</span>
      <Database className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-amber-700 dark:text-amber-300">Datos locales — última sincronización {hace(lastRun)}</span>
    </div>
  )
}
