import { supabase } from './supabase'
import { db } from './db'
import { markLocalClientId } from './realtime'

export const OP_STATUS = Object.freeze({
  pending: 'pending',
  syncing: 'syncing',
  failed: 'failed',
  conflict: 'conflict',
})

const MAX_RETRIES = 5

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function nextDelayMs(retries) {
  return Math.min(60_000, 2 ** retries * 1000)
}

export async function enqueueOp({ table, op, payload, client_id = uuid() }) {
  const row = {
    client_id,
    table,
    op,
    payload: { ...payload, client_id },
    status: OP_STATUS.pending,
    retries: 0,
    error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    next_attempt_at: new Date().toISOString(),
  }
  await db.pending_ops.add(row)
  return row
}

export async function applyLocal(table, record) {
  await db.table(table).put(record)
}

async function pushOne(opRow) {
  const { table, op, payload } = opRow
  markLocalClientId(opRow.client_id)

  if (op === 'insert') {
    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: 'client_id', ignoreDuplicates: false })
      .select()
      .maybeSingle()
    if (error) return { ok: false, error }
    return { ok: true, data }
  }

  if (op === 'update') {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', opRow.payload.id)
      .select()
      .maybeSingle()
    if (error) return { ok: false, error }
    return { ok: true, data }
  }

  if (op === 'delete') {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', opRow.payload.id)
    if (error) return { ok: false, error }
    return { ok: true, data: null }
  }

  return { ok: false, error: new Error(`Unknown op: ${op}`) }
}

function classifyError(err) {
  if (!err) return 'unknown'
  const code = err.code || err.status
  if (code === 409 || code === 23505) return 'conflict'
  if (code === 401 || code === 403 || code === 42501) return 'denied'
  if (code && String(code).startsWith('4')) return 'bad_request'
  if (err.message?.includes('fetch')) return 'network'
  if (err.message?.includes('NetworkError')) return 'network'
  return 'unknown'
}

let draining = false

export async function drainQueue() {
  if (draining) return { skipped: true }
  if (!navigator.onLine) return { skipped: true, reason: 'offline' }
  draining = true

  let processed = 0
  let failed = 0

  try {
    const now = new Date().toISOString()
    const ops = await db.pending_ops
      .where('status')
      .anyOf([OP_STATUS.pending, OP_STATUS.failed])
      .sortBy('id')

    for (const opRow of ops) {
      if (opRow.next_attempt_at && opRow.next_attempt_at > now) continue
      if (opRow.retries >= MAX_RETRIES && opRow.status === OP_STATUS.failed) continue

      await db.pending_ops.update(opRow.id, {
        status: OP_STATUS.syncing,
        updated_at: new Date().toISOString(),
      })

      const result = await pushOne(opRow)

      if (result.ok) {
        if (result.data && opRow.table) {
          try {
            await db.table(opRow.table).put(result.data)
          } catch {
            // noop — schema may not have all server columns
          }
        }
        await db.pending_ops.delete(opRow.id)
        processed += 1
        continue
      }

      const kind = classifyError(result.error)
      const retries = opRow.retries + 1
      const nextAt = new Date(Date.now() + nextDelayMs(retries)).toISOString()

      if (kind === 'conflict') {
        await db.pending_ops.update(opRow.id, {
          status: OP_STATUS.conflict,
          error: String(result.error?.message || result.error),
          retries,
          next_attempt_at: nextAt,
          updated_at: new Date().toISOString(),
        })
        failed += 1
        continue
      }

      if (kind === 'denied' || kind === 'bad_request') {
        await db.pending_ops.update(opRow.id, {
          status: OP_STATUS.failed,
          error: String(result.error?.message || result.error),
          retries: MAX_RETRIES,
          updated_at: new Date().toISOString(),
        })
        failed += 1
        continue
      }

      await db.pending_ops.update(opRow.id, {
        status: retries >= MAX_RETRIES ? OP_STATUS.failed : OP_STATUS.pending,
        error: String(result.error?.message || result.error),
        retries,
        next_attempt_at: nextAt,
        updated_at: new Date().toISOString(),
      })
      failed += 1
    }
  } finally {
    draining = false
  }

  return { processed, failed }
}

export async function retryOp(id) {
  await db.pending_ops.update(id, {
    status: OP_STATUS.pending,
    retries: 0,
    next_attempt_at: new Date().toISOString(),
    error: null,
    updated_at: new Date().toISOString(),
  })
  return drainQueue()
}

export async function discardOp(id) {
  const op = await db.pending_ops.get(id)
  if (!op) return
  if (op.op === 'insert' && op.table) {
    try {
      await db.table(op.table).delete(op.payload?.id ?? op.client_id)
    } catch {
      // noop
    }
  }
  await db.pending_ops.delete(id)
}

export async function countPending() {
  return db.pending_ops
    .where('status')
    .anyOf([OP_STATUS.pending, OP_STATUS.syncing, OP_STATUS.failed])
    .count()
}

export { uuid }
