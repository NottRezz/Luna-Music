/**
 * Map between app Track types and the Supabase `tracks` cache table.
 */

import type { ArtKey } from '@/constants/art';
import { requireSupabase } from '@/lib/supabase';
import type { Track } from '@/types/music';
import type { TrackRow } from '@/types/database';

export function trackToRow(track: Track): TrackRow {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    art_key: track.art,
    artwork_url: track.artworkUrl ?? null,
    preview_url: track.previewUrl ?? null,
    label: track.label ?? null,
    created_at: new Date().toISOString(),
  };
}

export function rowToTrack(row: TrackRow): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    art: (row.art_key as ArtKey) || 'a',
    artworkUrl: row.artwork_url ?? undefined,
    previewUrl: row.preview_url ?? undefined,
    label: row.label ?? undefined,
  };
}

/**
 * Insert track metadata if it is not cached yet, so playlist/favorite/history
 * foreign keys have a row to reference.
 *
 * `ignoreDuplicates` makes this `on conflict do nothing` rather than
 * `on conflict do update`, which is what lets `tracks` have no UPDATE policy at
 * all — see LM-6. `tracks` is one shared table keyed by iTunes id, so a policy
 * permissive enough to serve this call from the client was permissive enough
 * for any account to rewrite any track's title, artist or preview_url for
 * everybody. Insert-only closes that without a per-row owner.
 *
 * The cost is that cached metadata never refreshes. That is deliberate: a
 * refresh path belongs in a `security definer` function that can decide what is
 * allowed to change, not in a blanket UPDATE grant to every signed-in user.
 *
 * Do not "fix" this back to a plain upsert. Postgres evaluates the UPDATE
 * policy on the conflicting row of an `on conflict do update`, so with the
 * policy dropped that variant raises 42501 on the second write of any track —
 * which is every like, playlist add and play after the first.
 */
export async function ensureTrack(track: Track) {
  const client = requireSupabase();
  const row = trackToRow(track);
  const { error } = await client.from('tracks').upsert(
    {
      id: row.id,
      title: row.title,
      artist: row.artist,
      duration: row.duration,
      art_key: row.art_key,
      artwork_url: row.artwork_url,
      preview_url: row.preview_url,
      label: row.label,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw error;
}
