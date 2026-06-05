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

create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.account_bases (
  user_id uuid primary key references public.account_profiles(user_id) on delete cascade,
  level integer not null default 1,
  medical_room_level integer not null default 1,
  training_room_level integer not null default 1,
  warehouse_level integer not null default 1,
  radio_bench_level integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_resources (
  user_id uuid primary key references public.account_profiles(user_id) on delete cascade,
  resources jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_survivors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  content_id text not null,
  payload jsonb not null,
  level integer not null default 1,
  xp integer not null default 0,
  fatigue integer not null default 0,
  injuries jsonb not null default '[]'::jsonb,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  unique(user_id, content_id)
);

create table if not exists public.playtest_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  host_user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.playtest_room_members (
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key(room_id, user_id)
);

create table if not exists public.playtest_room_bases (
  room_id uuid primary key references public.playtest_rooms(id) on delete cascade,
  name text not null,
  day integer not null default 1,
  morale integer not null default 62,
  danger integer not null default 12,
  resources jsonb not null,
  facilities jsonb not null,
  objective jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.playtest_room_contributions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  resources jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.playtest_room_assignments (
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  survivor_content_id text not null,
  assigned_at timestamptz not null default now(),
  primary key(room_id, user_id, survivor_content_id)
);

create table if not exists public.playtest_expeditions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  location_content_id text not null,
  risk text not null,
  loadout jsonb not null,
  outcome text,
  status text not null default 'completed',
  created_by uuid not null references public.account_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.playtest_expedition_participants (
  expedition_id uuid not null references public.playtest_expeditions(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  survivor_content_id text not null,
  primary key(expedition_id, user_id, survivor_content_id)
);

create table if not exists public.playtest_reports (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid references public.playtest_expeditions(id) on delete cascade,
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  title text not null,
  outcome text not null,
  reward jsonb not null,
  penalties jsonb not null,
  logs jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists playtest_rooms_slug_idx on public.playtest_rooms(slug);
create index if not exists playtest_room_members_user_idx on public.playtest_room_members(user_id);
create index if not exists playtest_room_contributions_room_idx on public.playtest_room_contributions(room_id, created_at desc);
create index if not exists playtest_reports_room_idx on public.playtest_reports(room_id, created_at desc);

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
alter table public.account_profiles enable row level security;
alter table public.account_bases enable row level security;
alter table public.account_resources enable row level security;
alter table public.account_survivors enable row level security;
alter table public.playtest_rooms enable row level security;
alter table public.playtest_room_members enable row level security;
alter table public.playtest_room_bases enable row level security;
alter table public.playtest_room_contributions enable row level security;
alter table public.playtest_room_assignments enable row level security;
alter table public.playtest_expeditions enable row level security;
alter table public.playtest_expedition_participants enable row level security;
alter table public.playtest_reports enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.demo_snapshots to anon, authenticated;
grant select, insert, update on
  public.account_profiles,
  public.account_bases,
  public.account_resources,
  public.account_survivors,
  public.playtest_rooms,
  public.playtest_room_members,
  public.playtest_room_bases,
  public.playtest_room_contributions,
  public.playtest_room_assignments,
  public.playtest_expeditions,
  public.playtest_expedition_participants,
  public.playtest_reports
to authenticated;

grant delete on public.playtest_room_assignments to authenticated;

create or replace function public.is_playtest_room_member(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.playtest_room_members members
    where members.room_id = target_room_id
      and members.user_id = auth.uid()
  );
$$;

create or replace function public.is_playtest_room_host(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.playtest_rooms rooms
    where rooms.id = target_room_id
      and rooms.host_user_id = auth.uid()
  );
$$;

grant execute on function public.is_playtest_room_member(uuid) to authenticated;
grant execute on function public.is_playtest_room_host(uuid) to authenticated;

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

  drop policy if exists "demo snapshot is readable" on public.demo_snapshots;
  drop policy if exists "demo snapshot can be inserted" on public.demo_snapshots;
  drop policy if exists "demo snapshot can be updated" on public.demo_snapshots;

  create policy "demo snapshot is readable" on public.demo_snapshots
    for select using (room_slug ~ '^[a-z0-9][a-z0-9-]{2,31}$');

  create policy "demo snapshot can be inserted" on public.demo_snapshots
    for insert with check (room_slug ~ '^[a-z0-9][a-z0-9-]{2,31}$');

  create policy "demo snapshot can be updated" on public.demo_snapshots
    for update using (room_slug ~ '^[a-z0-9][a-z0-9-]{2,31}$')
    with check (room_slug ~ '^[a-z0-9][a-z0-9-]{2,31}$');

  drop policy if exists "account profile owner access" on public.account_profiles;
  drop policy if exists "account base owner access" on public.account_bases;
  drop policy if exists "account resources owner access" on public.account_resources;
  drop policy if exists "account survivors owner access" on public.account_survivors;
  drop policy if exists "rooms visible to members" on public.playtest_rooms;
  drop policy if exists "authenticated users can create rooms" on public.playtest_rooms;
  drop policy if exists "hosts can update rooms" on public.playtest_rooms;
  drop policy if exists "room members visible to members" on public.playtest_room_members;
  drop policy if exists "users can join rooms" on public.playtest_room_members;
  drop policy if exists "members can update own presence" on public.playtest_room_members;
  drop policy if exists "room bases visible to members" on public.playtest_room_bases;
  drop policy if exists "hosts can create room bases" on public.playtest_room_bases;
  drop policy if exists "members can update room bases" on public.playtest_room_bases;
  drop policy if exists "room contributions visible to members" on public.playtest_room_contributions;
  drop policy if exists "members can create own contributions" on public.playtest_room_contributions;
  drop policy if exists "room assignments visible to members" on public.playtest_room_assignments;
  drop policy if exists "members can assign own survivors" on public.playtest_room_assignments;
  drop policy if exists "members can remove own assignments" on public.playtest_room_assignments;
  drop policy if exists "expeditions visible to members" on public.playtest_expeditions;
  drop policy if exists "members can create expeditions" on public.playtest_expeditions;
  drop policy if exists "members can update expeditions" on public.playtest_expeditions;
  drop policy if exists "participants visible to members" on public.playtest_expedition_participants;
  drop policy if exists "members can add own participants" on public.playtest_expedition_participants;
  drop policy if exists "reports visible to members" on public.playtest_reports;
  drop policy if exists "members can create reports" on public.playtest_reports;

  create policy "account profile owner access" on public.account_profiles
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "account base owner access" on public.account_bases
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "account resources owner access" on public.account_resources
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "account survivors owner access" on public.account_survivors
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "rooms visible to members" on public.playtest_rooms
    for select using (status = 'active' or host_user_id = auth.uid() or public.is_playtest_room_member(id));

  create policy "authenticated users can create rooms" on public.playtest_rooms
    for insert with check (auth.uid() = host_user_id);

  create policy "hosts can update rooms" on public.playtest_rooms
    for update using (public.is_playtest_room_host(id))
    with check (public.is_playtest_room_host(id));

  create policy "room members visible to members" on public.playtest_room_members
    for select using (public.is_playtest_room_member(room_id) or public.is_playtest_room_host(room_id));

  create policy "users can join rooms" on public.playtest_room_members
    for insert with check (auth.uid() = user_id);

  create policy "members can update own presence" on public.playtest_room_members
    for update using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "room bases visible to members" on public.playtest_room_bases
    for select using (public.is_playtest_room_member(room_id) or public.is_playtest_room_host(room_id));

  create policy "hosts can create room bases" on public.playtest_room_bases
    for insert with check (public.is_playtest_room_host(room_id));

  create policy "members can update room bases" on public.playtest_room_bases
    for update using (public.is_playtest_room_member(room_id))
    with check (public.is_playtest_room_member(room_id));

  create policy "room contributions visible to members" on public.playtest_room_contributions
    for select using (public.is_playtest_room_member(room_id));

  create policy "members can create own contributions" on public.playtest_room_contributions
    for insert with check (auth.uid() = user_id and public.is_playtest_room_member(room_id));

  create policy "room assignments visible to members" on public.playtest_room_assignments
    for select using (public.is_playtest_room_member(room_id));

  create policy "members can assign own survivors" on public.playtest_room_assignments
    for insert with check (
      auth.uid() = user_id
      and public.is_playtest_room_member(room_id)
      and exists (
        select 1 from public.account_survivors survivors
        where survivors.content_id = survivor_content_id
          and survivors.user_id = auth.uid()
      )
    );

  create policy "members can remove own assignments" on public.playtest_room_assignments
    for delete using (auth.uid() = user_id and public.is_playtest_room_member(room_id));

  create policy "expeditions visible to members" on public.playtest_expeditions
    for select using (public.is_playtest_room_member(room_id));

  create policy "members can create expeditions" on public.playtest_expeditions
    for insert with check (auth.uid() = created_by and public.is_playtest_room_member(room_id));

  create policy "members can update expeditions" on public.playtest_expeditions
    for update using (auth.uid() = created_by and public.is_playtest_room_member(room_id))
    with check (auth.uid() = created_by and public.is_playtest_room_member(room_id));

  create policy "participants visible to members" on public.playtest_expedition_participants
    for select using (
      exists (
        select 1 from public.playtest_expeditions expeditions
        where expeditions.id = expedition_id
          and public.is_playtest_room_member(expeditions.room_id)
      )
    );

  create policy "members can add own participants" on public.playtest_expedition_participants
    for insert with check (
      auth.uid() = user_id
      and exists (
        select 1 from public.playtest_expeditions expeditions
        where expeditions.id = expedition_id
          and public.is_playtest_room_member(expeditions.room_id)
      )
      and exists (
        select 1 from public.account_survivors survivors
        where survivors.content_id = survivor_content_id
          and survivors.user_id = auth.uid()
      )
    );

  create policy "reports visible to members" on public.playtest_reports
    for select using (public.is_playtest_room_member(room_id));

  create policy "members can create reports" on public.playtest_reports
    for insert with check (public.is_playtest_room_member(room_id));
end $$;
