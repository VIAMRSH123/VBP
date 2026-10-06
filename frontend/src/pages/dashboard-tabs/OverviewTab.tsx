import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOverviewTab } from "../../api/dashboard";
import { PageSkeleton, ErrorBanner } from "../../components/LoadingSpinner";
import { KpiTile } from "../../components/KpiTile";
import { BarList, type BarListItem } from "../../components/BarList";
import { CategoryBarChart } from "../../components/CategoryBarChart";
import { EmptyState } from "../../components/EmptyState";
import { formatCompactCurrency, formatPercent } from "../../lib/format";
import { PIPELINE_STATUSES } from "../../lib/pipeline";

interface OverviewTabProps {
  representativeId: string;
}

const STATUS_COLOR: Record<string, string> = {
  Won: "var(--success)",
  Lost: "var(--danger)",
};

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

export function OverviewTab({ representativeId }: OverviewTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-tab-overview", representativeId],
    queryFn: () => getOverviewTab(representativeId || undefined),
    refetchInterval: 15000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load overview." />;

  const known = new Set<string>(PIPELINE_STATUSES);
  const funnel: BarListItem[] = [
    ...PIPELINE_STATUSES.map((name) => ({ label: name, value: data.leads_by_status[name] ?? 0 })),
    ...Object.entries(data.leads_by_status)
      .filter(([name]) => !known.has(name))
      .map(([label, value]) => ({ label, value })),
  ]
    .filter((item) => item.value > 0)
    .map((item) => ({ ...item, color: STATUS_COLOR[item.label] }));

  const productData = Object.entries(data.leads_by_product_category).map(([name, value]) => ({ name: name || "Uncategorized", value }));
  const closed = data.won_leads + data.lost_leads;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-3">
        <KpiTile
          featured
          label="Pipeline Value"
          value={formatCompactCurrency(data.pipeline_value)}
          hint={`Across ${data.active_leads} active ${data.active_leads === 1 ? "lead" : "leads"}`}
          description="Combined estimated deal size of all active leads."
        />
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
          <KpiTile
            label="Total Leads"
            value={data.total_leads}
            hint="All stages"
            description="All leads currently in the pipeline, across every stage."
          />
          <KpiTile
            label="Active"
            value={data.active_leads}
            hint={`${formatPercent(data.active_leads, data.total_leads)} of total`}
            description="Leads that haven't reached Won, Lost, or Archived yet."
          />
          <KpiTile
            label="Won"
            value={data.won_leads}
            tone="success"
            hint={closed > 0 ? `${formatPercent(data.won_leads, closed)} win rate` : "No closed deals yet"}
            description="Deals successfully closed."
          />
          <KpiTile
            label="Lost"
            value={data.lost_leads}
            tone="danger"
            hint={closed > 0 ? `${formatPercent(data.lost_leads, closed)} of closed` : "No closed deals yet"}
            description="Deals that didn't convert."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Sales funnel" subtitle="Leads by pipeline stage">
          {funnel.length === 0 ? (
            <EmptyState title="No leads yet" description="Leads appear here as soon as they come in from WhatsApp." />
          ) : (
            <BarList items={funnel} />
          )}
        </ChartCard>

        <ChartCard title="Product demand" subtitle="Leads by product category">
          {productData.length === 0 ? (
            <EmptyState title="No demand data yet" description="Product demand shows once leads are categorised." />
          ) : (
            <CategoryBarChart data={productData} seriesName="Leads" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
