import { useEffect, useReducer } from 'react'

export function useAutoRefreshAtMidnight() {
  const [, tick] = useReducer(x => x + 1, 0)

  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight - now

    let interval
    const timeout = setTimeout(() => {
      tick()
      interval = setInterval(tick, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])
}
