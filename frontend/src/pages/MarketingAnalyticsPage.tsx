import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getRegionalDistribution } from "../api/dashboard";
import { listLeads } from "../api/leads";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { useTheme } from "../hooks/useTheme";
import { getChartPalette, getChartAccent } from "../lib/chartColors";

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", fontSize: 13, boxShadow: "var(--shadow-md)" };

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }));
}

export function MarketingAnalyticsPage() {
  const { theme } = useTheme();
  const palette = useMemo(() => getChartPalette(), [theme]);
  const accent = useMemo(() => getChartAccent(), [theme]);
  const regionalQuery = useQuery({ queryKey: ["regional-distribution"], queryFn: getRegionalDistribution });
  const leadsQuery = useQuery({ queryKey: ["all-leads-for-marketing"], queryFn: () => listLeads({ limit: 200 }) });

  const industryData = useMemo(() => {
    if (!leadsQuery.data) return [];
    const counts: Record<string, number> = {};
    for (const lead of leadsQuery.data.items) {
      const key = lead.industry || "Unclassified";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return toChartData(counts);
  }, [leadsQuery.data]);

  const customerTypeData = useMemo(() => {
    if (!leadsQuery.data) return [];
    const counts: Record<string, number> = {};
    for (const lead of leadsQuery.data.items) {
      const key = lead.customer_type || "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return toChartData(counts);
  }, [leadsQuery.data]);

  if (leadsQuery.isLoading) return <PageSkeleton />;
  if (leadsQuery.isError) return <ErrorBanner message="Failed to load data." />;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Marketing</p>
        <h1 className="page-title">Marketing Analytics</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
          Lead sources, segments, and regional demand
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Regional Distribution">
          {regionalQuery.data && Object.keys(regionalQuery.data).length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={toChartData(regionalQuery.data)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-tertiary)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-tertiary)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--bg-secondary)" }} />
                <Bar dataKey="value" fill={accent} radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Industry Breakdown">
          {industryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={industryData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={54} paddingAngle={2}>
                  {industryData.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Customer Segments (New vs. Existing)">
          {customerTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={customerTypeData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={54} paddingAngle={2}>
                  {customerTypeData.map((_, i) => (
                    <Cell key={i} fill={palette[(i + 1) % palette.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <p className="card-title mb-5">{title}</p>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <p className="py-16 text-center text-sm" style={{ color: "var(--ink-tertiary)" }}>
      No data yet.
    </p>
  );
}
