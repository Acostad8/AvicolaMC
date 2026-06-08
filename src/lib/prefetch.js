import { queryClient } from './queryClient'
import { supabase } from './supabase'

const STALE = 3 * 60_000

export function prefetchGalponesSelect(isAdmin, perfilId) {
  if (!perfilId) return
  queryClient.prefetchQuery({
    queryKey: ['galpones-select', isAdmin, perfilId],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('galpones')
        .select('id, nombre')
        .in('estado', ['en_produccion', 'disponible'])
        .order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfilId)
      return (await q).data || []
    },
  })
}

export function prefetchGalponesList(isAdmin, perfilId) {
  if (!perfilId) return
  queryClient.prefetchQuery({
    queryKey: ['galpones', isAdmin, perfilId],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('galpones').select(`
        id, nombre, capacidad_maxima, estado, descripcion,
        encargado:perfiles(id, nombre_completo),
        lotes(id, estado, cantidad_aves_actuales, nombre_numero, raza:razas(nombre))
      `).order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfilId)
      return (await q).data || []
    },
  })
}

export function prefetchLotesList(isAdmin, perfilId) {
  if (!perfilId) return
  queryClient.prefetchQuery({
    queryKey: ['lotes', isAdmin, perfilId],
    staleTime: STALE,
    queryFn: async () => {
      let galponesQ = supabase.from('galpones').select('id')
      if (!isAdmin) galponesQ = galponesQ.eq('encargado_id', perfilId)
      const { data: galpones } = await galponesQ
      const galponIds = (galpones || []).map(g => g.id)
      const { data } = await supabase.from('lotes').select(`
        *, galpon:galpones(nombre), raza:razas(nombre)
      `).in('galpon_id', galponIds).order('fecha_ingreso', { ascending: false })
      return data || []
    },
  })
}

export function prefetchInsumosList() {
  queryClient.prefetchQuery({
    queryKey: ['insumos'],
    staleTime: STALE,
    queryFn: async () => {
      return (await supabase.from('insumos').select('*').order('nombre')).data || []
    },
  })
}
