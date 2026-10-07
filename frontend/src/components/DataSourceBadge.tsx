import { formatDistanceToNow } from "date-fns";
import type { DataSourceMode } from "../pages/warehouse/data";

const STALE_AFTER_MINUTES = 60;

interface DataSourceBadgeProps {
  mode: DataSourceMode;
  lastSyncedAt: string | null;
}

/** Says where the numbers on screen come from, so demo data is never mistaken for live SAP data. */
export function DataSourceBadge({ mode, lastSyncedAt }: DataSourceBadgeProps) {
  if (mode === "sample") return <Pill tone="neutral" label="Sample data" detail="SAP sync is off" />;

  const synced = lastSyncedAt ? new Date(lastSyncedAt) : null;
  const detail = synced ? `synced ${formatDistanceToNow(synced, { addSuffix: true })}` : "waiting for first sync";
  if (mode === "mock") return <Pill tone="warning" label="Demo data (mock SAP)" detail={detail} />;

  const stale = !synced || Date.now() - synced.getTime() > STALE_AFTER_MINUTES * 60_000;
  return <Pill tone={stale ? "warning" : "success"} label="SAP live" detail={detail} />;
}

function Pill({ tone, label, detail }: { tone: "success" | "warning" | "neutral"; label: string; detail: string }) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--ai-bright)" : "var(--ink-tertiary)";
  return (
    <p
      className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
      style={{ color: tone === "neutral" ? "var(--ink-secondary)" : color }}
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
      <span className="font-normal normal-case tracking-normal" style={{ color: "var(--ink-tertiary)" }}>
        · {detail}
      </span>
    </p>
  );
}
