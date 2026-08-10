import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getCurrentRadioStation,
  getListenerCount,
} from "@/constants/radio";
import { usePlayer } from "@/context/player-context";
import { searchTracks } from "@/lib/itunes";

export function LunaRadioTicker() {
  const { togglePlay, playingId } = usePlayer();
  const station = useMemo(() => getCurrentRadioStation(), []);
  const [listeners, setListeners] = useState(() => getListenerCount(station));
  const [tuning, setTuning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setListeners(getListenerCount(station));
    }, 8000);
    return () => clearInterval(interval);
  }, [station]);

  async function handleTuneIn() {
    setTuning(true);
    try {
      const tracks = await searchTracks(station.searchTerm, 15);
      if (tracks.length === 0) return;
      const pick = tracks[Math.floor(Math.random() * Math.min(5, tracks.length))];
      togglePlay(pick);
    } catch (err) {
      console.error("Tune in failed:", err);
    } finally {
      setTuning(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.liveRow}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LUNA RADIO · LIVE</Text>
      </View>

      <Text style={styles.stationName}>{station.name}</Text>
      <Text style={styles.tagline}>{station.tagline}</Text>

      <View style={styles.footer}>
        <Text style={styles.listeners}>
          {listeners.toLocaleString()} listening now
        </Text>
        <Pressable
          style={[styles.tuneButton, tuning && styles.tuneButtonDisabled]}
          onPress={handleTuneIn}
          disabled={tuning}
        >
          {tuning ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.tuneText}>
              {playingId ? "Shuffle station" : "Tune in"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1B4B",
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F87171",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C4B5FD",
    letterSpacing: 1,
  },
  stationName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  tagline: {
    fontSize: 14,
    color: "#A5B4FC",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  listeners: {
    fontSize: 13,
    color: "#E0E7FF",
  },
  tuneButton: {
    backgroundColor: "#6D28D9",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 110,
    alignItems: "center",
  },
  tuneButtonDisabled: { opacity: 0.7 },
  tuneText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
