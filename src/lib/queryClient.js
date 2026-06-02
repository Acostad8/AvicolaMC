import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  2 * 60_000,  // 2 min — evita refetches al navegar entre módulos
      gcTime:     5 * 60_000,  // 5 min en caché antes de liberar memoria
      retry:      1,
      refetchOnWindowFocus: false,
    },
  },
})
