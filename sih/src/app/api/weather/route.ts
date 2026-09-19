import { NextResponse } from "next/server";
import { WEATHER_STATIONS } from "@/data/weatherStations";
import { MOCK_WEATHER } from "@/data/weather";
import { WeatherData } from "@/types";

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number };
  hourly?: { precipitation?: number[] };
};

/** Derive the cascading risk chain (rain -> landslide -> road -> delay) from 24h precipitation. */
function buildRiskChain(rain24h: number): WeatherData["riskChain"] {
  const severity = rain24h > 150 ? 100 : rain24h > 80 ? 84 : rain24h > 40 ? 62 : rain24h > 15 ? 35 : 12;
  const roadAccessibility = rain24h > 150
    ? "BLOCKED / Evacuation Route Only"
    : rain24h > 80 ? "RESTRICTED to Pilot Convoys"
    : rain24h > 40 ? "Single Lane Operational"
    : rain24h > 15 ? "Open with Caution — Reduced Visibility"
    : "Open — Normal Operations";
  const deliveryDelay = rain24h > 150 ? "+4h 30m Expected Delay"
    : rain24h > 80 ? "+2h 45m Expected Delay"
    : rain24h > 40 ? "+1h 15m Expected Delay"
    : rain24h > 15 ? "+25m Minor Delay"
    : "Nominal (On Schedule)";
  return {
    rainfall: `${rain24h.toFixed(1)} mm/24h (${severity}% slope saturation)`,
    landslideRisk: `${severity > 60 ? "High" : severity > 30 ? "Moderate" : "Low"} ${severity}%`,
    roadAccessibility,
    deliveryDelay,
  };
}

function weatherCondition(code?: number) {
  const conditions: Record<number, string> = {
    0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snowfall", 75: "Heavy snowfall", 80: "Rain showers", 81: "Heavy rain showers",
    82: "Violent rain showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
  };
  return conditions[code ?? -1] ?? "Conditions unavailable";
}

function isSevere(code?: number) {
  return [65, 75, 81, 82, 95, 96, 99].includes(code ?? -1);
}

export async function GET() {
  try {
    // Open-Meteo supports coordinate lists — one upstream request is materially
    // more reliable than six simultaneous requests on a slow network. No API key needed.
    const params = new URLSearchParams({
      latitude: WEATHER_STATIONS.map((s) => s.coordinates[0]).join(","),
      longitude: WEATHER_STATIONS.map((s) => s.coordinates[1]).join(","),
      current: "temperature_2m,wind_speed_10m,weather_code",
      hourly: "precipitation",
      past_hours: "24",
      forecast_hours: "1",
      timezone: "GMT",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 600 } });
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const reports = (await response.json()) as OpenMeteoResponse[];

    const weather: WeatherData[] = WEATHER_STATIONS.map((station, index) => {
      const report = reports[index];
      if (!report) throw new Error("Open-Meteo returned an incomplete weather report.");
      const code = report.current?.weather_code;
      const rainfall24hMm = Number(
        (report.hourly?.precipitation ?? []).slice(0, 24).reduce((sum, value) => sum + (value || 0), 0).toFixed(1)
      );
      return {
        ...station,
        rainfall24hMm,
        temperatureCelsius: Number((report.current?.temperature_2m ?? 0).toFixed(1)),
        windSpeedKmh: Number((report.current?.wind_speed_10m ?? 0).toFixed(1)),
        condition: weatherCondition(code),
        severeAlert: isSevere(code),
        riskChain: buildRiskChain(rainfall24hMm),
      };
    });

    return NextResponse.json({
      weather,
      live: true,
      source: "Open-Meteo (live, no key required)",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Graceful degradation: serve the curated dataset so the dashboard keeps working offline.
    return NextResponse.json({
      weather: MOCK_WEATHER,
      live: false,
      source: "NER-LIFELINE surveyed dataset (Open-Meteo unreachable)",
      updatedAt: new Date().toISOString(),
    });
  }
}
