import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  3 * 60_000,  // 3 min — evita refetches al navegar entre módulos
      gcTime:    10 * 60_000,  // 10 min — mantiene más caché para navegación ágil
      retry:      1,
      refetchOnWindowFocus: false,
    },
  },
})
