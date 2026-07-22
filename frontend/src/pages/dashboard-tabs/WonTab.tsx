import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getWonTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";

interface WonTabProps {
  representativeId: string;
}

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
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:w-1/2">
        <KpiTile label="Won Deals" value={data.count} tone="success" description="Number of deals marked Won." />
        <KpiTile label="Total Won Value" value={`$${data.total_value.toLocaleString()}`} tone="success" description="Combined deal value of all Won leads." />
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Lead #", "Company", "Product", "Rep", "Deal Value", "Closed"].map((h) => (
                <th key={h} className="table-head-cell px-5 py-4 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.leads.map((lead) => (
              <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="table-row table-row-clickable cursor-pointer">
                <td className="px-5 py-3.5 font-medium" style={{ color: "var(--accent)" }}>{lead.lead_number}</td>
                <td className="px-5 py-3.5" style={{ color: "var(--ink)" }}>{lead.company}</td>
                <td className="px-5 py-3.5" style={{ color: "var(--ink-secondary)" }}>{lead.product}</td>
                <td className="px-5 py-3.5" style={{ color: "var(--ink-secondary)" }}>{lead.representative_name || "Unassigned"}</td>
                <td className="px-5 py-3.5 tabular-nums" style={{ color: "var(--success)" }}>${lead.deal_size_estimate.toLocaleString()}</td>
                <td className="px-5 py-3.5" style={{ color: "var(--ink-secondary)" }}>{new Date(lead.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {data.leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center" style={{ color: "var(--ink-tertiary)" }}>
                  No won deals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
