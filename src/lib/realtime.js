import { supabase } from './supabase'
import { db } from './db'
import { queryClient } from './queryClient'
import { getOrCreateFingerprint } from './deviceId'

const TABLES = [
  'produccion',
  'mortalidad',
  'tratamientos',
  'movimientos_insumos',
  'dispositivos',
]

const INVALIDATE_PREFIX = {
  produccion: ['produccion', 'dashboard-v2', 'gemelo-eventos-14d', 'alim-produccion'],
  mortalidad: ['mortalidad', 'dashboard-v2', 'gemelo-eventos-14d'],
  tratamientos: ['tratamientos', 'dashboard-v2'],
  movimientos_insumos: ['movimientos_insumos', 'insumos', 'alim-movs-auto'],
  dispositivos: ['dispositivos'],
}

let channel = null
let online = true
let reconnectTimer = null
let reconnectAttempts = 0
let subscribed = false

const localClientIds = new Set()

export function markLocalClientId(clientId) {
  if (!clientId) return
  localClientIds.add(clientId)
  setTimeout(() => localClientIds.delete(clientId), 60_000)
}

function invalidateFor(table) {
  const prefixes = INVALIDATE_PREFIX[table] || [table]
  queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey?.[0]
      if (typeof k !== 'string') return false
      return prefixes.some((p) => k === p || k.startsWith(p + '-'))
    },
  })
}

async function applyDexie(table, eventType, newRow, oldRow) {
  if (!db.tables.some((t) => t.name === table)) return

  if (eventType === 'DELETE') {
    const id = oldRow?.id
    if (id != null) await db.table(table).delete(id)
    return
  }

  if (!newRow) return

  if (newRow.deleted_at) {
    await db.table(table).delete(newRow.id)
    return
  }

  await db.table(table).put(newRow)
}

async function handleChange(table, payload) {
  try {
    const newRow = payload.new
    const oldRow = payload.old
    const clientId = newRow?.client_id || oldRow?.client_id
    if (clientId && localClientIds.has(clientId)) return

    await applyDexie(table, payload.eventType, newRow, oldRow)
    invalidateFor(table)
  } catch (err) {
    console.warn('[realtime] handler error', table, err)
  }
}

function buildChannel() {
  const fp = getOrCreateFingerprint()
  const ch = supabase.channel(`offline-sync-${fp}`)

  for (const table of TABLES) {
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => handleChange(table, payload)
    )
  }

  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempts = 0
      subscribed = true
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      subscribed = false
      scheduleReconnect()
    }
  })

  return ch
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (!online) return
  const delay = Math.min(60_000, 2 ** reconnectAttempts * 1000)
  reconnectAttempts += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (!online) return
    try {
      if (channel) supabase.removeChannel(channel)
    } catch {}
    channel = buildChannel()
  }, delay)
}

export function startRealtime() {
  if (channel) return
  online = typeof navigator === 'undefined' ? true : navigator.onLine
  reconnectAttempts = 0
  channel = buildChannel()
}

export function stopRealtime() {
  subscribed = false
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (channel) {
    try {
      supabase.removeChannel(channel)
    } catch {}
    channel = null
  }
}

export function setRealtimeOnline(next) {
  online = next
  if (!next) {
    stopRealtime()
    return
  }
  startRealtime()
}

export function isRealtimeSubscribed() {
  return subscribed
}
