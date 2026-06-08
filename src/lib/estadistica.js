export function linearRegression(points) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 }
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }
  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const yMean = sumY / n
  const ssTot = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0)
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const r2    = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0
  return { slope, intercept, r2 }
}
