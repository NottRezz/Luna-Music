import { FlatList, StyleSheet, Text, View } from "react-native";

import { TrackRow } from "@/components/track-row";
import { usePlayer } from "@/context/player-context";

export function JumpBackIn() {
  const { playHistory, playingId, togglePlay } = usePlayer();

  if (playHistory.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Jump back in</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Tracks you play will show up here for quick access.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Jump back in</Text>
      <FlatList
        horizontal
        data={playHistory}
        keyExtractor={(item) => String(item.track.trackId)}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TrackRow
            track={item.track}
            playing={playingId === item.track.trackId}
            onPress={() => togglePlay(item.track)}
            compact
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  empty: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});
