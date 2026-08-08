/**
 * Demo content, copied from design/mockup/app.js and index.html so the app
 * looks like the mockup on first launch.
 *
 * Supabase replaces this next phase. Anything the user creates is stored
 * separately and persisted — see providers/library.tsx.
 */

import type { Playlist, Track } from '@/types/music';

/** `TRACKS` in the mockup — the Midnight Echoes track list. */
export const SEED_TRACKS: Track[] = [
  { id: 'sd:1', title: 'Neon Horizon', artist: 'Pixel Bloom', duration: 222, art: 'b', label: 'NEON HORIZON' },
  { id: 'sd:2', title: 'Digital Rain', artist: 'SynthWave Pro', duration: 255, art: 'a', label: 'NEON ECHO' },
  { id: 'sd:3', title: 'Arcade Memory', artist: 'Chrome Coast', duration: 238, art: 'd', label: 'ARCADE' },
  { id: 'sd:4', title: 'Solar Flare', artist: 'Luna Collective', duration: 301, art: 'e', label: 'SOLAR' },
  { id: 'sd:5', title: 'Glass Garden', artist: 'Aero Fields', duration: 262, art: 'c', label: 'GLASS' },
  { id: 'sd:6', title: 'Midnight Bus', artist: 'Vista Kids', duration: 216, art: 'f', label: 'MIDNIGHT' },
  { id: 'sd:7', title: 'Liquid Chrome', artist: 'Pixel Bloom', duration: 244, art: 'e', label: 'CHROME' },
  { id: 'sd:8', title: 'Paper Lantern', artist: 'Aero Fields', duration: 199, art: 'c', label: 'LANTERN' },
];

/** `LIBRARY` in the mockup. */
export const SEED_LIBRARY: Track[] = [
  { id: 'sd:9', title: 'Digital Horizon', artist: 'SynthWave Pro', duration: 255, art: 'a', label: 'HORIZON' },
  { id: 'sd:10', title: 'Neon Acrylic', artist: 'Pixel Bloom', duration: 228, art: 'b', label: 'ACRYLIC' },
  { id: 'sd:11', title: 'Etheric Echo', artist: 'Aero Fields', duration: 302, art: 'c', label: 'ETHERIC' },
  { id: 'sd:12', title: 'Bubble Physics', artist: 'Chrome Coast', duration: 187, art: 'f', label: 'BUBBLE' },
  { id: 'sd:13', title: 'Wallpaper Bliss', artist: 'Vista Kids', duration: 241, art: 'e', label: 'BLISS' },
  { id: 'sd:14', title: 'Sunset Protocol', artist: 'Luna Collective', duration: 274, art: 'd', label: 'SUNSET' },
];

/**
 * The four "Made for you" playlists.
 *
 * `display*` exist because the mockup advertises 24 tracks / 1h 42m while
 * listing 8 rows. Honouring the printed figures keeps the stat strip and
 * carousel identical to the design; user-created playlists compute for real.
 */
export type SeedPlaylist = Playlist & {
  displayCount: number;
  displayRuntime: string;
  saves: number;
};

export const SEED_PLAYLISTS: SeedPlaylist[] = [
  {
    id: 'pl:midnight-echoes',
    name: 'Midnight Echoes',
    owner: 'Luna Collective',
    art: 'a',
    note: 'Updated today',
    trackIds: SEED_TRACKS.map((t) => t.id),
    displayCount: 24,
    displayRuntime: '1h 42m',
    saves: 312,
  },
  {
    id: 'pl:sunset-protocol',
    name: 'Sunset Protocol',
    owner: 'Luna Collective',
    art: 'd',
    note: 'Weekly mix',
    trackIds: ['sd:14', 'sd:4', 'sd:3', 'sd:1'],
    displayCount: 18,
    displayRuntime: '1h 09m',
    saves: 204,
  },
  {
    id: 'pl:glass-garden',
    name: 'Glass Garden',
    owner: 'Aero Fields',
    art: 'c',
    note: 'Ambient',
    trackIds: ['sd:5', 'sd:11', 'sd:8', 'sd:12'],
    displayCount: 31,
    displayRuntime: '2h 04m',
    saves: 488,
  },
  {
    id: 'pl:neon-acrylic',
    name: 'Neon Acrylic',
    owner: 'Pixel Bloom',
    art: 'b',
    note: 'Synthwave',
    trackIds: ['sd:10', 'sd:1', 'sd:7'],
    displayCount: 12,
    displayRuntime: '47m',
    saves: 91,
  },
];

/** `#recentChips`. */
export const SEED_RECENTS = ['lo-fi crystal', 'aero jazz', 'liquid dnb', 'neo-plastic pop', 'chillstep'];

/** "Jump back in" — track id paired with its relative-time caption. */
export const SEED_HISTORY: { id: string; note: string }[] = [
  { id: 'sd:13', note: 'Vista Kids · 2 days ago' },
  { id: 'sd:12', note: 'Chrome Coast · 4 days ago' },
  { id: 'sd:11', note: 'Aero Fields · last week' },
];

export const MOODS = [
  { key: 'm1', glyph: '🌊', name: 'Focus', sub: 'Deep & clean' },
  { key: 'm2', glyph: '🌙', name: 'Late Night', sub: 'Low & slow' },
  { key: 'm3', glyph: '☀️', name: 'Sunrise', sub: 'Warm starts' },
  { key: 'm4', glyph: '🍃', name: 'Unwind', sub: 'Soft landings' },
] as const;

export const GENRES = [
  { name: 'Synthwave', count: 142, art: 'b' },
  { name: 'Ambient', count: 96, art: 'e' },
  { name: 'Lo-Fi', count: 210, art: 'c' },
  { name: 'Trance', count: 78, art: 'd' },
] as const;

/** Profile screen. Replaced by the real Supabase session next phase. */
export const SEED_PROFILE = {
  name: 'Alex Rivera',
  handle: '@alexrivera',
  initials: 'AR',
  plan: 'PREMIUM',
  email: 'alex.rivera@lunamusic.app',
  username: 'alexrivera',
  password: 'aerobliss01',
  stats: [
    { v: '1,284', k: 'Songs' },
    { v: '37', k: 'Playlists' },
    { v: '92h', k: 'This year' },
  ],
} as const;
