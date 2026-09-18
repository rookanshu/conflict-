import { NextResponse } from "next/server";
import { buildOfflineFleet } from "@/data/fleetFallback";

/** AIS-140 fleet registry served from the curated local convoy dataset. */
export async function GET() {
  return NextResponse.json(buildOfflineFleet());
}
