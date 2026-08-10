/**
 * Recently played history against Supabase (ADR 4).
 */

import { requireSupabase } from '@/lib/supabase';
import { ensureTrack, rowToTrack } from '@/lib/db/tracks';
import type { Track } from '@/types/music';
import type { TrackRow } from '@/types/database';

const MAX_ENTRIES = 20;

function relativeNote(playedAt: string, artist: string): string {
  const ms = Date.now() - new Date(playedAt).getTime();
  const mins = Math.floor(ms / 60000);
  let when: string;
  if (mins < 1) when = 'just now';
  else if (mins < 60) when = `${mins}m ago`;
  else if (mins < 60 * 24) when = `${Math.floor(mins / 60)}h ago`;
  else if (mins < 60 * 24 * 7) when = `${Math.floor(mins / (60 * 24))}d ago`;
  else when = 'last week';
  return `${artist} · ${when}`;
}

export async function fetchRecentlyPlayed(
  userId: string,
  limit = 12,
): Promise<{ track: Track; note: string; playedAt: string }[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('recently_played')
    .select('id, track_id, played_at, tracks ( * )')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit * 3);

  if (error) throw error;

  const seen = new Set<string>();
  const out: { track: Track; note: string; playedAt: string }[] = [];

  for (const row of data ?? []) {
    if (seen.has(row.track_id)) continue;
    const t = row.tracks as TrackRow | TrackRow[] | null;
    const trackRow = Array.isArray(t) ? t[0] : t;
    if (!trackRow) continue;
    const track = rowToTrack(trackRow);
    seen.add(row.track_id);
    out.push({
      track,
      note: relativeNote(row.played_at, track.artist),
      playedAt: row.played_at,
    });
    if (out.length >= limit) break;
  }

  return out;
}

export async function recordPlay(userId: string, track: Track) {
  const client = requireSupabase();
  await ensureTrack(track);

  const { error } = await client.from('recently_played').insert({
    user_id: userId,
    track_id: track.id,
  });
  if (error) throw error;

  // Trim older rows so the table stays bounded per user.
  const { data: older } = await client
    .from('recently_played')
    .select('id')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .range(MAX_ENTRIES, MAX_ENTRIES + 50);

  if (older && older.length > 0) {
    await client
      .from('recently_played')
      .delete()
      .in(
        'id',
        older.map((r) => r.id),
      );
  }
}

export async function clearRecentlyPlayed(userId: string) {
  const client = requireSupabase();
  const { error } = await client.from('recently_played').delete().eq('user_id', userId);
  if (error) throw error;
}
