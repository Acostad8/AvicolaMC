-- Agrega auditoría a la tabla razas (INSERT / UPDATE / DELETE)
-- Usa la función fn_audit_trigger ya definida en 20260603_auditoria_global.sql

DROP TRIGGER IF EXISTS trg_audit_razas ON public.razas;

CREATE TRIGGER trg_audit_razas
  AFTER INSERT OR UPDATE OR DELETE ON public.razas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
