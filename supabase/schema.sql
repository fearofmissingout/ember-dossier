create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  visibility text not null default 'invite_only',
  created_at timestamptz not null default now()
);

create table if not exists public.bases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  day integer not null default 1,
  resources jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(room_id)
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null,
  email text,
  role text not null default 'member',
  duty text not null default '后勤员',
  created_at timestamptz not null default now(),
  unique(room_id, display_name)
);

create table if not exists public.survivors (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  content_id text not null,
  name text not null,
  codename text not null,
  profession text not null,
  duty text not null,
  attributes jsonb not null,
  traits jsonb not null default '[]'::jsonb,
  flaw text not null,
  fatigue integer not null default 0,
  injuries jsonb not null default '[]'::jsonb,
  note text not null,
  created_at timestamptz not null default now(),
  unique(room_id, content_id)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  content_id text not null unique,
  name text not null,
  family text not null,
  risk integer not null,
  recommended_stats jsonb not null,
  reward jsonb not null,
  tags jsonb not null default '[]'::jsonb,
  dossier text not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  content_id text not null,
  name text not null,
  level integer not null default 1,
  status text not null default 'stable',
  effect text not null,
  created_at timestamptz not null default now(),
  unique(room_id, content_id)
);

create table if not exists public.expeditions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  location_id uuid references public.locations(id),
  risk text not null,
  loadout jsonb not null,
  status text not null default 'completed',
  outcome text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid references public.expeditions(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  outcome text not null,
  reward jsonb not null,
  penalties jsonb not null,
  logs jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_events (
  id uuid primary key default gen_random_uuid(),
  content_id text not null unique,
  kind text not null,
  title text not null,
  body text not null,
  conditions jsonb not null default '{}'::jsonb,
  effects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_snapshots (
  room_slug text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.bases enable row level security;
alter table public.members enable row level security;
alter table public.survivors enable row level security;
alter table public.locations enable row level security;
alter table public.facilities enable row level security;
alter table public.expeditions enable row level security;
alter table public.reports enable row level security;
alter table public.feed_items enable row level security;
alter table public.content_events enable row level security;
alter table public.demo_snapshots enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.demo_snapshots to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'locations'
      and policyname = 'locations are readable'
  ) then
    create policy "locations are readable" on public.locations for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_events'
      and policyname = 'content events are readable'
  ) then
    create policy "content events are readable" on public.content_events for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'demo_snapshots'
      and policyname = 'demo snapshot is readable'
  ) then
    create policy "demo snapshot is readable" on public.demo_snapshots
      for select using (room_slug = 'ember-demo');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'demo_snapshots'
      and policyname = 'demo snapshot can be inserted'
  ) then
    create policy "demo snapshot can be inserted" on public.demo_snapshots
      for insert with check (room_slug = 'ember-demo');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'demo_snapshots'
      and policyname = 'demo snapshot can be updated'
  ) then
    create policy "demo snapshot can be updated" on public.demo_snapshots
      for update using (room_slug = 'ember-demo') with check (room_slug = 'ember-demo');
  end if;
end $$;
