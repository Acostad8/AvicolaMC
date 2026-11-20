import { get, set, del } from 'idb-keyval'

const KEY = 'avicola-mc-query-cache'

export function createIdbPersister() {
  return {
    persistClient: async (client) => {
      try {
        await set(KEY, client)
      } catch {
        // Silently ignore quota errors; cache is best-effort.
      }
    },
    restoreClient: async () => {
      try {
        return (await get(KEY)) || undefined
      } catch {
        return undefined
      }
    },
    removeClient: async () => {
      try {
        await del(KEY)
      } catch {
        // noop
      }
    },
  }
}
