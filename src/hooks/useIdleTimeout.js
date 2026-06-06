import { useState, useEffect, useRef, useCallback } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

/**
 * Cierra sesión automáticamente tras un período de inactividad.
 * Muestra una advertencia `warningMs` antes de ejecutar `onTimeout`.
 * Durante la advertencia, la actividad del usuario NO reinicia el timer —
 * solo el botón "Continuar sesión" lo hace.
 */
export function useIdleTimeout({
  timeoutMs = 30 * 60 * 1000,
  warningMs =  2 * 60 * 1000,
  onTimeout,
}) {
  const warningSeconds = Math.floor(warningMs / 1000)

  const [isWarning, setIsWarning] = useState(false)
  const [countdown, setCountdown] = useState(warningSeconds)

  // Ref para onTimeout — evita que cambios de referencia reinicien los timers
  const onTimeoutRef  = useRef(onTimeout)
  useEffect(() => { onTimeoutRef.current = onTimeout }, [onTimeout])

  const warnTimerRef  = useRef(null)
  const outTimerRef   = useRef(null)
  const countTimerRef = useRef(null)
  const warningActive = useRef(false)

  const clearAll = useCallback(() => {
    clearTimeout(warnTimerRef.current)
    clearTimeout(outTimerRef.current)
    clearInterval(countTimerRef.current)
  }, [])

  const startCountdown = useCallback(() => {
    let secs = warningSeconds
    setCountdown(secs)
    countTimerRef.current = setInterval(() => {
      secs -= 1
      setCountdown(secs)
      if (secs <= 0) clearInterval(countTimerRef.current)
    }, 1000)
  }, [warningSeconds])

  const resetTimer = useCallback(() => {
    clearAll()
    warningActive.current = false
    setIsWarning(false)
    setCountdown(warningSeconds)

    warnTimerRef.current = setTimeout(() => {
      warningActive.current = true
      setIsWarning(true)
      startCountdown()
    }, timeoutMs - warningMs)

    outTimerRef.current = setTimeout(() => {
      clearInterval(countTimerRef.current)
      onTimeoutRef.current()
    }, timeoutMs)
  }, [clearAll, startCountdown, timeoutMs, warningMs, warningSeconds])

  useEffect(() => {
    const onActivity = () => {
      if (!warningActive.current) resetTimer()
    }
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))
    resetTimer()
    return () => {
      clearAll()
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
    }
  }, [resetTimer, clearAll])

  return { isWarning, countdown, warningSeconds, resetTimer }
}
