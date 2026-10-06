import { StatCard } from "../../components/StatCard";
import { formatNumber, type NetworkSummary } from "./data";

export function NetworkMetrics({ summary }: { summary: NetworkSummary }) {
  return (
    <section aria-label="Network statistics">
      <p className="eyebrow mb-3">Network statistics</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard variant="compact" label="Total warehouses" value={String(summary.warehouseCount).padStart(2, "0")} />
        <StatCard variant="compact" label="Total stock" value={formatNumber(summary.totalStock)} hint="units on hand" />
        <StatCard variant="compact" label="Average utilization" value={`${summary.averageUtilization.toFixed(1)}%`} hint="capacity-weighted" />
        <StatCard variant="compact" label="Inbound today" value={formatNumber(summary.inboundToday)} />
        <StatCard variant="compact" label="Outbound today" value={formatNumber(summary.outboundToday)} />
        <StatCard
          variant="compact"
          label="Critical alerts"
          value={String(summary.criticalAlerts).padStart(2, "0")}
          tone={summary.criticalAlerts > 0 ? "danger" : "default"}
        />
      </div>
    </section>
  );
}
