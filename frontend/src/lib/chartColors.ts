const PALETTE_VARS = ["--accent", "--ink", "--ink-tertiary", "--sidebar-active-ink", "--ink-secondary", "--accent-soft"] as const;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Reads the current theme's live CSS custom properties so chart colors never drift from index.css
 * and stay legible across both light and dark mode. Recompute (e.g. via useMemo keyed on the
 * theme context's `theme` value) whenever the theme toggles. */
export function getChartPalette(): string[] {
  return PALETTE_VARS.map(cssVar);
}

export function getChartAccent(): string {
  return cssVar("--accent");
}
