import { apiClient } from "./client";
import type { Lead, LeadListResponse, LeadActivityResponse } from "../types";

export interface LeadFilters {
  status?: string;
  representative_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listLeads(filters: LeadFilters = {}): Promise<LeadListResponse> {
  const { data } = await apiClient.get<LeadListResponse>("/api/leads", { params: filters });
  return data;
}

export async function getLead(id: string): Promise<Lead> {
  const { data } = await apiClient.get<Lead>(`/api/leads/${id}`);
  return data;
}

export async function getLeadActivity(id: string): Promise<LeadActivityResponse> {
  const { data } = await apiClient.get<LeadActivityResponse>(`/api/leads/${id}/activity`);
  return data;
}

export async function updateLeadStatus(id: string, status: string, remarks = ""): Promise<void> {
  await apiClient.put(`/api/leads/${id}/status`, { status, remarks });
}

export interface NextBestAction {
  action: string;
  reasoning: string;
  urgency: string;
}

export async function getNextBestAction(id: string): Promise<NextBestAction> {
  const { data } = await apiClient.get<NextBestAction>(`/api/leads/${id}/next-best-action`);
  return data;
}
