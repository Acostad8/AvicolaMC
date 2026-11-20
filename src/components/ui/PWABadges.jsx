import { useEffect, useState } from 'react'
import { Download, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import toast from 'react-hot-toast'

export function OnlineIndicator() {
  const online = useOnlineStatus()
  const [justChanged, setJustChanged] = useState(false)

  useEffect(() => {
    setJustChanged(true)
    const t = setTimeout(() => setJustChanged(false), 3000)
    return () => clearTimeout(t)
  }, [online])

  if (online && !justChanged) {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 dark:text-stone-500"
        title="En línea"
      >
        <Wifi className="h-3 w-3" aria-hidden="true" />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${
        online
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      }`}
      title={online ? 'Conectado' : 'Sin conexión — trabajo offline'}
    >
      {online ? (
        <>
          <Wifi className="h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline">En línea</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline">Sin conexión</span>
        </>
      )}
    </span>
  )
}

export function InstallButton() {
  const { canInstall, promptInstall } = usePWAInstall()
  if (!canInstall) return null

  return (
    <button
      onClick={() => promptInstall()}
      className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-900/40 transition-colors"
      title="Instalar aplicación"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      Instalar
    </button>
  )
}

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, reg) {
      if (reg) {
        setInterval(() => reg.update(), 60 * 60 * 1000)
      }
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    const id = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <RefreshCw className="h-4 w-4 text-primary-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Nueva versión disponible
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Recarga para aplicar la actualización
            </p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              updateServiceWorker(true)
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Recargar
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              setNeedRefresh(false)
            }}
            className="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400"
          >
            Después
          </button>
        </div>
      ),
      { duration: Infinity, id: 'pwa-update' }
    )
    return () => toast.dismiss(id)
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
