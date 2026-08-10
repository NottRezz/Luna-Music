/**
 * Browse affordances for the Search screen.
 *
 * This is what is left of constants/seed.ts, which used to carry eight fake
 * tracks, six more for the library, four "Made for you" playlists with invented
 * save counts, five recent-search chips, three history entries and a demo
 * profile. All of it rendered as though it were the signed-in user's, so a brand
 * new account opened onto somebody else's library.
 *
 * Moods survived the cull because they are not data — each one runs a real
 * iTunes search for its own name, so they are the one browse control on the
 * screen that does actual work, and the only thing a new account can tap before
 * it has any history of its own.
 */

export const MOODS = [
  { key: 'm1', glyph: '🌊', name: 'Focus', sub: 'Deep & clean' },
  { key: 'm2', glyph: '🌙', name: 'Late Night', sub: 'Low & slow' },
  { key: 'm3', glyph: '☀️', name: 'Sunrise', sub: 'Warm starts' },
  { key: 'm4', glyph: '🍃', name: 'Unwind', sub: 'Soft landings' },
] as const;
