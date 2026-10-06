/** Series colours resolve through CSS variables, so they follow the active theme with no JS recompute. */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const AXIS_TICK = { fontSize: 11, fill: "var(--ink-tertiary)" } as const;
export const GRID_STROKE = "var(--border)";
export const CHART_ANIMATION_MS = 500;
