/**
 * The "you have nothing here yet" state.
 *
 * There is no empty state in design/mockup/ — every list in the mockup is
 * pre-filled, which is exactly why the app shipped with seeded playlists,
 * seeded favorites and a seeded history underneath the real ones. Removing the
 * filler means these surfaces can now genuinely be empty, so they need
 * something to say.
 *
 * Composed from pieces the mockup does define: the frosted `.card` fill and
 * hairline, at the muted `--ink-3` the sort row and stat captions already use.
 * Deliberately quiet — an empty list is a normal state for a new account, not a
 * problem, so it should not shout.
 *
 * Every message names the action that fills it. "No playlists yet" tells you
 * nothing you could not see.
 */

import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/aero/icon';
import { C, F, R, s } from '@/constants/aero';

export function Empty({
  icon,
  title,
  hint,
}: {
  icon: IconName;
  /** What is missing, in the user's words. */
  title: string;
  /** How to make it not missing. Name a control that exists on screen. */
  hint: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: s(6),
        paddingVertical: s(22),
        paddingHorizontal: s(18),
        borderRadius: R.md,
        backgroundColor: 'rgba(255,255,255,.55)',
        borderWidth: 1,
        borderColor: C.hairline,
      }}>
      <Icon name={icon} size={s(20)} color={C.ink3} />
      <Text
        style={{
          fontFamily: F.extrabold,
          fontSize: s(12),
          color: C.ink2,
          textAlign: 'center',
        }}>
        {title}
      </Text>
      <Text
        style={{
          fontFamily: F.bold,
          fontSize: s(10),
          lineHeight: s(15),
          color: C.ink3,
          textAlign: 'center',
          maxWidth: s(230),
        }}>
        {hint}
      </Text>
    </View>
  );
}
