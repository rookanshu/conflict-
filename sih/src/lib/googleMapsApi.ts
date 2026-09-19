/** A normalized place returned by the server-side Google Places API integration. */
export interface GoogleMapPlace {
  position: number;
  title: string;
  rating?: number;
  reviews?: number;
  type: string;
  address: string;
  openState: string;
  phone?: string;
  gpsCoordinates: { latitude: number; longitude: number };
  distanceKm?: number;
}
