import { NextRequest, NextResponse } from "next/server";
import { buildFallbackVerification } from "@/data/vahan";
import type { VahanVerificationResponse } from "@/types/api";

/** MoRTH VAHAN 4.0 registration verification — curated offline register. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ plate: string }> }) {
  const { plate } = await params;
  const normalized = decodeURIComponent(plate).replace(/\s+/g, "-").toUpperCase();
  if (!normalized) {
    return NextResponse.json({ success: false, error: "Vehicle registration number is required" }, { status: 400 });
  }
  return NextResponse.json(buildFallbackVerification(normalized));
}
