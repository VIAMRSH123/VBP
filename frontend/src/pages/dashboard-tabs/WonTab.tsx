import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getWonTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";
import { DataTable } from "../../components/DataTable";
import { leadColumns } from "../../components/leadColumns";
import { formatCompactCurrency } from "../../lib/format";

interface WonTabProps {
  representativeId: string;
}

const COLUMNS = [leadColumns.number, leadColumns.company, leadColumns.product, leadColumns.rep, leadColumns.dealValue, leadColumns.updated];

export function WonTab({ representativeId }: WonTabProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-won", representativeId],
    queryFn: () => getWonTab(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load won leads." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:w-1/2">
        <KpiTile label="Won Deals" value={data.count} tone="success" description="Number of deals marked Won." />
        <KpiTile
          label="Total Won Value"
          value={formatCompactCurrency(data.total_value)}
          tone="success"
          description="Combined deal value of all Won leads."
        />
      </div>

      <DataTable
        caption="Won deals"
        columns={COLUMNS}
        rows={data.leads}
        rowKey={(lead) => lead.id}
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        emptyTitle="No won deals yet"
        emptyDescription="Closed-won deals will be listed here."
      />
    </div>
  );
}
