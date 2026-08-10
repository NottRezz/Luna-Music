export type Mood = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  /** Curated iTunes search terms mapped to this mood */
  searchTerms: string[];
};

export const MOODS: Mood[] = [
  {
    id: "chill",
    label: "Chill",
    emoji: "🌙",
    color: "#6366F1",
    searchTerms: ["lo-fi chill", "ambient relax", "chillhop beats"],
  },
  {
    id: "happy",
    label: "Happy",
    emoji: "☀️",
    color: "#F59E0B",
    searchTerms: ["upbeat pop", "feel good hits", "happy dance"],
  },
  {
    id: "focus",
    label: "Focus",
    emoji: "🎯",
    color: "#10B981",
    searchTerms: ["study beats", "instrumental focus", "deep work"],
  },
  {
    id: "energy",
    label: "Energy",
    emoji: "⚡",
    color: "#EF4444",
    searchTerms: ["workout pump", "high energy edm", "power run"],
  },
  {
    id: "sad",
    label: "Melancholy",
    emoji: "🌧️",
    color: "#64748B",
    searchTerms: ["sad indie", "melancholy acoustic", "rainy day"],
  },
  {
    id: "romantic",
    label: "Romantic",
    emoji: "💜",
    color: "#A855F7",
    searchTerms: ["romantic r&b", "love songs slow", "date night jazz"],
  },
];

export function getMoodSearchQuery(mood: Mood): string {
  const index = Math.floor(Math.random() * mood.searchTerms.length);
  return mood.searchTerms[index];
}
