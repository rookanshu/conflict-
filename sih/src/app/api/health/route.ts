import { NextResponse } from "next/server";
import { env, hasLiveKey } from "@/lib/liveData";

/** Health probe for the local API layer. Reports standalone-or-live status. */
export async function GET() {
  const backendUrl = env("FLEET_BACKEND_URL");
  let backendReachable = false;
  if (backendUrl) {
    try {
      const probe = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(3000) });
      backendReachable = probe.ok;
    } catch {
      backendReachable = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    api_layer: hasLiveKey() ? "hybrid-live" : "local-datasets",
    backend: {
      enabled: !!backendUrl,
      reachable: backendReachable,
      url: backendUrl || "",
      note: backendUrl
        ? "Live backend configured"
        : "Standalone mode — serving curated local datasets only.",
    },
    live_apis: {
      google_routes: !!env("GOOGLE_ROUTES_API_KEY"),
      serp_places: !!env("SERP_API_KEY"),
      google_places: !!env("GOOGLE_MAPS_API_KEY"),
      openai_chat: !!env("OPENAI_API_KEY"),
      gemini_chat: !!env("GOOGLE_GENERATIVE_API_KEY"),
      openweather: !!env("OPENWEATHER_API_KEY"),
      parivahan: !!env("PARIVAHAN_API_TOKEN"),
      traffic: !!env("TRAFFIC_API_KEY"),
    },
    timestamp: new Date().toISOString(),
  });
}
