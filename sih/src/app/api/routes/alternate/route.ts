import { NextRequest, NextResponse } from "next/server";
import { getFallbackAlternate, buildVoiceAnnouncement } from "@/data/blockages";
import type { AlternateRouteResponse } from "@/types/api";

/** AI alternate detour — curated local dataset. */
export async function POST(req: NextRequest) {
  let body: { blocked_road_id?: string } = {};
  try { body = await req.json(); } catch { body = {}; }

  const blockageId = body.blocked_road_id ?? "blk-1";
  const alternate = getFallbackAlternate(blockageId);

  const response: AlternateRouteResponse = {
    blocked: true,
    blockage_details: null,
    primary_route_status: "BLOCKED / IMPASSABLE",
    ai_alternate_route: alternate,
    ai_advisory: "Offline detour advisory: corridor geometry served from the surveyed National Highway dataset. Verify ground conditions with the local BRO post before convoy release.",
    recommended_action: "Apply the AI bypass detour and notify the regional control room.",
    voice_announcement: buildVoiceAnnouncement(blockageId, alternate),
  };

  return NextResponse.json(response);
}
