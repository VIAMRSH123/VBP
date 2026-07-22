import { apiClient } from "./client";
import type { AuditLogEntry } from "../types";

export async function listAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>("/api/admin/audit-log", { params: { limit } });
  return data;
}

export interface ConfigEntry {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
}

export async function listConfiguration(): Promise<ConfigEntry[]> {
  const { data } = await apiClient.get<ConfigEntry[]>("/api/admin/configuration");
  return data;
}

export async function upsertConfiguration(key: string, value: string, category = "general"): Promise<void> {
  await apiClient.put("/api/admin/configuration", { key, value, category });
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>("/api/admin/users");
  return data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}): Promise<void> {
  await apiClient.post("/api/admin/users", payload);
}
