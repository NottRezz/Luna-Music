/**
 * The one audio player in the app.
 *
 * Everything that can start playback — a search result, a track row, the dock,
 * the Now Playing sheet — goes through this provider. Keeping a single
 * `useAudioPlayer` here is what lets the dock survive tab changes and stops two
 * screens from fighting over the same output.
 */

import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLibrary } from '@/providers/library';
import { useToast } from '@/providers/toast';
import { applePreview, fromItunes, type Track } from '@/types/music';

type Source = { kind: string; name: string };

type PlayerValue = {
  queue: Track[];
  index: number;
  track: Track | undefined;
  source: Source;
  playing: boolean;
  loading: boolean;
  shuffle: boolean;
  repeat: boolean;
  liked: boolean;
  play: (queue: Track[], index: number, source?: Source) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (v: boolean) => void;
  /** Persist like/unlike to Supabase favorites. */
  setLiked: (v: boolean) => void;
};

/**
 * Elapsed time is deliberately *not* part of `PlayerValue`. It changes four
 * times a second, and every screen reads the player, so keeping it in the same
 * context re-rendered all four tabs plus every track row at 4Hz — which is what
 * made the whole interface feel heavy. Only the dock rail and the seek bar
 * subscribe here.
 */
type Progress = {
  /** Seconds elapsed; 0 before the first status tick. */
  position: number;
  /** Seconds; the preview length once loaded, else the track's own duration. */
  duration: number;
};

/** Separate for the same reason as progress: dragging the slider is a 60Hz
 *  update, and only the slider itself needs to see it. */
type VolumeValue = {
  /** 0–1. The level the user chose, which mute does not overwrite. */
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
};

const Ctx = createContext<PlayerValue | null>(null);
const ProgressCtx = createContext<Progress>({ position: 0, duration: 0 });
const VolumeCtx = createContext<VolumeValue | null>(null);

export function usePlayer() {
  const v = use(Ctx);
  if (!v) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return v;
}

/** Ticks with playback. Use only where the elapsed time is actually drawn. */
export function usePlayerProgress() {
  return use(ProgressCtx);
}

export function useVolume() {
  const v = use(VolumeCtx);
  if (!v) throw new Error('useVolume must be used inside <PlayerProvider>');
  return v;
}

/**
 * Most tracks arrive from a search and already carry their own `previewUrl`.
 * This covers the ones that do not — a row restored from the `tracks` cache
 * whose URL was never stored, or was dropped on read for failing the host check
 * (LM-23). Resolved URLs are cached for the session.
 *
 * It used to matter far more: it existed so the fictional seeded demo tracks
 * had something to play. Those are gone.
 */
const previewCache = new Map<string, string | null>();
/** Deduplicates concurrent lookups — a prefetch and a tap can race. */
const inFlight = new Map<string, Promise<string | null>>();

/**
 * iTunes occasionally hangs; a stalled request must not stall the transport.
 * Built from AbortController rather than `AbortSignal.timeout`, which React
 * Native's fetch polyfill does not provide.
 */
