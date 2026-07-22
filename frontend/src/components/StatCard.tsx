interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "success";
  variant?: "default" | "featured" | "compact";
}

const TONE_COLOR: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "var(--ink)",
  danger: "var(--danger)",
  success: "var(--success)",
};

export function StatCard({ label, value, hint, tone = "default", variant = "default" }: StatCardProps) {
  if (variant === "featured") {
    return (
      <div className="card-dark relative overflow-hidden p-7">
        {/* Dot-grid texture overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Blue glow at top-right */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)" }}
        />
        <p className="eyebrow relative" style={{ color: "var(--sidebar-ink-muted)", letterSpacing: "0.1em" }}>
          {label}
        </p>
        <p
          className="relative mt-2 tabular-nums leading-none"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "clamp(2rem, 1.5rem + 2vw, 2.75rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#ffffff",
          }}
        >
          {value}
        </p>
        {hint && (
          <p className="relative mt-3 text-xs" style={{ color: "var(--sidebar-ink-muted)" }}>
            {hint}
          </p>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="card card-interactive p-4">
        <p className="eyebrow">{label}</p>
        <p
          className="mt-1.5 tabular-nums leading-none"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: TONE_COLOR[tone],
          }}
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

  return (
    <div className="card card-interactive p-5">
      <p className="eyebrow">{label}</p>
      <p className="stat-value mt-2" style={{ color: TONE_COLOR[tone] }}>
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--ink-tertiary)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
