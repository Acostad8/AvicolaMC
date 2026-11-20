-- ================================================================
-- SEED: Producción y Mortalidad — últimos 15 días
-- ----------------------------------------------------------------
-- Genera registros realistas de producción (solo lotes ponedoras)
-- y mortalidad (todos los lotes activos) para los 15 días previos
-- a la fecha actual.
--
-- USO:
--   1. Abrir Supabase → SQL Editor
--   2. Pegar y ejecutar (corre como owner → bypassea RLS)
--   3. Revisa los NOTICE al final con totales insertados
--
-- IDEMPOTENTE:
--   - produccion tiene UNIQUE(fecha, galpon_id) → ON CONFLICT DO NOTHING
--   - mortalidad: evita duplicados por (fecha, galpon_id, lote_id)
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1) PRODUCCIÓN — solo lotes activos de razas 'ponedoras'
-- ----------------------------------------------------------------
WITH dias AS (
  SELECT generate_series(
    (CURRENT_DATE - INTERVAL '50 days')::date,
    (CURRENT_DATE - INTERVAL '1 day')::date,
    INTERVAL '1 day'
  )::date AS fecha
),
lotes_pon AS (
  SELECT l.id          AS lote_id,
         l.galpon_id,
         l.cantidad_aves_actuales,
         l.cantidad_inicial_aves,
         l.fecha_ingreso
  FROM lotes l
  JOIN razas r ON r.id = l.raza_id
  WHERE l.estado = 'activo'
    AND r.tipo = 'ponedoras'
),
candidatos AS (
  SELECT
    d.fecha,
    lp.lote_id,
    lp.galpon_id,
    lp.cantidad_aves_actuales,
    -- % postura base: 70-90 con variación pseudo-aleatoria estable por (fecha,lote)
    (70 + (abs(hashtext(d.fecha::text || lp.lote_id::text)) % 2100) / 100.0)::numeric(5,2) AS pct_postura
  FROM dias d
  CROSS JOIN lotes_pon lp
  WHERE d.fecha >= lp.fecha_ingreso    -- solo si el lote ya existía ese día
)
INSERT INTO produccion (fecha, galpon_id, lote_id, huevos_producidos, consumo_alimento_kg, porcentaje_postura, observaciones)
SELECT
  c.fecha,
  c.galpon_id,
  c.lote_id,
  -- huevos = aves * (pct_postura/100), redondeado
  GREATEST(0, round(c.cantidad_aves_actuales * c.pct_postura / 100.0))::int AS huevos_producidos,
  -- consumo: ~115 g por ave/día ± 10%, convertido a kg
  round(
    (c.cantidad_aves_actuales * 0.115)::numeric
    * (0.90 + (abs(hashtext('c' || c.fecha::text || c.lote_id::text)) % 200) / 1000.0)
  , 2) AS consumo_alimento_kg,
  c.pct_postura,
  'Registro histórico generado automáticamente (seed 15 días)'
FROM candidatos c
ON CONFLICT (fecha, galpon_id) DO NOTHING;

-- ----------------------------------------------------------------
-- 2) MORTALIDAD — lotes activos (ponedoras + engorde)
--    Simula tasa diaria ~0.05%-0.15% de las aves actuales
--    Solo inserta en ~60% de los días para no saturar
-- ----------------------------------------------------------------
WITH dias AS (
  SELECT generate_series(
    (CURRENT_DATE - INTERVAL '50 days')::date,
    (CURRENT_DATE - INTERVAL '1 day')::date,
    INTERVAL '1 day'
  )::date AS fecha
),
lotes_act AS (
  SELECT l.id AS lote_id, l.galpon_id, l.cantidad_aves_actuales, l.fecha_ingreso
  FROM lotes l
  WHERE l.estado = 'activo'
),
candidatos AS (
  SELECT
    d.fecha, la.lote_id, la.galpon_id, la.cantidad_aves_actuales,
    abs(hashtext('m' || d.fecha::text || la.lote_id::text)) AS h
  FROM dias d
  CROSS JOIN lotes_act la
  WHERE d.fecha >= la.fecha_ingreso
),
causas AS (
  SELECT ARRAY['enfermedad','accidente','causa_desconocida','calor_frio_extremo','otra']::text[] AS arr
)
INSERT INTO mortalidad (fecha, galpon_id, lote_id, cantidad_bajas, causa, observaciones)
SELECT
  c.fecha,
  c.galpon_id,
  c.lote_id,
  GREATEST(1, round(c.cantidad_aves_actuales * (0.0005 + (c.h % 100) / 100000.0)))::int AS cantidad_bajas,
  (SELECT arr[(c.h % 5) + 1] FROM causas),
  'Registro histórico generado automáticamente (seed 15 días)'
FROM candidatos c
WHERE (c.h % 10) < 6   -- ~60% de probabilidad de registrar mortalidad ese día
  AND NOT EXISTS (
    SELECT 1 FROM mortalidad m
    WHERE m.fecha = c.fecha
      AND m.galpon_id = c.galpon_id
      AND m.lote_id = c.lote_id
      AND m.observaciones = 'Registro histórico generado automáticamente (seed 15 días)'
  );

-- ----------------------------------------------------------------
-- 3) Resumen
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_prod int;
  v_mort int;
BEGIN
  SELECT count(*) INTO v_prod
    FROM produccion
    WHERE observaciones = 'Registro histórico generado automáticamente (seed 15 días)';
  SELECT count(*) INTO v_mort
    FROM mortalidad
    WHERE observaciones = 'Registro histórico generado automáticamente (seed 15 días)';
  RAISE NOTICE 'Seed completado → producción: % filas | mortalidad: % filas', v_prod, v_mort;
END $$;

COMMIT;

-- ================================================================
-- ROLLBACK (si quieres borrar lo generado):
-- ================================================================
-- BEGIN;
-- DELETE FROM produccion
--   WHERE observaciones = 'Registro histórico generado automáticamente (seed 15 días)';
-- DELETE FROM mortalidad
--   WHERE observaciones = 'Registro histórico generado automáticamente (seed 15 días)';
-- COMMIT;
