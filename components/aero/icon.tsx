/**
 * Icon set. Every path is copied verbatim from design/mockup/index.html so the
 * shapes match the mockup exactly rather than approximating with a font icon.
 */

import Svg, { Circle, Path } from 'react-native-svg';

/** Filled 24x24 glyphs. */
const PATHS = {
  bell:
    'M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22zm7-6v-5.5c0-3.2-1.8-5.9-4.8-6.6v-.7a2.2 2.2 0 0 0-4.4 0v.7C6.8 4.6 5 7.3 5 10.5V16l-2 2v1h18v-1l-2-2z',
  person: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.9 0-9 1.9-9 4.5V21h18v-2.5c0-2.6-5.1-4.5-9-4.5z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  prev: 'M6 6h2v12H6zm3.5 6L18 18V6z',
  next: 'M16 6h2v12h-2zM6 18l8.5-6L6 6z',
  shuffle:
    'M10.6 9.2 5.4 4 4 5.4l5.2 5.2 1.4-1.4zM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4h-5.5zm.3 9.4-1.4 1.4 3.1 3.1L14.5 20H20v-5.5l-2 2-3.2-3.1z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  heart: 'M12 21s-7.5-4.7-9.6-9A5.4 5.4 0 0 1 12 6.3a5.4 5.4 0 0 1 9.6 5.7C19.5 16.3 12 21 12 21z',
  more: 'M12 8a2 2 0 1 0-2-2 2 2 0 0 0 2 2zm0 2a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm0 6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z',
  list: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  grid: 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
  mail: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z',
  lock: 'M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9zm-8-2a3 3 0 0 1 6 0v2H9zm3 6a2 2 0 0 1 1 3.7V19h-2v-2.3A2 2 0 0 1 12 13z',
  eye: 'M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5zm0-7A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5z',
  chevronDown: 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z',
  lyrics: 'M4 5h16v2H4zm0 4h11v2H4zm0 4h16v2H4zm0 4h11v2H4z',
  note: 'M12 3v10.6A4 4 0 1 0 14 17V7h4V3z',
  clock: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.6 4.2 2.5-.9 1.5-5.3-3.2V6h2z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  trash: 'M6 21a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
  pencil: 'M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',

  // The volume control is not in the mockup — it was added on request — so
  // these two are the only glyphs here without a counterpart in the design.
  volume:
    'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volumeOff:
    'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.9 8.9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  color = '#fff',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} fill={color} />
    </Svg>
  );
}

/** The one stroked icon in the design — it sits inside every search field. */
export function SearchIcon({ size = 15, color = '#7e9fc4' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M20 20l-3.6-3.6" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}
