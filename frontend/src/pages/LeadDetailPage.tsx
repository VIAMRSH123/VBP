import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLead, getLeadActivity, updateLeadStatus, getNextBestAction } from "../api/leads";
import { StatusBadge, PriorityBadge } from "../components/StatusBadge";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { useAuthStore } from "../store/authStore";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  New: ["Assigned", "Archived"],
  Assigned: ["Contacted", "Archived"],
  Contacted: ["Qualified", "Lost", "Archived"],
  Qualified: ["Quote Requested", "Lost", "Archived"],
  "Quote Requested": ["Quote Sent", "Lost", "Archived"],
  "Quote Sent": ["Negotiation", "Won", "Lost", "Archived"],
  Negotiation: ["Awaiting Customer", "Won", "Lost", "Archived"],
  "Awaiting Customer": ["Negotiation", "Won", "Lost", "Archived"],
  Won: ["Archived"],
  Lost: ["Archived"],
  Archived: [],
};

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [remarks, setRemarks] = useState("");

  const leadQuery = useQuery({ queryKey: ["lead", id], queryFn: () => getLead(id!), enabled: !!id });
  const activityQuery = useQuery({ queryKey: ["lead-activity", id], queryFn: () => getLeadActivity(id!), enabled: !!id });
  const nbaQuery = useQuery({ queryKey: ["lead-nba", id], queryFn: () => getNextBestAction(id!), enabled: !!id });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateLeadStatus(id!, status, remarks),
    onSuccess: () => {
      setRemarks("");
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["lead-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (leadQuery.isLoading) return <PageSkeleton />;
  if (leadQuery.isError || !leadQuery.data) return <ErrorBanner message="Lead not found." />;

  const lead = leadQuery.data;
  const canEdit = role === "administrator" || role === "sales_manager" || role === "sales_representative";
  const allowedTransitions = STATUS_TRANSITIONS[lead.status] ?? [];

  return (
    <div className="space-y-8">
      <button onClick={() => navigate(-1)} className="text-sm font-medium" style={{ color: "var(--accent)" }}>
        &larr; Back
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{lead.lead_number}</p>
          <h1 className="page-title">{lead.company}</h1>
          <div className="mt-3 flex gap-2">
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
            {lead.is_duplicate && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "#fefce8", color: "#a16207" }}>
                Possible duplicate
              </span>
            )}
          </div>
        </div>
        <Link to="/leads" className="text-sm" style={{ color: "var(--ink-tertiary)" }}>
          View all leads
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <p className="card-title mb-5">Lead Details</p>
            <dl className="grid grid-cols-2 gap-5 text-sm">
              <Field label="Contact" value={lead.contact_name} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Email" value={lead.email || "—"} />
              <Field label="Product" value={lead.product} />
              <Field label="Quantity" value={String(lead.quantity)} />
              <Field label="Representative" value={lead.representative_name || "Unassigned"} />
              <Field label="Industry" value={lead.industry} />
              <Field label="Customer Type" value={lead.customer_type} />
              <Field label="Product Category" value={lead.product_category} />
              <Field label="Record State" value={lead.record_state} />
            </dl>
          </div>

          <div className="card p-6">
            <p className="card-title mb-5">Activity Timeline</p>
            {activityQuery.isLoading && (
              <div className="space-y-3">
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-10 w-full" />
              </div>
            )}
            <ul className="space-y-4">
              {activityQuery.data?.activities.map((a) => (
                <li key={a.id} className="pl-4 text-sm" style={{ borderLeft: "2px solid var(--border)" }}>
                  <p className="font-medium" style={{ color: "var(--ink)" }}>{a.type}</p>
                  <p style={{ color: "var(--ink-secondary)" }}>{a.description}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--ink-tertiary)" }}>
                    {a.actor} &middot; {new Date(a.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
              {activityQuery.data?.activities.length === 0 && (
                <p className="text-sm" style={{ color: "var(--ink-tertiary)" }}>No activity yet.</p>
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="card-title mb-5">AI Scoring</p>
            <dl className="space-y-3.5 text-sm">
              <Field label="Lead Score" value={`${lead.lead_score.toFixed(0)} / 100`} />
              <Field label="Buying Probability" value={`${lead.buying_probability.toFixed(0)}%`} />
              <Field label="Risk Score" value={`${lead.risk_score.toFixed(0)} / 100`} />
              <Field label="Deal Size Estimate" value={`$${lead.deal_size_estimate.toLocaleString()}`} />
            </dl>
          </div>

          {nbaQuery.data && (
            <div className="card-ai p-6">
              <div className="mb-3 flex items-center gap-1.5">
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--ai-bright)" }}
                />
                <p className="eyebrow" style={{ color: "var(--ai)", letterSpacing: "0.08em" }}>
                  Next Best Action · Claude AI
                </p>
              </div>
              <p
                className="text-[15px] font-semibold leading-snug"
                style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--ink)" }}
              >
                {nbaQuery.data.action}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
                {nbaQuery.data.reasoning}
              </p>
              <span
                className="mt-3 inline-block rounded-md px-2.5 py-1 text-xs font-semibold"
                style={{ background: "var(--ai-soft)", color: "var(--ai-ink)", border: "1px solid var(--ai-border)" }}
              >
                Urgency: {nbaQuery.data.urgency}
              </span>
            </div>
          )}

          {canEdit && allowedTransitions.length > 0 && (
            <div className="card p-6">
              <p className="card-title mb-4">Update Status</p>
              <textarea
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="input-field mb-3 w-full px-3.5 py-2.5"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.map((s) => (
                  <button key={s} onClick={() => statusMutation.mutate(s)} disabled={statusMutation.isPending} className="btn-secondary px-3.5 py-1.5 text-xs">
                    → {s}
                  </button>
                ))}
              </div>
              {statusMutation.isError && <p className="mt-2 text-xs text-red-600">Failed to update status.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1" style={{ color: "var(--ink)" }}>{value}</dd>
    </div>
  );
}
