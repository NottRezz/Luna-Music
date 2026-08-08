import { ScrollView, StyleSheet, Text } from "react-native";

import { JumpBackIn } from "@/components/jump-back-in";
import { LunaRadioTicker } from "@/components/luna-radio-ticker";
import { MoodsGrid } from "@/components/moods-grid";

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Luna Music</Text>
      <Text style={styles.subtitle}>Your mood, your soundtrack</Text>

      <LunaRadioTicker />
      <JumpBackIn />
      <MoodsGrid />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4C1D95",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 8,
  },
});
