import { useMemo, useState } from "react";
import "./warehouse/warehouse.css";
import { summarizeNetwork, warehouses } from "./warehouse/data";
import { NetworkMetrics } from "./warehouse/NetworkMetrics";
import { WarehouseDetails } from "./warehouse/WarehouseDetails";
import { WarehouseHeader } from "./warehouse/WarehouseHeader";
import { WarehouseSelector } from "./warehouse/WarehouseSelector";
import { WarehouseVisualization } from "./warehouse/WarehouseVisualization";

export function WarehousePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeNetwork(warehouses), []);
  const selected = warehouses.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="wh-page space-y-6">
      <WarehouseHeader summary={summary} />

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

      <NetworkMetrics summary={summary} />
    </div>
  );
}
