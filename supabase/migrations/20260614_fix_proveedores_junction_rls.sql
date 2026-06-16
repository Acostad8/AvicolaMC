-- Corrige las políticas RLS de las tablas relacionales de proveedores.
-- proveedores_insumos y proveedores_razas necesitan políticas explícitas
-- para INSERT y DELETE que no estaban definidas.

-- ── proveedores_insumos ───────────────────────────────────────────────────

ALTER TABLE public.proveedores_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_insumos: admin select"  ON public.proveedores_insumos;
DROP POLICY IF EXISTS "proveedores_insumos: admin insert"  ON public.proveedores_insumos;
DROP POLICY IF EXISTS "proveedores_insumos: admin delete"  ON public.proveedores_insumos;

-- Cualquier admin puede leer las relaciones
CREATE POLICY "proveedores_insumos: admin select"
  ON public.proveedores_insumos FOR SELECT
  TO authenticated
  USING (is_admin());

-- Solo admin puede insertar relaciones
CREATE POLICY "proveedores_insumos: admin insert"
  ON public.proveedores_insumos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Solo admin puede eliminar relaciones
CREATE POLICY "proveedores_insumos: admin delete"
  ON public.proveedores_insumos FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── proveedores_razas ─────────────────────────────────────────────────────

ALTER TABLE public.proveedores_razas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_razas: admin select"  ON public.proveedores_razas;
DROP POLICY IF EXISTS "proveedores_razas: admin insert"  ON public.proveedores_razas;
DROP POLICY IF EXISTS "proveedores_razas: admin delete"  ON public.proveedores_razas;

CREATE POLICY "proveedores_razas: admin select"
  ON public.proveedores_razas FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "proveedores_razas: admin insert"
  ON public.proveedores_razas FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "proveedores_razas: admin delete"
  ON public.proveedores_razas FOR DELETE
  TO authenticated
  USING (is_admin());
