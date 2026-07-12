"use client";

import { useEffect, useState } from "react";
import { GATEWAY_URL, type SettledCall } from "@/lib/gateway";

/** Subscribe to the gateway's /events SSE stream. Silently idle if the gateway is down. */
export function useEventStream(limit = 8): { events: SettledCall[]; connected: boolean } {
  const [events, setEvents] = useState<SettledCall[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`${GATEWAY_URL}/events`);
    es.onopen = () => setConnected(true);
    es.onmessage = (ev) => {
      try {
        const call = JSON.parse(ev.data) as SettledCall;
        setEvents((prev) => [call, ...prev.filter((p) => p.id !== call.id)].slice(0, limit));
        setConnected(true);
      } catch {
        /* ignore malformed frames */
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [limit]);

  return { events, connected };
}
