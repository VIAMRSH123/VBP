import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLead, getLeadActivity, getLeadSapReferences, updateLeadStatus, getNextBestAction, type LeadSapReferences } from "../api/leads";
import { Badge, StatusBadge, PriorityBadge } from "../components/StatusBadge";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { IconArrowLeft } from "../components/icons";
import { formatCurrency } from "../lib/format";
import { leadSource } from "../lib/leadSource";
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
  const sapQuery = useQuery({ queryKey: ["lead-sap", id], queryFn: () => getLeadSapReferences(id!), enabled: !!id });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-2">
          <IconArrowLeft width={14} height={14} />
          Back
        </button>
        <Link to="/leads" className="btn-ghost">
          All leads
        </Link>
      </div>

      <header>
        <p className="eyebrow mb-1.5 font-mono">{lead.lead_number}</p>
        <h1 className="page-title">{lead.company}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={lead.status} />
          <PriorityBadge priority={lead.priority} />
          <Badge tone={leadSource(lead).tone} label={leadSource(lead).label} />
          {lead.is_duplicate && <Badge tone="warning" label="Possible duplicate" />}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="card-title mb-4">Lead details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
              <Field label="Contact" value={lead.contact_name} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Email" value={lead.email || "—"} />
              <Field label="Product" value={lead.product} />
              <Field label="Quantity" value={String(lead.quantity)} />
              <Field label="Representative" value={lead.representative_name || "Unassigned"} />
              <Field label="Industry" value={lead.industry} />
              <Field label="Customer type" value={lead.customer_type} />
              <Field label="Product category" value={lead.product_category} />
              <Field label="Territory" value={lead.territory || "—"} />
              <Field label="Record state" value={lead.record_state} />
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="card-title mb-4">Activity timeline</h2>
            {activityQuery.isLoading && (
              <div className="space-y-3">
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-10 w-full" />
              </div>
            )}
            {activityQuery.data && activityQuery.data.activities.length > 0 && (
              <ol className="relative space-y-5 border-l pl-5" style={{ borderColor: "var(--border)" }}>
                {activityQuery.data.activities.map((a) => (
                  <li key={a.id} className="relative text-sm">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full border"
                      style={{ background: "var(--bg)", borderColor: "var(--ink-tertiary)" }}
                    />
                    <p className="font-medium" style={{ color: "var(--ink)" }}>{a.type}</p>
                    <p style={{ color: "var(--ink-secondary)" }}>{a.description}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--ink-tertiary)" }}>
                      {a.actor} · {new Date(a.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {activityQuery.data?.activities.length === 0 && (
              <EmptyState title="No activity yet" description="Status changes, notes and assignments will be logged here." />
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="card-title mb-4">AI scoring</h2>
            <dl className="space-y-3.5 text-sm">
              <Field label="Lead score" value={`${lead.lead_score.toFixed(0)} / 100`} />
              <Field label="Buying probability" value={`${lead.buying_probability.toFixed(0)}%`} />
              <Field label="Risk score" value={`${lead.risk_score.toFixed(0)} / 100`} />
              <Field label="Deal size estimate" value={formatCurrency(lead.deal_size_estimate)} />
            </dl>
          </section>

          {sapQuery.data?.linked && <SapReferences data={sapQuery.data} />}

          {nbaQuery.data && (
            <section className="card-ai p-5">
              <div className="mb-2.5 flex items-center gap-1.5">
                <span className="block h-1.5 w-1.5 rounded-full" style={{ background: "var(--ai-bright)" }} />
                <p className="eyebrow" style={{ color: "var(--ai)" }}>
                  Next best action · Claude AI
                </p>
              </div>
              <p className="text-[15px] font-semibold leading-snug" style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}>
                {nbaQuery.data.action}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
                {nbaQuery.data.reasoning}
              </p>
              <span
                className="mt-3 inline-block rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ color: "var(--ai-ink)", border: "1px solid var(--ai-border)" }}
              >
                Urgency: {nbaQuery.data.urgency}
              </span>
            </section>
          )}

          {canEdit && allowedTransitions.length > 0 && (
            <section className="card p-5">
              <h2 className="card-title mb-3">Update status</h2>
              <label htmlFor="status-remarks" className="sr-only">Remarks</label>
              <textarea
                id="status-remarks"
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="input-field mb-3 w-full resize-none"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                    className="btn-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {statusMutation.isError && (
                <p className="mt-2 text-xs" role="alert" style={{ color: "var(--danger)" }}>
                  Couldn't update the status. Try again.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SapReferences({ data }: { data: LeadSapReferences }) {
  const { refs } = data;
  const numbers = (docs?: { doc_entry: number; doc_num?: number }[]) =>
    docs && docs.length > 0 ? docs.map((d) => `#${d.doc_num ?? d.doc_entry}`).join(", ") : "—";
  const synced = data.synced_at ? new Date(data.synced_at).toLocaleString() : "—";
  return (
    <section className="card p-5">
      <h2 className="card-title mb-4">SAP references</h2>
      <dl className="space-y-3.5 text-sm">
        <Field label="Customer code" value={data.card_code || "—"} />
        <Field label="Opportunity" value={refs.opportunity_no ? `#${refs.opportunity_no}${refs.opportunity_name ? ` · ${refs.opportunity_name}` : ""}` : "—"} />
        <Field label="Stage" value={refs.stage ? `${refs.stage}${refs.stage_percent ? ` (${refs.stage_percent.toFixed(0)}%)` : ""}` : "—"} />
        <Field label="Quotations" value={numbers(refs.quotations)} />
        <Field label="Sales orders" value={numbers(refs.orders)} />
        <Field label="Last synced" value={synced} />
      </dl>
    </section>
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
