import { NextRequest, NextResponse } from "next/server";
import { buildFallbackVerification } from "@/data/vahan";
import { liveVahan } from "@/lib/liveData";

/** MoRTH VAHAN 4.0 registration verification — live API when configured, offline fallback otherwise. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ plate: string }> }) {
  const { plate } = await params;
  const normalized = decodeURIComponent(plate).replace(/\s+/g, "-").toUpperCase();
  if (!normalized) {
    return NextResponse.json({ success: false, error: "Vehicle registration number is required" }, { status: 400 });
  }
  const live = await liveVahan(normalized);
  if (live) return NextResponse.json({ ...live, live: true });
  return NextResponse.json(buildFallbackVerification(normalized));
}
