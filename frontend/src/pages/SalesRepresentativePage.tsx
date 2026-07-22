import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listLeads } from "../api/leads";
import { StatusBadge, PriorityBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";

const TERMINAL = ["Won", "Lost", "Archived"];

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
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">My Pipeline</p>
        <h1 className="page-title">Sales Representative</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
          Your assigned leads and follow-ups
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Assigned Leads" value={data.total} />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Conversion Rate" value={`${conversion}%`} />
        <StatCard label="Open Pipeline Value" value={`$${totalValue.toLocaleString()}`} />
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Lead #", "Company", "Product", "Status", "Priority", "Deal Value"].map((h) => (
                <th key={h} className="table-head-cell px-5 py-4 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((lead) => (
              <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="table-row table-row-clickable cursor-pointer">
                <td className="px-5 py-4 font-medium" style={{ color: "var(--accent)" }}>{lead.lead_number}</td>
                <td className="px-5 py-4" style={{ color: "var(--ink)" }}>{lead.company}</td>
                <td className="px-5 py-4" style={{ color: "var(--ink-secondary)" }}>{lead.product}</td>
                <td className="px-5 py-4"><StatusBadge status={lead.status} /></td>
                <td className="px-5 py-4"><PriorityBadge priority={lead.priority} /></td>
                <td className="px-5 py-4 tabular-nums" style={{ color: "var(--ink-secondary)" }}>${lead.deal_size_estimate.toLocaleString()}</td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center" style={{ color: "var(--ink-tertiary)" }}>
                  No leads assigned yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
