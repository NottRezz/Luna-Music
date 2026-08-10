export type RadioStation = {
  id: string;
  name: string;
  tagline: string;
  /** Curated search term for this station's playlist */
  searchTerm: string;
  /** Base listener count used for simulated live stats */
  baseListeners: number;
};

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: "aero-chill",
    name: "Aero Chill",
    tagline: "Smooth electronic & downtempo",
    searchTerm: "chillwave electronic ambient",
    baseListeners: 1240,
  },
  {
    id: "midnight-jazz",
    name: "Midnight Jazz",
    tagline: "Late-night standards & neo-soul",
    searchTerm: "midnight jazz lounge",
    baseListeners: 890,
  },
  {
    id: "indie-dawn",
    name: "Indie Dawn",
    tagline: "Fresh indie & bedroom pop",
    searchTerm: "indie pop bedroom",
    baseListeners: 1560,
  },
  {
    id: "lofi-orbit",
    name: "Lo-Fi Orbit",
    tagline: "Beats to drift through space",
    searchTerm: "lofi hip hop study",
    baseListeners: 2100,
  },
];

/** Pick a station based on time of day so the ticker feels live */
export function getCurrentRadioStation(): RadioStation {
  const hour = new Date().getHours();
  const index = hour % RADIO_STATIONS.length;
  return RADIO_STATIONS[index];
}

/** Simulate a fluctuating listener count around the station base */
export function getListenerCount(station: RadioStation): number {
  const hour = new Date().getHours();
  const peakBoost = hour >= 18 || hour <= 1 ? 1.35 : hour >= 9 && hour <= 17 ? 1.1 : 0.85;
  const jitter = Math.floor(Math.random() * 120) - 40;
  return Math.max(100, Math.round(station.baseListeners * peakBoost + jitter));
}
