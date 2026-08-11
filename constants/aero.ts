/**
 * Frutiger Aero design tokens, ported from design/mockup/styles.css `:root`.
 *
 * When a value here disagrees with the mockup, the mockup wins — it is the
 * design source of truth and is vendored in this repo for exactly that reason.
 */

import { Dimensions, Platform, type TextStyle } from 'react-native';

/* ============================================================
   Scale

   The mockup is authored against a 372px-wide phone frame
   (`--phone-w`). Real devices are wider, so every dimension goes
   through s() to keep the proportions the designer chose rather
   than rendering everything a little too small.
   ============================================================ */

const MOCKUP_WIDTH = 372;

const ratio = Dimensions.get('window').width / MOCKUP_WIDTH;

/** Scale a mockup pixel value to this device. */
export const s = (n: number) => Math.round(n * ratio * 100) / 100;

/* ============================================================
   Palette
   ============================================================ */

export const C = {
  lunaBlue: '#245edb',
  lunaBlueDeep: '#1941a5',
  lunaBlueAbyss: '#102b6b',
  lunaBlueLight: '#3a7bfd',
  lunaBlueSky: '#6eb6ff',

  green: '#3c9a3c',
  greenBright: '#52c152',
  greenDeep: '#2d7a2d',
  orange: '#f5a623',
  orangeHot: '#ff8c1a',
  red: '#e7483a',

  /** Body copy, in descending emphasis. */
  ink: '#14315e',
  ink2: '#476ea6',
  ink3: '#7e9fc4',

  surface: '#eaf3ff',
  surface2: '#f7fbff',

  hairline: 'rgba(126,159,196,.28)',
  white: '#ffffff',
} as const;

/* ============================================================
   Geometry
   ============================================================ */

export const R = { sm: s(8), md: s(12), lg: s(16), pill: 999 } as const;

export const H = {
  appbar: s(46),
  tabs: s(38),
  dock: s(64),
} as const;

/* ============================================================
   Gradients

   expo-linear-gradient takes a direction as two unit-square
   points. CSS takes an angle where 0deg points up and rotation
   is clockwise, so convert rather than eyeballing each one.
   ============================================================ */

export type Dir = { start: { x: number; y: number }; end: { x: number; y: number } };

export function angle(deg: number): Dir {
  const r = (deg * Math.PI) / 180;
  const dx = Math.sin(r) / 2;
  const dy = Math.cos(r) / 2;
  return {
    start: { x: 0.5 - dx, y: 0.5 + dy },
    end: { x: 0.5 + dx, y: 0.5 - dy },
  };
}

/**
 * Named directions. Spread one of these — never a whole `G.*` token — when
 * building an inline gradient, or the token's own `colors` will clobber yours.
 */
export const DOWN = angle(180);
export const RIGHT = angle(90);
export const D100 = angle(100);
export const D145 = angle(145);
export const D160 = angle(160);

export type Grad = {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
} & Partial<Dir>;

