/**
 * Aero control primitives, ported from design/mockup/styles.css.
 *
 * Class names from the mockup are noted on each export so the two can be
 * diffed when the design changes.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { C, DOWN, F, G, H, R, SH, s, sectionLabelText, textShadow, type Grad as GradToken } from '@/constants/aero';
import { Icon, SearchIcon, type IconName } from './icon';

/* ============================================================
   Gradient helper
   ============================================================ */

/**
 * Evenly spaced colour stops — what a gradient with no `locations` gets anyway.
 * Cached per length; there are only ever two or three distinct ones.
 */
const evenStops: Record<number, readonly number[]> = {};

function evenLocations(n: number) {
  evenStops[n] ??= Array.from({ length: n }, (_, i) => i / (n - 1));
  return evenStops[n];
}

/** Spread a token from `G` onto a LinearGradient. */
export function Grad({
  g,
  style,
  children,
  pointerEvents,
}: {
  g: GradToken;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  pointerEvents?: 'none' | 'auto';
}) {
  return (
    <LinearGradient
      colors={g.colors as unknown as readonly [string, string, ...string[]]}
      // Always send stops, even when the token has none of its own.
      // expo-linear-gradient's Android view drops a null `locations` prop
      // (LinearGradientModule.kt) and then refuses to redraw while
      // `colors.length !== locations.length` (LinearGradientView.drawGradient),
      // so a view that swaps a 3-stop gradient for a 2-stop one keeps painting
      // the old one forever. Matching lengths keeps it out of that state.
      locations={(g.locations ?? evenLocations(g.colors.length)) as never}
      start={g.start}
      end={g.end}
      style={style}
      pointerEvents={pointerEvents}>
      {children}
    </LinearGradient>
  );
}

/** `.gloss::before` — white highlight over the top half. Absolute; drop in last. */
export function Gloss({ bottom = '48%', radius }: { bottom?: number | string; radius?: number }) {
  return (
    <Grad
      g={G.gloss}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { bottom: bottom as number, borderTopLeftRadius: radius, borderTopRightRadius: radius },
      ]}
    />
  );
}

/* ============================================================
   Text
   ============================================================ */

