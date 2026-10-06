import type { ReactNode } from "react";
import { formatNumber, type ActivityEvent, type InventoryCategory, type StockHealth as StockHealthData } from "./data";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
      <p className="eyebrow mb-3">{title}</p>
      {children}
    </section>
  );
}

export function InventoryBreakdown({ categories, total }: { categories: InventoryCategory[]; total: number }) {
  const max = Math.max(...categories.map((c) => c.units), 1);
  return (
    <ul className="space-y-2.5">
      {categories.map((category) => (
        <li key={category.label}>
          <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
            <span style={{ color: "var(--ink-secondary)" }}>{category.label}</span>
            <span className="tabular-nums font-medium" style={{ color: "var(--ink)" }}>
              {formatNumber(category.units)}
              <span className="ml-1.5 text-[10.5px] font-normal" style={{ color: "var(--ink-tertiary)" }}>
                {Math.round((category.units / total) * 100)}%
              </span>
            </span>
          </div>
          <div className="wh-bar">
            <div className="wh-bar__fill" style={{ width: `${(category.units / max) * 100}%`, background: "var(--accent)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const HEALTH_ROWS: ReadonlyArray<{ key: keyof StockHealthData; label: string; color: string }> = [
  { key: "healthy", label: "Healthy", color: "var(--success)" },
  { key: "low", label: "Low stock", color: "var(--ai-bright)" },
  { key: "critical", label: "Critical", color: "var(--danger)" },
];

export function StockHealth({ health }: { health: StockHealthData }) {
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Healthy ${health.healthy}%, low stock ${health.low}%, critical ${health.critical}%`}>
        {HEALTH_ROWS.map((row) => (
          <div key={row.key} className="wh-bar__fill" style={{ width: `${health[row.key]}%`, background: row.color }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {HEALTH_ROWS.map((row) => (
          <li key={row.key} className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2" style={{ color: "var(--ink-secondary)" }}>
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: row.color }} />
              {row.label}
            </span>
            <span className="tabular-nums font-medium" style={{ color: "var(--ink)" }}>
              {health[row.key]}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={`${event.time}-${event.title}`} className="flex gap-3">
          <span className="w-10 shrink-0 pt-px text-[11.5px] font-medium tabular-nums" style={{ color: "var(--ink-tertiary)" }}>
            {event.time}
          </span>
          <span className="min-w-0 text-[12.5px]">
            <span className="block" style={{ color: "var(--ink)" }}>{event.title}</span>
            <span className="block tabular-nums" style={{ color: "var(--ink-secondary)" }}>{event.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
