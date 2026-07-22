import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listLeads } from "../api/leads";
import { StatusBadge, PriorityBadge } from "../components/StatusBadge";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";

const STATUS_OPTIONS = [
  "New", "Assigned", "Contacted", "Qualified", "Quote Requested",
  "Quote Sent", "Negotiation", "Awaiting Customer", "Won", "Lost", "Archived",
];

export function LeadManagementPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads", search, status],
    queryFn: () => listLeads({ search: search || undefined, status: status || undefined, limit: 100 }),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Pipeline</p>
        <h1 className="page-title">Lead Management</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
          {data ? `${data.total} leads` : "Loading..."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search by company, contact, or lead number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full px-3.5 py-2.5 sm:w-80"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field px-3.5 py-2.5">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isError && <ErrorBanner message="Failed to load leads." />}

      {data && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Lead #", "Company", "Contact", "Product", "Status", "Priority", "Rep", "Score", "Deal Value"].map((h) => (
                  <th key={h} className="table-head-cell px-5 py-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="table-row table-row-clickable cursor-pointer"
                >
                  <td className="px-5 py-4 font-medium" style={{ color: "var(--accent)" }}>{lead.lead_number}</td>
                  <td className="px-5 py-4" style={{ color: "var(--ink)" }}>{lead.company}</td>
                  <td className="px-5 py-4" style={{ color: "var(--ink-secondary)" }}>{lead.contact_name}</td>
                  <td className="px-5 py-4" style={{ color: "var(--ink-secondary)" }}>{lead.product}</td>
                  <td className="px-5 py-4"><StatusBadge status={lead.status} /></td>
                  <td className="px-5 py-4"><PriorityBadge priority={lead.priority} /></td>
                  <td className="px-5 py-4" style={{ color: "var(--ink-secondary)" }}>{lead.representative_name || "Unassigned"}</td>
                  <td className="px-5 py-4 tabular-nums" style={{ color: "var(--ink-secondary)" }}>{lead.lead_score.toFixed(0)}</td>
                  <td className="px-5 py-4 tabular-nums" style={{ color: "var(--ink-secondary)" }}>${lead.deal_size_estimate.toLocaleString()}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center" style={{ color: "var(--ink-tertiary)" }}>
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
