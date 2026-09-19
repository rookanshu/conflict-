import { NextResponse } from "next/server";
import { MOCK_VEHICLES } from "@/data/vehicles";
import { liveDomainFleet } from "@/lib/liveData";

/**
 * AIS-140 fleet telemetry in the UI's `Vehicle` domain shape.
 * Live backend positions when FLEET_BACKEND_URL is configured; the curated
 * convoy registry otherwise.
 */
export async function GET() {
  const now = new Date().toISOString();
  const live = await liveDomainFleet();
  if (live) return NextResponse.json({ data: live, live: true, source: "Fleet backend AIS-140 telemetry (live)", updatedAt: now });
  return NextResponse.json({ data: MOCK_VEHICLES, live: false, source: "NER-LIFELINE curated convoy registry", updatedAt: now });
}
