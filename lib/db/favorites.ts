/**
 * Favorites (liked tracks) against Supabase (ADR 4).
 */

import { requireSupabase } from '@/lib/supabase';
import { ensureTrack, rowToTrack } from '@/lib/db/tracks';
import type { Track } from '@/types/music';
import type { TrackRow } from '@/types/database';

export async function fetchFavorites(userId: string): Promise<Track[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('favorites')
    .select('track_id, created_at, tracks ( * )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const t = row.tracks as TrackRow | TrackRow[] | null;
      const track = Array.isArray(t) ? t[0] : t;
      return track ? rowToTrack(track) : null;
    })
    .filter((t): t is Track => !!t);
}

export async function addFavorite(userId: string, track: Track) {
  const client = requireSupabase();
  await ensureTrack(track);
  const { error } = await client
    .from('favorites')
    .upsert({ user_id: userId, track_id: track.id }, { onConflict: 'user_id,track_id' });
  if (error) throw error;
}

export async function removeFavorite(userId: string, trackId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);
  if (error) throw error;
}

export async function isFavorite(userId: string, trackId: string): Promise<boolean> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('favorites')
    .select('track_id')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
