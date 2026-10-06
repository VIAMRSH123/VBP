import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLostTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";
import { DataTable } from "../../components/DataTable";
import { leadColumns } from "../../components/leadColumns";
import { formatCompactCurrency } from "../../lib/format";

interface LostTabProps {
  representativeId: string;
}

const COLUMNS = [leadColumns.number, leadColumns.company, leadColumns.product, leadColumns.rep, leadColumns.dealValue, leadColumns.remarks];

export function LostTab({ representativeId }: LostTabProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-lost", representativeId],
    queryFn: () => getLostTab(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load lost leads." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:w-1/2">
        <KpiTile label="Lost Deals" value={data.count} tone="danger" description="Number of deals marked Lost." />
        <KpiTile
          label="Lost Value"
          value={formatCompactCurrency(data.lost_value)}
          tone="danger"
          description="Combined deal value of all Lost leads."
        />
      </div>

      <DataTable
        caption="Lost deals"
        columns={COLUMNS}
        rows={data.leads}
        rowKey={(lead) => lead.id}
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        emptyTitle="No lost deals"
        emptyDescription="Deals marked Lost, with their remarks, will appear here."
      />
    </div>
  );
}
