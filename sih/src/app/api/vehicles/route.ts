import { NextResponse } from "next/server";
import { buildOfflineFleet } from "@/data/fleetFallback";
import { liveFleet } from "@/lib/liveData";

/** AIS-140 fleet registry — live telemetry when backend is configured, offline fallback otherwise. */
export async function GET() {
  const live = await liveFleet();
  if (live) return NextResponse.json({ ...live, live: true });
  return NextResponse.json(buildOfflineFleet());
}
