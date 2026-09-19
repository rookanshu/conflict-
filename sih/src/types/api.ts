// Shared API contracts for the unified NER-LIFELINE API layer.
// These mirror the FastAPI response models in `backend/schemas.py`; any change
// there must be reflected here so the BFF layer and the UI stay type-safe.

/** Origin of a served payload: `live` = FastAPI engine, `fallback` = curated offline dataset. */
export type ApiSource = "live" | "fallback";

export interface ApiResponse<T> {
  data: T;
  source: ApiSource;
  /** Human readable provider label, e.g. "Google Routes API v2" or "NER-LIFELINE Surveyed Corridors". */
  provider?: string;
  /** Populated when the upstream engine was unreachable and the fallback dataset served the response. */
  error?: string;
}

/* ---------------------------------- Chat ---------------------------------- */

/** Mirrors `ChatResponse` in backend/schemas.py */
export interface ChatResponse {
  answer: string;
  source: string;
  suggestions?: string[];
  timestamp: string;
}

export interface ChatSuggestionCategory {
  title: string;
  prompts: string[];
}

export interface ChatSuggestionsResponse {
  categories: ChatSuggestionCategory[];
}

/* ------------------------------ Road blockages ----------------------------- */

/** Mirrors `BlockageInfo` in backend/schemas.py */
export interface BlockageInfo {
  blockage_id: string;
  road_name: string;
  highway: string;
  location_name: string;
  lat: number;
  lng: number;
  reason: string;
  status: string;
  clearing_eta: string;
  diversion_corridor: string;
  reported_at?: string | null;
}

/** Mirrors `NavigationStep` in backend/schemas.py */
export interface NavigationStep {
  step_number: number;
  instruction: string;
  distance_km: number;
  duration_text?: string;
  maneuver?: string;
  lat?: number;
  lng?: number;
}

/** Mirrors `RouteAlternative` in backend/schemas.py */
export interface RouteAlternative {
  route_type: "shortest" | "safest" | string;
  title: string;
  corridor_name: string;
  distance_km: number;
  eta_hours: number;
  duration_text?: string;
  fuel_required_litres: number;
  fuel_sufficient: boolean;
  fuel_margin_litres: number;
  remaining_fuel_after_trip_litres: number;
  risk_score: number;
  risk_level: string;
  landslide_probability_pct: number;
  monsoon_waterlogging: boolean;
  elevation_gain_m: number;
  hazards_encountered: string[];
  navigation_steps: NavigationStep[];
  coordinates: [number, number][];
}

/** Mirrors `AlternateRouteResponse` in backend/schemas.py */
export interface AlternateRouteResponse {
  /** Retained for the target API's live-data indicator. */
  live?: boolean;
  blocked: boolean;
  blockage_details?: Record<string, unknown> | null;
  primary_route_status: string;
  ai_alternate_route: RouteAlternative;
  comparison?: Record<string, unknown>;
  ai_advisory: string;
  recommended_action: string;
  voice_announcement: string;
}

export interface AlternateRouteRequest {
  origin_hub_id?: string;
  destination_hub_id?: string;
  blocked_road_id?: string;
  blockage_lat?: number;
  blockage_lng?: number;
  vehicle_id?: string;
  weather_condition?: string;
}

/* --------------------------- Google Routes corridor ------------------------- */

/** Mirrors `GoogleRouteResponse` in backend/schemas.py (trimmed to consumed fields). */
export interface GoogleRouteResponse {
  distance: { meters: number; km: number; text: string };
  duration: { seconds: number; hours: number; text: string };
  route: { coordinates: [number, number][]; summary?: string };
  source: string;
  risk_assessment?: {
    composite_risk: number;
    weather_hazard: string;
    road_hazard: string;
    recommendation: string;
  };
}

export interface GoogleRouteRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  weather_condition?: string;
  road_condition?: string;
}

/* ---------------------------------- VAHAN ---------------------------------- */

/** Mirrors the MoRTH VAHAN 4.0 verification payload returned by `/api/vahan/verify/{plate}`. */
export interface VahanRecord {
  registration_number: string;
  formatted_plate?: string;
  rc_status?: string;
  issuing_authority?: string;
  state?: string;
  owner_name: string;
  vehicle_class?: string;
  maker: string;
  model: string;
  fuel_type?: string;
  emission_norms?: string;
  fitness_valid_upto?: string;
  national_permit_number?: string;
  ais_140_vltd_device_id?: string;
  erss_112_integrated?: boolean;
}

export interface VahanVerificationResponse {
  success: boolean;
  source: string;
  record: VahanRecord;
  verified_at?: string;
}

/* ---------------------------------- Fleet --------------------------------- */

/** Mirrors `VehicleRegistryItem` in backend/schemas.py. */
export interface FleetRegistryItem {
  vehicle_number: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_type?: string | null;
  owner_org?: string | null;
  fuel_type?: string | null;
  fuel_percentage?: number;
  speed_kmh?: number;
  lat: number;
  lng: number;
  altitude_m?: number | null;
  current_road?: string | null;
  destination?: string | null;
  cargo_manifest?: string | null;
  status?: string;
  state?: string | null;
  is_in_transit?: boolean;
  is_online?: boolean;
  last_ping?: string;
}

export interface FleetResponse {
  success?: boolean;
  total?: number;
  vehicles: FleetRegistryItem[];
  telemetry_standard?: string;
  timestamp?: string;
}

/* ---------------------------------- Health --------------------------------- */

export interface BackendHealthResponse {
  status: string;
  service?: string;
  supabase_configured?: boolean;
  timestamp?: string;
  [key: string]: unknown;
}
