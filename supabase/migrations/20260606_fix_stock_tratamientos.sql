-- ================================================================
-- Fix: Stock de insumos no se actualiza al registrar/editar tratamiento
-- ================================================================
-- Problema 1 (crear): fn_movimiento_update_stock corre como SECURITY
--   INVOKER. Cuando un encargado inserta en movimientos_insumos, el
--   trigger intenta UPDATE insumos pero RLS lo bloquea silenciosamente
--   (0 filas, sin error). Solución: SECURITY DEFINER + search_path fijo.
--
-- Problema 2 (editar): La corrección de stock usaba supabase.from('insumos')
--   .update(...) directamente desde el cliente. RLS bloquea eso para
--   no-admins. Solución: el frontend ahora inserta en movimientos_insumos
--   (salida/entrada según el delta), y este trigger maneja el stock.
--   Se agrega política RLS para permitir entrada de corrección.
-- ================================================================

-- Fix 1: Hacer la función SECURITY DEFINER para que siempre pueda
-- actualizar stock independientemente de quién insertó el movimiento.
CREATE OR REPLACE FUNCTION public.fn_movimiento_update_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.insumos
      SET stock_actual = stock_actual + NEW.cantidad
    WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo = 'salida' THEN
    UPDATE public.insumos
      SET stock_actual = GREATEST(0, stock_actual - NEW.cantidad)
    WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Permitir a cualquier usuario autenticado insertar movimientos
-- de tipo 'entrada' generados automáticamente al editar un tratamiento
-- (devolución de stock por reducción de cantidad usada).
CREATE POLICY "movimientos: entrada correccion tratamiento"
  ON public.movimientos_insumos FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'entrada'
    AND registrado_por = auth.uid()
    AND destino_proveedor LIKE 'Corrección tratamiento:%'
  );
