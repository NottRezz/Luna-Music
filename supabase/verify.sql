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
