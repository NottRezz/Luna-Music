import { Tabs } from 'expo-router';

import { AeroChrome } from '@/components/aero-chrome';

export default function TabLayout() {
  return (
    <Tabs
      // The chrome renders the app bar and the tab strip together, so it has to
      // sit above the content rather than in the usual bottom slot. The dock is
      // what occupies the bottom of the screen (see app/_layout.tsx).
      tabBar={(props) => <AeroChrome {...props} />}
      screenOptions={{ headerShown: false, tabBarPosition: 'top', sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" options={{ title: 'Search' }} />
      <Tabs.Screen name="playlist" options={{ title: 'Playlist' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