export const G = {
  /** App bar — the Luna title-bar ramp. */
  appbar: {
    colors: ['#5d9ef5', C.lunaBlue, C.lunaBlueDeep],
    locations: [0, 0.46, 1],
    ...DOWN,
  },
  /** Tab strip trough, darker than the bar above it. */
  tabsBar: { colors: [C.lunaBlueDeep, C.lunaBlueAbyss], ...DOWN },
  /**
   * Auth screens — the app bar's ramp stretched to a full screen, with the
   * abyss stop added so the bottom does not wash out over that distance.
   * These screens must NOT use `G.app`: that is the content-pane gradient and
   * is near-white, which left the white display type at about 1.05:1.
   */
  auth: {
    colors: ['#5d9ef5', C.lunaBlue, C.lunaBlueDeep, C.lunaBlueAbyss],
    locations: [0, 0.3, 0.66, 1],
    ...angle(168),
  },
  /** Selected tab: bottom stop matches the content pane so they merge. */
  tabActive: {
    colors: ['#ffffff', '#f2f8ff', C.surface],
    locations: [0, 0.55, 1],
    ...DOWN,
  },
  /** Content pane behind the views. */
  app: { colors: [C.surface, C.surface2, '#eef6ff'], locations: [0, 0.44, 1], ...DOWN },

  btnBlue: {
    colors: ['#6aa8f0', C.lunaBlue, C.lunaBlueDeep],
    locations: [0, 0.52, 1],
    ...DOWN,
  },
  btnGreen: {
    colors: [C.greenBright, C.green, C.greenDeep],
    locations: [0, 0.52, 1],
    ...DOWN,
  },

  /** The top-half white highlight that makes everything look wet. */
  gloss: { colors: ['rgba(255,255,255,.5)', 'rgba(255,255,255,.06)'], ...DOWN },
  /** Same idea, tuned for the blue chrome. */
  glossBar: { colors: ['rgba(255,255,255,.38)', 'rgba(255,255,255,.04)'], ...DOWN },
  /** Translucent fill for controls sitting on the app bar. */
  glassBtn: { colors: ['rgba(255,255,255,.34)', 'rgba(255,255,255,.06)'], ...DOWN },
  glassTab: { colors: ['rgba(255,255,255,.2)', 'rgba(255,255,255,.05)'], ...DOWN },

  chip: { colors: ['#ffffff', '#e2eefc'], ...DOWN },
  chipOn: { colors: ['#ffc16b', C.orangeHot], ...DOWN },

  dock: { colors: ['#ffffff', '#e6f0fc', '#d8e8fa'], locations: [0, 0.62, 1], ...DOWN },
  dockFill: { colors: [C.lunaBlue, C.lunaBlueSky], ...angle(90) },

  /** Now Playing sheet ground. */
  sheet: { colors: ['#e6f2ff', '#f7fbff', C.surface], locations: [0, 0.4, 1], ...DOWN },
  cover: { colors: ['#ffffff', '#e2eefc'], ...angle(160) },

  /** Playing row — the one hot accent in an otherwise cool UI. */
  trackCurrent: { colors: ['#ffb347', '#ff9522'], ...angle(100) },

  statBlue: { colors: ['#4a8bfd', '#1f55c9'], ...angle(145) },
  statOrange: { colors: ['#ffb347', '#f07d10'], ...angle(145) },
  statGreen: { colors: ['#5fc95f', '#2f8340'], ...angle(145) },

  mood1: { colors: ['#3d7ef0', '#7fd0ff'], ...angle(145) },
  mood2: { colors: ['#6d5ce8', '#b892fb'], ...angle(145) },
  mood3: { colors: ['#f59e0b', '#fcd34d'], ...angle(145) },
  mood4: { colors: ['#0f9b8e', '#6ee7b7'], ...angle(145) },

  /** Frosted card fill, standing in for `backdrop-filter` surfaces. */
  card: { colors: ['rgba(255,255,255,.94)', 'rgba(214,235,255,.72)'], ...angle(120) },
  cardHero: { colors: ['rgba(255,255,255,.94)', 'rgba(214,235,255,.7)'], ...angle(120) },

  brandOrb: { colors: ['#8fd4ff', '#2f6fe4', '#17337d'], locations: [0, 0.58, 1], ...angle(150) },
} satisfies Record<string, Grad>;

/* ============================================================
   Elevation

   CSS box-shadow is per-side; RN needs matching iOS shadow props
   and an Android elevation. Values chosen so the two platforms
   read the same, not so the numbers match the CSS literally.
   ============================================================ */

export const shadow = (
  elevation: number,
  color = 'rgba(11,38,92,.28)',
  radius = elevation * 2,
  offsetY = elevation / 2,
) =>
  Platform.select({
    android: { elevation },
    default: {
      shadowColor: color,
      shadowOpacity: 1,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
  })!;

export const SH = {
  card: shadow(3, 'rgba(20,60,140,.14)', s(12), s(3)),
  btn: shadow(2, 'rgba(11,38,92,.2)', s(6), s(2)),
  art: shadow(3, 'rgba(11,38,92,.3)', s(8), s(3)),
  artLg: shadow(6, 'rgba(11,38,92,.34)', s(16), s(6)),
  appbar: shadow(4, 'rgba(16,43,107,.3)', s(10), s(2)),
  dock: shadow(8, 'rgba(11,38,92,.16)', s(16), -s(4)),
  cover: shadow(12, 'rgba(11,38,92,.3)', s(30), s(12)),
  hot: shadow(4, 'rgba(255,140,26,.38)', s(12), s(3)),
} as const;

/* ============================================================
   Type

   Nunito only ships discrete weights, so name them rather than
   passing numeric fontWeight — Android ignores numeric weights
   on custom families and silently falls back to regular.
   ============================================================ */

export const F = {
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

/** `text-shadow: 0 1px 1px rgba(0,0,0,.28)` on gloss buttons. */
export const textShadow = (
  opacity = 0.28,
  radius = 1,
  offsetY = 1,
): Pick<TextStyle, 'textShadowColor' | 'textShadowOffset' | 'textShadowRadius'> => ({
  textShadowColor: `rgba(0,0,0,${opacity})`,
  textShadowOffset: { width: 0, height: offsetY },
  textShadowRadius: radius,
});

/* ============================================================
   Scrolling
   ============================================================ */

/**
 * Spread onto every scroll view in the app.
 *
 * The design has no overscroll affordance — `.views` is `overscroll-behavior:
 * contain` — and Android 12's stretch effect additionally fights the fling,
 * which shows up as the list snapping backwards mid-scroll. Turning it off
 * removes both.
 */
export const SCROLL = {
  overScrollMode: 'never',
  bounces: false,
  alwaysBounceVertical: false,
  alwaysBounceHorizontal: false,
} as const;

/** `.section-label` — the uppercase micro-heading used on every screen. */
export const sectionLabelText = {
  fontFamily: F.black,
  fontSize: s(9.5),
  letterSpacing: s(9.5) * 0.12,
  color: C.ink2,
  textTransform: 'uppercase',
} as const;
