import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEngagementTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";
import { DataTable } from "../../components/DataTable";
import { leadColumns } from "../../components/leadColumns";

interface EngagementTabProps {
  representativeId: string;
}

const COLUMNS = [leadColumns.number, leadColumns.company, leadColumns.product, leadColumns.status, leadColumns.priority, leadColumns.rep];

export function EngagementTab({ representativeId }: EngagementTabProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-engagement", representativeId],
    queryFn: () => getEngagementTab(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load engagement data." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:w-1/2">
        <KpiTile label="Total Engaged" value={data.total_engaged} description="Leads past initial intake, not yet won or lost." />
        <KpiTile
          label="Avg Response Time"
          value={`${data.avg_response_time_hours}h`}
          description="Time from lead creation to first engagement."
        />
      </div>

      <DataTable
        caption="Engaged leads"
        columns={COLUMNS}
        rows={data.leads}
        rowKey={(lead) => lead.id}
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        emptyTitle="No engaged leads right now"
        emptyDescription="Leads show up here once a representative starts working them."
      />
    </div>
  );
}
