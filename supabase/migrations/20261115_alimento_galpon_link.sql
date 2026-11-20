-- ================================================================
-- Vincula consumo de alimento en producción con descuento de stock
-- en insumos, con conversión kg → unidad (saco/bulto).
-- ================================================================

BEGIN;

-- 1. Factor de conversión por insumo (kg contenidos en 1 unidad)
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS kg_por_unidad DECIMAL(10,2);

COMMENT ON COLUMN insumos.kg_por_unidad IS
  'Kilogramos contenidos en 1 unidad de medida. NULL = 1 (ya está en kg). Ej: saco 40kg → 40';

-- 2. Alimento asignado por galpón
ALTER TABLE galpones
  ADD COLUMN IF NOT EXISTS insumo_alimento_id UUID REFERENCES insumos(id);

COMMENT ON COLUMN galpones.insumo_alimento_id IS
  'Insumo (categoría=alimento) consumido por este galpón. Usado por trigger para descontar stock';

-- 3. Trazabilidad producción → movimiento
ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS movimiento_insumo_id UUID REFERENCES movimientos_insumos(id);

COMMENT ON COLUMN produccion.movimiento_insumo_id IS
  'Movimiento de salida generado automáticamente por trigger al registrar consumo';

-- ================================================================
-- Trigger: al insertar producción, descuenta alimento del galpón
-- ================================================================
CREATE OR REPLACE FUNCTION fn_produccion_descuenta_alimento()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_insumo_id UUID;
  v_kg_por_u  DECIMAL(10,2);
  v_unidades  DECIMAL(10,2);
  v_mov_id    UUID;
BEGIN
  IF NEW.consumo_alimento_kg IS NULL OR NEW.consumo_alimento_kg = 0 THEN
    RETURN NEW;
  END IF;

  SELECT insumo_alimento_id INTO v_insumo_id
    FROM galpones WHERE id = NEW.galpon_id;

  IF v_insumo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(kg_por_unidad, 1) INTO v_kg_por_u
    FROM insumos WHERE id = v_insumo_id;

  IF v_kg_por_u <= 0 THEN
    v_kg_por_u := 1;
  END IF;

  v_unidades := ROUND(NEW.consumo_alimento_kg / v_kg_por_u, 2);

  INSERT INTO movimientos_insumos (
    fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
  ) VALUES (
    NEW.fecha, 'salida', v_insumo_id, v_unidades,
    'Galpón ' || NEW.galpon_id::TEXT,
    format('Consumo automático: producción %s (%s kg)', NEW.id, NEW.consumo_alimento_kg),
    NEW.registrado_por
  ) RETURNING id INTO v_mov_id;

  NEW.movimiento_insumo_id := v_mov_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produccion_descuenta_alimento ON produccion;

CREATE TRIGGER trg_produccion_descuenta_alimento
  BEFORE INSERT ON produccion
  FOR EACH ROW EXECUTE FUNCTION fn_produccion_descuenta_alimento();

-- ================================================================
-- Trigger: al editar/borrar producción, revierte movimiento previo
-- ================================================================
CREATE OR REPLACE FUNCTION fn_produccion_revierte_alimento()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_mov RECORD;
  v_insumo_id UUID;
  v_kg_por_u  DECIMAL(10,2);
  v_unidades  DECIMAL(10,2);
  v_new_mov_id UUID;
BEGIN
  -- Caso DELETE: solo revertir si había movimiento vinculado
  IF TG_OP = 'DELETE' THEN
    IF OLD.movimiento_insumo_id IS NOT NULL THEN
      SELECT * INTO v_mov FROM movimientos_insumos WHERE id = OLD.movimiento_insumo_id;
      IF FOUND THEN
        INSERT INTO movimientos_insumos (
          fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
        ) VALUES (
          CURRENT_DATE, 'entrada', v_mov.insumo_id, v_mov.cantidad,
          v_mov.destino_proveedor,
          format('Reverso: producción %s eliminada', OLD.id),
          OLD.registrado_por
        );
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- Caso UPDATE: si cambió consumo o galpón, revertir viejo y crear nuevo
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.consumo_alimento_kg, 0) = COALESCE(NEW.consumo_alimento_kg, 0)
       AND OLD.galpon_id = NEW.galpon_id THEN
      RETURN NEW;
    END IF;

    -- Revertir viejo
    IF OLD.movimiento_insumo_id IS NOT NULL THEN
      SELECT * INTO v_mov FROM movimientos_insumos WHERE id = OLD.movimiento_insumo_id;
      IF FOUND THEN
        INSERT INTO movimientos_insumos (
          fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
        ) VALUES (
          CURRENT_DATE, 'entrada', v_mov.insumo_id, v_mov.cantidad,
          v_mov.destino_proveedor,
          format('Reverso por edición: producción %s', OLD.id),
          OLD.registrado_por
        );
      END IF;
    END IF;

    -- Crear nuevo movimiento con valor actualizado
    IF NEW.consumo_alimento_kg IS NOT NULL AND NEW.consumo_alimento_kg > 0 THEN
      SELECT insumo_alimento_id INTO v_insumo_id FROM galpones WHERE id = NEW.galpon_id;
      IF v_insumo_id IS NOT NULL THEN
        SELECT COALESCE(kg_por_unidad, 1) INTO v_kg_por_u FROM insumos WHERE id = v_insumo_id;
        IF v_kg_por_u <= 0 THEN v_kg_por_u := 1; END IF;

        v_unidades := ROUND(NEW.consumo_alimento_kg / v_kg_por_u, 2);

        INSERT INTO movimientos_insumos (
          fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
        ) VALUES (
          NEW.fecha, 'salida', v_insumo_id, v_unidades,
          'Galpón ' || NEW.galpon_id::TEXT,
          format('Consumo recalculado: producción %s (%s kg)', NEW.id, NEW.consumo_alimento_kg),
          NEW.registrado_por
        ) RETURNING id INTO v_new_mov_id;

        NEW.movimiento_insumo_id := v_new_mov_id;
      ELSE
        NEW.movimiento_insumo_id := NULL;
      END IF;
    ELSE
      NEW.movimiento_insumo_id := NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produccion_revierte_alimento ON produccion;

CREATE TRIGGER trg_produccion_revierte_alimento
  BEFORE UPDATE OR DELETE ON produccion
  FOR EACH ROW EXECUTE FUNCTION fn_produccion_revierte_alimento();

-- ================================================================
-- RLS: permitir al trigger insertar movimientos aunque no sea admin
-- (ya tiene SECURITY DEFINER, pero añadimos policy explícita para
--  entradas de reverso generadas desde trigger)
-- ================================================================
DROP POLICY IF EXISTS "movimientos: entrada reverso produccion" ON movimientos_insumos;

CREATE POLICY "movimientos: entrada reverso produccion" ON movimientos_insumos
  FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'entrada'
    AND observaciones LIKE 'Reverso%producción%'
  );

COMMIT;
