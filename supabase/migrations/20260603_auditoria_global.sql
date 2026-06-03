-- ================================================================
-- Módulo de Auditoría Global — Sistema Avícola MC
-- Registra INSERT / UPDATE / DELETE en tablas clave vía triggers
-- y eventos de sesión (LOGIN, LOGOUT, PASSWORD_CHANGE) desde el frontend
-- ================================================================

-- ── Tabla unificada ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auditoria (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla            TEXT        NOT NULL,
  operacion        TEXT        NOT NULL,
  registro_id      TEXT,
  usuario_id       UUID,
  usuario_nombre   TEXT,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  descripcion      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para filtrado y ordenamiento eficiente
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla       ON public.auditoria (tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id  ON public.auditoria (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_operacion   ON public.auditoria (operacion);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Solo el administrador puede leer el log completo
CREATE POLICY "auditoria_admin_select"
  ON public.auditoria FOR SELECT
  TO authenticated
  USING (is_admin());

-- Cualquier usuario autenticado puede insertar (eventos de sesión desde frontend)
CREATE POLICY "auditoria_authenticated_insert"
  ON public.auditoria FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nadie puede modificar ni borrar registros de auditoría
-- (no se crean políticas UPDATE ni DELETE → acción denegada por defecto)

-- ── Función trigger unificada ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id   UUID;
  v_user_name TEXT;
BEGIN
  -- Obtener el usuario autenticado del JWT (PostgREST lo inyecta en la sesión)
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Resolución de nombre (denormalizado para preservar historia)
  IF v_user_id IS NOT NULL THEN
    SELECT nombre_completo INTO v_user_name
    FROM public.perfiles
    WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria
      (tabla, operacion, registro_id, usuario_id, usuario_nombre, datos_nuevos)
    VALUES
      (TG_TABLE_NAME, 'INSERT', NEW.id::TEXT, v_user_id, v_user_name, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.auditoria
      (tabla, operacion, registro_id, usuario_id, usuario_nombre, datos_anteriores, datos_nuevos)
    VALUES
      (TG_TABLE_NAME, 'UPDATE', NEW.id::TEXT, v_user_id, v_user_name, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.auditoria
      (tabla, operacion, registro_id, usuario_id, usuario_nombre, datos_anteriores)
    VALUES
      (TG_TABLE_NAME, 'DELETE', OLD.id::TEXT, v_user_id, v_user_name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

-- ── Triggers en tablas clave ──────────────────────────────────────

DROP TRIGGER IF EXISTS trg_audit_produccion         ON public.produccion;
DROP TRIGGER IF EXISTS trg_audit_mortalidad          ON public.mortalidad;
DROP TRIGGER IF EXISTS trg_audit_insumos             ON public.insumos;
DROP TRIGGER IF EXISTS trg_audit_movimientos_insumos ON public.movimientos_insumos;
DROP TRIGGER IF EXISTS trg_audit_tratamientos        ON public.tratamientos;
DROP TRIGGER IF EXISTS trg_audit_perfiles            ON public.perfiles;
DROP TRIGGER IF EXISTS trg_audit_galpones            ON public.galpones;
DROP TRIGGER IF EXISTS trg_audit_lotes               ON public.lotes;

CREATE TRIGGER trg_audit_produccion
  AFTER INSERT OR UPDATE OR DELETE ON public.produccion
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_mortalidad
  AFTER INSERT OR UPDATE OR DELETE ON public.mortalidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_insumos
  AFTER INSERT OR UPDATE OR DELETE ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_movimientos_insumos
  AFTER INSERT OR DELETE ON public.movimientos_insumos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_tratamientos
  AFTER INSERT OR UPDATE OR DELETE ON public.tratamientos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Perfiles: solo UPDATE (los INSERT los hace la edge function super-api)
CREATE TRIGGER trg_audit_perfiles
  AFTER UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_galpones
  AFTER INSERT OR UPDATE OR DELETE ON public.galpones
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_lotes
  AFTER INSERT OR UPDATE OR DELETE ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
