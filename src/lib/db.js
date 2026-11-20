import Dexie from 'dexie'

export const DB_VERSION = 1
export const DB_NAME = 'avicola-mc-offline'

export const SYNC_TABLES = [
  'produccion',
  'mortalidad',
  'tratamientos',
  'movimientos_insumos',
  'insumos',
  'galpones',
  'lotes',
  'razas',
  'perfiles',
]

export const RETENCION_DIAS = 30

class AvicolaDB extends Dexie {
  constructor() {
    super(DB_NAME)

    this.version(1).stores({
      produccion:
        'id, fecha, galpon_id, lote_id, updated_at, deleted_at, client_id',
      mortalidad:
        'id, fecha, galpon_id, lote_id, updated_at, deleted_at, client_id',
      tratamientos:
        'id, fecha_inicio, galpon_id, lote_id, estado, updated_at, deleted_at, client_id',
      movimientos_insumos:
        'id, fecha, tipo, insumo_id, updated_at, deleted_at, client_id',
      insumos: 'id, nombre, categoria, estado, stock_actual',
      galpones: 'id, nombre, estado, encargado_id, updated_at',
      lotes: 'id, galpon_id, raza_id, estado, fecha_ingreso',
      razas: 'id, nombre',
      perfiles: 'id, rol, estado, empleado_id',
      pending_ops:
        '++id, client_id, table, op, status, created_at, retries',
      sync_meta: 'table',
    })
  }
}

export const db = new AvicolaDB()

export async function getSyncMeta(table) {
  return db.sync_meta.get(table)
}

export async function setSyncMeta(table, patch) {
  const prev = (await db.sync_meta.get(table)) || { table }
  await db.sync_meta.put({ ...prev, ...patch, table })
}

export async function clearAllTables() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear()
    }
  })
}
