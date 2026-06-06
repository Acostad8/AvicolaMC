-- Agrega trigger de auditoría a la tabla empleados.
-- La tabla fue omitida en la migración global de auditoría.

DROP TRIGGER IF EXISTS trg_audit_empleados ON public.empleados;

CREATE TRIGGER trg_audit_empleados
  AFTER INSERT OR UPDATE OR DELETE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
