import { formatNumber, type NetworkSummary } from "./data";

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

export function WarehouseHeader({ summary }: { summary: NetworkSummary }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow mb-1.5">Warehouse</p>
        <h1 className="page-title">Warehouse Intelligence</h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
          Network overview <span style={{ color: "var(--ink-tertiary)" }}>· sample data</span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
        <HeaderStat value={String(summary.warehouseCount)} label="Warehouses" />
        <HeaderStat value={formatNumber(summary.totalStock)} label="Units" />
        <HeaderStat value={`${summary.averageUtilization.toFixed(1)}%`} label="Utilization" />
        <p className="flex items-center gap-2 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--success)" }}>
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--success)" }} />
          Live
        </p>
      </div>
    </header>
  );
}
