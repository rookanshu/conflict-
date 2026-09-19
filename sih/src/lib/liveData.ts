/**
 * Live Data Layer — src/lib/liveData.ts
 *
 * When the relevant API key is configured in the environment, each function
 * below fetches REAL data from the provider and normalises it to the same
 * shape the standalone (mock) datasets use. When no key is present, every
 * function returns `null` so the route handler can fall back to the curated
 * offline dataset.
 *
 * All keys are read from process.env in server-side route handlers only —
 * none are ever exposed to the browser.
 */
import {
  GoogleRouteResponse,
  FleetResponse,
  VahanVerificationResponse,
  BlockageInfo,
  ChatResponse,
} from "@/types/api";
import type { WeatherData } from "@/types";
import { GoogleMapPlace } from "@/lib/googleMapsApi";
import { normalizeEngineFleet } from "@/data/fleetFallback";
import { buildFallbackVerification } from "@/data/vahan";

/* ── Environment helpers ────────────────────────────────────────────── */

/** Returns the env var value if it is set and non-empty, otherwise undefined. */
export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/** True if ANY live-data API key is configured. */
export function hasLiveKey(): boolean {
  return !!(
    env("GOOGLE_ROUTES_API_KEY") ||
    env("SERP_API_KEY") ||
    env("GOOGLE_MAPS_API_KEY") ||
    env("OPENAI_API_KEY") ||
    env("GOOGLE_GENERATIVE_API_KEY") ||
    env("FLEET_BACKEND_URL") ||
    env("PARIVAHAN_API_TOKEN") ||
    env("OPENWEATHER_API_KEY") ||
    env("TRAFFIC_API_KEY")
  );
}

/* ── Places: SerpApi → Google Places ───────────────────────────────── */

// NER-region centre used as the default search anchor (centroid of the 8 states)
const NER_CENTROID = { lat: 26.2, lng: 92.9 };

function serpTypeMap(q: string): string {
  if (q.includes("fuel") || q.includes("diesel") || q.includes("petrol") || q.includes("gas"))
    return "Gas & Diesel Station";
  if (q.includes("hospital") || q.includes("medical") || q.includes("clinic"))
    return "Hospital / Medical";
  if (q.includes("coffee") || q.includes("cafe") || q.includes("food"))
    return "Coffee Shop & Highway Diner";
  return "Highway Amenities";
}

/** Fetch real place search results via SerpApi Google Maps engine. */
export async function livePlacesSerpapi(
  query: string,
  lat: number = NER_CENTROID.lat,
  lng: number = NER_CENTROID.lng
): Promise<GoogleMapPlace[] | null> {
  const apiKey = env("SERP_API_KEY");
  if (!apiKey) return null;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_maps");
  url.searchParams.set("q", query);
  url.searchParams.set("ll", `@${lat},${lng},14z`);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data: any = await res.json();
  const raw: any[] =
    data?.place_results?.local_results || data?.local_results || [];

  return raw.map((r, i) => ({
    position: i + 1,
    title: r.title || r.name || "Unnamed Place",
    rating: typeof r.rating === "number" ? r.rating : undefined,
    reviews: typeof r.reviews === "number" ? r.reviews : undefined,
    type: r.type || serpTypeMap(query),
    address: r.address || r.formatted_address || "",
    openState: r.open_state || r.open_state || "—",
    phone: r.phone || undefined,
    gpsCoordinates: {
      latitude: r.gps_coordinates?.latitude || r.geometry?.location?.lat || lat,
      longitude: r.gps_coordinates?.longitude || r.geometry?.location?.lng || lng,
    },
    distanceKm: typeof r.distance !== "number" ? undefined : r.distance,
    thumbnail: r.thumbnail || undefined,
  })) || null;
}

