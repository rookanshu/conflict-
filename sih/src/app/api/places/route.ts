import { NextResponse } from "next/server";
import { MOCK_NER_PLACES } from "@/lib/googleMapsApi";
import { NextRequest } from "next/server";

/**
 * Highway amenity search (fuel, medical, rest stops).
 * Served from the curated local dataset only.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const query = (url.searchParams.get("q") || "fuel").toLowerCase().trim();

  if (query.includes("coffee") || query.includes("cafe") || query.includes("food")) {
    return NextResponse.json({ success: true, query, count: MOCK_NER_PLACES.coffee.length, places: MOCK_NER_PLACES.coffee });
  }
  if (query.includes("fuel") || query.includes("diesel") || query.includes("gas") || query.includes("petrol")) {
    return NextResponse.json({ success: true, query, count: MOCK_NER_PLACES.fuel.length, places: MOCK_NER_PLACES.fuel });
  }
  if (query.includes("hospital") || query.includes("medical") || query.includes("clinic") || query.includes("doctor")) {
    return NextResponse.json({ success: true, query, count: MOCK_NER_PLACES.hospital.length, places: MOCK_NER_PLACES.hospital });
  }

  return NextResponse.json({
    success: true,
    query,
    count: MOCK_NER_PLACES.coffee.length + MOCK_NER_PLACES.fuel.length + MOCK_NER_PLACES.hospital.length,
    places: [...MOCK_NER_PLACES.coffee, ...MOCK_NER_PLACES.fuel, ...MOCK_NER_PLACES.hospital],
  });
}
