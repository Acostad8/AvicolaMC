-- Fix: el trigger de perfiles solo cubría UPDATE.
-- El INSERT en perfiles lo realiza el frontend (no la edge function),
-- por lo que auth.uid() está disponible y el trigger funciona correctamente.

DROP TRIGGER IF EXISTS trg_audit_perfiles ON public.perfiles;

CREATE TRIGGER trg_audit_perfiles
  AFTER INSERT OR UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
