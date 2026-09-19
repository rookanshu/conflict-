import { NextResponse } from "next/server";
import { INITIAL_EMERGENCY_RESOURCES } from "@/data/emergency";
import { liveBackendCollection } from "@/lib/liveData";

export async function GET() {
  const live = await liveBackendCollection("/api/emergency/resources");
  const now = new Date().toISOString();
  if (live) return NextResponse.json({ data: live, live: true, source: "Fleet backend (live)", updatedAt: now });
  return NextResponse.json({ data: INITIAL_EMERGENCY_RESOURCES, live: false, source: "NER-LIFELINE curated dataset", updatedAt: now });
}
