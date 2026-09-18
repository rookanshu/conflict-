"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import {
  User,
  UserRole,
  Road,
  Vehicle,
  Shipment,
  Incident,
  FieldReport,
  EmergencyResource,
  EmergencyBroadcast,
  AuditLogEntry,
} from "@/types";
import { useAuth, type AuthIdentity } from "@/context/AuthContext";
import { MOCK_ROADS } from "@/data/roads";
import { MOCK_VEHICLES } from "@/data/vehicles";
import { MOCK_SHIPMENTS } from "@/data/shipments";
import { MOCK_INCIDENTS } from "@/data/incidents";
import { INITIAL_EMERGENCY_RESOURCES, INITIAL_AUDIT_LOGS, INITIAL_BROADCASTS } from "@/data/emergency";
import { TRANSLATIONS, LanguageCode, TranslationStrings } from "@/data/translations";

export const DEMO_USERS: Record<UserRole, User> = {
  "Regular User": {
    id: "usr-01",
    name: "Vikram Bora",
    role: "Regular User",
    organization: "Assam State Warehousing & Logistics Corp",
    email: "vikram.bora@aswc.gov.in",
    isPrivilegedVerified: false,
  },
  "Field Officer": {
    id: "usr-02",
    name: "Major Anupam Sharma",
    role: "Field Officer",
    organization: "Border Roads Organisation (Project Vartak)",
    email: "anupam.sharma@bro.gov.in",
    isPrivilegedVerified: false,
  },
  "Administrator": {
    id: "usr-03",
    name: "Dr. Lalthanzuala Sailo",
    role: "Administrator",
    organization: "North Eastern Regional Transport Council",
    email: "l.sailo@nertc.gov.in",
    isPrivilegedVerified: false,
  },
  "Emergency Commander": {
    id: "usr-04",
    name: "Rajeshwar Baruah, IPS",
    role: "Emergency Commander",
    organization: "National Disaster Response Force (NDRF 1st Bn / ASDMA)",
    email: "r.baruah@ndrf.gov.in",
    isPrivilegedVerified: true,
  },
};

/**
 * Fallback persona for an anonymous visitor. sih previously booted with a
 * hardcoded "logged in" demo user; the merged app keeps every component's
 * `currentUser` contract intact but reports an explicit guest identity until a
 * session actually exists.
 */
const GUEST_USER: User = {
  id: "guest",
  name: "Guest Operator",
  organization: "Unauthenticated Session",
  role: "Regular User",
  email: "—",
  isPrivilegedVerified: false,
};

/** Maps an auth identity onto sih's `User` domain object (single source of truth). */
function identityToUser(identity: AuthIdentity): User {
  const persona = DEMO_USERS[identity.role] ?? DEMO_USERS["Regular User"];
  if (!identity.live) {
    // Offline demo mode: keep sih's original personas verbatim.
    return { ...persona, role: identity.role };
  }
  return {
    id: identity.uid,
    name: identity.displayName,
    // Firebase carries no organisation claim; the role persona supplies the
    // realistic departmental label used across the workspace UI.
    organization: persona.organization,
    role: identity.role,
    email: identity.email ?? persona.email,
    avatarUrl: identity.photoURL ?? undefined,
    isPrivilegedVerified: identity.role === "Emergency Commander",
  };
}

interface NotificationState {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "error";
}

interface MapFocusTarget {
  lat: number;
  lng: number;
  zoom: number;
  label?: string;
}

interface AppContextType {
  // Auth & Session
  currentUser: User;
  isLoggedIn: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  isPrivilegedVerified: boolean;
  activeEmergencySession: boolean;
  activatePrivilegedSession: () => void;
  endEmergencySession: () => void;

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLandingPageOpen: boolean;
  setIsLandingPageOpen: (open: boolean) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isVerificationModalOpen: boolean;
  setIsVerificationModalOpen: (open: boolean) => void;
  isAiCopilotOpen: boolean;
  setIsAiCopilotOpen: (open: boolean) => void;
  isGoogleMapsOpen: boolean;
  setIsGoogleMapsOpen: (open: boolean) => void;

  // Language
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationStrings;

