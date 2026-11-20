# Fase 0 — Checklist de ejecución

Fecha: 2026-11-15

## 1. Aplicar migraciones SQL (vía MCP Supabase o Dashboard)

Orden obligatorio:

1. `supabase/migrations/20261115_offline_sync_columns.sql`
   → Añade `updated_at`, `client_id`, `deleted_at` + triggers a producción, mortalidad, tratamientos, movimientos_insumos.
2. `supabase/migrations/20261115_dispositivos.sql`
   → Crea tabla `dispositivos` + RLS + RPCs `dispositivo_heartbeat`, `mis_dispositivos_con_pendientes`.
3. `supabase/migrations/20261115_realtime_offline.sql`
   → `REPLICA IDENTITY FULL` + añade tablas a publicación `supabase_realtime`.

### Comandos (desde raíz del repo)

```bash
# Opción A: Supabase CLI contra proyecto AvicolaMC
supabase db push

# Opción B: MCP Supabase (asistente aplica apply_migration)
# Opción C: Dashboard → SQL Editor → pegar cada archivo
```

### Verificación post-aplicación

```sql
-- Columnas presentes
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('updated_at','client_id','deleted_at')
  AND table_name IN ('produccion','mortalidad','tratamientos','movimientos_insumos');

-- Triggers activos
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_name LIKE '%set_updated_at%';

-- Tabla dispositivos existe
SELECT COUNT(*) FROM dispositivos;

-- Realtime habilitado
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('produccion','mortalidad','tratamientos','movimientos_insumos','dispositivos');
```

## 2. Configurar Auth: refresh token largo

**Dashboard → Authentication → Settings → Session:**

- `JWT expiry limit`: 3600 (1 hora, default — no cambiar)
- `Refresh token reuse interval`: 10 segundos (default)
- `Inactivity timeout`: deshabilitar o 30 días (**clave para offline**)

**Decisión:** 30 días de inactividad permite encargado que trabaja offline una semana sin login forzado al reconectar.

**Trade-off:** sesión robada en tablet perdida vale 30 días. Mitigación: admin desactiva device vía tabla `dispositivos` + puede expulsar sesión desde Dashboard.

## 3. Assets PWA

### Archivos necesarios (colocar en `public/`)

```
public/
  icon-192.png              192x192  (home screen Android)
  icon-512.png              512x512  (home screen Android)
  icon-512-maskable.png     512x512  (Android adaptive, safe zone 80%)
  apple-touch-icon.png      180x180  (iOS home screen)
  apple-splash-2048x2732.png          (iPad Pro 12.9")
  apple-splash-1668x2388.png          (iPad Pro 11")
  apple-splash-1170x2532.png          (iPhone 12/13/14)
  apple-splash-828x1792.png           (iPhone XR/11)
  favicon.ico
  favicon-32.png
```

### Generación recomendada

- **PWA Asset Generator:** `npx pwa-asset-generator ./src/assets/logo.svg ./public --manifest ./public/manifest.webmanifest --favicon --maskable`
- **Alternativa manual:** usar logo actual `public/logo.png` (ya existente) con Figma / RealFaviconGenerator.

### Manifest (crear en Fase 1, aquí solo estructura target)

```json
{
  "name": "Sistema Avícola MC",
  "short_name": "AvícolaMC",
  "description": "Gestión avícola rural — funciona sin internet",
  "start_url": "/dashboard?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#fafaf9",
  "theme_color": "#f59e0b",
  "icons": [
    { "src": "/icon-192.png",          "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png",          "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## 4. Checklist cierre de Fase 0

- [ ] Migración `20261115_offline_sync_columns.sql` aplicada y verificada.
- [ ] Migración `20261115_dispositivos.sql` aplicada y verificada.
- [ ] Migración `20261115_realtime_offline.sql` aplicada y verificada.
- [ ] Refresh token inactivity a 30 días.
- [ ] Iconos PWA generados en `public/`.
- [ ] RLS leída y validada (ver `offline-sync-rls.md`).
- [ ] Decisión confirmada: 1 tablet por encargado + banner multi-device.

Al completar → listos para Fase 1 (`vite-plugin-pwa` + manifest + SW shell).
