interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  payload?: { fill?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  label?: unknown;
  payload?: readonly TooltipEntry[];
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== "" && (
        <p className="mb-1 font-medium" style={{ color: "var(--ink)" }}>{String(label)}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 tabular-nums" style={{ color: "var(--ink-secondary)" }}>
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: entry.payload?.fill ?? entry.color ?? "var(--chart-1)" }}
          />
          {entry.name !== undefined && String(entry.name) !== "value" && <span>{String(entry.name)}</span>}
          <span style={{ color: "var(--ink)" }}>{String(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}
