-- Security hardening — LM-23, LM-24, LM-25, LM-26.
--
-- Safe to re-run. Ordered so the data cleanup happens before the constraint
-- that would reject it, which means this applies to a live database without
-- failing halfway.
--
-- Nothing here needs a client change. Apply it whenever.

-- ===========================================================================
-- LM-23 (High) — stop one account poisoning what every other account sees
-- ===========================================================================
-- public.tracks is a single shared cache, its primary key is a text id chosen
-- by the client, and since LM-6 the client writes with `on conflict do nothing`.
-- Together that means the FIRST writer of a given id owns that row forever.
--
-- So an attacker could insert `it:1440857781` — a real, popular iTunes id —
-- with artwork_url and preview_url pointing at their own server. Any user who
-- later saved that track kept the attacker's row, because their own write
-- conflicted and did nothing. On the next sign-in, fetchFavorites /
-- fetchRecentlyPlayed / fetchUserPlaylists all embed `tracks ( * )`, so the
-- victim's library rendered the attacker's title and artist, fetched the
-- attacker's image (a beacon carrying the victim's IP), and played the
-- attacker's audio.
--
-- LM-6 closed the overwrite path. This closes the first-write path.
--
-- The URLs are the material harm, and the URLs can be constrained: iTunes only
-- ever serves artwork from *.mzstatic.com and previews from *.apple.com. Host
-- must be followed immediately by '/', so neither userinfo tricks
-- (https://is1-ssl.mzstatic.com@evil.com/) nor suffix tricks
-- (https://mzstatic.com.evil.com/) can pass.

-- Clean first: null out any URL that would violate the constraint. Deleting the
-- rows instead would cascade into favorites, playlist_tracks and
-- recently_played and destroy real user data. A null artwork_url falls back to
-- the baked swatch, and a null preview_url is re-resolved by resolvePreview.
update public.tracks
set artwork_url = null
where artwork_url is not null
  and artwork_url !~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.mzstatic\.com/';

update public.tracks
set preview_url = null
where preview_url is not null
  and preview_url !~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.apple\.com/';

alter table public.tracks drop constraint if exists tracks_artwork_url_host;
alter table public.tracks
  add constraint tracks_artwork_url_host check (
    artwork_url is null
    or artwork_url ~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.mzstatic\.com/'
  );

alter table public.tracks drop constraint if exists tracks_preview_url_host;
alter table public.tracks
  add constraint tracks_preview_url_host check (
    preview_url is null
    or preview_url ~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.apple\.com/'
  );

-- The text columns cannot be validated the same way — the client is the only
-- source of a title — so the first writer can still choose what a track is
-- called. That is a far smaller problem than an attacker-controlled URL: no
-- beacon, no audio, no network request. Bounding the length at least stops the
-- field being used as bulk storage or to blow up a layout.
--
-- Truncate before constraining, for the same reason as the URL cleanup above:
-- a constraint that fails on an existing row aborts the migration partway.
update public.tracks set title = left(title, 300) where length(title) > 300;
update public.tracks set artist = left(artist, 300) where length(artist) > 300;
update public.tracks set label = left(label, 100) where length(label) > 100;
update public.tracks set art_key = 'a' where length(art_key) > 8;

alter table public.tracks drop constraint if exists tracks_text_lengths;
alter table public.tracks
  add constraint tracks_text_lengths check (
    length(title) <= 300
    and length(artist) <= 300
    and (label is null or length(label) <= 100)
    and length(id) <= 128
    and length(art_key) <= 8
  );

-- ===========================================================================
-- LM-24 (Medium) — a user could grant themselves PREMIUM
-- ===========================================================================
-- profiles_update_own checks WHICH ROW you may update, never WHICH COLUMNS.
-- Supabase grants UPDATE on every public table to `authenticated`, so
-- `PATCH /rest/v1/profiles?id=eq.<self>` with {"plan":"PREMIUM"} succeeded.
-- lib/db/profiles.ts types the patch as Pick<Profile, 'username' |
-- 'display_name' | 'avatar_art'>, but that constrains our client, not the HTTP
-- API — TypeScript is not an authorization boundary.
--
-- A table-level UPDATE grant implies every column, and revoking a single column
-- does not narrow it. The grant has to be withdrawn and re-issued per column.
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, avatar_art) on public.profiles to authenticated;

-- avatar_art had no constraint either; the client sanitises it with asArtKey()
-- and the server accepted anything. Normalise before constraining.
update public.profiles set avatar_art = 'e'
where avatar_art is null or avatar_art not in ('a','b','c','d','e','f');

alter table public.profiles drop constraint if exists profiles_avatar_art_valid;
alter table public.profiles
  add constraint profiles_avatar_art_valid check (avatar_art in ('a','b','c','d','e','f'));

-- plan is now writable only by a privileged role. Whatever grants entitlements
-- later — a webhook, an admin function — must be security definer.
update public.profiles set plan = 'FREE' where plan is null or plan not in ('FREE','PREMIUM');

alter table public.profiles drop constraint if exists profiles_plan_valid;
alter table public.profiles
  add constraint profiles_plan_valid check (plan in ('FREE','PREMIUM'));

-- ===========================================================================
-- LM-25 (Medium) — unbounded writes to a shared table
-- ===========================================================================
-- tracks_insert_authenticated is `with check (true)` and there was no quota, so
-- one account could insert rows until the project ran out of disk or budget.
-- The table had no owner column, so there was also no way to tell who did.
alter table public.tracks
  add column if not exists created_by uuid default auth.uid() references auth.users (id) on delete set null;

create index if not exists tracks_created_by_recent_idx
  on public.tracks (created_by, created_at desc);

create or replace function public.tracks_insert_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  -- Server-side inserts (no JWT) are not rate limited.
  if auth.uid() is null then
    return new;
  end if;

  new.created_by := auth.uid();

  select count(*) into recent
  from public.tracks
  where created_by = auth.uid()
    and created_at > now() - interval '1 hour';

  -- Well above real use: caching a track happens on like, playlist-add and
  -- play, so an extremely active hour is tens of rows, not hundreds.
  if recent >= 500 then
    raise exception 'Track cache insert quota exceeded, try again later'
      using errcode = '54000';
  end if;

  return new;
end;
$$;

drop trigger if exists tracks_insert_quota on public.tracks;
create trigger tracks_insert_quota
  before insert on public.tracks
  for each row execute function public.tracks_insert_quota();

-- ===========================================================================
-- LM-26 (Low) — search_path hardening on the security definer trigger
-- ===========================================================================
-- handle_new_user runs as the definer, so its search_path is worth pinning to
-- empty rather than to `public`. Every identifier it uses is already
-- fully qualified; pg_catalog stays implicitly resolvable, so the built-ins
-- still work. Low risk on PG15+, where PUBLIC no longer holds CREATE on the
-- public schema, but it is a one-word change.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
  n integer := 0;
begin
  -- lower() FIRST. regexp_replace is case-sensitive, so stripping against
  -- '[^a-z0-9_]' before folding deletes every capital letter instead of
  -- lowercasing it, and 'Alex.Rivera@…' silently becomes 'lexivera'. (LM-4)
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

-- ===========================================================================
-- Verification — see supabase/verify.sql for the full set.
-- ===========================================================================
-- Expect zero rows from each:
--
--   select id, artwork_url from public.tracks
--   where artwork_url is not null
--     and artwork_url !~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.mzstatic\.com/';
--
--   select id, preview_url from public.tracks
--   where preview_url is not null
--     and preview_url !~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.apple\.com/';
--
-- Expect exactly username, display_name, avatar_art:
--
--   select column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
