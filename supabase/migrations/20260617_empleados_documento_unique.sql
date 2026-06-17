-- Restricción de unicidad en documento de identidad de empleados.
-- Índice parcial: ignora filas sin documento (NULL o cadena vacía).
CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_documento_unique
  ON public.empleados (documento_identidad)
  WHERE documento_identidad IS NOT NULL AND documento_identidad <> '';