/** Fetch real place search results via Google Places API (Text Search). */
export async function livePlacesGoogle(
  query: string,
  lat: number = NER_CENTROID.lat,
  lng: number = NER_CENTROID.lng
): Promise<GoogleMapPlace[] | null> {
  const apiKey = env("GOOGLE_MAPS_API_KEY");
  if (!apiKey) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "100000");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data: any = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return null;
  const raw: any[] = data.results || [];

  return raw.map((r, i) => ({
    position: i + 1,
    title: r.name || "Unnamed Place",
    rating: typeof r.rating === "number" ? r.rating : undefined,
    reviews: typeof r.user_ratings_total === "number" ? r.user_ratings_total : undefined,
    type: Array.isArray(r.types) ? r.types.join(", ") : serpTypeMap(query),
    address: r.formatted_address || "",
    openState: r.business_status === "OPERATIONAL"
      ? (r.permanently_closed ? "Closed" : "Open")
      : "—",
    gpsCoordinates: {
      latitude: r.geometry?.location?.lat || lat,
      longitude: r.geometry?.location?.lng || lng,
    },
    distanceKm: undefined,
    thumbnail: r.photos?.[0]?.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${r.photos[0].photo_reference}&key=${apiKey}`
      : undefined,
  })) || null;
}

/** Unified entry point — tries SerpApi first, then Google Places. */
export async function livePlaces(
  query: string,
  lat: number = NER_CENTROID.lat,
  lng: number = NER_CENTROID.lng
): Promise<{ places: GoogleMapPlace[]; source: string } | null> {
  const fromSerp = await livePlacesSerpapi(query, lat, lng);
  if (fromSerp) return { places: fromSerp, source: "SerpApi Google Maps" };

  const fromGoogle = await livePlacesGoogle(query, lat, lng);
  if (fromGoogle) return { places: fromGoogle, source: "Google Places API" };

  return null;
}

// NEXUS — liveData.ts Part 2a: Google Routes API v2

/** Decode a Google polyline-encoded string into [lat, lng] coordinate pairs. */
function decodePolyline(encoded: string): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coords: [number, number][] = [];
  while (index < encoded.length) {
    let result = 1, shift = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result += b << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    result = 1; shift = 0;
    do { b = encoded.charCodeAt(index++) - 63; result += b << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    coords.push([lat / 1e6, lng / 1e6]);
  }
  return coords;
}

function toLatE7(v: { latitude: number; longitude: number }) {
  return { latE7: Math.round(v.latitude * 1e7), lngE7: Math.round(v.longitude * 1e7) };
}

/**
 * Fetch real route corridors from Google Routes API v2.
 * Returns a response shaped to GoogleRouteResponse, or null if the key is absent.
 */
export async function liveRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  alternatives: boolean = false
): Promise<GoogleRouteResponse | null> {
  const apiKey = env("GOOGLE_ROUTES_API_KEY");
  if (!apiKey) return null;

  const body = {
    origin: { location: toLatE7(origin) },
    destination: { location: toLatE7(destination) },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: alternatives,
    languageCode: "en",
  };

  const res = await fetch(`https://routes.googleapis.com/v2:computeRoutes?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.legs,routes.polyline.encodedPolyline,routes.summary",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data: any = await res.json();
  const r = (data.routes || [])[0];
  if (!r) return null;

  const coords: [number, number][] = [];
  if (r.polyline?.encodedPolyline) {
    const decoded = decodePolyline(r.polyline.encodedPolyline);
    const step = Math.max(1, Math.floor(decoded.length / 7));
    for (let i = 0; i < decoded.length; i += step) coords.push(decoded[i]);
    if (coords.length === 0 && decoded.length) coords.push(decoded[0]);
  }

  const km = Math.round((r.distanceMeters || 0) / 1000);
  const durMatch = String(r.duration || "").match(/(\d+)s/);
  const secs = durMatch ? parseInt(durMatch[1], 10) : Math.round((km / 50) * 3600);

  return {
    distance: { meters: r.distanceMeters || 0, km, text: `${km} km` },
    duration: { seconds: secs, hours: Number((secs / 3600).toFixed(1)), text: `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m` },
    route: { coordinates: coords, summary: r.summary || "Google Routes API corridor" },
    source: "Google Routes API v2 (live)",
    risk_assessment: {
      composite_risk: 0, weather_hazard: "Live telemetry available",
      road_hazard: "Live telemetry available",
            recommendation: "Corridor calculated from live Google Routes data.",
    },
  };
}

// NEXUS — liveData.ts Part 2b: AI Chat (OpenAI + Gemini)

const CHAT_SYSTEM_PROMPT =
  "You are NER-LIFELINE AI Copilot, an assistant for logistics operations in India's North Eastern Region. " +
  "Provide concise, operationally useful answers about highway corridors, mountain passes, cold-chain transport, " +
  "emergency protocols, vehicle verification, and road conditions. If you don't know, say so briefly.";

/** Fetch a real AI chat completion via OpenAI (GPT). */
export async function liveChatOpenAI(
  message: string, language: string = "en"
): Promise<Pick<ChatResponse, "answer" | "source" | "timestamp"> | null> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        { role: "user", content: `Respond in ${language === "en" ? "English" : language}. ${message}` },
      ],
      max_tokens: 500, temperature: 0.3,
    }),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) return null;
  return { answer: answer.trim(), source: `OpenAI GPT-4o-mini (live, ${new Date().toLocaleTimeString()})`, timestamp: new Date().toISOString() };
}

