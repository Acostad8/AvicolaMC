/**
 * Cálculo de salud compuesta por galpón para el Gemelo Digital.
 * Devuelve un score 0-100 y un cubo (saludable | atencion | critico | vacio | mantenimiento).
 *
 * Pesos:
 *  - Mortalidad 7 días (40%)
 *  - Tendencia producción 7d vs 7d previos (30%)
 *  - Ocupación (15%)
 *  - Tratamientos activos (15%)
 */

const CLAMP = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

export function scoreMortalidad(bajas7d, avesActivas) {
  if (!avesActivas || avesActivas <= 0) return 100
  const pct = (bajas7d / avesActivas) * 100
  if (pct <= 0.5) return 100
  if (pct >= 1.5) return 0
  return CLAMP(100 - ((pct - 0.5) / 1.0) * 100)
}

export function scoreTendenciaProduccion(huevos7d, huevos7dPrev) {
  if (!huevos7dPrev) return 80
  const delta = ((huevos7d - huevos7dPrev) / huevos7dPrev) * 100
  if (delta >= 0) return 100
  if (delta <= -20) return 0
  return CLAMP(100 + (delta / 20) * 100)
}

export function scoreOcupacion(avesActuales, capacidadMaxima) {
  if (!capacidadMaxima || capacidadMaxima <= 0) return 60
  const pct = (avesActuales / capacidadMaxima) * 100
  if (pct >= 60 && pct <= 90) return 100
  if (pct > 90 && pct <= 95) return 80
  if (pct > 95) return 40
  if (pct >= 40) return 75
  if (pct >= 20) return 55
  return 30
}

export function scoreTratamientos(tratamientosActivos) {
  if (!tratamientosActivos || tratamientosActivos.length === 0) return 100
  const urgentes = tratamientosActivos.filter(t =>
    ['antibiotico', 'medicacion'].includes(t.tipo)
  ).length
  if (urgentes > 0) return 45
  return 70
}

export function calcularHealthScore(input) {
  const {
    avesActuales = 0,
    capacidadMaxima = 0,
    bajas7d = 0,
    huevos7d = 0,
    huevos7dPrev = 0,
    tratamientosActivos = [],
    estadoGalpon,
    tieneLoteActivo = false,
  } = input

  if (estadoGalpon === 'en_mantenimiento') {
    return { score: 50, bucket: 'mantenimiento', breakdown: null }
  }
  if (!tieneLoteActivo || estadoGalpon === 'disponible') {
    return { score: 60, bucket: 'vacio', breakdown: null }
  }

  const sMort  = scoreMortalidad(bajas7d, avesActuales)
  const sProd  = scoreTendenciaProduccion(huevos7d, huevos7dPrev)
  const sOcup  = scoreOcupacion(avesActuales, capacidadMaxima)
  const sTrat  = scoreTratamientos(tratamientosActivos)

  const score = Math.round(
    sMort * 0.40 +
    sProd * 0.30 +
    sOcup * 0.15 +
    sTrat * 0.15
  )

  const bucket =
    score >= 75 ? 'saludable' :
    score >= 50 ? 'atencion'  :
                  'critico'

  return {
    score,
    bucket,
    breakdown: {
      mortalidad:  Math.round(sMort),
      produccion:  Math.round(sProd),
      ocupacion:   Math.round(sOcup),
      tratamiento: Math.round(sTrat),
      bajas7d,
      huevos7d,
      huevos7dPrev,
      pctMortalidad: avesActuales > 0 ? (bajas7d / avesActuales) * 100 : 0,
      deltaProduccion: huevos7dPrev ? ((huevos7d - huevos7dPrev) / huevos7dPrev) * 100 : null,
    },
  }
}

export const BUCKET_META = {
  saludable: {
    label:   'Saludable',
    color:   'emerald',
    ring:    'ring-emerald-500/40',
    bg:      'bg-emerald-50 dark:bg-emerald-950/30',
    border:  'border-emerald-200 dark:border-emerald-800',
    text:    'text-emerald-700 dark:text-emerald-400',
    strip:   'bg-gradient-to-r from-emerald-400 to-emerald-600',
    dot:     'bg-emerald-500',
    glow:    'shadow-emerald-500/30',
  },
  atencion: {
    label:   'Atención',
    color:   'amber',
    ring:    'ring-amber-500/50',
    bg:      'bg-amber-50 dark:bg-amber-950/30',
    border:  'border-amber-200 dark:border-amber-800',
    text:    'text-amber-700 dark:text-amber-400',
    strip:   'bg-gradient-to-r from-amber-400 to-amber-600',
    dot:     'bg-amber-500',
    glow:    'shadow-amber-500/30',
  },
  critico: {
    label:   'Crítico',
    color:   'red',
    ring:    'ring-red-500/60',
    bg:      'bg-red-50 dark:bg-red-950/30',
    border:  'border-red-300 dark:border-red-800',
    text:    'text-red-700 dark:text-red-400',
    strip:   'bg-gradient-to-r from-red-400 to-red-600',
    dot:     'bg-red-500',
    glow:    'shadow-red-500/40',
  },
  vacio: {
    label:   'Disponible',
    color:   'stone',
    ring:    'ring-stone-400/30',
    bg:      'bg-stone-50 dark:bg-stone-900/60',
    border:  'border-stone-200 dark:border-stone-800',
    text:    'text-stone-600 dark:text-stone-400',
    strip:   'bg-gradient-to-r from-stone-300 to-stone-500',
    dot:     'bg-stone-400',
    glow:    'shadow-stone-500/20',
  },
  mantenimiento: {
    label:   'Mantenimiento',
    color:   'blue',
    ring:    'ring-blue-500/40',
    bg:      'bg-blue-50 dark:bg-blue-950/30',
    border:  'border-blue-200 dark:border-blue-800',
    text:    'text-blue-700 dark:text-blue-400',
    strip:   'bg-gradient-to-r from-blue-400 to-blue-600',
    dot:     'bg-blue-500',
    glow:    'shadow-blue-500/30',
  },
}
