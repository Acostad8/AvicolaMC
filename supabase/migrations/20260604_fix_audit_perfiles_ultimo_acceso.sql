-- Fix: el trigger de perfiles disparaba en cada actualización de ultimo_acceso
-- (que ocurre automáticamente al autenticarse), generando registros espurios.
-- PostgreSQL no permite referenciar OLD en WHEN de un trigger INSERT,
-- por lo que se usan dos triggers separados:
--   - INSERT: siempre audita (registra creación de usuario)
--   - UPDATE: solo audita cuando cambian campos relevantes (excluye ultimo_acceso)

DROP TRIGGER IF EXISTS trg_audit_perfiles        ON public.perfiles;
DROP TRIGGER IF EXISTS trg_audit_perfiles_insert ON public.perfiles;
DROP TRIGGER IF EXISTS trg_audit_perfiles_update ON public.perfiles;

CREATE TRIGGER trg_audit_perfiles_insert
  AFTER INSERT ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_perfiles_update
  AFTER UPDATE ON public.perfiles
  FOR EACH ROW
  WHEN (
    NEW.nombre_completo IS DISTINCT FROM OLD.nombre_completo OR
    NEW.email           IS DISTINCT FROM OLD.email           OR
    NEW.rol             IS DISTINCT FROM OLD.rol             OR
    NEW.estado          IS DISTINCT FROM OLD.estado          OR
    NEW.empleado_id     IS DISTINCT FROM OLD.empleado_id
  )
  EXECUTE FUNCTION public.fn_audit_trigger();
