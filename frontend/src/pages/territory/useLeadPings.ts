import { useEffect, useRef, useState } from "react";
import type { Lead } from "../../types";

const PING_MS = 3600;

export interface Ping {
  key: string;
  leadId: string;
  territory: string;
}

/**
 * Watches a newest-first lead list and emits a short-lived ping for every lead that appears after
 * the first load. The first batch only seeds the "already seen" set, so opening the page doesn't
 * fire a ping for every existing lead.
 */
export function useLeadPings(leads: Lead[] | undefined): Ping[] {
  const seen = useRef<Set<string> | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (!leads) return;
    if (seen.current === null) {
      seen.current = new Set(leads.map((l) => l.id));
      return;
    }
    const known = seen.current;
    const fresh = leads.filter((l) => !known.has(l.id));
    if (fresh.length === 0) return;
    fresh.forEach((l) => known.add(l.id));

    const added = fresh.map((l) => ({ key: `${l.id}-${Date.now()}`, leadId: l.id, territory: l.territory }));
    setPings((current) => [...current, ...added]);
    timers.current.push(
      window.setTimeout(() => {
        setPings((current) => current.filter((p) => !added.some((a) => a.key === p.key)));
      }, PING_MS),
    );
  }, [leads]);

  return pings;
}
