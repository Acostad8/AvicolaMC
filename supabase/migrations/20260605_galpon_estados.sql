-- Migra los estados del galpón de activo/inactivo a tres estados operativos:
--   disponible      → sin lote, listo para alojar uno
--   en_produccion   → tiene un lote activo (gestionado por trigger)
--   en_mantenimiento → en limpieza, reparación o fuera de servicio temporal

BEGIN;

-- 1. Migrar datos existentes ------------------------------------------------
UPDATE public.galpones
SET estado = 'en_produccion'
WHERE estado = 'activo'
  AND id IN (
    SELECT DISTINCT galpon_id FROM public.lotes WHERE estado = 'activo'
  );

UPDATE public.galpones
SET estado = 'disponible'
WHERE estado = 'activo';

UPDATE public.galpones
SET estado = 'en_mantenimiento'
WHERE estado = 'inactivo';

-- 2. Actualizar restricción CHECK -------------------------------------------
ALTER TABLE public.galpones
  DROP CONSTRAINT IF EXISTS galpones_estado_check;

ALTER TABLE public.galpones
  ADD CONSTRAINT galpones_estado_check
  CHECK (estado IN ('disponible', 'en_produccion', 'en_mantenimiento'));

-- 3. Función trigger: sincroniza el estado del galpón con el lote -----------
CREATE OR REPLACE FUNCTION public.fn_sync_galpon_estado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Lote pasa a activo → galpón pasa a en_produccion
  IF (TG_OP = 'INSERT' AND NEW.estado = 'activo')
  OR (TG_OP = 'UPDATE' AND NEW.estado = 'activo' AND OLD.estado <> 'activo') THEN
    UPDATE public.galpones
    SET estado = 'en_produccion'
    WHERE id = NEW.galpon_id;
  END IF;

  -- Lote deja de estar activo → si no quedan otros lotes activos, galpón pasa a disponible
  IF TG_OP = 'UPDATE' AND OLD.estado = 'activo' AND NEW.estado <> 'activo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.lotes
      WHERE galpon_id = NEW.galpon_id
        AND estado = 'activo'
        AND id <> NEW.id
    ) THEN
      UPDATE public.galpones
      SET estado = 'disponible'
      WHERE id = NEW.galpon_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Adjuntar trigger a la tabla lotes -------------------------------------
DROP TRIGGER IF EXISTS trg_sync_galpon_estado ON public.lotes;

CREATE TRIGGER trg_sync_galpon_estado
  AFTER INSERT OR UPDATE OF estado ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_galpon_estado();

COMMIT;
