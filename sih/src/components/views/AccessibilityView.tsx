"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Road, Bridge } from "@/types";
import { MOCK_BRIDGES } from "@/data/bridges";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  MapPin,
  ExternalLink,
} from "lucide-react";

export function AccessibilityView() {
  const { roads, focusOnLocation, setSelectedRoad, setActiveTab } = useApp();

  const [activeTabSub, setActiveTabSub] = useState<"roads" | "bridges">("roads");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoads = roads.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.startPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.endPoint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === "all" || r.state.toLowerCase().includes(selectedState.toLowerCase());
    return matchesSearch && matchesState;
  });

  const filteredBridges = MOCK_BRIDGES.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.river.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roadCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === "all" || b.state.toLowerCase().includes(selectedState.toLowerCase());
    return matchesSearch && matchesState;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-3 sm:p-5 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
              INFRASTRUCTURE ACCESSIBILITY & STRUCTURAL INTEGRITY
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous Structural Monitoring for North Eastern Arterial Corridors & River Crossings
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTabSub("roads")}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTabSub === "roads"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Road Corridors ({roads.length})
          </button>
          <button
            onClick={() => setActiveTabSub("bridges")}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTabSub === "bridges"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Bridges & Crossings ({MOCK_BRIDGES.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={
              activeTabSub === "roads"
                ? "Search Highway Code (e.g. NH-15, NH-13)..."
                : "Search Bridge Name, River or Code..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-400 text-[11px] font-semibold uppercase">Filter State:</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="all">All 8 NE States</option>
            <option value="assam">Assam</option>
            <option value="arunachal">Arunachal Pradesh</option>
            <option value="meghalaya">Meghalaya</option>
            <option value="manipur">Manipur</option>
            <option value="mizoram">Mizoram</option>
            <option value="nagaland">Nagaland</option>
            <option value="tripura">Tripura</option>
            <option value="sikkim">Sikkim</option>
          </select>
        </div>
      </div>

      {/* Content: Roads Tab */}
      {activeTabSub === "roads" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRoads.map((road) => (
              <div
                key={road.id}
                className="p-4 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-sky-400">{road.code}</span>
                      <StatusBadge status={road.status} size="sm" />
                    </div>
                    <h3 className="font-bold text-xs text-white mt-1">{road.name}</h3>
                    <div className="text-[11px] text-slate-400">
                      Sector: {road.startPoint} ↔ {road.endPoint} ({road.lengthKm} km) • {road.state}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRoad(road);
                      focusOnLocation(road.coordinates[0][0], road.coordinates[0][1], 9, road.name);
                      setActiveTab("map");
                    }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                    title="View on Map"
                  >
                    <MapPin className="w-4 h-4 text-sky-400" />
                  </button>
                </div>

                {/* Condition Details */}
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                  <div className="text-slate-400 font-medium">
                    Condition: <span className="text-slate-200">{road.condition}</span>
                  </div>
                  <div className="text-[11px] text-amber-300 mt-1">
                    Weather: {road.weather} • Est. Delay: +{Math.floor(road.estimatedDelayMinutes / 60)}h {road.estimatedDelayMinutes % 60}m
                  </div>
                </div>

                {/* Operational note */}
                <div className="p-2 rounded bg-sky-950/30 border border-sky-900/40 text-[11px] text-slate-300">
                  <span className="font-bold text-sky-400">Operational note: </span>
                  {road.aiRecommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: Bridges Tab */}
      {activeTabSub === "bridges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBridges.map((bridge) => {
            const isDanger = bridge.waterLevelMeters >= bridge.dangerLevelMeters;
            return (
              <div
                key={bridge.id}
                className="p-4 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-white">{bridge.name}</h3>
                    <div className="text-[11px] text-slate-400">
                      River: <strong className="text-sky-300">{bridge.river}</strong> ({bridge.roadCode})
                    </div>
                  </div>
                  <StatusBadge status={bridge.condition} size="sm" />
                </div>

                {/* Water Level Telemetry */}
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Water Gauge Level:</span>
                    <span className={`font-mono font-bold ${isDanger ? "text-red-400" : "text-white"}`}>
                      {bridge.waterLevelMeters} m
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Danger Mark:</span>
                    <span className="font-mono text-slate-400">{bridge.dangerLevelMeters} m</span>
                  </div>

                  {/* Level meter */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isDanger ? "bg-red-500" : bridge.waterLevelMeters >= bridge.dangerLevelMeters - 2 ? "bg-amber-400" : "bg-sky-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (bridge.waterLevelMeters / bridge.dangerLevelMeters) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Capacity & Inspection */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Gross Limit: <strong className="text-white">{bridge.loadCapacityTons} MT</strong></span>
                  <button
                    onClick={() => {
                      focusOnLocation(bridge.coordinates[0], bridge.coordinates[1], 10, bridge.name);
                      setActiveTab("map");
                    }}
                    className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
