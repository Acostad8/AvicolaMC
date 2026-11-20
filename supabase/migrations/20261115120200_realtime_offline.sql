-- ================================================================
-- Migración: habilitar Realtime en tablas offline-sync
-- Fecha: 2026-11-15
-- Objetivo: devices online reciben cambios al momento vía
--           supabase.channel().on('postgres_changes', ...)
-- ----------------------------------------------------------------
-- REPLICA IDENTITY FULL: incluye valores previos en UPDATE/DELETE
-- (necesario para clientes que quieren saber qué cambió exactamente).
-- ================================================================

ALTER TABLE produccion          REPLICA IDENTITY FULL;
ALTER TABLE mortalidad          REPLICA IDENTITY FULL;
ALTER TABLE tratamientos        REPLICA IDENTITY FULL;
ALTER TABLE movimientos_insumos REPLICA IDENTITY FULL;
ALTER TABLE dispositivos        REPLICA IDENTITY FULL;

-- Añadir a la publicación supabase_realtime.
-- Nota: si la tabla ya está en la publicación, ALTER PUBLICATION ADD lanza error.
-- Usamos DO block para hacerlo idempotente.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['produccion','mortalidad','tratamientos','movimientos_insumos','dispositivos'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
