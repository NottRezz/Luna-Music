-- Quick verification queries after applying 20260810000000_luna_schema.sql
-- Run while signed in as a test user (or use the service role carefully).

-- Expect RLS enabled on every public table we own:
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles', 'tracks', 'playlists', 'playlist_tracks', 'favorites', 'recently_played')
order by relname;

-- Expect the auth → profile trigger to exist:
select tgname
from pg_trigger
where tgname = 'on_auth_user_created';

-- ---------------------------------------------------------------------------
-- LM-6 — public.tracks must be read + insert only.
-- Expect exactly two rows, SELECT and INSERT. An UPDATE row means the blanket
-- write grant is back and any account can rewrite any track for everyone.
-- ---------------------------------------------------------------------------
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'tracks'
order by policyname;

-- ---------------------------------------------------------------------------
-- LM-4 — the live trigger body must fold case BEFORE it strips.
-- Expect true. regexp_replace is case-sensitive, so stripping against
-- '[^a-z0-9_]' first deletes every capital letter rather than lowercasing it.
-- ---------------------------------------------------------------------------
select pg_get_functiondef('public.handle_new_user'::regproc) like '%lower(split_part(%'
  as username_case_folding_fixed;

-- ---------------------------------------------------------------------------
-- LM-4 — accounts created BEFORE that fix keep their mangled username. The
-- trigger only runs on insert, so nothing repairs them.
--
-- Expect zero rows. Each row is a profile whose username is exactly what the
-- old buggy derivation would have produced and is not what the corrected one
-- produces — which is a much tighter test than "differs from the email", and
-- so does not flag people who simply renamed themselves on the Profile screen.
--
-- It can still miss two cases, both rare: a handle that collided at sign-up and
-- picked up a numeric suffix, and an email local part longer than 20
-- characters, which the trigger truncates.
--
-- Renaming these is deliberately NOT automated. It changes somebody's handle
-- without asking and has to guess at collisions, so it is a decision.
-- ---------------------------------------------------------------------------
select p.username as current_username,
       regexp_replace(
         lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'
       ) as corrected_username,
       u.email,
       p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where u.email is not null
  -- what the old, case-sensitive-strip-then-lower trigger produced
  and p.username = lower(
        regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g')
      )
  -- and that is not what the corrected trigger produces
  and p.username is distinct from regexp_replace(
        lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'
      )
order by p.created_at;

-- ---------------------------------------------------------------------------
-- LM-23 — no track may carry a URL off Apple's hosts.
--
-- public.tracks is a shared cache with a client-chosen primary key, and since
-- LM-6 the client writes `on conflict do nothing`, so the first account to
-- write a given id owns that row for everybody. A row pointing artwork_url or
-- preview_url at an attacker's server turns every victim's library into a
-- beacon and their play button into arbitrary audio.
--
-- Expect zero rows from both.
-- ---------------------------------------------------------------------------
select id, artwork_url
from public.tracks
where artwork_url is not null
  and artwork_url !~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.mzstatic\.com/';

select id, preview_url
from public.tracks
where preview_url is not null
  and preview_url !~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.apple\.com/';

-- Both CHECK constraints must exist. Expect two rows.
select conname
from pg_constraint
where conrelid = 'public.tracks'::regclass
  and conname in ('tracks_artwork_url_host', 'tracks_preview_url_host')
order by conname;

-- ---------------------------------------------------------------------------
-- LM-24 — `authenticated` may update three columns of public.profiles and no
-- others. `plan` in this list means any account can grant itself PREMIUM.
--
-- Expect exactly: avatar_art, display_name, username.
--
-- NOTE: a later `grant all on all tables in schema public to authenticated`
-- silently undoes this. Re-run after any broad grant.
-- ---------------------------------------------------------------------------
select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;

-- ---------------------------------------------------------------------------
-- LM-25 — the shared cache must have an insert quota, or one account can fill
-- the database. Expect one row.
-- ---------------------------------------------------------------------------
select tgname
from pg_trigger
where tgrelid = 'public.tracks'::regclass
  and tgname = 'tracks_insert_quota';

-- Who is filling the cache, if it ever looks suspicious:
--
--   select created_by, count(*), max(created_at)
--   from public.tracks
--   group by created_by
--   order by count(*) desc
--   limit 20;

-- ---------------------------------------------------------------------------
-- LM-26 — every security definer function must pin its search_path.
-- Expect both rows to show search_path=.
-- ---------------------------------------------------------------------------
select p.proname, p.prosecdef, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;
