export type WarehouseStatus = "Operational" | "Warning";

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

export interface Warehouse {
  id: string;
  number: string;
  name: string;
  location: string;
  status: WarehouseStatus;
  capacity: number;
  totalStock: number;
  utilization: number;
  skuCount: number;
  inbound: number;
  outbound: number;
  reserved: number;
  damaged: number;
  available: number;
  criticalAlerts: number;
  breakdown: InventoryCategory[];
  health: StockHealth;
  activity: ActivityEvent[];
}

export interface NetworkSummary {
  warehouseCount: number;
  totalStock: number;
  averageUtilization: number;
  inboundToday: number;
  outboundToday: number;
  criticalAlerts: number;
}

type WarehouseSeed = Omit<Warehouse, "utilization" | "available" | "breakdown"> & {
  mix: [number, number, number, number];
};

// Category shares for Electronics, Consumables, Packaging, Spare Parts. "Other" takes the
// remainder so every breakdown sums exactly to the warehouse's stock on hand.
const CATEGORY_LABELS = ["Electronics", "Consumables", "Packaging", "Spare Parts"] as const;

function buildBreakdown(totalStock: number, mix: WarehouseSeed["mix"]): InventoryCategory[] {
  const named = mix.map((share, i) => ({ label: CATEGORY_LABELS[i], units: Math.round(totalStock * share) }));
  const other = totalStock - named.reduce((sum, c) => sum + c.units, 0);
  return [...named, { label: "Other", units: other }];
}

function hydrate(seed: WarehouseSeed): Warehouse {
  const { mix, ...rest } = seed;
  return {
    ...rest,
    utilization: Math.round((seed.totalStock / seed.capacity) * 100),
    available: seed.totalStock - seed.reserved - seed.damaged,
    breakdown: buildBreakdown(seed.totalStock, mix),
  };
}

const SEEDS: WarehouseSeed[] = [
  {
    id: "WH01",
    number: "01",
    name: "Mumbai Central",
    location: "Mumbai",
    status: "Operational",
    capacity: 30320,
    totalStock: 24860,
    skuCount: 3480,
    inbound: 1820,
    outbound: 1654,
    reserved: 3920,
    damaged: 158,
    criticalAlerts: 0,
    mix: [0.31, 0.19, 0.14, 0.12],
    health: { healthy: 86, low: 10, critical: 4 },
    activity: [
      { time: "09:48", title: "Shipment received", detail: "+560 units" },
      { time: "09:31", title: "Order dispatched", detail: "-212 units" },
      { time: "09:12", title: "Inventory updated", detail: "SKU 31207" },
      { time: "08:55", title: "Cycle count completed", detail: "Aisle 14" },
    ],
  },
  {
    id: "WH02",
    number: "02",
    name: "Bangalore North",
    location: "Bangalore",
    status: "Operational",
    capacity: 26780,
    totalStock: 17940,
    skuCount: 2640,
    inbound: 1246,
    outbound: 1192,
    reserved: 2610,
    damaged: 94,
    criticalAlerts: 0,
    mix: [0.37, 0.14, 0.12, 0.17],
    health: { healthy: 84, low: 12, critical: 4 },
    activity: [
      { time: "09:44", title: "Order dispatched", detail: "-146 units" },
      { time: "09:27", title: "Shipment received", detail: "+380 units" },
      { time: "09:05", title: "Inventory updated", detail: "SKU 18842" },
      { time: "08:40", title: "Returns processed", detail: "+34 units" },
    ],
  },
  {
    id: "WH03",
    number: "03",
    name: "Hyderabad Hub",
    location: "Hyderabad",
    status: "Operational",
    capacity: 24704,
    totalStock: 22480,
    skuCount: 3210,
    inbound: 2184,
    outbound: 1842,
    reserved: 3284,
    damaged: 126,
    criticalAlerts: 1,
    mix: [0.286, 0.205, 0.157, 0.133],
    health: { healthy: 82, low: 11, critical: 7 },
    activity: [
      { time: "09:42", title: "Shipment received", detail: "+420 units" },
      { time: "09:36", title: "Order dispatched", detail: "-184 units" },
      { time: "09:21", title: "Inventory updated", detail: "SKU 28491" },
      { time: "09:04", title: "Inventory audit completed", detail: "Zone C" },
    ],
  },
  {
    id: "WH04",
    number: "04",
    name: "Chennai South",
    location: "Chennai",
    status: "Warning",
    capacity: 25020,
    totalStock: 12010,
    skuCount: 1980,
    inbound: 738,
    outbound: 842,
    reserved: 1860,
    damaged: 211,
    criticalAlerts: 2,
    mix: [0.18, 0.31, 0.2, 0.11],
    health: { healthy: 63, low: 22, critical: 15 },
    activity: [
      { time: "09:50", title: "Low stock alert", detail: "SKU 40118" },
      { time: "09:33", title: "Order dispatched", detail: "-96 units" },
      { time: "09:10", title: "Damage reported", detail: "42 units" },
      { time: "08:47", title: "Replenishment requested", detail: "6 SKUs" },
    ],
  },
  {
    id: "WH05",
    number: "05",
    name: "Delhi Distribution",
    location: "Delhi NCR",
    status: "Operational",
    capacity: 37580,
    totalStock: 27430,
    skuCount: 3920,
    inbound: 1486,
    outbound: 1396,
    reserved: 4310,
    damaged: 183,
    criticalAlerts: 0,
    mix: [0.24, 0.27, 0.17, 0.1],
    health: { healthy: 88, low: 9, critical: 3 },
    activity: [
      { time: "09:46", title: "Shipment received", detail: "+720 units" },
      { time: "09:29", title: "Order dispatched", detail: "-264 units" },
      { time: "09:08", title: "Inventory updated", detail: "SKU 22650" },
      { time: "08:52", title: "Inbound dock cleared", detail: "Dock 4" },
    ],
  },
  {
    id: "WH06",
    number: "06",
    name: "Pune Logistics",
    location: "Pune",
    status: "Operational",
    capacity: 32420,
    totalStock: 20100,
    skuCount: 2870,
    inbound: 946,
    outbound: 986,
    reserved: 2980,
    damaged: 117,
    criticalAlerts: 0,
    mix: [0.22, 0.16, 0.26, 0.19],
    health: { healthy: 85, low: 11, critical: 4 },
    activity: [
      { time: "09:40", title: "Order dispatched", detail: "-172 units" },
      { time: "09:22", title: "Shipment received", detail: "+310 units" },
      { time: "09:01", title: "Inventory updated", detail: "SKU 15733" },
      { time: "08:38", title: "Inventory audit completed", detail: "Zone A" },
    ],
  },
];

export const warehouses: Warehouse[] = SEEDS.map(hydrate);

export function summarizeNetwork(list: Warehouse[]): NetworkSummary {
  const totalStock = list.reduce((sum, w) => sum + w.totalStock, 0);
  const totalCapacity = list.reduce((sum, w) => sum + w.capacity, 0);
  return {
    warehouseCount: list.length,
    totalStock,
    averageUtilization: totalCapacity === 0 ? 0 : (totalStock / totalCapacity) * 100,
    inboundToday: list.reduce((sum, w) => sum + w.inbound, 0),
    outboundToday: list.reduce((sum, w) => sum + w.outbound, 0),
    criticalAlerts: list.reduce((sum, w) => sum + w.criticalAlerts, 0),
  };
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
