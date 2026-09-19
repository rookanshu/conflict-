"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WeatherData } from "@/types";
import { ArrowRight, CloudRain, MapPin, RefreshCw, Thermometer, Wind } from "lucide-react";

type WeatherResponse = { success: boolean; data?: WeatherData[]; source?: string; updatedAt?: string; error?: string };

export function WeatherView() {
  const { focusOnLocation, setActiveTab } = useApp();
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [selectedWeatherId, setSelectedWeatherId] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/weather", { cache: "no-store" });
      const payload = (await response.json()) as WeatherResponse;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || "Live weather is unavailable.");
      setWeather(payload.data);
      setSelectedWeatherId((current) => current || payload.data?.[0]?.id || "");
      setUpdatedAt(payload.updatedAt || "");
    } catch (cause) {
      setWeather([]);
      setError(cause instanceof Error ? cause.message : "Live weather is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWeather(); }, [loadWeather]);

  const activeWeather = weather.find((item) => item.id === selectedWeatherId) || weather[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-3 sm:p-5 overflow-y-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2"><CloudRain className="w-5 h-5 text-sky-400" /><h1 className="text-base sm:text-lg font-black tracking-tight text-white">LIVE REGIONAL WEATHER</h1></div>
          <p className="text-xs text-slate-400 mt-1">Current conditions and preceding 24-hour precipitation from Open-Meteo.</p>
        </div>
        <button onClick={() => void loadWeather()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 text-sky-300 border border-slate-700 hover:border-sky-600 disabled:opacity-60">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {loading ? "Refreshing" : "Refresh live data"}
        </button>
      </div>

      {error && <div className="p-4 rounded-xl border border-amber-700/60 bg-amber-950/20 text-sm text-amber-100">{error} <button onClick={() => void loadWeather()} className="ml-2 underline font-bold">Try again</button></div>}

      {activeWeather && <div className="p-4 rounded-xl border border-sky-900/50 bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div><div className="text-[10px] uppercase tracking-wider font-bold text-sky-400">Selected monitoring location</div><h2 className="text-base font-bold text-white mt-1">{activeWeather.location}</h2><p className="text-xs text-slate-400">{activeWeather.state} · {activeWeather.condition}</p></div>
          {activeWeather.severeAlert && <span className="self-start px-2 py-1 rounded text-[10px] font-bold text-amber-200 bg-amber-950 border border-amber-700">Severe weather condition</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <Metric label="Preceding 24h precipitation" value={`${activeWeather.rainfall24hMm} mm`} icon={<CloudRain className="w-4 h-4" />} />
          <Metric label="Temperature" value={`${activeWeather.temperatureCelsius}°C`} icon={<Thermometer className="w-4 h-4" />} />
          <Metric label="Wind speed" value={`${activeWeather.windSpeedKmh} km/h`} icon={<Wind className="w-4 h-4" />} />
        </div>
      </div>}

      {!loading && !error && <div className="space-y-2">
        <div className="flex items-center justify-between"><div className="text-xs font-bold uppercase tracking-wider text-slate-300">Live monitoring locations ({weather.length})</div>{updatedAt && <span className="text-[10px] text-slate-500">Updated {new Date(updatedAt).toLocaleTimeString()}</span>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {weather.map((item) => {
            const selected = activeWeather?.id === item.id;
            return <button key={item.id} onClick={() => setSelectedWeatherId(item.id)} className={`text-left p-4 rounded-lg border transition-all ${selected ? "border-sky-500 bg-sky-950/20" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
              <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-sm text-white">{item.location}</h3><p className="text-[11px] text-slate-400 mt-1">{item.state}</p></div>{item.severeAlert && <span className="text-[10px] text-amber-300">Alert</span>}</div>
              <p className="text-xs text-sky-300 mt-3">{item.condition}</p>
              <div className="grid grid-cols-3 gap-2 p-2 mt-3 rounded bg-slate-950 border border-slate-800 text-xs"><span className="text-sky-300">{item.rainfall24hMm} mm</span><span className="text-white">{item.temperatureCelsius}°C</span><span className="text-slate-300">{item.windSpeedKmh} km/h</span></div>
              <span onClick={(event) => { event.stopPropagation(); focusOnLocation(item.coordinates[0], item.coordinates[1], 9, item.location); setActiveTab("map"); }} className="mt-3 inline-flex items-center gap-1 text-[11px] text-sky-400 font-semibold hover:underline"><MapPin className="w-3 h-3" />View on map <ArrowRight className="w-3 h-3" /></span>
            </button>;
          })}
        </div>
      </div>}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="p-3 rounded-lg bg-slate-950 border border-slate-800"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><div className="text-lg font-bold font-mono text-white mt-2">{value}</div></div>;
}
