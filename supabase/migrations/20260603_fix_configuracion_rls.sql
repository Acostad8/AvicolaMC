-- ================================================================
-- Fix: política de lectura pública para configuracion
--
-- Problema: ConfigContext consulta esta tabla antes de que el usuario
-- se autentique (usando la clave anon). Con RLS habilitado y sin
-- política SELECT para anon, todas las filas quedan ocultas y
-- .single() retorna 404.
--
-- Solución: permitir lectura a todos (anon + authenticated).
-- La tabla solo tiene una fila con id=1 y no contiene datos sensibles.
-- ================================================================

-- Eliminar política previa si existe (evita conflictos)
DROP POLICY IF EXISTS "configuracion_public_read" ON public.configuracion;
DROP POLICY IF EXISTS "admin_update_configuracion"  ON public.configuracion;

-- Lectura pública: anon y usuarios autenticados pueden leer la config
CREATE POLICY "configuracion_public_read"
  ON public.configuracion FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo el administrador puede modificar la configuración
CREATE POLICY "configuracion_admin_update"
  ON public.configuracion FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Asegurar que exista la fila de configuración con id=1
INSERT INTO public.configuracion (id, granja, produccion, notificaciones)
VALUES (
  1,
  '{"nombre":"","nit":"","direccion":"","ciudad":"","telefono":"","email":""}'::jsonb,
  '{"postura_excelente":90,"postura_buena":75,"postura_regular":50,"alerta_mortalidad":5}'::jsonb,
  '{"habilitadas":true,"sistema":true,"produccion":true,"mortalidad":true,"recordatorios":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
