import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getRegionalDistribution } from "../api/dashboard";
import { listLeads } from "../api/leads";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { BarList } from "../components/BarList";
import { CategoryBarChart } from "../components/CategoryBarChart";
import { ChartTooltip } from "../components/ChartTooltip";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { CHART_ANIMATION_MS, CHART_SERIES } from "../lib/chartColors";

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name: name || "Uncategorized", value }));
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return toChartData(counts);
}

export function MarketingAnalyticsPage() {
  const regionalQuery = useQuery({ queryKey: ["regional-distribution"], queryFn: getRegionalDistribution });
  const leadsQuery = useQuery({ queryKey: ["all-leads-for-marketing"], queryFn: () => listLeads({ limit: 200 }) });

  const industryData = useMemo(
    () =>
      leadsQuery.data
        ? countBy(leadsQuery.data.items, (l) => l.industry || "Unclassified")
            .map(({ name, value }) => ({ label: name, value }))
            .sort((a, b) => b.value - a.value)
        : [],
    [leadsQuery.data],
  );

  const customerTypeData = useMemo(
    () => (leadsQuery.data ? countBy(leadsQuery.data.items, (l) => l.customer_type || "Unknown") : []),
    [leadsQuery.data],
  );

  if (leadsQuery.isLoading) return <PageSkeleton />;
  if (leadsQuery.isError) return <ErrorBanner message="Failed to load data." />;

  const regional = regionalQuery.data ? toChartData(regionalQuery.data) : [];
  const segmentTotal = customerTypeData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Marketing" title="Marketing Analytics" description="Lead sources, segments, and regional demand" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Regional distribution" subtitle="Leads by region">
          {regional.length > 0 ? (
            <CategoryBarChart data={regional} seriesName="Leads" />
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard title="Industry breakdown" subtitle="Leads by industry, largest first">
          {industryData.length > 0 ? <BarList items={industryData} /> : <NoData />}
        </ChartCard>

        <ChartCard title="Customer segments" subtitle="New vs. existing customers">
          {customerTypeData.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customerTypeData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={84}
                      innerRadius={56}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                      animationDuration={CHART_ANIMATION_MS}
                    >
                      {customerTypeData.map((_, i) => (
                        <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-[160px] flex-1 space-y-2.5">
                {customerTypeData.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex items-center gap-2" style={{ color: "var(--ink-secondary)" }}>
                      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm" style={{ background: CHART_SERIES[i % CHART_SERIES.length] }} />
                      {d.name}
                    </span>
                    <span className="tabular-nums" style={{ color: "var(--ink)" }}>
                      {d.value}
                      <span className="ml-2 text-xs" style={{ color: "var(--ink-tertiary)" }}>
                        {Math.round((d.value / segmentTotal) * 100)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <NoData />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-5">
        <h2 className="card-title">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--ink-tertiary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function NoData() {
  return <EmptyState title="No data yet" description="This view fills in as leads are ingested." />;
}
