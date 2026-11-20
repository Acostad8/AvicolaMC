-- ================================================================
-- Migración: tabla dispositivos (control multi-device offline)
-- Fecha: 2026-11-15
-- Objetivo: rastrear qué dispositivo tiene cambios pendientes de sync
--           para política "1 tablet por encargado" + banner de pendientes.
-- ================================================================

CREATE TABLE IF NOT EXISTS dispositivos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  fingerprint   TEXT NOT NULL,              -- UUID generado en cliente (localStorage)
  nombre        TEXT,                        -- Ej "Tablet Galpón 3" (editable por admin)
  user_agent    TEXT,                        -- navigator.userAgent al registrar
  plataforma    TEXT,                        -- "android" | "ios" | "desktop"
  last_sync     TIMESTAMPTZ,                 -- última vez que drenó cola completa
  last_seen     TIMESTAMPTZ DEFAULT NOW(),   -- última request desde este device
  pending_count INTEGER DEFAULT 0,           -- ops encoladas no sincronizadas
  activo        BOOLEAN DEFAULT TRUE,        -- admin puede desactivar (device perdido)
  perdida_aceptada BOOLEAN DEFAULT FALSE,    -- admin confirma pérdida de datos pendientes
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS dispositivos_user_id_idx
  ON dispositivos (user_id);

CREATE INDEX IF NOT EXISTS dispositivos_pending_idx
  ON dispositivos (user_id, pending_count)
  WHERE pending_count > 0 AND activo = TRUE;

-- Auto-update de updated_at
DROP TRIGGER IF EXISTS dispositivos_set_updated_at ON dispositivos;
CREATE TRIGGER dispositivos_set_updated_at
  BEFORE UPDATE ON dispositivos
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
ALTER TABLE dispositivos ENABLE ROW LEVEL SECURITY;

-- Usuario ve y edita solo sus propios dispositivos. Admin ve todos.
DROP POLICY IF EXISTS dispositivos_select ON dispositivos;
CREATE POLICY dispositivos_select ON dispositivos
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS dispositivos_insert ON dispositivos;
CREATE POLICY dispositivos_insert ON dispositivos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuario actualiza last_sync / pending_count / last_seen de sus devices.
-- Admin puede actualizar cualquier campo (desactivar, aceptar pérdida).
DROP POLICY IF EXISTS dispositivos_update ON dispositivos;
CREATE POLICY dispositivos_update ON dispositivos
  FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Solo admin puede borrar devices manualmente.
DROP POLICY IF EXISTS dispositivos_delete ON dispositivos;
CREATE POLICY dispositivos_delete ON dispositivos
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------
-- Helper: upsert device heartbeat desde cliente
-- Uso: supabase.rpc('dispositivo_heartbeat', {...})
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION dispositivo_heartbeat(
  p_fingerprint   TEXT,
  p_user_agent    TEXT DEFAULT NULL,
  p_plataforma    TEXT DEFAULT NULL,
  p_pending_count INTEGER DEFAULT 0,
  p_did_sync      BOOLEAN DEFAULT FALSE
)
RETURNS dispositivos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row dispositivos;
BEGIN
  INSERT INTO dispositivos (user_id, fingerprint, user_agent, plataforma, pending_count, last_seen, last_sync)
  VALUES (
    auth.uid(),
    p_fingerprint,
    p_user_agent,
    p_plataforma,
    p_pending_count,
    NOW(),
    CASE WHEN p_did_sync THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, fingerprint) DO UPDATE SET
    user_agent    = COALESCE(EXCLUDED.user_agent, dispositivos.user_agent),
    plataforma    = COALESCE(EXCLUDED.plataforma, dispositivos.plataforma),
    pending_count = EXCLUDED.pending_count,
    last_seen     = NOW(),
    last_sync     = CASE WHEN p_did_sync THEN NOW() ELSE dispositivos.last_sync END
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION dispositivo_heartbeat(TEXT, TEXT, TEXT, INTEGER, BOOLEAN) TO authenticated;

-- ----------------------------------------------------------------
-- Helper: query "otros devices con pendientes" (para banner login)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION mis_dispositivos_con_pendientes(p_fingerprint_actual TEXT)
RETURNS TABLE (
  id            UUID,
  nombre        TEXT,
  plataforma    TEXT,
  pending_count INTEGER,
  last_seen     TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nombre, plataforma, pending_count, last_seen
  FROM dispositivos
  WHERE user_id = auth.uid()
    AND activo = TRUE
    AND perdida_aceptada = FALSE
    AND pending_count > 0
    AND fingerprint <> p_fingerprint_actual
  ORDER BY last_seen DESC;
$$;

GRANT EXECUTE ON FUNCTION mis_dispositivos_con_pendientes(TEXT) TO authenticated;
