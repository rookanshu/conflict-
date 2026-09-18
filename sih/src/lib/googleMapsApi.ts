// Google Maps places for NER Logistics Intelligence (local dataset only)
// No live API calls — SerpApi/Google key usage removed for standalone mode.

export interface GoogleMapPlace {
  position: number;
  title: string;
  rating?: number;
  reviews?: number;
  type: string;
  address: string;
  openState: string;
  phone?: string;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
  };
  distanceKm?: number;
  thumbnail?: string;
}

export const MOCK_NER_PLACES: Record<string, GoogleMapPlace[]> = {
  coffee: [
    { position: 1, title: "Mountain Highway Cafe & Rest Stop", rating: 4.6, reviews: 248, type: "Coffee Shop & Highway Diner", address: "NH-13, Near Pangin Junction, West Siang, Arunachal Pradesh", openState: "Open 24 hours", phone: "+91 94360-88120", gpsCoordinates: { latitude: 28.185, longitude: 94.96 }, distanceKm: 2.4 },
    { position: 2, title: "Brahmaputra View Tea & Coffee Lounge", rating: 4.8, reviews: 512, type: "Cafe & Refreshment Station", address: "NH-15 Kolia Bhomora Approach, Tezpur, Assam", openState: "Open until 11:00 PM", phone: "+91 94350-44192", gpsCoordinates: { latitude: 26.634, longitude: 92.795 }, distanceKm: 1.8 },
    { position: 3, title: "Sela Pass High-Altitude Coffee & Warm Meals", rating: 4.7, reviews: 389, type: "Military & Civilian Rest Post", address: "Sela Tunnel North Portal, West Kameng, Arunachal Pradesh", openState: "Open 24 hours", phone: "+91 94362-77103", gpsCoordinates: { latitude: 27.502, longitude: 92.095 }, distanceKm: 4.1 },
    { position: 4, title: "Kaziranga Green Corridor Coffee Hut", rating: 4.5, reviews: 320, type: "Eco Cafe & Express Takeaway", address: "NH-27 Corridor, Bokakhat, Assam", openState: "Open 24 hours", phone: "+91 98540-23910", gpsCoordinates: { latitude: 26.58, longitude: 93.59 }, distanceKm: 6.5 },
  ],
  fuel: [
    { position: 1, title: "Indian Oil (IOCL) 24x7 High-Altitude Station", rating: 4.4, reviews: 180, type: "Gas & Diesel Station", address: "Dirang Highway Bypass, West Kameng, Arunachal Pradesh", openState: "Open 24 hours • High-Flow Diesel Pump", phone: "+91 94351-99812", gpsCoordinates: { latitude: 27.355, longitude: 92.242 }, distanceKm: 1.2 },
    { position: 2, title: "Bharat Petroleum All-Weather Convoy Depot", rating: 4.5, reviews: 290, type: "Fleet Refueling & DEF Station", address: "NH-15, Biswanath Chariali Bypass, Assam", openState: "Open 24 hours", phone: "+91 94350-11234", gpsCoordinates: { latitude: 26.742, longitude: 93.155 }, distanceKm: 3.5 },
  ],
  hospital: [
    { position: 1, title: "District Civil Hospital & Emergency Trauma Care", rating: 4.7, reviews: 430, type: "Government Hospital", address: "Hospital Road, Tawang, Arunachal Pradesh", openState: "24-Hour Emergency & ICU", phone: "+91 3794-222214", gpsCoordinates: { latitude: 27.587, longitude: 91.861 }, distanceKm: 0.8 },
    { position: 2, title: "Tezpur Base Medical Outpost & Blood Bank", rating: 4.6, reviews: 620, type: "Military & General Hospital", address: "Mission Chariali, Tezpur, Assam", openState: "Open 24 hours", phone: "+91 3712-230554", gpsCoordinates: { latitude: 26.652, longitude: 92.812 }, distanceKm: 2.1 },
  ],
};

export function searchGoogleMapsPlaces(query: string, lat = 26.2, lng = 92.9): GoogleMapPlace[] {
  const q = query.toLowerCase().trim();
  if (q.includes("coffee") || q.includes("cafe") || q.includes("food")) return MOCK_NER_PLACES.coffee;
  if (q.includes("fuel") || q.includes("diesel") || q.includes("gas") || q.includes("petrol")) return MOCK_NER_PLACES.fuel;
  if (q.includes("hospital") || q.includes("medical") || q.includes("clinic") || q.includes("doctor")) return MOCK_NER_PLACES.hospital;
  return [...MOCK_NER_PLACES.coffee, ...MOCK_NER_PLACES.fuel, ...MOCK_NER_PLACES.hospital];
}
