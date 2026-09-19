import { NextResponse } from "next/server";
import { MOCK_BRIDGES } from "@/data/bridges";
import { liveBackendCollection } from "@/lib/liveData";

export async function GET() {
  const live = await liveBackendCollection("/api/bridges");
  const now = new Date().toISOString();
  if (live) return NextResponse.json({ data: live, live: true, source: "Fleet backend (live)", updatedAt: now });
  return NextResponse.json({ data: MOCK_BRIDGES, live: false, source: "NER-LIFELINE curated dataset", updatedAt: now });
}
