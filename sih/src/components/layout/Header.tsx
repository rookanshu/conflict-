"use client";

import { useState } from "react";
import { ChevronDown, CircleUserRound, LogIn, LogOut, MapPin, Sparkles, Wifi, WifiOff } from "lucide-react";
import { useApp } from "@/context/AppContext";

const navigation = [
  ["overview", "Overview"], ["map", "Live map"], ["routes", "Routes"], ["vehicles", "Vehicles"],
  ["shipments", "Shipments"], ["accessibility", "Access"], ["weather", "Weather"], ["alerts", "Alerts"],
  ["field-reports", "Live report"],
] as const;

export function Header() {
  const { activeTab, setActiveTab, currentUser, isLoggedIn, isOffline, setIsLoginModalOpen, setIsAiCopilotOpen, setIsGoogleMapsOpen, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="app-header sticky top-0 z-30 border-b border-slate-700 bg-[#172033] text-white">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-6 px-5 lg:px-8">
        <button onClick={() => setActiveTab("overview")} className="ner-brand flex shrink-0 items-center gap-3 text-left" aria-label="Go to overview">
          <span className="ner-brand-mark"><span>NER</span><i /><i /><i /></span>
          <span className="hidden sm:block"><span className="block text-sm font-bold tracking-tight">NER Logistics</span><span className="block text-[11px] text-slate-400">North East regional operations</span></span>
        </button>

        <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {navigation.map(([id, label]) => <button key={id} onClick={() => setActiveTab(id)} className={`rounded-md px-3 py-2 text-[12px] font-semibold transition-colors ${activeTab === id ? id === "field-reports" ? "bg-amber-500 text-slate-950" : "bg-white text-[#172033]" : id === "field-reports" ? "text-amber-300 hover:bg-amber-400/10" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>{label}</button>)}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span aria-label={isOffline ? "Network unavailable" : "Network available"} title={isOffline ? "Network unavailable" : "Network available"} className={`grid h-9 w-9 place-items-center rounded-md border ${isOffline ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"}`}>{isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}</span>
          <div className="relative">
            <button onClick={() => isLoggedIn ? setMenuOpen(!menuOpen) : setIsLoginModalOpen(true)} className="flex items-center gap-2 rounded-md border border-slate-600 px-2.5 py-2 text-xs font-semibold hover:bg-white/10">
              {isLoggedIn ? <><span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-900">{currentUser.name.charAt(0)}</span><span className="hidden xl:inline">{currentUser.name.split(" ")[0]}</span><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></> : <><LogIn className="h-3.5 w-3.5" /> Login</>}
            </button>
            {menuOpen && isLoggedIn && <div className="absolute right-0 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-2 text-slate-800 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2"><p className="font-semibold">{currentUser.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{currentUser.organization}</p></div>
              <button onClick={() => { setActiveTab("profile"); setMenuOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-slate-50"><CircleUserRound className="h-3.5 w-3.5" /> Profile</button>
              <button onClick={() => { setIsGoogleMapsOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-slate-50"><MapPin className="h-3.5 w-3.5" /> Nearby services</button>
              <button onClick={() => { setIsAiCopilotOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-slate-50"><Sparkles className="h-3.5 w-3.5" /> Ask for help</button>
              <button onClick={() => { logout(); setMenuOpen(false); setIsLoginModalOpen(true); }} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}