  // Map & Entity Selection
  mapFocus: MapFocusTarget | null;
  focusOnLocation: (lat: number, lng: number, zoom?: number, label?: string) => void;
  selectedRoad: Road | null;
  setSelectedRoad: (road: Road | null) => void;
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  selectedShipment: Shipment | null;
  setSelectedShipment: (shipment: Shipment | null) => void;
  selectedIncident: Incident | null;
  setSelectedIncident: (incident: Incident | null) => void;

  // Live Data & Operations
  roads: Road[];
  vehicles: Vehicle[];
  shipments: Shipment[];
  incidents: Incident[];
  emergencyResources: EmergencyResource[];
  deployResource: (resourceId: string, routeOrIncident: string) => void;
  emergencyBroadcasts: EmergencyBroadcast[];
  sendBroadcast: (target: string, message: string, priority: "CRITICAL" | "HIGH" | "NORMAL", channels: string[]) => void;
  auditLogs: AuditLogEntry[];

  // Offline Simulation & Field Reports
  isOffline: boolean;
  fieldReports: FieldReport[];
  pendingOfflineCount: number;
  submitFieldReport: (report: Omit<FieldReport, "id" | "timestamp" | "synced">) => { id: string; offline: boolean };
  syncOfflineReports: () => void;

  // System Notifications
  notification: NotificationState | null;
  showNotification: (title: string, message: string, type?: "success" | "warning" | "info" | "error") => void;
  dismissNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Authentication is owned by AuthContext (Firebase) ──────────────────────
  // AppContext stays the operational store it always was; it only *derives* the
  // identity, so every existing `useApp()` consumer keeps working unchanged.
  const { identity, isDemoMode, signInDemo, changeRole, signOutUser } = useAuth();

  const currentUser: User = useMemo(
    () => (identity ? identityToUser(identity) : GUEST_USER),
    [identity]
  );
  const isLoggedIn = Boolean(identity);
  const [isPrivilegedVerified, setIsPrivilegedVerified] = useState<boolean>(false);
  const [activeEmergencySession, setActiveEmergencySession] = useState<boolean>(false);

  // Privileged flags follow the (restored or freshly signed-in) identity, so a
  // page reload keeps an Emergency Commander's session state consistent.
  useEffect(() => {
    if (!identity) {
      setIsPrivilegedVerified(false);
      setActiveEmergencySession(false);
      return;
    }
    setIsPrivilegedVerified(identity.role === "Emergency Commander");
  }, [identity]);

  // Navigation
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLandingPageOpen, setIsLandingPageOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState<boolean>(false);
  const [isGoogleMapsOpen, setIsGoogleMapsOpen] = useState<boolean>(false);

