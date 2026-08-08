/**
 * Cross-screen overlay state.
 *
 * The Now Playing sheet and the "add to playlist" prompt are rendered once at
 * the root but triggered from anywhere — the dock, a track row, a search
 * result — so their open state cannot live in any one screen.
 */

import { createContext, use, useCallback, useMemo, useState } from 'react';

import type { Track } from '@/types/music';

type UIValue = {
  nowPlayingOpen: boolean;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;

  /** Track awaiting a playlist choice, or null when the prompt is closed. */
  pendingTrack: Track | null;
  promptAddToPlaylist: (track: Track) => void;
  dismissAddToPlaylist: () => void;

  managerOpen: boolean;
  openManager: () => void;
  closeManager: () => void;
};

const Ctx = createContext<UIValue | null>(null);

export function useUI() {
  const v = use(Ctx);
  if (!v) throw new Error('useUI must be used inside <UIProvider>');
  return v;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const openNowPlaying = useCallback(() => setNowPlayingOpen(true), []);
  const closeNowPlaying = useCallback(() => setNowPlayingOpen(false), []);
  const promptAddToPlaylist = useCallback((track: Track) => setPendingTrack(track), []);
  const dismissAddToPlaylist = useCallback(() => setPendingTrack(null), []);
  const openManager = useCallback(() => setManagerOpen(true), []);
  const closeManager = useCallback(() => setManagerOpen(false), []);

  const value = useMemo(
    () => ({
      nowPlayingOpen,
      openNowPlaying,
      closeNowPlaying,
      pendingTrack,
      promptAddToPlaylist,
      dismissAddToPlaylist,
      managerOpen,
      openManager,
      closeManager,
    }),
    [
      nowPlayingOpen, openNowPlaying, closeNowPlaying,
      pendingTrack, promptAddToPlaylist, dismissAddToPlaylist,
      managerOpen, openManager, closeManager,
    ],
  );

  return <Ctx value={value}>{children}</Ctx>;
}
