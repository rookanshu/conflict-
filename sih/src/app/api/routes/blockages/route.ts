import { NextResponse } from "next/server";
import { BLOCKAGE_FALLBACK } from "@/data/blockages";
import { liveBlockages } from "@/lib/liveData";

/** Active highway blockage register — live backend when configured, offline fallback otherwise. */
export async function GET() {
  const live = await liveBlockages();
  if (live) return NextResponse.json(live);
  return NextResponse.json(BLOCKAGE_FALLBACK);
}
