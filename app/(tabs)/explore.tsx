import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { TrackRow } from "@/components/track-row";
import { usePlayer } from "@/context/player-context";
import { searchTracks } from "@/lib/itunes";
import type { Track } from "@/types/track";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; mood?: string }>();
  const [query, setQuery] = useState(params.q ?? "");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { playingId, togglePlay } = usePlayer();

  const search = useCallback(async (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) return;
    setLoading(true);
    try {
      const results = await searchTracks(q);
      setTracks(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
      search(params.q);
    }
  }, [params.q, search]);

  const moodLabel = params.mood ? ` · ${params.mood}` : "";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search{moodLabel}</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search songs or artists..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search()}
          returnKeyType="search"
        />
        <Pressable style={styles.button} onPress={() => search()}>
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      <FlatList
        data={tracks}
        keyExtractor={(item) => String(item.trackId)}
        renderItem={({ item }) => (
          <TrackRow
            track={item}
            playing={playingId === item.trackId}
            onPress={() => togglePlay(item)}
          />
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
});
