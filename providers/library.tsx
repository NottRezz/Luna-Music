/**
 * Playlists, favorites, recent searches and listening history.
 *
 * Everything here belongs to the signed-in account and comes from Supabase
 * (ADR 4): playlists, playlist_tracks, favorites, and recently_played. Recent
 * search chips remain local (AsyncStorage) — they are not part of the account
 * sync surface.
 *
 * There is no seeded content. This provider used to merge the mockup's demo
 * data underneath the user's, which meant a new account signed in to four
 * playlists it did not make, six songs it had not saved and three tracks it had
 * never played. Empty is the correct state for an empty account; the screens
 * each render their own empty state for it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

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
import { useToast } from '@/providers/toast';
import { runtime, type Playlist, type Track } from '@/types/music';

const RECENTS_KEY = 'luna:recents:v1';

type LibraryValue = {
  /** The account's own playlists. Empty until it creates one. */
  playlists: Playlist[];
  /** Every track the app knows about, addressable by id. */
  tracks: Map<string, Track>;
  /** The account's saved/liked tracks. Empty until it likes one. */
  library: Track[];
  favoriteIds: Set<string>;
  recents: string[];
  history: { track: Track; note: string }[];
  /** `null` when the account has no playlists, or none is selected yet. */
  activePlaylistId: string | null;
  /** `undefined` when there is nothing to show — the Playlist screen handles it. */
  activePlaylist: Playlist | undefined;
  ready: boolean;
  syncing: boolean;

  setActivePlaylist: (id: string | null) => void;
  tracksOf: (p: Playlist) => Track[];
  statsOf: (p: Playlist) => { count: string; runtime: string };

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

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const { notify } = useToast();
  const userId = user?.id ?? null;

  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<{ track: Track; note: string }[]>([]);
  const [recents, setRecentsState] = useState<string[]>([]);
  const [activePlaylistId, setActivePlaylist] = useState<string | null>(null);
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
      // Without this the screens render empty and indistinguishable from a
      // genuinely empty account, which reads as data loss.
      notify('Could not load your library. Check your connection.');
    } finally {
      setSyncing(false);
    }
  }, [notify]);

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
    for (const t of [...userTracks, ...favorites, ...history.map((h) => h.track)]) {
      m.set(t.id, t);
    }
    return m;
  }, [userTracks, favorites, history]);

  const playlists = userPlaylists;

  // Falls back to the first playlist so the screen shows *something* once one
  // exists, but stays undefined while there are none.
  const activePlaylist =
    playlists.find((p) => p.id === activePlaylistId) ?? playlists[0];

  const favoriteIds = useMemo(() => new Set(favorites.map((t) => t.id)), [favorites]);

  const tracksOf = useCallback(
    (p: Playlist) => p.trackIds.map((id) => tracks.get(id)).filter((t): t is Track => !!t),
    [tracks],
  );

  // Always computed. The seeded playlists used to carry hand-written figures
  // — "24 tracks · 1h 42m · 312 saves" over a list of eight — because the
  // mockup printed them. Nothing prints numbers it has not counted now.
  const statsOf = useCallback(
    (p: Playlist) => {
      const list = tracksOf(p);
      return {
        count: String(list.length),
        runtime: runtime(list.reduce((n, t) => n + t.duration, 0)),
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
    await dbRenamePlaylist(id, name);
    setUserPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    await dbDeletePlaylist(id);
    setUserPlaylists((prev) => prev.filter((p) => p.id !== id));
    // Back to "no selection" rather than to a seeded playlist that no longer
    // exists; `activePlaylist` then falls through to whatever is left, or
    // undefined if that was the last one.
    setActivePlaylist((cur) => (cur === id ? null : cur));
  }, []);

  const addToPlaylist = useCallback(
    async (playlistId: string, track: Track) => {
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

  const value = useMemo<LibraryValue>(
    () => ({
      playlists,
      tracks,
      // Favorites, and nothing else. `library` used to append six seeded tracks
      // the account had never saved, which is why the Library tab was full on a
      // fresh sign-in and the Profile "Songs" count started at six.
      library: favorites,
      favoriteIds,
      // No seeded chips merged in. An account that has not searched has no
      // recent searches.
      recents,
      // No seeded fallback when the account has never played anything.
      history,
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
      favorites,
      favoriteIds,
      recents,
      history,
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
