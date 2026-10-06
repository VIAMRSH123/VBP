import { useId, type ReactNode } from "react";
import { IconInfo } from "./icons";

interface KpiTileProps {
  label: string;
  value: ReactNode;
  description: string;
  hint?: string;
  tone?: "default" | "success" | "danger";
  featured?: boolean;
}

export function KpiTile({ label, value, description, hint, tone = "default", featured = false }: KpiTileProps) {
  const tooltipId = useId();
  const color = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--ink)";

  return (
    <div className={`card card-interactive ${featured ? "p-5" : "p-4"}`}>
      <div className="flex items-center gap-1.5">
        <p className="eyebrow">{label}</p>
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label={`About ${label}`}
            aria-describedby={tooltipId}
            className="inline-flex rounded-sm transition-colors"
            style={{ color: "var(--ink-tertiary)" }}
          >
            <IconInfo width={12} height={12} />
          </button>
          <span
            id={tooltipId}
            role="tooltip"
            className="popover pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 px-2.5 py-2 text-xs leading-snug opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
            style={{ color: "var(--ink-secondary)", animation: "none", transformOrigin: "bottom center" }}
          >
            {description}
          </span>
        </span>
      </div>
      <p
        className={`${featured ? "text-[2rem]" : "stat-value"} mt-2 font-semibold tabular-nums`}
        style={{ color, letterSpacing: "-0.035em", lineHeight: 1.1 }}
      >
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
