import { NextResponse } from "next/server";
import { WEATHER_STATIONS } from "@/data/weatherStations";
import { WeatherData } from "@/types";

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number };
  hourly?: { precipitation?: number[] };
};

function weatherCondition(code?: number) {
  const conditions: Record<number, string> = {
    0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snowfall", 75: "Heavy snowfall", 80: "Rain showers", 81: "Heavy rain showers",
    82: "Violent rain showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
  };
  return conditions[code ?? -1] ?? "Conditions unavailable";
}

function isSevere(code?: number) { return [65, 75, 81, 82, 95, 96, 99].includes(code ?? -1); }

export async function GET() {
  try {
    // Open-Meteo supports coordinate lists. One upstream request is materially
    // more reliable than six simultaneous requests on a slow network drive.
    const params = new URLSearchParams({
      latitude: WEATHER_STATIONS.map((station) => station.coordinates[0]).join(","),
      longitude: WEATHER_STATIONS.map((station) => station.coordinates[1]).join(","),
      current: "temperature_2m,wind_speed_10m,weather_code", hourly: "precipitation",
      past_hours: "24", forecast_hours: "1", timezone: "GMT",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 600 } });
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const reports = (await response.json()) as OpenMeteoResponse[];
    const data: WeatherData[] = WEATHER_STATIONS.map((station, index) => {
      const report = reports[index];
      if (!report) throw new Error("Open-Meteo returned an incomplete weather report.");
      const code = report.current?.weather_code;
      return {
        ...station,
        rainfall24hMm: Number((report.hourly?.precipitation ?? []).slice(0, 24).reduce((sum, value) => sum + (value || 0), 0).toFixed(1)),
        temperatureCelsius: Number((report.current?.temperature_2m ?? 0).toFixed(1)),
        windSpeedKmh: Number((report.current?.wind_speed_10m ?? 0).toFixed(1)),
        condition: weatherCondition(code), severeAlert: isSevere(code),
      };
    });
    return NextResponse.json({ success: true, data, source: "Open-Meteo forecast", updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ success: false, error: "Live weather data is temporarily unavailable." }, { status: 502 });
  }
}
