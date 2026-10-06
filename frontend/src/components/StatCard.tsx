interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "success";
  variant?: "default" | "compact";
}

const TONE_COLOR: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "var(--ink)",
  danger: "var(--danger)",
  success: "var(--success)",
};

export function StatCard({ label, value, hint, tone = "default", variant = "default" }: StatCardProps) {
  const compact = variant === "compact";
  return (
    <div className={`card card-interactive ${compact ? "p-3.5" : "p-4"}`}>
      <p className="eyebrow">{label}</p>
      <p
        className={`${compact ? "mt-1.5 text-xl" : "stat-value mt-2"} font-semibold tabular-nums`}
        style={{ color: TONE_COLOR[tone], letterSpacing: "-0.03em", lineHeight: 1.15 }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-tertiary)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
