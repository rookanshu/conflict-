"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { MOCK_WEATHER } from "@/data/weather";
import { WeatherData } from "@/types";
import {
  CloudRain,
  Wind,
  Thermometer,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Compass,
  MapPin,
  Clock,
  Layers,
} from "lucide-react";

export function WeatherView() {
  const { focusOnLocation, setActiveTab } = useApp();
  const [weatherData, setWeatherData] = useState<WeatherData[]>(MOCK_WEATHER);
  const [dataMode, setDataMode] = useState<"mocked" | "live">("mocked");
  const [selectedWeatherId, setSelectedWeatherId] = useState<string>(MOCK_WEATHER[0].id);

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch("/api/weather");
        if (res.ok) {
          const json = await res.json();
          if (json.weather && json.weather.length > 0) {
            setWeatherData(json.weather);
            setSelectedWeatherId(json.weather[0].id);
            setDataMode(json.live ? "live" : "mocked");
          }
        }
      } catch {
        // keep mock data
      }
    }
    loadWeather();
  }, []);

  const activeWeather =
    weatherData.find((w) => w.id === selectedWeatherId) || weatherData[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-3 sm:p-5 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-sky-400" />
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
              LOGISTICS WEATHER & HYDRO-METEOROLOGICAL INTELLIGENCE
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Doppler Precipitation Radar, Cloud Burst Gauges & Flash-Flood Inflow Modeling
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800`}>
            Data Source: <strong className={dataMode === "live" ? "text-green-400" : "text-slate-400"}>{dataMode === "live" ? "Live OpenWeatherMap" : "Mocked (Standalone)"}</strong>
          </span>
        </div>
      </div>

      {/* Visual Cascading Risk Chain Banner (Explicitly required by prompt:
          Heavy Rain → Landslide Risk → Road Accessibility → Delivery Delay) */}
      <div className="p-4 rounded-xl border border-sky-900/50 bg-slate-900/80 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Active Cascading Risk Propagation Chain</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Sector: <strong className="text-white">{activeWeather.location}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {/* Node 1: Heavy Rain */}
          <div className="p-3.5 rounded-lg border border-sky-800/40 bg-sky-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] uppercase font-bold text-sky-400">1. Hydro Trigger</span>
                <CloudRain className="w-4 h-4 text-sky-400" />
              </div>
              <div className="font-black text-sm text-white">Precipitation Surge</div>
              <div className="text-xs text-sky-300 font-mono font-bold mt-1">
                {activeWeather.riskChain.rainfall}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Monsoon Orographic Inflow</div>
          </div>

          {/* Node 2: Landslide Risk */}
          <div className="p-3.5 rounded-lg border border-amber-800/40 bg-amber-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] uppercase font-bold text-amber-400">2. Geotech Risk</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-black text-sm text-white">Slope Destabilization</div>
              <div className="text-xs text-amber-300 font-mono font-bold mt-1">
                {activeWeather.riskChain.landslideRisk}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Pore Pressure Saturation</div>
          </div>

          {/* Node 3: Road Accessibility */}
          <div className="p-3.5 rounded-lg border border-red-800/40 bg-red-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] uppercase font-bold text-red-400">3. Infrastructure</span>
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <div className="font-black text-sm text-white">Corridor Restriction</div>
              <div className="text-xs text-red-300 font-mono font-bold mt-1">
                {activeWeather.riskChain.roadAccessibility}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Debris Inflow & Scouring</div>
          </div>

          {/* Node 4: Delivery Delay */}
          <div className="p-3.5 rounded-lg border border-purple-800/40 bg-purple-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] uppercase font-bold text-purple-400">4. Supply Chain Impact</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="font-black text-sm text-white">Logistics Delay</div>
              <div className="text-xs text-purple-300 font-mono font-bold mt-1">
                {activeWeather.riskChain.deliveryDelay}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Cold Chain Re-routing Required</div>
          </div>
        </div>
      </div>

      {/* Weather Stations Grid */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Regional Weather Stations & Logistics Telemetry ({weatherData.length})
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {weatherData.map((wx) => {
            const isSelected = activeWeather.id === wx.id;
            return (
              <div
                key={wx.id}
                onClick={() => setSelectedWeatherId(wx.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all space-y-3 ${
                  isSelected
                    ? "border-sky-500 bg-sky-950/20 shadow-lg"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-sky-400" />
                      <span>{wx.location}</span>
                    </h3>
                    <div className="text-[11px] text-slate-400">{wx.state}</div>
                  </div>

                  {wx.severeAlert ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-700 uppercase animate-pulse">
                      SEVERE RADAR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase">
                      NORMAL
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-200 font-medium">
                  Condition: <span className="text-sky-300">{wx.condition}</span>
                </div>

                {/* Telemetry 3-col */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">24h Rainfall</div>
                    <div className="font-bold text-sky-400 font-mono">{wx.rainfall24hMm} mm</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">Temperature</div>
                    <div className="font-bold text-white font-mono">{wx.temperatureCelsius}°C</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">Wind Velocity</div>
                    <div className="font-bold text-slate-300 font-mono">{wx.windSpeedKmh} km/h</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      focusOnLocation(wx.coordinates[0], wx.coordinates[1], 9, wx.location);
                      setActiveTab("map");
                    }}
                    className="text-sky-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <span>Inspect On GIS Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <span className="text-[10px] text-slate-500">Updated: 10m ago</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
