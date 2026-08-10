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

import { SEED_TRACKS } from '@/constants/seed';
import { useLibrary } from '@/providers/library';
import { fromItunes, type Track } from '@/types/music';

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
 * Seeded demo tracks are fictional and carry no audio. Rather than leave half
 * the UI dead, borrow a real preview from iTunes for the title so transport,
 * seeking and the meters are all exercisable. Display metadata stays the
 * mockup's. Resolved URLs are cached for the session.
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
    // The artists are invented, so "Digital Rain SynthWave Pro" matches nothing
    // and the track silently refused to play. The title alone almost always
    // finds something.
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
    .then((data) => (data.results?.[0]?.previewUrl as string | undefined) ?? null)
    .catch(() => null);
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const { isFavorite, toggleFavorite, rememberPlay } = useLibrary();

  // Seeded so the dock is populated on first launch, as it is in the mockup.
  // Nothing is loaded or played until the user asks for it.
  const [queue, setQueue] = useState<Track[]>(SEED_TRACKS);
  const [index, setIndex] = useState(1);
  const [source, setSource] = useState<Source>({ kind: 'Playing from playlist', name: 'Midnight Echoes' });
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
      void toggleFavorite(track).catch((err) => console.warn('toggleFavorite failed:', err));
    },
    [track, isFavorite, toggleFavorite],
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

  const load = useCallback(
    async (t: Track, autoplay = true) => {
      const token = ++loadToken.current;
      setLoading(true);
      try {
        const uri = await resolvePreview(t);
        if (token !== loadToken.current) return;
        if (!uri) return;

        player.replace({ uri: uri.replace(/^http:\/\//i, 'https://') });
        // `replace` swaps the underlying source, so re-assert the level rather
        // than trusting it to carry over.
        player.volume = levelRef.current;
        loadedId.current = t.id;
        if (autoplay) player.play();
      } catch (err) {
        console.warn('Failed to load track:', err);
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [player],
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
