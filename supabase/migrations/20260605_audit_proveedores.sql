-- Agrega trigger de auditoría a la tabla proveedores.
-- La tabla fue omitida en la migración global de auditoría.

DROP TRIGGER IF EXISTS trg_audit_proveedores ON public.proveedores;

CREATE TRIGGER trg_audit_proveedores
  AFTER INSERT OR UPDATE OR DELETE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