  // Language
  const [language, setLanguage] = useState<LanguageCode>("en");
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Map & Entity Selection
  const [mapFocus, setMapFocus] = useState<MapFocusTarget | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Operational State
  const [roads] = useState<Road[]>(MOCK_ROADS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [shipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [emergencyResources, setEmergencyResources] = useState<EmergencyResource[]>(INITIAL_EMERGENCY_RESOURCES);
  const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<EmergencyBroadcast[]>(INITIAL_BROADCASTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Offline Mode & Field Reports
  // Keep the initial SSR/client render identical; the effect below resolves real connectivity.
  const [isOffline, setIsOfflineState] = useState<boolean>(false);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>(() => {
    const defaultReports: FieldReport[] = [
      {
        id: "INC-20481",
        incidentType: "Landslide",
        location: "West Siang Km 48 Sector (Near Pangin)",
        coordinates: [28.18, 94.95],
        description: "Major mudslide debris covering both lanes. Boulders blocking all transit.",
        severity: "Critical",
        timestamp: "08:15 AM today",
        synced: true,
      },
      {
        id: "INC-20478",
        incidentType: "Bridge Failure",
        location: "Teesta Stage 3 Sub-bridge Access",
        coordinates: [27.59, 88.61],
        description: "Water scouring right abutment. Heavy multi-axle freight barred.",
        severity: "High",
        timestamp: "Yesterday 16:30",
        synced: true,
      },
    ];

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ner_field_reports");
        if (stored) {
          const parsed: FieldReport[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // LocalStorage fallback
      }
    }
    return defaultReports;
  });

  // Notifications
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Sync field reports to localStorage
  const persistReports = (reports: FieldReport[]) => {
    try {
      localStorage.setItem("ner_field_reports", JSON.stringify(reports));
    } catch {
      // Fallback
    }
  };

  // Simulated GPS Movement for Vehicles (Tick every 6 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.status !== "moving" || !v.routeCoordinates || v.routeCoordinates.length < 2) {
            return v;
          }
          // Tiny jitter to simulate live GPS tracking
          const deltaLat = (Math.random() - 0.48) * 0.003;
          const deltaLng = (Math.random() - 0.48) * 0.003;
          return {
            ...v,
            coordinates: [v.coordinates[0] + deltaLat, v.coordinates[1] + deltaLng] as [number, number],
            lastGpsUpdate: "Just now",
          };
        })
      );
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const showNotification = (
    title: string,
    message: string,
    type: "success" | "warning" | "info" | "error" = "info"
  ) => {
    const id = Math.random().toString(36).substring(7);
    setNotification({ id, title, message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  /**
   * Role selection / persona login, kept as the single entry point used by the
   * Login modal, the Analytics upgrade prompt and the Profile view.
   *  • Offline demo mode  → signs in as the selected static persona.
   *  • Live Firebase mode → switches the operational role for the session
   *    (rejected when a directory custom claim pins the role).
   */
  const login = (role: UserRole) => {
    const result = isDemoMode ? signInDemo(role) : changeRole(role);

    if (!result.success) {
      showNotification(
        isDemoMode ? "Authentication Failed" : "Role Change Blocked",
        result.error ?? "The requested session could not be established.",
        isDemoMode ? "error" : "warning"
      );
      return;
    }

    const user = DEMO_USERS[role];
    setActiveEmergencySession(user.isPrivilegedVerified && role === "Emergency Commander");
    showNotification(
      "Authenticated",
      isDemoMode
        ? `Logged in as ${user.name} (${role}) — ${user.organization}`
        : `Session role set to ${role}${identity?.email ? ` — ${identity.email}` : ""}`,
      "success"
    );
  };

  const logout = () => {
    void signOutUser();
    showNotification("Signed Out", "Platform session closed.", "info");
  };

  const activatePrivilegedSession = () => {
    setIsPrivilegedVerified(true);
    setActiveEmergencySession(true);
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      officer: currentUser.name,
      action: "Privileged Identity Verification & Emergency Mode Activated",
      result: "Success",
      details: "Simulated Multi-Factor OTP & Facial Biometric Match (99.4% confidence)",
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    showNotification(
      "Privileged Session Active",
      "Biometric & OTP credentials verified. Emergency operations unlocked.",
      "success"
    );
  };

  const endEmergencySession = () => {
    setActiveEmergencySession(false);
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      officer: currentUser.name,
      action: "Emergency Session Terminated",
      result: "Success",
      details: "Command center returned to baseline monitoring status",
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    showNotification("Emergency Session Terminated", "Returned to baseline monitoring mode.", "info");
    setActiveTab("overview");
  };

  const focusOnLocation = (lat: number, lng: number, zoom = 9, label?: string) => {
    setMapFocus({ lat, lng, zoom, label });
  };

  const deployResource = (resourceId: string, routeOrIncident: string) => {
    setEmergencyResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              status: "Deployed",
              assignedRoute: routeOrIncident,
            }
          : r
      )
    );

    const resource = emergencyResources.find((r) => r.id === resourceId);
    const newAudit: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      officer: currentUser.name,
      action: `Resource Deployed: ${resource?.unitName || resourceId}`,
      result: "Success",
      details: `Assigned to target sector: ${routeOrIncident}`,
    };
    setAuditLogs((prev) => [newAudit, ...prev]);

    showNotification(
      "Resource Deployed",
      `${resource?.unitName || "Unit"} successfully deployed to ${routeOrIncident}.`,
      "success"
    );
  };

  const sendBroadcast = (
    target: string,
    message: string,
    priority: "CRITICAL" | "HIGH" | "NORMAL",
    channels: string[]
  ) => {
    const newBroadcast: EmergencyBroadcast = {
      id: `BC-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      targetGroup: target,
      message,
      priority,
      channels,
      recipientsCount: 1842,
      deliveredCount: 1796,
      sentBy: currentUser.name,
    };

    setEmergencyBroadcasts((prev) => [newBroadcast, ...prev]);

    const newAudit: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: newBroadcast.timestamp,
      officer: currentUser.name,
      action: `Emergency Broadcast Sent [${priority}]`,
      result: "Success",
      details: `Dispatched to ${target} across ${channels.join(", ")} (1,796/1,842 delivered)`,
    };
    setAuditLogs((prev) => [newAudit, ...prev]);

    showNotification(
      "Broadcast Dispatched",
      `Delivered to 1,796 of 1,842 recipients in ${target}.`,
      "success"
    );
  };

  const submitFieldReport = (reportData: Omit<FieldReport, "id" | "timestamp" | "synced">) => {
    const id = `INC-${Math.floor(10000 + Math.random() * 90000)}`;
    const newReport: FieldReport = {
      ...reportData,
      id,
      timestamp: "Just now",
      synced: !isOffline,
    };

    const updated = [newReport, ...fieldReports];
    setFieldReports(updated);
    persistReports(updated);

    if (isOffline) {
      showNotification(
        "Report Saved Locally",
        `Incident ${id} queued for sync. Connect to network to transmit.`,
        "warning"
      );
      return { id, offline: true };
    } else {
      // Also add to active incidents
      const newIncident: Incident = {
        id,
        type: reportData.incidentType,
        title: `${reportData.incidentType} reported at ${reportData.location}`,
        location: reportData.location,
        district: reportData.location.split(",")[0] || "NER Sector",
        state: "Assam / NER",
        coordinates: reportData.coordinates || [26.2, 92.9],
        severity: reportData.severity,
        cause: reportData.description,
        affectedRoutes: ["Primary Arterial Route"],
        estimatedDelayHours: reportData.severity === "Critical" ? 4.5 : 2,
        timeDetected: "Just now",
        aiProbability: 80,
        aiPredictionText: "Field verification corroborated by ground observer telemetry.",
        resolved: false,
        reportedBy: currentUser.name,
      };
      setIncidents((prev) => [newIncident, ...prev]);

      showNotification(
        "Incident Report Submitted",
        `Report ${id} successfully logged and transmitted to Regional Command.`,
        "success"
      );
      return { id, offline: false };
    }
  };

  const syncOfflineReports = () => {
    const unsynced = fieldReports.filter((r) => !r.synced);
    if (unsynced.length === 0) return;

    const updated = fieldReports.map((r) => ({ ...r, synced: true }));
    setFieldReports(updated);
    persistReports(updated);

    showNotification(
      "Synchronized",
      `✓ ${unsynced.length} offline report(s) successfully synchronized with Command Center.`,
      "success"
    );
  };

  // Connectivity is derived from browser events and an API probe, never a manual mode.
  useEffect(() => {
    let disposed = false;
    const checkReachability = async () => {
      if (!navigator.onLine) {
        if (!disposed) setIsOfflineState(true);
        return;
      }
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!disposed) setIsOfflineState(!response.ok);
      } catch {
        if (!disposed) setIsOfflineState(true);
      }
    };
    const online = () => { void checkReachability(); };
    const offline = () => setIsOfflineState(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    void checkReachability();
    const timer = window.setInterval(() => void checkReachability(), 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    if (!isOffline) syncOfflineReports();
  }, [isOffline, fieldReports]);

  const pendingOfflineCount = fieldReports.filter((r) => !r.synced).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        login,
        logout,
        isPrivilegedVerified,
        activeEmergencySession,
        activatePrivilegedSession,
        endEmergencySession,
        activeTab,
        setActiveTab,
        isLandingPageOpen,
        setIsLandingPageOpen,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isVerificationModalOpen,
        setIsVerificationModalOpen,
        isAiCopilotOpen,
        setIsAiCopilotOpen,
        isGoogleMapsOpen,
        setIsGoogleMapsOpen,
        language,
        setLanguage,
        t,
        mapFocus,
        focusOnLocation,
        selectedRoad,
        setSelectedRoad,
        selectedVehicle,
        setSelectedVehicle,
        selectedShipment,
        setSelectedShipment,
        selectedIncident,
        setSelectedIncident,
        roads,
        vehicles,
        shipments,
        incidents,
        emergencyResources,
        deployResource,
        emergencyBroadcasts,
        sendBroadcast,
        auditLogs,
        isOffline,
        fieldReports,
        pendingOfflineCount,
        submitFieldReport,
        syncOfflineReports,
        notification,
        showNotification,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
