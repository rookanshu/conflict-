export type RoadStatus = 'accessible' | 'partial' | 'high_risk' | 'blocked' | 'emergency';
export type BridgeCondition = 'stable' | 'inspection_required' | 'damaged' | 'critical';
export type VehicleStatus = 'moving' | 'delayed' | 'stopped' | 'rerouted';
export type ShipmentStatus = 'dispatched' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delayed';
export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentType = 'Landslide' | 'Flood' | 'Heavy Rain' | 'Road Damage' | 'Bridge Failure' | 'Traffic' | 'Weather';
export type UserRole = 'Regular User' | 'Field Officer' | 'Administrator' | 'Emergency Commander';

export interface StateInfo {
  id: string;
  name: string;
  capital: string;
  coordinates: [number, number]; // [lat, lng]
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  activeDisruptions: number;
  openRoadsPercentage: number;
}

export interface Road {
  id: string;
  code: string; // e.g. 'NH-15', 'NH-27'
  name: string;
  state: string;
  startPoint: string;
  endPoint: string;
  coordinates: [number, number][];
  status: RoadStatus;
  condition: string;
  riskScore: number; // 0-100%
  weather: string;
  estimatedDelayMinutes: number;
  aiRecommendation: string;
  alternateRouteCode?: string;
  alternateRouteName?: string;
  lengthKm: number;
  lastUpdated: string;
}

export interface Bridge {
  id: string;
  name: string;
  river: string;
  roadCode: string;
  state: string;
  coordinates: [number, number];
  condition: BridgeCondition;
  waterLevelMeters: number;
  dangerLevelMeters: number;
  loadCapacityTons: number;
  lastInspection: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  cargo: string;
  cargoType: 'Medical' | 'Food' | 'Fuel' | 'Relief' | 'General';
  origin: string;
  destination: string;
  status: VehicleStatus;
  speedKmH: number;
  distanceRemainingKm: number;
  eta: string;
  roadCondition: string;
  riskScore: number;
  lastGpsUpdate: string;
  coordinates: [number, number];
  routeCoordinates: [number, number][];
  currentWaypointIndex: number;
  driverName: string;
  driverPhone: string;
}

export interface ShipmentStop {
  name: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
  locationState?: string;
}

export interface Shipment {
  id: string; // e.g. 'NER-MED-20491'
  title: string;
  commodity: string;
  priority: 'Normal' | 'High' | 'Critical';
  origin: string;
  destination: string;
  currentLocationName: string;
  status: ShipmentStatus;
  eta: string;
  stops: ShipmentStop[];
  temperatureControlled: boolean;
  currentTempCelsius?: number;
  vehicleId?: string;
  weightKg: number;
  senderOrg: string;
  receiverOrg: string;
}

export interface Incident {
  id: string; // e.g. 'INC-20481'
  type: IncidentType;
  title: string;
  location: string;
  district: string;
  state: string;
  coordinates: [number, number];
  severity: IncidentSeverity;
  cause: string;
  affectedRoutes: string[];
  estimatedDelayHours: number;
  timeDetected: string;
  aiProbability: number;
  aiPredictionText: string;
  photoUrl?: string;
  resolved: boolean;
  reportedBy: string;
}

export interface WeatherData {
  id: string;
  state: string;
  location: string;
  coordinates: [number, number];
  rainfall24hMm: number;
  temperatureCelsius: number;
  windSpeedKmh: number;
  condition: string;
  severeAlert: boolean;
  /** Optional legacy enrichment retained for existing non-UI data services. */
  riskChain?: {
    rainfall: string;
    landslideRisk: string;
    roadAccessibility: string;
    deliveryDelay: string;
  };
}

export interface EmergencyResource {
  id: string;
  type: 'Ambulance' | 'Rescue Team' | 'Medical Boat' | 'Heavy Earthmover' | 'Relief Food Truck' | 'Helicopter Air-Drop';
  unitName: string;
  location: string;
  state: string;
  status: 'Available' | 'Deployed' | 'Standby';
  coordinates: [number, number];
  assignedRoute?: string;
  assignedIncidentId?: string;
  capacityOrPersonnel: string;
}

export interface EmergencyBroadcast {
  id: string;
  timestamp: string;
  targetGroup: string;
  message: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  channels: string[];
  recipientsCount: number;
  deliveredCount: number;
  sentBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  officer: string;
  action: string;
  result: 'Success' | 'Failed' | 'Pending';
  details?: string;
}

export interface FieldReport {
  id: string;
  incidentType: IncidentType;
  location: string;
  coordinates?: [number, number];
  photoUrl?: string;
  photoName?: string;
  description: string;
  severity: IncidentSeverity;
  timestamp: string;
  synced: boolean;
}

export interface User {
  id: string;
  name: string;
  organization: string;
  role: UserRole;
  email: string;
  avatarUrl?: string;
  isPrivilegedVerified: boolean;
}

export interface RouteOption {
  id: string;
  name: string;
  isRecommended: boolean;
  distanceKm: number;
  eta: string;
  riskScore: number;
  accessibilityPercentage: number;
  expectedDelay: string;
  reasoning: string;
  waypoints: string[];
  coordinates: [number, number][];
}