/** Fetch a real AI chat completion via Google Generative AI (Gemini). */
export async function liveChatGemini(
  message: string, language: string = "en"
): Promise<Pick<ChatResponse, "answer" | "source" | "timestamp"> | null> {
  const apiKey = env("GOOGLE_GENERATIVE_API_KEY");
  if (!apiKey) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `${CHAT_SYSTEM_PROMPT}\n\nRespond in ${language === "en" ? "English" : language}.\n\n${message}` }],
        }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) return null;
  const data: any = await res.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) return null;
  return { answer: answer.trim(), source: `Google Gemini (live, ${new Date().toLocaleTimeString()})`, timestamp: new Date().toISOString() };
}

/** Unified entry point — tries OpenAI first, then Gemini. */
export async function liveChat(message: string, language: string = "en"): Promise<Pick<ChatResponse, "answer" | "source" | "timestamp"> | null> {
  const a = await liveChatOpenAI(message, language);
  if (a) return a;
  return liveChatGemini(message, language);
}

// Part 3a: Weather (OpenWeatherMap)

const BACKEND = env("FLEET_BACKEND_URL");

/** NER state capitals used as weather-query anchors. */
const NER_STATES = [
  { state: "Arunachal Pradesh", location: "Itanagar / Bomdila Sector", lat: 27.5, lng: 92.2 },
  { state: "Assam", location: "Brahmaputra Valley (Tezpur)", lat: 26.6, lng: 92.8 },
  { state: "Nagaland", location: "Dimapur-Kohima Highway", lat: 25.7, lng: 93.8 },
  { state: "Meghalaya", location: "Shillong Plateau / Sohra", lat: 25.5, lng: 91.9 },
  { state: "Mizoram", location: "Mizo Highlands (Aizawl)", lat: 23.5, lng: 92.9 },
  { state: "Tripura", location: "Agartala Plains", lat: 23.8, lng: 91.3 },
  { state: "Sikkim", location: "Teesta Basin / Gangtok", lat: 27.0, lng: 88.5 },
  { state: "Manipur", location: "Imphal Valley (Ukhrul Ridge)", lat: 25.0, lng: 94.2 },
] as const;

/** Build the cascading risk chain from raw 24h rainfall. */
function buildRiskChain(rain24h: number): WeatherData["riskChain"] {
  const severity = rain24h > 150 ? 100 : rain24h > 80 ? 84 : rain24h > 40 ? 62 : rain24h > 15 ? 35 : 12;
  const accessibility = rain24h > 150
    ? "BLOCKED / Evacuation Route Only"
    : rain24h > 80 ? "RESTRICTED to Pilot Convoys"
    : rain24h > 40 ? "Single Lane Operational"
    : rain24h > 15 ? "Reduced Visibility, Caution"
    : "Open — Normal Ops";
  const delay = rain24h > 150 ? "+4h 30m" : rain24h > 80 ? "+2h 45m" : rain24h > 40 ? "+1h 15m" : rain24h > 15 ? "+25m" : "On Schedule";
  return {
    rainfall: `${rain24h.toFixed(1)} mm/24h (${severity}% slope saturation)`,
    landslideRisk: `${severity > 60 ? "High" : severity > 30 ? "Moderate" : "Low"} ${severity}%`,
    roadAccessibility: accessibility,
    deliveryDelay: delay,
  };
}

