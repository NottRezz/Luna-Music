# Luna Music

Expo React Native music player for CPRG 303-B (SPHR Studios). Streams previews from the iTunes Search API; account data lives in **Supabase** (ADR 4).

## Stack

- React Native + Expo (managed) + Expo Router
- Supabase Auth + Postgres (playlists, favorites, recently played)
- Session tokens cached with `expo-secure-store`
- UI follows the Frutiger Aero mockup in `design/mockup/`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project and copy `.env.example` → `.env`:

   ```bash
   cp .env.example .env
   ```

   Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API**.

3. Apply the schema + RLS policies. In the Supabase SQL Editor, run:

   [`supabase/migrations/20260810000000_luna_schema.sql`](supabase/migrations/20260810000000_luna_schema.sql)

   Tables: `profiles`, `tracks`, `playlists`, `playlist_tracks`, `favorites`, `recently_played`.

4. (Recommended) In Supabase Auth settings, disable email confirmation for the course build so sign-up can enter the app immediately.

5. Start the app:

   ```bash
   npx expo start
   ```

## Auth & data

| Concern | Where it lives |
| --- | --- |
| Sign up / login / passwords | Supabase Auth |
| Session persistence | `expo-secure-store` via `lib/supabase.ts` |
| Profile | `profiles` |
| Playlists | `playlists` + `playlist_tracks` |
| Liked tracks | `favorites` |
| Jump-back-in history | `recently_played` |
| Recent search chips | local AsyncStorage only |

Seeded demo playlists remain read-only UI chrome; anything the user creates syncs to their account.

## Project layout

```
app/(auth)/          Login + register (stack)
app/(tabs)/          Search, Playlist, Library, Profile
lib/supabase.ts      Client + SecureStore adapter
lib/db/              Typed CRUD helpers
providers/auth.tsx   Session + profile
providers/library.tsx Syncs remote library when signed in
supabase/migrations/ Postgres schema + RLS
```
