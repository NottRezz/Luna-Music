import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { Track } from "@/types/track";

type TrackRowProps = {
  track: Track;
  playing: boolean;
  onPress: () => void;
  compact?: boolean;
};

export function TrackRow({
  track,
  playing,
  onPress,
  compact = false,
}: TrackRowProps) {
  return (
    <Pressable
      style={[styles.row, compact && styles.rowCompact]}
      onPress={onPress}
    >
      <Image source={{ uri: track.artworkUrl100 }} style={styles.art} />
      <View style={styles.info}>
        <Text style={styles.trackName} numberOfLines={1}>
          {track.trackName}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artistName}
        </Text>
      </View>
      <Text style={styles.playIcon}>{playing ? "❚❚" : "▶"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  rowCompact: {
    width: 220,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
  },
  art: { width: 50, height: 50, borderRadius: 6, backgroundColor: "#eee" },
  info: { flex: 1 },
  trackName: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  artist: { fontSize: 13, color: "#6B7280" },
  playIcon: { fontSize: 18, color: "#6D28D9", paddingHorizontal: 8 },
});
