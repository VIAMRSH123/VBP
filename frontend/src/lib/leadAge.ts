import type { Lead } from "../types";

const DAY_MS = 86_400_000;

export function daysInStage(lead: Lead): number {
  return Math.max(0, Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / DAY_MS));
}
