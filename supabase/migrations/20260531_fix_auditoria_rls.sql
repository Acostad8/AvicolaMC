-- Corrige las políticas RLS de auditoria_produccion.
-- La migración original usaba rol = 'admin' pero el valor real es 'administrador'.
-- Esto impedía que el administrador viera el historial de modificaciones.

drop policy if exists "Admin lee auditoria produccion"     on public.auditoria_produccion;
drop policy if exists "Encargado lee auditoria de su galpon" on public.auditoria_produccion;
drop policy if exists "Insertar auditoria produccion propia" on public.auditoria_produccion;

-- Admin ve todo el historial (usa is_admin() que verifica rol = 'administrador')
create policy "Admin lee auditoria produccion"
  on public.auditoria_produccion for select
  to authenticated
  using (is_admin());

-- Encargado ve el historial de los galpones que tiene asignados
create policy "Encargado lee auditoria de su galpon"
  on public.auditoria_produccion for select
  to authenticated
  using (
    exists (
      select 1 from public.produccion p
      join public.galpones g on g.id = p.galpon_id
      where p.id = auditoria_produccion.produccion_id
        and g.encargado_id = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede insertar su propio registro de auditoría
create policy "Insertar auditoria produccion propia"
  on public.auditoria_produccion for insert
  to authenticated
  with check (editado_por = auth.uid());
