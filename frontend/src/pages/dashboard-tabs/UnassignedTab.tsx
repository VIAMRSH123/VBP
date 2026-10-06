import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getUnassignedTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";
import { DataTable } from "../../components/DataTable";
import { leadColumns } from "../../components/leadColumns";

const COLUMNS = [leadColumns.number, leadColumns.company, leadColumns.product, leadColumns.status, leadColumns.priority];

export function UnassignedTab() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-unassigned"],
    queryFn: () => getUnassignedTab(),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load unassigned leads." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:w-1/2">
        <KpiTile
          label="Total Unassigned"
          value={data.total_unassigned}
          tone={data.total_unassigned > 0 ? "danger" : "default"}
          description="No confident representative match — needs manual assignment."
        />
      </div>

      <DataTable
        caption="Unassigned leads"
        columns={COLUMNS}
        rows={data.leads}
        rowKey={(lead) => lead.id}
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        emptyTitle="Nothing unassigned"
        emptyDescription="Every lead currently has a representative."
      />
    </div>
  );
}
