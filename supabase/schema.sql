-- Esquema de base de datos para el CRM Althea
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> pegar todo -> Run

-- ============================================================
-- 1. Tabla de perfiles (vincula cada login con su alias de asesor
--    y los equipos a los que tiene acceso)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  asesor_alias text not null,           -- ej: 'Agos', 'Diego', 'Tiago'
  team_acceso text[] not null default '{}', -- ej: '{mis-clientes,equipo-gallo}'
  es_admin boolean not null default false,  -- admin ve todos los equipos
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- cada usuario puede ver/editar su propio perfil
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 2. Tabla de clientes
-- ============================================================
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  team text not null,                 -- 'mis-clientes' | 'equipo-gallo' | 'equipo-fernanda'
  comitente text,
  nombre text,
  apellido text,
  fecha date,
  asesor text,
  reasignacion text,                  -- 'propio' | 'reasignado' | 'sin_reasignar'
  perfil text,                        -- '' | 'moderado' | 'riesgoso'
  reunion text,
  obs text,
  sub_panel text,                     -- '' | 'reasignaciones'
  asesor_original text,
  derivado boolean not null default false,
  c_ordenes text,
  usuario_c text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clientes_team_idx on public.clientes(team);
create index if not exists clientes_asesor_idx on public.clientes(asesor);

alter table public.clientes enable row level security;

-- trigger para mantener updated_at al día
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clientes_set_updated_at on public.clientes;
create trigger clientes_set_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. Policies de seguridad: un usuario solo accede a las filas
--    de los equipos listados en su perfil (o todo, si es admin)
-- ============================================================
create policy "clientes_select_por_team"
  on public.clientes for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.es_admin or clientes.team = any(p.team_acceso))
    )
  );

create policy "clientes_insert_por_team"
  on public.clientes for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.es_admin or clientes.team = any(p.team_acceso))
    )
  );

create policy "clientes_update_por_team"
  on public.clientes for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.es_admin or clientes.team = any(p.team_acceso))
    )
  );

-- Nota: no se agrega policy de delete a propósito. Si en el futuro
-- se necesita borrar clientes desde la UI, agregar una policy explícita
-- restringida a admins.

-- ============================================================
-- 4. Tabla de asesores por equipo (alimenta los sub-tabs/filtros
--    de "Equipo Gallo" / "Equipo Fernanda" en la UI)
-- ============================================================
create table if not exists public.advisors (
  id uuid primary key default gen_random_uuid(),
  team text not null,           -- 'equipo-gallo' | 'equipo-fernanda'
  nombre text not null,
  rol text,
  created_at timestamptz not null default now(),
  unique (team, nombre)
);

alter table public.advisors enable row level security;

-- cualquier usuario autenticado puede ver y agregar asesores
-- (es una lista de filtro, no datos sensibles de clientes)
create policy "advisors_select_auth"
  on public.advisors for select
  using (auth.role() = 'authenticated');

create policy "advisors_insert_auth"
  on public.advisors for insert
  with check (auth.role() = 'authenticated');

insert into public.advisors (team, nombre, rol) values
  ('equipo-gallo', 'Diego', null),
  ('equipo-gallo', 'Tiago', null),
  ('equipo-fernanda', 'Fernanda', null),
  ('equipo-fernanda', 'Agos', null)
on conflict (team, nombre) do nothing;
