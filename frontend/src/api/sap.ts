import { apiClient } from "./client";

export type SapMode = "off" | "mock" | "live";

export interface SapRunSummary {
  id: string;
  mode: "backfill" | "incremental";
  scope: "all" | "stock";
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  ended_at: string;
  counts: Record<string, { fetched: number; created: number; updated: number; unchanged: number; failed: number }>;
  notifications_suppressed: number;
  triggered_by: string;
  error_details?: string;
}

export interface SapStatus {
  mode: SapMode;
  enabled: boolean;
  configured: boolean;
  interval_minutes: number;
  last_run: SapRunSummary | null;
  last_success_at: string | null;
  running: boolean;
  needs_reset: boolean;
  last_error?: string;
}

export async function getSapStatus(): Promise<SapStatus> {
  const { data } = await apiClient.get<SapStatus>("/api/sap/status");
  return data;
}

export async function triggerSapSync(options: { mode?: "incremental" | "backfill"; scope?: "all" | "stock" } = {}): Promise<void> {
  await apiClient.post("/api/sap/sync", null, { params: { mode: options.mode ?? "incremental", scope: options.scope ?? "all" } });
}

export async function purgeMockSapData(): Promise<Record<string, number>> {
  const { data } = await apiClient.post<{ removed: Record<string, number> }>("/api/sap/purge-mock");
  return data.removed;
}
