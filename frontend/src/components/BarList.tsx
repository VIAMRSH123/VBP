export interface BarListItem {
  label: string;
  value: number;
  color?: string;
}

interface BarListProps {
  items: BarListItem[];
  /** Formats the value column; defaults to a plain integer. */
  formatValue?: (value: number) => string;
}

/** Ranked horizontal bars: readable at any count, unlike a many-slice pie. */
export function BarList({ items, formatValue = (v) => v.toLocaleString() }: BarListProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate" style={{ color: "var(--ink)" }}>{item.label}</span>
            <span className="shrink-0 tabular-nums" style={{ color: "var(--ink)" }}>
              {formatValue(item.value)}
              <span className="ml-2 text-xs" style={{ color: "var(--ink-tertiary)" }}>
                {Math.round((item.value / total) * 100)}%
              </span>
            </span>
          </div>
          <div className="bar-track" role="presentation">
            <div
              className="bar-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color ?? "var(--chart-1)",
                animationDelay: `${index * 40}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
