import { apiClient } from "./client";
import type { DashboardData, ExecutiveInsights, Lead, OperationsDashboard } from "../types";

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<DashboardData>("/api/dashboard");
  return data;
}

export async function getExecutiveInsights(): Promise<ExecutiveInsights> {
  const { data } = await apiClient.get<ExecutiveInsights>("/api/dashboard/executive-insights");
  return data;
}

export async function getOperationsDashboard(): Promise<OperationsDashboard> {
  const { data } = await apiClient.get<OperationsDashboard>("/api/dashboard/operations");
  return data;
}

export async function getSalesFunnel(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>("/api/reports/sales-funnel");
  return data;
}

export async function getRegionalDistribution(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>("/api/reports/regional-distribution");
  return data;
}

export interface RepPerformance {
  representative_id: string;
  representative: string;
  lead_count: number;
  pipeline_value: number;
  won_count: number;
}

export async function getRepPerformance(representativeId?: string): Promise<RepPerformance[]> {
  const { data } = await apiClient.get<RepPerformance[]>("/api/reports/rep-performance", {
    params: representativeId ? { representative_id: representativeId } : {},
  });
  return data;
}

// --- TFS Dashboard tabs ------------------------------------------------

export interface OverviewStats {
  total_leads: number;
  active_leads: number;
  won_leads: number;
  lost_leads: number;
  pipeline_value: number;
  leads_by_status: Record<string, number>;
  leads_by_product_category: Record<string, number>;
}

export interface EngagementStats {
  total_engaged: number;
  avg_response_time_hours: number;
  leads: Lead[];
}

export interface WonStats {
  count: number;
  total_value: number;
  leads: Lead[];
}

export interface LostStats {
  count: number;
  lost_value: number;
  leads: Lead[];
}

export interface UnassignedStats {
  total_unassigned: number;
  leads: Lead[];
}

function repParams(representativeId?: string) {
  return representativeId ? { representative_id: representativeId } : {};
}

export async function getOverviewTab(representativeId?: string): Promise<OverviewStats> {
  const { data } = await apiClient.get<OverviewStats>("/api/dashboard/tabs/overview", { params: repParams(representativeId) });
  return data;
}

export async function getEngagementTab(representativeId?: string): Promise<EngagementStats> {
  const { data } = await apiClient.get<EngagementStats>("/api/dashboard/tabs/engagement", { params: repParams(representativeId) });
  return data;
}

export async function getWonTab(representativeId?: string): Promise<WonStats> {
  const { data } = await apiClient.get<WonStats>("/api/dashboard/tabs/won", { params: repParams(representativeId) });
  return data;
}

export async function getLostTab(representativeId?: string): Promise<LostStats> {
  const { data } = await apiClient.get<LostStats>("/api/dashboard/tabs/lost", { params: repParams(representativeId) });
  return data;
}

export async function getUnassignedTab(): Promise<UnassignedStats> {
  const { data } = await apiClient.get<UnassignedStats>("/api/dashboard/tabs/unassigned");
  return data;
}
