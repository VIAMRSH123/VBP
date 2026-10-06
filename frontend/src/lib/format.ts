const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

/** $265,375 — exact figures for tables and detail views. */
export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** $265.38K — headline KPIs where scanability beats precision. */
export function formatCompactCurrency(value: number): string {
  return compactCurrency.format(value);
}

export function formatPercent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}
