import { NextRequest, NextResponse } from "next/server";
import { getFallbackAlternate, buildVoiceAnnouncement } from "@/data/blockages";
import type { AlternateRouteResponse } from "@/types/api";
import { env } from "@/lib/liveData";

/**
 * AI alternate detour route recommendation.
 * Live backend when FLEET_BACKEND_URL is set; offline fallback otherwise.
 */
export async function POST(req: NextRequest) {
  let body: { blocked_road_id?: string } = {};
  try { body = await req.json(); } catch { body = {}; }

  const blockageId = body.blocked_road_id ?? "blk-1";

  /* ── Live: fetch real-time detour from backend ── */
  const backend = env("FLEET_BACKEND_URL");
  if (backend) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const bkey = env("FLEET_API_KEY");
    if (bkey) headers["Authorization"] = `Bearer ${bkey}`;
    try {
      const res = await fetch(`${backend}/api/routes/alternate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ blocked_road_id: blockageId }),
      });
      if (res.ok) {
        const data: any = await res.json();
        return NextResponse.json({ ...data, live: true });
      }
    } catch {
      // fall through to offline
    }
  }

  const alternate = getFallbackAlternate(blockageId);
  const response: AlternateRouteResponse = {
    blocked: true,
    blockage_details: null,
    primary_route_status: "BLOCKED / IMPASSABLE",
    ai_alternate_route: alternate,
    ai_advisory: "Offline detour advisory: corridor geometry served from the surveyed National Highway dataset. Verify ground conditions with the local BRO post before convoy release.",
    recommended_action: "Apply the AI bypass detour and notify the regional control room.",
    voice_announcement: buildVoiceAnnouncement(blockageId, alternate),
    live: false,
  };

  return NextResponse.json(response);
}
