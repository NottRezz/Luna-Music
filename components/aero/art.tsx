/**
 * `.art` — the artwork tile.
 *
 * The gradient and its gloss are baked into the PNG (see scripts/render-art.mjs);
 * the film grain is tiled here at its authored 140px so it stays the same
 * physical size on a 36px row and a 200px cover, exactly as CSS does it.
 */

import { Image } from 'expo-image';
import { Image as RNImage, View, type StyleProp, type ViewStyle } from 'react-native';

import { ART, ART_WIDE, NOISE, type ArtKey } from '@/constants/art';

export type ArtSource = ArtKey | { uri: string };

/**
 * Below this the grain costs more than it shows. Tiling is a repeating bitmap
 * shader per instance, and a list of search results carries dozens of them; at
 * 36px you are seeing a quarter of one 140px tile at 15% opacity, which is
 * nothing. Covers and carousel cards are well above the line and keep it.
 */
const GRAIN_MIN = 64;

export function Art({
  source,
  size,
  radius = 0,
  wide = false,
  style,
  children,
}: {
  source: ArtSource;
  /** Convenience for the common square case; omit and use `style` otherwise. */
  size?: number;
  radius?: number;
  /** Use the 2.7:1 bake — only `.genre .art` needs this. */
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const isRemote = typeof source !== 'string';
  // Unsized means the cover, which is the largest tile in the app.
  const grain = size == null || size >= GRAIN_MIN;

  return (
    <View
      style={[
        size != null && { width: size, height: size },
        { borderRadius: radius, overflow: 'hidden', backgroundColor: '#0b1220' },
        style,
      ]}>
      <Image
        source={isRemote ? source : (wide ? ART_WIDE : ART)[source]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        contentFit="cover"
        transition={isRemote ? 160 : 0}
      />
      {/* `.art::after` — grain, tiled rather than stretched. */}
      {grain ? (
        <RNImage
          source={NOISE}
          resizeMode="repeat"
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.15 }}
        />
      ) : null}
      {children}
    </View>
  );
}
