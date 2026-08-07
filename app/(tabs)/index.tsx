import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);

  // One reusable audio player. The `null` source keeps this instance stable for
  // the life of the screen; tracks are swapped in with player.replace().
  const player = useAudioPlayer(null, { updateInterval: 250 });

  // The track we intend to be hearing, or null if the user deliberately paused.
  const wantedTrackRef = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      // Anything but 'mixWithOthers' — that value makes the Android module skip
      // requesting audio focus entirely.
      interruptionMode: "duckOthers",
    }).catch((err) => console.error("setAudioModeAsync failed:", err));
  }, []);

  useEffect(() => {
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        wantedTrackRef.current = null;
        setPlayingId(null);
        return;
      }

      // prepare() runs asynchronously, so a play() issued at tap time can land
      // before the remote source is READY. Re-assert it once loading finishes.
      if (
        wantedTrackRef.current !== null &&
        status.isLoaded &&
        !status.playing
      ) {
        player.play();
      }
    });

    return () => sub.remove();
  }, [player]);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=25`,
      );
      const data = await res.json();
      setTracks(data.results.filter((t: Track) => t.previewUrl));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const togglePlay = useCallback(
    (track: Track) => {
      if (playingId === track.trackId) {
        wantedTrackRef.current = null;
        player.pause();
        setPlayingId(null);
        return;
      }

      // Some iTunes results still carry http:// preview URLs, which Android
      // drops as cleartext traffic without surfacing an error.
      const uri = track.previewUrl.replace(/^http:\/\//i, "https://");

      wantedTrackRef.current = track.trackId;
      player.replace({ uri });
      player.play();
      setPlayingId(track.trackId);
    },
    [player, playingId],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Luna Music</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search songs or artists..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Pressable style={styles.button} onPress={search}>
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      <FlatList
        data={tracks}
        keyExtractor={(item) => String(item.trackId)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => togglePlay(item)}>
            <Image source={{ uri: item.artworkUrl100 }} style={styles.art} />
            <View style={styles.info}>
              <Text style={styles.trackName} numberOfLines={1}>
                {item.trackName}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artistName}
              </Text>
            </View>
            <Text style={styles.playIcon}>
              {playingId === item.trackId ? "❚❚" : "▶"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#4C1D95",
  },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  button: {
    backgroundColor: "#6D28D9",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  art: { width: 50, height: 50, borderRadius: 6, backgroundColor: "#eee" },
  info: { flex: 1 },
  trackName: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  artist: { fontSize: 13, color: "#6B7280" },
  playIcon: { fontSize: 18, color: "#6D28D9", paddingHorizontal: 8 },
});
