export type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
};

export type PlayHistoryEntry = {
  track: Track;
  playedAt: number;
};