/** Fetch real weather for a single coordinate via OpenWeatherMap. */
export async function liveWeather(
  lat: number, lng: number, state = "NER", location = "NER Sector"
): Promise<WeatherData | null> {
  const apiKey = env("OPENWEATHER_API_KEY");
  if (!apiKey) return null;
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`);
  if (!res.ok) return null;
  const d: any = await res.json();
  const rain3h = d.rain?.["3h"] || 0;
  const rain1h = d.rain?.["1h"] || (rain3h / 3) || 0;
  const rain24h = rain1h * 24;
  const temp = d.main?.temp || 20;
  const wind = (d.wind?.speed || 0) * 3.6; // m/s → km/h
  return {
    id: `live-${state.toLowerCase().slice(0, 3)}`,
    state, location, coordinates: [lat, lng],
    rainfall24hMm: Math.round(rain24h * 10) / 10,
    temperatureCelsius: Math.round(temp * 10) / 10,
    windSpeedKmh: Math.round(wind * 10) / 10,
    condition: d.weather?.[0]?.description || "Unknown",
    severeAlert: rain24h > 100 || temp < 0 || wind > 40,
    riskChain: buildRiskChain(rain24h),
  };
}

/** Fetch real weather for all 8 NER states (parallel). */
export async function liveWeatherAll(): Promise<WeatherData[] | null> {
  const apiKey = env("OPENWEATHER_API_KEY");
  if (!apiKey) return null;
  const results = await Promise.all(NER_STATES.map((s) => liveWeather(s.lat, s.lng, s.state, s.location)));
    const ok = results.filter((r): r is WeatherData => r !== null);
  return ok.length > 0 ? ok : null;
}

/** Proxy real vehicle telemetry from the fleet backend (AIS-140) with auth. */
export async function liveFleet(): Promise<FleetResponse | null> {
  if (!BACKEND) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = env("FLEET_API_KEY");
  if (key) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${BACKEND}/api/vehicles`, { headers });
  if (!res.ok) return null;
  const data: any = await res.json();
  return normalizeEngineFleet(data) ?? null;
}

/** Verify a vehicle plate via the backend or direct VAHAN token. */
export async function liveVahan(plate: string): Promise<VahanVerificationResponse | null> {
  if (BACKEND) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = env("FLEET_API_KEY");
    if (key) headers["Authorization"] = `Bearer ${key}`;
    const res = await fetch(`${BACKEND}/api/vahan/verify/${encodeURIComponent(plate)}`, { headers });
    if (res.ok) return (await res.json()) as VahanVerificationResponse;
  }
  const token = env("PARIVAHAN_API_TOKEN");
  if (token) {
    const res = await fetch(
      `https://vahan.parivahan.gov.in/vahan/api/v1/vehicles/${encodeURIComponent(plate)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const d: any = await res.json();
      return { success: true, source: "MoRTH VAHAN 4.0 (live)", record: d.record || d, verified_at: new Date().toISOString() };
    }
  }
  return null;
}

/** Fetch real road blockages from the backend or traffic API. */
export async function liveBlockages(): Promise<BlockageInfo[] | null> {
  if (BACKEND) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = env("FLEET_API_KEY");
    if (key) headers["Authorization"] = `Bearer ${key}`;
    const res = await fetch(`${BACKEND}/api/routes/blockages`, { headers });
    if (res.ok) {
      const data: any = await res.json();
      const arr = Array.isArray(data) ? data : data.blockages || data.results || [];
      if (Array.isArray(arr) && arr.length > 0) return arr as BlockageInfo[];
    }
  }
  const trafficKey = env("TRAFFIC_API_KEY");
  if (trafficKey) {
    const res = await fetch(`https://traffic.googleapis.com/traffic/v1/incidents?key=${trafficKey}`);
    if (res.ok) {
      const data: any = await res.json();
      return (data.incidents || data.blockages || []) as BlockageInfo[];
    }
  }
  return null;
}

// NEXUS
