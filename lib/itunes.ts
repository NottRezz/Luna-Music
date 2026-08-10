import type { Track } from "@/types/track";

export async function searchTracks(
  term: string,
  limit = 25,
): Promise<Track[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=${limit}`,
  );
  const data = await res.json();
  return (data.results ?? []).filter((t: Track) => t.previewUrl);
}

export function normalizePreviewUrl(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}
