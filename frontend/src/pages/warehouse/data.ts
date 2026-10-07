export type WarehouseStatus = "Operational" | "Warning";
export type DataSourceMode = "live" | "mock" | "sample";

export interface InventoryCategory {
  label: string;
  units: number;
}

export interface StockHealth {
  healthy: number;
  low: number;
  critical: number;
}

export interface ActivityEvent {
  time: string;
  title: string;
  detail: string;
}

/** One warehouse as returned by GET /api/warehouses (computed from the synced SAP stock). */
export interface Warehouse {
  id: string;
  number: string;
  name: string;
  location: string;
  status: WarehouseStatus;
  /** From the SAP custom field (or an admin override). null = capacity unknown, so utilization is too. */
  capacity: number | null;
  totalStock: number;
  utilization: number | null;
  skuCount: number;
  inbound: number;
  outbound: number;
  reserved: number;
  onOrder: number;
  available: number;
  criticalAlerts: number;
  breakdown: InventoryCategory[];
  health: StockHealth;
  activity: ActivityEvent[];
}

export interface NetworkSummary {
  warehouseCount: number;
  totalStock: number;
  averageUtilization: number | null;
  inboundToday: number;
  outboundToday: number;
  criticalAlerts: number;
}

export interface WarehouseNetwork {
  source: { mode: DataSourceMode; last_synced_at: string | null };
  summary: NetworkSummary;
  warehouses: Warehouse[];
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatUtilization(value: number | null): string {
  return value === null ? "n/a" : `${value}%`;
}
