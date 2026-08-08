/**
 * The six baked artwork swatches. Regenerate with `node scripts/render-art.mjs`
 * after touching the gradients in design/mockup/styles.css.
 */

export type ArtKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

export const ART_KEYS: readonly ArtKey[] = ['a', 'b', 'c', 'd', 'e', 'f'];

/** Square — dock, track rows, playlist hero, cards, Now Playing cover. */
export const ART = {
  a: require('../assets/art/a.png'),
  b: require('../assets/art/b.png'),
  c: require('../assets/art/c.png'),
  d: require('../assets/art/d.png'),
  e: require('../assets/art/e.png'),
  f: require('../assets/art/f.png'),
} as const;

/** Banner — only `.genre .art`, which is roughly 2.7:1. */
export const ART_WIDE = {
  a: require('../assets/art/a-wide.png'),
  b: require('../assets/art/b-wide.png'),
  c: require('../assets/art/c-wide.png'),
  d: require('../assets/art/d-wide.png'),
  e: require('../assets/art/e-wide.png'),
  f: require('../assets/art/f-wide.png'),
} as const;

/** Film grain, tiled at its authored 140px so it reads the same at any size. */
export const NOISE = require('../assets/art/noise.png');

/**
 * Pick a stable swatch for content the mockup never named — user-created
 * playlists, artists, search results with no artwork. Same seed always lands
 * on the same colour, so a playlist doesn't change appearance between launches.
 */
export function artFor(seed: string): ArtKey {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return ART_KEYS[Math.abs(h) % ART_KEYS.length];
}
