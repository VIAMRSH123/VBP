export type UserRole =
  | "administrator"
  | "sales_manager"
  | "sales_representative"
  | "executive"
  | "read_only_auditor";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  representative_id?: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  company: string;
  contact_name: string;
  phone: string;
  email: string;
  product: string;
  quantity: number;
  status: string;
  record_state: string;
  representative_id: string;
  representative_name: string;
  industry: string;
  customer_type: string;
  product_category: string;
  lead_score: number;
  deal_size_estimate: number;
  buying_probability: number;
  risk_score: number;
  priority: string;
  remarks: string;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadListResponse {
  total: number;
  items: Lead[];
}

export interface LeadActivityEntry {
  id: string;
  type: string;
  description: string;
  actor: string;
  created_at: string;
}

export interface LeadStatusHistoryEntry {
  from: string;
  to: string;
  changed_by: string;
  remarks: string;
  created_at: string;
}

export interface LeadActivityResponse {
  activities: LeadActivityEntry[];
  status_history: LeadStatusHistoryEntry[];
}

export interface Representative {
  id: string;
  representative_code: string;
  name: string;
  territory: string;
  region: string;
  product_category: string;
  language: string;
  manager_phone: string;
  email: string;
  phone: string;
  workload: number;
  active: boolean;
}

export interface NotificationItem {
  id: string;
  lead_id: string;
  recipient: string;
  recipient_role: string;
  channel: string;
  template: string;
  message: string;
  status: string;
  delivered: boolean;
  created_at: string;
}

export interface DashboardData {
  kpis: {
    total_leads: number;
    active_leads: number;
    won_leads: number;
    lost_leads: number;
    pipeline_value: number;
    sla_breaches: number;
    pending_followups: number;
  };
  leads_by_status: Record<string, number>;
  leads_by_representative: Record<string, number>;
  leads_by_product_category: Record<string, number>;
  top_representative: string | null;
}

export interface ExecutiveInsights {
  summary: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
}

export interface OperationsDashboard {
  workflow_success_rate: number;
  total_executions: number;
  successful: number;
  failed: number;
  running: number;
  dead_letter_queue_length: number;
  recent_executions: {
    id: string;
    workflow_name: string;
    lead_id: string;
    status: string;
    current_stage: string;
    retry_count: number;
    started_at: string;
    ended_at: string;
  }[];
}

export interface CsvUploadResult {
  id: string;
  filename: string;
  row_count: number;
  valid_rows: number;
  invalid_rows: number;
  errors: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}
