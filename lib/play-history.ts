import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PlayHistoryEntry, Track } from "@/types/track";

const STORAGE_KEY = "@luna/play-history";
const MAX_ENTRIES = 12;

export async function getPlayHistory(): Promise<PlayHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlayHistoryEntry[];
  } catch {
    return [];
  }
}

export async function addToPlayHistory(track: Track): Promise<PlayHistoryEntry[]> {
  const existing = await getPlayHistory();
  const filtered = existing.filter((e) => e.track.trackId !== track.trackId);
  const updated: PlayHistoryEntry[] = [
    { track, playedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_ENTRIES);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearPlayHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
