/**
 * Playlist CRUD against Supabase (ADR 4).
 */

import { artFor } from '@/constants/art';
import { requireSupabase } from '@/lib/supabase';
import { ensureTrack, rowToTrack } from '@/lib/db/tracks';
import type { Playlist, Track } from '@/types/music';
import type { PlaylistRow, TrackRow } from '@/types/database';

type PlaylistWithTracks = PlaylistRow & {
  playlist_tracks: { track_id: string; position: number; tracks: TrackRow | null }[];
};

export async function fetchUserPlaylists(userId: string): Promise<{
  playlists: Playlist[];
  tracks: Track[];
}> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('playlists')
    .select(
      `
      id, user_id, name, art_key, created_at, updated_at,
      playlist_tracks ( track_id, position, tracks ( * ) )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const trackMap = new Map<string, Track>();
  const playlists: Playlist[] = ((data ?? []) as PlaylistWithTracks[]).map((row) => {
    const ordered = [...(row.playlist_tracks ?? [])].sort((a, b) => a.position - b.position);
    const trackIds: string[] = [];
    for (const pt of ordered) {
      trackIds.push(pt.track_id);
      if (pt.tracks) trackMap.set(pt.tracks.id, rowToTrack(pt.tracks));
    }
    return {
      id: row.id,
      name: row.name,
      owner: 'You',
      art: (row.art_key as Playlist['art']) || artFor(row.id),
      trackIds,
      custom: true,
    };
  });

  return { playlists, tracks: [...trackMap.values()] };
}

export async function createPlaylist(userId: string, name: string): Promise<Playlist> {
  const client = requireSupabase();
  const art = artFor(`pl:${name}:${Date.now()}`);
  const { data, error } = await client
    .from('playlists')
    .insert({ user_id: userId, name, art_key: art })
    .select('id, name, art_key')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    owner: 'You',
    art: (data.art_key as Playlist['art']) || art,
    trackIds: [],
    custom: true,
  };
}

export async function renamePlaylist(playlistId: string, name: string) {
  const client = requireSupabase();
  const { error } = await client.from('playlists').update({ name }).eq('id', playlistId);
  if (error) throw error;
}

export async function deletePlaylist(playlistId: string) {
  const client = requireSupabase();
  const { error } = await client.from('playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

export async function addTrackToPlaylist(playlistId: string, track: Track, position: number) {
  const client = requireSupabase();
  await ensureTrack(track);
  const { error } = await client.from('playlist_tracks').upsert(
    { playlist_id: playlistId, track_id: track.id, position },
    { onConflict: 'playlist_id,track_id' },
  );
  if (error) throw error;
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId);
  if (error) throw error;
}
