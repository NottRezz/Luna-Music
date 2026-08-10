-- Luna Music — ADR 4 schema
-- Primary store for account, playlists, favorites, and recently played history.
-- Apply in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_art text not null default 'e',
  plan text not null default 'FREE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  )
);

create index if not exists profiles_username_idx on public.profiles (username);

-- ---------------------------------------------------------------------------
-- tracks  (metadata cache for iTunes / seeded ids referenced by user data)
-- ---------------------------------------------------------------------------
create table if not exists public.tracks (
  id text primary key,
  title text not null,
  artist text not null,
  duration integer not null default 30,
  art_key text not null default 'a',
  artwork_url text,
  preview_url text,
  label text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- playlists
-- ---------------------------------------------------------------------------
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  art_key text not null default 'a',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlists_user_id_idx on public.playlists (user_id);

-- ---------------------------------------------------------------------------
-- playlist_tracks
-- ---------------------------------------------------------------------------
create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

create index if not exists playlist_tracks_track_id_idx
  on public.playlist_tracks (track_id);

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);

-- ---------------------------------------------------------------------------
-- recently_played
-- ---------------------------------------------------------------------------
create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  played_at timestamptz not null default now()
);

create index if not exists recently_played_user_played_idx
  on public.recently_played (user_id, played_at desc);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  n integer := 0;
begin
  -- lower() FIRST. regexp_replace is case-sensitive, so stripping against
  -- '[^a-z0-9_]' before folding deletes every capital letter instead of
  -- lowercasing it, and 'Alex.Rivera@…' silently becomes 'lexivera'.
  base_username := regexp_replace(
    lower(split_part(coalesce(new.email, 'user'), '@', 1)),
    '[^a-z0-9_]',
    '',
    'g'
  );
  if base_username is null or length(base_username) < 3 then
    base_username := 'user';
  end if;
  base_username := left(base_username, 20);
  candidate := base_username;

  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base_username || n::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'display_name', candidate)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.favorites enable row level security;
alter table public.recently_played enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- tracks: any signed-in user may read the cache and add a row that is not
-- there yet. Deliberately NO update policy — see LM-6 and the migration
-- 20260810120000_tracks_read_insert_only.sql that removed it.
--
-- `tracks` is one shared table keyed by iTunes id, referenced by every user's
-- playlists, favorites and history. An update policy permissive enough to let
-- the client refresh metadata is permissive enough for any account to rewrite
-- any row's title, artist or preview_url for everyone, so there is no useful
-- middle ground short of a `security definer` function.
--
-- The client must therefore write with `on conflict do nothing`
-- (`ignoreDuplicates: true` in lib/db/tracks.ts). A plain upsert compiles to
-- `on conflict do update`, and Postgres checks the UPDATE policy on the
-- conflicting row — with none present that raises 42501 on every write after
-- the first.
drop policy if exists "tracks_select_authenticated" on public.tracks;
create policy "tracks_select_authenticated"
  on public.tracks for select
  to authenticated
  using (true);

drop policy if exists "tracks_insert_authenticated" on public.tracks;
create policy "tracks_insert_authenticated"
  on public.tracks for insert
  to authenticated
  with check (true);

drop policy if exists "tracks_update_authenticated" on public.tracks;

-- playlists
drop policy if exists "playlists_select_own" on public.playlists;
create policy "playlists_select_own"
  on public.playlists for select
  using (auth.uid() = user_id);

drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own"
  on public.playlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own"
  on public.playlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own"
  on public.playlists for delete
  using (auth.uid() = user_id);

-- playlist_tracks (via owning playlist)
drop policy if exists "playlist_tracks_select_own" on public.playlist_tracks;
create policy "playlist_tracks_select_own"
  on public.playlist_tracks for select
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist_tracks_insert_own" on public.playlist_tracks;
create policy "playlist_tracks_insert_own"
  on public.playlist_tracks for insert
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist_tracks_update_own" on public.playlist_tracks;
create policy "playlist_tracks_update_own"
  on public.playlist_tracks for update
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist_tracks_delete_own" on public.playlist_tracks;
create policy "playlist_tracks_delete_own"
  on public.playlist_tracks for delete
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

-- favorites
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- recently_played
drop policy if exists "recently_played_select_own" on public.recently_played;
create policy "recently_played_select_own"
  on public.recently_played for select
  using (auth.uid() = user_id);

drop policy if exists "recently_played_insert_own" on public.recently_played;
create policy "recently_played_insert_own"
  on public.recently_played for insert
  with check (auth.uid() = user_id);

drop policy if exists "recently_played_delete_own" on public.recently_played;
create policy "recently_played_delete_own"
  on public.recently_played for delete
  using (auth.uid() = user_id);
