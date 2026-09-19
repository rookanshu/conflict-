import { NextRequest, NextResponse } from "next/server";
import { GoogleMapPlace } from "@/lib/googleMapsApi";

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryTypeDisplayName?: { text?: string };
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  internationalPhoneNumber?: string;
  currentOpeningHours?: { openNow?: boolean };
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

/** Live Google Places Text Search. The browser never receives the API key. */
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Google Maps Places is not configured. Add GOOGLE_MAPS_API_KEY to your environment variables." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "fuel station";
  const lat = Number(searchParams.get("lat") || "26.2");
  const lng = Number(searchParams.get("lng") || "92.9");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ success: false, error: "A valid latitude and longitude are required." }, { status: 400 });
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.internationalPhoneNumber,places.currentOpeningHours",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } },
        maxResultCount: 20,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Google Places request failed", response.status, await response.text());
      return NextResponse.json({ success: false, error: "Google Maps Places could not complete this search." }, { status: 502 });
    }
    const payload = (await response.json()) as { places?: GooglePlace[] };
    const places: GoogleMapPlace[] = (payload.places ?? []).flatMap((place, index) => {
      const placeLat = place.location?.latitude;
      const placeLng = place.location?.longitude;
      if (typeof placeLat !== "number" || typeof placeLng !== "number") return [];
      return [{
        position: index + 1,
        title: place.displayName?.text || "Unnamed place",
        rating: place.rating,
        reviews: place.userRatingCount,
        type: place.primaryTypeDisplayName?.text || place.primaryType || "Place",
        address: place.formattedAddress || "Address unavailable",
        openState: place.currentOpeningHours?.openNow === true ? "Open now" : place.currentOpeningHours?.openNow === false ? "Closed now" : "Hours unavailable",
        phone: place.internationalPhoneNumber,
        gpsCoordinates: { latitude: placeLat, longitude: placeLng },
        distanceKm: distanceKm(lat, lng, placeLat, placeLng),
      }];
    });
    return NextResponse.json({ success: true, query, count: places.length, places, source: "Google Maps Places" });
  } catch {
    return NextResponse.json({ success: false, error: "Google Maps Places is temporarily unavailable." }, { status: 502 });
  }
}
