/**
 * Playlists, saved tracks, recent searches and history.
 *
 * Seeded content comes from the mockup and is read-only. Anything the user
 * creates lives alongside it and is persisted to AsyncStorage, so a new
 * playlist survives a relaunch. Supabase takes over next phase — the shape
 * here is deliberately close to what those tables will look like.
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
import { runtime, type Playlist, type Track } from '@/types/music';

const KEY = 'luna:library:v1';

/** Only user-authored state is persisted; seeds are compiled in. */
type Persisted = {
  playlists: Playlist[];
  tracks: Track[];
  recents: string[];
};

type LibraryValue = {
  /** Seeded + user-created, in that order. */
  playlists: (Playlist | SeedPlaylist)[];
  /** Every track the app knows about, addressable by id. */
  tracks: Map<string, Track>;
  library: Track[];
  recents: string[];
  history: { track: Track; note: string }[];
  activePlaylistId: string;
  activePlaylist: Playlist | SeedPlaylist;
  ready: boolean;

  setActivePlaylist: (id: string) => void;
  tracksOf: (p: Playlist) => Track[];
  /** Printed figures for seeded playlists, computed ones for user playlists. */
  statsOf: (p: Playlist | SeedPlaylist) => { count: string; runtime: string; saves: string };

  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  saveToLibrary: (track: Track) => void;
  /** Remembers a search term as a chip, most recent first, capped at 5. */
  rememberSearch: (term: string) => void;
  clearRecents: () => void;
};

const Ctx = createContext<LibraryValue | null>(null);

export function useLibrary() {
  const v = use(Ctx);
  if (!v) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return v;
}

const isSeed = (p: Playlist | SeedPlaylist): p is SeedPlaylist => 'displayCount' in p;

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Persisted>({ playlists: [], tracks: [], recents: [] });
  const [activePlaylistId, setActivePlaylist] = useState(SEED_PLAYLISTS[0].id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSaved(JSON.parse(raw) as Persisted);
      })
      .catch((err) => console.warn('Failed to read library:', err))
      .finally(() => setReady(true));
  }, []);

  // Write-behind. Skipped until the initial read lands so we never persist the
  // empty default over real data.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch((err) =>
      console.warn('Failed to persist library:', err),
    );
  }, [saved, ready]);

  const tracks = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of [...SEED_TRACKS, ...SEED_LIBRARY, ...saved.tracks]) m.set(t.id, t);
    return m;
  }, [saved.tracks]);

  const playlists = useMemo<(Playlist | SeedPlaylist)[]>(
    () => [...SEED_PLAYLISTS, ...saved.playlists],
    [saved.playlists],
  );

  const activePlaylist =
    playlists.find((p) => p.id === activePlaylistId) ?? playlists[0];

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

  /** Keep a track addressable after the search results that produced it are gone. */
  const remember = useCallback((track: Track) => {
    setSaved((s) =>
      s.tracks.some((t) => t.id === track.id) ? s : { ...s, tracks: [...s.tracks, track] },
    );
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const id = `pl:${Date.now().toString(36)}`;
    setSaved((s) => ({
      ...s,
      playlists: [
        ...s.playlists,
        { id, name, owner: 'You', art: artFor(id), trackIds: [], custom: true },
      ],
    }));
    return id;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setSaved((s) => ({
      ...s,
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  }, []);

  const deletePlaylist = useCallback(
    (id: string) => {
      setSaved((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) }));
      setActivePlaylist((cur) => (cur === id ? SEED_PLAYLISTS[0].id : cur));
    },
    [],
  );

  const addToPlaylist = useCallback(
    (playlistId: string, track: Track) => {
      remember(track);
      setSaved((s) => ({
        ...s,
        playlists: s.playlists.map((p) =>
          p.id === playlistId && !p.trackIds.includes(track.id)
            ? { ...p, trackIds: [...p.trackIds, track.id] }
            : p,
        ),
      }));
    },
    [remember],
  );

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setSaved((s) => ({
      ...s,
      playlists: s.playlists.map((p) =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
      ),
    }));
  }, []);

  const saveToLibrary = useCallback((track: Track) => remember(track), [remember]);

  const rememberSearch = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setSaved((s) => ({
      ...s,
      recents: [t, ...s.recents.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 5),
    }));
  }, []);

  const clearRecents = useCallback(() => setSaved((s) => ({ ...s, recents: [] })), []);

  // User searches push the seeded chips out one at a time rather than
  // replacing them wholesale, so the row is never empty. Searching a term that
  // is already seeded would otherwise list it from both halves — same chip,
  // same React key, twice.
  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of [...saved.recents, ...SEED_RECENTS]) {
      const key = r.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length === 5) break;
    }
    return out;
  }, [saved.recents]);

  const library = useMemo(
    () => [...SEED_LIBRARY, ...saved.tracks.filter((t) => !SEED_LIBRARY.some((s) => s.id === t.id))],
    [saved.tracks],
  );

  const history = useMemo(
    () =>
      SEED_HISTORY.map(({ id, note }) => ({ track: tracks.get(id)!, note })).filter((h) => h.track),
    [tracks],
  );

  const value = useMemo<LibraryValue>(
    () => ({
      playlists,
      tracks,
      library,
      recents,
      history,
      activePlaylistId,
      activePlaylist,
      ready,
      setActivePlaylist,
      tracksOf,
      statsOf,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      saveToLibrary,
      rememberSearch,
      clearRecents,
    }),
    [
      playlists, tracks, library, recents, history, activePlaylistId, activePlaylist, ready,
      tracksOf, statsOf, createPlaylist, renamePlaylist, deletePlaylist, addToPlaylist,
      removeFromPlaylist, saveToLibrary, rememberSearch, clearRecents,
    ],
  );

  return <Ctx value={value}>{children}</Ctx>;
}
