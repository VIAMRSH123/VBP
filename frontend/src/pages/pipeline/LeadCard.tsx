import { forwardRef, type HTMLAttributes } from "react";
import { PriorityBadge } from "../../components/StatusBadge";
import { formatCompactCurrency } from "../../lib/format";
import { daysInStage } from "../../lib/leadAge";
import type { Lead } from "../../types";

interface LeadCardProps extends HTMLAttributes<HTMLDivElement> {
  lead: Lead;
  isLifted?: boolean;
  isGhost?: boolean;
}

export const LeadCard = forwardRef<HTMLDivElement, LeadCardProps>(function LeadCard(
  { lead, isLifted = false, isGhost = false, className = "", style, ...rest },
  ref,
) {
  const days = daysInStage(lead);
  return (
    <div
      ref={ref}
      className={`pipe-card ${isLifted ? "pipe-card--lifted" : ""} ${isGhost ? "pipe-card--ghost" : ""} ${className}`}
      style={style}
      {...rest}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-medium" style={{ color: "var(--ink)" }}>
          {lead.company || "Unnamed company"}
        </p>
        <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
          {lead.lead_number}
        </span>
      </div>
      <p className="mt-1 truncate text-xs" style={{ color: "var(--ink-secondary)" }}>
        {lead.product || "No product"}
        {lead.quantity > 0 ? ` · ${lead.quantity}` : ""}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <PriorityBadge priority={lead.priority} />
        <span className="text-xs tabular-nums" style={{ color: "var(--ink-secondary)" }}>
          {lead.deal_size_estimate > 0 ? formatCompactCurrency(lead.deal_size_estimate) : "—"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
        <span className="truncate">{lead.representative_name || "Unassigned"}</span>
        <span className="shrink-0 tabular-nums">{days === 0 ? "today" : `${days}d in stage`}</span>
      </div>
    </div>
  );
});
