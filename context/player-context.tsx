import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { normalizePreviewUrl } from "@/lib/itunes";
import { addToPlayHistory, getPlayHistory } from "@/lib/play-history";
import type { PlayHistoryEntry, Track } from "@/types/track";

type PlayerContextValue = {
  playingId: number | null;
  playHistory: PlayHistoryEntry[];
  togglePlay: (track: Track) => void;
  refreshHistory: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playHistory, setPlayHistory] = useState<PlayHistoryEntry[]>([]);
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const wantedTrackRef = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: "duckOthers",
    }).catch((err) => console.error("setAudioModeAsync failed:", err));
  }, []);

  useEffect(() => {
    getPlayHistory().then(setPlayHistory).catch(console.error);
  }, []);

  useEffect(() => {
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        wantedTrackRef.current = null;
        setPlayingId(null);
        return;
      }

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

  const refreshHistory = useCallback(async () => {
    const history = await getPlayHistory();
    setPlayHistory(history);
  }, []);

  const togglePlay = useCallback(
    (track: Track) => {
      if (playingId === track.trackId) {
        wantedTrackRef.current = null;
        player.pause();
        setPlayingId(null);
        return;
      }

      const uri = normalizePreviewUrl(track.previewUrl);
      wantedTrackRef.current = track.trackId;
      player.replace({ uri });
      player.play();
      setPlayingId(track.trackId);

      addToPlayHistory(track)
        .then(setPlayHistory)
        .catch(console.error);
    },
    [player, playingId],
  );

  const value = useMemo(
    () => ({ playingId, playHistory, togglePlay, refreshHistory }),
    [playingId, playHistory, togglePlay, refreshHistory],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
