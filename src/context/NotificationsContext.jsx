import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const NOTIF_KEY = 'avicola-mc-notifications'
const MAX = 60

function load() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persist(list) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list))
}

const NotificationsCtx = createContext(null)

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(load)

  const addNotification = useCallback(({ titulo, mensaje, tipo = 'info', categoria = 'sistema' }) => {
    const entry = {
      id:        crypto.randomUUID(),
      titulo:    titulo || null,
      mensaje,
      tipo,
      categoria,
      leida:     false,
      timestamp: new Date().toISOString(),
    }
    setNotifications(prev => {
      const next = [entry, ...prev].slice(0, MAX)
      persist(next)
      return next
    })
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, leida: true } : n)
      persist(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, leida: true }))
      persist(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    localStorage.removeItem(NOTIF_KEY)
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.leida).length,
    [notifications]
  )

  return (
    <NotificationsCtx.Provider value={{ notifications, addNotification, markRead, markAllRead, clearAll, unreadCount }}>
      {children}
    </NotificationsCtx.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsCtx)
