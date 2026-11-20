import { useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { syncAll, purgarRetencion } from '../../lib/offlineSync'
import { drainQueue } from '../../lib/outbox'
import { sendHeartbeat } from '../../lib/devices'
import { startRealtime, stopRealtime } from '../../lib/realtime'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

const SYNC_INTERVAL_MS = 5 * 60_000

async function fullCycle() {
  const drain = await drainQueue().catch(() => null)
  await syncAll().catch(() => {})
  await sendHeartbeat({ didSync: Boolean(drain && !drain.skipped) }).catch(() => {})
}

export function OfflineBootstrap() {
  const { session } = useAuth()
  const online = useOnlineStatus()
  const ran = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!session) return
    if (ran.current) return
    ran.current = true

    purgarRetencion().catch(() => {})
    if (online) fullCycle()
  }, [session, online])

  useEffect(() => {
    if (!session) {
      stopRealtime()
      return
    }
    if (online) {
      startRealtime()
    } else {
      stopRealtime()
    }
    return () => {
      stopRealtime()
    }
  }, [session, online])

  useEffect(() => {
    if (!session || !online) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(fullCycle, SYNC_INTERVAL_MS)
    const onFocus = () => fullCycle()
    window.addEventListener('focus', onFocus)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      window.removeEventListener('focus', onFocus)
    }
  }, [session, online])

  useEffect(() => {
    if (online && session) fullCycle()
  }, [online, session])

  return null
}
