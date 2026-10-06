export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

// Colour carries meaning only: green = won, red = lost/critical, amber = waiting/elevated,
// blue = in progress. Everything else stays neutral.
const STATUS_TONE: Record<string, BadgeTone> = {
  New: "neutral",
  Assigned: "info",
  Contacted: "info",
  Qualified: "info",
  "Quote Requested": "info",
  "Quote Sent": "info",
  Negotiation: "info",
  "Awaiting Customer": "warning",
  Won: "success",
  Lost: "danger",
  Archived: "neutral",
};

const PRIORITY_TONE: Record<string, BadgeTone> = {
  Low: "neutral",
  Medium: "neutral",
  High: "warning",
  Critical: "danger",
};

export function Badge({ tone = "neutral", label }: { tone?: BadgeTone; label: string }) {
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"} label={status} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={PRIORITY_TONE[priority] ?? "neutral"} label={priority} />;
}
