import { artFor, type ArtKey } from '@/constants/art';
import type { ArtSource } from '@/components/aero/art';

export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Seconds. iTunes previews are ~30s; seeded demo tracks use their full length. */
  duration: number;
  /** Baked swatch key, used when there is no real cover. */
  art: ArtKey;
  /** Real cover from the iTunes API, when the track came from a search. */
  artworkUrl?: string;
  /** Audio to play. Absent on seeded demo tracks, which are visual only. */
  previewUrl?: string;
  /** Big word stamped across the Now Playing cover. */
  label?: string;
};

export type Playlist = {
  id: string;
  name: string;
  owner: string;
  art: ArtKey;
  trackIds: string[];
  /** Sub-line on the carousel card, e.g. "Weekly mix". Seeded playlists only. */
  note?: string;
  /** User-created playlists can be renamed and deleted; seeded ones cannot. */
  custom?: boolean;
};

/** Prefer a real cover, fall back to the track's swatch. */
export function artOf(t: Track): ArtSource {
  return t.artworkUrl ? { uri: t.artworkUrl } : t.art;
}

/** iTunes hands back a 100px thumbnail; the same URL serves 600px. */
export function upscale(url: string | undefined) {
  return url?.replace('100x100', '600x600');
}

export function mmss(sec: number) {
  const n = Math.max(0, Math.round(sec));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

/** "1h 42m" / "47m", as the playlist stat strip shows it. */
export function runtime(sec: number) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

/** Map an iTunes search result onto a Track. */
export function fromItunes(r: {
  trackId: number;
  trackName: string;
  artistName: string;
  trackTimeMillis?: number;
  artworkUrl100?: string;
  previewUrl: string;
}): Track {
  const id = `it:${r.trackId}`;
  return {
    id,
    title: r.trackName,
    artist: r.artistName,
    duration: Math.round((r.trackTimeMillis ?? 30000) / 1000),
    art: artFor(id),
    artworkUrl: upscale(r.artworkUrl100),
    previewUrl: r.previewUrl,
    label: coverLabel(r.trackName),
  };
}

/**
 * The word stamped across the Now Playing cover. Seeded tracks carry short
 * hand-written labels ("NEON ECHO"); real titles get trimmed to whole words so
 * they never cut mid-word the way a plain slice would.
 */
export function coverLabel(title: string, max = 14) {
  const words = title.toUpperCase().replace(/\(.*?\)/g, '').trim().split(/\s+/);
  let out = words[0] ?? '';
  for (const w of words.slice(1)) {
    if (out.length + 1 + w.length > max) break;
    out += ` ${w}`;
  }
  return out.slice(0, max);
}
