import { useTheme } from "../hooks/useTheme";

type BadgeStyle = { bg: string; text: string; dot: string };

// Light-mode: dark, saturated text on a near-white pastel background.
const STATUS_STYLES_LIGHT: Record<string, BadgeStyle> = {
  New:                  { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" },
  Assigned:             { bg: "#eff4ff", text: "#2563eb", dot: "#2563eb" },
  Contacted:            { bg: "#eef2ff", text: "#4338ca", dot: "#4338ca" },
  Qualified:            { bg: "#ecfeff", text: "#0e7490", dot: "#0e7490" },
  "Quote Requested":    { bg: "#fffbeb", text: "#92400e", dot: "#d97706" },
  "Quote Sent":         { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c" },
  Negotiation:          { bg: "#faf5ff", text: "#6b21a8", dot: "#9333ea" },
  "Awaiting Customer":  { bg: "#fefce8", text: "#713f12", dot: "#ca8a04" },
  Won:                  { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
  Lost:                 { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" },
  Archived:             { bg: "#f9fafb", text: "#9ca3af", dot: "#d1d5db" },
};

// Dark-mode: the light pastel backgrounds above are illegible/washed-out on a dark card, and the
// dark-toned text was tuned for a near-white background — both need a genuinely different pairing,
// not just an inverted one. Low-alpha tinted background + a light/bright version of the same hue.
const STATUS_STYLES_DARK: Record<string, BadgeStyle> = {
  New:                  { bg: "rgba(107,114,128,0.18)", text: "#d1d5db", dot: "#9ca3af" },
  Assigned:             { bg: "rgba(37,99,235,0.2)",   text: "#93c5fd", dot: "#60a5fa" },
  Contacted:            { bg: "rgba(67,56,202,0.22)",  text: "#c7d2fe", dot: "#818cf8" },
  Qualified:            { bg: "rgba(14,116,144,0.2)",  text: "#67e8f9", dot: "#22d3ee" },
  "Quote Requested":    { bg: "rgba(217,119,6,0.2)",   text: "#fcd34d", dot: "#f59e0b" },
  "Quote Sent":         { bg: "rgba(234,88,12,0.2)",   text: "#fdba74", dot: "#fb923c" },
  Negotiation:          { bg: "rgba(147,51,234,0.2)",  text: "#d8b4fe", dot: "#c084fc" },
  "Awaiting Customer":  { bg: "rgba(202,138,4,0.2)",   text: "#fde047", dot: "#eab308" },
  Won:                  { bg: "rgba(22,163,74,0.2)",   text: "#86efac", dot: "#4ade80" },
  Lost:                 { bg: "rgba(220,38,38,0.22)",  text: "#fca5a5", dot: "#f87171" },
  Archived:             { bg: "rgba(156,163,175,0.16)",text: "#9ca3af", dot: "#6b7280" },
};

const DEFAULT_STATUS_LIGHT: BadgeStyle = { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" };
const DEFAULT_STATUS_DARK: BadgeStyle = { bg: "rgba(107,114,128,0.18)", text: "#d1d5db", dot: "#9ca3af" };

function Badge({ style, label }: { style: BadgeStyle; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: style.bg, color: style.text }}
    >
      <span className="block h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: style.dot }} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const styles = theme === "dark" ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  const fallback = theme === "dark" ? DEFAULT_STATUS_DARK : DEFAULT_STATUS_LIGHT;
  return <Badge style={styles[status] ?? fallback} label={status} />;
}

const PRIORITY_STYLES_LIGHT: Record<string, BadgeStyle> = {
  Low:      { bg: "#f3f4f6", text: "#6b7280",  dot: "#d1d5db" },
  Medium:   { bg: "#eff4ff", text: "#2563eb",  dot: "#60a5fa" },
  High:     { bg: "#fff7ed", text: "#9a3412",  dot: "#f97316" },
  Critical: { bg: "#fef2f2", text: "#b91c1c",  dot: "#dc2626" },
};

const PRIORITY_STYLES_DARK: Record<string, BadgeStyle> = {
  Low:      { bg: "rgba(107,114,128,0.16)", text: "#d1d5db", dot: "#9ca3af" },
  Medium:   { bg: "rgba(37,99,235,0.2)",    text: "#93c5fd", dot: "#60a5fa" },
  High:     { bg: "rgba(249,115,22,0.2)",   text: "#fdba74", dot: "#fb923c" },
  Critical: { bg: "rgba(220,38,38,0.22)",   text: "#fca5a5", dot: "#f87171" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const { theme } = useTheme();
  const styles = theme === "dark" ? PRIORITY_STYLES_DARK : PRIORITY_STYLES_LIGHT;
  return <Badge style={styles[priority] ?? styles.Medium} label={priority} />;
}
