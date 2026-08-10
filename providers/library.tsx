/**
 * Playlists, favorites, recent searches and listening history.
 *
 * Seeded content from the mockup stays read-only for demo chrome. User-authored
 * data is the primary store and lives in Supabase (ADR 4): playlists,
 * playlist_tracks, favorites, and recently_played. Recent search chips remain
 * local (AsyncStorage) — they are not part of the account sync surface.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { artFor } from '@/constants/art';
import {
  SEED_HISTORY,
  SEED_LIBRARY,
  SEED_PLAYLISTS,
  SEED_RECENTS,
  SEED_TRACKS,
  type SeedPlaylist,
} from '@/constants/seed';
import {
  addFavorite,
  addTrackToPlaylist,
  createPlaylist as dbCreatePlaylist,
  deletePlaylist as dbDeletePlaylist,
  fetchFavorites,
  fetchRecentlyPlayed,
  fetchUserPlaylists,
  recordPlay,
  removeFavorite,
  removeTrackFromPlaylist,
  renamePlaylist as dbRenamePlaylist,
} from '@/lib/db';
import { useAuth } from '@/providers/auth';
import { runtime, type Playlist, type Track } from '@/types/music';

const RECENTS_KEY = 'luna:recents:v1';

type LibraryValue = {
  /** Seeded + user-created, in that order. */
  playlists: (Playlist | SeedPlaylist)[];
  /** Every track the app knows about, addressable by id. */
  tracks: Map<string, Track>;
  /** Favorites / "liked" library (seeded demo + user favorites). */
  library: Track[];
  favoriteIds: Set<string>;
  recents: string[];
  history: { track: Track; note: string }[];
  activePlaylistId: string;
  activePlaylist: Playlist | SeedPlaylist;
  ready: boolean;
  syncing: boolean;

  setActivePlaylist: (id: string) => void;
  tracksOf: (p: Playlist) => Track[];
  /** Printed figures for seeded playlists, computed ones for user playlists. */
  statsOf: (p: Playlist | SeedPlaylist) => { count: string; runtime: string; saves: string };

  createPlaylist: (name: string) => Promise<string>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  saveToLibrary: (track: Track) => Promise<void>;
  toggleFavorite: (track: Track) => Promise<boolean>;
  isFavorite: (trackId: string) => boolean;
  rememberPlay: (track: Track) => Promise<void>;
  /** Remembers a search term as a chip, most recent first, capped at 5. */
  rememberSearch: (term: string) => void;
  clearRecents: () => void;
  refreshRemote: () => Promise<void>;
};

const Ctx = createContext<LibraryValue | null>(null);

export function useLibrary() {
  const v = use(Ctx);
  if (!v) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return v;
}

