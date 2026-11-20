import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { OP_STATUS } from '../lib/outbox'

const ACTIVE = [OP_STATUS.pending, OP_STATUS.syncing, OP_STATUS.failed, OP_STATUS.conflict]

export function usePendingCount() {
  return useLiveQuery(
    () => db.pending_ops.where('status').anyOf(ACTIVE).count(),
    [],
    0
  )
}

export function usePendingOps() {
  return useLiveQuery(
    () => db.pending_ops.where('status').anyOf(ACTIVE).sortBy('id'),
    [],
    []
  )
}
