import { NextResponse } from "next/server";
import { MOCK_INCIDENTS } from "@/data/incidents";
import { liveBackendCollection } from "@/lib/liveData";

export async function GET() {
  const live = await liveBackendCollection("/api/incidents");
  const now = new Date().toISOString();
  if (live) return NextResponse.json({ data: live, live: true, source: "Fleet backend (live)", updatedAt: now });
  return NextResponse.json({ data: MOCK_INCIDENTS, live: false, source: "NER-LIFELINE curated dataset", updatedAt: now });
}
