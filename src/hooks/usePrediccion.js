import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { linearRegression } from '../lib/estadistica'
import { format, subDays, addDays } from 'date-fns'

export function useGalponesPrediccion(isAdmin, perfilId) {
  return useQuery({
    queryKey: ['galpones-pred-selector', isAdmin, perfilId],
    staleTime: 5 * 60_000,
    enabled: !!perfilId,
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'en_produccion').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfilId)
      const { data } = await q
      return data || []
    },
  })
}

export function usePrediccionData({ galponIds, diasFuturos = 14 }) {
  return useQuery({
    queryKey: ['prediccion-data', [...(galponIds || [])].sort().join(','), diasFuturos],
    enabled: !!(galponIds?.length),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const hoy    = new Date()
      const desde  = format(subDays(hoy, 59), 'yyyy-MM-dd')

      const [{ data: prod }, { data: lotes }, { data: insumos }] = await Promise.all([
        supabase.from('produccion')
          .select('fecha, huevos_producidos, porcentaje_postura, consumo_alimento_kg')
          .in('galpon_id', galponIds)
          .gte('fecha', desde)
          .order('fecha'),
        supabase.from('lotes')
          .select('cantidad_aves_actuales')
          .in('galpon_id', galponIds)
          .eq('estado', 'activo'),
        supabase.from('insumos')
          .select('nombre, stock_actual, unidad_medida')
          .eq('categoria', 'alimento')
          .eq('estado', 'activo'),
      ])

      const avesActuales = (lotes || []).reduce((s, l) => s + (l.cantidad_aves_actuales || 0), 0)

      // Aggregate production by date
      const prodMap = {}
      for (const p of (prod || [])) {
        if (!prodMap[p.fecha]) prodMap[p.fecha] = { huevos: 0, posturas: [], consumo: 0 }
        prodMap[p.fecha].huevos  += p.huevos_producidos || 0
        prodMap[p.fecha].consumo += p.consumo_alimento_kg || 0
        if (p.porcentaje_postura) prodMap[p.fecha].posturas.push(parseFloat(p.porcentaje_postura))
      }

      // Build 60-day historical series (x = 0..59)
      const historico = Array.from({ length: 60 }, (_, i) => {
        const fecha = format(subDays(hoy, 59 - i), 'yyyy-MM-dd')
        const d     = prodMap[fecha]
        return {
          x:          i,
          fecha,
          fechaLabel: fecha.slice(5),
          huevos:     d?.huevos ?? 0,
          postura:    d?.posturas?.length
            ? d.posturas.reduce((s, v) => s + v, 0) / d.posturas.length
            : null,
          consumo:    d?.consumo ?? 0,
        }
      })

      const conProd    = historico.filter(d => d.huevos > 0)
      const conConsumo = historico.filter(d => d.consumo > 0)

      if (conProd.length < 5) {
        return {
          historico:        historico.slice(-30),
          prediccion:       [],
          allData:          historico.slice(-30),
          r2:               0,
          avesActuales,
          consumoPromDiario: 0,
          totales:          { huevosEstimados: 0, consumoEstimado: 0, posturaMedia: 0 },
          stockAlimento:    insumos || [],
          suficientesDatos: false,
        }
      }

      // Linear regression — production
      const regProd    = linearRegression(conProd.map(d => ({ x: d.x, y: d.huevos })))
      // Linear regression — consumption
      const regConsumo = conConsumo.length >= 5
        ? linearRegression(conConsumo.map(d => ({ x: d.x, y: d.consumo })))
        : null
      const consumoPromDiario = conConsumo.length > 0
        ? conConsumo.reduce((s, d) => s + d.consumo, 0) / conConsumo.length
        : 0

      // Project N days forward
      const prediccion = Array.from({ length: diasFuturos }, (_, i) => {
        const x          = 59 + i + 1
        const fecha      = format(addDays(hoy, i + 1), 'yyyy-MM-dd')
        const huevosPred = Math.max(0, Math.round(regProd.slope * x + regProd.intercept))
        const posturaPred = avesActuales > 0
          ? Math.min(100, parseFloat(((huevosPred / avesActuales) * 100).toFixed(1)))
          : 0
        const consumoPred = regConsumo
          ? Math.max(0, parseFloat((regConsumo.slope * x + regConsumo.intercept).toFixed(1)))
          : parseFloat(consumoPromDiario.toFixed(1))
        return { x, fecha, fechaLabel: fecha.slice(5), huevosPred, posturaPred, consumoPred }
      })

      // Build combined chart data — last 30 days historical + predictions
      // Bridge point: last historical day gets BOTH keys for visual continuity
      const hist30  = historico.slice(-30)
      const lastH   = hist30[hist30.length - 1]
      const bridge  = {
        ...lastH,
        huevosPred:  lastH.huevos,
        posturaPred: lastH.postura,
        consumoPred: lastH.consumo > 0 ? lastH.consumo : null,
      }
      const allData = [
        ...hist30.slice(0, -1),
        bridge,
        ...prediccion,
      ]

      return {
        historico:        hist30,
        prediccion,
        allData,
        r2:               Math.round(regProd.r2 * 100),
        avesActuales,
        consumoPromDiario: parseFloat(consumoPromDiario.toFixed(1)),
        totales: {
          huevosEstimados: prediccion.reduce((s, p) => s + p.huevosPred, 0),
          consumoEstimado: parseFloat(prediccion.reduce((s, p) => s + p.consumoPred, 0).toFixed(1)),
          posturaMedia:    prediccion.length > 0
            ? parseFloat((prediccion.reduce((s, p) => s + p.posturaPred, 0) / prediccion.length).toFixed(1))
            : 0,
        },
        stockAlimento:    insumos || [],
        suficientesDatos: true,
      }
    },
  })
}
