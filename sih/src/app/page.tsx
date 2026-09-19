"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AppProvider, useApp } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { LandingModal } from "@/components/layout/LandingModal";
import { LoginModal } from "@/components/modals/LoginModal";
import { IdentityVerificationModal } from "@/components/modals/IdentityVerificationModal";
import { AiCopilotModal } from "@/components/modals/AiCopilotModal";
import TacticalLoader from "@/components/common/TacticalLoader";

import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

// Code-split all views with next/dynamic for smaller initial bundle
const OverviewView = dynamic(() => import("@/components/views/OverviewView").then(m => ({ default: m.OverviewView })), { loading: () => <TacticalLoader message="Loading Overview..." /> });
const LiveMapView = dynamic(() => import("@/components/views/LiveMapView").then(m => ({ default: m.LiveMapView })), { loading: () => <TacticalLoader message="Loading Map..." />, ssr: false });
const RoutesView = dynamic(() => import("@/components/views/RoutesView").then(m => ({ default: m.RoutesView })), { loading: () => <TacticalLoader message="Loading Routes..." /> });
const VehiclesView = dynamic(() => import("@/components/views/VehiclesView").then(m => ({ default: m.VehiclesView })), { loading: () => <TacticalLoader message="Loading Vehicles..." /> });
const ShipmentsView = dynamic(() => import("@/components/views/ShipmentsView").then(m => ({ default: m.ShipmentsView })), { loading: () => <TacticalLoader message="Loading Shipments..." /> });
const AccessibilityView = dynamic(() => import("@/components/views/AccessibilityView").then(m => ({ default: m.AccessibilityView })), { loading: () => <TacticalLoader message="Loading Accessibility..." /> });
const AlertsView = dynamic(() => import("@/components/views/AlertsView").then(m => ({ default: m.AlertsView })), { loading: () => <TacticalLoader message="Loading Alerts..." /> });
const WeatherView = dynamic(() => import("@/components/views/WeatherView").then(m => ({ default: m.WeatherView })), { loading: () => <TacticalLoader message="Loading Weather..." /> });
const FieldReportsView = dynamic(() => import("@/components/views/FieldReportsView").then(m => ({ default: m.FieldReportsView })), { loading: () => <TacticalLoader message="Loading Field Reports..." /> });
const EmergencyOpsView = dynamic(() => import("@/components/views/EmergencyOpsView").then(m => ({ default: m.EmergencyOpsView })), { loading: () => <TacticalLoader message="Loading Emergency Ops..." /> });
const ProfileView = dynamic(() => import("@/components/views/ProfileView").then(m => ({ default: m.ProfileView })), { loading: () => <TacticalLoader message="Loading Profile..." /> });

function MainContent() {
  const {
    activeTab,
    notification,
    dismissNotification,
  } = useApp();

  // Render view based on active navigation tab
  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView />;
      case "map":
        return <LiveMapView />;
      case "routes":
        return <RoutesView />;
      case "vehicles":
        return <VehiclesView />;
      case "shipments":
        return <ShipmentsView />;
      case "accessibility":
        return <AccessibilityView />;
      case "alerts":
        return <AlertsView />;
      case "weather":
        return <WeatherView />;
      case "field-reports":
        return <FieldReportsView />;
      case "emergency":
        return <EmergencyOpsView />;
      case "profile":
        return <ProfileView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Global Application Header */}
      <Header />

      {/* Main operational workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-14 lg:pb-0">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Persistent Navigation */}
      <MobileNav />

      {/* Modals & Overlays */}
      <LandingModal />
      <LoginModal />
      <IdentityVerificationModal />
      <AiCopilotModal />

      {/* System Toast Notification */}
      {notification && (
        <div className="fixed bottom-16 md:bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-2 duration-200">
          <div
            className={`p-3.5 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${
              notification.type === "success"
                ? "bg-emerald-950/95 border-emerald-600 text-emerald-100"
                : notification.type === "warning"
                ? "bg-amber-950/95 border-amber-600 text-amber-100"
                : notification.type === "error"
                ? "bg-red-950/95 border-red-600 text-red-100"
                : "bg-slate-900/95 border-sky-600 text-slate-100"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : notification.type === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : notification.type === "error" ? (
                <XCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Info className="w-4 h-4 text-sky-400" />
              )}
            </div>

            <div className="flex-1 min-w-0 text-xs">
              <div className="font-bold tracking-tight">{notification.title}</div>
              <div className="text-[11px] opacity-90 mt-0.5 leading-snug">
                {notification.message}
              </div>
            </div>

            <button
              onClick={dismissNotification}
              className="p-1 rounded hover:bg-black/30 opacity-75 hover:opacity-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <MainContent />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