const isSeed = (p: Playlist | SeedPlaylist): p is SeedPlaylist => 'displayCount' in p;

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;

  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<{ track: Track; note: string }[]>([]);
  const [recents, setRecentsState] = useState<string[]>([]);
  const [activePlaylistId, setActivePlaylist] = useState(SEED_PLAYLISTS[0].id);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadRemote = useCallback(async (uid: string) => {
    setSyncing(true);
    try {
      const [pl, favs, recent] = await Promise.all([
        fetchUserPlaylists(uid),
        fetchFavorites(uid),
        fetchRecentlyPlayed(uid),
      ]);
      setUserPlaylists(pl.playlists);
      setUserTracks(pl.tracks);
      setFavorites(favs);
      setHistory(recent.map(({ track, note }) => ({ track, note })));
    } catch (err) {
      console.warn('Failed to sync library from Supabase:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Search chips stay local; everything account-scoped comes from Supabase.
  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY)
      .then((raw) => {
        if (raw) setRecentsState(JSON.parse(raw) as string[]);
      })
      .catch((err) => console.warn('Failed to read recents:', err));
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(recents)).catch((err) =>
      console.warn('Failed to persist recents:', err),
    );
  }, [recents]);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    (async () => {
      if (userId) {
        await loadRemote(userId);
      } else {
        setUserPlaylists([]);
        setUserTracks([]);
        setFavorites([]);
        setHistory([]);
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, loadRemote]);

  const tracks = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of [
      ...SEED_TRACKS,
      ...SEED_LIBRARY,
      ...userTracks,
      ...favorites,
      ...history.map((h) => h.track),
    ]) {
      m.set(t.id, t);
    }
    return m;
  }, [userTracks, favorites, history]);

  const playlists = useMemo<(Playlist | SeedPlaylist)[]>(
    () => [...SEED_PLAYLISTS, ...userPlaylists],
    [userPlaylists],
  );

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) ?? playlists[0];

  const favoriteIds = useMemo(() => new Set(favorites.map((t) => t.id)), [favorites]);

  const tracksOf = useCallback(
    (p: Playlist) => p.trackIds.map((id) => tracks.get(id)).filter((t): t is Track => !!t),
    [tracks],
  );

  const statsOf = useCallback(
    (p: Playlist | SeedPlaylist) => {
      if (isSeed(p)) {
        return {
          count: String(p.displayCount),
          runtime: p.displayRuntime,
          saves: String(p.saves),
        };
      }
      const list = tracksOf(p);
      return {
        count: String(list.length),
        runtime: runtime(list.reduce((n, t) => n + t.duration, 0)),
        saves: '0',
      };
    },
    [tracksOf],
  );

  const rememberTrackLocally = useCallback((track: Track) => {
    setUserTracks((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const createPlaylist = useCallback(
    async (name: string) => {
      if (!userId) throw new Error('Sign in to create playlists.');
      const created = await dbCreatePlaylist(userId, name);
      setUserPlaylists((prev) => [...prev, created]);
      return created.id;
    },
    [userId],
  );

  const renamePlaylist = useCallback(async (id: string, name: string) => {
    if (isSeedId(id)) return;
    await dbRenamePlaylist(id, name);
    setUserPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    if (isSeedId(id)) return;
    await dbDeletePlaylist(id);
    setUserPlaylists((prev) => prev.filter((p) => p.id !== id));
    setActivePlaylist((cur) => (cur === id ? SEED_PLAYLISTS[0].id : cur));
  }, []);

  const addToPlaylist = useCallback(
    async (playlistId: string, track: Track) => {
      if (isSeedId(playlistId)) return;
      const current = userPlaylists.find((p) => p.id === playlistId);
      if (!current || current.trackIds.includes(track.id)) {
        rememberTrackLocally(track);
        return;
      }
      await addTrackToPlaylist(playlistId, track, current.trackIds.length);
      rememberTrackLocally(track);
      setUserPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId ? { ...p, trackIds: [...p.trackIds, track.id] } : p,
        ),
      );
    },
    [userPlaylists, rememberTrackLocally],
  );

  const removeFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    if (isSeedId(playlistId)) return;
    await removeTrackFromPlaylist(playlistId, trackId);
    setUserPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p,
      ),
    );
  }, []);

  const saveToLibrary = useCallback(
    async (track: Track) => {
      if (!userId) throw new Error('Sign in to save tracks.');
      if (favoriteIds.has(track.id)) return;
      await addFavorite(userId, track);
      setFavorites((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
      rememberTrackLocally(track);
    },
    [userId, favoriteIds, rememberTrackLocally],
  );

  const toggleFavorite = useCallback(
    async (track: Track) => {
      if (!userId) throw new Error('Sign in to like tracks.');
      if (favoriteIds.has(track.id)) {
        await removeFavorite(userId, track.id);
        setFavorites((prev) => prev.filter((t) => t.id !== track.id));
        return false;
      }
      await addFavorite(userId, track);
      setFavorites((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
      rememberTrackLocally(track);
      return true;
    },
    [userId, favoriteIds, rememberTrackLocally],
  );

  const isFavoriteFn = useCallback((trackId: string) => favoriteIds.has(trackId), [favoriteIds]);

  const rememberPlay = useCallback(
    async (track: Track) => {
      if (!userId) return;
      try {
        await recordPlay(userId, track);
        setHistory((prev) => {
          const next = [
            { track, note: `${track.artist} · just now` },
            ...prev.filter((h) => h.track.id !== track.id),
          ].slice(0, 12);
          return next;
        });
        rememberTrackLocally(track);
      } catch (err) {
        console.warn('Failed to record play:', err);
      }
    },
    [userId, rememberTrackLocally],
  );

  const rememberSearch = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentsState((prev) => [
      t,
      ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase()),
    ].slice(0, 5));
  }, []);

  const clearRecents = useCallback(() => setRecentsState([]), []);

  const refreshRemote = useCallback(async () => {
    if (userId) await loadRemote(userId);
  }, [userId, loadRemote]);

  const mergedRecents = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of [...recents, ...SEED_RECENTS]) {
      const key = r.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length === 5) break;
    }
    return out;
  }, [recents]);

  const library = useMemo(() => {
    const favIds = new Set(favorites.map((t) => t.id));
    const seeded = SEED_LIBRARY.filter((t) => !favIds.has(t.id));
    return [...favorites, ...seeded];
  }, [favorites]);

  const displayHistory = useMemo(() => {
    if (history.length > 0) return history;
    return SEED_HISTORY.map(({ id, note }) => ({ track: tracks.get(id)!, note })).filter(
      (h) => h.track,
    );
  }, [history, tracks]);

  const value = useMemo<LibraryValue>(
    () => ({
      playlists,
      tracks,
      library,
      favoriteIds,
      recents: mergedRecents,
      history: displayHistory,
      activePlaylistId,
      activePlaylist,
      ready,
      syncing,
      setActivePlaylist,
      tracksOf,
      statsOf,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      saveToLibrary,
      toggleFavorite,
      isFavorite: isFavoriteFn,
      rememberPlay,
      rememberSearch,
      clearRecents,
      refreshRemote,
    }),
    [
      playlists,
      tracks,
      library,
      favoriteIds,
      mergedRecents,
      displayHistory,
      activePlaylistId,
      activePlaylist,
      ready,
      syncing,
      tracksOf,
      statsOf,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      saveToLibrary,
      toggleFavorite,
      isFavoriteFn,
      rememberPlay,
      rememberSearch,
      clearRecents,
      refreshRemote,
    ],
  );

  return <Ctx value={value}>{children}</Ctx>;
}

function isSeedId(id: string) {
  return SEED_PLAYLISTS.some((p) => p.id === id);
}
