-- Tabla de auditoría para ediciones de registros de producción
create table if not exists public.auditoria_produccion (
  id               uuid        primary key default gen_random_uuid(),
  produccion_id    uuid        not null references public.produccion(id) on delete cascade,
  editado_por      uuid        not null references public.perfiles(id),
  datos_anteriores jsonb       not null,
  datos_nuevos     jsonb       not null,
  editado_at       timestamptz not null default now()
);

alter table public.auditoria_produccion enable row level security;

-- Admins leen todos los registros de auditoría
create policy "Admin lee auditoria produccion"
  on public.auditoria_produccion for select
  using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- Cualquier usuario autenticado puede insertar su propio registro de auditoría
create policy "Insertar auditoria produccion propia"
  on public.auditoria_produccion for insert
  with check (editado_por = auth.uid());

-- Encargados leen auditoría de registros en sus galpones
create policy "Encargado lee auditoria de su galpon"
  on public.auditoria_produccion for select
  using (
    exists (
      select 1 from public.produccion p
      join public.galpones g on g.id = p.galpon_id
      where p.id = auditoria_produccion.produccion_id
        and g.encargado_id = auth.uid()
    )
  );
