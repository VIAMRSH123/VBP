import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { getOverviewTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";
import { useTheme } from "../../hooks/useTheme";
import { getChartPalette, getChartAccent } from "../../lib/chartColors";

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", fontSize: 13, boxShadow: "var(--shadow-md)" };

interface OverviewTabProps {
  representativeId: string;
}

export function OverviewTab({ representativeId }: OverviewTabProps) {
  const { theme } = useTheme();
  const palette = useMemo(() => getChartPalette(), [theme]);
  const accent = useMemo(() => getChartAccent(), [theme]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-overview", representativeId],
    queryFn: () => getOverviewTab(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load overview." />;

  const statusData = Object.entries(data.leads_by_status).map(([name, value]) => ({ name, value }));
  const productData = Object.entries(data.leads_by_product_category).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Total Leads" value={data.total_leads} description="All leads currently in the pipeline, across every stage." />
        <KpiTile label="Active" value={data.active_leads} description="Leads that haven't reached Won, Lost, or Archived yet." />
        <KpiTile label="Won" value={data.won_leads} tone="success" description="Deals successfully closed." />
        <KpiTile label="Lost" value={data.lost_leads} tone="danger" description="Deals that didn't convert." />
        <KpiTile label="Pipeline Value" value={`$${data.pipeline_value.toLocaleString()}`} description="Combined estimated deal size of all active leads." />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-tile p-6">
          <p className="card-title mb-5">Sales Funnel</p>
          {statusData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={54} paddingAngle={2}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-tile p-6">
          <p className="card-title mb-5">Product Demand</p>
          {productData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-tertiary)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-tertiary)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--bg-secondary)" }} />
                <Bar dataKey="value" fill={accent} radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return <p className="py-16 text-center text-sm" style={{ color: "var(--ink-tertiary)" }}>No leads yet.</p>;
}
