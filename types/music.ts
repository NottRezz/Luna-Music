import { artFor, type ArtKey } from '@/constants/art';
import type { ArtSource } from '@/components/aero/art';

export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Seconds. iTunes previews are ~30s. */
  duration: number;
  /** Baked swatch key, used when there is no real cover. */
  art: ArtKey;
  /** Real cover from the iTunes API, when the track came from a search. */
  artworkUrl?: string;
  /** Audio to play. */
  previewUrl?: string;
  /** Big word stamped across the Now Playing cover. */
  label?: string;
};

/**
 * A playlist the signed-in account owns. There is no other kind — `owner`,
 * `note` and `custom` are gone with the seeded demo playlists that needed them
 * to mark themselves read-only and print a "Weekly mix" sub-line.
 */
export type Playlist = {
  id: string;
  name: string;
  art: ArtKey;
  trackIds: string[];
};

/** Prefer a real cover, fall back to the track's swatch. */
export function artOf(t: Track): ArtSource {
  return t.artworkUrl ? { uri: t.artworkUrl } : t.art;
}

/** iTunes hands back a 100px thumbnail; the same URL serves 600px. */
export function upscale(url: string | undefined) {
  return url?.replace('100x100', '600x600');
}

/**
 * Artwork lives on *.mzstatic.com, previews on *.apple.com. Nothing else is
 * ever loaded or played.
 *
 * These patterns are the exact pair enforced by the `tracks_artwork_url_host`
 * and `tracks_preview_url_host` CHECK constraints — see
 * supabase/migrations/20260810180000_security_hardening.sql. Keep them in step:
 * the database is the boundary that matters (LM-23, a shared cache where the
 * first writer of an id owns the row), and this is here so a legitimate URL is
 * quietly dropped rather than sent and rejected. Without it, one odd host from
 * the iTunes API would turn into a constraint violation on every like,
 * playlist-add and play.
 *
 * The host must be followed immediately by `/`, which is what stops
 * `https://is1-ssl.mzstatic.com@evil.com/` and `https://mzstatic.com.evil.com/`.
 */
const ARTWORK_HOST = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.mzstatic\.com\//;
const PREVIEW_HOST = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.apple\.com\//;

function onApple(url: string | undefined, host: RegExp): string | undefined {
  if (!url) return undefined;
  // The Search API still hands back http:// for some previews.
  const https = url.replace(/^http:\/\//i, 'https://');
  return host.test(https) ? https : undefined;
}

export const appleArtwork = (url: string | undefined) => onApple(url, ARTWORK_HOST);
export const applePreview = (url: string | undefined) => onApple(url, PREVIEW_HOST);

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
    artworkUrl: appleArtwork(upscale(r.artworkUrl100)),
    previewUrl: applePreview(r.previewUrl),
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
