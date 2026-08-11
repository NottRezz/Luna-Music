import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MOODS, getMoodSearchQuery, type Mood } from "@/constants/moods";

type MoodsGridProps = {
  onMoodSelect?: (mood: Mood, searchQuery: string) => void;
};

export function MoodsGrid({ onMoodSelect }: MoodsGridProps) {
  const router = useRouter();

  function handlePress(mood: Mood) {
    const query = getMoodSearchQuery(mood);
    onMoodSelect?.(mood, query);
    // Search lives at the tab group's index route. There is no `explore` route
    // and never has been — pointing at one broke `tsc` the moment Expo Router
    // generated .expo/types (LM-1). The Search screen does not read `q` yet, so
    // callers should use `onMoodSelect` for the query until it does.
    router.push({
      pathname: "/(tabs)",
      params: { q: query, mood: mood.label },
    });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Browse by mood</Text>
      <View style={styles.grid}>
        {MOODS.map((mood) => (
          <Pressable
            key={mood.id}
            style={[styles.card, { backgroundColor: mood.color }]}
            onPress={() => handlePress(mood)}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={styles.label}>{mood.label}</Text>
          </Pressable>
        ))}
      </View>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 14,
    padding: 12,
    justifyContent: "flex-end",
  },
  emoji: { fontSize: 28, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