/** `.section-label` — uppercase micro-heading with an optional right-hand action. */
export function SectionLabel({
  children,
  action,
  onAction,
  style,
}: {
  children: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        { marginTop: s(14), marginBottom: s(8), marginHorizontal: s(2) },
        style,
      ]}>
      <Text style={sectionLabelText}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            style={{
              ...sectionLabelText,
              color: C.ink3,
              fontFamily: F.extrabold,
              letterSpacing: s(9.5) * 0.04,
            }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ============================================================
   Buttons
   ============================================================ */

/** `.btn` in its `.btn-blue` / `.btn-green` / `.btn-quiet` variants. */
export function AeroButton({
  label,
  icon,
  variant = 'blue',
  onPress,
  style,
}: {
  label: string;
  icon?: IconName;
  variant?: 'blue' | 'green' | 'quiet';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const quiet = variant === 'quiet';
  const body = (
    <>
      {icon ? <Icon name={icon} size={s(13)} color={quiet ? C.ink2 : '#fff'} /> : null}
      <Text
        style={{
          fontFamily: F.extrabold,
          fontSize: s(11.5),
          color: quiet ? C.ink2 : '#fff',
          ...(quiet ? null : textShadow()),
        }}>
        {label}
      </Text>
    </>
  );

  const inner: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingVertical: s(9),
    paddingHorizontal: s(15),
    borderRadius: R.pill,
  };

  return (
    <Press onPress={onPress} style={style} fill>
      {quiet ? (
        <View
          style={[
            inner,
            { backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: C.hairline },
          ]}>
          {body}
        </View>
      ) : (
        <Grad g={variant === 'green' ? G.btnGreen : G.btnBlue} style={[inner, SH.btn]}>
          {body}
        </Grad>
      )}
    </Press>
  );
}

/** `.icon-btn` — translucent square control, only ever on the app bar. */
export function IconBtn({ name, onPress }: { name: IconName; onPress?: () => void }) {
  return (
    <Press onPress={onPress}>
      <Grad
        g={G.glassBtn}
        style={{
          width: s(30),
          height: s(30),
          borderRadius: s(9),
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,.34)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={name} size={s(15)} color="#fff" />
      </Grad>
    </Press>
  );
}

/** `.icon-sq` — pill-shaped light control used beside primary buttons. */
export function IconSq({
  name,
  active = false,
  onPress,
}: {
  name: IconName;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Press onPress={onPress}>
      <LinearGradient
        colors={active ? ['#ffc16b', C.orangeHot] : ['#ffffff', '#dfeaf7']}
        style={{
          width: s(38),
          height: s(36),
          borderRadius: R.pill,
          borderWidth: 1,
          borderColor: active ? 'transparent' : C.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          ...SH.btn,
        }}>
        <Icon name={name} size={s(16)} color={active ? '#fff' : C.ink2} />
      </LinearGradient>
    </Press>
  );
}

/** `.round` — the circular transport buttons in the dock. */
export function RoundBtn({
  name,
  size: dim = 30,
  variant = 'blue',
  onPress,
}: {
  name: IconName;
  size?: number;
  variant?: 'blue' | 'green';
  onPress?: () => void;
}) {
  return (
    <Press onPress={onPress}>
      <Grad
        g={variant === 'green' ? G.btnGreen : G.btnBlue}
        style={{
          width: s(dim),
          height: s(dim),
          borderRadius: s(dim) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          ...SH.btn,
        }}>
        <Icon name={name} size={s(dim * 0.5)} color="#fff" />
      </Grad>
    </Press>
  );
}

/** Shared press feedback: `transform: scale(.97)` on `:active`. */
export function Press({
  onPress,
  onLongPress,
  scale = 0.97,
  fill = false,
  style,
  children,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  scale?: number;
  /** Let the content stretch to the Pressable, for flexed buttons in a row. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const v = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => (v.value = withTiming(scale, { duration: 90 }))}
      onPressOut={() => (v.value = withSpring(1, { damping: 14, stiffness: 260 }))}
      style={style}>
      <Animated.View style={[fill && { flex: 1 }, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ============================================================
   Inputs
   ============================================================ */

/** `.field` — the inset search/text input shared by Search, Library, Profile. */
export const Field = forwardRef<TextInput, TextInputProps & {
  icon?: 'search' | IconName;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}>(function Field({ icon = 'search', right, containerStyle, style, ...props }, ref) {
  return (
    <View
      style={[
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(9),
          height: s(40),
          paddingHorizontal: s(12),
          borderRadius: s(11),
          borderWidth: 1,
          borderColor: C.hairline,
          backgroundColor: 'rgba(255,255,255,.92)',
        },
        containerStyle,
      ]}>
      {icon === 'search' ? (
        <SearchIcon size={s(15)} />
      ) : (
        <Icon name={icon} size={s(14)} color={C.ink3} />
      )}
      <TextInput
        ref={ref}
        placeholderTextColor={C.ink3}
        style={[
          { flex: 1, minWidth: 0, padding: 0, fontFamily: F.bold, fontSize: s(12.5), color: C.ink },
          style,
        ]}
        {...props}
      />
      {right}
    </View>
  );
});

/** `.chip` — recent-search tag; orange while pressed on. */
export function Chip({
  label,
  on = false,
  onPress,
}: {
  label: string;
  on?: boolean;
  onPress?: () => void;
}) {
  return (
    <Press onPress={onPress} scale={0.95}>
      <Grad
        g={on ? G.chipOn : G.chip}
        style={{
          paddingVertical: s(6),
          paddingHorizontal: s(11),
          borderRadius: R.pill,
          borderWidth: 1,
          borderColor: on ? 'transparent' : C.hairline,
        }}>
        <Text
          style={{
            fontFamily: F.extrabold,
            fontSize: s(10),
            letterSpacing: s(10) * 0.03,
            color: on ? '#fff' : C.lunaBlueDeep,
            ...(on ? textShadow(0.2) : null),
          }}>
          {label}
        </Text>
      </Grad>
    </Press>
  );
}

/** `.segmented` — pill tab group (Songs/Albums/Artists, audio quality). */
export function Segmented({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Grad
      g={{ colors: ['#dfe9f6', '#eef5fd'], ...DOWN }}
      style={[
        {
          flexDirection: 'row',
          gap: 2,
          padding: 3,
          borderRadius: R.pill,
          borderWidth: 1,
          borderColor: C.hairline,
        },
        style,
      ]}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={{ flex: 1, borderRadius: R.pill, overflow: 'hidden' }}>
            {on ? (
              <Grad g={G.btnBlue} style={{ paddingVertical: s(6), alignItems: 'center' }}>
                <SegLabel on>{o}</SegLabel>
              </Grad>
            ) : (
              <View style={{ paddingVertical: s(6), alignItems: 'center' }}>
                <SegLabel>{o}</SegLabel>
              </View>
            )}
          </Pressable>
        );
      })}
    </Grad>
  );
}

