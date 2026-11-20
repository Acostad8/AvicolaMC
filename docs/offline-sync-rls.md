# RLS + Sync Offline — Análisis Fase 0

Fecha: 2026-11-15

## Veredicto

RLS actual es **compatible** con sync offline para encargados. **No se requieren cambios** en políticas existentes. Los casos edge se gestionan en el cliente.

## Módulos offline y política aplicable

| Módulo | INSERT (encargado) | UPDATE (encargado) | DELETE |
|--------|-------------------|-------------------|--------|
| produccion | `can_access_galpon()` ✅ | ventana 24h desde `created_at` ⚠️ | solo admin |
| mortalidad | `can_access_galpon()` ✅ | solo admin | solo admin |
| tratamientos | `can_access_galpon()` ✅ | solo admin | solo admin |
| movimientos_insumos (salida) | policy "salida propia" ✅ | — | — |

## Caso edge: ventana 24h en `produccion`

**Política:** `UPDATE` permitido si `created_at > NOW() - INTERVAL '24 hours'` o si es admin.

**Impacto offline:**
- Caso A — INSERT solamente: encargado registra offline día 1, sincroniza día 3 → INSERT, `created_at` servidor = día 3 → OK.
- Caso B — edición offline tardía: encargado registra día 1, edita local día 2 (offline), sincroniza día 3 → fila ya existe (dedupe por `client_id`), se intenta UPDATE → RLS rechaza si `created_at` servidor fue hace >24h.

**Mitigación en cliente:**
- El outbox envía primero el INSERT (si no existe), luego los UPDATEs. El primer INSERT setea `created_at = NOW()` en servidor → ventana 24h arranca al sync.
- Si el encargado hace sync diario (política operativa), nunca se dispara el caso B.
- Si falla UPDATE post-24h: el sync engine marca la op como `conflict`, muestra al encargado "cambio vencido, pedir corrección al admin".

**No se modifica la política** para no debilitar la regla de negocio existente.

## Caso edge: `mortalidad` y `tratamientos` UPDATE restringido a admin

Encargado no puede editar ni borrar estos registros offline (igual que en modo online). Flujo offline permite solo INSERT. Suficiente para el caso de uso rural.

## Soft-delete (`deleted_at`)

Actualmente DELETE físico está restringido a admin. El sync offline usará `deleted_at` como tombstone propagable. **Encargado no borra** — campo `deleted_at` lo escribe solo admin vía UPDATE (al que ya tiene acceso) o vía función RPC dedicada que respete `is_admin()`.

**Acción futura (Fase 3+):** si se requiere que admin pueda soft-delete desde UI, usar las policies de UPDATE admin existentes — no hace falta nada nuevo a nivel RLS.

## Lecturas delta sync

Query canónica desde cliente:
```sql
SELECT * FROM <tabla>
WHERE updated_at > :last_sync
  AND (deleted_at IS NULL OR updated_at > :last_sync)
```

RLS filtra automáticamente por `can_access_galpon()` → encargado solo recibe filas de sus galpones. Sin cambios necesarios.

## Verificación recomendada antes de Fase 3

- [ ] Test manual: encargado con galpón asignado sincroniza 20 INSERTs → verificar aparecen en admin.
- [ ] Test manual: encargado sin galpón asignado intenta sync → verificar RLS rechaza (debe fallar limpio, no 500).
- [ ] Test: `UPDATE` post-24h → verificar sync engine marca `conflict` y NO reintenta en loop.
- [ ] Revisar logs de auditoría: todos los INSERT sincronizados deben quedar registrados con `origen` apropiado.
