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

/** Upsert track metadata so playlist/favorite/history FKs can reference it. */
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
    { onConflict: 'id' },
  );
  if (error) throw error;
}
