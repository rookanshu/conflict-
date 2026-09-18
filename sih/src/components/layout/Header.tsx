"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { LanguageCode } from "@/data/translations";
import {
  Activity,
  Wifi,
  WifiOff,
  Car,
  Bot,
  Globe,
  User,
  Shield,
  ShieldAlert,
  LogOut,
  LogIn,
  ChevronDown,
  Sparkles,
  Layers,
  FileSpreadsheet,
  MapPin,
  Sun,
  Moon,
  AlertTriangle,
  X,
} from "lucide-react";

export function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { identity, status, isDemoMode, authNotice, clearAuthNotice } = useAuth();
  const {
    currentUser,
    isPrivilegedVerified,
    activeEmergencySession,
    isOffline,
    setIsOffline,
    pendingOfflineCount,
    language,
    setLanguage,
    t,
    setIsAiCopilotOpen,
    setIsDriverHudOpen,
    setIsLoginModalOpen,
    setIsVerificationModalOpen,
    logout,
    setIsLandingPageOpen,
    setIsGoogleMapsOpen,
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const languages: { code: LanguageCode; label: string; script: string }[] = [
    { code: "en", label: "English", script: "English" },
    { code: "hi", label: "Hindi", script: "हिन्दी" },
    { code: "as", label: "Assamese", script: "অসমীয়া" },
    { code: "bn", label: "Bengali", script: "বাংলা" },
    { code: "mn", label: "Manipuri", script: "মণিপুরী" },
  ];

  return (
    <>
      {/* Session notice (expired / policy) — dismissible, non-blocking */}
      {authNotice && (
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-amber-950/90 border-b border-amber-700 text-[11px] text-amber-200 z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{authNotice}</span>
          </div>
          <button
            onClick={clearAuthNotice}
            className="p-1 rounded hover:bg-black/30 shrink-0"
            aria-label="Dismiss session notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-3 sm:px-5 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-md">
      {/* Left: Branding & Status Indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsLandingPageOpen(true)}
          className="flex items-center gap-2 text-left group focus:outline-none"
          title="Open Landing Overview"
        >
          <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:bg-sky-500 transition-colors">
            NER
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-sky-400 transition-colors">
                NER LOGISTICS INTELLIGENCE
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded border border-slate-700">
                SIH
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Regional Operations Command
            </div>
          </div>
        </button>

        {/* System Status */}
        <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-slate-400 font-medium text-[11px]">System Status:</span>
          <span className="text-emerald-400 font-bold text-[11px]">● OPERATIONAL</span>
        </div>

        {/* Emergency Active Banner */}
        {activeEmergencySession && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/90 border border-red-600 text-red-300 text-xs font-bold animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">EMERGENCY OPS ACTIVE</span>
            <span className="sm:hidden">EMERGENCY</span>
          </div>
        )}
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Offline / Online Toggle */}
        <button
          onClick={() => setIsOffline(!isOffline)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
            isOffline
              ? "bg-amber-950/80 border-amber-600 text-amber-300 hover:bg-amber-900/80"
              : "bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800"
          }`}
          title={isOffline ? "Currently working offline. Click to reconnect." : "Working online. Click to simulate offline mode."}
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Offline</span>
              {pendingOfflineCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                  {pendingOfflineCount}
                </span>
              )}
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline text-slate-300">Online</span>
            </>
          )}
        </button>

        {/* Car / In-Cab HUD Mode Toggle */}
        <button
          onClick={() => setIsDriverHudOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          title="Launch Driver HUD / Car Screen Mode"
        >
          <Car className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Car HUD</span>
        </button>

        {/* Google Maps Amenities Search Button */}
        <button
          onClick={() => setIsGoogleMapsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/80 transition-colors shadow-sm cursor-pointer"
          title="Search Google Maps Amenities: Coffee, Fuel & Checkpoints (SerpApi Engine)"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Google Maps Places</span>
        </button>

        {/* AI Copilot Button */}
        <button
          onClick={() => setIsAiCopilotOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-sky-950/80 border border-sky-600/70 text-sky-300 hover:bg-sky-900/80 transition-colors shadow-sm"
          title="Open AI Logistics Intelligence Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="hidden sm:inline">NER Intelligence</span>
        </button>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="uppercase text-[11px] font-bold">{language}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-1 w-36 py-1 bg-slate-900 border border-slate-700 rounded-md shadow-xl z-50 text-xs">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 ${
                    language === lang.code ? "text-sky-400 font-bold bg-slate-800/50" : "text-slate-300"
                  }`}
                >
                  <span>{lang.label}</span>
                  <span className="text-[10px] text-slate-500">{lang.script}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md transition-colors cursor-pointer text-slate-400 hover:text-amber-300 hover:bg-slate-900 border border-slate-800"
          title={isDark ? "Switch to Light Mode" : "Switch to Tactical Dark Mode"}
          aria-label="Toggle visual theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
        </button>

        {/* User Account / Role Menu */}
        <div className="relative">
          <button
            onClick={() => {
              if (!identity) {
                setIsLoginModalOpen(true);
                return;
              }
              setShowUserMenu(!showUserMenu);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
            title={identity ? "Account & session" : "Sign in"}
          >
            {identity?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identity.photoURL}
                alt=""
                className="w-5 h-5 rounded-full object-cover border border-slate-600"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                {identity ? currentUser.name.charAt(0) : <LogIn className="w-3 h-3" />}
              </div>
            )}
            <span className="hidden sm:inline max-w-[100px] truncate text-slate-200 text-[11px]">
              {identity ? currentUser.name.split(" ")[0] : "Sign In"}
            </span>
            {identity && <ChevronDown className="w-3 h-3 text-slate-500" />}
            {status === "restoring" && (
              <span className="hidden md:inline text-[10px] text-slate-500">restoring…</span>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 text-xs">
              <div className="pb-2 border-b border-slate-800">
                <div className="font-bold text-white truncate">
                  {identity ? currentUser.name : "Not signed in"}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {identity ? (identity.email ?? currentUser.organization) : "Public monitor mode"}
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700">
                    {identity ? identity.role : "Guest"}
                  </span>
                  {identity &&
                    (isPrivilegedVerified ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Standard
                      </span>
                    ))}
                  {identity && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        identity.live
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                          : "bg-amber-950/70 text-amber-300 border-amber-800"
                      }`}
                      title={
                        identity.live
                          ? "Authenticated with Firebase"
                          : "Offline demo persona (Firebase not configured)"
                      }
                    >
                      {identity.live ? "LIVE AUTH" : "DEMO"}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-1">
                {identity && !isPrivilegedVerified && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsVerificationModalOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-amber-400 font-semibold flex items-center gap-2"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Verify Privileged Identity</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isDemoMode ? "Switch Demo User" : "Switch Operational Role"}</span>
                </button>

                {identity && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-red-950/50 text-red-400 flex items-center gap-2 mt-1 border-t border-slate-800 pt-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </header>
    </>
  );
}
