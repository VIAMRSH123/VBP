import { useQuery } from "@tanstack/react-query";
import { getRepPerformance, type RepPerformance } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { DataTable, type Column } from "../../components/DataTable";
import { formatCurrency, formatPercent } from "../../lib/format";

interface RepPerformanceTabProps {
  representativeId: string;
}

const COLUMNS: Column<RepPerformance>[] = [
  {
    key: "representative",
    header: "Representative",
    sortValue: (r) => r.representative,
    cell: (r) => <span style={{ color: "var(--ink)" }}>{r.representative}</span>,
  },
  { key: "lead_count", header: "Total leads", numeric: true, sortValue: (r) => r.lead_count, cell: (r) => r.lead_count },
  {
    key: "won_count",
    header: "Won",
    numeric: true,
    sortValue: (r) => r.won_count,
    cell: (r) => <span style={{ color: "var(--success)" }}>{r.won_count}</span>,
  },
  {
    key: "win_rate",
    header: "Win rate",
    numeric: true,
    sortValue: (r) => (r.lead_count ? r.won_count / r.lead_count : 0),
    cell: (r) => formatPercent(r.won_count, r.lead_count),
  },
  {
    key: "pipeline_value",
    header: "Pipeline value",
    numeric: true,
    sortValue: (r) => r.pipeline_value,
    cell: (r) => formatCurrency(r.pipeline_value),
  },
];

export function RepPerformanceTab({ representativeId }: RepPerformanceTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-rep-performance", representativeId],
    queryFn: () => getRepPerformance(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load rep performance." />;

  return (
    <DataTable
      caption="Representative performance"
      columns={COLUMNS}
      rows={data}
      rowKey={(r) => r.representative_id}
      emptyTitle="No representative activity yet"
      emptyDescription="Performance appears once leads are assigned to representatives."
    />
  );
}
