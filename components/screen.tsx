/**
 * `.views` — the scrolling content pane shared by all four tabs.
 *
 * `padding: 12px 12px 16px` in the mockup, and nothing more: the dock is a
 * sibling grid row rather than an overlay, so reserving clearance for it here
 * as well left a dock-sized hole at the end of every list. The safe-area inset
 * is only ours when there is no dock — the dock absorbs it otherwise.
 */

import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCROLL, s } from '@/constants/aero';
import { usePlayer } from '@/providers/player';

export function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { track } = usePlayer();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: s(12),
        paddingTop: s(12),
        paddingBottom: s(16) + (track ? 0 : insets.bottom),
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...SCROLL}>
      <View>{children}</View>
    </ScrollView>
  );
}
