import { NextResponse } from "next/server";
import { MOCK_NER_PLACES } from "@/lib/googleMapsApi";
import { NextRequest } from "next/server";
import { livePlaces } from "@/lib/liveData";

/**
 * Highway amenity search (fuel, medical, rest stops).
 * Uses live place search APIs when a key is configured; falls back to the
 * curated local dataset for fully offline operation.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const query = (url.searchParams.get("q") || "fuel").toLowerCase().trim();
  const lat = parseFloat(url.searchParams.get("lat") || "26.2");
  const lng = parseFloat(url.searchParams.get("lng") || "92.9");

  const live = await livePlaces(query, lat, lng);
  if (live) {
    return NextResponse.json({
      success: true,
      query,
      count: live.places.length,
      places: live.places,
      source: live.source,
      live: true,
    });
  }

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
