import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { db, getSyncMeta } from '../lib/db'
import { useOnlineStatus } from './useOnlineStatus'

export function useOfflineQuery({
  queryKey,
  table,
  fetchOnline,
  fetchLocal,
  enabled = true,
  staleTime = 60_000,
  gcTime = 10 * 60_000,
}) {
  const online = useOnlineStatus()
  const queryClient = useQueryClient()

  const q = useQuery({
    queryKey,
    enabled,
    staleTime,
    gcTime,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      if (online) {
        try {
          const data = await fetchOnline()
          return { data, source: 'online', at: new Date().toISOString() }
        } catch (err) {
          const local = await fetchLocal(db)
          if (local != null) {
            const meta = table ? await getSyncMeta(table) : null
            return { data: local, source: 'local-fallback', at: meta?.last_run, error: err }
          }
          throw err
        }
      } else {
        const local = await fetchLocal(db)
        const meta = table ? await getSyncMeta(table) : null
        return { data: local, source: 'local', at: meta?.last_run }
      }
    },
  })

  useEffect(() => {
    if (online) queryClient.invalidateQueries({ queryKey })
  }, [online, queryClient, queryKey])

  return {
    ...q,
    data: q.data?.data,
    source: q.data?.source,
    fetchedAt: q.data?.at,
    isLocal: q.data?.source === 'local' || q.data?.source === 'local-fallback',
  }
}
