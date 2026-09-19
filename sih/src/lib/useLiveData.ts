"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Standard API collection envelope returned by every data endpoint:
 * { data: T, live: boolean, source: string, updatedAt: ISO string }
 */
export interface LiveDataEnvelope<T> {
  data: T;
  live: boolean;
  source: string;
  updatedAt: string;
}

/**
 * Polls a NER-LIFELINE data endpoint and keeps the latest payload in state.
 *
 * - Renders `fallback` instantly (skeleton-free first paint), then swaps in the
 *   server payload as soon as the first response lands.
 * - Re-polls every `intervalMs`. Pass `null` as the interval to fetch once.
 * - `refresh()` forces an immediate re-fetch (manual sync button).
 * - Network failures never clobber the last good data.
 */
export function useLiveData<T>(
  url: string,
  fallback: T,
  intervalMs: number | null = 30_000
): {
  data: T;
  live: boolean;
  source: string;
  updatedAt: string | null;
  refreshing: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<T>(fallback);
  const [live, setLive] = useState(false);
  const [source, setSource] = useState("connecting…");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: LiveDataEnvelope<T>) => {
        if (Array.isArray(json.data) || typeof json.data === "object") {
          setData(json.data);
          setLive(!!json.live);
          setSource(json.source ?? "unknown");
          setUpdatedAt(json.updatedAt ?? new Date().toISOString());
        }
      })
      .catch(() => {
        // Keep last good data; the endpoint itself degrades gracefully.
      })
      .finally(() => {
        inFlight.current = false;
        setRefreshing(false);
      });
  }, [url]);

  useEffect(() => {
    refresh();
    if (intervalMs === null) return;
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, live, source, updatedAt, refreshing, refresh };
}

/** Formats an ISO timestamp as a short HH:MM:SS clock string. */
export function formatSyncClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString();
}