async function getJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`iTunes responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function resolvePreview(track: Track): Promise<string | null> {
  if (track.previewUrl) return Promise.resolve(track.previewUrl);
  if (previewCache.has(track.id)) return Promise.resolve(previewCache.get(track.id)!);

  const pending = inFlight.get(track.id);
  if (pending) return pending;

  const p = lookup(`${track.title} ${track.artist}`)
    // Title and artist together can miss where the title alone matches, so fall
    // back rather than give up.
    .then((url) => url ?? lookup(track.title))
    .then((url) => {
      if (!url) console.warn(`No preview found for "${track.title}"`);
      previewCache.set(track.id, url);
      inFlight.delete(track.id);
      return url;
    });

  inFlight.set(track.id, p);
  return p;
}

function lookup(term: string): Promise<string | null> {
  return getJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=1`,
  )
    .then((data) => applePreview(data.results?.[0]?.previewUrl as string | undefined) ?? null)
    .catch(() => null);
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const { isFavorite, toggleFavorite, rememberPlay } = useLibrary();
  const { notify } = useToast();

  // Empty until something is played. This used to start as the mockup's eight
  // demo tracks with index 1, so a brand new account launched into a dock
  // already showing "Digital Rain" by an artist that does not exist. The dock
  // renders nothing while `track` is undefined.
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState<Source>({ kind: 'Not playing', name: '—' });
  const [loading, setLoading] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  /** What the native player should be at, for re-applying after a load. */
  const levelRef = useRef(1);

  /** Guards against a slow preview lookup landing after the user moved on. */
  const loadToken = useRef(0);
  /** Which track the native player actually holds, vs. what the UI shows. */
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    }).catch((err) => console.warn('setAudioModeAsync failed:', err));
  }, []);

  const track = queue[index];
  const liked = track ? isFavorite(track.id) : false;

  const setLiked = useCallback(
    (v: boolean) => {
      if (!track) return;
      if (v === isFavorite(track.id)) return;
      void toggleFavorite(track).catch((err) => {
        console.warn('toggleFavorite failed:', err);
        // The heart has already flipped optimistically, so silence here meant
        // the like looked saved until the next launch proved otherwise.
        notify(v ? 'Could not save that like.' : 'Could not remove that like.');
      });
    },
    [track, isFavorite, toggleFavorite, notify],
  );

  /* --- Volume ------------------------------------------------ */

  const level = muted ? 0 : volume;

  useEffect(() => {
    levelRef.current = level;
    player.volume = level;
  }, [player, level]);

  const setVolume = useCallback((v: number) => {
    const next = Math.max(0, Math.min(1, v));
    setVolumeState(next);
    // Dragging off zero is an unmute; there is no sense in a muted slider that
    // sits at 60%.
    if (next > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  /**
   * Load a track and, by default, start it.
   *
   * LM-7 was here. Both failure exits used to `return` silently: the transport
   * stayed lit, `loadedId` kept pointing at the *previous* track, and the only
   * trace was a `console.warn`. So the app looked like it was playing and was
   * not — and because `loadedId` was stale, pressing play again re-loaded the
   * old track rather than retrying this one.
   *
   * Now both exits say so and clear `loadedId`, which is what makes the next
   * press a real retry.
   */
  const load = useCallback(
    async (t: Track, autoplay = true) => {
      const token = ++loadToken.current;
      setLoading(true);
      try {
        const uri = await resolvePreview(t);
        // A newer load won. Not a failure — say nothing, and leave the state
        // belonging to whichever track is actually current.
        if (token !== loadToken.current) return;

        if (!uri) {
          loadedId.current = null;
          notify(`No audio found for “${t.title}”.`);
          return;
        }

        // Already normalised and host-checked by applePreview, at every source:
        // the iTunes lookup, a search result, and a row read back out of the
        // shared tracks cache. Nothing reaches the player unvetted (LM-23).
        player.replace({ uri });
        // `replace` swaps the underlying source, so re-assert the level rather
        // than trusting it to carry over.
        player.volume = levelRef.current;
        loadedId.current = t.id;
        if (autoplay) player.play();
      } catch (err) {
        if (token !== loadToken.current) return;
        loadedId.current = null;
        console.warn('Failed to load track:', err);
        notify(`Could not play “${t.title}”. Check your connection.`);
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [player, notify],
  );

  const play = useCallback(
    (q: Track[], i: number, src?: Source) => {
      setQueue(q);
      setIndex(i);
      if (src) setSource(src);
      const nextTrack = q[i];
      void load(nextTrack);
      if (nextTrack) void rememberPlay(nextTrack);
    },
    [load, rememberPlay],
  );

  const step = useCallback(
    (delta: number) => {
      if (queue.length === 0) return;
      const i = shuffle
        ? Math.floor(Math.random() * queue.length)
        : (index + delta + queue.length) % queue.length;
      setIndex(i);
      const nextTrack = queue[i];
      void load(nextTrack);
      if (nextTrack) void rememberPlay(nextTrack);
    },
    [queue, index, shuffle, load, rememberPlay],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const toggle = useCallback(() => {
    if (!track) return;
    // First press on the seeded track has nothing loaded yet — fetch it then.
    if (loadedId.current !== track.id) {
      void load(track);
      return;
    }
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing, track, load]);

  const seek = useCallback(
    (seconds: number) => {
      player.seekTo(seconds).catch((err) => console.warn('seek failed:', err));
    },
    [player],
  );

  // Warm the URL lookup for what is on screen and what comes after it. Seeded
  // tracks need a round trip before they can play at all, and paying for it
  // here rather than on the tap is the difference between the transport feeling
  // instant and feeling broken. Results are cached, so this runs once per track.
  useEffect(() => {
    if (queue.length === 0) return;
    void resolvePreview(queue[index]);
    if (queue.length > 1) void resolvePreview(queue[(index + 1) % queue.length]);
  }, [queue, index]);

  /**
   * Latest transport state, for the end-of-track effect below to read without
   * subscribing to. See the comment there for why it cannot depend on these.
   */
  const stepRef = useRef(step);
  const repeatRef = useRef(repeat);
  useEffect(() => {
    stepRef.current = step;
    repeatRef.current = repeat;
  });

  /** Whether the current `didJustFinish` has already been acted on. */
  const handledFinish = useRef(false);

  // Advance at the end of a preview. `repeat` restarts the same track instead.
  //
  // `didJustFinish` is a level, not an edge: it stays true on the status object
  // until the next status arrives. So this must react to the *transition* only.
  // Depending on `step` — which is recreated whenever `index` changes, i.e.
  // immediately after this effect advances — re-ran the effect while the flag
  // was still true and skipped a second track. `repeat` had the same problem
  // whenever it was toggled mid-track. Both are read through refs instead, and
  // the latch covers the case where the flag never falls between two finishes.
  useEffect(() => {
    if (!status.didJustFinish) {
      handledFinish.current = false;
      return;
    }
    if (handledFinish.current) return;
    handledFinish.current = true;

    if (repeatRef.current) {
      player.seekTo(0).then(() => player.play()).catch(() => {});
    } else {
      stepRef.current(1);
    }
  }, [status.didJustFinish, player]);

  const value = useMemo<PlayerValue>(
    () => ({
      queue,
      index,
      track,
      source,
      playing: status.playing ?? false,
      loading,
      shuffle,
      repeat,
      liked,
      play,
      toggle,
      next,
      prev,
      seek,
      setShuffle,
      setRepeat,
      setLiked,
    }),
    [
      queue, index, track, source, status.playing,
      loading, shuffle, repeat, liked, play, toggle, next, prev, seek, setLiked,
    ],
  );

  const progress = useMemo<Progress>(
    () => ({
      position: status.currentTime ?? 0,
      duration: status.duration || track?.duration || 0,
    }),
    [status.currentTime, status.duration, track?.duration],
  );

  const volumeValue = useMemo<VolumeValue>(
    () => ({ volume, muted, setVolume, toggleMute }),
    [volume, muted, setVolume, toggleMute],
  );

  return (
    <Ctx value={value}>
      <ProgressCtx value={progress}>
        <VolumeCtx value={volumeValue}>{children}</VolumeCtx>
      </ProgressCtx>
    </Ctx>
  );
}

/** Search iTunes. Shared by the Search screen and the preview resolver. */
export async function searchItunes(term: string, limit = 25): Promise<Track[]> {
  const data = await getJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=${limit}`,
  );
  return (data.results ?? [])
    .filter((r: { previewUrl?: string }) => r.previewUrl)
    .map(fromItunes);
}
