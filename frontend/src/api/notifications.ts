import { apiClient } from "./client";
import type { NotificationItem } from "../types";

export async function listNotifications(leadId?: string): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<NotificationItem[]>("/api/notifications", {
    params: leadId ? { lead_id: leadId } : {},
  });
  return data;
}

export async function runReminders(): Promise<{ result: Record<string, number> }> {
  const { data } = await apiClient.post("/api/reminders/run");
  return data;
}
