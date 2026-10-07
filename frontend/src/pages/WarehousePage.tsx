import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "./warehouse/warehouse.css";
import { getWarehouses } from "../api/warehouses";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner, PageSkeleton } from "../components/LoadingSpinner";
import { IconWarehouse } from "../components/icons";
import { NetworkMetrics } from "./warehouse/NetworkMetrics";
import { WarehouseDetails } from "./warehouse/WarehouseDetails";
import { WarehouseHeader } from "./warehouse/WarehouseHeader";
import { WarehouseSelector } from "./warehouse/WarehouseSelector";
import { WarehouseVisualization } from "./warehouse/WarehouseVisualization";

export function WarehousePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load warehouses." />;

  const { warehouses, summary, source } = data;
  const selected = warehouses.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="wh-page space-y-6">
      <WarehouseHeader summary={summary} mode={source.mode} lastSyncedAt={source.last_synced_at} />

      {warehouses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={IconWarehouse}
            title="No warehouses yet"
            description="Warehouses appear after the first SAP sync completes. Check the SAP integration card in Administration."
          />
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_310px]">
          <div className="xl:sticky xl:top-28">
            <WarehouseSelector
              warehouses={warehouses}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
            />
          </div>
          <div className="xl:sticky xl:top-28">
            <WarehouseVisualization
              warehouses={warehouses}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
            />
          </div>
          <div className="md:col-span-2 xl:col-span-1">
            <WarehouseDetails warehouse={selected} />
          </div>
        </div>
      )}

      <NetworkMetrics summary={summary} />
    </div>
  );
}
