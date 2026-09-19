"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useApp } from "@/context/AppContext";
import { Road, Vehicle, Incident, WeatherData } from "@/types";
import { MOCK_BRIDGES } from "@/data/bridges";
import { Layers, ZoomIn, ZoomOut, Compass, AlertTriangle, Truck } from "lucide-react";

interface LeafletMapProps {
  height?: string;
  isEmergencyMode?: boolean;
  onSelectRoad?: (road: Road) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectIncident?: (incident: Incident) => void;
}

export default function LeafletMap({
  height = "h-full min-h-[500px]",
  isEmergencyMode = false,
  onSelectRoad,
  onSelectVehicle,
  onSelectIncident,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{
    roads: L.LayerGroup;
    bridges: L.LayerGroup;
    vehicles: L.LayerGroup;
    incidents: L.LayerGroup;
    weather: L.LayerGroup;
    emergency: L.LayerGroup;
  } | null>(null);

  const {
    roads,
    vehicles,
    incidents,
    emergencyResources,
    mapFocus,
    setSelectedRoad,
    setSelectedVehicle,
    setSelectedIncident,
    setActiveTab,
  } = useApp();

  // Layer Visibility Toggles
  const [layers, setLayers] = useState({
    roads: true,
    bridges: true,
    vehicles: true,
    incidents: true,
    weather: true,
    emergency: true,
  });

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [weatherStations, setWeatherStations] = useState<WeatherData[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/weather", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = (await response.json()) as { data?: WeatherData[] };
        return payload.data || [];
      })
      .then((data) => { if (active) setWeatherStations(data); })
      .catch(() => { if (active) setWeatherStations([]); });
    return () => { active = false; };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double init

    // Center on North East India (approx 26.2, 92.9)
    const map = L.map(mapContainerRef.current, {
      center: [26.3, 92.9],
      zoom: 7,
      zoomControl: false,
      attributionControl: true,
      minZoom: 6,
      maxZoom: 14,
    });

    // Use public tiles so the map works without a provider API key.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Initialize Layer Groups
    const roadsGroup = L.layerGroup().addTo(map);
    const bridgesGroup = L.layerGroup().addTo(map);
    const vehiclesGroup = L.layerGroup().addTo(map);
    const incidentsGroup = L.layerGroup().addTo(map);
    const weatherGroup = L.layerGroup().addTo(map);
    const emergencyGroup = L.layerGroup().addTo(map);

    layerGroupsRef.current = {
      roads: roadsGroup,
      bridges: bridgesGroup,
      vehicles: vehiclesGroup,
      incidents: incidentsGroup,
      weather: weatherGroup,
      emergency: emergencyGroup,
    };

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Dynamic Map Focus
  useEffect(() => {
    if (!mapInstanceRef.current || !mapFocus) return;
    mapInstanceRef.current.flyTo([mapFocus.lat, mapFocus.lng], mapFocus.zoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [mapFocus]);

  // Update Road Polylines
  useEffect(() => {
    if (!layerGroupsRef.current) return;
    const group = layerGroupsRef.current.roads;
    group.clearLayers();

    if (!layers.roads) return;

    roads.forEach((road) => {
      // Determine road line styling based on status
      let color = "#10b981"; // Accessible - Green
      let dashArray: string | undefined = undefined;
      let weight = 4;

      if (road.status === "blocked") {
        color = "#ef4444"; // Red
        weight = 5;
        dashArray = "6, 8";
      } else if (road.status === "high_risk") {
        color = "#f97316"; // Orange
        weight = 4;
      } else if (road.status === "partial") {
        color = "#f59e0b"; // Amber / Yellow
        weight = 4;
      } else if (road.status === "emergency") {
        color = "#0284c7"; // Blue
        weight = 5;
      }

      const polyline = L.polyline(road.coordinates, {
        color,
        weight,
        opacity: 0.85,
        dashArray,
      });

      // Hover and Click handling
      polyline.on("click", () => {
        setSelectedRoad(road);
        if (onSelectRoad) onSelectRoad(road);
      });

      // Accessible Road Popup
      const statusLabel =
        road.status === "blocked"
          ? "🔴 BLOCKED"
          : road.status === "partial"
          ? "🟡 PARTIALLY ACCESSIBLE"
          : road.status === "high_risk"
          ? "🟠 HIGH RISK"
          : "🟢 ACCESSIBLE";

      const popupContent = `
        <div class="p-3 font-sans text-xs min-w-[240px]">
          <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-2">
            <span class="font-bold text-sm text-white tracking-wide">${road.code}</span>
            <span class="text-[11px] font-bold">${statusLabel}</span>
          </div>
          <div class="text-slate-300 font-medium mb-1.5">${road.name}</div>
          <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-400 mb-2">
            <div>Sector: <span class="text-white">${road.startPoint} → ${road.endPoint}</span></div>
            <div>Risk Index: <span class="text-white font-semibold">${road.riskScore}%</span></div>
            <div>Est. Delay: <span class="text-amber-300 font-semibold">+${Math.floor(road.estimatedDelayMinutes / 60)}h ${road.estimatedDelayMinutes % 60}m</span></div>
            <div>Weather: <span class="text-white">${road.weather.split("(")[0]}</span></div>
          </div>
          <div class="p-2 rounded bg-slate-900 border border-slate-700 mb-2.5">
            <div class="text-[10px] text-sky-400 font-bold uppercase tracking-wider mb-0.5">Operational note</div>
            <div class="text-[11px] text-slate-300 italic">"${road.aiRecommendation}"</div>
          </div>
          <div class="text-[10px] text-slate-500 text-right">Click road to open full panel</div>
        </div>
      `;

      polyline.bindPopup(popupContent, { maxWidth: 320 });
      group.addLayer(polyline);
    });
  }, [roads, layers.roads, setSelectedRoad, onSelectRoad]);

  // Update Bridge Markers
  useEffect(() => {
    if (!layerGroupsRef.current) return;
    const group = layerGroupsRef.current.bridges;
    group.clearLayers();

    if (!layers.bridges) return;

    MOCK_BRIDGES.forEach((bridge) => {
      const isDamaged = bridge.condition === "damaged" || bridge.condition === "critical";
      const isDue = bridge.condition === "inspection_required";

      const iconColor = isDamaged ? "#ef4444" : isDue ? "#f59e0b" : "#10b981";

      const customIcon = L.divIcon({
        className: "ner-map-marker ner-bridge-marker",
        html: `
          <div style="background-color: ${iconColor}; width: 18px; height: 18px; border: 2px solid #ffffff; border-radius: 5px; box-shadow: 0 2px 8px rgba(15,23,42,.35);" title="${bridge.name}"></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker(bridge.coordinates, { icon: customIcon });

      const popupHtml = `
        <div class="p-2.5 font-sans text-xs min-w-[210px]">
          <div class="font-bold text-white mb-0.5">${bridge.name}</div>
          <div class="text-slate-400 text-[11px] mb-2">River: ${bridge.river} (${bridge.roadCode})</div>
          <div class="flex items-center justify-between text-[11px] mb-1">
            <span class="text-slate-400">Condition:</span>
            <span class="font-bold uppercase ${isDamaged ? "text-red-400" : isDue ? "text-amber-400" : "text-emerald-400"}">
              ${bridge.condition.replace("_", " ")}
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] mb-1">
            <span class="text-slate-400">Water Level:</span>
            <span class="text-white font-medium">${bridge.waterLevelMeters}m / Danger ${bridge.dangerLevelMeters}m</span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-400">Load Capacity:</span>
            <span class="text-white font-medium">${bridge.loadCapacityTons} MT</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      group.addLayer(marker);
    });
  }, [layers.bridges]);

  // Update Vehicle Markers (Simulated real-time movement)
  useEffect(() => {
    if (!layerGroupsRef.current) return;
    const group = layerGroupsRef.current.vehicles;
    group.clearLayers();

    if (!layers.vehicles) return;

    vehicles.forEach((vehicle) => {
      const isDelayed = vehicle.status === "delayed";
      const isStopped = vehicle.status === "stopped";

      const customIcon = L.divIcon({
        className: "ner-map-marker ner-vehicle-marker",
        html: `
          <div style="display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="background: #ffffff; border: 2px solid ${isDelayed ? '#b45309' : isStopped ? '#64748b' : '#18794e'}; border-radius: 6px; padding: 3px 6px; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(15,23,42,.25);">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${isDelayed ? '#f59e0b' : isStopped ? '#64748b' : '#10b981'};"></span>
              <span style="color: #0f172a; font-size: 10px; font-weight: 800; letter-spacing: -0.2px;">${vehicle.plateNumber}</span>
            </div>
          </div>
        `,
        iconSize: [88, 24],
        iconAnchor: [44, 12],
      });

      const marker = L.marker(vehicle.coordinates, { icon: customIcon });

      marker.on("click", () => {
        setSelectedVehicle(vehicle);
        if (onSelectVehicle) onSelectVehicle(vehicle);
      });

      const popupHtml = `
        <div class="p-3 font-sans text-xs min-w-[240px]">
          <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-1.5">
            <span class="font-bold text-white text-sm">${vehicle.plateNumber}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              isDelayed ? "bg-amber-950 text-amber-300 border border-amber-600" : "bg-emerald-950 text-emerald-300 border border-emerald-600"
            }">${vehicle.status}</span>
          </div>
          <div class="text-sky-400 font-semibold mb-1">${vehicle.cargo}</div>
          <div class="text-slate-300 text-[11px] mb-2">${vehicle.origin} → ${vehicle.destination}</div>
          <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-400 mb-2">
            <div>Speed: <span class="text-white font-medium">${vehicle.speedKmH} km/h</span></div>
            <div>ETA: <span class="text-white font-medium">${vehicle.eta}</span></div>
            <div>Remaining: <span class="text-white font-medium">${vehicle.distanceRemainingKm} km</span></div>
            <div>GPS Status: <span class="text-emerald-400 font-medium">${vehicle.lastGpsUpdate}</span></div>
          </div>
          <div class="text-[11px] text-slate-300 bg-slate-900 p-1.5 rounded border border-slate-700">
            Road Condition: <span class="text-amber-300">${vehicle.roadCondition}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      group.addLayer(marker);
    });
  }, [vehicles, layers.vehicles, setSelectedVehicle, onSelectVehicle]);

  // Update Incidents Markers
  useEffect(() => {
    if (!layerGroupsRef.current) return;
    const group = layerGroupsRef.current.incidents;
    group.clearLayers();

    if (!layers.incidents) return;

    incidents.forEach((incident) => {
      const isCritical = incident.severity === "Critical";

      const customIcon = L.divIcon({
        className: "ner-map-marker ner-incident-marker",
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: ${
            isCritical ? "#ef4444" : "#f97316"
          }; border: 2px solid #ffffff;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></span>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker(incident.coordinates, { icon: customIcon });

      marker.on("click", () => {
        setSelectedIncident(incident);
        if (onSelectIncident) onSelectIncident(incident);
      });

      const popupHtml = `
        <div class="p-3 font-sans text-xs min-w-[250px]">
          <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-2">
            <span class="font-bold text-red-400 uppercase tracking-wide flex items-center gap-1">
              ⚠️ ${incident.type}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isCritical ? "bg-red-950 text-red-300 border border-red-700" : "bg-orange-950 text-orange-300 border border-orange-700"
            }">${incident.severity.toUpperCase()}</span>
          </div>
          <div class="font-semibold text-white text-xs mb-1">${incident.title}</div>
          <div class="text-slate-400 text-[11px] mb-2">📍 ${incident.location}</div>
          <div class="text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-700 mb-2">
            <div class="text-[10px] text-amber-400 font-bold uppercase mb-0.5">Reported condition</div>
            <div class="text-slate-300">${incident.cause}</div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span>Est. Delay: +${incident.estimatedDelayHours}h</span>
            <span>Reported: ${incident.timeDetected}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });
      group.addLayer(marker);
    });
  }, [incidents, layers.incidents, setSelectedIncident, onSelectIncident]);

  // Update Weather Layer
  useEffect(() => {
    if (!layerGroupsRef.current) return;
    const group = layerGroupsRef.current.weather;
    group.clearLayers();

    if (!layers.weather) return;

    weatherStations.forEach((wx) => {
      const customIcon = L.divIcon({
        className: "ner-map-marker ner-weather-marker",
        html: `
          <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid #38bdf8; border-radius: 20px; padding: 2px 7px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.5);">
            <span style="font-size: 11px;">🌧️</span>
            <span style="color: #38bdf8; font-size: 10px; font-weight: 700;">${wx.rainfall24hMm}mm</span>
          </div>
        `,
        iconSize: [68, 20],
        iconAnchor: [34, 10],
      });

      const marker = L.marker(wx.coordinates, { icon: customIcon });

      const popupHtml = `
        <div class="p-2.5 font-sans text-xs min-w-[220px]">
          <div class="font-bold text-white mb-0.5">🌧️ ${wx.location}</div>
          <div class="text-sky-300 font-medium mb-1.5">${wx.condition}</div>
          <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-300 mb-2">
            <div>24h Rain: <span class="text-white font-bold">${wx.rainfall24hMm} mm</span></div>
            <div>Temp: <span class="text-white">${wx.temperatureCelsius}°C</span></div>
            <div>Wind: <span class="text-white">${wx.windSpeedKmh} km/h</span></div>
            <div>Condition: <span class="text-white">${wx.condition}</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      group.addLayer(marker);
    });
  }, [layers.weather, weatherStations]);

  // Update Emergency Deployment Layer
  useEffect(() => {
    if (!layerGroupsRef.current) return;
    const group = layerGroupsRef.current.emergency;
    group.clearLayers();

    if (!layers.emergency || !isEmergencyMode) return;

    emergencyResources.forEach((res) => {
      const isDeployed = res.status === "Deployed";
      const iconEmoji =
        res.type === "Ambulance"
          ? "🚑"
          : res.type === "Rescue Team"
          ? "🦺"
          : res.type === "Medical Boat"
          ? "🚤"
          : "🚜";

      const customIcon = L.divIcon({
        className: "ner-map-marker ner-emergency-marker",
        html: `
          <div style="background: ${isDeployed ? "#0284c7" : "#0f172a"}; border: 2px solid #38bdf8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(2,132,199,0.7);" class="${
            isDeployed ? "pulse-green" : ""
          }">
            <span style="font-size: 13px;">${iconEmoji}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(res.coordinates, { icon: customIcon });

      const popupHtml = `
        <div class="p-2.5 font-sans text-xs min-w-[220px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
            <span class="font-bold text-sky-400">${res.unitName}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isDeployed ? "bg-sky-950 text-sky-300 border border-sky-600" : "bg-slate-800 text-slate-300"
            }">${res.status.toUpperCase()}</span>
          </div>
          <div class="text-slate-300 mb-1">📍 ${res.location} (${res.state})</div>
          <div class="text-[11px] text-slate-400 mb-1">Capacity: ${res.capacityOrPersonnel}</div>
          ${
            res.assignedRoute
              ? `<div class="text-[11px] text-amber-300 font-medium">Target: ${res.assignedRoute}</div>`
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupHtml);
      group.addLayer(marker);
    });
  }, [emergencyResources, layers.emergency, isEmergencyMode]);

  // Map Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => mapInstanceRef.current?.flyTo([26.3, 92.9], 7);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 ${height}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-0" />

      {/* Floating Map Legend & Layer Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {/* Layer Selector Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-md shadow-lg backdrop-blur"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Map Layers</span>
          </button>

          {/* Layer Menu Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-0 mt-1 w-52 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl backdrop-blur z-20 text-xs">
              <div className="font-bold text-slate-300 pb-1.5 border-b border-slate-800 mb-2 uppercase text-[10px] tracking-wider">
                Display Layers
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between cursor-pointer text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-0.5 bg-emerald-500 rounded" /> Roads (Corridors)
                  </span>
                  <input
                    type="checkbox"
                    checked={layers.roads}
                    onChange={() => toggleLayer("roads")}
                    className="accent-sky-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> Bridges & River Crossings
                  </span>
                  <input
                    type="checkbox"
                    checked={layers.bridges}
                    onChange={() => toggleLayer("bridges")}
                    className="accent-sky-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-200">
                  <span className="flex items-center gap-2">
                    <Truck className="w-3 h-3 text-sky-400" /> Fleet Vehicles
                  </span>
                  <input
                    type="checkbox"
                    checked={layers.vehicles}
                    onChange={() => toggleLayer("vehicles")}
                    className="accent-sky-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-200">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" /> Incidents & Hazards
                  </span>
                  <input
                    type="checkbox"
                    checked={layers.incidents}
                    onChange={() => toggleLayer("incidents")}
                    className="accent-sky-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="text-[11px]">🌧️</span> Rainfall & Radar
                  </span>
                  <input
                    type="checkbox"
                    checked={layers.weather}
                    onChange={() => toggleLayer("weather")}
                    className="accent-sky-500"
                  />
                </label>

                {isEmergencyMode && (
                  <label className="flex items-center justify-between cursor-pointer text-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="text-[11px]">🚑</span> Emergency Resources
                    </span>
                    <input
                      type="checkbox"
                      checked={layers.emergency}
                      onChange={() => toggleLayer("emergency")}
                      className="accent-sky-500"
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex flex-col bg-slate-900/90 border border-slate-700 rounded-md overflow-hidden shadow-lg backdrop-blur">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-800"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-800"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Fit North East region"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-10 p-2.5 bg-slate-950/90 border border-slate-800 rounded-md backdrop-blur text-[11px] shadow-lg max-w-[280px] hidden sm:block">
        <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
          Road Corridors
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-emerald-500 rounded" />
            <span>Accessible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-amber-400 rounded" />
            <span>Partially Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-orange-500 rounded" />
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-red-500 rounded" />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-2.5 h-1 bg-sky-500 rounded" />
            <span>Emergency Green Corridor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
