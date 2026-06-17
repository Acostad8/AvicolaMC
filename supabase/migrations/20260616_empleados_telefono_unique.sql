-- Restricción de unicidad en teléfono de empleados.
-- Se usa un índice parcial para ignorar filas sin teléfono (NULL o cadena vacía).
CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_telefono_unique
  ON public.empleados (telefono)
  WHERE telefono IS NOT NULL AND telefono <> '';
