import { supabase } from './supabase'
import { db, getSyncMeta, setSyncMeta, RETENCION_DIAS } from './db'

const PAGE_SIZE = 500

const TABLAS_POR_FECHA = {
  produccion: 'fecha',
  mortalidad: 'fecha',
  movimientos_insumos: 'fecha',
}

function isoBound(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

function isoDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

async function pullTable(tableName, { select = '*', retencionDias = null } = {}) {
  const meta = await getSyncMeta(tableName)
  const since = meta?.last_sync || isoBound(retencionDias ?? 365)

  let from = 0
  let total = 0
  let latest = since

  while (true) {
    let q = supabase
      .from(tableName)
      .select(select)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    const fechaCol = TABLAS_POR_FECHA[tableName]
    if (fechaCol && retencionDias != null) {
      q = q.gte(fechaCol, isoDate(retencionDias))
    }

    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) break

    const toPut = data.filter((r) => !r.deleted_at)
    const toDel = data.filter((r) => r.deleted_at).map((r) => r.id)

    await db.transaction('rw', db.table(tableName), async () => {
      if (toPut.length) await db.table(tableName).bulkPut(toPut)
      if (toDel.length) await db.table(tableName).bulkDelete(toDel)
    })

    total += data.length
    const lastUpdated = data[data.length - 1].updated_at
    if (lastUpdated > latest) latest = lastUpdated

    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  await setSyncMeta(tableName, { last_sync: latest, last_run: new Date().toISOString(), last_count: total })
  return total
}

async function pullTableFull(tableName, { select = '*' } = {}) {
  const { data, error } = await supabase.from(tableName).select(select)
  if (error) throw error
  await db.transaction('rw', db.table(tableName), async () => {
    await db.table(tableName).clear()
    if (data?.length) await db.table(tableName).bulkPut(data)
  })
  await setSyncMeta(tableName, { last_run: new Date().toISOString(), last_count: data?.length ?? 0 })
  return data?.length ?? 0
}

export async function pullCatalogos() {
  await Promise.all([
    pullTableFull('razas'),
    pullTableFull('galpones'),
    pullTableFull('lotes'),
    pullTableFull('insumos'),
    pullTableFull('perfiles', { select: 'id, nombre_completo, email, rol, estado, empleado_id, avatar_url' }),
  ])
}

export async function pullDatosTransaccionales() {
  await Promise.all([
    pullTable('produccion', { retencionDias: RETENCION_DIAS }),
    pullTable('mortalidad', { retencionDias: RETENCION_DIAS }),
    pullTable('tratamientos'),
    pullTable('movimientos_insumos', { retencionDias: RETENCION_DIAS }),
  ])
}

export async function syncAll() {
  if (!navigator.onLine) return { ok: false, reason: 'offline' }
  try {
    await pullCatalogos()
    await pullDatosTransaccionales()
    return { ok: true, at: new Date().toISOString() }
  } catch (err) {
    return { ok: false, reason: 'error', error: err }
  }
}

export async function purgarRetencion() {
  const cutoff = isoDate(RETENCION_DIAS)
  await db.transaction(
    'rw',
    [db.produccion, db.mortalidad, db.movimientos_insumos],
    async () => {
      await db.produccion.where('fecha').below(cutoff).delete()
      await db.mortalidad.where('fecha').below(cutoff).delete()
      await db.movimientos_insumos.where('fecha').below(cutoff).delete()
    }
  )
}
