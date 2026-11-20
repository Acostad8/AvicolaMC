-- ================================================================
-- Habilita Supabase Realtime en las tablas del Gemelo Digital.
-- Correr UNA sola vez en el SQL editor de Supabase.
-- Si ya existe la publicación, los ADD TABLE son idempotentes:
-- en caso de conflicto se puede ignorar el error "already member".
-- ================================================================

-- Asegura que exista la publicación (normalmente ya creada por Supabase)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Añade las tablas que alimentan el Gemelo Digital
ALTER PUBLICATION supabase_realtime ADD TABLE public.mortalidad;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produccion;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tratamientos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.galpones;

-- (opcional) Verificar
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
