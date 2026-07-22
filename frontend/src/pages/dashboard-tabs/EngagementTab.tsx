import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEngagementTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { StatusBadge, PriorityBadge } from "../../components/StatusBadge";
import { KpiTile } from "../../components/KpiTile";

interface EngagementTabProps {
  representativeId: string;
}

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
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:w-1/2">
        <KpiTile label="Total Engaged" value={data.total_engaged} description="Leads past initial intake, not yet won or lost." />
        <KpiTile label="Avg Response Time" value={`${data.avg_response_time_hours}h`} description="Time from lead creation to first engagement." />
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Lead #", "Company", "Product", "Status", "Priority", "Rep"].map((h) => (
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
                <td className="px-5 py-3.5"><StatusBadge status={lead.status} /></td>
                <td className="px-5 py-3.5"><PriorityBadge priority={lead.priority} /></td>
                <td className="px-5 py-3.5" style={{ color: "var(--ink-secondary)" }}>{lead.representative_name || "Unassigned"}</td>
              </tr>
            ))}
            {data.leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center" style={{ color: "var(--ink-tertiary)" }}>
                  No engaged leads right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
