import type { Lead } from "../types";
import { formatCurrency } from "../lib/format";
import type { Column } from "./DataTable";
import { leadSource } from "../lib/leadSource";
import { Badge, PriorityBadge, StatusBadge } from "./StatusBadge";

/** Column definitions shared by every lead table, so a lead looks the same wherever it appears. */
export const leadColumns = {
  number: {
    key: "lead_number",
    header: "Lead #",
    sortValue: (l) => l.lead_number,
    cell: (l) => (
      <span className="font-mono text-xs font-medium" style={{ color: "var(--ink)" }}>
        {l.lead_number}
      </span>
    ),
  },
  company: {
    key: "company",
    header: "Company",
    sortValue: (l) => l.company,
    cell: (l) => <span style={{ color: "var(--ink)" }}>{l.company}</span>,
  },
  contact: {
    key: "contact_name",
    header: "Contact",
    sortValue: (l) => l.contact_name,
    cell: (l) => l.contact_name,
  },
  product: {
    key: "product",
    header: "Product",
    sortValue: (l) => l.product,
    cell: (l) => l.product,
  },
  status: {
    key: "status",
    header: "Status",
    sortValue: (l) => l.status,
    cell: (l) => <StatusBadge status={l.status} />,
  },
  source: {
    key: "source",
    header: "Source",
    sortValue: (l) => leadSource(l).label,
    cell: (l) => {
      const { label, tone } = leadSource(l);
      return <Badge tone={tone} label={label} />;
    },
  },
  priority: {
    key: "priority",
    header: "Priority",
    sortValue: (l) => l.priority,
    cell: (l) => <PriorityBadge priority={l.priority} />,
  },
  rep: {
    key: "representative_name",
    header: "Rep",
    sortValue: (l) => l.representative_name || "",
    cell: (l) => l.representative_name || <span style={{ color: "var(--ink-tertiary)" }}>Unassigned</span>,
  },
  score: {
    key: "lead_score",
    header: "Score",
    numeric: true,
    sortValue: (l) => l.lead_score,
    cell: (l) => l.lead_score.toFixed(0),
  },
  dealValue: {
    key: "deal_size_estimate",
    header: "Deal value",
    numeric: true,
    sortValue: (l) => l.deal_size_estimate,
    cell: (l) => formatCurrency(l.deal_size_estimate),
  },
  updated: {
    key: "updated_at",
    header: "Updated",
    sortValue: (l) => new Date(l.updated_at).getTime(),
    cell: (l) => new Date(l.updated_at).toLocaleDateString(),
  },
  remarks: {
    key: "remarks",
    header: "Remarks",
    cell: (l) => (
      <span className="block max-w-xs truncate" style={{ color: "var(--ink-tertiary)" }}>
        {l.remarks || "—"}
      </span>
    ),
  },
} satisfies Record<string, Column<Lead>>;
