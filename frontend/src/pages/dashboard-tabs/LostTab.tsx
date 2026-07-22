import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLostTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";

interface LostTabProps {
  representativeId: string;
}

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
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:w-1/2">
        <KpiTile label="Lost Deals" value={data.count} tone="danger" description="Number of deals marked Lost." />
        <KpiTile label="Lost Value" value={`$${data.lost_value.toLocaleString()}`} tone="danger" description="Combined deal value of all Lost leads." />
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Lead #", "Company", "Product", "Rep", "Deal Value", "Remarks"].map((h) => (
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
                <td className="px-5 py-3.5 tabular-nums" style={{ color: "var(--danger)" }}>${lead.deal_size_estimate.toLocaleString()}</td>
                <td className="max-w-xs truncate px-5 py-3.5" style={{ color: "var(--ink-tertiary)" }}>{lead.remarks || "—"}</td>
              </tr>
            ))}
            {data.leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center" style={{ color: "var(--ink-tertiary)" }}>
                  No lost deals — keep it that way.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
