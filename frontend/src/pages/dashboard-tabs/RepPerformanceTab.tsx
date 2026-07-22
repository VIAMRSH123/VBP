import { useQuery } from "@tanstack/react-query";
import { getRepPerformance } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";

interface RepPerformanceTabProps {
  representativeId: string;
}

export function RepPerformanceTab({ representativeId }: RepPerformanceTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-rep-performance", representativeId],
    queryFn: () => getRepPerformance(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load rep performance." />;

  return (
    <div className="glass-panel overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Representative", "Total Leads", "Won", "Win Rate", "Pipeline Value"].map((h) => (
              <th key={h} className="table-head-cell px-5 py-4 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const winRate = row.lead_count ? Math.round((row.won_count / row.lead_count) * 100) : 0;
            return (
              <tr key={row.representative_id} className="table-row">
                <td className="px-5 py-4 font-medium" style={{ color: "var(--ink)" }}>{row.representative}</td>
                <td className="px-5 py-4 tabular-nums" style={{ color: "var(--ink-secondary)" }}>{row.lead_count}</td>
                <td className="px-5 py-4 tabular-nums" style={{ color: "var(--success)" }}>{row.won_count}</td>
                <td className="px-5 py-4 tabular-nums" style={{ color: "var(--ink-secondary)" }}>{winRate}%</td>
                <td className="px-5 py-4 tabular-nums" style={{ color: "var(--ink-secondary)" }}>${row.pipeline_value.toLocaleString()}</td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center" style={{ color: "var(--ink-tertiary)" }}>
                No representative activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
