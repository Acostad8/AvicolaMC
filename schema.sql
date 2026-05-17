-- ================================================================
-- SCHEMA: Sistema de Gestión Avícola MC
-- Ejecutar en: Supabase SQL Editor (en orden exacto)
-- ================================================================

-- ============================================
-- 1. TABLAS BASE (sin dependencias)
-- ============================================

CREATE TABLE IF NOT EXISTS razas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ponedoras', 'engorde')),
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empleados (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo     TEXT NOT NULL,
  documento_identidad TEXT,
  cargo               TEXT,
  telefono            TEXT,
  fecha_ingreso       DATE,
  estado              TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PERFILES (extiende auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS perfiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email           TEXT,
  rol             TEXT NOT NULL CHECK (rol IN ('administrador', 'encargado')),
  estado          TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  empleado_id     UUID REFERENCES empleados(id),
  ultimo_acceso   TIMESTAMPTZ,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. GALPONES
-- ============================================

CREATE TABLE IF NOT EXISTS galpones (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre           TEXT NOT NULL,
  capacidad_maxima INTEGER NOT NULL,
  descripcion      TEXT,
  estado           TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  encargado_id     UUID REFERENCES perfiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. LOTES
-- ============================================

CREATE TABLE IF NOT EXISTS lotes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_numero         TEXT NOT NULL,
  galpon_id             UUID NOT NULL REFERENCES galpones(id) ON DELETE CASCADE,
  raza_id               UUID REFERENCES razas(id),
  cantidad_inicial_aves INTEGER NOT NULL,
  cantidad_aves_actuales INTEGER NOT NULL,
  fecha_ingreso         DATE NOT NULL,
  fecha_salida          DATE,
  estado                TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado')),
  notas                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. PRODUCCIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS produccion (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha               DATE NOT NULL,
  galpon_id           UUID NOT NULL REFERENCES galpones(id),
  lote_id             UUID NOT NULL REFERENCES lotes(id),
  huevos_producidos   INTEGER NOT NULL,
  consumo_alimento_kg DECIMAL(10,2) NOT NULL,
  porcentaje_postura  DECIMAL(5,2),
  observaciones       TEXT,
  registrado_por      UUID REFERENCES perfiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fecha, galpon_id)
);

-- ============================================
-- 6. MORTALIDAD
-- ============================================

CREATE TABLE IF NOT EXISTS mortalidad (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha          DATE NOT NULL,
  galpon_id      UUID NOT NULL REFERENCES galpones(id),
  lote_id        UUID NOT NULL REFERENCES lotes(id),
  cantidad_bajas INTEGER NOT NULL,
  causa          TEXT NOT NULL CHECK (causa IN ('enfermedad','accidente','causa_desconocida','depredador','calor_frio_extremo','otra')),
  causa_otra     TEXT,
  observaciones  TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. TRATAMIENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS tratamientos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE,
  galpon_id        UUID NOT NULL REFERENCES galpones(id),
  lote_id          UUID NOT NULL REFERENCES lotes(id),
  tipo             TEXT NOT NULL CHECK (tipo IN ('vacunacion','medicacion','desparasitacion','vitaminas','antibiotico','otro')),
  nombre_producto  TEXT NOT NULL,
  dosis_aplicacion TEXT NOT NULL,
  responsable      TEXT NOT NULL,
  estado           TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado')),
  observaciones    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. INSUMOS
-- ============================================

CREATE TABLE IF NOT EXISTS insumos (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre         TEXT NOT NULL,
  categoria      TEXT NOT NULL CHECK (categoria IN ('alimento','medicamento','vacuna','desinfectante','herramienta','otro')),
  unidad_medida  TEXT NOT NULL,
  stock_actual   DECIMAL(10,2) DEFAULT 0,
  stock_minimo   DECIMAL(10,2) DEFAULT 0,
  estado         TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. MOVIMIENTOS DE INSUMOS
-- ============================================

CREATE TABLE IF NOT EXISTS movimientos_insumos (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha              DATE NOT NULL,
  tipo               TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  insumo_id          UUID NOT NULL REFERENCES insumos(id),
  cantidad           DECIMAL(10,2) NOT NULL,
  destino_proveedor  TEXT,
  observaciones      TEXT,
  registrado_por     UUID REFERENCES perfiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_galpones_updated_at
  BEFORE UPDATE ON galpones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tratamientos_updated_at
  BEFORE UPDATE ON tratamientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Descuenta aves del lote al registrar mortalidad
CREATE OR REPLACE FUNCTION fn_mortalidad_update_lote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lotes
  SET cantidad_aves_actuales = GREATEST(0, cantidad_aves_actuales - NEW.cantidad_bajas)
  WHERE id = NEW.lote_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mortalidad_update_lote
  AFTER INSERT ON mortalidad
  FOR EACH ROW EXECUTE FUNCTION fn_mortalidad_update_lote();

-- Actualiza stock de insumos al registrar movimiento
CREATE OR REPLACE FUNCTION fn_movimiento_update_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE insumos SET stock_actual = stock_actual + NEW.cantidad WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo = 'salida' THEN
    UPDATE insumos SET stock_actual = GREATEST(0, stock_actual - NEW.cantidad) WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movimiento_update_stock
  AFTER INSERT ON movimientos_insumos
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_update_stock();

-- Crea perfil automáticamente al registrar usuario en auth
CREATE OR REPLACE FUNCTION fn_create_perfil_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre_completo, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'encargado')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_perfil_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_create_perfil_on_signup();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE galpones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE razas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

-- Función helper: verificar si es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND rol = 'administrador' AND estado = 'activo'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función helper: verificar acceso al galpón
CREATE OR REPLACE FUNCTION can_access_galpon(galpon_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1 FROM galpones WHERE id = galpon_uuid AND encargado_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PERFILES
CREATE POLICY "perfiles: ver propio o admin"    ON perfiles FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
CREATE POLICY "perfiles: actualizar propio"     ON perfiles FOR UPDATE TO authenticated USING (id = auth.uid() OR is_admin());
CREATE POLICY "perfiles: insertar admin"        ON perfiles FOR INSERT TO authenticated WITH CHECK (is_admin() OR id = auth.uid());

-- GALPONES
CREATE POLICY "galpones: ver asignados"         ON galpones FOR SELECT TO authenticated USING (is_admin() OR encargado_id = auth.uid());
CREATE POLICY "galpones: admin total"           ON galpones FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- LOTES
CREATE POLICY "lotes: ver de galpones asignados" ON lotes FOR SELECT TO authenticated USING (can_access_galpon(galpon_id));
CREATE POLICY "lotes: insertar admin o encargado" ON lotes FOR INSERT TO authenticated WITH CHECK (can_access_galpon(galpon_id));
CREATE POLICY "lotes: actualizar admin"          ON lotes FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "lotes: eliminar admin"            ON lotes FOR DELETE TO authenticated USING (is_admin());

-- RAZAS
CREATE POLICY "razas: leer todos"               ON razas FOR SELECT TO authenticated USING (true);
CREATE POLICY "razas: admin total"              ON razas FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- PRODUCCION
CREATE POLICY "produccion: ver asignados"       ON produccion FOR SELECT TO authenticated USING (can_access_galpon(galpon_id));
CREATE POLICY "produccion: insertar asignados"  ON produccion FOR INSERT TO authenticated WITH CHECK (can_access_galpon(galpon_id));
CREATE POLICY "produccion: actualizar 24h"      ON produccion FOR UPDATE TO authenticated USING (
  is_admin() OR (can_access_galpon(galpon_id) AND created_at > NOW() - INTERVAL '24 hours')
);
CREATE POLICY "produccion: eliminar admin"      ON produccion FOR DELETE TO authenticated USING (is_admin());

-- MORTALIDAD
CREATE POLICY "mortalidad: ver asignados"       ON mortalidad FOR SELECT TO authenticated USING (can_access_galpon(galpon_id));
CREATE POLICY "mortalidad: insertar asignados"  ON mortalidad FOR INSERT TO authenticated WITH CHECK (can_access_galpon(galpon_id));
CREATE POLICY "mortalidad: actualizar admin"    ON mortalidad FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "mortalidad: eliminar admin"      ON mortalidad FOR DELETE TO authenticated USING (is_admin());

-- TRATAMIENTOS
CREATE POLICY "tratamientos: ver asignados"     ON tratamientos FOR SELECT TO authenticated USING (can_access_galpon(galpon_id));
CREATE POLICY "tratamientos: admin total"       ON tratamientos FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- INSUMOS
CREATE POLICY "insumos: leer todos"             ON insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos: admin total"            ON insumos FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- MOVIMIENTOS
CREATE POLICY "movimientos: leer todos"         ON movimientos_insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "movimientos: admin inserta"      ON movimientos_insumos FOR INSERT TO authenticated WITH CHECK (is_admin());

-- EMPLEADOS
CREATE POLICY "empleados: admin total"          ON empleados FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- PRIMER ADMINISTRADOR
-- Reemplaza YOUR_USER_UUID con el UUID del usuario
-- que creaste en Supabase Auth (Authentication > Users)
-- ============================================
/*
INSERT INTO perfiles (id, nombre_completo, email, rol)
VALUES ('YOUR_USER_UUID', 'Administrador', 'admin@tugranja.com', 'administrador')
ON CONFLICT (id) DO UPDATE SET rol = 'administrador';
*/
