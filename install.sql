-- ================================================================
-- INSTALL.SQL — Sistema de Gestión Avícola MC
-- ----------------------------------------------------------------
-- Script de instalación consolidado para desplegar el sistema en
-- un proyecto Supabase nuevo (modelo single-tenant por cliente).
--
-- USO:
--   1. Crear un proyecto nuevo en Supabase (https://supabase.com)
--   2. Abrir el SQL Editor del proyecto
--   3. Pegar este archivo completo y ejecutar (Run)
--   4. Crear el usuario administrador en Authentication > Users
--   5. Ejecutar el bloque "PRIMER ADMINISTRADOR" al final reemplazando
--      el UUID por el del usuario recién creado
--
-- IDEMPOTENTE: puede ejecutarse varias veces sin romper nada.
-- ================================================================

BEGIN;

-- ================================================================
-- SECCIÓN 1 — TABLAS BASE
-- ================================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_telefono_unique
  ON empleados (telefono)
  WHERE telefono IS NOT NULL AND telefono <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_documento_unique
  ON empleados (documento_identidad)
  WHERE documento_identidad IS NOT NULL AND documento_identidad <> '';

-- ================================================================
-- SECCIÓN 2 — PERFILES (extiende auth.users)
-- ================================================================

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

-- ================================================================
-- SECCIÓN 3 — GALPONES, LOTES, INSUMOS Y MOVIMIENTOS
-- ================================================================

CREATE TABLE IF NOT EXISTS galpones (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre             TEXT NOT NULL,
  capacidad_maxima   INTEGER NOT NULL,
  descripcion        TEXT,
  estado             TEXT DEFAULT 'disponible'
                       CHECK (estado IN ('disponible', 'en_produccion', 'en_mantenimiento')),
  encargado_id       UUID REFERENCES perfiles(id),
  insumo_alimento_id UUID REFERENCES insumos(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lotes (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_numero          TEXT NOT NULL,
  galpon_id              UUID NOT NULL REFERENCES galpones(id) ON DELETE CASCADE,
  raza_id                UUID REFERENCES razas(id),
  cantidad_inicial_aves  INTEGER NOT NULL,
  cantidad_aves_actuales INTEGER NOT NULL,
  fecha_ingreso          DATE NOT NULL,
  fecha_salida           DATE,
  estado                 TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado')),
  notas                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insumos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        TEXT NOT NULL,
  categoria     TEXT NOT NULL CHECK (categoria IN ('alimento','medicamento','vacuna','desinfectante','herramienta','otro')),
  unidad_medida TEXT NOT NULL,
  stock_actual  DECIMAL(10,2) DEFAULT 0,
  stock_minimo  DECIMAL(10,2) DEFAULT 0,
  kg_por_unidad DECIMAL(10,2),
  estado        TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_insumos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha             DATE NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  insumo_id         UUID NOT NULL REFERENCES insumos(id),
  cantidad          DECIMAL(10,2) NOT NULL,
  destino_proveedor TEXT,
  observaciones     TEXT,
  registrado_por    UUID REFERENCES perfiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- SECCIÓN 4 — PRODUCCIÓN, MORTALIDAD Y TRATAMIENTOS
-- ================================================================

CREATE TABLE IF NOT EXISTS produccion (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha                DATE NOT NULL,
  galpon_id            UUID NOT NULL REFERENCES galpones(id),
  lote_id              UUID NOT NULL REFERENCES lotes(id),
  huevos_producidos    INTEGER NOT NULL,
  consumo_alimento_kg  DECIMAL(10,2) NOT NULL,
  porcentaje_postura   DECIMAL(5,2),
  observaciones        TEXT,
  registrado_por       UUID REFERENCES perfiles(id),
  movimiento_insumo_id UUID REFERENCES movimientos_insumos(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fecha, galpon_id)
);

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
  insumo_id        UUID REFERENCES insumos(id),
  cantidad_usada   DECIMAL(10,2),
  empleado_id      UUID REFERENCES empleados(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tratamientos_empleado_id
  ON tratamientos (empleado_id);

-- ================================================================
-- SECCIÓN 5 — PROVEEDORES (y tablas relacionales)
-- ================================================================

CREATE TABLE IF NOT EXISTS proveedores (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre         TEXT NOT NULL,
  telefono       TEXT NOT NULL,
  correo         TEXT,
  direccion      TEXT,
  tipo_proveedor TEXT NOT NULL CHECK (tipo_proveedor IN ('insumos','razas','ambos','otro')),
  estado         TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores_insumos (
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  insumo_id    UUID NOT NULL REFERENCES insumos(id)     ON DELETE CASCADE,
  PRIMARY KEY (proveedor_id, insumo_id)
);

CREATE TABLE IF NOT EXISTS proveedores_razas (
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  raza_id      UUID NOT NULL REFERENCES razas(id)       ON DELETE CASCADE,
  PRIMARY KEY (proveedor_id, raza_id)
);

-- ================================================================
-- SECCIÓN 6 — CONFIGURACIÓN GLOBAL DEL SISTEMA (single row, id=1)
-- ================================================================

CREATE TABLE IF NOT EXISTS configuracion (
  id              INTEGER PRIMARY KEY,
  granja          JSONB,
  produccion      JSONB,
  notificaciones  JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracion (id, granja, produccion, notificaciones)
VALUES (
  1,
  '{"nombre":"","nit":"","direccion":"","ciudad":"","telefono":"","email":""}'::jsonb,
  '{"postura_excelente":90,"postura_buena":75,"postura_regular":50,"alerta_mortalidad":5,"umbral_dias_tratamiento":7,"peso_promedio_huevo_g":60}'::jsonb,
  '{"habilitadas":true,"sistema":true,"produccion":true,"mortalidad":true,"recordatorios":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- SECCIÓN 7 — AUDITORÍA GLOBAL
-- ================================================================

CREATE TABLE IF NOT EXISTS auditoria (
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

CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla       ON auditoria (tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id  ON auditoria (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_operacion   ON auditoria (operacion);

-- Auditoría específica heredada (producción y mortalidad)
CREATE TABLE IF NOT EXISTS auditoria_produccion (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  produccion_id    UUID        NOT NULL REFERENCES produccion(id) ON DELETE CASCADE,
  editado_por      UUID        NOT NULL REFERENCES perfiles(id),
  datos_anteriores JSONB       NOT NULL,
  datos_nuevos     JSONB       NOT NULL,
  editado_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria_mortalidad (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mortalidad_id    UUID        NOT NULL REFERENCES mortalidad(id) ON DELETE CASCADE,
  editado_por      UUID        NOT NULL REFERENCES perfiles(id),
  datos_anteriores JSONB       NOT NULL,
  datos_nuevos     JSONB       NOT NULL,
  editado_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- SECCIÓN 8 — FUNCIONES HELPER
-- ================================================================

-- Verifica si el usuario actual es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
      AND rol = 'administrador'
      AND estado = 'activo'
  );
$$;

-- Verifica si el usuario actual puede acceder a un galpón
CREATE OR REPLACE FUNCTION can_access_galpon(galpon_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1 FROM galpones
    WHERE id = galpon_uuid AND encargado_id = auth.uid()
  );
$$;

-- ================================================================
-- SECCIÓN 9 — FUNCIONES Y TRIGGERS DE LÓGICA DE NEGOCIO
-- ================================================================

-- Auto-update de la columna updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_galpones_updated_at     ON galpones;
DROP TRIGGER IF EXISTS trg_tratamientos_updated_at ON tratamientos;

CREATE TRIGGER trg_galpones_updated_at
  BEFORE UPDATE ON galpones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tratamientos_updated_at
  BEFORE UPDATE ON tratamientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Descuento de aves del lote al registrar mortalidad
CREATE OR REPLACE FUNCTION fn_mortalidad_update_lote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lotes
  SET cantidad_aves_actuales = GREATEST(0, cantidad_aves_actuales - NEW.cantidad_bajas)
  WHERE id = NEW.lote_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mortalidad_update_lote ON mortalidad;

CREATE TRIGGER trg_mortalidad_update_lote
  AFTER INSERT ON mortalidad
  FOR EACH ROW EXECUTE FUNCTION fn_mortalidad_update_lote();

-- Actualización de stock de insumos (SECURITY DEFINER para sortear RLS desde el trigger)
CREATE OR REPLACE FUNCTION fn_movimiento_update_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE insumos SET stock_actual = stock_actual + NEW.cantidad WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo = 'salida' THEN
    UPDATE insumos SET stock_actual = GREATEST(0, stock_actual - NEW.cantidad) WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimiento_update_stock ON movimientos_insumos;

CREATE TRIGGER trg_movimiento_update_stock
  AFTER INSERT ON movimientos_insumos
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_update_stock();

-- Al insertar producción, descuenta alimento del galpón (BEFORE INSERT)
CREATE OR REPLACE FUNCTION fn_produccion_descuenta_alimento()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_insumo_id UUID;
  v_kg_por_u  DECIMAL(10,2);
  v_unidades  DECIMAL(10,2);
  v_mov_id    UUID;
BEGIN
  IF NEW.consumo_alimento_kg IS NULL OR NEW.consumo_alimento_kg = 0 THEN
    RETURN NEW;
  END IF;

  SELECT insumo_alimento_id INTO v_insumo_id
    FROM galpones WHERE id = NEW.galpon_id;

  IF v_insumo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(kg_por_unidad, 1) INTO v_kg_por_u
    FROM insumos WHERE id = v_insumo_id;

  IF v_kg_por_u <= 0 THEN
    v_kg_por_u := 1;
  END IF;

  v_unidades := ROUND(NEW.consumo_alimento_kg / v_kg_por_u, 2);

  INSERT INTO movimientos_insumos (
    fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
  ) VALUES (
    NEW.fecha, 'salida', v_insumo_id, v_unidades,
    'Galpón ' || NEW.galpon_id::TEXT,
    format('Consumo automático: producción %s (%s kg)', NEW.id, NEW.consumo_alimento_kg),
    NEW.registrado_por
  ) RETURNING id INTO v_mov_id;

  NEW.movimiento_insumo_id := v_mov_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produccion_descuenta_alimento ON produccion;

CREATE TRIGGER trg_produccion_descuenta_alimento
  BEFORE INSERT ON produccion
  FOR EACH ROW EXECUTE FUNCTION fn_produccion_descuenta_alimento();

-- Al editar/borrar producción, revierte movimiento previo y recalcula
CREATE OR REPLACE FUNCTION fn_produccion_revierte_alimento()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_mov RECORD;
  v_insumo_id UUID;
  v_kg_por_u  DECIMAL(10,2);
  v_unidades  DECIMAL(10,2);
  v_new_mov_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.movimiento_insumo_id IS NOT NULL THEN
      SELECT * INTO v_mov FROM movimientos_insumos WHERE id = OLD.movimiento_insumo_id;
      IF FOUND THEN
        INSERT INTO movimientos_insumos (
          fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
        ) VALUES (
          CURRENT_DATE, 'entrada', v_mov.insumo_id, v_mov.cantidad,
          v_mov.destino_proveedor,
          format('Reverso: producción %s eliminada', OLD.id),
          OLD.registrado_por
        );
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.consumo_alimento_kg, 0) = COALESCE(NEW.consumo_alimento_kg, 0)
       AND OLD.galpon_id = NEW.galpon_id THEN
      RETURN NEW;
    END IF;

    IF OLD.movimiento_insumo_id IS NOT NULL THEN
      SELECT * INTO v_mov FROM movimientos_insumos WHERE id = OLD.movimiento_insumo_id;
      IF FOUND THEN
        INSERT INTO movimientos_insumos (
          fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
        ) VALUES (
          CURRENT_DATE, 'entrada', v_mov.insumo_id, v_mov.cantidad,
          v_mov.destino_proveedor,
          format('Reverso por edición: producción %s', OLD.id),
          OLD.registrado_por
        );
      END IF;
    END IF;

    IF NEW.consumo_alimento_kg IS NOT NULL AND NEW.consumo_alimento_kg > 0 THEN
      SELECT insumo_alimento_id INTO v_insumo_id FROM galpones WHERE id = NEW.galpon_id;
      IF v_insumo_id IS NOT NULL THEN
        SELECT COALESCE(kg_por_unidad, 1) INTO v_kg_por_u FROM insumos WHERE id = v_insumo_id;
        IF v_kg_por_u <= 0 THEN v_kg_por_u := 1; END IF;

        v_unidades := ROUND(NEW.consumo_alimento_kg / v_kg_por_u, 2);

        INSERT INTO movimientos_insumos (
          fecha, tipo, insumo_id, cantidad, destino_proveedor, observaciones, registrado_por
        ) VALUES (
          NEW.fecha, 'salida', v_insumo_id, v_unidades,
          'Galpón ' || NEW.galpon_id::TEXT,
          format('Consumo recalculado: producción %s (%s kg)', NEW.id, NEW.consumo_alimento_kg),
          NEW.registrado_por
        ) RETURNING id INTO v_new_mov_id;

        NEW.movimiento_insumo_id := v_new_mov_id;
      ELSE
        NEW.movimiento_insumo_id := NULL;
      END IF;
    ELSE
      NEW.movimiento_insumo_id := NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produccion_revierte_alimento ON produccion;

CREATE TRIGGER trg_produccion_revierte_alimento
  BEFORE UPDATE OR DELETE ON produccion
  FOR EACH ROW EXECUTE FUNCTION fn_produccion_revierte_alimento();

-- Crea perfil automáticamente al registrar un usuario en auth.users
CREATE OR REPLACE FUNCTION fn_create_perfil_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_create_perfil_on_signup ON auth.users;

CREATE TRIGGER trg_create_perfil_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_create_perfil_on_signup();

-- Sincroniza el estado del galpón con el estado del lote
CREATE OR REPLACE FUNCTION fn_sync_galpon_estado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.estado = 'activo')
  OR (TG_OP = 'UPDATE' AND NEW.estado = 'activo' AND OLD.estado <> 'activo') THEN
    UPDATE galpones SET estado = 'en_produccion' WHERE id = NEW.galpon_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado = 'activo' AND NEW.estado <> 'activo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM lotes
      WHERE galpon_id = NEW.galpon_id
        AND estado = 'activo'
        AND id <> NEW.id
    ) THEN
      UPDATE galpones SET estado = 'disponible' WHERE id = NEW.galpon_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_galpon_estado ON lotes;

CREATE TRIGGER trg_sync_galpon_estado
  AFTER INSERT OR UPDATE OF estado ON lotes
  FOR EACH ROW EXECUTE FUNCTION fn_sync_galpon_estado();

-- ================================================================
-- SECCIÓN 10 — FUNCIÓN Y TRIGGERS DE AUDITORÍA GLOBAL
-- ================================================================

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id   UUID;
  v_user_name TEXT;
BEGIN
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    SELECT nombre_completo INTO v_user_name FROM perfiles WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, usuario_nombre, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::TEXT, v_user_id, v_user_name, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, usuario_nombre, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::TEXT, v_user_id, v_user_name, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, usuario_nombre, datos_anteriores)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::TEXT, v_user_id, v_user_name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

-- Triggers de auditoría en todas las tablas operativas
DROP TRIGGER IF EXISTS trg_audit_produccion          ON produccion;
DROP TRIGGER IF EXISTS trg_audit_mortalidad          ON mortalidad;
DROP TRIGGER IF EXISTS trg_audit_insumos             ON insumos;
DROP TRIGGER IF EXISTS trg_audit_movimientos_insumos ON movimientos_insumos;
DROP TRIGGER IF EXISTS trg_audit_tratamientos        ON tratamientos;
DROP TRIGGER IF EXISTS trg_audit_galpones            ON galpones;
DROP TRIGGER IF EXISTS trg_audit_lotes               ON lotes;
DROP TRIGGER IF EXISTS trg_audit_empleados           ON empleados;
DROP TRIGGER IF EXISTS trg_audit_proveedores         ON proveedores;
DROP TRIGGER IF EXISTS trg_audit_razas               ON razas;
DROP TRIGGER IF EXISTS trg_audit_perfiles            ON perfiles;
DROP TRIGGER IF EXISTS trg_audit_perfiles_insert     ON perfiles;
DROP TRIGGER IF EXISTS trg_audit_perfiles_update     ON perfiles;

CREATE TRIGGER trg_audit_produccion
  AFTER INSERT OR UPDATE OR DELETE ON produccion
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_mortalidad
  AFTER INSERT OR UPDATE OR DELETE ON mortalidad
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_insumos
  AFTER INSERT OR UPDATE OR DELETE ON insumos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_movimientos_insumos
  AFTER INSERT OR DELETE ON movimientos_insumos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_tratamientos
  AFTER INSERT OR UPDATE OR DELETE ON tratamientos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_galpones
  AFTER INSERT OR UPDATE OR DELETE ON galpones
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_lotes
  AFTER INSERT OR UPDATE OR DELETE ON lotes
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_empleados
  AFTER INSERT OR UPDATE OR DELETE ON empleados
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_proveedores
  AFTER INSERT OR UPDATE OR DELETE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_razas
  AFTER INSERT OR UPDATE OR DELETE ON razas
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- Perfiles: INSERT siempre, UPDATE solo si cambian campos relevantes
-- (evita registros espurios al actualizar ultimo_acceso en cada login)
CREATE TRIGGER trg_audit_perfiles_insert
  AFTER INSERT ON perfiles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_perfiles_update
  AFTER UPDATE ON perfiles
  FOR EACH ROW
  WHEN (
    NEW.nombre_completo IS DISTINCT FROM OLD.nombre_completo OR
    NEW.email           IS DISTINCT FROM OLD.email           OR
    NEW.rol             IS DISTINCT FROM OLD.rol             OR
    NEW.estado          IS DISTINCT FROM OLD.estado          OR
    NEW.empleado_id     IS DISTINCT FROM OLD.empleado_id
  )
  EXECUTE FUNCTION fn_audit_trigger();

-- ================================================================
-- SECCIÓN 11 — ROW LEVEL SECURITY (habilitar en todas las tablas)
-- ================================================================

ALTER TABLE perfiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE galpones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE razas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalidad           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_insumos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_insumos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_razas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria            ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_mortalidad ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- SECCIÓN 12 — POLÍTICAS RLS
-- (DROP IF EXISTS antes de cada CREATE para idempotencia)
-- ================================================================

-- ── PERFILES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "perfiles: ver propio o admin" ON perfiles;
DROP POLICY IF EXISTS "perfiles: actualizar propio"  ON perfiles;
DROP POLICY IF EXISTS "perfiles: insertar admin"     ON perfiles;

CREATE POLICY "perfiles: ver propio o admin" ON perfiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "perfiles: actualizar propio" ON perfiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "perfiles: insertar admin" ON perfiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR id = auth.uid());

-- ── GALPONES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "galpones: ver asignados" ON galpones;
DROP POLICY IF EXISTS "galpones: admin total"   ON galpones;

CREATE POLICY "galpones: ver asignados" ON galpones
  FOR SELECT TO authenticated
  USING (is_admin() OR encargado_id = auth.uid());

CREATE POLICY "galpones: admin total" ON galpones
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── LOTES ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lotes: ver de galpones asignados"  ON lotes;
DROP POLICY IF EXISTS "lotes: insertar admin o encargado" ON lotes;
DROP POLICY IF EXISTS "lotes: actualizar admin"           ON lotes;
DROP POLICY IF EXISTS "lotes: eliminar admin"             ON lotes;

CREATE POLICY "lotes: ver de galpones asignados" ON lotes
  FOR SELECT TO authenticated
  USING (can_access_galpon(galpon_id));

CREATE POLICY "lotes: insertar admin o encargado" ON lotes
  FOR INSERT TO authenticated
  WITH CHECK (can_access_galpon(galpon_id));

CREATE POLICY "lotes: actualizar admin" ON lotes
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "lotes: eliminar admin" ON lotes
  FOR DELETE TO authenticated
  USING (is_admin());

-- ── RAZAS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "razas: leer todos"  ON razas;
DROP POLICY IF EXISTS "razas: admin total" ON razas;

CREATE POLICY "razas: leer todos" ON razas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "razas: admin total" ON razas
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── PRODUCCIÓN ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "produccion: ver asignados"      ON produccion;
DROP POLICY IF EXISTS "produccion: insertar asignados" ON produccion;
DROP POLICY IF EXISTS "produccion: actualizar 24h"     ON produccion;
DROP POLICY IF EXISTS "produccion: eliminar admin"     ON produccion;

CREATE POLICY "produccion: ver asignados" ON produccion
  FOR SELECT TO authenticated
  USING (can_access_galpon(galpon_id));

CREATE POLICY "produccion: insertar asignados" ON produccion
  FOR INSERT TO authenticated
  WITH CHECK (can_access_galpon(galpon_id));

CREATE POLICY "produccion: actualizar 24h" ON produccion
  FOR UPDATE TO authenticated
  USING (
    is_admin() OR (can_access_galpon(galpon_id) AND created_at > NOW() - INTERVAL '24 hours')
  );

CREATE POLICY "produccion: eliminar admin" ON produccion
  FOR DELETE TO authenticated
  USING (is_admin());

-- ── MORTALIDAD ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mortalidad: ver asignados"      ON mortalidad;
DROP POLICY IF EXISTS "mortalidad: insertar asignados" ON mortalidad;
DROP POLICY IF EXISTS "mortalidad: actualizar admin"   ON mortalidad;
DROP POLICY IF EXISTS "mortalidad: eliminar admin"     ON mortalidad;

CREATE POLICY "mortalidad: ver asignados" ON mortalidad
  FOR SELECT TO authenticated
  USING (can_access_galpon(galpon_id));

CREATE POLICY "mortalidad: insertar asignados" ON mortalidad
  FOR INSERT TO authenticated
  WITH CHECK (can_access_galpon(galpon_id));

CREATE POLICY "mortalidad: actualizar admin" ON mortalidad
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "mortalidad: eliminar admin" ON mortalidad
  FOR DELETE TO authenticated
  USING (is_admin());

-- ── TRATAMIENTOS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "tratamientos: ver asignados" ON tratamientos;
DROP POLICY IF EXISTS "tratamientos: admin total"   ON tratamientos;

CREATE POLICY "tratamientos: ver asignados" ON tratamientos
  FOR SELECT TO authenticated
  USING (can_access_galpon(galpon_id));

CREATE POLICY "tratamientos: admin total" ON tratamientos
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── INSUMOS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insumos: leer todos"  ON insumos;
DROP POLICY IF EXISTS "insumos: admin total" ON insumos;

CREATE POLICY "insumos: leer todos" ON insumos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insumos: admin total" ON insumos
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── MOVIMIENTOS DE INSUMOS ────────────────────────────────────────
DROP POLICY IF EXISTS "movimientos: leer todos"                       ON movimientos_insumos;
DROP POLICY IF EXISTS "movimientos: admin inserta"                    ON movimientos_insumos;
DROP POLICY IF EXISTS "movimientos: admin inserta todo"               ON movimientos_insumos;
DROP POLICY IF EXISTS "movimientos: salida propia"                    ON movimientos_insumos;
DROP POLICY IF EXISTS "movimientos: entrada correccion tratamiento"   ON movimientos_insumos;

CREATE POLICY "movimientos: leer todos" ON movimientos_insumos
  FOR SELECT TO authenticated USING (true);

-- Admin: cualquier movimiento (compras y usos)
CREATE POLICY "movimientos: admin inserta todo" ON movimientos_insumos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Encargado: salidas propias (consumo en tratamientos)
CREATE POLICY "movimientos: salida propia" ON movimientos_insumos
  FOR INSERT TO authenticated
  WITH CHECK (tipo = 'salida' AND registrado_por = auth.uid());

-- Reverso automático generado por triggers de producción
CREATE POLICY "movimientos: entrada reverso produccion" ON movimientos_insumos
  FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'entrada'
    AND observaciones LIKE 'Reverso%producción%'
  );

-- Corrección automática al editar tratamiento (devolución de stock)
CREATE POLICY "movimientos: entrada correccion tratamiento" ON movimientos_insumos
  FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'entrada'
    AND registrado_por = auth.uid()
    AND destino_proveedor LIKE 'Corrección tratamiento:%'
  );

-- ── EMPLEADOS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "empleados: admin total" ON empleados;

CREATE POLICY "empleados: admin total" ON empleados
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── PROVEEDORES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "proveedores: admin total" ON proveedores;

CREATE POLICY "proveedores: admin total" ON proveedores
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── PROVEEDORES_INSUMOS (junction) ────────────────────────────────
DROP POLICY IF EXISTS "proveedores_insumos: admin select" ON proveedores_insumos;
DROP POLICY IF EXISTS "proveedores_insumos: admin insert" ON proveedores_insumos;
DROP POLICY IF EXISTS "proveedores_insumos: admin delete" ON proveedores_insumos;

CREATE POLICY "proveedores_insumos: admin select" ON proveedores_insumos
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "proveedores_insumos: admin insert" ON proveedores_insumos
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "proveedores_insumos: admin delete" ON proveedores_insumos
  FOR DELETE TO authenticated USING (is_admin());

-- ── PROVEEDORES_RAZAS (junction) ──────────────────────────────────
DROP POLICY IF EXISTS "proveedores_razas: admin select" ON proveedores_razas;
DROP POLICY IF EXISTS "proveedores_razas: admin insert" ON proveedores_razas;
DROP POLICY IF EXISTS "proveedores_razas: admin delete" ON proveedores_razas;

CREATE POLICY "proveedores_razas: admin select" ON proveedores_razas
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "proveedores_razas: admin insert" ON proveedores_razas
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "proveedores_razas: admin delete" ON proveedores_razas
  FOR DELETE TO authenticated USING (is_admin());

-- ── CONFIGURACIÓN ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "configuracion_public_read"   ON configuracion;
DROP POLICY IF EXISTS "configuracion_admin_update"  ON configuracion;
DROP POLICY IF EXISTS "admin_update_configuracion"  ON configuracion;

-- Lectura pública: ConfigContext lee la config antes de autenticar
CREATE POLICY "configuracion_public_read" ON configuracion
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "configuracion_admin_update" ON configuracion
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── AUDITORÍA GLOBAL ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auditoria_admin_select"          ON auditoria;
DROP POLICY IF EXISTS "auditoria_authenticated_insert"  ON auditoria;

CREATE POLICY "auditoria_admin_select" ON auditoria
  FOR SELECT TO authenticated USING (is_admin());

-- Insert abierto para eventos de sesión desde el frontend
CREATE POLICY "auditoria_authenticated_insert" ON auditoria
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── AUDITORÍA PRODUCCIÓN ──────────────────────────────────────────
DROP POLICY IF EXISTS "Admin lee auditoria produccion"        ON auditoria_produccion;
DROP POLICY IF EXISTS "Encargado lee auditoria de su galpon"  ON auditoria_produccion;
DROP POLICY IF EXISTS "Insertar auditoria produccion propia"  ON auditoria_produccion;

CREATE POLICY "Admin lee auditoria produccion" ON auditoria_produccion
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Encargado lee auditoria de su galpon" ON auditoria_produccion
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM produccion p
      JOIN galpones g ON g.id = p.galpon_id
      WHERE p.id = auditoria_produccion.produccion_id
        AND g.encargado_id = auth.uid()
    )
  );

CREATE POLICY "Insertar auditoria produccion propia" ON auditoria_produccion
  FOR INSERT TO authenticated
  WITH CHECK (editado_por = auth.uid());

-- ── AUDITORÍA MORTALIDAD ──────────────────────────────────────────
DROP POLICY IF EXISTS "Admin lee auditoria mortalidad"              ON auditoria_mortalidad;
DROP POLICY IF EXISTS "Encargado lee auditoria mortalidad de su galpon" ON auditoria_mortalidad;
DROP POLICY IF EXISTS "Insertar auditoria mortalidad propia"        ON auditoria_mortalidad;

CREATE POLICY "Admin lee auditoria mortalidad" ON auditoria_mortalidad
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Encargado lee auditoria mortalidad de su galpon" ON auditoria_mortalidad
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mortalidad m
      JOIN galpones g ON g.id = m.galpon_id
      WHERE m.id = auditoria_mortalidad.mortalidad_id
        AND g.encargado_id = auth.uid()
    )
  );

CREATE POLICY "Insertar auditoria mortalidad propia" ON auditoria_mortalidad
  FOR INSERT TO authenticated
  WITH CHECK (editado_por = auth.uid());

COMMIT;

-- ================================================================
-- PRIMER ADMINISTRADOR
-- ----------------------------------------------------------------
-- PASOS:
--   1. En Supabase Dashboard → Authentication → Users → "Add user"
--      Crear un usuario con email y contraseña (marca "Auto Confirm User")
--   2. Copia el UUID del usuario recién creado
--   3. Descomenta y ejecuta el bloque siguiente con ese UUID:
-- ================================================================
/*
INSERT INTO perfiles (id, nombre_completo, email, rol, estado)
VALUES (
  'PEGAR-AQUI-EL-UUID-DEL-USUARIO',
  'Administrador Principal',
  'admin@tu-empresa.com',
  'administrador',
  'activo'
)
ON CONFLICT (id) DO UPDATE
  SET rol    = 'administrador',
      estado = 'activo';
*/

-- ================================================================
-- DATOS SEMILLA OPCIONALES (descomentar si quieres precargar razas)
-- ================================================================
/*
INSERT INTO razas (nombre, tipo, descripcion) VALUES
  ('Lohmann Brown',  'ponedoras', 'Raza ponedora marrón de alta postura'),
  ('Hy-Line W-36',   'ponedoras', 'Raza ponedora blanca de huevo blanco'),
  ('Cobb 500',       'engorde',   'Pollo de engorde de rápido crecimiento'),
  ('Ross 308',       'engorde',   'Pollo de engorde de alto rendimiento')
ON CONFLICT DO NOTHING;
*/
