import type { ReactNode } from "react";
import { IconInfo } from "./icons";

interface KpiTileProps {
  label: string;
  value: ReactNode;
  description: string;
  tone?: "default" | "success" | "danger";
}

export function KpiTile({ label, value, description, tone = "default" }: KpiTileProps) {
  const color = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--ink)";

  return (
    <div className="group glass-tile relative overflow-hidden p-5">
      <div className="flex items-center gap-1.5">
        <p className="eyebrow">{label}</p>
        <IconInfo width={12} height={12} style={{ color: "var(--ink-tertiary)" }} />
      </div>
      <p className="stat-value mt-2" style={{ color }}>{value}</p>

      {/* Contained strictly within the tile's own box (inset-0) so it can never overlap the tab
          bar, charts, or any other component — it covers this tile's content instead of floating
          outside it. */}
      <div
        role="tooltip"
        className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-xs font-medium leading-snug opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{
          background: "var(--glass-surface-strong)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          color: "var(--ink-secondary)",
        }}
      >
        {description}
      </div>
    </div>
  );
}
