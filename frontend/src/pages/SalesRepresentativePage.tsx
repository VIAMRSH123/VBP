import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listLeads } from "../api/leads";
import { StatCard } from "../components/StatCard";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { DataTable } from "../components/DataTable";
import { leadColumns } from "../components/leadColumns";
import { PageHeader } from "../components/PageHeader";
import { formatCompactCurrency } from "../lib/format";

const TERMINAL = ["Won", "Lost", "Archived"];
const COLUMNS = [leadColumns.number, leadColumns.company, leadColumns.product, leadColumns.status, leadColumns.priority, leadColumns.dealValue];

export function SalesRepresentativePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-leads"],
    queryFn: () => listLeads({ limit: 100 }),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load leads." />;

  const active = data.items.filter((l) => !TERMINAL.includes(l.status));
  const won = data.items.filter((l) => l.status === "Won");
  const totalValue = active.reduce((sum, l) => sum + l.deal_size_estimate, 0);
  const conversion = data.items.length ? Math.round((won.length / data.items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My pipeline" title="Sales Representative" description="Your assigned leads and follow-ups" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Assigned leads" value={data.total} />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Conversion rate" value={`${conversion}%`} />
        <StatCard label="Open pipeline value" value={formatCompactCurrency(totalValue)} />
      </div>

      <DataTable
        caption="Assigned leads"
        columns={COLUMNS}
        rows={data.items}
        rowKey={(lead) => lead.id}
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        emptyTitle="No leads assigned yet"
        emptyDescription="Leads routed to you will show up here."
      />
    </div>
  );
}
