-- Agrega FK empleado_id a tratamientos para vincular al empleado responsable.
-- Se conserva la columna responsable (texto) para denormalización y registros históricos.

ALTER TABLE public.tratamientos
  ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES public.empleados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tratamientos_empleado_id ON public.tratamientos (empleado_id);
