-- ================================================================
-- Fix 1: Agregar columnas que faltaban en tratamientos
-- El formulario intentaba insertar insumo_id y cantidad_usada
-- pero la tabla no las tenía → INSERT fallaba silenciosamente
-- ================================================================

ALTER TABLE public.tratamientos
  ADD COLUMN IF NOT EXISTS insumo_id     UUID REFERENCES public.insumos(id),
  ADD COLUMN IF NOT EXISTS cantidad_usada DECIMAL(10,2);

-- ================================================================
-- Fix 2: RLS de movimientos_insumos
-- La política anterior solo permitía admins para TODO insert.
-- Problema: encargados no podían registrar salidas al crear
-- tratamientos. Se separa en dos políticas:
--   • Admin: puede insertar entradas Y salidas
--   • Encargado: solo puede insertar salidas propias
--     (consumo de insumos en tratamientos)
-- ================================================================

DROP POLICY IF EXISTS "movimientos: admin inserta" ON public.movimientos_insumos;

-- Admin registra cualquier movimiento (compras y usos)
CREATE POLICY "movimientos: admin inserta todo"
  ON public.movimientos_insumos FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Encargado solo registra salidas con su propio ID
-- (se usa automáticamente al guardar un tratamiento)
CREATE POLICY "movimientos: salida propia"
  ON public.movimientos_insumos FOR INSERT TO authenticated
  WITH CHECK (tipo = 'salida' AND registrado_por = auth.uid());
