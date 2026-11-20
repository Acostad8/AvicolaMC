-- ================================================================
-- Migración: columnas para sincronización offline-first
-- Fecha: 2026-11-15
-- Objetivo: habilitar outbox pattern + delta sync + dedupe idempotente
-- Tablas afectadas: produccion, mortalidad, tratamientos, movimientos_insumos
-- ----------------------------------------------------------------
-- Columnas añadidas:
--   updated_at    → timestamp de última modificación (delta sync)
--   client_id     → UUID generado en cliente (dedupe upsert)
--   deleted_at    → soft-delete (tombstone para propagar borrados)
-- ================================================================

-- Extensión moddatetime (auto-update de updated_at vía trigger)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ----------------------------------------------------------------
-- PRODUCCIÓN
-- ----------------------------------------------------------------
ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS client_id  UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS produccion_client_id_key
  ON produccion (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS produccion_updated_at_idx
  ON produccion (updated_at);

DROP TRIGGER IF EXISTS produccion_set_updated_at ON produccion;
CREATE TRIGGER produccion_set_updated_at
  BEFORE UPDATE ON produccion
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ----------------------------------------------------------------
-- MORTALIDAD
-- ----------------------------------------------------------------
ALTER TABLE mortalidad
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS client_id  UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS mortalidad_client_id_key
  ON mortalidad (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mortalidad_updated_at_idx
  ON mortalidad (updated_at);

DROP TRIGGER IF EXISTS mortalidad_set_updated_at ON mortalidad;
CREATE TRIGGER mortalidad_set_updated_at
  BEFORE UPDATE ON mortalidad
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ----------------------------------------------------------------
-- TRATAMIENTOS (ya tiene updated_at desde install)
-- ----------------------------------------------------------------
ALTER TABLE tratamientos
  ADD COLUMN IF NOT EXISTS client_id  UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS tratamientos_client_id_key
  ON tratamientos (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tratamientos_updated_at_idx
  ON tratamientos (updated_at);

DROP TRIGGER IF EXISTS tratamientos_set_updated_at ON tratamientos;
CREATE TRIGGER tratamientos_set_updated_at
  BEFORE UPDATE ON tratamientos
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ----------------------------------------------------------------
-- MOVIMIENTOS DE INSUMOS
-- ----------------------------------------------------------------
ALTER TABLE movimientos_insumos
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS client_id  UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS movimientos_insumos_client_id_key
  ON movimientos_insumos (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS movimientos_insumos_updated_at_idx
  ON movimientos_insumos (updated_at);

DROP TRIGGER IF EXISTS movimientos_insumos_set_updated_at ON movimientos_insumos;
CREATE TRIGGER movimientos_insumos_set_updated_at
  BEFORE UPDATE ON movimientos_insumos
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ----------------------------------------------------------------
-- NOTA sobre soft-delete:
--   Los módulos offline deben filtrar `deleted_at IS NULL` en lecturas.
--   Para delta sync los clientes piden:
--     SELECT * FROM <tabla> WHERE updated_at > :last_sync
--   Las filas con deleted_at NOT NULL se propagan como tombstones.
-- ----------------------------------------------------------------
