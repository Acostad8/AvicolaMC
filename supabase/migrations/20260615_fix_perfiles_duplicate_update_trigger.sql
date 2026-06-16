-- El trigger trg_audit_perfiles (INSERT OR UPDATE sin condición WHEN) quedó activo
-- porque fix_audit_perfiles_insert.sql se aplicó después de
-- fix_audit_perfiles_ultimo_acceso.sql, recreándolo y sobreescribiendo el fix.
-- Ya existen trg_audit_perfiles_insert y trg_audit_perfiles_update que cubren
-- correctamente INSERT y UPDATE (este último solo cuando cambian campos relevantes).
DROP TRIGGER IF EXISTS trg_audit_perfiles ON public.perfiles;
