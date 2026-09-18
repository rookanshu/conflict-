import { NextResponse } from "next/server";
import { BLOCKAGE_FALLBACK } from "@/data/blockages";

/** Active highway blockage register — curated local dataset. */
export async function GET() {
  return NextResponse.json(BLOCKAGE_FALLBACK);
}
