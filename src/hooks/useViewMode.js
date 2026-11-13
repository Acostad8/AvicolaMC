import { useState, useEffect } from 'react'

const PREFIX = 'siamc:view:'

export function useViewMode(moduleKey, defaultView = 'cards') {
  const storageKey = PREFIX + moduleKey
  const [view, setView] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored || defaultView
    } catch {
      return defaultView
    }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, view) } catch {}
  }, [storageKey, view])

  return [view, setView]
}