function SegLabel({ children, on = false }: { children: string; on?: boolean }) {
  return (
    <Text
      style={{
        fontFamily: F.black,
        fontSize: s(10.5),
        letterSpacing: s(10.5) * 0.05,
        color: on ? '#fff' : C.ink2,
        ...(on ? textShadow(0.25) : null),
      }}>
      {children}
    </Text>
  );
}

/** `.switch` — labelled row toggle on the Profile screen. */
export function AeroSwitch({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const x = useSharedValue(value ? s(17) : 0);

  useEffect(() => {
    x.value = withSpring(value ? s(17) : 0, { damping: 18, stiffness: 220 });
  }, [value, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
        paddingVertical: s(9),
        paddingHorizontal: s(11),
        borderRadius: s(11),
        borderWidth: 1,
        borderColor: C.hairline,
        backgroundColor: 'rgba(255,255,255,.68)',
      }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.extrabold, fontSize: s(12), color: C.ink }}>{title}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3, marginTop: s(1) }}>
          {subtitle}
        </Text>
      </View>

      <LinearGradient
        colors={value ? [C.greenBright, C.green] : ['#c6d6e8', '#e4edf8']}
        style={{ width: s(39), height: s(22), borderRadius: R.pill, justifyContent: 'center' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: s(2),
              width: s(18),
              height: s(18),
              borderRadius: s(9),
              backgroundColor: '#fff',
              ...SH.btn,
            },
            thumb,
          ]}
        />
      </LinearGradient>
    </Pressable>
  );
}

/* ============================================================
   Display
   ============================================================ */

/** `.stat` — one cell of the playlist stat strip. */
export function StatTile({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone: 'blue' | 'orange' | 'green';
}) {
  const g = tone === 'blue' ? G.statBlue : tone === 'orange' ? G.statOrange : G.statGreen;
  return (
    <Grad
      g={g}
      style={{
        flex: 1,
        paddingVertical: s(8),
        paddingHorizontal: s(10),
        borderRadius: R.md,
        overflow: 'hidden',
        ...SH.btn,
      }}>
      <Text
        style={{
          fontFamily: F.black,
          fontSize: s(8),
          letterSpacing: s(8) * 0.12,
          color: 'rgba(255,255,255,.85)',
        }}>
        {k}
      </Text>
      <Text style={{ fontFamily: F.black, fontSize: s(15), color: '#fff', marginTop: s(1) }}>
        {v}
      </Text>
      <Gloss bottom="50%" />
    </Grad>
  );
}

/** `.eq` — the four-bar meter that marks whatever is currently playing. */
export function Eq({ color = C.orangeHot, playing = true }: { color?: string; playing?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: s(1.5), height: s(11) }}>
      {[0, 1, 2, 3].map((i) => (
        <EqBar key={i} color={color} delay={i * 120} playing={playing} />
      ))}
    </View>
  );
}

function EqBar({ color, delay, playing }: { color: string; delay: number; playing: boolean }) {
  const h = useSharedValue(0.3);

  useEffect(() => {
    if (!playing) {
      h.value = withTiming(0.3, { duration: 160 });
      return;
    }
    h.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420 + delay }),
        withTiming(0.3, { duration: 420 + delay }),
      ),
      -1,
      true,
    );
  }, [playing, delay, h]);

  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));

  return (
    <Animated.View
      style={[{ width: s(2.5), borderRadius: 1, backgroundColor: color }, style]}
    />
  );
}

/** Frosted panel used by `.ticker`, `.pl-hero`, `.profile-card`. */
export function Card({
  style,
  children,
  hero = false,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  hero?: boolean;
}) {
  const radius = hero ? R.lg : R.md;

  // The gradient is a separate absolute layer rather than the container itself.
  // On Android an elevated view with a translucent gradient background
  // composites its children into the same layer, which leaves visible seams
  // around laid-out children; an opaque container with the gradient painted
  // behind avoids that entirely.
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,.9)',
          backgroundColor: '#f4f9ff',
          overflow: 'hidden',
          ...SH.card,
        },
        style,
      ]}>
      <Grad
        g={hero ? G.cardHero : G.card}
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

/** Shared text styles for track/queue rows. */
export const rowText = StyleSheet.create({
  title: { fontFamily: F.extrabold, fontSize: s(12), color: C.ink },
  sub: { fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 },
  dur: { fontFamily: F.extrabold, fontSize: s(10), color: C.ink3 },
}) as { title: TextStyle; sub: TextStyle; dur: TextStyle };

export { H, R, C, F, G, SH, s };
