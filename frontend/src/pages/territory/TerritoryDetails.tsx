import { Link } from "react-router-dom";
import type { TerritoryStat } from "../../api/dashboard";
import { CountUp } from "../../components/CountUp";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCompactCurrency } from "../../lib/format";
import type { Lead } from "../../types";
import type { Ping } from "./useLeadPings";

interface DetailsProps {
  title: string;
  stat: Pick<TerritoryStat, "leads" | "active" | "won" | "lost" | "pipeline_value">;
  viewLeadsTo: string;
}

export function TerritoryDetails({ title, stat, viewLeadsTo }: DetailsProps) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{title}</p>
      <p className="mt-2 text-[2rem] font-semibold tabular-nums" style={{ letterSpacing: "-0.035em", lineHeight: 1.1 }}>
        <CountUp value={stat.pipeline_value} format={formatCompactCurrency} />
      </p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--ink-tertiary)" }}>
        open pipeline value
      </p>
      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          ["Leads", stat.leads],
          ["Active", stat.active],
          ["Won", stat.won],
          ["Lost", stat.lost],
        ].map(([label, n]) => (
          <div key={label as string}>
            <dd className="text-lg font-semibold tabular-nums">
              <CountUp value={n as number} />
            </dd>
            <dt className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
              {label}
            </dt>
          </div>
        ))}
      </dl>
      <Link to={viewLeadsTo} className="mt-4 inline-block text-xs font-medium underline-offset-2 hover:underline" style={{ color: "var(--accent)" }}>
        View these leads →
      </Link>
    </div>
  );
}

interface FeedProps {
  leads: Lead[];
  pings: Ping[];
}

export function LiveFeed({ leads, pings }: FeedProps) {
  const fresh = new Set(pings.map((p) => p.leadId));
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Live leads</p>
        <span className="terr-live">Listening</span>
      </div>
      <ul className="mt-3 space-y-1">
        {leads.slice(0, 8).map((lead) => (
          <li key={lead.id} className={`terr-feed-item ${fresh.has(lead.id) ? "terr-feed-item--new" : ""} rounded-md`}>
            <Link to={`/leads/${lead.id}`} className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{lead.company || "Unnamed company"}</span>
                <span className="block truncate text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                  {lead.lead_number} · {lead.territory || "No territory"}
                </span>
              </span>
              <StatusBadge status={lead.status} />
            </Link>
          </li>
        ))}
        {leads.length === 0 && (
          <li className="px-2 py-3 text-xs" style={{ color: "var(--ink-tertiary)" }}>
            New WhatsApp and website leads will appear here the moment they arrive.
          </li>
        )}
      </ul>
    </div>
  );
}
