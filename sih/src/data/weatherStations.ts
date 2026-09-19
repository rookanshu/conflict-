/**
 * Curated NER weather-station anchors (src/data/weatherStations.ts).
 * Coordinates match the GIS map focuses used across the dashboard, so live
 * Open-Meteo reports land on the same map markers as the offline dataset.
 * Only static geometry lives here — measurements always come from the API.
 */
export interface WeatherStation {
  id: string;
  state: string;
  location: string;
  coordinates: [number, number]; // [lat, lng]
}

export const WEATHER_STATIONS: WeatherStation[] = [
  { id: "wx-1", state: "Arunachal Pradesh", location: "West Siang / Bomdila Sector", coordinates: [28.18, 94.95] },
  { id: "wx-2", state: "Assam", location: "Brahmaputra Valley (Tezpur - Dhemaji)", coordinates: [26.83, 93.65] },
  { id: "wx-3", state: "Sikkim", location: "Teesta Basin / Gangtok Corridor", coordinates: [27.05, 88.51] },
  { id: "wx-4", state: "Meghalaya", location: "Shillong Plateau / Sohra Corridor", coordinates: [25.5788, 91.8933] },
  { id: "wx-5", state: "Manipur", location: "Imphal - Ukhrul Mountain Ridges", coordinates: [24.96, 94.22] },
  { id: "wx-6", state: "Tripura", location: "Agartala Plains & Low Hills", coordinates: [23.8315, 91.2868] },
];