-- Tabla de auditoría para ediciones de registros de mortalidad
create table if not exists public.auditoria_mortalidad (
  id               uuid        primary key default gen_random_uuid(),
  mortalidad_id    uuid        not null references public.mortalidad(id) on delete cascade,
  editado_por      uuid        not null references public.perfiles(id),
  datos_anteriores jsonb       not null,
  datos_nuevos     jsonb       not null,
  editado_at       timestamptz not null default now()
);

alter table public.auditoria_mortalidad enable row level security;

-- Admin ve todo el historial
create policy "Admin lee auditoria mortalidad"
  on public.auditoria_mortalidad for select
  to authenticated
  using (is_admin());

-- Encargado ve el historial de sus galpones
create policy "Encargado lee auditoria mortalidad de su galpon"
  on public.auditoria_mortalidad for select
  to authenticated
  using (
    exists (
      select 1 from public.mortalidad m
      join public.galpones g on g.id = m.galpon_id
      where m.id = auditoria_mortalidad.mortalidad_id
        and g.encargado_id = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede insertar su propio registro de auditoría
create policy "Insertar auditoria mortalidad propia"
  on public.auditoria_mortalidad for insert
  to authenticated
  with check (editado_por = auth.uid());
