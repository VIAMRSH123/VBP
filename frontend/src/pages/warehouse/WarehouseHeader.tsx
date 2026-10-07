import { DataSourceBadge } from "../../components/DataSourceBadge";
import { formatNumber, type DataSourceMode, type NetworkSummary } from "./data";

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums leading-none" style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}>
        {value}
      </p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  );
}

interface WarehouseHeaderProps {
  summary: NetworkSummary;
  mode: DataSourceMode;
  lastSyncedAt: string | null;
}

export function WarehouseHeader({ summary, mode, lastSyncedAt }: WarehouseHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow mb-1.5">Warehouse</p>
        <h1 className="page-title">Warehouse Intelligence</h1>
        <div className="mt-2">
          <DataSourceBadge mode={mode} lastSyncedAt={lastSyncedAt} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
        <HeaderStat value={String(summary.warehouseCount)} label="Warehouses" />
        <HeaderStat value={formatNumber(summary.totalStock)} label="Units" />
        <HeaderStat value={summary.averageUtilization === null ? "n/a" : `${summary.averageUtilization.toFixed(1)}%`} label="Utilization" />
      </div>
    </header>
  );
}
