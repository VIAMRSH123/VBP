import { apiClient } from "./client";
import type { WarehouseNetwork } from "../pages/warehouse/data";

export async function getWarehouses(): Promise<WarehouseNetwork> {
  const { data } = await apiClient.get<WarehouseNetwork>("/api/warehouses");
  return data;
}
